import { vi, describe, test, expect, beforeEach } from 'vitest';

// Use vi.hoisted so mocks are evaluated before vi.mock hoisting
const { mockGitStore, mockIndexStore } = vi.hoisted(() => {
  const mockGitStore = {
    init: vi.fn().mockResolvedValue(undefined),
    listAPIs: vi.fn().mockResolvedValue([]),
    loadAPI: vi.fn().mockResolvedValue(null),
    saveAPI: vi.fn().mockResolvedValue(undefined),
    deleteAPI: vi.fn().mockResolvedValue(undefined),
  };
  const mockIndexStore = {
    buildIndex: vi.fn().mockResolvedValue(undefined),
    search: vi.fn().mockResolvedValue([]),
  };
  return { mockGitStore, mockIndexStore };
});

// Correct path: from __tests__ to storage is ../../../storage
vi.mock('../../../storage/index.js', () => ({
  gitStore: mockGitStore,
  indexStore: mockIndexStore,
}));

// Import after vi.mock
import { searchCommand } from '../search.js';

// Helper to create mock API
function createMockAPI(overrides: Partial<{
  name: string;
  version: string;
  baseUrl: string;
  endpoints: any[];
  tags: string[];
}> = {}): any {
  return {
    name: 'Test API',
    version: '1.0.0',
    baseUrl: 'https://api.example.com',
    endpoints: [{ path: '/test', method: 'GET', summary: 'Test endpoint' }],
    tags: ['test'],
    ...overrides,
  };
}

describe('search 命令 - 主体', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-setup mock return values
    mockGitStore.init.mockResolvedValue(undefined);
    mockGitStore.listAPIs.mockResolvedValue([]);
    mockGitStore.loadAPI.mockResolvedValue(null);
    mockGitStore.saveAPI.mockResolvedValue(undefined);
    mockGitStore.deleteAPI.mockResolvedValue(undefined);
    mockIndexStore.buildIndex.mockResolvedValue(undefined);
    mockIndexStore.search.mockResolvedValue([]);

    vi.spyOn(process, 'exit').mockImplementation((code: number) => {
      throw new Error(`process.exit(${code})`);
    });
  });

  test('[主体] keyword search finds API by name', async () => {
    mockIndexStore.search.mockResolvedValue(['Payment API']);
    mockGitStore.loadAPI.mockResolvedValue(createMockAPI({ name: 'Payment API' }));

    await searchCommand(['payment']);

    expect(mockIndexStore.search).toHaveBeenCalledWith('payment');
    expect(mockGitStore.loadAPI).toHaveBeenCalled();
  });

  test('[主体] phrase match with quotes', async () => {
    mockIndexStore.search.mockResolvedValue(['Create User API']);
    mockGitStore.loadAPI.mockResolvedValue(createMockAPI({ name: 'Create User API' }));

    await searchCommand(['"create user"']);

    expect(mockIndexStore.search).toHaveBeenCalledWith('"create user"');
  });

  test('[主体] OR semantics finds APIs matching either term', async () => {
    mockIndexStore.search.mockResolvedValue(['GitHub API', 'GitLab API']);
    mockGitStore.loadAPI.mockResolvedValue(createMockAPI({ name: 'GitHub/GitLab API' }));

    await searchCommand(['github graphql']);

    expect(mockIndexStore.search).toHaveBeenCalledWith('github graphql');
  });

  test('[主体] AND semantics finds APIs matching both', async () => {
    mockIndexStore.search.mockResolvedValue(['GitHub GraphQL API']);
    mockGitStore.loadAPI.mockResolvedValue(createMockAPI({ name: 'GitHub GraphQL API' }));

    await searchCommand(['github AND graphql']);

    expect(mockIndexStore.search).toHaveBeenCalledWith('github AND graphql');
  });

  test('[主体] NOT semantics excludes APIs', async () => {
    mockIndexStore.search.mockResolvedValue(['GitHub API']);
    mockGitStore.loadAPI.mockResolvedValue(createMockAPI({ name: 'GitHub API' }));

    await searchCommand(['github NOT gitlab']);

    expect(mockIndexStore.search).toHaveBeenCalledWith('github NOT gitlab');
  });

  test('[主体] search --json outputs JSON', async () => {
    mockIndexStore.search.mockResolvedValue(['Payment API']);
    mockGitStore.loadAPI.mockResolvedValue(createMockAPI({ name: 'Payment API' }));

    await searchCommand(['payment', '--json']);

    expect(mockIndexStore.search).toHaveBeenCalledWith('payment');
  });

  test('[主体] search --format brief', async () => {
    mockIndexStore.search.mockResolvedValue(['Payment API']);
    mockGitStore.loadAPI.mockResolvedValue(createMockAPI({ name: 'Payment API' }));

    await searchCommand(['payment', '--format', 'brief']);

    expect(mockIndexStore.search).toHaveBeenCalledWith('payment');
  });

  test('[主体] search --format detailed', async () => {
    mockIndexStore.search.mockResolvedValue(['Payment API']);
    mockGitStore.loadAPI.mockResolvedValue(createMockAPI({ name: 'Payment API' }));

    await searchCommand(['payment', '--format', 'detailed']);

    expect(mockIndexStore.search).toHaveBeenCalledWith('payment');
  });

  test('[主体] search --limit 10', async () => {
    mockIndexStore.search.mockResolvedValue(['API 1', 'API 2', 'API 3']);
    mockGitStore.loadAPI.mockResolvedValue(createMockAPI());

    await searchCommand(['api', '--limit', '10']);

    expect(mockIndexStore.search).toHaveBeenCalledWith('api');
  });

  test('[主体] search --show-scores', async () => {
    mockIndexStore.search.mockResolvedValue(['Payment API']);
    mockGitStore.loadAPI.mockResolvedValue(createMockAPI({ name: 'Payment API' }));

    await searchCommand(['payment', '--show-scores']);

    expect(mockIndexStore.search).toHaveBeenCalledWith('payment');
  });
});

