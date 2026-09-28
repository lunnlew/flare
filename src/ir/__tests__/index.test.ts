import { describe, test, expect } from 'vitest';
import {
  validateAPI,
  validateEndpoint,
  validateMockRule,
  validateHistoryEntry,
  validateAuth,
  validateAssert,
  isValidHttpMethod,
  parseContentType,
  HTTP_STATUS_TEXTS,
  COMMON_CONTENT_TYPES,
  // Types
  type API,
  type EndpointSchema,
  type MockRule,
  type HistoryEntry,
  type AuthConfig,
  type Assert,
} from '../index.js';

describe('IR Validation', () => {
  const validAPI: API = {
    name: 'test-api',
    version: '1.0.0',
    baseUrl: 'https://api.example.com',
    endpoints: [
      {
        path: '/users',
        method: 'GET',
        responses: { '200': { statusCode: 200, description: 'OK' } },
      },
    ],
  };

  const validEndpoint: EndpointSchema = {
    path: '/posts',
    method: 'POST',
    summary: 'Create a post',
    parameters: [
      {
        name: 'title',
        location: 'body',
        required: true,
      },
    ],
    requestBody: {
      required: true,
      contentType: 'application/json',
    },
  };

  describe('validateAPI', () => {
    test('validates correct API', () => {
      expect(() => validateAPI(validAPI)).not.toThrow();
    });

    test('throws on missing required fields', () => {
      expect(() => validateAPI({})).toThrow();
    });

    test('throws on invalid endpoint', () => {
      const api = {
        ...validAPI,
        endpoints: [{ path: 123 }] as any,
      };
      expect(() => validateAPI(api)).toThrow();
    });

    test('accepts API with optional fields', () => {
      const api: API = {
        ...validAPI,
        description: 'Test API',
        tags: ['test', 'api'],
        auth: { type: 'bearer', bearerToken: 'secret' },
        servers: [{ url: 'https://api.example.com' }],
        capabilities: [{ name: 'test' }],
      };
      expect(() => validateAPI(api)).not.toThrow();
    });
  });

  describe('validateEndpoint', () => {
    test('validates correct endpoint', () => {
      expect(() => validateEndpoint(validEndpoint)).not.toThrow();
    });

    test('throws on missing path', () => {
      expect(() => validateEndpoint({ method: 'GET' } as any)).toThrow();
    });

    test('throws on invalid method', () => {
      expect(() => validateEndpoint({ path: '/test', method: 'INVALID' } as any)).toThrow();
    });
  });

  describe('validateMockRule', () => {
    const validMockRule: MockRule = {
      id: 'mock-1',
      name: 'Test Mock',
      method: '*',
      path: '/api/*',
      enabled: true,
      response: {
        status: 200,
        body: { success: true },
      },
    };

    test('validates correct mock rule', () => {
      expect(() => validateMockRule(validMockRule)).not.toThrow();
    });

    test('throws on missing required fields', () => {
      expect(() => validateMockRule({})).toThrow();
    });
  });

  describe('validateHistoryEntry', () => {
    const validHistory: HistoryEntry = {
      id: 'hist-1',
      timestamp: Date.now(),
      method: 'GET',
      url: 'https://api.example.com/users',
      request: {
        headers: { 'Content-Type': 'application/json' },
      },
      response: {
        status: 200,
        headers: {},
        body: '{"data":[]}',
        time: 100,
      },
    };

    test('validates correct history entry', () => {
      expect(() => validateHistoryEntry(validHistory)).not.toThrow();
    });
  });

  describe('validateAuth', () => {
    test('validates bearer auth', () => {
      const auth: AuthConfig = { type: 'bearer', bearerToken: 'secret' };
      expect(() => validateAuth(auth)).not.toThrow();
    });

    test('validates oauth2 auth', () => {
      const auth: AuthConfig = {
        type: 'oauth2',
        oauth2: {
          type: 'authorizationCode',
          authorizationUrl: 'https://auth.example.com',
          tokenUrl: 'https://auth.example.com/token',
        },
      };
      expect(() => validateAuth(auth)).not.toThrow();
    });
  });

  describe('validateAssert', () => {
    const validAssert: Assert = {
      type: 'status',
      expression: 'status',
      operator: 'eq',
      expected: 200,
      caseSensitive: false,
    };

    test('validates correct assert', () => {
      expect(() => validateAssert(validAssert)).not.toThrow();
    });
  });
});

describe('Utility Functions', () => {
  describe('isValidHttpMethod', () => {
    test('returns true for valid methods', () => {
      expect(isValidHttpMethod('GET')).toBe(true);
      expect(isValidHttpMethod('POST')).toBe(true);
      expect(isValidHttpMethod('PUT')).toBe(true);
      expect(isValidHttpMethod('DELETE')).toBe(true);
    });

    test('returns false for invalid methods', () => {
      expect(isValidHttpMethod('INVALID')).toBe(false);
      expect(isValidHttpMethod('get')).toBe(false); // case sensitive
    });
  });

  describe('parseContentType', () => {
    test('parses simple content type', () => {
      const result = parseContentType('application/json');
      expect(result.type).toBe('application');
      expect(result.subtype).toBe('json');
    });

    test('parses content type with charset', () => {
      const result = parseContentType('text/html; charset=utf-8');
      expect(result.type).toBe('text');
      expect(result.subtype).toBe('html');
      expect(result.params.charset).toBe('utf-8');
    });

    test('handles multipart with boundary', () => {
      const result = parseContentType('multipart/form-data; boundary=----WebKitFormBoundary');
      expect(result.type).toBe('multipart');
      expect(result.params.boundary).toBe('----WebKitFormBoundary');
    });
  });
});

describe('Constants', () => {
  test('HTTP_STATUS_TEXTS contains common codes', () => {
    expect(HTTP_STATUS_TEXTS[200]).toBe('OK');
    expect(HTTP_STATUS_TEXTS[404]).toBe('Not Found');
    expect(HTTP_STATUS_TEXTS[500]).toBe('Internal Server Error');
  });

  test('COMMON_CONTENT_TYPES contains expected types', () => {
    expect(COMMON_CONTENT_TYPES).toContain('application/json');
    expect(COMMON_CONTENT_TYPES).toContain('application/xml');
    expect(COMMON_CONTENT_TYPES).toContain('multipart/form-data');
  });
});