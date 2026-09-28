import { describe, test, expect } from 'vitest';
import { harParser, harToHistory } from '../../parsers/har.js';

describe('parsers - HAR', () => {
  describe('detect', () => {
    test('[主体] detects valid HAR', () => {
      const source = JSON.stringify({
        log: {
          entries: [
            {
              request: { method: 'GET', url: 'https://api.example.com', headers: [] },
              response: { status: 200, statusText: 'OK', headers: [], content: { mimeType: 'application/json', text: '{}' } },
            },
          ],
        },
      });
      expect(harParser.detect(source)).toBe(true);
    });

    test('[边界] rejects invalid JSON', () => {
      expect(harParser.detect('not json')).toBe(false);
    });

    test('[边界] rejects missing entries', () => {
      expect(harParser.detect('{"log":{}}')).toBe(false);
    });

    test('[边界] rejects non-array entries', () => {
      expect(harParser.detect('{"log":{"entries":"not array"}}')).toBe(false);
    });
  });

  describe('parse', () => {
    test('[主体] parses entry with query parameters', async () => {
      const source = JSON.stringify({
        log: {
          entries: [
            {
              startedDateTime: '2024-01-01T00:00:00Z',
              request: {
                method: 'GET',
                url: 'https://api.example.com/users?limit=10&offset=0',
                headers: [{ name: 'Accept', value: 'application/json' }],
                queryString: [
                  { name: 'limit', value: '10' },
                  { name: 'offset', value: '0' },
                ],
              },
              response: {
                status: 200,
                statusText: 'OK',
                headers: [{ name: 'Content-Type', value: 'application/json' }],
                content: { mimeType: 'application/json', text: '[]', size: 2 },
              },
              time: 100,
            },
          ],
          creator: { name: 'Postman', version: '10.0.0' },
        },
      });

      const api = await harParser.parse(source);

      expect(api.endpoints).toHaveLength(1);
      expect(api.endpoints[0].parameters).toHaveLength(2);
      expect(api.endpoints[0].parameters![0].name).toBe('limit');
      expect(api.endpoints[0].parameters![0].location).toBe('query');
    });

    test('[主体] parses entry with header parameters', async () => {
      const source = JSON.stringify({
        log: {
          entries: [
            {
              startedDateTime: '2024-01-01T00:00:00Z',
              request: {
                method: 'GET',
                url: 'https://api.example.com/users',
                headers: [
                  { name: 'Authorization', value: 'Bearer token123' },
                  { name: 'X-Custom-Header', value: 'value' },
                ],
                queryString: [],
              },
              response: {
                status: 200,
                statusText: 'OK',
                headers: [{ name: 'Content-Type', value: 'application/json' }],
                content: { mimeType: 'application/json', text: '[]', size: 2 },
              },
              time: 100,
            },
          ],
          creator: { name: 'Chrome', version: '120.0' },
        },
      });

      const api = await harParser.parse(source);

      expect(api.endpoints[0].parameters).toHaveLength(1);
      expect(api.endpoints[0].parameters![0].name).toBe('X-Custom-Header');
      expect(api.endpoints[0].parameters![0].location).toBe('header');
    });

    test('[主体] aggregates duplicate query params', async () => {
      const source = JSON.stringify({
        log: {
          entries: [
            {
              request: {
                method: 'GET',
                url: 'https://api.example.com/users?status=active',
                headers: [],
                queryString: [{ name: 'status', value: 'active' }],
              },
              response: { status: 200, statusText: 'OK', headers: [], content: { mimeType: 'application/json', text: '[]', size: 2 } },
              time: 50,
            },
            {
              request: {
                method: 'GET',
                url: 'https://api.example.com/users?status=inactive',
                headers: [],
                queryString: [{ name: 'status', value: 'inactive' }],
              },
              response: { status: 200, statusText: 'OK', headers: [], content: { mimeType: 'application/json', text: '[]', size: 2 } },
              time: 50,
            },
          ],
          creator: { name: 'Chrome', version: '120.0' },
        },
      });

      const api = await harParser.parse(source);

      expect(api.endpoints).toHaveLength(1);
      expect(api.endpoints[0].parameters).toHaveLength(1);
      expect(api.endpoints[0].parameters![0].example).toBe('active');
    });

    test('[主体] parses multiple HTTP methods', async () => {
      const source = JSON.stringify({
        log: {
          entries: [
            {
              request: {
                method: 'GET',
                url: 'https://api.example.com/users',
                headers: [],
                queryString: [],
              },
              response: { status: 200, statusText: 'OK', headers: [], content: { mimeType: 'application/json', text: '[]', size: 2 } },
              time: 50,
            },
            {
              request: {
                method: 'POST',
                url: 'https://api.example.com/users',
                headers: [],
                queryString: [],
              },
              response: { status: 201, statusText: 'Created', headers: [], content: { mimeType: 'application/json', text: '{}', size: 2 } },
              time: 50,
            },
          ],
          creator: { name: 'Postman', version: '10.0' },
        },
      });

      const api = await harParser.parse(source);

      expect(api.endpoints).toHaveLength(2);
      const methods = api.endpoints.map(e => e.method);
      expect(methods).toContain('GET');
      expect(methods).toContain('POST');
    });

    test('[主体] parses XML response', async () => {
      const source = JSON.stringify({
        log: {
          entries: [
            {
              request: {
                method: 'GET',
                url: 'https://api.example.com/users',
                headers: [],
                queryString: [],
              },
              response: {
                status: 200,
                statusText: 'OK',
                headers: [{ name: 'Content-Type', value: 'application/xml' }],
                content: { mimeType: 'application/xml', text: '<users></users>', size: 15 },
              },
              time: 100,
            },
          ],
          creator: { name: 'Chrome', version: '120.0' },
        },
      });

      const api = await harParser.parse(source);

      expect(api.endpoints[0].responses!['200'].contentType).toBe('application/xml');
    });

    test('[主体] parses JSON response with schema inference', async () => {
      const source = JSON.stringify({
        log: {
          entries: [
            {
              request: {
                method: 'GET',
                url: 'https://api.example.com/users',
                headers: [],
                queryString: [],
              },
              response: {
                status: 200,
                statusText: 'OK',
                headers: [{ name: 'Content-Type', value: 'application/json' }],
                content: { mimeType: 'application/json', text: '{"name":"John","age":30}', size: 25 },
              },
              time: 100,
            },
          ],
          creator: { name: 'Chrome', version: '120.0' },
        },
      });

      const api = await harParser.parse(source);

      expect(api.endpoints[0].responses!['200'].schema).toEqual({
        type: 'object',
        properties: { name: { type: 'string' }, age: { type: 'integer' } },
      });
    });

    test('[主体] parses array response schema', async () => {
      const source = JSON.stringify({
        log: {
          entries: [
            {
              request: {
                method: 'GET',
                url: 'https://api.example.com/users',
                headers: [],
                queryString: [],
              },
              response: {
                status: 200,
                statusText: 'OK',
                headers: [{ name: 'Content-Type', value: 'application/json' }],
                content: { mimeType: 'application/json', text: '[{"id":1}]', size: 10 },
              },
              time: 100,
            },
          ],
          creator: { name: 'Chrome', version: '120.0' },
        },
      });

      const api = await harParser.parse(source);

      expect(api.endpoints[0].responses!['200'].schema).toEqual({
        type: 'array',
        items: { type: 'object', properties: { id: { type: 'integer' } } },
      });
    });

    test('[主体] parses baseUrl from entries', async () => {
      const source = JSON.stringify({
        log: {
          entries: [
            {
              request: {
                method: 'GET',
                url: 'https://api.example.com/users',
                headers: [],
                queryString: [],
              },
              response: { status: 200, statusText: 'OK', headers: [], content: { mimeType: 'application/json', text: '[]', size: 2 } },
              time: 100,
            },
          ],
          creator: { name: 'Chrome', version: '120.0' },
        },
      });

      const api = await harParser.parse(source);

      expect(api.baseUrl).toBe('https://api.example.com');
    });

    test('[主体] parses metadata', async () => {
      const source = JSON.stringify({
        version: '1.2',
        log: {
          entries: [],
          creator: { name: 'Test Creator', version: '1.0' },
          browser: { name: 'Chrome', version: '100.0' },
          pages: [{ id: 'page1', title: 'Test Page', startedDateTime: '2024-01-01T00:00:00Z' }],
        },
      });

      const api = await harParser.parse(source);

      expect(api.metadata).toBeDefined();
      expect(api.metadata!.HARVersion).toBe('1.2');
      expect(api.metadata!.creator).toEqual({ name: 'Test Creator', version: '1.0' });
      expect(api.metadata!.browser).toEqual({ name: 'Chrome', version: '100.0' });
    });

    test('[主体] uses page id as source url', async () => {
      const source = JSON.stringify({
        log: {
          entries: [],
          pages: [{ id: 'page-123', title: 'API Test' }],
          creator: { name: 'Postman', version: '10.0' },
        },
      });

      const api = await harParser.parse(source);

      expect(api.source.url).toBe('page-123');
    });

    test('[边界] handles empty entries', async () => {
      const source = JSON.stringify({
        log: {
          entries: [],
          creator: { name: 'Chrome', version: '120.0' },
        },
      });

      const api = await harParser.parse(source);

      expect(api.endpoints).toHaveLength(0);
      expect(api.baseUrl).toBe('');
    });

    test('[边界] handles static assets', async () => {
      const source = JSON.stringify({
        log: {
          entries: [
            { request: { method: 'GET', url: 'https://api.example.com/script.js', headers: [], queryString: [] }, response: { status: 200, statusText: 'OK', headers: [], content: { mimeType: 'application/javascript', text: '', size: 0 } }, time: 50 },
            { request: { method: 'GET', url: 'https://api.example.com/style.css', headers: [], queryString: [] }, response: { status: 200, statusText: 'OK', headers: [], content: { mimeType: 'text/css', text: '', size: 0 } }, time: 50 },
            { request: { method: 'GET', url: 'https://api.example.com/image.png', headers: [], queryString: [] }, response: { status: 200, statusText: 'OK', headers: [], content: { mimeType: 'image/png', text: '', size: 0 } }, time: 50 },
          ],
          creator: { name: 'Chrome', version: '120.0' },
        },
      });

      const api = await harParser.parse(source);

      expect(api.endpoints).toHaveLength(0);
    });

    test('[边界] handles invalid JSON in response body', async () => {
      const source = JSON.stringify({
        log: {
          entries: [
            {
              request: {
                method: 'GET',
                url: 'https://api.example.com/users',
                headers: [],
                queryString: [],
              },
              response: {
                status: 200,
                statusText: 'OK',
                headers: [{ name: 'Content-Type', value: 'application/json' }],
                content: { mimeType: 'application/json', text: 'not valid json {', size: 15 },
              },
              time: 100,
            },
          ],
          creator: { name: 'Chrome', version: '120.0' },
        },
      });

      const api = await harParser.parse(source);

      expect(api.endpoints[0].responses!['200'].schema).toEqual({ type: 'string' });
    });

    test('[主体] extracts summary from URL', async () => {
      const source = JSON.stringify({
        log: {
          entries: [
            {
              request: {
                method: 'GET',
                url: 'https://api.example.com/api/v2/getUsersById',
                headers: [],
                queryString: [],
              },
              response: { status: 200, statusText: 'OK', headers: [], content: { mimeType: 'application/json', text: '[]', size: 2 } },
              time: 100,
            },
          ],
          creator: { name: 'Chrome', version: '120.0' },
        },
      });

      const api = await harParser.parse(source);

      expect(api.endpoints[0].summary).toBe('get users by id');
    });

    test('[主体] handles various status codes', async () => {
      const source = JSON.stringify({
        log: {
          entries: [
            {
              request: { method: 'GET', url: 'https://api.example.com/created', headers: [], queryString: [] },
              response: { status: 201, statusText: 'Created', headers: [], content: { mimeType: 'application/json', text: '{}', size: 2 } },
              time: 50,
            },
            {
              request: { method: 'GET', url: 'https://api.example.com/nocontent', headers: [], queryString: [] },
              response: { status: 204, statusText: 'No Content', headers: [], content: { mimeType: 'application/json', text: '', size: 0 } },
              time: 50,
            },
            {
              request: { method: 'GET', url: 'https://api.example.com/badrequest', headers: [], queryString: [] },
              response: { status: 400, statusText: 'Bad Request', headers: [], content: { mimeType: 'application/json', text: '{}', size: 2 } },
              time: 50,
            },
            {
              request: { method: 'GET', url: 'https://api.example.com/unauthorized', headers: [], queryString: [] },
              response: { status: 401, statusText: 'Unauthorized', headers: [], content: { mimeType: 'application/json', text: '{}', size: 2 } },
              time: 50,
            },
            {
              request: { method: 'GET', url: 'https://api.example.com/notfound', headers: [], queryString: [] },
              response: { status: 404, statusText: 'Not Found', headers: [], content: { mimeType: 'application/json', text: '{}', size: 2 } },
              time: 50,
            },
            {
              request: { method: 'GET', url: 'https://api.example.com/servererror', headers: [], queryString: [] },
              response: { status: 500, statusText: 'Internal Server Error', headers: [], content: { mimeType: 'application/json', text: '{}', size: 2 } },
              time: 50,
            },
          ],
          creator: { name: 'Chrome', version: '120.0' },
        },
      });

      const api = await harParser.parse(source);

      expect(api.endpoints).toHaveLength(6);
      expect(api.endpoints.find(e => e.responses['201'])).toBeDefined();
      expect(api.endpoints.find(e => e.responses['204'])).toBeDefined();
      expect(api.endpoints.find(e => e.responses['400'])).toBeDefined();
      expect(api.endpoints.find(e => e.responses['401'])).toBeDefined();
      expect(api.endpoints.find(e => e.responses['404'])).toBeDefined();
      expect(api.endpoints.find(e => e.responses['500'])).toBeDefined();
    });

    test('[边界] throws on invalid HAR JSON', async () => {
      await expect(harParser.parse('not valid json')).rejects.toThrow('Failed to parse HAR file');
    });
  });

  describe('harToHistory', () => {
    test('[主体] converts HAR entries to history', async () => {
      const har = {
        log: {
          entries: [
            {
              startedDateTime: '2024-01-01T00:00:00Z',
              request: {
                method: 'POST',
                url: 'https://api.example.com/users',
                headers: [
                  { name: 'Content-Type', value: 'application/json' },
                  { name: 'Authorization', value: 'Bearer token' },
                ],
                queryString: [{ name: 'verbose', value: 'true' }],
                postData: { mimeType: 'application/json', text: '{"name":"John"}' },
              },
              response: {
                status: 201,
                statusText: 'Created',
                headers: [{ name: 'Content-Type', value: 'application/json' }],
                content: { text: '{"id":1}', size: 10 },
              },
              time: 150,
            },
          ],
        },
      };

      const history = harToHistory(har);

      expect(history).toHaveLength(1);
      expect(history[0].method).toBe('POST');
      expect(history[0].url).toBe('https://api.example.com/users');
      expect(history[0].request.body).toBe('{"name":"John"}');
      expect(history[0].response?.status).toBe(201);
    });

    test('[主体] handles limit parameter', async () => {
      const har = {
        log: {
          entries: [
            { request: { method: 'GET', url: 'https://api.example.com/1', headers: [], queryString: [] }, response: { status: 200, statusText: 'OK', headers: [], content: { text: '' } }, time: 50 },
            { request: { method: 'GET', url: 'https://api.example.com/2', headers: [], queryString: [] }, response: { status: 200, statusText: 'OK', headers: [], content: { text: '' } }, time: 50 },
            { request: { method: 'GET', url: 'https://api.example.com/3', headers: [], queryString: [] }, response: { status: 200, statusText: 'OK', headers: [], content: { text: '' } }, time: 50 },
          ],
        },
      };

      const history = harToHistory(har, 2);

      expect(history).toHaveLength(2);
    });

    test('[主体] handles missing response', async () => {
      const har = {
        log: {
          entries: [
            {
              startedDateTime: '2024-01-01T00:00:00Z',
              request: { method: 'GET', url: 'https://api.example.com/users', headers: [], queryString: [] },
              response: null,
            },
          ],
        },
      };

      const history = harToHistory(har);

      expect(history[0].response).toBeUndefined();
    });

    test('[主体] handles empty entries', async () => {
      const har = { log: { entries: [] } };

      const history = harToHistory(har);

      expect(history).toHaveLength(0);
    });
  });
});