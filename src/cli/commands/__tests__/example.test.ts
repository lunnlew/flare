import { describe, test, expect } from 'vitest';

// Import example-generator directly - use namespace import to inspect exports
import * as exampleGen from '../../../utils/example-generator.js';

describe('example-generator', () => {
  test('[主体] generateRequestExample is exported', () => {
    expect(typeof exampleGen.generateRequestExample).toBe('function');
  });

  test('[主体] generateResponseExample is exported', () => {
    expect(typeof exampleGen.generateResponseExample).toBe('function');
  });

  test('[主体] generateEndpointExample is exported', () => {
    expect(typeof exampleGen.generateEndpointExample).toBe('function');
  });

  test('[主体] formatExampleAsJson is exported', () => {
    expect(typeof exampleGen.formatExampleAsJson).toBe('function');
  });

  test('[主体] generateCliExample is exported', () => {
    expect(typeof exampleGen.generateCliExample).toBe('function');
  });

  describe('generateRequestExample', () => {
    test('[主体] generates request example with query params', () => {
      const endpoint = {
        path: '/users',
        method: 'GET' as const,
        parameters: [
          { name: 'page', location: 'query' as const, schema: { type: 'integer' } },
        ],
      };
      const result = exampleGen.generateRequestExample(endpoint);
      expect(result.queryParams).toBeDefined();
    });

    test('[主体] generates request example with headers', () => {
      const endpoint = {
        path: '/users',
        method: 'GET' as const,
        parameters: [
          { name: 'Accept', location: 'header' as const, schema: { type: 'string' } },
        ],
      };
      const result = exampleGen.generateRequestExample(endpoint);
      expect(result.headers).toBeDefined();
    });

    test('[主体] generates request example with path params', () => {
      const endpoint = {
        path: '/users/{id}',
        method: 'GET' as const,
        parameters: [
          { name: 'id', location: 'path' as const, schema: { type: 'string' } },
        ],
      };
      const result = exampleGen.generateRequestExample(endpoint);
      expect(result.pathParams).toBeDefined();
    });

    test('[主体] generates request example with body', () => {
      const endpoint = {
        path: '/users',
        method: 'POST' as const,
        requestBody: { schema: { type: 'object' } },
      };
      const result = exampleGen.generateRequestExample(endpoint);
      expect(result.body).toBeDefined();
    });

    test('[边界] handles endpoint with no parameters', () => {
      const endpoint = { path: '/users', method: 'GET' as const };
      const result = exampleGen.generateRequestExample(endpoint);
      expect(result.queryParams).toBeUndefined();
      expect(result.headers).toBeUndefined();
      expect(result.pathParams).toBeUndefined();
    });
  });

  describe('generateResponseExample', () => {
    test('[主体] generates response example for 200 status', () => {
      const endpoint = {
        path: '/users',
        method: 'GET' as const,
        responses: {
          '200': { statusCode: 200, schema: { type: 'object' } },
        },
      };
      const result = exampleGen.generateResponseExample(endpoint, 200);
      expect(result.status).toBe(200);
    });

    test('[主体] generates response headers when responses are defined', () => {
      const endpoint = {
        path: '/users',
        method: 'GET' as const,
        responses: {
          '200': { statusCode: 200 },
        },
      };
      const result = exampleGen.generateResponseExample(endpoint);
      expect(result.headers).toBeDefined();
      expect(result.headers?.['Content-Type']).toBe('application/json');
    });

    test('[边界] returns default response when status not found', () => {
      const endpoint = {
        path: '/users',
        method: 'GET' as const,
        responses: {
          '200': { statusCode: 200 },
          'default': { statusCode: 'default' },
        },
      };
      const result = exampleGen.generateResponseExample(endpoint, 999);
      expect(result.status).toBeDefined();
    });

    test('[边界] returns basic response when no responses defined', () => {
      const endpoint = { path: '/users', method: 'GET' as const };
      const result = exampleGen.generateResponseExample(endpoint);
      expect(result.body).toEqual({ message: 'Success' });
    });
  });

  describe('generateEndpointExample', () => {
    test('[主体] generates complete endpoint example', () => {
      const api = {
        name: 'test-api',
        version: '1.0.0',
        baseUrl: 'https://api.example.com',
        endpoints: [{
          path: '/users',
          method: 'GET' as const,
          responses: { '200': { statusCode: 200 } },
        }],
      };
      const result = exampleGen.generateEndpointExample(api, '/users', 'GET');
      expect(result).not.toBeNull();
      expect(result?.request.method).toBe('GET');
    });

    test('[主体] generates request URL with baseUrl', () => {
      const api = {
        name: 'test-api',
        version: '1.0.0',
        baseUrl: 'https://api.example.com',
        endpoints: [{
          path: '/users',
          method: 'GET' as const,
          responses: { '200': { statusCode: 200 } },
        }],
      };
      const result = exampleGen.generateEndpointExample(api, '/users', 'GET');
      expect(result?.request.url).toContain('https://api.example.com');
    });

    test('[边界] returns null for nonexistent endpoint', () => {
      const api = {
        name: 'test-api',
        version: '1.0.0',
        baseUrl: 'https://api.example.com',
        endpoints: [{
          path: '/users',
          method: 'GET' as const,
          responses: { '200': { statusCode: 200 } },
        }],
      };
      const result = exampleGen.generateEndpointExample(api, '/nonexistent', 'GET');
      expect(result).toBeNull();
    });
  });

  describe('formatExampleAsJson', () => {
    test('[主体] formats example as JSON string', () => {
      const example = { request: { method: 'GET' } };
      const result = exampleGen.formatExampleAsJson(example);
      expect(typeof result).toBe('string');
      expect(result).toContain('"method"');
    });
  });

  describe('generateCliExample', () => {
    test('[主体] generates CLI example for valid API and endpoint', () => {
      const api = {
        name: 'test-api',
        version: '1.0.0',
        baseUrl: 'https://api.example.com',
        endpoints: [{
          path: '/users',
          method: 'GET' as const,
          responses: { '200': { statusCode: 200 } },
        }],
      };
      const result = exampleGen.generateCliExample('test-api', '/users', 'GET', api);
      expect(typeof result).toBe('string');
    });

    test('[边界] returns error for null API', () => {
      const result = exampleGen.generateCliExample('test-api', '/users', 'GET', null as any);
      expect(result).toContain('error');
    });

    test('[边界] returns error for nonexistent endpoint', () => {
      const api = {
        name: 'test-api',
        version: '1.0.0',
        baseUrl: 'https://api.example.com',
        endpoints: [{
          path: '/users',
          method: 'GET' as const,
          responses: { '200': { statusCode: 200 } },
        }],
      };
      const result = exampleGen.generateCliExample('test-api', '/nonexistent', 'GET', api);
      expect(result).toContain('error');
    });
  });
});