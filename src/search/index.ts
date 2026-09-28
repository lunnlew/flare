import type { API, EndpointSchema } from '../ir/index.js';

/**
 * Embedding vector representation
 */
export interface EmbeddingVector {
  dimensions: number;
  values: number[];
}

/**
 * Represents a search result with relevance score
 */
export interface SearchResult<T> {
  item: T;
  score: number;
  highlights?: string[];
}

/**
 * Query intent parsed from natural language
 */
export interface QueryIntent {
  action: 'find' | 'search' | 'list' | 'get' | 'create' | 'update' | 'delete' | 'unknown';
  entity?: string;
  qualifiers: Record<string, string[]>;
  originalQuery: string;
}

/**
 * Semantic search options
 */
export interface SearchOptions {
  limit?: number;
  threshold?: number;
  includeEndpoints?: boolean;
}

/**
 * Similar API recommendation result
 */
export interface SimilarAPIRecommendation {
  sourceEndpoint: EndpointSchema;
  similarEndpoints: Array<{
    endpoint: EndpointSchema;
    apiName: string;
    similarity: number;
  }>;
}