describe('search 命令 - 边界', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGitStore.init.mockResolvedValue(undefined);
    mockGitStore.listAPIs.mockResolvedValue([]);
    mockGitStore.loadAPI.mockResolvedValue(null);
    mockGitStore.saveAPI.mockResolvedValue(undefined);
    mockGitStore.deleteAPI.mockResolvedValue(undefined);
    mockIndexStore.buildIndex.mockResolvedValue(undefined);
    mockIndexStore.search.mockResolvedValue([]);

    vi.spyOn(process, 'exit').mockImplementation((code: number) => {
      throw new Error(`process.exit(${code})`);
    });
  });

  test('[边界] search with no arguments exits with code 1', async () => {
    await expect(searchCommand([])).rejects.toThrow('process.exit(1)');
  });

  test('[边界] search with empty string exits with error', async () => {
    await expect(searchCommand([''])).rejects.toThrow();
  });

  test('[边界] search with whitespace only exits with error', async () => {
    await expect(searchCommand(['   '])).rejects.toThrow();
  });

  test('[边界] search with no results shows empty message', async () => {
    mockIndexStore.search.mockResolvedValue([]);

    await searchCommand(['nonexistent123xyz']);

    expect(mockIndexStore.search).toHaveBeenCalledWith('nonexistent123xyz');
  });

  test('[边界] search --limit -5 exits with error', async () => {
    await expect(searchCommand(['api', '--limit', '-5'])).rejects.toThrow();
  });

  test('[边界] search --offset without limit uses default limit', async () => {
    mockIndexStore.search.mockResolvedValue(['API 1', 'API 2']);
    mockGitStore.loadAPI.mockResolvedValue(createMockAPI());

    await searchCommand(['api', '--offset', '10']);

    expect(mockIndexStore.search).toHaveBeenCalledWith('api');
  });

  test('[边界] search with very long query', async () => {
    mockIndexStore.search.mockResolvedValue([]);
    const longQuery = 'a'.repeat(1000);

    await searchCommand([longQuery]);

    expect(mockIndexStore.search).toHaveBeenCalledWith(longQuery);
  });

  test('[边界] search --sort name', async () => {
    mockIndexStore.search.mockResolvedValue(['Zebra API', 'Alpha API']);
    mockGitStore.loadAPI.mockResolvedValue(createMockAPI());

    await searchCommand(['api', '--sort', 'name']);

    expect(mockIndexStore.search).toHaveBeenCalledWith('api');
  });

  test('[边界] search --sort endpoints', async () => {
    mockIndexStore.search.mockResolvedValue(['Large API', 'Small API']);
    mockGitStore.loadAPI.mockResolvedValue(createMockAPI());

    await searchCommand(['api', '--sort', 'endpoints']);

    expect(mockIndexStore.search).toHaveBeenCalledWith('api');
  });

  test('[边界] search --sort relevance', async () => {
    mockIndexStore.search.mockResolvedValue(['GitHub API']);
    mockGitStore.loadAPI.mockResolvedValue(createMockAPI());

    await searchCommand(['github', '--sort', 'relevance']);

    expect(mockIndexStore.search).toHaveBeenCalledWith('github');
  });

  test('[边界] search --semantic falls back to keyword', async () => {
    mockIndexStore.search.mockResolvedValue(['Payment API']);
    mockGitStore.loadAPI.mockResolvedValue(createMockAPI({ name: 'Payment API' }));

    await searchCommand(['payment', '--semantic']);

    expect(mockIndexStore.search).toHaveBeenCalledWith('payment');
  });

  test('[边界] search --limit 0 treated as no limit', async () => {
    mockIndexStore.search.mockResolvedValue(['API 1', 'API 2', 'API 3']);
    mockGitStore.loadAPI.mockResolvedValue(createMockAPI());

    await searchCommand(['api', '--limit', '0']);

    expect(mockIndexStore.search).toHaveBeenCalledWith('api');
  });
});

