import { vi, describe, test, expect, beforeEach } from 'vitest';
import {
  AnnotationManager,
  InMemoryAnnotationStore,
  validateAnnotation,
  AnnotationSchema,
  ExampleSchema,
} from '../annotations.js';

describe('collaboration - annotations', () => {
  describe('AnnotationSchema', () => {
    test('[主体] validates valid annotation', () => {
      const valid = {
        id: 'ann_1',
        type: 'comment' as const,
        content: 'Test annotation',
      };
      expect(() => AnnotationSchema.parse(valid)).not.toThrow();
    });

    test('[边界] rejects invalid type', () => {
      const invalid = {
        id: 'ann_1',
        type: 'invalid' as any,
        content: 'Test',
      };
      expect(() => AnnotationSchema.parse(invalid)).toThrow();
    });

    test('[边界] rejects missing required fields', () => {
      const invalid = {
        id: 'ann_1',
      };
      expect(() => AnnotationSchema.parse(invalid)).toThrow();
    });
  });

  describe('ExampleSchema', () => {
    test('[主体] validates valid example', () => {
      const valid = {
        id: 'ex_1',
        name: 'Get User',
        request: {
          headers: { 'Content-Type': 'application/json' },
          body: { id: 1 },
        },
        response: {
          statusCode: 200,
          body: { id: 1, name: 'John' },
        },
      };
      expect(() => ExampleSchema.parse(valid)).not.toThrow();
    });

    test('[主体] validates minimal example', () => {
      const valid = {
        id: 'ex_1',
        name: 'Simple Example',
      };
      expect(() => ExampleSchema.parse(valid)).not.toThrow();
    });

    test('[边界] rejects invalid status code type', () => {
      const invalid = {
        id: 'ex_1',
        name: 'Test',
        response: {
          statusCode: '200' as any,
        },
      };
      expect(() => ExampleSchema.parse(invalid)).toThrow();
    });
  });

  describe('InMemoryAnnotationStore', () => {
    let store: InMemoryAnnotationStore;

    beforeEach(() => {
      store = new InMemoryAnnotationStore();
    });

    test('[主体] saves and retrieves annotation', async () => {
      const annotation = {
        id: 'ann_1',
        type: 'comment' as const,
        content: 'Test annotation',
        author: 'tester',
      };
      await store.save(annotation);
      const found = await store.findById('ann_1');
      expect(found).toEqual(annotation);
    });

    test('[主体] finds by endpoint', async () => {
      await store.save({ id: 'ann_1', type: 'comment', content: 'C1', endpointId: 'ep_1' });
      await store.save({ id: 'ann_2', type: 'note', content: 'C2', endpointId: 'ep_2' });
      await store.save({ id: 'ann_3', type: 'example', content: 'C3', endpointId: 'ep_1' });

      const ep1Annotations = await store.findByEndpoint('ep_1');
      expect(ep1Annotations).toHaveLength(2);
      expect(ep1Annotations.map(a => a.id)).toContain('ann_1');
      expect(ep1Annotations.map(a => a.id)).toContain('ann_3');
    });

    test('[主体] deletes annotation', async () => {
      await store.save({ id: 'ann_1', type: 'comment', content: 'Test' });
      await store.delete('ann_1');
      const found = await store.findById('ann_1');
      expect(found).toBeNull();
    });

    test('[主体] lists all annotations', async () => {
      await store.save({ id: 'ann_1', type: 'comment', content: 'C1' });
      await store.save({ id: 'ann_2', type: 'note', content: 'C2' });
      const all = await store.list();
      expect(all).toHaveLength(2);
    });

    test('[边界] findById returns null for non-existent', async () => {
      const found = await store.findById('non_existent');
      expect(found).toBeNull();
    });

    test('[边界] findByEndpoint returns empty for non-existent endpoint', async () => {
      const found = await store.findByEndpoint('non_existent');
      expect(found).toHaveLength(0);
    });
  });

  describe('AnnotationManager', () => {
    let store: InMemoryAnnotationStore;
    let manager: AnnotationManager;

    beforeEach(() => {
      store = new InMemoryAnnotationStore();
      manager = new AnnotationManager(store);
    });

    test('[主体] creates annotation with generated id and timestamps', async () => {
      const created = await manager.createAnnotation({
        type: 'comment',
        content: 'New annotation',
        author: 'tester',
      });

      expect(created.id).toMatch(/^ann_/);
      expect(created.createdAt).toBeDefined();
      expect(created.updatedAt).toBeDefined();
      expect(created.content).toBe('New annotation');
    });

    test('[主体] updates annotation', async () => {
      const created = await manager.createAnnotation({
        type: 'comment',
        content: 'Original',
      });

      const updated = await manager.updateAnnotation(created.id, {
        content: 'Updated content',
      });

      expect(updated?.content).toBe('Updated content');
      expect(updated?.id).toBe(created.id);
    });

    test('[主体] returns null when updating non-existent', async () => {
      const result = await manager.updateAnnotation('non_existent', {
        content: 'Updated',
      });
      expect(result).toBeNull();
    });

    test('[主体] deletes annotation', async () => {
      const created = await manager.createAnnotation({
        type: 'comment',
        content: 'To delete',
      });

      await manager.deleteAnnotation(created.id);
      const found = await store.findById(created.id);
      expect(found).toBeNull();
    });

    test('[主体] gets annotations for endpoint', async () => {
      await manager.createAnnotation({
        type: 'comment',
        content: 'Comment 1',
        endpointId: 'ep_1',
      });
      await manager.createAnnotation({
        type: 'note',
        content: 'Note 1',
        endpointId: 'ep_1',
      });

      const annotations = await manager.getAnnotationsForEndpoint('ep_1');
      expect(annotations).toHaveLength(2);
    });

    test('[主体] adds example to endpoint', async () => {
      const example = await manager.addExampleToEndpoint('ep_1', {
        name: 'Get User Example',
        request: {
          body: { id: 1 },
        },
        response: {
          statusCode: 200,
          body: { id: 1, name: 'John' },
        },
      });

      expect(example.id).toMatch(/^ann_/);
      expect(example.name).toBe('Get User Example');
    });
  });

  describe('validateAnnotation', () => {
    test('[主体] returns annotation when valid', () => {
      const data = { id: 'ann_1', type: 'comment', content: 'Test' };
      const result = validateAnnotation(data);
      expect(result.id).toBe('ann_1');
    });

    test('[边界] throws when invalid', () => {
      const data = { id: 'ann_1', type: 'invalid' as any };
      expect(() => validateAnnotation(data)).toThrow();
    });
  });
});