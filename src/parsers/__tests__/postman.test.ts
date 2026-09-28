import { describe, test, expect } from 'vitest';
import { postmanParser } from '../../parsers/postman.js';

describe('parsers - Postman', () => {
  describe('detect', () => {
    test('[主体] 检测 Postman v2.1', () => {
      const source = JSON.stringify({
        info: {
          name: 'Test Collection',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0',
        },
        item: [],
      });
      expect(postmanParser.detect(source)).toBe(true);
    });

    test('[主体] 检测 Postman v2.0', () => {
      const source = JSON.stringify({
        info: {
          name: 'Test',
          schema: 'https://schema.getpostman.com/json/collection/v2.0.0',
        },
        item: [],
      });
      expect(postmanParser.detect(source)).toBe(true);
    });

    test('[边界] 拒绝 OpenAPI', () => {
      const source = JSON.stringify({
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {},
      });
      expect(postmanParser.detect(source)).toBe(false);
    });

    test('[边界] 拒绝无效 JSON', () => {
      expect(postmanParser.detect('not json')).toBe(false);
    });
  });

  describe('parse', () => {
    test('[主体] 解析简单的请求', async () => {
      const source = JSON.stringify({
        info: { name: 'Test API' },
        item: [
          {
            name: 'Get Users',
            request: { method: 'GET', url: 'https://api.example.com/users' },
          },
        ],
      });

      const api = await postmanParser.parse(source);

      expect(api.name).toBe('Test API');
      expect(api.endpoints).toHaveLength(1);
      expect(api.endpoints[0].method).toBe('GET');
    });

    test('[主体] 解析嵌套文件夹结构', async () => {
      const source = JSON.stringify({
        info: { name: 'Test API' },
        item: [
          {
            name: 'Users',
            item: [
              {
                name: 'Get Users',
                request: { method: 'GET', url: 'https://api.example.com/users' },
              },
              {
                name: 'Create User',
                request: { method: 'POST', url: 'https://api.example.com/users' },
              },
            ],
          },
        ],
      });

      const api = await postmanParser.parse(source);

      expect(api.endpoints).toHaveLength(2);
    });

    test('[主体] 解析带 header 的请求', async () => {
      const source = JSON.stringify({
        info: { name: 'Test API' },
        item: [
          {
            name: 'Get Users',
            request: {
              method: 'GET',
              url: 'https://api.example.com/users',
              header: [
                { key: 'Authorization', value: 'Bearer token' },
              ],
            },
          },
        ],
      });

      const api = await postmanParser.parse(source);

      expect(api.endpoints[0].parameters).toHaveLength(1);
      expect(api.endpoints[0].parameters![0].name).toBe('Authorization');
    });

    test('[主体] 解析带 body 的请求 - raw JSON', async () => {
      const source = JSON.stringify({
        info: { name: 'Test API' },
        item: [
          {
            name: 'Create User',
            request: {
              method: 'POST',
              url: 'https://api.example.com/users',
              body: {
                mode: 'raw',
                options: { raw: { language: 'json' } },
                raw: '{"name":"John"}',
              },
            },
          },
        ],
      });

      const api = await postmanParser.parse(source);

      expect(api.endpoints[0].requestBody).toBeDefined();
      expect(api.endpoints[0].requestBody!.contentType).toBe('application/json');
    });

    test('[主体] 解析带 body 的请求 - urlencoded', async () => {
      const source = JSON.stringify({
        info: { name: 'Test API' },
        item: [
          {
            name: 'Create User',
            request: {
              method: 'POST',
              url: 'https://api.example.com/users',
              body: {
                mode: 'urlencoded',
                urlencoded: [
                  { key: 'name', value: 'John' },
                ],
              },
            },
          },
        ],
      });

      const api = await postmanParser.parse(source);

      expect(api.endpoints[0].requestBody!.contentType).toBe('application/x-www-form-urlencoded');
    });

    test('[主体] 解析带 body 的请求 - formdata', async () => {
      const source = JSON.stringify({
        info: { name: 'Test API' },
        item: [
          {
            name: 'Upload File',
            request: {
              method: 'POST',
              url: 'https://api.example.com/upload',
              body: {
                mode: 'formdata',
                formdata: [
                  { key: 'file', value: 'test.txt' },
                ],
              },
            },
          },
        ],
      });

      const api = await postmanParser.parse(source);

      expect(api.endpoints[0].requestBody!.contentType).toBe('multipart/form-data');
    });

    test('[主体] 解析 URL 对象', async () => {
      const source = JSON.stringify({
        info: { name: 'Test API' },
        item: [
          {
            name: 'Get Users',
            request: {
              method: 'GET',
              url: {
                raw: 'https://api.example.com/users',
                protocol: 'https',
                host: ['api', 'example', 'com'],
              },
            },
          },
        ],
      });

      const api = await postmanParser.parse(source);

      expect(api.baseUrl).toContain('https');
    });

    test('[主体] 解析 Bearer auth', async () => {
      const source = JSON.stringify({
        info: { name: 'Test API' },
        item: [
          {
            name: 'Get Users',
            request: {
              method: 'GET',
              url: 'https://api.example.com/users',
              auth: {
                type: 'bearer',
                bearer: [{ key: 'token', value: 'secret' }],
              },
            },
          },
        ],
      });

      const api = await postmanParser.parse(source);

      expect(api.auth).toBeDefined();
      expect(api.auth!.type).toBe('bearer');
    });

    test('[主体] 解析 Basic auth', async () => {
      const source = JSON.stringify({
        info: { name: 'Test API' },
        item: [
          {
            name: 'Get Users',
            request: {
              method: 'GET',
              url: 'https://api.example.com/users',
              auth: {
                type: 'basic',
                basic: [{ key: 'username', value: 'user' }],
              },
            },
          },
        ],
      });

      const api = await postmanParser.parse(source);

      expect(api.auth!.type).toBe('basic');
    });

    test('[主体] 解析 API Key auth', async () => {
      const source = JSON.stringify({
        info: { name: 'Test API' },
        item: [
          {
            name: 'Get Users',
            request: {
              method: 'GET',
              url: 'https://api.example.com/users',
              auth: {
                type: 'apikey',
                apikey: [{ key: 'X-API-Key', value: 'secret', in: 'header' }],
              },
            },
          },
        ],
      });

      const api = await postmanParser.parse(source);

      expect(api.auth!.type).toBe('apiKey');
    });

    test('[主体] 解析 OAuth2 auth', async () => {
      const source = JSON.stringify({
        info: { name: 'Test API' },
        item: [
          {
            name: 'Get Users',
            request: {
              method: 'GET',
              url: 'https://api.example.com/users',
              auth: {
                type: 'oauth2',
                oauth2: [
                  { key: 'accessTokenUrl', value: 'https://auth.example.com/token' },
                  { key: 'authUrl', value: 'https://auth.example.com/authorize' },
                  { key: 'grantType', value: 'authorizationCode' },
                ],
              },
            },
          },
        ],
      });

      const api = await postmanParser.parse(source);

      expect(api.auth!.type).toBe('oauth2');
    });

    test('[主体] 解析没有请求的项目', async () => {
      const source = JSON.stringify({
        info: { name: 'Test API' },
        item: [
          {
            name: 'Folder',
            item: [],
          },
        ],
      });

      const api = await postmanParser.parse(source);

      expect(api.endpoints).toHaveLength(0);
    });

    test('[主体] 解析带描述的请求', async () => {
      const source = JSON.stringify({
        info: { name: 'Test API' },
        item: [
          {
            name: 'Get Users',
            description: 'Retrieves all users',
            request: { method: 'GET', url: 'https://api.example.com/users' },
          },
        ],
      });

      const api = await postmanParser.parse(source);

      expect(api.endpoints[0].description).toBe('Retrieves all users');
    });
  });
});