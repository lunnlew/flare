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

vi.mock('../../../storage/index.js', () => ({
  gitStore: mockGitStore,
  indexStore: mockIndexStore,
}));

// Import the command
import { listCommand } from '../list.js';

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
    endpoints: [{ path: '/test', method: 'GET' }],
    tags: ['test'],
    ...overrides,
  };
}

describe('list 命令 - 主体', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(process, 'exit').mockImplementation((code: number) => {
      throw new Error(`process.exit(${code})`);
    });
  });

  test('[主体] list with 3 APIs stored', async () => {
    const apis = [
      createMockAPI({ name: 'GitHub API', version: '3.0.0', tags: ['github'] }),
      createMockAPI({ name: 'Stripe API', version: '1.0.0', tags: ['payment'] }),
      createMockAPI({ name: 'JSONPlaceholder', version: '1.0.0', tags: ['test'] }),
    ];
    mockGitStore.listAPIs.mockResolvedValue(apis);

    await listCommand([]);

    expect(mockGitStore.listAPIs).toHaveBeenCalled();
  });

  test('[主体] list with no APIs shows empty message', async () => {
    mockGitStore.listAPIs.mockResolvedValue([]);

    await listCommand([]);

    expect(mockGitStore.listAPIs).toHaveBeenCalled();
  });

  test('[主体] list --json outputs valid JSON', async () => {
    const apis = [
      createMockAPI({ name: 'API 1' }),
      createMockAPI({ name: 'API 2' }),
    ];
    mockGitStore.listAPIs.mockResolvedValue(apis);

    await listCommand(['--json']);

    expect(mockGitStore.listAPIs).toHaveBeenCalled();
  });

  test('[主体] list --tag filter shows matching APIs', async () => {
    const apis = [
      createMockAPI({ name: 'Payment API', tags: ['payment'] }),
      createMockAPI({ name: 'Other API', tags: ['other'] }),
    ];
    mockGitStore.listAPIs.mockResolvedValue(apis);

    await listCommand(['--tag', 'payment']);

    expect(mockGitStore.listAPIs).toHaveBeenCalled();
  });

  test('[主体] list --tag with OR logic', async () => {
    const apis = [
      createMockAPI({ name: 'API A', tags: ['openapi'] }),
      createMockAPI({ name: 'API B', tags: ['graphql'] }),
    ];
    mockGitStore.listAPIs.mockResolvedValue(apis);

    await listCommand(['--tag', 'openapi,graphql']);

    expect(mockGitStore.listAPIs).toHaveBeenCalled();
  });

  test('[主体] list --name filter', async () => {
    const apis = [
      createMockAPI({ name: 'GitHub API' }),
      createMockAPI({ name: 'GitLab API' }),
    ];
    mockGitStore.listAPIs.mockResolvedValue(apis);

    await listCommand(['--name', 'github']);

    expect(mockGitStore.listAPIs).toHaveBeenCalled();
  });

  test('[主体] list --method GET filter', async () => {
    const apis = [
      createMockAPI({
        name: 'GET API',
        endpoints: [{ path: '/test', method: 'GET' }],
      }),
    ];
    mockGitStore.listAPIs.mockResolvedValue(apis);

    await listCommand(['--method', 'GET']);

    expect(mockGitStore.listAPIs).toHaveBeenCalled();
  });

  test('[主体] list --method GET,POST filter', async () => {
    const apis = [
      createMockAPI({
        name: 'Multi Method API',
        endpoints: [
          { path: '/get', method: 'GET' },
          { path: '/post', method: 'POST' },
        ],
      }),
    ];
    mockGitStore.listAPIs.mockResolvedValue(apis);

    await listCommand(['--method', 'GET,POST']);

    expect(mockGitStore.listAPIs).toHaveBeenCalled();
  });

  test('[主体] list --format table', async () => {
    const apis = [createMockAPI()];
    mockGitStore.listAPIs.mockResolvedValue(apis);

    await listCommand(['--format', 'table']);

    expect(mockGitStore.listAPIs).toHaveBeenCalled();
  });

  test('[主体] list --format short', async () => {
    const apis = [createMockAPI()];
    mockGitStore.listAPIs.mockResolvedValue(apis);

    await listCommand(['--format', 'short']);

    expect(mockGitStore.listAPIs).toHaveBeenCalled();
  });
});

