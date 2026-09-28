import { vi, describe, test, expect, beforeEach } from 'vitest';
import { openApiParser } from '../../parsers/openapi.js';
import { asyncApiParser } from '../../parsers/asyncapi.js';
import { postmanParser } from '../../parsers/postman.js';
import { httpParser } from '../../parsers/http.js';
import { graphqlParser } from '../../parsers/graphql.js';
import { detectAndParse, registerParser } from '../../parsers/index.js';

describe('parsers - OpenAPI', () => {
  describe('detect', () => {
    test('[主体] detects OpenAPI 3.0 JSON', () => {
      const source = JSON.stringify({
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {},
      });
      expect(openApiParser.detect(source)).toBe(true);
    });

    test('[主体] detects OpenAPI 3.1 JSON', () => {
      const source = JSON.stringify({
        openapi: '3.1.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {},
      });
      expect(openApiParser.detect(source)).toBe(true);
    });

    test('[主体] detects OpenAPI 3.0 YAML', () => {
      const source = `openapi: 3.0.0
info:
  title: Test API
  version: 1.0.0
paths: {}`;
      expect(openApiParser.detect(source)).toBe(true);
    });

    test('[边界] rejects Swagger 2.0', () => {
      const source = JSON.stringify({
        swagger: '2.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {},
      });
      expect(openApiParser.detect(source)).toBe(false);
    });

    test('[边界] rejects invalid JSON', () => {
      expect(openApiParser.detect('not json')).toBe(false);
    });
  });

  describe('parse', () => {
    test('[主体] parses minimal API', async () => {
      const source = JSON.stringify({
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/test': {
            get: { summary: 'Test endpoint' },
          },
        },
      });

      const api = await openApiParser.parse(source);

      expect(api.name).toBe('Test API');
      expect(api.version).toBe('1.0.0');
      expect(api.endpoints).toHaveLength(1);
      expect(api.endpoints[0].path).toBe('/test');
      expect(api.endpoints[0].method).toBe('GET');
    });

    test('[主体] parses with baseUrl from servers', async () => {
      const source = JSON.stringify({
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        servers: [{ url: 'https://api.example.com' }],
        paths: {},
      });

      const api = await openApiParser.parse(source);
      expect(api.baseUrl).toBe('https://api.example.com');
    });

    test('[主体] parses endpoint with all fields', async () => {
      const source = JSON.stringify({
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users/{id}': {
            get: {
              operationId: 'getUser',
              summary: 'Get a user',
              description: 'Returns a single user',
              tags: ['users'],
              deprecated: true,
              parameters: [
                { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
                { name: 'embed', in: 'query', schema: { type: 'string' } },
              ],
              responses: {
                '200': { description: 'Successful response' },
              },
            },
          },
        },
      });

      const api = await openApiParser.parse(source);
      const endpoint = api.endpoints[0];

      expect(endpoint.operationId).toBe('getUser');
      expect(endpoint.summary).toBe('Get a user');
      expect(endpoint.description).toBe('Returns a single user');
      expect(endpoint.tags).toEqual(['users']);
      expect(endpoint.deprecated).toBe(true);
      expect(endpoint.parameters).toHaveLength(2);
      expect(endpoint.responses).toBeDefined();
    });

    test('[主体] parses multiple methods on same path', async () => {
      const source = JSON.stringify({
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/items': {
            get: { summary: 'List items' },
            post: { summary: 'Create item' },
            delete: { summary: 'Delete item' },
          },
        },
      });

      const api = await openApiParser.parse(source);

      expect(api.endpoints).toHaveLength(3);
      expect(api.endpoints.map(e => e.method)).toEqual(['GET', 'POST', 'DELETE']);
    });

    test('[边界] handles empty paths', async () => {
      const source = JSON.stringify({
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {},
      });

      const api = await openApiParser.parse(source);
      expect(api.endpoints).toHaveLength(0);
    });
  });
});

