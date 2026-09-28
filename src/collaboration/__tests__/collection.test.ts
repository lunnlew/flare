import { vi, describe, test, expect, beforeEach } from 'vitest';
import {
  InMemoryCollectionManager,
  validateCollection,
  validateBundle,
  SharedCollectionSchema,
  CollectionBundleSchema,
} from '../collection.js';
import type { API } from '../../ir/index.js';

describe('collaboration - collection', () => {
  describe('SharedCollectionSchema', () => {
    test('[主体] validates valid collection', () => {
      const valid = {
        id: 'col_1',
        name: 'Test Collection',
        apis: ['api1', 'api2'],
        version: '1.0.0',
      };
      expect(() => SharedCollectionSchema.parse(valid)).not.toThrow();
    });

    test('[主体] applies default version', () => {
      const valid = {
        id: 'col_1',
        name: 'Test',
        apis: [],
      };
      const result = SharedCollectionSchema.parse(valid);
      expect(result.version).toBe('1.0.0');
    });

    test('[边界] rejects empty apis array type', () => {
      const invalid = {
        id: 'col_1',
        name: 'Test',
        apis: 'not-an-array' as any,
      };
      expect(() => SharedCollectionSchema.parse(invalid)).toThrow();
    });
  });

  describe('CollectionBundleSchema', () => {
    test('[主体] validates valid bundle', () => {
      const valid = {
        version: '1.0.0',
        exportedAt: '2024-01-01T00:00:00.000Z',
        collection: {
          id: 'col_1',
          name: 'Test',
          apis: [],
          version: '1.0.0',
        },
        apis: [],
      };
      expect(() => CollectionBundleSchema.parse(valid)).not.toThrow();
    });

    test('[边界] rejects missing collection', () => {
      const invalid = {
        version: '1.0.0',
        exportedAt: '2024-01-01',
        apis: [],
      };
      expect(() => CollectionBundleSchema.parse(invalid)).toThrow();
    });
  });

  describe('InMemoryCollectionManager', () => {
    let manager: InMemoryCollectionManager;

    beforeEach(() => {
      manager = new InMemoryCollectionManager();
    });

    test('[主体] creates collection with id and sharedAt', async () => {
      const created = await manager.create({
        name: 'My Collection',
        apis: ['api1'],
      });

      expect(created.id).toMatch(/^col_/);
      expect(created.name).toBe('My Collection');
      expect(created.sharedAt).toBeDefined();
    });

    test('[主体] finds collection by id', async () => {
      const created = await manager.create({
        name: 'Find Me',
        apis: [],
      });

      const found = await manager.findById(created.id);
      expect(found?.name).toBe('Find Me');
    });

    test('[主体] lists all collections', async () => {
      await manager.create({ name: 'Collection 1', apis: [] });
      await manager.create({ name: 'Collection 2', apis: [] });

      const all = await manager.list();
      expect(all).toHaveLength(2);
    });

    test('[主体] updates collection', async () => {
      const created = await manager.create({
        name: 'Original',
        apis: [],
      });

      const updated = await manager.update(created.id, {
        name: 'Updated',
      });

      expect(updated?.name).toBe('Updated');
      expect(updated?.id).toBe(created.id);
    });

    test('[主体] returns null when updating non-existent', async () => {
      const result = await manager.update('non_existent', { name: 'Test' });
      expect(result).toBeNull();
    });

    test('[主体] deletes collection', async () => {
      const created = await manager.create({
        name: 'To Delete',
        apis: [],
      });

      await manager.delete(created.id);
      const found = await manager.findById(created.id);
      expect(found).toBeNull();
    });

    test('[主体] adds API to collection', async () => {
      const created = await manager.create({
        name: 'Test',
        apis: ['api1'],
      });

      await manager.addAPI(created.id, 'api2');
      const found = await manager.findById(created.id);
      expect(found?.apis).toContain('api2');
    });

    test('[主体] removes API from collection', async () => {
      const created = await manager.create({
        name: 'Test',
        apis: ['api1', 'api2'],
      });

      await manager.removeAPI(created.id, 'api1');
      const found = await manager.findById(created.id);
      expect(found?.apis).not.toContain('api1');
      expect(found?.apis).toContain('api2');
    });

    test('[主体] exports collection', async () => {
      const created = await manager.create({
        name: 'Export Test',
        apis: ['api1'],
      });

      const mockApis: API[] = [
        { name: 'api1', version: '1.0.0', endpoints: [] } as API,
        { name: 'api2', version: '1.0.0', endpoints: [] } as API,
      ];

      const bundle = await manager.exportCollection(created.id, mockApis);
      expect(bundle.collection.name).toBe('Export Test');
      expect(bundle.apis).toHaveLength(1);
      expect(bundle.apis[0].name).toBe('api1');
    });

    test('[主体] imports collection bundle', async () => {
      const bundle = {
        version: '1.0.0',
        exportedAt: '2024-01-01T00:00:00.000Z',
        collection: {
          id: 'old_id',
          name: 'Imported Collection',
          apis: ['api1'],
          version: '2.0.0',
        },
        apis: [],
      };

      const imported = await manager.importCollection(bundle);
      expect(imported.name).toBe('Imported Collection');
      expect(imported.version).toBe('2.0.0');
      expect(imported.id).toMatch(/^col_/);
    });

    test('[边界] exportCollection throws when not found', async () => {
      const mockApis: API[] = [];
      await expect(manager.exportCollection('non_existent', mockApis)).rejects.toThrow(
        'Collection not found'
      );
    });
  });

  describe('validateCollection', () => {
    test('[主体] returns collection when valid', () => {
      const data = { id: 'col_1', name: 'Test', apis: [] };
      const result = validateCollection(data);
      expect(result.name).toBe('Test');
    });

    test('[边界] throws when invalid', () => {
      const data = { id: 'col_1', name: 123 as any, apis: [] };
      expect(() => validateCollection(data)).toThrow();
    });
  });

  describe('validateBundle', () => {
    test('[主体] returns bundle when valid', () => {
      const data = {
        version: '1.0.0',
        exportedAt: '2024-01-01T00:00:00.000Z',
        collection: { id: 'col_1', name: 'Test', apis: [] },
        apis: [],
      };
      const result = validateBundle(data);
      expect(result.version).toBe('1.0.0');
    });

    test('[边界] throws when invalid', () => {
      const data = { version: '1.0.0' };
      expect(() => validateBundle(data)).toThrow();
    });
  });
});