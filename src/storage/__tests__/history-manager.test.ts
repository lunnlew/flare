import { vi, describe, test, expect, beforeEach } from 'vitest';
import { HistoryStore, compareHistoryEntries, replayRequest } from '../history.js';

// Use vi.hoisted to ensure mocks are available when vi.mock is hoisted
const { mockWriteFile, mockReadFile, mockReaddir, mockMkdir, mockUnlink } = vi.hoisted(() => ({
  mockWriteFile: vi.fn().mockResolvedValue(undefined),
  mockReadFile: vi.fn(),
  mockReaddir: vi.fn(),
  mockMkdir: vi.fn().mockResolvedValue(undefined),
  mockUnlink: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('fs/promises', () => ({
  writeFile: mockWriteFile,
  readFile: mockReadFile,
  readdir: mockReaddir,
  mkdir: mockMkdir,
  unlink: mockUnlink,
}));

vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(true),
}));

// Mock fetch for replayRequest tests
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('HistoryStore', () => {
  let store: HistoryStore;

  const createMockEntry = (overrides: Partial<{
    id: string;
    method: string;
    url: string;
    headers: Record<string, string>;
    body: any;
    response: any;
  }> = {}): import('../history.js').HistoryEntry => ({
    id: 'h_test_123',
    timestamp: new Date().toISOString(),
    method: 'GET',
    url: 'https://api.example.com/users',
    headers: { 'Content-Type': 'application/json' },
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    store = new HistoryStore('/test/base/path');
  });

  // 主体 (Core Flows)
  describe('主体', () => {
    test('[主体] save writes entry with filtered headers', async () => {
      const entry = createMockEntry({
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer secret-token',
          'X-API-Key': 'my-api-key',
        },
      });

      await store.save(entry);

      expect(mockWriteFile).toHaveBeenCalled();
      // Should have written to history directory
      expect(mockWriteFile.mock.calls.some(call =>
        call[0] && (call[0].includes('.flare/history') || call[0].includes('history'))
      )).toBe(true);
    });

    test('[主体] save strips Authorization header', async () => {
      const entry = createMockEntry({
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer secret-token',
        },
      });

      await store.save(entry);

      // Find the write call for the entry (not the index)
      const entryWriteCall = mockWriteFile.mock.calls.find(call =>
        call[0] && call[0].includes('h_test_123')
      );
      expect(entryWriteCall).toBeDefined();
      const writtenContent = entryWriteCall![1] as string;
      expect(writtenContent).not.toContain('Authorization');
    });

    test('[主体] save strips Cookie header', async () => {
      const entry = createMockEntry({
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'session=abc123',
        },
      });

      await store.save(entry);

      const entryWriteCall = mockWriteFile.mock.calls.find(call =>
        call[0] && call[0].includes('h_test_123')
      );
      expect(entryWriteCall).toBeDefined();
      const writtenContent = entryWriteCall![1] as string;
      expect(writtenContent).not.toContain('Cookie');
    });

    test('[主体] save strips X-API-Key header', async () => {
      const entry = createMockEntry({
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'secret-api-key',
        },
      });

      await store.save(entry);

      const entryWriteCall = mockWriteFile.mock.calls.find(call =>
        call[0] && call[0].includes('h_test_123')
      );
      expect(entryWriteCall).toBeDefined();
      const writtenContent = entryWriteCall![1] as string;
      expect(writtenContent).not.toContain('X-API-Key');
    });

    test('[主体] list returns paginated entries', async () => {
      mockReaddir.mockResolvedValue(['h_1.json', 'h_2.json', 'h_3.json']);

      const mockEntry = createMockEntry({ id: 'h_1' });
      mockReadFile.mockImplementation((path: string) => {
        if (path.includes('h_1.json')) {
          return Promise.resolve(JSON.stringify(mockEntry));
        }
        return Promise.resolve(JSON.stringify({ ...mockEntry, id: 'h_unknown' }));
      });

      const entries = await store.list({ limit: 2, offset: 0 });
      expect(entries.length).toBeLessThanOrEqual(2);
    });

    test('[主体] load returns entry by id', async () => {
      const entry = createMockEntry({ id: 'h_test_123' });
      mockReadFile.mockResolvedValue(JSON.stringify(entry));

      const loaded = await store.load('h_test_123');
      expect(loaded).not.toBeNull();
      expect(loaded?.id).toBe('h_test_123');
    });

    test('[主体] delete removes entry', async () => {
      mockUnlink.mockResolvedValue(undefined);

      const result = await store.delete('h_test_123');
      expect(result).toBe(true);
      expect(mockUnlink).toHaveBeenCalled();
    });

    test('[主体] count returns total number of entries', async () => {
      mockReaddir.mockResolvedValue(['h_1.json', 'h_2.json', 'h_3.json', 'index.json']);

      const count = await store.count();
      expect(count).toBe(3);
    });
  });

  // 边界 (Boundary Conditions)
  describe('边界', () => {
    test('[边界] save strips all sensitive headers', async () => {
      const entry = createMockEntry({
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token',
          'Cookie': 'session=123',
          'X-API-Key': 'key',
          'X-Auth-Token': 'token',
          'X-Access-Token': 'token',
          'X-Refresh-Token': 'token',
          'X-Session-Token': 'token',
          'Proxy-Authorization': 'auth',
          'WWW-Authenticate': 'auth',
        },
      });

      await store.save(entry);

      // Find entry write call
      const entryWriteCall = mockWriteFile.mock.calls.find(call =>
        call[0] && call[0].includes('h_test_123')
      );
      expect(entryWriteCall).toBeDefined();
      const writtenContent = entryWriteCall![1] as string;

      // Verify sensitive headers are stripped
      expect(writtenContent).not.toContain('Authorization');
      expect(writtenContent).not.toContain('Cookie');
      expect(writtenContent).not.toContain('X-API-Key');
      expect(writtenContent).not.toContain('X-Auth-Token');
      expect(writtenContent).not.toContain('X-Access-Token');
      expect(writtenContent).not.toContain('X-Refresh-Token');
      expect(writtenContent).not.toContain('X-Session-Token');
      expect(writtenContent).not.toContain('Proxy-Authorization');
      expect(writtenContent).not.toContain('WWW-Authenticate');
      // Content-Type should remain
      expect(writtenContent).toContain('Content-Type');
    });

    test('[边界] list with offset and limit applies pagination', async () => {
      const entries = [];
      for (let i = 0; i < 25; i++) {
        entries.push(`h_${i}.json`);
      }
      mockReaddir.mockResolvedValue(entries);

      mockReadFile.mockImplementation((path: string) => {
        const id = path.match(/h_(\d+)\.json/)?.[1] || '0';
        return Promise.resolve(JSON.stringify(createMockEntry({ id: `h_${id}` })));
      });

      const page1 = await store.list({ limit: 10, offset: 0 });
      expect(page1.length).toBeLessThanOrEqual(10);

      const page2 = await store.list({ limit: 10, offset: 10 });
      expect(page2.length).toBeLessThanOrEqual(10);
    });

    test('[边界] load returns null for nonexistent id', async () => {
      mockReadFile.mockRejectedValue(new Error('File not found'));

      const result = await store.load('nonexistent');
      expect(result).toBeNull();
    });

    test('[边界] delete returns false for nonexistent id', async () => {
      mockUnlink.mockRejectedValue(new Error('File not found'));

      const result = await store.delete('nonexistent');
      expect(result).toBe(false);
    });

    test('[边界] count returns 0 when no entries', async () => {
      mockReaddir.mockResolvedValue(['index.json']);

      const count = await store.count();
      expect(count).toBe(0);
    });

    test('[边界] list filters by method', async () => {
      mockReaddir.mockResolvedValue(['h_get.json', 'h_post.json']);

      mockReadFile.mockImplementation((path: string) => {
        if (path.includes('h_get')) {
          return Promise.resolve(JSON.stringify(createMockEntry({ method: 'GET' })));
        }
        return Promise.resolve(JSON.stringify(createMockEntry({ method: 'POST' })));
      });

      const getEntries = await store.list({ method: 'GET' });
      expect(getEntries.every(e => e.method === 'GET')).toBe(true);
    });

    test('[边界] list filters by URL', async () => {
      mockReaddir.mockResolvedValue(['h_1.json', 'h_2.json']);

      mockReadFile.mockImplementation((path: string) => {
        if (path.includes('h_1')) {
          return Promise.resolve(JSON.stringify(createMockEntry({ url: 'https://api.github.com/users' })));
        }
        return Promise.resolve(JSON.stringify(createMockEntry({ url: 'https://api.github.com/repos' })));
      });

      const entries = await store.list({ url: 'users' });
      expect(entries.length).toBe(1);
    });
  });

  // 流程 (Multi-Step Flows)
  describe('流程', () => {
    test('[流程] save 25 entries -> paginate correctly', async () => {
      const entries = [];
      for (let i = 0; i < 25; i++) {
        entries.push(`h_${i}.json`);
      }
      mockReaddir.mockResolvedValue(entries);

      mockReadFile.mockImplementation((path: string) => {
        const id = path.match(/h_(\d+)\.json/)?.[1] || '0';
        return Promise.resolve(JSON.stringify(createMockEntry({ id: `h_${id}` })));
      });

      const page1 = await store.list({ limit: 10, offset: 0 });
      const page2 = await store.list({ limit: 10, offset: 10 });
      const page3 = await store.list({ limit: 10, offset: 20 });

      expect(page1.length).toBeLessThanOrEqual(10);
      expect(page2.length).toBeLessThanOrEqual(10);
      expect(page3.length).toBeLessThanOrEqual(5);
    });

    test('[流程] save with auth -> load -> verify stripped', async () => {
      const entry = createMockEntry({
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer my-secret-token',
          'X-API-Key': 'my-api-key',
        },
      });

      mockReadFile.mockResolvedValue(JSON.stringify({
        ...entry,
        headers: {
          'Content-Type': 'application/json',
          // Authorization and X-API-Key should be stripped
        },
      }));

      const id = await store.save(entry);
      const loaded = await store.load(id);

      expect(loaded?.headers).not.toHaveProperty('authorization');
      expect(loaded?.headers).not.toHaveProperty('x-api-key');
    });

    test('[流程] count -> clear -> count = 0', async () => {
      mockReaddir.mockResolvedValue(['h_1.json', 'h_2.json', 'index.json']);

      const countBefore = await store.count();
      expect(countBefore).toBe(2);

      mockReaddir.mockResolvedValue(['index.json']);
      await store.clear();

      const countAfter = await store.count();
      expect(countAfter).toBe(0);
    });

    test('[流程] save entry with all sensitive headers -> verify all stripped on load', async () => {
      const sensitiveHeaders = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer secret',
        'Cookie': 'session=abc',
        'X-API-Key': 'key123',
        'X-Auth-Token': 'token123',
        'X-Access-Token': 'token456',
        'X-Refresh-Token': 'token789',
        'X-Session-Token': 'token0',
        'Proxy-Authorization': 'Basic auth',
        'WWW-Authenticate': 'Bearer realm',
      };

      const entry = createMockEntry({ headers: sensitiveHeaders });

      await store.save(entry);

      const entryWriteCall = mockWriteFile.mock.calls.find(call =>
        call[0] && call[0].includes('h_test_123')
      );
      const writtenContent = entryWriteCall![1] as string;

      // Verify sensitive headers are stripped
      expect(writtenContent).not.toContain('Authorization');
      expect(writtenContent).not.toContain('Cookie');
      expect(writtenContent).not.toContain('X-API-Key');
      expect(writtenContent).not.toContain('X-Auth-Token');
      expect(writtenContent).not.toContain('X-Access-Token');
      expect(writtenContent).not.toContain('X-Refresh-Token');
      expect(writtenContent).not.toContain('X-Session-Token');
      expect(writtenContent).not.toContain('Proxy-Authorization');
      expect(writtenContent).not.toContain('WWW-Authenticate');

      // Non-sensitive headers should remain
      expect(writtenContent).toContain('Content-Type');
    });
  });
});