describe('parsers - AsyncAPI', () => {
  describe('detect', () => {
    test('[主体] detects AsyncAPI 2.0', () => {
      const source = JSON.stringify({
        asyncapi: '2.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        channels: {},
      });
      expect(asyncApiParser.detect(source)).toBe(true);
    });

    test('[边界] rejects non-asyncapi', () => {
      const source = JSON.stringify({
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {},
      });
      expect(asyncApiParser.detect(source)).toBe(false);
    });
  });

  describe('parse', () => {
    test('[主体] parses minimal AsyncAPI', async () => {
      const source = JSON.stringify({
        asyncapi: '2.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        channels: {
          'user/signedUp': {
            subscribe: {
              message: {
                payload: { type: 'object' },
              },
            },
          },
        },
      });

      const api = await asyncApiParser.parse(source);

      expect(api.name).toBe('Test API');
      expect(api.version).toBe('1.0.0');
      expect(api.endpoints.length).toBeGreaterThan(0);
    });
  });
});

describe('parsers - Postman', () => {
  describe('detect', () => {
    test('[主体] detects Postman v2.1', () => {
      const source = JSON.stringify({
        info: { name: 'Test Collection', schema: 'https://schema.getpostman.com/json/collection/v2.1.0' },
        item: [],
      });
      expect(postmanParser.detect(source)).toBe(true);
    });

    test('[边界] rejects OpenAPI as Postman', () => {
      const source = JSON.stringify({
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {},
      });
      expect(postmanParser.detect(source)).toBe(false);
    });
  });

  describe('parse', () => {
    test('[主体] parses minimal Postman collection', async () => {
      const source = JSON.stringify({
        info: { name: 'Test Collection', schema: 'https://schema.getpostman.com/json/collection/v2.1.0' },
        item: [
          {
            name: 'Requests',
            item: [
              {
                name: 'Get User',
                request: { method: 'GET', url: 'https://api.example.com/users/1' },
              },
            ],
          },
        ],
      });

      const api = await postmanParser.parse(source);

      expect(api.name).toBe('Test Collection');
      expect(api.endpoints.length).toBeGreaterThan(0);
    });
  });
});

describe('parsers - HTTP', () => {
  describe('detect', () => {
    test('[主体] detects curl command', () => {
      expect(httpParser.detect("curl https://api.example.com")).toBe(true);
      expect(httpParser.detect("curl -X POST https://api.example.com")).toBe(true);
    });

    test('[边界] rejects plain URL', () => {
      expect(httpParser.detect('https://api.example.com')).toBe(false);
    });
  });

  describe('parse', () => {
    test('[主体] parses curl GET', async () => {
      const api = await httpParser.parse('curl https://api.example.com/users');

      expect(api.endpoints[0].method).toBe('GET');
      expect(api.endpoints[0].path).toBe('/users');
    });

    test('[主体] parses curl POST', async () => {
      const api = await httpParser.parse('curl -X POST https://api.example.com/users');

      expect(api.endpoints[0].method).toBe('POST');
    });

    test('[主体] parses curl DELETE', async () => {
      const api = await httpParser.parse('curl --request DELETE https://api.example.com/users');

      expect(api.endpoints[0].method).toBe('DELETE');
    });
  });
});

describe('parsers - GraphQL', () => {
  describe('detect', () => {
    test('[主体] detects schema definition', () => {
      expect(graphqlParser.detect('type Query { users: [User] }')).toBe(true);
    });

    test('[主体] detects introspection query', () => {
      expect(graphqlParser.detect('{"query":"{ __schema { types { name } } }"}')).toBe(true);
    });

    test('[边界] rejects OpenAPI', () => {
      expect(graphqlParser.detect('{"openapi":"3.0.0"}')).toBe(false);
    });
  });
});

describe('parsers - detectAndParse', () => {
  test('[主体] parses OpenAPI', async () => {
    const source = JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: { '/test': { get: {} } },
    });

    const api = await detectAndParse(source);
    expect(api.name).toBe('Test API');
  });

  test('[边界] throws on unrecognized format', async () => {
    await expect(detectAndParse('not recognized')).rejects.toThrow('无法识别格式');
  });
});