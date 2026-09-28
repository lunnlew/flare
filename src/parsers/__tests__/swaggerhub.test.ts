import { describe, test, expect, vi, beforeEach } from 'vitest';
import { swaggerHubParser } from '../../parsers/swaggerhub.js';

describe('parsers - SwaggerHub', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('detect', () => {
    test('[主体] 检测有效的 SwaggerHub 配置', () => {
      const source = JSON.stringify({
        urls: [
          { url: '/apis/test', serviceName: 'Test API' },
        ],
        configUrl: 'https://api.swaggerhub.com/config',
      });

           expect(swaggerHubParser.detect(source)).toBeTruthy();
    });

    test('[边界] 拒绝空 urls', () => {
      const source = JSON.stringify({
        urls: [],
        configUrl: 'https://api.swaggerhub.com/config',
      });

      expect(swaggerHubParser.detect(source)).toBeFalsy();
    });

    test('[边界] 拒绝缺少 configUrl', () => {
      const source = JSON.stringify({
        urls: [{ url: '/apis/test', serviceName: 'Test API' }],
      });

      expect(swaggerHubParser.detect(source)).toBeFalsy();
    });

    test('[边界] 拒绝无效 JSON', () => {
      expect(swaggerHubParser.detect('not json')).toBe(false);
    });
  });

  describe('parse', () => {
    test('[主体] 解析 OpenAPI 3.0 文档', async () => {
      const openApiDoc = JSON.stringify({
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            get: { summary: 'Get users' },
          },
        },
      });

      const config = JSON.stringify({
        urls: [{ url: '/apis/test', serviceName: 'Test API' }],
        configUrl: 'https://api.swaggerhub.com/config',
      });

      const mockResponse = {
        ok: true,
        status: 200,
        text: () => Promise.resolve(openApiDoc),
      };

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

      const api = await swaggerHubParser.parse(config, {
        sourceUrl: 'https://api.swaggerhub.com',
      });

      expect(api.name).toBe('Test API');
      expect(api.endpoints).toHaveLength(1);
      expect(api.source.type).toBe('swaggerhub');
    });

    test('[主体] 解析 Swagger 2.0 文档', async () => {
      const swaggerDoc = JSON.stringify({
        swagger: '2.0',
        info: { title: 'Test API', version: '1.0.0' },
        basePath: '/api',
        host: 'api.example.com',
        paths: {
          '/users': {
            get: { summary: 'Get users' },
          },
        },
      });

      const config = JSON.stringify({
        urls: [{ url: '/apis/test', serviceName: 'Test API' }],
        configUrl: 'https://api.swaggerhub.com/config',
      });

      const mockResponse = {
        ok: true,
        status: 200,
        text: () => Promise.resolve(swaggerDoc),
      };

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

      const api = await swaggerHubParser.parse(config, {
        sourceUrl: 'https://api.swaggerhub.com',
      });

      expect(api.name).toBe('Test API');
      expect(api.endpoints).toHaveLength(1);
    });

    test('[边界] 空 urls数组抛出错误', async () => {
      const config = JSON.stringify({
        urls: [],
        configUrl: 'https://api.swaggerhub.com/config',
      });

      await expect(swaggerHubParser.parse(config)).rejects.toThrow('No APIs found');
    });

    test('[边界] fetch 失败时抛出错误', async () => {
      const config = JSON.stringify({
        urls: [{ url: '/apis/test', serviceName: 'Test API' }],
        configUrl: 'https://api.swaggerhub.com/config',
      });

      const mockResponse = {
        ok: false,
        status: 404,
      };

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

      await expect(swaggerHubParser.parse(config)).rejects.toThrow('Failed to fetch');
    });

    test('[主体] 使用 serviceName 作为 API 名称', async () => {
      const openApiDoc = JSON.stringify({
        openapi: '3.0.0',
        info: { title: 'Wrong Title', version: '1.0.0' },
        paths: {},
      });

      const config = JSON.stringify({
        urls: [{ url: '/apis/test', serviceName: 'My Custom API' }],
        configUrl: 'https://api.swaggerhub.com/config',
      });

      const mockResponse = {
        ok: true,
        status: 200,
        text: () => Promise.resolve(openApiDoc),
      };

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

      const api = await swaggerHubParser.parse(config);

      expect(api.name).toBe('My Custom API');
    });
  });

  describe('parseAll', () => {
    test('[主体] 解析多个 API', async () => {
      const openApiDoc = JSON.stringify({
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {},
      });

      const config = JSON.stringify({
        urls: [
          { url: '/apis/api1', serviceName: 'API 1' },
          { url: '/apis/api2', serviceName: 'API 2' },
        ],
        configUrl: 'https://api.swaggerhub.com/config',
      });

      const mockResponse = {
        ok: true,
        status: 200,
        text: () => Promise.resolve(openApiDoc),
      };

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

      const apis = await swaggerHubParser.parseAll(config, {
        sourceUrl: 'https://api.swaggerhub.com',
      });

      expect(apis).toHaveLength(2);
      expect(apis[0].name).toBe('API 1');
      expect(apis[1].name).toBe('API 2');
    });

    test('[主体] 跳过失败的 API', async () => {
      const openApiDoc = JSON.stringify({
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {},
      });

      const config = JSON.stringify({
        urls: [
          { url: '/apis/api1', serviceName: 'API 1' },
          { url: '/apis/api2', serviceName: 'API 2' },
        ],
        configUrl: 'https://api.swaggerhub.com/config',
      });

      let callCount = 0;
      vi.stubGlobal('fetch', vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          return Promise.resolve({ ok: false, status: 500 });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve(openApiDoc),
        });
      }));

      const apis = await swaggerHubParser.parseAll(config);

      expect(apis).toHaveLength(1);
      expect(apis[0].name).toBe('API 1');
    });

    test('[主体] YAML 格式的文档', async () => {
      const yamlDoc = `
openapi: 3.0.0
info:
  title: YAML API
  version: 1.0.0
paths: {}
`;

      const config = JSON.stringify({
        urls: [{ url: '/apis/yaml-api', serviceName: 'YAML API' }],
        configUrl: 'https://api.swaggerhub.com/config',
      });

      const mockResponse = {
        ok: true,
        status: 200,
        text: () => Promise.resolve(yamlDoc),
      };

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

      const api = await swaggerHubParser.parse(config);

      expect(api.name).toBe('YAML API');
    });

    test('[边界] 不支持的文档格式抛出错误', async () => {
      const config = JSON.stringify({
        urls: [{ url: '/apis/test', serviceName: 'Test API' }],
        configUrl: 'https://api.swaggerhub.com/config',
      });

      const mockResponse = {
        ok: true,
        status: 200,
        text: () => Promise.resolve('not a valid format'),
      };

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

      await expect(swaggerHubParser.parse(config)).rejects.toThrow('Unsupported API doc format');
    });
  });
});