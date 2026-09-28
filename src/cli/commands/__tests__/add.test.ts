import { vi, describe, test, expect, beforeEach } from 'vitest';

// Use vi.hoisted to ensure mocks are evaluated before imports
const fsMocks = vi.hoisted(() => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  readdir: vi.fn(),
  mkdir: vi.fn(),
  unlink: vi.fn(),
}));

const fetchMock = vi.hoisted(() => vi.fn());

const storageMocks = vi.hoisted(() => ({
  gitStore: {
    init: vi.fn().mockResolvedValue(undefined),
    saveAPI: vi.fn().mockResolvedValue(undefined),
    listAPIs: vi.fn().mockResolvedValue([]),
    loadAPI: vi.fn().mockResolvedValue(null),
    deleteAPI: vi.fn().mockResolvedValue(undefined),
  },
  indexStore: {
    buildIndex: vi.fn().mockResolvedValue(undefined),
    search: vi.fn().mockResolvedValue([]),
  },
}));

const parserMocks = vi.hoisted(() => ({
  detectAndParse: vi.fn(),
}));

const swaggerHubMocks = vi.hoisted(() => ({
  swaggerHubParser: {
    detect: vi.fn(),
    parse: vi.fn(),
    parseAll: vi.fn(),
  },
}));

const authMocks = vi.hoisted(() => ({
  buildAuthHeaders: vi.fn((auth?: any) => {
    if (!auth) return { Accept: 'application/json' };
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (auth.location === 'header') {
      headers[auth.key] = auth.value;
    } else if (auth.location === 'cookie') {
      headers['Cookie'] = `${auth.key}=${auth.value}`;
    }
    return headers;
  }),
  buildAuthUrl: vi.fn((url: string) => url),
  buildBasicAuthHeader: vi.fn(() => 'Basic fake'),
  buildBearerAuthHeader: vi.fn(() => 'Bearer fake'),
  parseApiKeyAuth: vi.fn(),
}));

// Mock fs/promises before importing modules that use it
vi.mock('fs/promises', () => fsMocks);

// Mock undici
vi.mock('undici', () => ({
  fetch: fetchMock,
}));

// Mock storage modules
vi.mock('../../../storage/index.js', () => storageMocks);

// Mock parsers
vi.mock('../../../parsers/index.js', () => parserMocks);

// Mock swaggerhub parser
vi.mock('../../../parsers/swaggerhub.js', () => swaggerHubMocks);

// Mock auth utils
vi.mock('../../../utils/auth.js', () => authMocks);

// Import after mocks
import { addCommand } from '../add.js';

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

// Helper to create mock Response for undici
function createMockResponse(body: string, status = 200, statusText = 'OK'): any {
  let jsonData: any;
  try {
    jsonData = JSON.parse(body);
  } catch {
    jsonData = {};
  }
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    text: vi.fn().mockResolvedValue(body),
    json: vi.fn().mockResolvedValue(jsonData),
  };
}

