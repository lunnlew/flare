import { vi, describe, test, expect, beforeEach } from 'vitest';
import { IndexStore, EnvStore } from '../index.js';

const { mockWriteFile, mockReadFile, mockReaddir, mockMkdir } = vi.hoisted(() => ({
  mockWriteFile: vi.fn().mockResolvedValue(undefined),
  mockReadFile: vi.fn(),
  mockReaddir: vi.fn(),
  mockMkdir: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('fs/promises', () => ({
  writeFile: mockWriteFile,
  readFile: mockReadFile,
  readdir: mockReaddir,
  mkdir: mockMkdir,
}));

describe('IndexStore', () => {
  let store: IndexStore;

  beforeEach(() => {
    vi.clearAllMocks();
    store = new IndexStore('/test/base/path');
  });

  describe('load', () => {
    test('[主体] loads existing index', async () => {
      mockReadFile.mockResolvedValue(JSON.stringify({
        apis: ['api1', 'api2'],
        keywords: { api1: ['name', 'GET', '/users'] },
      }));

      const index = await store.load();

      expect(index.apis).toContain('api1');
      expect(index.apis).toContain('api2');
    });

    test('[边界] returns default index on error', async () => {
      mockReadFile.mockRejectedValue(new Error('File not found'));

      const index = await store.load();

      expect(index.apis).toEqual([]);
      expect(index.keywords).toEqual({});
    });
  });

  describe('save', () => {
    test('[主体] saves index data', async () => {
      await store.save({ apis: ['test-api'], keywords: { 'test-api': ['test'] } });

      expect(mockWriteFile).toHaveBeenCalled();
      expect(mockWriteFile.mock.calls[0][1]).toContain('test-api');
    });
  });

  describe('buildIndex', () => {
    test('[主体] builds keywords from APIs', async () => {
      const apis = [
        {
          name: 'Test API',
          version: '1.0.0',
          baseUrl: 'https://api.example.com',
          endpoints: [
            { method: 'GET', path: '/users', summary: 'List users', tags: ['users'] },
            { method: 'POST', path: '/users', summary: 'Create user', tags: ['users', 'crud'] },
          ],
        },
      ];

      await store.buildIndex(apis);

      expect(mockWriteFile).toHaveBeenCalled();
      const savedData = JSON.parse(mockWriteFile.mock.calls[0][1]);
      expect(savedData.apis).toContain('Test API');
      expect(savedData.keywords['Test API']).toContain('GET');
      expect(savedData.keywords['Test API']).toContain('/users');
      expect(savedData.keywords['Test API']).toContain('List users');
      expect(savedData.keywords['Test API']).toContain('users');
    });

    test('[主体] handles API without tags', async () => {
      const apis = [
        {
          name: 'Simple API',
          version: '1.0.0',
          baseUrl: 'https://api.example.com',
          endpoints: [
            { method: 'GET', path: '/health' },
          ],
        },
      ];

      await store.buildIndex(apis);

      expect(mockWriteFile).toHaveBeenCalled();
    });

    test('[主体] handles API without endpoints', async () => {
      const apis = [
        {
          name: 'Empty API',
          version: '1.0.0',
          baseUrl: 'https://api.example.com',
          endpoints: [],
        },
      ];

      await store.buildIndex(apis);

      expect(mockWriteFile).toHaveBeenCalled();
    });
  });

  describe('search', () => {
    test('[主体] finds APIs by name', async () => {
      mockReadFile.mockResolvedValue(JSON.stringify({
        apis: ['github', 'gitlab'],
        keywords: {
          github: ['github', 'api', 'GET', '/repos'],
          gitlab: ['gitlab', 'api', 'GET', '/projects'],
        },
      }));

      const results = await store.search('github');

      expect(results).toContain('github');
      expect(results).not.toContain('gitlab');
    });

    test('[主体] finds APIs by method', async () => {
      mockReadFile.mockResolvedValue(JSON.stringify({
        apis: ['api1', 'api2'],
        keywords: {
          api1: ['GET', '/users'],
          api2: ['POST', '/users'],
        },
      }));

      const results = await store.search('GET');

      expect(results).toContain('api1');
      expect(results).not.toContain('api2');
    });

    test('[主体] finds APIs by path', async () => {
      mockReadFile.mockResolvedValue(JSON.stringify({
        apis: ['api1', 'api2'],
        keywords: {
          api1: ['GET', '/users'],
          api2: ['GET', '/products'],
        },
      }));

      const results = await store.search('/users');

      expect(results).toContain('api1');
      expect(results).not.toContain('api2');
    });

    test('[主体] case insensitive search', async () => {
      mockReadFile.mockResolvedValue(JSON.stringify({
        apis: ['GitHub'],
        keywords: {
          GitHub: ['GitHub', 'API'],
        },
      }));

      const results = await store.search('github');

      expect(results).toContain('GitHub');
    });

    test('[主体] finds APIs by summary', async () => {
      mockReadFile.mockResolvedValue(JSON.stringify({
        apis: ['api1'],
        keywords: {
          api1: ['List all users', 'GET', '/users'],
        },
      }));

      const results = await store.search('users');

      expect(results).toContain('api1');
    });

    test('[边界] returns empty array on no match', async () => {
      mockReadFile.mockResolvedValue(JSON.stringify({
        apis: ['api1'],
        keywords: {
          api1: ['GET', '/users'],
        },
      }));

      const results = await store.search('nonexistent');

      expect(results).toEqual([]);
    });
  });
});

describe('EnvStore init', () => {
  let store: EnvStore;

  beforeEach(() => {
    vi.clearAllMocks();
    store = new EnvStore('/test/base/path');
  });

  test('[主体] init creates env directory', async () => {
    await store.init();

    expect(mockMkdir).toHaveBeenCalled();
    expect(mockMkdir.mock.calls[0][0]).toContain('.flare');
    expect(mockMkdir.mock.calls[0][0]).toContain('env');
  });

  test('[主体] init uses recursive flag', async () => {
    await store.init();

    expect(mockMkdir.mock.calls[0][1]).toEqual({ recursive: true });
  });
});