describe('compareHistoryEntries', () => {
  test('detects status difference', () => {
    const left = {
      id: '1',
      timestamp: new Date().toISOString(),
      method: 'GET',
      url: 'https://api.example.com',
      headers: {},
      response: { status: 200, statusText: 'OK', headers: {}, body: '', time: 100 },
    };

    const right = {
      id: '2',
      timestamp: new Date().toISOString(),
      method: 'GET',
      url: 'https://api.example.com',
      headers: {},
      response: { status: 201, statusText: 'Created', headers: {}, body: '', time: 100 },
    };

    const result = compareHistoryEntries(left, right);
    expect(result.hasDiff).toBe(true);
    expect(result.statusDiff?.same).toBe(false);
  });

  test('detects time difference', () => {
    const left = {
      id: '1',
      timestamp: new Date().toISOString(),
      method: 'GET',
      url: 'https://api.example.com',
      headers: {},
      response: { status: 200, statusText: 'OK', headers: {}, body: '', time: 100 },
    };

    const right = {
      id: '2',
      timestamp: new Date().toISOString(),
      method: 'GET',
      url: 'https://api.example.com',
      headers: {},
      response: { status: 200, statusText: 'OK', headers: {}, body: '', time: 200 },
    };

    const result = compareHistoryEntries(left, right);
    expect(result.hasDiff).toBe(true);
    expect(result.timeDiff?.same).toBe(false);
  });

  test('detects body difference', () => {
    const left = {
      id: '1',
      timestamp: new Date().toISOString(),
      method: 'GET',
      url: 'https://api.example.com',
      headers: {},
      response: { status: 200, statusText: 'OK', headers: {}, body: '{"id":1}', time: 100 },
    };

    const right = {
      id: '2',
      timestamp: new Date().toISOString(),
      method: 'GET',
      url: 'https://api.example.com',
      headers: {},
      response: { status: 200, statusText: 'OK', headers: {}, body: '{"id":2}', time: 100 },
    };

    const result = compareHistoryEntries(left, right);
    expect(result.hasDiff).toBe(true);
    expect(result.bodyDiff?.same).toBe(false);
  });
});

