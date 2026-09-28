import { describe, test, expect, beforeEach } from 'vitest';
import { openApi2Parser } from '../openapi-2.js';
import { harParser } from '../har.js';

describe('Parsers', () => {
  describe('openApi2Parser', () => {
    test('detects OpenAPI 2.0 JSON', () => {
      const json = JSON.stringify({
        swagger: '2.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {},
      });
      expect(openApi2Parser.detect(json)).toBe(true);
    });

    test('detects OpenAPI 2.0 YAML', () => {
      const yaml = `swagger: "2.0"
info:
  title: Test API
  version: "1.0.0"
paths: {}`;
      expect(openApi2Parser.detect(yaml)).toBe(true);
    });

    test('rejects OpenAPI 3.x', () => {
      const json = JSON.stringify({
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {},
      });
      expect(openApi2Parser.detect(json)).toBe(false);
    });

    test('parses basic API', async () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'Pet Store', version: '1.0.0' },
        host: 'petstore.swagger.io',
        basePath: '/v2',
        paths: {
          '/pets': {
            get: {
              summary: 'List all pets',
              responses: { 200: { description: 'Success' } },
            },
          },
        },
      };

      const api = await openApi2Parser.parse(JSON.stringify(spec));

      expect(api.name).toBe('Pet Store');
      expect(api.version).toBe('1.0.0');
      expect(api.baseUrl).toContain('petstore.swagger.io');
      expect(api.endpoints).toHaveLength(1);
      expect(api.endpoints[0].path).toBe('/pets');
      expect(api.endpoints[0].method).toBe('GET');
    });

    test('parses endpoints with parameters', async () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'Test', version: '1.0.0' },
        host: 'api.example.com',
        paths: {
          '/pets/{id}': {
            get: {
              summary: 'Get pet by ID',
              parameters: [
                { name: 'id', in: 'path', required: true, type: 'string' },
              ],
              responses: { 200: { description: 'Success' } },
            },
          },
        },
      };

      const api = await openApi2Parser.parse(JSON.stringify(spec));

      expect(api.endpoints[0].parameters).toHaveLength(1);
      expect(api.endpoints[0].parameters![0].name).toBe('id');
      expect(api.endpoints[0].parameters![0].location).toBe('path');
    });
  });

  describe('harParser', () => {
    test('detects HAR format', () => {
      const har = {
        log: {
          entries: [
            {
              startedDateTime: '2024-01-01T00:00:00Z',
              request: { method: 'GET', url: 'https://api.example.com/users', headers: [] },
              response: { status: 200, statusText: 'OK', headers: [], content: { mimeType: 'application/json', text: '{}' } },
              time: 100,
            },
          ],
          creator: { name: 'Test', version: '1.0' },
        },
      };

      expect(harParser.detect(JSON.stringify(har))).toBe(true);
    });

    test('rejects invalid format', () => {
      expect(harParser.detect('{}')).toBe(false);
      expect(harParser.detect('not har')).toBe(false);
    });

    test('parses basic HAR', async () => {
      const har = {
        log: {
          entries: [
            {
              startedDateTime: '2024-01-01T00:00:00Z',
              request: {
                method: 'GET',
                url: 'https://api.example.com/users',
                headers: [{ name: 'Content-Type', value: 'application/json' }],
                queryString: [],
              },
              response: {
                status: 200,
                statusText: 'OK',
                headers: [{ name: 'Content-Type', value: 'application/json' }],
                content: { mimeType: 'application/json', text: '[{"id":1}]', size: 12 },
              },
              time: 150,
            },
          ],
          creator: { name: 'Chrome', version: '120.0' },
        },
      };

      const api = await harParser.parse(JSON.stringify(har));

      expect(api.name).toBe('Chrome');
      expect(api.endpoints).toHaveLength(1);
      expect(api.endpoints[0].path).toBe('/users');
      expect(api.endpoints[0].method).toBe('GET');
    });

    test('skips non-API URLs', async () => {
      const har = {
        log: {
          entries: [
            {
              startedDateTime: '2024-01-01T00:00:00Z',
              request: { method: 'GET', url: 'https://api.example.com/main.js', headers: [] },
              response: { status: 200, statusText: 'OK', headers: [], content: { mimeType: 'application/javascript', text: 'console.log()', size: 15 }, time: 50 },
            },
            {
              startedDateTime: '2024-01-01T00:00:01Z',
              request: { method: 'GET', url: 'https://api.example.com/api/users', headers: [] },
              response: { status: 200, statusText: 'OK', headers: [], content: { mimeType: 'application/json', text: '{}', size: 2 }, time: 100 },
            },
          ],
          creator: { name: 'Chrome', version: '120.0' },
        },
      };

      const api = await harParser.parse(JSON.stringify(har));

      // Should only have 1 endpoint (the /api/users one)
      expect(api.endpoints).toHaveLength(1);
      expect(api.endpoints[0].path).toBe('/api/users');
    });
  });
});