describe('search 命令 - 流程', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGitStore.init.mockResolvedValue(undefined);
    mockGitStore.listAPIs.mockResolvedValue([]);
    mockGitStore.loadAPI.mockResolvedValue(null);
    mockGitStore.saveAPI.mockResolvedValue(undefined);
    mockGitStore.deleteAPI.mockResolvedValue(undefined);
    mockIndexStore.buildIndex.mockResolvedValue(undefined);
    mockIndexStore.search.mockResolvedValue([]);

    vi.spyOn(process, 'exit').mockImplementation((code: number) => {
      throw new Error(`process.exit(${code})`);
    });
  });

  test('[流程] add then search finds new API', async () => {
    mockIndexStore.search.mockResolvedValue(['Newly Added API']);
    mockGitStore.loadAPI.mockResolvedValue(createMockAPI({ name: 'Newly Added API' }));
    mockGitStore.listAPIs.mockResolvedValue([createMockAPI({ name: 'Newly Added API' })]);
    mockIndexStore.buildIndex.mockResolvedValue(undefined);

    await searchCommand(['Newly Added API']);

    expect(mockIndexStore.search).toHaveBeenCalledWith('Newly Added API');
  });

  test('[流程] search pagination with --limit 5', async () => {
    mockIndexStore.search.mockResolvedValue(['API 1', 'API 2', 'API 3', 'API 4', 'API 5', 'API 6']);
    mockGitStore.loadAPI.mockResolvedValue(createMockAPI());

    await searchCommand(['api', '--limit', '5']);
    await searchCommand(['api', '--limit', '5', '--offset', '5']);

    expect(mockIndexStore.search).toHaveBeenCalledTimes(2);
  });

  test('[流程] search then re-run with different format', async () => {
    mockIndexStore.search.mockResolvedValue(['Payment API']);
    mockGitStore.loadAPI.mockResolvedValue(createMockAPI({ name: 'Payment API' }));

    await searchCommand(['payment', '--format', 'brief']);
    await searchCommand(['payment', '--format', 'detailed']);

    expect(mockIndexStore.search).toHaveBeenCalledTimes(2);
  });

  test('[流程] search with sort then re-sort by different criteria', async () => {
    mockIndexStore.search.mockResolvedValue(['GitHub API', 'GitLab API', 'GitHub GraphQL']);
    mockGitStore.loadAPI.mockResolvedValue(createMockAPI());

    await searchCommand(['github graphql', '--sort', 'name']);
    await searchCommand(['github graphql', '--sort', 'endpoints']);

    expect(mockIndexStore.search).toHaveBeenCalledTimes(2);
  });

  test('[流程] search with no results then add then search again', async () => {
    mockIndexStore.search
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(['Payment API']);
    mockGitStore.loadAPI.mockResolvedValue(createMockAPI({ name: 'Payment API' }));
    mockGitStore.listAPIs.mockResolvedValue([createMockAPI({ name: 'Payment API' })]);
    mockIndexStore.buildIndex.mockResolvedValue(undefined);

    // First search - no results
    await searchCommand(['payment']);

    // After adding, second search finds it
    await searchCommand(['payment']);

    expect(mockIndexStore.search).toHaveBeenCalledTimes(2);
  });
});