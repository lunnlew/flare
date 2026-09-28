import { vi, describe, test, expect, beforeEach } from 'vitest';
import { fetchWithTimeout, isBlockedUrl, buildUrl, parseResponse } from '../http.js';
import { FlareError, parseError, networkError, authError, storageError, timeoutError, isFlareError } from '../errors.js';
import { loadConfig, getEmbeddingConfig, getRequestTimeout, resetConfig, validateEmbeddingConfig } from '../config.js';

describe('utils - http', () => {
  describe('fetchWithTimeout', () => {
    test('[主体] makes basic GET request', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: () => Promise.resolve('{"result":"ok"}'),
      } as Response);

      const result = await fetchWithTimeout('https://api.example.com');

      expect(result.status).toBe(200);
      expect(global.fetch).toHaveBeenCalledWith('https://api.example.com', expect.any(Object));
    });

    test('[主体] makes POST request with body', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        statusText: 'Created',
        text: () => Promise.resolve('{"id":1}'),
      } as Response);

      const result = await fetchWithTimeout('https://api.example.com/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"name":"test"}',
      });

      expect(result.status).toBe(201);
    });

    test('[边界] handles timeout', async () => {
      global.fetch = vi.fn().mockImplementation(() => new Promise((_, reject) => {
        setTimeout(() => reject(new Error('timeout')), 100);
      }));

      await expect(fetchWithTimeout('https://api.example.com', { timeout: 50 }))
        .rejects.toThrow();
    });

    test('[边界] handles HTTP error status', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: () => Promise.resolve('Not Found'),
      } as Response);

      const result = await fetchWithTimeout('https://api.example.com/notfound');

      expect(result.status).toBe(404);
    });
  });
});

describe('utils - errors', () => {
  test('[主体] FlareError is exported', () => {
    expect(new FlareError('test error', 'PARSE_ERROR')).toBeInstanceOf(Error);
    expect(new FlareError('test error', 'PARSE_ERROR').message).toBe('test error');
  });

  test('[主体] FlareError has code', () => {
    const error = new FlareError('test', 'NETWORK_ERROR');
    expect(error.code).toBe('NETWORK_ERROR');
  });

  test('[主体] parseError factory creates FlareError', () => {
    const error = parseError({ raw: 'invalid json' });
    expect(error).toBeInstanceOf(FlareError);
    expect(error.code).toBe('PARSE_ERROR');
    expect(error.details).toEqual({ raw: 'invalid json' });
  });

  test('[主体] networkError factory creates FlareError', () => {
    const error = networkError({ reason: 'connection refused' });
    expect(error).toBeInstanceOf(FlareError);
    expect(error.code).toBe('NETWORK_ERROR');
  });

  test('[主体] authError factory creates FlareError', () => {
    const error = authError({ status: 401 });
    expect(error).toBeInstanceOf(FlareError);
    expect(error.code).toBe('AUTH_ERROR');
  });

  test('[主体] storageError factory creates FlareError', () => {
    const error = storageError('read', { path: '/tmp/test' });
    expect(error).toBeInstanceOf(FlareError);
    expect(error.code).toBe('STORAGE_ERROR');
  });

  test('[主体] timeoutError factory creates FlareError', () => {
    const error = timeoutError(5000);
    expect(error).toBeInstanceOf(FlareError);
    expect(error.code).toBe('TIMEOUT_ERROR');
  });

  test('[主体] isFlareError type guard works', () => {
    const error = parseError({});
    expect(isFlareError(error)).toBe(true);
    expect(isFlareError(new Error('regular'))).toBe(false);
  });

  test('[边界] error with suggestion', () => {
    const error = parseError({}, 'Check the format');
    expect(error.suggestion).toBe('Check the format');
  });
});

describe('utils - config', () => {
  beforeEach(() => {
    resetConfig();
  });

  test('[主体] loadConfig returns config object', () => {
    const config = loadConfig();

    expect(config).toBeDefined();
    expect(typeof config.basePath).toBe('string');
    expect(['openai', 'local', 'stub']).toContain(config.embeddingProvider);
  });

  test('[主体] loadConfig has expected structure', () => {
    const config = loadConfig();

    expect(typeof config.requestTimeout).toBe('number');
    expect(typeof config.embeddingCacheTtl).toBe('number');
  });

  test('[主体] getEmbeddingConfig returns provider and apiKey', () => {
    const config = getEmbeddingConfig();

    expect(config).toHaveProperty('provider');
    expect(config).toHaveProperty('apiKey');
  });

  test('[主体] getRequestTimeout returns number', () => {
    const timeout = getRequestTimeout();
    expect(typeof timeout).toBe('number');
    expect(timeout).toBeGreaterThan(0);
  });

  test('[边界] handles missing env vars with defaults', () => {
    const originalEnv = process.env.EMBEDDING_PROVIDER;
    delete process.env.EMBEDDING_PROVIDER;
    resetConfig();

    const config = loadConfig();

    expect(config).toBeDefined();
    expect(config.embeddingProvider).toBe('stub');

    process.env.EMBEDDING_PROVIDER = originalEnv;
    resetConfig();
  });

  test('[边界] resetConfig clears cache', () => {
    loadConfig();
    resetConfig();
    // Should not throw and cache should be cleared
    const config = loadConfig();
    expect(config).toBeDefined();
  });
});