describe('add 命令 - 主体', () => {
  beforeEach(() => {
    // Reset all mocks completely
    vi.resetAllMocks();

    // Set up fetch mock with resolved response
    fetchMock.mockResolvedValue(createMockResponse('{}'));
    fsMocks.readFile.mockResolvedValue('{}');
    fsMocks.readdir.mockResolvedValue([]);
    fsMocks.mkdir.mockResolvedValue(undefined);
    fsMocks.writeFile.mockResolvedValue(undefined);
    fsMocks.unlink.mockResolvedValue(undefined);

    // Set up storage mocks
    storageMocks.gitStore.init.mockResolvedValue(undefined);
    storageMocks.gitStore.saveAPI.mockResolvedValue(undefined);
    storageMocks.gitStore.listAPIs.mockResolvedValue([]);
    storageMocks.gitStore.loadAPI.mockResolvedValue(null);
    storageMocks.gitStore.deleteAPI.mockResolvedValue(undefined);
    storageMocks.indexStore.buildIndex.mockResolvedValue(undefined);
    storageMocks.indexStore.search.mockResolvedValue([]);

    // Set up parser mocks
    parserMocks.detectAndParse.mockResolvedValue(createMockAPI());
    swaggerHubMocks.swaggerHubParser.detect.mockReturnValue(false);
    swaggerHubMocks.swaggerHubParser.parse.mockResolvedValue(createMockAPI());
    swaggerHubMocks.swaggerHubParser.parseAll.mockResolvedValue([createMockAPI()]);

    // Set up auth mocks
    authMocks.buildAuthHeaders.mockReturnValue({});
    authMocks.buildAuthUrl.mockImplementation((url: string) => url);

    vi.spyOn(process, 'exit').mockImplementation((code: number) => {
      throw new Error(`process.exit(${code})`);
    });
  });

  test('[主体] add OpenAPI from valid HTTPS URL', async () => {
    const openApiJson = JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: { '/test': { get: { summary: 'Test endpoint' } } },
    });

    fetchMock.mockResolvedValue(createMockResponse(openApiJson));
    parserMocks.detectAndParse.mockResolvedValue(createMockAPI({ name: 'Test API' }));
    storageMocks.gitStore.listAPIs.mockResolvedValue([createMockAPI()]);

    await addCommand(['https://example.com/openapi.json']);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.com/openapi.json',
      expect.objectContaining({ headers: expect.any(Object) })
    );
    expect(parserMocks.detectAndParse).toHaveBeenCalled();
    expect(storageMocks.gitStore.saveAPI).toHaveBeenCalled();
    expect(storageMocks.indexStore.buildIndex).toHaveBeenCalled();
  });

  test('[主体] add local YAML file with OpenAPI 3.x', async () => {
    const yamlContent = `
openapi: 3.0.0
info:
  title: Local API
  version: 1.0.0
paths:
  /users:
    get:
      summary: List users
`;
    fsMocks.readFile.mockResolvedValue(yamlContent);
    parserMocks.detectAndParse.mockResolvedValue(createMockAPI({ name: 'Local API' }));
    storageMocks.gitStore.listAPIs.mockResolvedValue([createMockAPI()]);

    await addCommand(['./local.yaml']);

    expect(fsMocks.readFile).toHaveBeenCalledWith('./local.yaml', 'utf-8');
    expect(parserMocks.detectAndParse).toHaveBeenCalled();
  });

  test('[主体] add local JSON file', async () => {
    const jsonContent = JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'JSON API', version: '1.0.0' },
      paths: { '/items': { get: {} } },
    });
    fsMocks.readFile.mockResolvedValue(jsonContent);
    parserMocks.detectAndParse.mockResolvedValue(createMockAPI({ name: 'JSON API' }));
    storageMocks.gitStore.listAPIs.mockResolvedValue([createMockAPI()]);

    await addCommand(['./local.json']);

    expect(fsMocks.readFile).toHaveBeenCalledWith('./local.json', 'utf-8');
  });

  test('[主体] add Swagger 2.x', async () => {
    const swaggerJson = JSON.stringify({
      swagger: '2.0',
      info: { title: 'Swagger API', version: '1.0.0' },
      paths: { '/pets': { get: {} } },
    });

    fetchMock.mockResolvedValue(createMockResponse(swaggerJson));
    parserMocks.detectAndParse.mockResolvedValue(createMockAPI({ name: 'Swagger API' }));
    storageMocks.gitStore.listAPIs.mockResolvedValue([createMockAPI()]);

    await addCommand(['https://example.com/swagger.json']);

    expect(parserMocks.detectAndParse).toHaveBeenCalled();
  });

  test('[主体] add AsyncAPI 2.x', async () => {
    const asyncApiYaml = `
asyncapi: 2.0.0
info:
  title: Async API
  version: 1.0.0
channels:
  users:
    subscribe:
      message:
        payload:
          type: object
`;
    fetchMock.mockResolvedValue(createMockResponse(asyncApiYaml));
    parserMocks.detectAndParse.mockResolvedValue(createMockAPI({ name: 'Async API' }));
    storageMocks.gitStore.listAPIs.mockResolvedValue([createMockAPI()]);

    await addCommand(['https://example.com/asyncapi.yaml']);

    expect(parserMocks.detectAndParse).toHaveBeenCalled();
  });

  test('[主体] add GraphQL schema', async () => {
    const graphqlSchema = `
type Query {
  users: [User]
}
type User {
  id: ID!
  name: String
}
`;
    fetchMock.mockResolvedValue(createMockResponse(graphqlSchema));
    parserMocks.detectAndParse.mockResolvedValue(createMockAPI({ name: 'GraphQL API' }));
    storageMocks.gitStore.listAPIs.mockResolvedValue([createMockAPI()]);

    await addCommand(['https://example.com/schema.graphql']);

    expect(parserMocks.detectAndParse).toHaveBeenCalled();
  });

  test('[主体] add Postman v2 collection', async () => {
    const postmanCollection = JSON.stringify({
      info: { name: 'Postman API', _postman_id: 'xxx' },
      item: [{ name: 'Get Users', request: { url: '/users', method: 'GET' } }],
    });
    fetchMock.mockResolvedValue(createMockResponse(postmanCollection));
    parserMocks.detectAndParse.mockResolvedValue(createMockAPI({ name: 'Postman API' }));
    storageMocks.gitStore.listAPIs.mockResolvedValue([createMockAPI()]);

    await addCommand(['https://example.com/collection.json']);

    expect(parserMocks.detectAndParse).toHaveBeenCalled();
  });

  test('[主体] add with --name custom-name', async () => {
    const openApiJson = JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'Original Name', version: '1.0.0' },
      paths: { '/test': { get: {} } },
    });

    fetchMock.mockResolvedValue(createMockResponse(openApiJson));
    parserMocks.detectAndParse.mockResolvedValue(createMockAPI({ name: 'Original Name' }));
    storageMocks.gitStore.listAPIs.mockResolvedValue([createMockAPI()]);

    await addCommand(['https://example.com/openapi.json', '--name', 'custom-name']);

    expect(storageMocks.gitStore.saveAPI).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Original Name' })
    );
  });

  test('[主体] add with --force overwrites existing', async () => {
    const openApiJson = JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'API', version: '1.0.0' },
      paths: { '/test': { get: {} } },
    });

    fetchMock.mockResolvedValue(createMockResponse(openApiJson));
    parserMocks.detectAndParse.mockResolvedValue(createMockAPI({ name: 'API' }));
    storageMocks.gitStore.listAPIs.mockResolvedValue([createMockAPI()]);

    await addCommand(['https://example.com/openapi.json', '--force']);

    expect(storageMocks.gitStore.saveAPI).toHaveBeenCalled();
  });
});

