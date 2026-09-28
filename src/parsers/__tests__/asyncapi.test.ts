import { describe, test, expect } from 'vitest';
import { asyncApiParser } from '../../parsers/asyncapi.js';

describe('parsers - AsyncAPI', () => {
  describe('detect', () => {
    test('[主体] detects AsyncAPI 2.0 JSON', () => {
      const source = JSON.stringify({
        asyncapi: '2.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        channels: {},
      });
      expect(asyncApiParser.detect(source)).toBe(true);
    });

    test('[主体] detects AsyncAPI 2.1 JSON', () => {
      const source = JSON.stringify({
        asyncapi: '2.1.0',
        info: { title: 'Test API', version: '1.0.0' },
        channels: {},
      });
      expect(asyncApiParser.detect(source)).toBe(true);
    });

    test('[主体] detects AsyncAPI 2.0 YAML', () => {
      const source = `
asyncapi: 2.0.0
info:
  title: Test API
  version: 1.0.0
channels: {}
`;
      expect(asyncApiParser.detect(source)).toBe(true);
    });

    test('[边界] rejects OpenAPI', () => {
      const source = JSON.stringify({
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {},
      });
      expect(asyncApiParser.detect(source)).toBe(false);
    });

    test('[边界] rejects non-asyncapi', () => {
      const source = JSON.stringify({
        swagger: '2.0',
        info: { title: 'Test API', version: '1.0.0' },
      });
      expect(asyncApiParser.detect(source)).toBe(false);
    });
  });

  describe('parse', () => {
    test('[主体] parses minimal AsyncAPI with subscribe', async () => {
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
      expect(api.endpoints).toHaveLength(1);
      expect(api.endpoints[0].method).toBe('SUBSCRIBE');
    });

    test('[主体] parses publish operation', async () => {
      const source = JSON.stringify({
        asyncapi: '2.0.0',
        info: { title: 'Messaging API', version: '1.0.0' },
        channels: {
          'message/send': {
            publish: {
              operationId: 'sendMessage',
              summary: 'Send a message',
              message: {
                payload: { type: 'object', properties: { content: { type: 'string' } } },
              },
            },
          },
        },
      });

      const api = await asyncApiParser.parse(source);

      expect(api.endpoints).toHaveLength(1);
      expect(api.endpoints[0].method).toBe('PUBLISH');
      expect(api.endpoints[0].operationId).toBe('sendMessage');
      expect(api.endpoints[0].summary).toBe('Send a message');
    });

    test('[主体] parses both subscribe and publish', async () => {
      const source = JSON.stringify({
        asyncapi: '2.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        channels: {
          'user/events': {
            subscribe: {
              message: { payload: { type: 'object' } },
            },
            publish: {
              message: { payload: { type: 'object' } },
            },
          },
        },
      });

      const api = await asyncApiParser.parse(source);

      expect(api.endpoints).toHaveLength(2);
      const methods = api.endpoints.map(e => e.method);
      expect(methods).toContain('SUBSCRIBE');
      expect(methods).toContain('PUBLISH');
    });

    test('[主体] parses channel parameters', async () => {
      const source = JSON.stringify({
        asyncapi: '2.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        channels: {
          'users/{userId}/events': {
            parameters: {
              userId: { description: 'User ID', schema: { type: 'string' } },
            },
            subscribe: {
              message: { payload: { type: 'object' } },
            },
          },
        },
      });

      const api = await asyncApiParser.parse(source);

      expect(api.endpoints[0].parameters).toHaveLength(1);
      expect(api.endpoints[0].parameters![0].name).toBe('userId');
    });

    test('[主体] parses servers array', async () => {
      const source = JSON.stringify({
        asyncapi: '2.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        servers: {
          production: {
            url: 'mqtt://api.example.com:1883',
            description: 'Production server',
          },
        },
        channels: {},
      });

      const api = await asyncApiParser.parse(source);

      expect(api.servers).toHaveLength(1);
      expect(api.servers![0].url).toBe('mqtt://api.example.com:1883');
      expect(api.baseUrl).toBe('mqtt://api.example.com:1883');
    });

    test('[主体] parses tags', async () => {
      const source = JSON.stringify({
        asyncapi: '2.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        tags: [{ name: 'messaging' }, { name: 'users' }],
        channels: {
          'test': {
            subscribe: { message: { payload: {} } },
          },
        },
      });

      const api = await asyncApiParser.parse(source);

      expect(api.tags).toContain('messaging');
      expect(api.tags).toContain('users');
    });

    test('[主体] parses message with headers', async () => {
      const source = JSON.stringify({
        asyncapi: '2.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        channels: {
          'event': {
            subscribe: {
              message: {
                headers: { type: 'object', properties: { correlationId: { type: 'string' } } },
                payload: { type: 'object' },
              },
            },
          },
        },
      });

      const api = await asyncApiParser.parse(source);

      expect(api.endpoints[0].responses).toBeDefined();
      expect(api.endpoints[0].responses!['200']).toBeDefined();
    });

    test('[主体] parses operation with description', async () => {
      const source = JSON.stringify({
        asyncapi: '2.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        channels: {
          'event': {
            subscribe: {
              summary: 'Subscribe to events',
              description: 'Longer description of the subscription',
              message: { payload: { type: 'object' } },
            },
          },
        },
      });

      const api = await asyncApiParser.parse(source);

      expect(api.endpoints[0].summary).toBe('Subscribe to events');
      expect(api.endpoints[0].description).toBe('Longer description of the subscription');
    });

    test('[主体] parses operation tags', async () => {
      const source = JSON.stringify({
        asyncapi: '2.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        channels: {
          'event': {
            subscribe: {
              tags: [{ name: 'events' }, { name: 'realtime' }],
              message: { payload: { type: 'object' } },
            },
          },
        },
      });

      const api = await asyncApiParser.parse(source);

      expect(api.endpoints[0].tags).toBeDefined();
      expect(api.endpoints[0].tags![0].name).toBe('events');
    });

    test('[边界] empty channels returns empty endpoints', async () => {
      const source = JSON.stringify({
        asyncapi: '2.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        channels: {},
      });

      const api = await asyncApiParser.parse(source);

      expect(api.endpoints).toHaveLength(0);
    });

    test('[边界] uses default baseUrl when no servers', async () => {
      const source = JSON.stringify({
        asyncapi: '2.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        channels: {
          'test': {
            subscribe: { message: { payload: {} } },
          },
        },
      });

      const api = await asyncApiParser.parse(source);

      expect(api.baseUrl).toBe('');
    });

    test('[边界] handles channel without operation', async () => {
      const source = JSON.stringify({
        asyncapi: '2.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        channels: {
          'test': {
            // No subscribe or publish
          },
        },
      });

      const api = await asyncApiParser.parse(source);

      expect(api.endpoints).toHaveLength(0);
    });
  });
});