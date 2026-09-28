import type { API, EndpointSchema } from '../ir/index.js';
import type {
  EmbeddingVector,
  SearchResult,
  QueryIntent,
  SearchOptions,
  SimilarAPIRecommendation,
} from './index.js';
import { createEmbeddingService, cosineSimilarity, type EmbeddingService } from './embeddings.js';

/**
 * Semantic search engine for API endpoints
 */
export class SemanticSearchEngine {
  private embeddingService: EmbeddingService;
  private apiEmbeddings: Map<string, { api: API; endpointEmbeddings: Map<string, EmbeddingVector> }>;

  constructor(embeddingService?: EmbeddingService) {
    this.embeddingService = embeddingService || createEmbeddingService();
    this.apiEmbeddings = new Map();
  }

  /**
   * Index an API and its endpoints for semantic search
   */
  async indexAPI(api: API): Promise<void> {
    const endpointEmbeddings = new Map<string, EmbeddingVector>();

    for (const endpoint of api.endpoints) {
      const text = this.endpointToText(endpoint);
      const embedding = await this.embeddingService.embed(text);
      endpointEmbeddings.set(this.getEndpointKey(endpoint), embedding);
    }

    this.apiEmbeddings.set(api.name, { api, endpointEmbeddings });
  }

  /**
   * Index multiple APIs
   */
  async indexAPIs(apis: API[]): Promise<void> {
    for (const api of apis) {
      await this.indexAPI(api);
    }
  }

  /**
   * Search endpoints using natural language query
   */
  async search(
    query: string,
    apis: API[],
    options: SearchOptions = {}
  ): Promise<SearchResult<EndpointSchema>[]> {
    const { limit = 10, threshold = 0.5, includeEndpoints = true } = options;

    // Parse natural language query
    const intent = this.parseQuery(query);

    // Generate query embedding
    const queryText = this.intentToSearchText(intent);
    const queryEmbedding = await this.embeddingService.embed(queryText);

    // Search across all indexed APIs
    const results: SearchResult<EndpointSchema>[] = [];

    for (const api of apis) {
      for (const endpoint of api.endpoints) {
        const key = this.getEndpointKey(endpoint);
        const stored = this.apiEmbeddings.get(api.name)?.endpointEmbeddings.get(key);

        if (stored) {
          const score = cosineSimilarity(queryEmbedding, stored);

          if (score >= threshold) {
            results.push({
              item: endpoint,
              score,
              highlights: this.generateHighlights(endpoint, query),
            });
          }
        } else {
          // Fallback: compute embedding on-the-fly
          const text = this.endpointToText(endpoint);
          const embedding = await this.embeddingService.embed(text);
          const score = cosineSimilarity(queryEmbedding, embedding);

          if (score >= threshold) {
            results.push({
              item: endpoint,
              score,
              highlights: this.generateHighlights(endpoint, query),
            });
          }
        }
      }
    }

    // Sort by score descending (immutable)
    const sortedResults = [...results].sort((a, b) => b.score - a.score);

    return sortedResults.slice(0, limit);
  }

  /**
   * Find similar endpoints to a given endpoint
   */
  async findSimilarEndpoints(
    endpoint: EndpointSchema,
    apis: API[],
    limit: number = 5
  ): Promise<Array<{ endpoint: EndpointSchema; apiName: string; similarity: number }>> {
    const queryText = this.endpointToText(endpoint);
    const queryEmbedding = await this.embeddingService.embed(queryText);

    const results: Array<{ endpoint: EndpointSchema; apiName: string; similarity: number }> = [];

    for (const api of apis) {
      for (const ep of api.endpoints) {
        if (this.getEndpointKey(ep) === this.getEndpointKey(endpoint)) {
          continue; // Skip self
        }

        const text = this.endpointToText(ep);
        const embedding = await this.embeddingService.embed(text);
        const similarity = cosineSimilarity(queryEmbedding, embedding);

        results.push({
          endpoint: ep,
          apiName: api.name,
          similarity,
        });
      }
    }

    // Sort by similarity descending (immutable)
    const sortedResults = [...results].sort((a, b) => b.similarity - a.similarity);

    return sortedResults.slice(0, limit);
  }