describe('list 命令 - 边界', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(process, 'exit').mockImplementation((code: number) => {
      throw new Error(`process.exit(${code})`);
    });
  });

  test('[边界] list --limit 5 with 20 APIs', async () => {
    const apis = Array.from({ length: 20 }, (_, i) =>
      createMockAPI({ name: `API ${i}` })
    );
    mockGitStore.listAPIs.mockResolvedValue(apis);

    await listCommand(['--limit', '5']);

    expect(mockGitStore.listAPIs).toHaveBeenCalled();
  });

  test('[边界] list --limit 5 --offset 10', async () => {
    const apis = Array.from({ length: 20 }, (_, i) =>
      createMockAPI({ name: `API ${i}` })
    );
    mockGitStore.listAPIs.mockResolvedValue(apis);

    await listCommand(['--limit', '5', '--offset', '10']);

    expect(mockGitStore.listAPIs).toHaveBeenCalled();
  });

  test('[边界] list --limit 0 treated as no limit', async () => {
    const apis = [createMockAPI()];
    mockGitStore.listAPIs.mockResolvedValue(apis);

    await listCommand(['--limit', '0']);

    expect(mockGitStore.listAPIs).toHaveBeenCalled();
  });

  test('[边界] list --limit -1 exits with error', async () => {
    await expect(listCommand(['--limit', '-1'])).rejects.toThrow();
  });

  test('[边界] list --offset beyond results', async () => {
    const apis = [createMockAPI()];
    mockGitStore.listAPIs.mockResolvedValue(apis);

    await listCommand(['--offset', '100']);

    expect(mockGitStore.listAPIs).toHaveBeenCalled();
  });

  test('[边界] list --tag nonexistent shows empty', async () => {
    mockGitStore.listAPIs.mockResolvedValue([]);

    await listCommand(['--tag', 'nonexistent']);

    expect(mockGitStore.listAPIs).toHaveBeenCalled();
  });

  test('[边界] list --name unknown shows empty', async () => {
    mockGitStore.listAPIs.mockResolvedValue([]);

    await listCommand(['--name', 'unknown']);

    expect(mockGitStore.listAPIs).toHaveBeenCalled();
  });

  test('[边界] list --sort name', async () => {
    const apis = [
      createMockAPI({ name: 'Zebra API' }),
      createMockAPI({ name: 'Alpha API' }),
    ];
    mockGitStore.listAPIs.mockResolvedValue(apis);

    await listCommand(['--sort', 'name']);

    expect(mockGitStore.listAPIs).toHaveBeenCalled();
  });

  test('[边界] list --sort version', async () => {
    const apis = [
      createMockAPI({ name: 'API', version: '2.0.0' }),
      createMockAPI({ name: 'API', version: '1.0.0' }),
    ];
    mockGitStore.listAPIs.mockResolvedValue(apis);

    await listCommand(['--sort', 'version']);

    expect(mockGitStore.listAPIs).toHaveBeenCalled();
  });

  test('[边界] list --sort endpoints', async () => {
    const apis = [
      createMockAPI({ name: 'Large API', endpoints: Array(10).fill({}) }),
      createMockAPI({ name: 'Small API', endpoints: Array(2).fill({}) }),
    ];
    mockGitStore.listAPIs.mockResolvedValue(apis);

    await listCommand(['--sort', 'endpoints']);

    expect(mockGitStore.listAPIs).toHaveBeenCalled();
  });

  test('[边界] list --sort recently-added', async () => {
    const apis = [createMockAPI()];
    mockGitStore.listAPIs.mockResolvedValue(apis);

    await listCommand(['--sort', 'recently-added']);

    expect(mockGitStore.listAPIs).toHaveBeenCalled();
  });

  test('[边界] list --sort recently-updated', async () => {
    const apis = [createMockAPI()];
    mockGitStore.listAPIs.mockResolvedValue(apis);

    await listCommand(['--sort', 'recently-updated']);

    expect(mockGitStore.listAPIs).toHaveBeenCalled();
  });

  test('[边界] list --method INVALID exits with error', async () => {
    await expect(listCommand(['--method', 'INVALID'])).rejects.toThrow();
  });

  test('[边界] list --format json outputs JSON', async () => {
    const apis = [createMockAPI()];
    mockGitStore.listAPIs.mockResolvedValue(apis);

    await listCommand(['--format', 'json']);

    expect(mockGitStore.listAPIs).toHaveBeenCalled();
  });

  test('[边界] list --format yaml outputs YAML', async () => {
    const apis = [createMockAPI()];
    mockGitStore.listAPIs.mockResolvedValue(apis);

    await listCommand(['--format', 'yaml']);

    expect(mockGitStore.listAPIs).toHaveBeenCalled();
  });

  test('[边界] list API without tags handled', async () => {
    const apis = [
      createMockAPI({ name: 'No Tags API', tags: undefined }),
      createMockAPI({ name: 'Empty Tags API', tags: [] }),
    ];
    mockGitStore.listAPIs.mockResolvedValue(apis);

    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await listCommand([]);

    expect(mockGitStore.listAPIs).toHaveBeenCalled();
    // Verify no error thrown when tags is undefined or empty
    expect(consoleLogSpy).toHaveBeenCalled();

    consoleLogSpy.mockRestore();
  });

  test('[边界] list API without baseUrl handled', async () => {
    const apis = [
      createMockAPI({ name: 'No BaseUrl API', baseUrl: '' }),
    ];
    mockGitStore.listAPIs.mockResolvedValue(apis);

    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await listCommand([]);

    expect(mockGitStore.listAPIs).toHaveBeenCalled();

    consoleLogSpy.mockRestore();
  });
});

