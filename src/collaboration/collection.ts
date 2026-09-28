import { z } from 'zod';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { join } from 'path';
import type { API } from '../ir/index.js';

const COLLAB_DIR = '.flare/collections';

// Shared collection schema
export const SharedCollectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  apis: z.array(z.string()), // API names or references
  tags: z.array(z.string()).optional(),
  owner: z.string().optional(),
  sharedAt: z.string().optional(),
  version: z.string().default('1.0.0'),
  variables: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional(),
});
export type SharedCollection = z.infer<typeof SharedCollectionSchema>;

// Import/Export bundle schema
export const CollectionBundleSchema = z.object({
  version: z.string(),
  exportedAt: z.string(),
  collection: SharedCollectionSchema,
  apis: z.array(z.any()),
  annotations: z.array(z.any()).optional(),
});
export type CollectionBundle = z.infer<typeof CollectionBundleSchema>;

// Collection manager interface
export interface CollectionManager {
  create(collection: Omit<SharedCollection, 'id' | 'sharedAt'>): Promise<SharedCollection>;
  update(id: string, data: Partial<SharedCollection>): Promise<SharedCollection | null>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<SharedCollection | null>;
  list(): Promise<SharedCollection[]>;
  addAPI(collectionId: string, apiRef: string): Promise<void>;
  removeAPI(collectionId: string, apiRef: string): Promise<void>;
  exportCollection(id: string, apis: API[]): Promise<CollectionBundle>;
  importCollection(bundle: CollectionBundle): Promise<SharedCollection>;
}

// In-memory collection manager
export class InMemoryCollectionManager implements CollectionManager {
  private collections: Map<string, SharedCollection> = new Map();

  async create(data: Omit<SharedCollection, 'id' | 'sharedAt'>): Promise<SharedCollection> {
    const collection: SharedCollection = {
      ...data,
      id: generateId(),
      sharedAt: new Date().toISOString(),
    };
    this.collections.set(collection.id, collection);
    return collection;
  }

  async update(id: string, data: Partial<SharedCollection>): Promise<SharedCollection | null> {
    const existing = this.collections.get(id);
    if (!existing) return null;

    const updated: SharedCollection = {
      ...existing,
      ...data,
      id: existing.id,
      sharedAt: existing.sharedAt,
    };
    this.collections.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.collections.delete(id);
  }

  async findById(id: string): Promise<SharedCollection | null> {
    return this.collections.get(id) || null;
  }

  async list(): Promise<SharedCollection[]> {
    return Array.from(this.collections.values());
  }

  async addAPI(collectionId: string, apiRef: string): Promise<void> {
    const collection = this.collections.get(collectionId);
    if (collection && !collection.apis.includes(apiRef)) {
      const updatedApis = [...collection.apis, apiRef];
      this.collections.set(collectionId, { ...collection, apis: updatedApis });
    }
  }

  async removeAPI(collectionId: string, apiRef: string): Promise<void> {
    const collection = this.collections.get(collectionId);
    if (collection) {
      const filteredApis = collection.apis.filter(api => api !== apiRef);
      this.collections.set(collectionId, { ...collection, apis: filteredApis });
    }
  }

  async exportCollection(id: string, apis: API[]): Promise<CollectionBundle> {
    const collection = await this.findById(id);
    if (!collection) {
      throw new Error(`Collection not found: ${id}`);
    }

    const bundleApis = apis.filter(api => collection.apis.includes(api.name));

    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      collection,
      apis: bundleApis,
    };
  }

  async importCollection(bundle: CollectionBundle): Promise<SharedCollection> {
    return this.create({
      name: bundle.collection.name,
      description: bundle.collection.description,
      apis: bundle.collection.apis,
      tags: bundle.collection.tags,
      owner: bundle.collection.owner,
      version: bundle.collection.version,
      variables: bundle.collection.variables,
      metadata: bundle.collection.metadata,
    });
  }
}