  /**
   * Generate similar API recommendations based on endpoint patterns
   */
  async getSimilarAPIRecommendations(
    api: API,
    allAPIs: API[],
    limitPerEndpoint: number = 3
  ): Promise<SimilarAPIRecommendation[]> {
    const recommendations: SimilarAPIRecommendation[] = [];

    for (const endpoint of api.endpoints) {
      const similarEndpoints = await this.findSimilarEndpoints(
        endpoint,
        allAPIs.filter(a => a.name !== api.name),
        limitPerEndpoint
      );

      if (similarEndpoints.length > 0) {
        recommendations.push({
          sourceEndpoint: endpoint,
          similarEndpoints,
        });
      }
    }

    return recommendations;
  }

  /**
   * Parse natural language query into structured intent
   */
  parseQuery(query: string): QueryIntent {
    const lowerQuery = query.toLowerCase();
    const qualifiers: Record<string, string[]> = {};

    // Detect action
    let action: QueryIntent['action'] = 'search';
    if (lowerQuery.includes('find') || lowerQuery.includes('search')) {
      action = 'find';
    } else if (lowerQuery.includes('list') || lowerQuery.includes('show')) {
      action = 'list';
    } else if (lowerQuery.includes('get') || lowerQuery.includes('retrieve')) {
      action = 'get';
    } else if (lowerQuery.includes('create') || lowerQuery.includes('add')) {
      action = 'create';
    } else if (lowerQuery.includes('update') || lowerQuery.includes('modify')) {
      action = 'update';
    } else if (lowerQuery.includes('delete') || lowerQuery.includes('remove')) {
      action = 'delete';
    }

    // Extract entity (e.g., "user endpoints" -> "user")
    let entity: string | undefined;
    const entityPatterns = [
      /(?:find|search|list|get)\s+(?:me\s+)?(?:the\s+)?(\w+)/i,
      /(\w+)\s+(?:endpoints|apis?)/i,
      /(?:for|about)\s+(\w+)/i,
    ];

    for (const pattern of entityPatterns) {
      const match = query.match(pattern);
      if (match && match[1]) {
        entity = match[1].toLowerCase();
        break;
      }
    }

    // Extract qualifiers (e.g., "authentication APIs" -> { type: ['authentication'] })
    const qualifierPatterns: Array<[RegExp, string]> = [
      [/(authentication|auth)\s+(\w+)?/gi, 'auth'],
      [/(\w+)\s+(endpoints?|apis?)/gi, 'type'],
      [/(GET|POST|PUT|DELETE|PATCH)\s+/gi, 'method'],
    ];

    for (const [pattern, key] of qualifierPatterns) {
      const matches = query.matchAll(pattern);
      const values: string[] = [];
      for (const match of matches) {
        const value = match[1] || match[2];
        if (value) values.push(value.toLowerCase());
      }
      if (values.length > 0) {
        qualifiers[key] = values;
      }
    }

    return {
      action,
      entity,
      qualifiers,
      originalQuery: query,
    };
  }

  /**
   * Convert endpoint to searchable text
   */
  private endpointToText(endpoint: EndpointSchema): string {
    const parts: string[] = [
      endpoint.method,
      endpoint.path,
      endpoint.summary || '',
      endpoint.description || '',
      ...(endpoint.tags || []),
    ];

    if (endpoint.operationId) {
      parts.push(endpoint.operationId);
    }

    return parts.join(' ');
  }

  /**
   * Convert intent to search query text
   */
  private intentToSearchText(intent: QueryIntent): string {
    const parts: string[] = [intent.originalQuery];

    if (intent.entity) {
      parts.push(intent.entity);
    }

    // Add qualifier terms
    for (const values of Object.values(intent.qualifiers)) {
      parts.push(...values);
    }

    return parts.join(' ');
  }

  /**
   * Generate highlights for matching terms
   */
  private generateHighlights(endpoint: EndpointSchema, query: string): string[] {
    const highlights: string[] = [];
    const queryTerms = query.toLowerCase().split(/\s+/);

    if (endpoint.summary) {
      const lowerSummary = endpoint.summary.toLowerCase();
      for (const term of queryTerms) {
        if (lowerSummary.includes(term)) {
          highlights.push(endpoint.summary);
          break;
        }
      }
    }

    if (endpoint.path.toLowerCase().includes(query.toLowerCase())) {
      highlights.push(`${endpoint.method} ${endpoint.path}`);
    }

    return highlights;
  }

  /**
   * Generate unique key for endpoint
   */
  private getEndpointKey(endpoint: EndpointSchema): string {
    return `${endpoint.method}:${endpoint.path}`;
  }
}

/**
 * Create a semantic search engine instance
 */
export function createSemanticSearchEngine(embeddingService?: EmbeddingService): SemanticSearchEngine {
  return new SemanticSearchEngine(embeddingService);
}