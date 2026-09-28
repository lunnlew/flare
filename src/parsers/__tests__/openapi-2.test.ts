import { describe, test, expect } from 'vitest';
import { openApi2Parser } from '../../parsers/openapi-2.js';

describe('parsers - OpenAPI 2.0 (Swagger)', () => {
  describe('detect', () => {
    test('[主体] detects Swagger 2.0 JSON', () => {
      const source = JSON.stringify({
        swagger: '2.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {},
      });
      expect(openApi2Parser.detect(source)).toBe(true);
    });

    test('[主体] detects Swagger 2.0 YAML', () => {
      const source = `
swagger: '2.0'
info:
  title: Test API
  version: 1.0.0
paths: {}
`;
      expect(openApi2Parser.detect(source)).toBe(true);
    });

    test('[边界] rejects OpenAPI 3.0', () => {
      const source = JSON.stringify({
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {},
      });
      expect(openApi2Parser.detect(source)).toBe(false);
    });

    test('[边界] rejects non-swagger', () => {
      const source = JSON.stringify({
        info: { title: 'Test API', version: '1.0.0' },
      });
      expect(openApi2Parser.detect(source)).toBe(false);
    });
  });

  describe('parse', () => {
    test('[主体] parses minimal Swagger API', async () => {
      const source = JSON.stringify({
        swagger: '2.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/test': {
            get: { summary: 'Test endpoint' },
          },
        },
      });

      const api = await openApi2Parser.parse(source);

      expect(api.name).toBe('Test API');
      expect(api.version).toBe('1.0.0');
      expect(api.endpoints).toHaveLength(1);
      expect(api.endpoints[0].path).toBe('/test');
      expect(api.endpoints[0].method).toBe('GET');
    });

    test('[主体] parses all HTTP methods', async () => {
      const source = JSON.stringify({
        swagger: '2.0',
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

      const api = await openApi2Parser.parse(source);

      expect(api.endpoints).toHaveLength(7); // head and options are included
      const methods = api.endpoints.map(e => e.method);
      expect(methods).toContain('GET');
      expect(methods).toContain('POST');
      expect(methods).toContain('PUT');
      expect(methods).toContain('DELETE');
      expect(methods).toContain('PATCH');
    });

    test('[主体] parses endpoint with operationId', async () => {
      const source = JSON.stringify({
        swagger: '2.0',
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

      const api = await openApi2Parser.parse(source);

      expect(api.endpoints[0].operationId).toBe('getUserById');
    });

    test('[主体] parses endpoint description and summary', async () => {
      const source = JSON.stringify({
        swagger: '2.0',
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

      const api = await openApi2Parser.parse(source);

      expect(api.endpoints[0].summary).toBe('List users');
      expect(api.endpoints[0].description).toBe('Returns a list of all users in the system');
    });

    test('[主体] parses deprecated flag', async () => {
      const source = JSON.stringify({
        swagger: '2.0',
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

      const api = await openApi2Parser.parse(source);

      expect(api.endpoints[0].deprecated).toBe(true);
    });

    test('[主体] parses tags', async () => {
      const source = JSON.stringify({
        swagger: '2.0',
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

      const api = await openApi2Parser.parse(source);

      expect(api.endpoints[0].tags).toEqual(['users', 'crud']);
    });

    test('[主体] parses path parameters', async () => {
      const source = JSON.stringify({
        swagger: '2.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users/{id}': {
            get: {
              parameters: [
                { name: 'id', in: 'path', required: true, type: 'string' },
              ],
            },
          },
        },
      });

      const api = await openApi2Parser.parse(source);

      expect(api.endpoints[0].parameters).toHaveLength(1);
      expect(api.endpoints[0].parameters![0].name).toBe('id');
      expect(api.endpoints[0].parameters![0].location).toBe('path');
    });

    test('[主体] parses query parameters', async () => {
      const source = JSON.stringify({
        swagger: '2.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              parameters: [
                { name: 'limit', in: 'query', type: 'integer' },
                { name: 'offset', in: 'query', type: 'integer' },
              ],
            },
          },
        },
      });

      const api = await openApi2Parser.parse(source);

      expect(api.endpoints[0].parameters).toHaveLength(2);
    });

    test('[主体] parses header parameters', async () => {
      const source = JSON.stringify({
        swagger: '2.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              parameters: [
                { name: 'Authorization', in: 'header', type: 'string' },
              ],
            },
          },
        },
      });

      const api = await openApi2Parser.parse(source);

      expect(api.endpoints[0].parameters![0].location).toBe('header');
    });

    test('[主体] parses responses', async () => {
      const source = JSON.stringify({
        swagger: '2.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              responses: {
                '200': { description: 'Successful response' },
                '404': { description: 'Not found' },
              },
            },
          },
        },
      });

      const api = await openApi2Parser.parse(source);

      expect(api.endpoints[0].responses).toBeDefined();
      expect(api.endpoints[0].responses!['200']).toBeDefined();
      expect(api.endpoints[0].responses!['404']).toBeDefined();
    });

    test('[主体] parses body parameter as requestBody', async () => {
      const source = JSON.stringify({
        swagger: '2.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            post: {
              body: {
                description: 'User data',
                required: true,
                schema: { type: 'object' },
              },
            },
          },
        },
      });

      const api = await openApi2Parser.parse(source);

      expect(api.endpoints[0].requestBody).toBeDefined();
      expect(api.endpoints[0].requestBody!.description).toBe('User data');
      expect(api.endpoints[0].requestBody!.required).toBe(true);
    });

    test('[主体] parses security definitions - basic auth', async () => {
      const source = JSON.stringify({
        swagger: '2.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {},
        securityDefinitions: {
          basicAuth: {
            type: 'basic',
          },
        },
      });

      const api = await openApi2Parser.parse(source);

      expect(api.auth).toBeDefined();
    });

    test('[主体] parses security definitions - apiKey', async () => {
      const source = JSON.stringify({
        swagger: '2.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {},
        securityDefinitions: {
          apiKey: {
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key',
          },
        },
      });

      const api = await openApi2Parser.parse(source);

      expect(api.auth).toBeDefined();
    });

    test('[主体] parses security definitions - oauth2', async () => {
      const source = JSON.stringify({
        swagger: '2.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {},
        securityDefinitions: {
          oauth2: {
            type: 'oauth2',
            flow: 'accessCode',
            authorizationUrl: 'https://auth.example.com',
            tokenUrl: 'https://auth.example.com/token',
          },
        },
      });

      const api = await openApi2Parser.parse(source);

      expect(api.auth).toBeDefined();
    });

    test('[主体] builds baseUrl from host and basePath', async () => {
      const source = JSON.stringify({
        swagger: '2.0',
        info: { title: 'Test API', version: '1.0.0' },
        host: 'api.example.com',
        basePath: '/v1',
        paths: {},
      });

      const api = await openApi2Parser.parse(source);

      expect(api.baseUrl).toBe('https://api.example.com/v1');
    });

    test('[主体] parses global tags', async () => {
      const source = JSON.stringify({
        swagger: '2.0',
        info: { title: 'Test API', version: '1.0.0' },
        tags: [{ name: 'users' }, { name: 'admin' }],
        paths: {},
      });

      const api = await openApi2Parser.parse(source);

      expect(api.tags).toContain('users');
      expect(api.tags).toContain('admin');
    });

    test('[主体] parses without host uses default baseUrl', async () => {
      const source = JSON.stringify({
        swagger: '2.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {},
      });

      const api = await openApi2Parser.parse(source);

      expect(api.baseUrl).toBe('https:/');
    });

    test('[边界] empty paths returns empty endpoints', async () => {
      const source = JSON.stringify({
        swagger: '2.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {},
      });

      const api = await openApi2Parser.parse(source);

      expect(api.endpoints).toHaveLength(0);
    });

    test('[边界] uses default name when info missing', async () => {
      const source = JSON.stringify({
        swagger: '2.0',
        paths: {},
      });

      const api = await openApi2Parser.parse(source);

      expect(api.name).toBe('Untitled API');
    });
  });
});