// File-based collection manager
export class FileCollectionManager implements CollectionManager {
  constructor(private basePath: string = process.cwd()) {}

  private collectionsPath(): string {
    return join(this.basePath, COLLAB_DIR);
  }

  private collectionPath(id: string): string {
    return join(this.collectionsPath(), `${id}.json`);
  }

  async init(): Promise<void> {
    await mkdir(this.collectionsPath(), { recursive: true });
  }

  async create(data: Omit<SharedCollection, 'id' | 'sharedAt'>): Promise<SharedCollection> {
    await this.init();
    const collection: SharedCollection = {
      ...data,
      id: generateId(),
      sharedAt: new Date().toISOString(),
    };
    await writeFile(
      this.collectionPath(collection.id),
      JSON.stringify(collection, null, 2),
      'utf-8'
    );
    return collection;
  }

  async update(id: string, data: Partial<SharedCollection>): Promise<SharedCollection | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const updated: SharedCollection = {
      ...existing,
      ...data,
      id: existing.id,
      sharedAt: existing.sharedAt,
    };
    await writeFile(
      this.collectionPath(id),
      JSON.stringify(updated, null, 2),
      'utf-8'
    );
    return updated;
  }

  async delete(id: string): Promise<void> {
    const { unlink } = await import('fs/promises');
    await unlink(this.collectionPath(id));
  }

  async findById(id: string): Promise<SharedCollection | null> {
    try {
      const content = await readFile(this.collectionPath(id), 'utf-8');
      return JSON.parse(content) as SharedCollection;
    } catch {
      return null;
    }
  }

  async list(): Promise<SharedCollection[]> {
    await this.init();
    const { readdir } = await import('fs/promises');
    const files = await readdir(this.collectionsPath());
    const collections: SharedCollection[] = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = await readFile(join(this.collectionsPath(), file), 'utf-8');
        collections.push(JSON.parse(content) as SharedCollection);
      }
    }

    return collections;
  }

  async addAPI(collectionId: string, apiRef: string): Promise<void> {
    const collection = await this.findById(collectionId);
    if (collection && !collection.apis.includes(apiRef)) {
      const updatedCollection = {
        ...collection,
        apis: [...collection.apis, apiRef],
      };
      await writeFile(
        this.collectionPath(collectionId),
        JSON.stringify(updatedCollection, null, 2),
        'utf-8'
      );
    }
  }

  async removeAPI(collectionId: string, apiRef: string): Promise<void> {
    const collection = await this.findById(collectionId);
    if (collection) {
      const filteredApis = collection.apis.filter(api => api !== apiRef);
      const updatedCollection = { ...collection, apis: filteredApis };
      await writeFile(
        this.collectionPath(collectionId),
        JSON.stringify(updatedCollection, null, 2),
        'utf-8'
      );
    }
  }

  async exportCollection(id: string, apis: API[]): Promise<CollectionBundle> {
    const collection = await this.findById(id);
    if (!collection) {
      throw new Error(`Collection not found: ${id}`);
    }

    const bundleApis = apis.filter(api => collection.apis.includes(api.name));

    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      collection,
      apis: bundleApis,
    };
  }

  async importCollection(bundle: CollectionBundle): Promise<SharedCollection> {
    return this.create({
      name: bundle.collection.name,
      description: bundle.collection.description,
      apis: bundle.collection.apis,
      tags: bundle.collection.tags,
      owner: bundle.collection.owner,
      version: bundle.collection.version,
      variables: bundle.collection.variables,
      metadata: bundle.collection.metadata,
    });
  }
}

// Validate collection data
export function validateCollection(data: unknown): SharedCollection {
  return SharedCollectionSchema.parse(data);
}

// Validate bundle data
export function validateBundle(data: unknown): CollectionBundle {
  return CollectionBundleSchema.parse(data);
}

// Generate unique ID
function generateId(): string {
  return `col_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}