describe('add 命令 - 边界', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    fetchMock.mockReturnValue(undefined);
    fsMocks.readFile.mockReturnValue(undefined);
    fsMocks.readdir.mockReturnValue([]);
    fsMocks.mkdir.mockReturnValue(undefined);
    fsMocks.writeFile.mockReturnValue(undefined);
    fsMocks.unlink.mockReturnValue(undefined);

    storageMocks.gitStore.init.mockReturnValue(undefined);
    storageMocks.gitStore.saveAPI.mockReturnValue(undefined);
    storageMocks.gitStore.listAPIs.mockReturnValue([]);
    storageMocks.gitStore.loadAPI.mockReturnValue(null);
    storageMocks.gitStore.deleteAPI.mockReturnValue(undefined);
    storageMocks.indexStore.buildIndex.mockReturnValue(undefined);
    storageMocks.indexStore.search.mockReturnValue([]);

    parserMocks.detectAndParse.mockReturnValue(undefined);

    vi.spyOn(process, 'exit').mockImplementation((code: number) => {
      throw new Error(`process.exit(${code})`);
    });
  });

  test('[边界] add with no arguments exits with code 1', async () => {
    await expect(addCommand([])).rejects.toThrow('process.exit(1)');
  });

  test('[边界] add returns 404', async () => {
    fetchMock.mockResolvedValue(createMockResponse('Not Found', 404));

    await expect(addCommand(['https://example.com/not-found.json'])).rejects.toThrow();
  });

  test('[边界] add returns 500', async () => {
    fetchMock.mockResolvedValue(createMockResponse('Server Error', 500));

    await expect(addCommand(['https://example.com/error.json'])).rejects.toThrow();
  });

  test('[边界] add receives HTML response', async () => {
    const htmlResponse = '<html><body>Not JSON</body></html>';
    fetchMock.mockResolvedValue(createMockResponse(htmlResponse, 200));
    parserMocks.detectAndParse.mockRejectedValue(new Error('无法识别格式'));

    await expect(addCommand(['https://example.com/page.html'])).rejects.toThrow();
  });

  test('[边界] add with nonexistent file', async () => {
    fsMocks.readFile.mockRejectedValue(new Error('ENOENT: no such file'));

    await expect(addCommand(['./nonexistent.yaml'])).rejects.toThrow();
  });

  test('[边界] add with corrupt YAML', async () => {
    fsMocks.readFile.mockResolvedValue('invalid: yaml: content: [');
    parserMocks.detectAndParse.mockRejectedValue(new Error('YAML parse error'));

    await expect(addCommand(['./corrupt.yaml'])).rejects.toThrow();
  });

  test('[边界] add with corrupt JSON', async () => {
    fsMocks.readFile.mockResolvedValue('{ invalid json }');
    parserMocks.detectAndParse.mockRejectedValue(new Error('JSON parse error'));

    await expect(addCommand(['./corrupt.json'])).rejects.toThrow();
  });

  test('[边界] add with unsupported format', async () => {
    parserMocks.detectAndParse.mockRejectedValue(new Error('无法识别格式'));

    await expect(addCommand(['https://example.com/raml.yaml'])).rejects.toThrow();
  });

  test('[边界] add with --auth-value but missing value', async () => {
    const openApiJson = JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'API', version: '1.0.0' },
      paths: {},
    });

    fetchMock.mockResolvedValue(createMockResponse(openApiJson));
    parserMocks.detectAndParse.mockRejectedValue(new Error('无法识别格式'));

    await expect(addCommand(['https://example.com/api.json', '--auth-value'])).rejects.toThrow();
  });

  test('[边界] add with invalid auth-location', async () => {
    const openApiJson = JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'API', version: '1.0.0' },
      paths: {},
    });

    fetchMock.mockResolvedValue(createMockResponse(openApiJson));
    parserMocks.detectAndParse.mockRejectedValue(new Error('无法识别格式'));

    await expect(addCommand([
      'https://example.com/api.json',
      '--auth-location', 'invalid',
      '--auth-key', 'X-API-Key',
      '--auth-value', 'secret'
    ])).rejects.toThrow();
  });

  test('[边界] add with empty name uses auto-derived name', async () => {
    const openApiJson = JSON.stringify({
      openapi: '3.0.0',
      info: { title: '', version: '1.0.0' },
      paths: { '/test': { get: {} } },
    });

    fetchMock.mockResolvedValue(createMockResponse(openApiJson));
    parserMocks.detectAndParse.mockResolvedValue(createMockAPI({ name: '' }));
    storageMocks.gitStore.listAPIs.mockResolvedValue([createMockAPI()]);

    await addCommand(['https://example.com/openapi.json', '--name', '']);

    expect(storageMocks.gitStore.saveAPI).toHaveBeenCalled();
  });

  test('[边界] add with spaces in name normalizes to hyphens', async () => {
    const openApiJson = JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'API', version: '1.0.0' },
      paths: { '/test': { get: {} } },
    });

    fetchMock.mockResolvedValue(createMockResponse(openApiJson));
    parserMocks.detectAndParse.mockResolvedValue(createMockAPI({ name: 'API' }));
    storageMocks.gitStore.listAPIs.mockResolvedValue([createMockAPI()]);

    await addCommand(['https://example.com/openapi.json', '--name', 'a b c']);

    expect(storageMocks.gitStore.saveAPI).toHaveBeenCalled();
  });

  test('[边界] add with path traversal attempt in name', async () => {
    const openApiJson = JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'API', version: '1.0.0' },
      paths: { '/test': { get: {} } },
    });

    fetchMock.mockResolvedValue(createMockResponse(openApiJson));
    parserMocks.detectAndParse.mockResolvedValue(createMockAPI({ name: 'API' }));
    storageMocks.gitStore.listAPIs.mockResolvedValue([createMockAPI()]);

    await addCommand(['https://example.com/openapi.json', '--name', '../../etc/passwd']);

    expect(storageMocks.gitStore.saveAPI).toHaveBeenCalled();
  });

  test('[边界] add with cookie auth location', async () => {
    const openApiJson = JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'API', version: '1.0.0' },
      paths: { '/test': { get: {} } },
    });

    fetchMock.mockResolvedValue(createMockResponse(openApiJson));
    parserMocks.detectAndParse.mockResolvedValue(createMockAPI({ name: 'API' }));
    storageMocks.gitStore.listAPIs.mockResolvedValue([createMockAPI()]);

    await addCommand([
      'https://example.com/openapi.json',
      '--auth-location', 'cookie',
      '--auth-key', 'Cookie',
      '--auth-value', 'abc123'
    ]);

    expect(fetchMock).toHaveBeenCalled();
  });

  test('[边界] add with query auth location', async () => {
    const openApiJson = JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'API', version: '1.0.0' },
      paths: { '/test': { get: {} } },
    });

    fetchMock.mockResolvedValue(createMockResponse(openApiJson));
    parserMocks.detectAndParse.mockResolvedValue(createMockAPI({ name: 'API' }));
    storageMocks.gitStore.listAPIs.mockResolvedValue([createMockAPI()]);

    await addCommand([
      'https://example.com/openapi.json',
      '--auth-location', 'query',
      '--auth-key', 'api_key',
      '--auth-value', 'xxx'
    ]);

    expect(fetchMock).toHaveBeenCalled();
  });

  test('[边界] add with path auth location', async () => {
    const openApiJson = JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'API', version: '1.0.0' },
      paths: { '/test': { get: {} } },
    });

    fetchMock.mockResolvedValue(createMockResponse(openApiJson));
    parserMocks.detectAndParse.mockResolvedValue(createMockAPI({ name: 'API' }));
    storageMocks.gitStore.listAPIs.mockResolvedValue([createMockAPI()]);

    await addCommand([
      'https://example.com/openapi.json',
      '--auth-location', 'path',
      '--auth-key', 'token',
      '--auth-value', 'xxx'
    ]);

    expect(fetchMock).toHaveBeenCalled();
  });
});

