import { vi, describe, test, expect, beforeEach } from 'vitest';
import {
  InMemoryVersionControl,
  detectChanges,
  validateVersionTag,
  validateDiffResult,
  VersionTagSchema,
  ChangeEntrySchema,
  VersionSnapshotSchema,
  DiffResultSchema,
} from '../version.js';
import type { API } from '../../ir/index.js';

describe('collaboration - version', () => {
  describe('Schema validation', () => {
    test('[主体] VersionTagSchema validates valid tag', () => {
      const valid = {
        id: 'ver_1',
        name: 'api@1.0.0',
        version: '1.0.0',
        apiName: 'Test API',
        createdAt: '2024-01-01T00:00:00.000Z',
      };
      expect(() => VersionTagSchema.parse(valid)).not.toThrow();
    });

    test('[边界] ChangeEntrySchema validates valid entry', () => {
      const valid = {
        id: 'ch_1',
        timestamp: '2024-01-01T00:00:00.000Z',
        type: 'added' as const,
        entityType: 'endpoint' as const,
        entityPath: 'GET /users',
        description: 'Added endpoint',
      };
      expect(() => ChangeEntrySchema.parse(valid)).not.toThrow();
    });

    test('[边界] ChangeEntrySchema rejects invalid type', () => {
      const invalid = {
        id: 'ch_1',
        timestamp: '2024-01-01',
        type: 'invalid' as any,
        entityType: 'endpoint',
        entityPath: '/test',
        description: 'Test',
      };
      expect(() => ChangeEntrySchema.parse(invalid)).toThrow();
    });

    test('[主体] DiffResultSchema validates valid result', () => {
      const valid = {
        hasChanges: true,
        changes: [],
        summary: { added: 0, modified: 0, deleted: 0 },
      };
      expect(() => DiffResultSchema.parse(valid)).not.toThrow();
    });

    test('[主体] VersionSnapshotSchema validates valid snapshot', () => {
      const valid = {
        id: 'snap_1',
        version: '1.0.0',
        apiName: 'Test API',
        snapshot: {},
        createdAt: '2024-01-01T00:00:00.000Z',
      };
      expect(() => VersionSnapshotSchema.parse(valid)).not.toThrow();
    });
  });

  describe('InMemoryVersionControl', () => {
    let vc: InMemoryVersionControl;

    beforeEach(() => {
      vc = new InMemoryVersionControl();
    });

    test('[主体] tagVersion creates tag with id and timestamp', async () => {
      const tag = await vc.tagVersion('Test API', '1.0.0', 'Initial version');

      expect(tag.id).toMatch(/^ver_/);
      expect(tag.name).toBe('Test API@1.0.0');
      expect(tag.version).toBe('1.0.0');
      expect(tag.apiName).toBe('Test API');
      expect(tag.createdAt).toBeDefined();
      expect(tag.notes).toBe('Initial version');
    });

    test('[主体] getVersionHistory returns tags for api', async () => {
      await vc.tagVersion('API1', '1.0.0');
      await vc.tagVersion('API1', '2.0.0');
      await vc.tagVersion('API2', '1.0.0');

      const history = await vc.getVersionHistory('API1');
      expect(history).toHaveLength(2);
    });

    test('[主体] getVersionHistory returns sorted by createdAt', async () => {
      await vc.tagVersion('API', '1.0.0');
      await vc.tagVersion('API', '2.0.0');

      const history = await vc.getVersionHistory('API');
      expect(history[0].version).toBe('1.0.0');
      expect(history[1].version).toBe('2.0.0');
    });

    test('[主体] getSnapshot returns snapshot by id', async () => {
      const snapshot = await vc.createSnapshot(
        { name: 'Test', version: '1.0.0', endpoints: [] } as API,
        'Test snapshot'
      );

      const found = await vc.getSnapshot(snapshot.id);
      expect(found?.apiName).toBe('Test');
    });

    test('[主体] getSnapshot returns null for non-existent', async () => {
      const found = await vc.getSnapshot('non_existent');
      expect(found).toBeNull();
    });

    test('[主体] createSnapshot creates snapshot and auto-tags', async () => {
      const snapshot = await vc.createSnapshot(
        { name: 'Test', version: '1.5.0', endpoints: [] } as API
      );

      expect(snapshot.id).toMatch(/^ver_/);
      expect(snapshot.apiName).toBe('Test');
      expect(snapshot.version).toBe('1.5.0');
    });

    test('[主体] listSnapshots returns all snapshots for api', async () => {
      await vc.createSnapshot({ name: 'Test', version: '1.0.0', endpoints: [] } as API);
      await vc.createSnapshot({ name: 'Test', version: '2.0.0', endpoints: [] } as API);
      await vc.createSnapshot({ name: 'Other', version: '1.0.0', endpoints: [] } as API);

      const snapshots = await vc.listSnapshots('Test');
      expect(snapshots).toHaveLength(2);
    });

    test('[主体] diff returns changes between versions', async () => {
      const api1: API = {
        name: 'Test',
        version: '1.0.0',
        endpoints: [
          { path: '/users', method: 'GET', operationId: 'getUsers' },
        ],
      } as API;

      const api2: API = {
        name: 'Test',
        version: '2.0.0',
        endpoints: [
          { path: '/users', method: 'GET', operationId: 'getUsers' },
          { path: '/posts', method: 'POST', operationId: 'createPost' },
        ],
      } as API;

      // Create snapshots
      await vc.createSnapshot(api1);
      await vc.createSnapshot(api2);

      const diff = await vc.diff('Test', '1.0.0', '2.0.0');
      expect(diff.hasChanges).toBe(true);
      expect(diff.summary.added).toBe(1);
      expect(diff.summary.modified).toBe(0);
      expect(diff.summary.deleted).toBe(0);
    });

    test('[主体] diff returns no changes for identical versions', async () => {
      const api: API = {
        name: 'Test',
        version: '1.0.0',
        endpoints: [{ path: '/users', method: 'GET', operationId: 'getUsers' }],
      } as API;

      await vc.createSnapshot(api);
      await vc.createSnapshot({ ...api, version: '2.0.0' } as API);

      const diff = await vc.diff('Test', '1.0.0', '2.0.0');
      expect(diff.hasChanges).toBe(false);
    });

    test('[边界] diff handles missing versions', async () => {
      const diff = await vc.diff('NonExistent', '1.0.0', '2.0.0');
      expect(diff.hasChanges).toBe(false);
    });
  });

  describe('detectChanges', () => {
    test('[主体] detects added endpoints', () => {
      const before: API = { name: 'Test', version: '1.0.0', endpoints: [] } as API;
      const after: API = {
        name: 'Test',
        version: '2.0.0',
        endpoints: [{ path: '/users', method: 'GET', operationId: 'getUsers' }],
      } as API;

      const changes = detectChanges(before, after);

      expect(changes).toHaveLength(1);
      expect(changes[0].type).toBe('added');
      expect(changes[0].entityType).toBe('endpoint');
      expect(changes[0].entityPath).toBe('GET:/users');
    });

    test('[主体] detects deleted endpoints', () => {
      const before: API = {
        name: 'Test',
        version: '1.0.0',
        endpoints: [{ path: '/users', method: 'GET', operationId: 'getUsers' }],
      } as API;
      const after: API = { name: 'Test', version: '2.0.0', endpoints: [] } as API;

      const changes = detectChanges(before, after);

      expect(changes).toHaveLength(1);
      expect(changes[0].type).toBe('deleted');
    });

    test('[主体] detects modified endpoints', () => {
      const before: API = {
        name: 'Test',
        version: '1.0.0',
        endpoints: [{ path: '/users', method: 'GET', summary: 'Get users' }],
      } as API;
      const after: API = {
        name: 'Test',
        version: '2.0.0',
        endpoints: [{ path: '/users', method: 'GET', summary: 'Retrieve users' }],
      } as API;

      const changes = detectChanges(before, after);

      expect(changes.some(c => c.type === 'modified')).toBe(true);
      const modified = changes.find(c => c.type === 'modified');
      expect(modified?.description).toContain('Summary changed');
    });

    test('[主体] returns empty when no changes', () => {
      const before: API = {
        name: 'Test',
        version: '1.0.0',
        endpoints: [{ path: '/users', method: 'GET', operationId: 'getUsers' }],
      } as API;
      const after: API = {
        name: 'Test',
        version: '2.0.0',
        endpoints: [{ path: '/users', method: 'GET', operationId: 'getUsers' }],
      } as API;

      const changes = detectChanges(before, after);

      expect(changes).toHaveLength(0);
    });

    test('[主体] handles complex multi-change scenario', () => {
      const before: API = {
        name: 'Test',
        version: '1.0.0',
        endpoints: [
          { path: '/users', method: 'GET', operationId: 'getUsers' },
          { path: '/posts', method: 'GET', operationId: 'getPosts' },
        ],
      } as API;

      const after: API = {
        name: 'Test',
        version: '2.0.0',
        endpoints: [
          { path: '/users', method: 'GET', operationId: 'getUsers', summary: 'Updated' },
          { path: '/comments', method: 'POST', operationId: 'createComment' },
        ],
      } as API;

      const changes = detectChanges(before, after);

      // 1 deleted (posts), 1 added (comments), 1 modified (users summary)
      expect(changes.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('validateVersionTag', () => {
    test('[主体] returns tag when valid', () => {
      const data = {
        id: 'ver_1',
        name: 'api@1.0.0',
        version: '1.0.0',
        createdAt: '2024-01-01T00:00:00.000Z',
      };
      const result = validateVersionTag(data);
      expect(result.name).toBe('api@1.0.0');
    });

    test('[边界] throws when invalid', () => {
      const data = { id: 'ver_1' };
      expect(() => validateVersionTag(data)).toThrow();
    });
  });

  describe('validateDiffResult', () => {
    test('[主体] returns diff when valid', () => {
      const data = {
        hasChanges: false,
        changes: [],
        summary: { added: 0, modified: 0, deleted: 0 },
      };
      const result = validateDiffResult(data);
      expect(result.hasChanges).toBe(false);
    });

    test('[边界] throws when hasChanges is missing', () => {
      const data = { changes: [], summary: { added: 0, modified: 0, deleted: 0 } };
      expect(() => validateDiffResult(data)).toThrow();
    });
  });
});