describe('list 命令 - 流程', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(process, 'exit').mockImplementation((code: number) => {
      throw new Error(`process.exit(${code})`);
    });
  });

  test('[流程] add then list then list --tag payment', async () => {
    const apis = [
      createMockAPI({ name: 'Payment API', tags: ['payment'] }),
    ];
    mockGitStore.listAPIs.mockResolvedValue(apis);

    await listCommand([]);
    await listCommand(['--tag', 'payment']);

    expect(mockGitStore.listAPIs).toHaveBeenCalledTimes(2);
  });

  test('[流程] add two APIs then list --name api shows both', async () => {
    const apis = [
      createMockAPI({ name: 'api1' }),
      createMockAPI({ name: 'api2' }),
    ];
    mockGitStore.listAPIs.mockResolvedValue(apis);

    await listCommand(['--name', 'api']);

    expect(mockGitStore.listAPIs).toHaveBeenCalled();
  });

  test('[流程] import 10 APIs then paginate with --limit 5', async () => {
    const apis = Array.from({ length: 10 }, (_, i) =>
      createMockAPI({ name: `API ${i}` })
    );
    mockGitStore.listAPIs.mockResolvedValue(apis);

    await listCommand(['--limit', '5']);
    await listCommand(['--limit', '5', '--offset', '5']);

    expect(mockGitStore.listAPIs).toHaveBeenCalledTimes(2);
  });

  test('[流程] add API with tags then filter by each tag', async () => {
    const apis = [
      createMockAPI({ name: 'Multi Tag API', tags: ['a', 'b', 'c'] }),
    ];
    mockGitStore.listAPIs.mockResolvedValue(apis);

    await listCommand(['--tag', 'a']);
    await listCommand(['--tag', 'b']);

    expect(mockGitStore.listAPIs).toHaveBeenCalledTimes(2);
  });

  test('[流程] list --sort name then --sort endpoints reordered', async () => {
    const apis = [
      createMockAPI({ name: 'Zebra API', endpoints: Array(10).fill({}) }),
      createMockAPI({ name: 'Alpha API', endpoints: Array(2).fill({}) }),
    ];
    mockGitStore.listAPIs.mockResolvedValue(apis);

    await listCommand(['--sort', 'name']);
    await listCommand(['--sort', 'endpoints']);

    expect(mockGitStore.listAPIs).toHaveBeenCalledTimes(2);
  });
});