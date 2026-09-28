import type { EmbeddingVector } from './index.js';
import { getEmbeddingConfig, validateEmbeddingConfig } from '../utils/config.js';

/**
 * Embedding service interface
 * Implement this to use actual embedding providers (OpenAI, local models, etc.)
 */
export interface EmbeddingService {
  /**
   * Generate embedding for a single text
   */
  embed(text: string): Promise<EmbeddingVector>;

  /**
   * Generate embeddings for multiple texts (batch operation)
   */
  embedBatch(texts: string[]): Promise<EmbeddingVector[]>;

  /**
   * Get the dimensionality of embeddings produced by this service
   */
  getDimensions(): number;
}

/**
 * Stub implementation that generates simple hash-based embeddings
 * Replace with actual embedding provider in production
 */
export class StubEmbeddingService implements EmbeddingService {
  private readonly dimensions: number;
  private static readonly SEED_MULTIPLIER = 31337;

  constructor(dimensions: number = 128) {
    this.dimensions = dimensions;
  }

  async embed(text: string): Promise<EmbeddingVector> {
    return this.generateEmbedding(text);
  }

  async embedBatch(texts: string[]): Promise<EmbeddingVector[]> {
    return texts.map(text => this.generateEmbedding(text));
  }

  getDimensions(): number {
    return this.dimensions;
  }

  private generateEmbedding(text: string): EmbeddingVector {
    // Simple hash-based embedding for demonstration
    // In production, replace with actual embedding from OpenAI, Cohere, etc.
    const values = new Array<number>(this.dimensions);
    const hash = this.hashString(text);

    for (let i = 0; i < this.dimensions; i++) {
      // Generate pseudo-random but deterministic values based on text hash
      values[i] = this.prng(hash + i * StubEmbeddingService.SEED_MULTIPLIER);
    }

    // Normalize to unit vector
    const magnitude = Math.sqrt(values.reduce((sum, v) => sum + v * v, 0));
    return {
      dimensions: this.dimensions,
      values: values.map(v => v / magnitude),
    };
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

   private prng(seed: number): number {
    // Simple pseudo-random number generator
    const x = Math.sin(seed) * StubEmbeddingService.SEED_MULTIPLIER;
    return x - Math.floor(x);
  }
}

/**
 * OpenAI embedding service using text-embedding-ada-002 or newer models
 */
export class OpenAIEmbeddingService implements EmbeddingService {
  private readonly dimensions: number;
  private readonly model: string;
  private readonly apiKey: string;

  constructor(apiKey?: string, model: string = 'text-embedding-ada-002', dimensions: number = 1536) {
    this.apiKey = apiKey || getEmbeddingConfig().apiKey || '';
    this.model = model;
    this.dimensions = dimensions;
  }

  async embed(text: string): Promise<EmbeddingVector> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        input: text,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI embedding API error: ${error}`);
    }

    const data = await response.json() as any;
    const embedding = data.data[0].embedding;

    return {
      dimensions: this.dimensions,
      values: embedding,
    };
  }

  async embedBatch(texts: string[]): Promise<EmbeddingVector[]> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        input: texts,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI embedding API error: ${error}`);
    }

    const data = await response.json() as any;

    return data.data.map((item: any) => ({
      dimensions: this.dimensions,
      values: item.embedding,
    }));
  }

  getDimensions(): number {
    return this.dimensions;
  }
}

/**
 * Local embedding service using Ollama or similar local models
 */
export class LocalEmbeddingService implements EmbeddingService {
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly dimensions: number;

  constructor(baseUrl: string = 'http://localhost:11434', model: string = 'nomic-embed-text', dimensions: number = 768) {
    this.baseUrl = baseUrl;
    this.model = model;
    this.dimensions = dimensions;
  }

  async embed(text: string): Promise<EmbeddingVector> {
    const response = await fetch(`${this.baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        prompt: text,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Local embedding API error: ${error}`);
    }

    const data = await response.json() as any;

    return {
      dimensions: this.dimensions,
      values: data.embedding,
    };
  }

  async embedBatch(texts: string[]): Promise<EmbeddingVector[]> {
    // Ollama doesn't support batch embeddings in the same way
    // Process sequentially
    const results: EmbeddingVector[] = [];
    for (const text of texts) {
      results.push(await this.embed(text));
    }
    return results;
  }

  getDimensions(): number {
    return this.dimensions;
  }
}

/**
 * Cosine similarity between two vectors
 */
export function cosineSimilarity(a: EmbeddingVector, b: EmbeddingVector): number {
  if (a.dimensions !== b.dimensions) {
    throw new Error(`Vector dimensions mismatch: ${a.dimensions} vs ${b.dimensions}`);
  }

  let dotProduct = 0;
  for (let i = 0; i < a.dimensions; i++) {
    dotProduct += a.values[i] * b.values[i];
  }

  return dotProduct;
}

/**
 * Create an embedding service based on configuration
 */
export function createEmbeddingService(): EmbeddingService {
  const config = getEmbeddingConfig();

  switch (config.provider) {
    case 'openai':
      validateEmbeddingConfig();
      return new OpenAIEmbeddingService(config.apiKey);
    case 'local':
      return new LocalEmbeddingService();
    case 'stub':
    default:
      return new StubEmbeddingService();
  }
}

/**
 * Create a specific embedding service by type
 */
export function createEmbeddingServiceByType(
  type: 'openai' | 'local' | 'stub',
  options?: { apiKey?: string; baseUrl?: string; model?: string }
): EmbeddingService {
  switch (type) {
    case 'openai':
      return new OpenAIEmbeddingService(options?.apiKey);
    case 'local':
      return new LocalEmbeddingService(options?.baseUrl, options?.model);
    case 'stub':
    default:
      return new StubEmbeddingService();
  }
}