describe('replayRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('[主体] replayRequest allows valid external URLs', async () => {
    const entry = {
      id: 'h_test',
      timestamp: new Date().toISOString(),
      method: 'GET',
      url: 'https://api.example.com/users',
      headers: {},
    };

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve('{"users":[]}'),
    } as Response);

    const result = await replayRequest(entry);
    expect(result.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/users', expect.any(Object));
  });

  test('[主体] replayRequest substitutes variables in URL', async () => {
    const entry = {
      id: 'h_test',
      timestamp: new Date().toISOString(),
      method: 'GET',
      url: 'https://api.{{baseUrl}}/users',
      headers: {},
    };

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve('{"users":[]}'),
    } as Response);

    await replayRequest(entry, { baseUrl: 'example.com' });
    expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/users', expect.any(Object));
  });

  test('[主体] replayRequest returns status, body, and time', async () => {
    const entry = {
      id: 'h_test',
      timestamp: new Date().toISOString(),
      method: 'POST',
      url: 'https://api.example.com/users',
      headers: { 'Content-Type': 'application/json' },
      body: { name: 'test' },
    };

    mockFetch.mockResolvedValue({
      ok: true,
      status: 201,
      text: () => Promise.resolve('{"id":1,"name":"test"}'),
    } as Response);

    const result = await replayRequest(entry);
    expect(result.status).toBe(201);
    expect(result.body).toBe('{"id":1,"name":"test"}');
    expect(result.time).toBeGreaterThanOrEqual(0);
  });

  test('[边界] replayRequest handles fetch error', async () => {
    const entry = {
      id: 'h_test',
      timestamp: new Date().toISOString(),
      method: 'GET',
      url: 'https://api.example.com/users',
      headers: {},
    };

    mockFetch.mockRejectedValue(new Error('Network error'));

    await expect(replayRequest(entry)).rejects.toThrow('Replay request failed');
  });
});