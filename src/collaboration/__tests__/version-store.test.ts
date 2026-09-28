import { vi, describe, test, expect, beforeEach } from 'vitest';
import { existsSync } from 'fs';

// Mock fs/promises before importing
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  readdir: vi.fn(),
  mkdir: vi.fn(),
  unlink: vi.fn(),
  rename: vi.fn(),
}));

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  promises: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    readdir: vi.fn(),
    mkdir: vi.fn(),
    unlink: vi.fn(),
    rename: vi.fn(),
  },
}));

import { FileVersionStore } from '../version-store.js';
import type { API } from '../../ir/index.js';

describe('collaboration - FileVersionStore', () => {
  function createMockAPI(overrides: Partial<API> = {}): API {
    return {
      name: 'Test API',
      version: '1.0.0',
      baseUrl: 'https://api.example.com',
      endpoints: [{ path: '/test', method: 'GET' }],
      source: { type: 'openapi' },
      ...overrides,
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('snapshot', () => {
    test('[主体] 创建 API 快照', async () => {
      const store = new FileVersionStore('/tmp/test');
      const api = createMockAPI();
      const fsPromises = await import('fs/promises');

      fsPromises.writeFile.mockResolvedValue(undefined);
      fsPromises.mkdir.mockResolvedValue(undefined);
      (existsSync as any).mockReturnValue(false);

      const snapshot = await store.snapshot(api);

      expect(snapshot).toBeTruthy();
      expect(snapshot.apiName).toBe('Test API');
      expect(snapshot.version).toBe('1.0.0');
      expect(snapshot.snapshot).toBeTruthy();
      expect(snapshot.createdAt).toBeTruthy();
    });

    test('[主体] 创建带备注的快照', async () => {
      const store = new FileVersionStore('/tmp/test');
      const api = createMockAPI();
      const fsPromises = await import('fs/promises');

      fsPromises.writeFile.mockResolvedValue(undefined);
      fsPromises.mkdir.mockResolvedValue(undefined);
      (existsSync as any).mockReturnValue(false);

      const snapshot = await store.snapshot(api, 'Initial release', ['stable']);

      expect(snapshot.notes).toBe('Initial release');
      expect(snapshot.tags).toContain('stable');
    });
  });

  describe('listVersions', () => {
    test('[边界] 不存在的 API 返回空数组', async () => {
      const store = new FileVersionStore('/tmp/test');

      (existsSync as any).mockReturnValue(false);

      const versions = await store.listVersions('Non Existent');

      expect(versions).toHaveLength(0);
    });
  });

  describe('getSnapshot', () => {
    test('[边界] 不存在的快照返回 null', async () => {
      const store = new FileVersionStore('/tmp/test');

      (existsSync as any).mockReturnValue(false);

      const found = await store.getSnapshot('Test API', 'non_existent');

      expect(found).toBeNull();
    });
  });

  describe('diff', () => {
    test('[边界] 任一快照不存在时返回空差异', async () => {
      const store = new FileVersionStore('/tmp/test');

      (existsSync as any).mockReturnValue(false);

      const diff = await store.diff('Test API', 'non_existent', 'v_123');

      expect(diff.hasChanges).toBe(false);
      expect(diff.changes).toHaveLength(0);
    });
  });

  describe('restore', () => {
    test('[边界] 恢复不存在的版本返回 null', async () => {
      const store = new FileVersionStore('/tmp/test');

      (existsSync as any).mockReturnValue(false);

      const restored = await store.restore('Test API', 'non_existent');

      expect(restored).toBeNull();
    });
  });

  describe('deleteApiVersions', () => {
    test('[边界] 删除不存在的 API 不报错', async () => {
      const store = new FileVersionStore('/tmp/test');

      (existsSync as any).mockReturnValue(false);

      // Should not throw
      await store.deleteApiVersions('Non Existent');
    });
  });
});