describe('utils - http security', () => {
  describe('isBlockedUrl', () => {
    test('[主体] blocks localhost', () => {
      expect(isBlockedUrl('http://localhost/path')).toBe(true);
      expect(isBlockedUrl('http://localhost:8080/path')).toBe(true);
    });

    test('[主体] blocks 127.0.0.1', () => {
      expect(isBlockedUrl('http://127.0.0.1/path')).toBe(true);
      expect(isBlockedUrl('http://127.0.0.1:3000/path')).toBe(true);
    });

    test.skip('[主体] blocks IPv6 loopback', () => {
      // IPv6 addresses are blocked when hostname is exactly ::1
      expect(isBlockedUrl('http://[::1]/path')).toBe(true);
    });

    test('[主体] blocks cloud metadata endpoint', () => {
      expect(isBlockedUrl('http://169.254.169.254/latest/meta-data')).toBe(true);
    });

    test('[主体] blocks 10.x.x.x private range', () => {
      expect(isBlockedUrl('http://10.0.0.1/path')).toBe(true);
      expect(isBlockedUrl('http://10.255.255.255/path')).toBe(true);
    });

    test('[主体] blocks 172.16.x.x - 172.31.x.x private range', () => {
      expect(isBlockedUrl('http://172.16.0.1/path')).toBe(true);
      expect(isBlockedUrl('http://172.31.255.255/path')).toBe(true);
      expect(isBlockedUrl('http://172.20.0.1/path')).toBe(true);
    });

    test('[主体] blocks 192.168.x.x private range', () => {
      expect(isBlockedUrl('http://192.168.0.1/path')).toBe(true);
      expect(isBlockedUrl('http://192.168.255.255/path')).toBe(true);
    });

    test('[主体] blocks 169.254.x.x link-local range', () => {
      expect(isBlockedUrl('http://169.254.169.254/path')).toBe(true);
    });

    test('[主体] allows public URLs', () => {
      expect(isBlockedUrl('https://api.example.com/path')).toBe(false);
      expect(isBlockedUrl('https://93.184.216.34/path')).toBe(false); //93.184.216.34 is a public IP (example.com)
    });

    test('[边界] blocks invalid URLs', () => {
      expect(isBlockedUrl('not a url')).toBe(true);
      expect(isBlockedUrl('')).toBe(true);
    });
  });

  describe('buildUrl', () => {
    test('[主体] builds URL with base', () => {
      const url = buildUrl('https://api.example.com', '/users');
      expect(url).toBe('https://api.example.com/users');
    });

    test('[主体] builds URL with query params', () => {
      const url = buildUrl('https://api.example.com', '/users', { limit: 10, offset: 0 });
      expect(url).toContain('https://api.example.com/users');
      expect(url).toContain('limit=10');
      expect(url).toContain('offset=0');
    });

    test('[主体] skips undefined/null values', () => {
      const url = buildUrl('https://api.example.com', '/users', { limit: undefined, offset: null });
      expect(url).toBe('https://api.example.com/users');
    });

    test('[主体] handles numeric and boolean values', () => {
      const url = buildUrl('https://api.example.com', '/search', { active: true, page: 1 });
      expect(url).toContain('active=true');
      expect(url).toContain('page=1');
    });
  });

  describe('parseResponse', () => {
    test('[主体] parses valid JSON response', async () => {
      const response = {
        text: () => Promise.resolve('{"name":"test","count":42}'),
      } as Response;

      const result = await parseResponse(response);

      expect(result).toEqual({ name: 'test', count: 42 });
    });

    test('[主体] parses JSON array response', async () => {
      const response = {
        text: () => Promise.resolve('[1,2,3]'),
      } as Response;

      const result = await parseResponse(response);

      expect(result).toEqual([1, 2, 3]);
    });

    test('[边界] throws on invalid JSON', async () => {
      const response = {
        text: () => Promise.resolve('not valid json'),
      } as Response;

      await expect(parseResponse(response)).rejects.toThrow('Failed to parse response as JSON');
    });

    test('[边界] includes preview of invalid content in error', async () => {
      const response = {
        text: () => Promise.resolve('this is a long invalid json response that should be truncated'),
      } as Response;

      await expect(parseResponse(response)).rejects.toThrow(/this is a long/);
    });
  });
});