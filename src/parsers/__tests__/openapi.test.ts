import { describe, test, expect } from 'vitest';
import { openApiParser } from '../../parsers/openapi.js';

describe('parsers - OpenAPI 3.0', () => {
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
      const source = `
openapi: 3.0.0
info:
  title: Test API
  version: 1.0.0
paths: {}
`;
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

    test('[边界] rejects non-openapi', () => {
      const source = JSON.stringify({
        info: { title: 'Test API', version: '1.0.0' },
      });
      expect(openApiParser.detect(source)).toBe(false);
    });
  });

  describe('parse', () => {
    test('[主体] parses minimal OpenAPI API', async () => {
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

    test('[主体] parses all HTTP methods', async () => {
      const source = JSON.stringify({
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/test': {
            get: { summary: 'Get' },
            post: { summary: 'Create' },
            put: { summary: 'Update' },
            delete: { summary: 'Delete' },
            patch: { summary: 'Patch' },
            head: { summary: 'Head' },
            options: { summary: 'Options' },
          },
        },
      });

      const api = await openApiParser.parse(source);

      expect(api.endpoints).toHaveLength(7);
      const methods = api.endpoints.map(e => e.method);
      expect(methods).toContain('GET');
      expect(methods).toContain('POST');
      expect(methods).toContain('PUT');
      expect(methods).toContain('DELETE');
      expect(methods).toContain('PATCH');
      expect(methods).toContain('HEAD');
      expect(methods).toContain('OPTIONS');
    });

    test('[主体] parses endpoint with operationId', async () => {
      const source = JSON.stringify({
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users/{id}': {
            get: {
              operationId: 'getUserById',
              summary: 'Get user by ID',
            },
          },
        },
      });

      const api = await openApiParser.parse(source);

      expect(api.endpoints[0].operationId).toBe('getUserById');
    });

    test('[主体] parses endpoint description and summary', async () => {
      const source = JSON.stringify({
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              summary: 'List users',
              description: 'Returns a list of all users in the system',
            },
          },
        },
      });

      const api = await openApiParser.parse(source);

      expect(api.endpoints[0].summary).toBe('List users');
      expect(api.endpoints[0].description).toBe('Returns a list of all users in the system');
    });

    test('[主体] parses deprecated flag', async () => {
      const source = JSON.stringify({
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/old': {
            get: {
              summary: 'Old endpoint',
              deprecated: true,
            },
          },
        },
      });

      const api = await openApiParser.parse(source);

      expect(api.endpoints[0].deprecated).toBe(true);
    });

    test('[主体] parses tags', async () => {
      const source = JSON.stringify({
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              tags: ['users', 'crud'],
              summary: 'List users',
            },
          },
        },
      });

      const api = await openApiParser.parse(source);

      expect(api.endpoints[0].tags).toEqual(['users', 'crud']);
    });

    test('[主体] parses path parameters', async () => {
      const source = JSON.stringify({
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users/{id}': {
            get: {
              parameters: [
                { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
              ],
            },
          },
        },
      });

      const api = await openApiParser.parse(source);

      expect(api.endpoints[0].parameters).toHaveLength(1);
      expect(api.endpoints[0].parameters![0].name).toBe('id');
      expect(api.endpoints[0].parameters![0].location).toBe('path');
    });

    test('[主体] parses query parameters', async () => {
      const source = JSON.stringify({
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              parameters: [
                { name: 'limit', in: 'query', schema: { type: 'integer' } },
                { name: 'offset', in: 'query', schema: { type: 'integer' } },
              ],
            },
          },
        },
      });

      const api = await openApiParser.parse(source);

      expect(api.endpoints[0].parameters).toHaveLength(2);
    });

    test('[主体] parses header parameters', async () => {
      const source = JSON.stringify({
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              parameters: [
                { name: 'Authorization', in: 'header', schema: { type: 'string' } },
              ],
            },
          },
        },
      });

      const api = await openApiParser.parse(source);

      expect(api.endpoints[0].parameters![0].location).toBe('header');
    });

    test('[主体] parses requestBody', async () => {
      const source = JSON.stringify({
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            post: {
              requestBody: {
                description: 'User data',
                required: true,
                content: {
                  'application/json': {
                    schema: { type: 'object' },
                  },
                },
              },
            },
          },
        },
      });

      const api = await openApiParser.parse(source);

      expect(api.endpoints[0].requestBody).toBeDefined();
      expect(api.endpoints[0].requestBody!.description).toBe('User data');
      expect(api.endpoints[0].requestBody!.required).toBe(true);
      expect(api.endpoints[0].requestBody!.contentType).toBe('application/json');
    });

    test('[主体] parses responses with links', async () => {
      const source = JSON.stringify({
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              responses: {
                '200': {
                  description: 'Successful response',
                  links: {
                    UserLink: { operationRef: '#/paths/~1users/get' },
                  },
                },
              },
            },
          },
        },
      });

      const api = await openApiParser.parse(source);

      expect(api.endpoints[0].responses).toBeDefined();
      expect(api.endpoints[0].responses!['200']).toBeDefined();
    });

    test('[主体] parses server variables', async () => {
      const source = JSON.stringify({
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        servers: [
          {
            url: 'https://api.example.com/{version}',
            variables: {
              version: { default: 'v1', enum: ['v1', 'v2'] },
            },
          },
        ],
        paths: {},
      });

      const api = await openApiParser.parse(source);

      expect(api.baseUrl).toBe('https://api.example.com/v1');
      expect(api.servers).toHaveLength(1);
    });

    test('[主体] parses global tags', async () => {
      const source = JSON.stringify({
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        tags: [{ name: 'users' }, { name: 'admin' }],
        paths: {},
      });

      const api = await openApiParser.parse(source);

      expect(api.tags).toContain('users');
      expect(api.tags).toContain('admin');
    });

    test('[主体] parses security requirements', async () => {
      const source = JSON.stringify({
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              security: [{ bearerAuth: [] }],
            },
          },
        },
      });

      const api = await openApiParser.parse(source);

      expect(api.endpoints[0].security).toBeDefined();
      expect(api.endpoints[0].security![0].name).toBe('bearerAuth');
    });

    test('[主体] parses global security', async () => {
      const source = JSON.stringify({
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        security: [{ apiKeyAuth: [] }],
        paths: {
          '/users': {
            get: {},
          },
        },
      });

      const api = await openApiParser.parse(source);

      expect(api.security).toBeDefined();
    });

    test('[主体] parses callbacks', async () => {
      const source = JSON.stringify({
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            post: {
              callbacks: {
                'myCallback': {
                  '{$request.body#/email}': {
                    post: {
                      operationId: 'webhookCall',
                    },
                  },
                },
              },
            },
          },
        },
      });

      const api = await openApiParser.parse(source);

      expect(api.endpoints[0].callbacks).toBeDefined();
      expect(api.endpoints[0].callbacks!['myCallback']).toBeDefined();
    });

    test('[主体] parses operation-level servers', async () => {
      const source = JSON.stringify({
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              servers: [{ url: 'https://special.api.example.com' }],
            },
          },
        },
      });

      const api = await openApiParser.parse(source);

      expect(api.endpoints[0].servers).toBeDefined();
      expect(api.endpoints[0].servers![0].url).toBe('https://special.api.example.com');
    });

    test('[主体] parses termsOfService', async () => {
      const source = JSON.stringify({
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
          termsOfService: 'https://example.com/terms',
        },
        paths: {},
      });

      const api = await openApiParser.parse(source);

      expect(api.termsOfService).toBe('https://example.com/terms');
    });

    test('[主体] parses without servers uses empty baseUrl', async () => {
      const source = JSON.stringify({
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {},
      });

      const api = await openApiParser.parse(source);

      expect(api.baseUrl).toBe('');
    });

    test('[主体] parses info with missing fields', async () => {
      const source = JSON.stringify({
        openapi: '3.0.0',
        info: {},
        paths: {},
      });

      const api = await openApiParser.parse(source);

      expect(api.name).toBe('Untitled API');
      expect(api.version).toBe('1.0.0');
    });

    test('[边界] empty paths returns empty endpoints', async () => {
      const source = JSON.stringify({
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {},
      });

      const api = await openApiParser.parse(source);

      expect(api.endpoints).toHaveLength(0);
    });

    test('[边界] handles missing parameters', async () => {
      const source = JSON.stringify({
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            get: {},
          },
        },
      });

      const api = await openApiParser.parse(source);

      expect(api.endpoints[0].parameters).toHaveLength(0);
    });

    test('[边界] handles missing responses', async () => {
      const source = JSON.stringify({
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            get: {},
          },
        },
      });

      const api = await openApiParser.parse(source);

      expect(api.endpoints[0].responses).toEqual({});
    });
  });
});