import { z } from 'zod';

// Annotation schema for API endpoints
export const AnnotationSchema = z.object({
  id: z.string(),
  endpointId: z.string().optional(),
  type: z.enum(['comment', 'note', 'example', 'tag']),
  content: z.string(),
  author: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
});
export type Annotation = z.infer<typeof AnnotationSchema>;

// Request/Response example schema
export const ExampleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  request: z.object({
    headers: z.record(z.string()).optional(),
    body: z.any().optional(),
    queryParams: z.record(z.string()).optional(),
  }).optional(),
  response: z.object({
    statusCode: z.number(),
    headers: z.record(z.string()).optional(),
    body: z.any().optional(),
  }).optional(),
  tags: z.array(z.string()).optional(),
});
export type Example = z.infer<typeof ExampleSchema>;

// Annotation store interface
export interface AnnotationStore {
  save(annotation: Annotation): Promise<void>;
  delete(id: string): Promise<void>;
  findByEndpoint(endpointId: string): Promise<Annotation[]>;
  findById(id: string): Promise<Annotation | null>;
  list(): Promise<Annotation[]>;
}

// Annotation manager
export class AnnotationManager {
  constructor(private store: AnnotationStore) {}

  async createAnnotation(data: Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'>): Promise<Annotation> {
    const annotation: Annotation = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.store.save(annotation);
    return annotation;
  }

  async updateAnnotation(id: string, data: Partial<Annotation>): Promise<Annotation | null> {
    const existing = await this.store.findById(id);
    if (!existing) {
      return null;
    }

    const updated: Annotation = {
      ...existing,
      ...data,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };

    await this.store.save(updated);
    return updated;
  }

  async deleteAnnotation(id: string): Promise<void> {
    await this.store.delete(id);
  }

  async getAnnotationsForEndpoint(endpointId: string): Promise<Annotation[]> {
    return this.store.findByEndpoint(endpointId);
  }

  async addExampleToEndpoint(endpointId: string, example: Omit<Example, 'id'>): Promise<Example> {
    const fullExample: Example = {
      ...example,
      id: generateId(),
    };

    // Store example - in a real implementation, this would be persisted
    return fullExample;
  }
}

// In-memory annotation store (for demonstration)
export class InMemoryAnnotationStore implements AnnotationStore {
  private annotations: Map<string, Annotation> = new Map();

  async save(annotation: Annotation): Promise<void> {
    this.annotations.set(annotation.id, annotation);
  }

  async delete(id: string): Promise<void> {
    this.annotations.delete(id);
  }

  async findByEndpoint(endpointId: string): Promise<Annotation[]> {
    const results: Annotation[] = [];
    for (const annotation of this.annotations.values()) {
      if (annotation.endpointId === endpointId) {
        results.push(annotation);
      }
    }
    return results;
  }

  async findById(id: string): Promise<Annotation | null> {
    return this.annotations.get(id) || null;
  }

  async list(): Promise<Annotation[]> {
    return Array.from(this.annotations.values());
  }
}

// Validate annotation data
export function validateAnnotation(data: unknown): Annotation {
  return AnnotationSchema.parse(data);
}

// Generate unique ID
function generateId(): string {
  return `ann_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}