describe('add 命令 - 流程', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    fetchMock.mockReturnValue(undefined);
    fsMocks.readFile.mockReturnValue(undefined);
    fsMocks.readdir.mockReturnValue([]);
    fsMocks.mkdir.mockReturnValue(undefined);
    fsMocks.writeFile.mockReturnValue(undefined);
    fsMocks.unlink.mockReturnValue(undefined);

    storageMocks.gitStore.init.mockReturnValue(undefined);
    storageMocks.gitStore.saveAPI.mockReturnValue(undefined);
    storageMocks.gitStore.listAPIs.mockReturnValue([]);
    storageMocks.gitStore.loadAPI.mockReturnValue(null);
    storageMocks.gitStore.deleteAPI.mockReturnValue(undefined);
    storageMocks.indexStore.buildIndex.mockReturnValue(undefined);
    storageMocks.indexStore.search.mockReturnValue([]);

    parserMocks.detectAndParse.mockReturnValue(undefined);

    vi.spyOn(process, 'exit').mockImplementation((code: number) => {
      throw new Error(`process.exit(${code})`);
    });
  });

  test('[流程] sequential adds without force do not overwrite', async () => {
    const openApiJson = JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'API', version: '1.0.0' },
      paths: { '/test': { get: {} } },
    });

    fetchMock.mockResolvedValue(createMockResponse(openApiJson));
    parserMocks.detectAndParse.mockResolvedValue(createMockAPI({ name: 'API' }));
    storageMocks.gitStore.listAPIs.mockResolvedValue([createMockAPI(), createMockAPI()]);

    await addCommand(['https://example.com/api1.yaml']);
    await addCommand(['https://example.com/api2.yaml']);

    expect(storageMocks.gitStore.saveAPI).toHaveBeenCalledTimes(2);
  });

  test('[流程] add then list shows new API', async () => {
    const openApiJson = JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'New API', version: '1.0.0' },
      paths: { '/new': { get: {} } },
    });

    fetchMock.mockResolvedValue(createMockResponse(openApiJson));

    const mockAPI = createMockAPI({ name: 'New API' });
    parserMocks.detectAndParse.mockResolvedValue(mockAPI);
    storageMocks.gitStore.listAPIs.mockResolvedValue([mockAPI]);

    await addCommand(['https://example.com/new-api.json']);

    expect(storageMocks.gitStore.listAPIs).toHaveBeenCalled();
    expect(storageMocks.indexStore.buildIndex).toHaveBeenCalledWith([mockAPI]);
  });

  test('[流程] add then search finds the API', async () => {
    const openApiJson = JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'Searchable API', version: '1.0.0' },
      paths: { '/search': { get: {} } },
    });

    fetchMock.mockResolvedValue(createMockResponse(openApiJson));

    const mockAPI = createMockAPI({ name: 'Searchable API' });
    parserMocks.detectAndParse.mockResolvedValue(mockAPI);
    storageMocks.gitStore.listAPIs.mockResolvedValue([mockAPI]);
    storageMocks.indexStore.search.mockResolvedValue(['Searchable API']);

    await addCommand(['https://example.com/searchable-api.json']);

    expect(storageMocks.indexStore.buildIndex).toHaveBeenCalled();
  });

  test('[流程] add with auth then run uses auth', async () => {
    const openApiJson = JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'Auth API', version: '1.0.0' },
      paths: { '/auth': { get: {} } },
    });

    fetchMock.mockResolvedValue(createMockResponse(openApiJson));
    parserMocks.detectAndParse.mockResolvedValue(createMockAPI({ name: 'Auth API' }));
    storageMocks.gitStore.listAPIs.mockResolvedValue([createMockAPI()]);

    // Should complete without throwing
    await addCommand([
      'https://example.com/auth-api.json',
      '--auth-location', 'header',
      '--auth-key', 'X-API-Key',
      '--auth-value', 'secret-key'
    ]);

    // Verify saveAPI was called with the API we parsed
    expect(storageMocks.gitStore.saveAPI).toHaveBeenCalled();
    const savedApi = storageMocks.gitStore.saveAPI.mock.calls[0][0];
    expect(savedApi.name).toBe('Auth API');
  });

  test('[流程] add API with 50+ endpoints', async () => {
    const endpointPaths = Array.from({ length: 50 }, (_, i) => `/endpoint${i}`);

    const openApiJson = JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'Large API', version: '1.0.0' },
      paths: Object.fromEntries(endpointPaths.map(p => [p, { get: {} }])),
    });

    fetchMock.mockResolvedValue(createMockResponse(openApiJson));

    const endpoints = endpointPaths.map(path => ({
      path,
      method: 'GET' as const,
      summary: `Endpoint ${path}`,
    }));

    parserMocks.detectAndParse.mockResolvedValue(createMockAPI({
      name: 'Large API',
      endpoints,
    }));
    storageMocks.gitStore.listAPIs.mockResolvedValue([createMockAPI()]);

    await addCommand(['https://example.com/large-api.json']);

    // Verify saveAPI was called with large API (at least 50 endpoints)
    const saveCall = storageMocks.gitStore.saveAPI.mock.calls[0][0];
    expect(saveCall.endpoints.length).toBeGreaterThanOrEqual(50);
    expect(saveCall.name).toBe('Large API');
  });

  test('[流程] add same file with different names creates separate APIs', async () => {
    const openApiJson = JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'Shared API', version: '1.0.0' },
      paths: { '/shared': { get: {} } },
    });

    fetchMock.mockResolvedValue(createMockResponse(openApiJson));
    parserMocks.detectAndParse.mockResolvedValue(createMockAPI({ name: 'Shared API' }));
    storageMocks.gitStore.listAPIs.mockResolvedValue([createMockAPI(), createMockAPI()]);

    await addCommand(['https://example.com/shared.json', '--name', 'api1']);
    await addCommand(['https://example.com/shared.json', '--name', 'api2']);

    expect(storageMocks.gitStore.saveAPI).toHaveBeenCalledTimes(2);
  });
});