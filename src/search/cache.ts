/**
 * Embedding Cache
 * Caches computed embeddings to reduce API calls and improve performance
 */

import { writeFile, readFile, mkdir, unlink, readdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { createHash } from 'crypto';
import { loadConfig } from '../utils/config.js';

const FLARE_DIR = '.flare';
const EMBEDDINGS_CACHE_DIR = join(FLARE_DIR, 'embeddings');

export interface CachedEmbedding {
  vector: number[];
  computedAt: string;
  apiName: string;
  endpointKey: string;
}

export class EmbeddingCache {
  private basePath: string;
  private ttlMs: number;

  constructor(basePath: string = process.cwd()) {
    this.basePath = basePath;
    this.ttlMs = loadConfig().embeddingCacheTtl;
  }

  private cachePath(): string {
    return join(this.basePath, EMBEDDINGS_CACHE_DIR);
  }

  /**
   * Generate cache key from API name and endpoint key
   */
  generateCacheKey(apiName: string, endpointKey: string): string {
    const input = `${apiName}:${endpointKey}`;
    return createHash('sha256').update(input).digest('hex').substring(0, 32);
  }

  /**
   * Get cache file path for a key
   */
  private filePath(key: string): string {
    return join(this.cachePath(), `${key}.json`);
  }

  /**
   * Check if cache entry exists and is valid
   */
  async has(key: string): Promise<boolean> {
    const filePath = this.filePath(key);
    if (!existsSync(filePath)) {
      return false;
    }

    try {
      const content = await readFile(filePath, 'utf-8');
      const cached = JSON.parse(content) as CachedEmbedding;

      // Check if expired
      const computedAt = new Date(cached.computedAt).getTime();
      const now = Date.now();
      if (now - computedAt > this.ttlMs) {
        // Expired, delete and return false
        await this.delete(key);
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get cached embedding
   */
  async get(key: string): Promise<CachedEmbedding | null> {
    const filePath = this.filePath(key);
    if (!existsSync(filePath)) {
      return null;
    }

    try {
      const content = await readFile(filePath, 'utf-8');
      const cached = JSON.parse(content) as CachedEmbedding;

      // Check if expired
      const computedAt = new Date(cached.computedAt).getTime();
      const now = Date.now();
      if (now - computedAt > this.ttlMs) {
        await this.delete(key);
        return null;
      }

      return cached;
    } catch {
      return null;
    }
  }

  /**
   * Store embedding in cache
   */
  async set(key: string, embedding: number[], apiName: string, endpointKey: string): Promise<void> {
    const cacheDir = this.cachePath();
    if (!existsSync(cacheDir)) {
      await mkdir(cacheDir, { recursive: true });
    }

    const cached: CachedEmbedding = {
      vector: embedding,
      computedAt: new Date().toISOString(),
      apiName,
      endpointKey,
    };

    const filePath = this.filePath(key);
    await writeFile(filePath, JSON.stringify(cached), 'utf-8');
  }

  /**
   * Delete cache entry
   */
  async delete(key: string): Promise<void> {
    const filePath = this.filePath(key);
    if (existsSync(filePath)) {
      await unlink(filePath);
    }
  }

  /**
   * Invalidate cache for a specific API
   */
  async invalidateApi(apiName: string): Promise<void> {
    const cacheDir = this.cachePath();
    if (!existsSync(cacheDir)) {
      return;
    }

    const files = await readdir(cacheDir);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      try {
        const content = await readFile(join(cacheDir, file), 'utf-8');
        const cached = JSON.parse(content) as CachedEmbedding;

        if (cached.apiName === apiName) {
          await unlink(join(cacheDir, file));
        }
      } catch {
        // Ignore invalid cache files
      }
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    const cacheDir = this.cachePath();
    if (!existsSync(cacheDir)) {
      return;
    }

    const files = await readdir(cacheDir);
    for (const file of files) {
      if (file.endsWith('.json')) {
        await unlink(join(cacheDir, file));
      }
    }
  }

  /**
   * Get cache statistics
   */
  async stats(): Promise<{ count: number; oldest: string | null; newest: string | null }> {
    const cacheDir = this.cachePath();
    if (!existsSync(cacheDir)) {
      return { count: 0, oldest: null, newest: null };
    }

    const files = await readdir(cacheDir);
    const entries: CachedEmbedding[] = [];

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      try {
        const content = await readFile(join(cacheDir, file), 'utf-8');
        entries.push(JSON.parse(content) as CachedEmbedding);
      } catch {
        // Ignore invalid cache files
      }
    }

    if (entries.length === 0) {
      return { count: 0, oldest: null, newest: null };
    }

    const timestamps = entries.map(e => new Date(e.computedAt).getTime());
    return {
      count: entries.length,
      oldest: new Date(Math.min(...timestamps)).toISOString(),
      newest: new Date(Math.max(...timestamps)).toISOString(),
    };
  }
}

// Create singleton instance
export const embeddingCache = new EmbeddingCache();