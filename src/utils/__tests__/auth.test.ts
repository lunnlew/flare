import { describe, test, expect, vi, beforeEach } from 'vitest';
import {
  OAuth1Helper,
  OAuth2Helper,
  buildBasicAuthHeader,
  buildBearerAuthHeader,
  parseApiKeyAuth,
  buildAuthHeaders,
  buildAuthUrl,
  createOAuth1,
  createOAuth2,
} from '../auth.js';

describe('utils - auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('OAuth1Helper', () => {
    test('[主体] generateAuthHeader 生成有效的 OAuth1 header', () => {
      const helper = new OAuth1Helper({
        consumerKey: 'my-consumer-key',
        consumerSecret: 'my-consumer-secret',
        accessToken: 'my-access-token',
        tokenSecret: 'my-token-secret',
      });

      const header = helper.generateAuthHeader('GET', 'https://api.example.com/endpoint');

      expect(header).toContain('OAuth ');
      expect(header).toContain('oauth_consumer_key');
      expect(header).toContain('oauth_signature');
      expect(header).toContain('oauth_nonce');
    });

    test('[主体] generateAuthHeader with additional params', () => {
      const helper = new OAuth1Helper({
        consumerKey: 'key',
        consumerSecret: 'secret',
      });

      const header = helper.generateAuthHeader('POST', 'https://api.example.com', {
        oauth_callback: 'http://callback.example.com',
      });

      expect(header).toContain('oauth_callback');
    });

    test('[主体] generateAuthHeader without access token', () => {
      const helper = new OAuth1Helper({
        consumerKey: 'key',
        consumerSecret: 'secret',
      });

      const header = helper.generateAuthHeader('GET', 'https://api.example.com');

      expect(header).toContain('oauth_consumer_key');
      expect(header).not.toContain('oauth_token');
    });
  });

  describe('OAuth2Helper', () => {
    test('[主体] getAuthorizationUrl 生成授权 URL', () => {
      const helper = new OAuth2Helper({
        clientId: 'my-client-id',
        clientSecret: 'my-client-secret',
        authUrl: 'https://auth.example.com/oauth',
        tokenUrl: 'https://auth.example.com/token',
        redirectUri: 'http://localhost:3000/callback',
      });

      const url = helper.getAuthorizationUrl();

      expect(url).toContain('client_id=my-client-id');
      expect(url).toContain('redirect_uri=');
      expect(url).toContain('response_type=code');
    });

    test('[主体] getAuthorizationUrl with state', () => {
      const helper = new OAuth2Helper({
        clientId: 'my-client-id',
        clientSecret: 'my-client-secret',
        authUrl: 'https://auth.example.com/oauth',
        tokenUrl: 'https://auth.example.com/token',
        redirectUri: 'http://localhost:3000/callback',
      });

      const url = helper.getAuthorizationUrl('random-state-value');

      expect(url).toContain('state=random-state-value');
    });

    test('[主体] exchangeCodeForToken 调用 token endpoint', async () => {
      const helper = new OAuth2Helper({
        clientId: 'my-client-id',
        clientSecret: 'my-client-secret',
        authUrl: 'https://auth.example.com/oauth',
        tokenUrl: 'https://auth.example.com/token',
        redirectUri: 'http://localhost:3000/callback',
      });

      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          access_token: 'mock-access-token',
          refresh_token: 'mock-refresh-token',
          expires_in: 3600,
        }),
      };

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

      const result = await helper.exchangeCodeForToken('auth-code');

      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBe('mock-refresh-token');
      expect(result.expiresIn).toBe(3600);
    });

    test('[边界] exchangeCodeForToken 失败时抛出错误', async () => {
      const helper = new OAuth2Helper({
        clientId: 'my-client-id',
        clientSecret: 'my-client-secret',
        authUrl: 'https://auth.example.com/oauth',
        tokenUrl: 'https://auth.example.com/token',
        redirectUri: 'http://localhost:3000/callback',
      });

      const mockResponse = {
        ok: false,
        status: 400,
      };

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

      await expect(helper.exchangeCodeForToken('invalid-code')).rejects.toThrow();
    });

    test('[主体] getClientCredentialsToken 获取 token', async () => {
      const helper = new OAuth2Helper({
        clientId: 'my-client-id',
        clientSecret: 'my-client-secret',
        authUrl: 'https://auth.example.com/oauth',
        tokenUrl: 'https://auth.example.com/token',
        redirectUri: 'http://localhost:3000/callback',
      });

      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          access_token: 'client-credentials-token',
        }),
      };

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

      const token = await helper.getClientCredentialsToken('read write');

      expect(token).toBe('client-credentials-token');
    });
  });

  describe('buildBasicAuthHeader', () => {
    test('[主体] 生成 Basic auth header', () => {
      const header = buildBasicAuthHeader('user', 'pass');

      expect(header).toBe('Basic dXNlcjpwYXNz');
    });

    test('[主体] 空密码', () => {
      const header = buildBasicAuthHeader('user', '');

      expect(header).toBe('Basic dXNlcjo=');
    });
  });

  describe('buildBearerAuthHeader', () => {
    test('[主体] 生成 Bearer auth header', () => {
      const header = buildBearerAuthHeader('my-token');

      expect(header).toBe('Bearer my-token');
    });
  });

  describe('parseApiKeyAuth', () => {
    test('[主体] 解析完整的 API Key 配置', () => {
      const result = parseApiKeyAuth({
        type: 'apikey',
        location: 'header',
        key: 'X-API-Key',
        value: 'my-secret-key',
      });

      expect(result.key).toBe('X-API-Key');
      expect(result.value).toBe('my-secret-key');
      expect(result.location).toBe('header');
    });

    test('[主体] 使用默认位置', () => {
      const result = parseApiKeyAuth({
        key: 'api_key',
        value: 'secret',
      });

      expect(result.location).toBe('header');
      expect(result.key).toBe('api_key');
    });

    test('[主体] 默认 key名称', () => {
      const result = parseApiKeyAuth({
        value: 'secret-value',
      });

      expect(result.key).toBe('X-API-Key');
    });
  });

  describe('buildAuthHeaders', () => {
    test('[主体] 无 auth 返回默认 header', () => {
      const headers = buildAuthHeaders();

      expect(headers['Accept']).toBe('application/json');
    });

    test('[主体] Bearer token auth', () => {
      const headers = buildAuthHeaders({
        type: 'bearer',
        key: 'Authorization',
        value: 'my-token',
      });

      expect(headers['Authorization']).toBe('Bearer my-token');
    });

    test('[主体] Basic auth', () => {
      const headers = buildAuthHeaders({
        type: 'basic',
        key: 'Authorization',
        value: 'user:pass',
      });

      expect(headers['Authorization']).toBe('Basic dXNlcjpwYXNz');
    });

    test('[主体] Basic auth 预编码', () => {
      const headers = buildAuthHeaders({
        type: 'basic',
        key: 'Authorization',
        value: 'already-encoded',
      });

      expect(headers['Authorization']).toBe('Basic already-encoded');
    });

    test('[主体] API Key in header', () => {
      const headers = buildAuthHeaders({
        type: 'apikey',
        location: 'header',
        key: 'X-API-Key',
        value: 'secret-key',
      });

      expect(headers['X-API-Key']).toBe('secret-key');
    });

    test('[主体] Cookie auth', () => {
      const headers = buildAuthHeaders({
        type: 'oauth1',
        location: 'cookie',
        key: 'session_id',
        value: 'abc123',
      });

      expect(headers['Cookie']).toBe('session_id=abc123');
    });

    test('[主体] 多个 Cookie合并', () => {
      const headers = buildAuthHeaders([
        { location: 'cookie', key: 'session', value: 's1' },
        { location: 'cookie', key: 'token', value: 't1' },
      ]);

      expect(headers['Cookie']).toContain('session=s1');
      expect(headers['Cookie']).toContain('token=t1');
    });

    test('[主体] 数组形式的多个 auth', () => {
      const headers = buildAuthHeaders([
        { type: 'bearer', key: 'Authorization', value: 'token1' },
        { type: 'apikey', location: 'header', key: 'X-Key', value: 'key1' },
      ]);

      expect(headers['Authorization']).toBe('Bearer token1');
      expect(headers['X-Key']).toBe('key1');
    });

    test('[边界] 跳过无效的 auth 项', () => {
      const headers = buildAuthHeaders({
        key: '',
        value: '',
      });

      expect(Object.keys(headers)).toHaveLength(1); // 只有 Accept
    });
  });

  describe('buildAuthUrl', () => {
    test('[主体] 无 auth 返回原始 URL', () => {
      const url = buildAuthUrl('https://api.example.com/endpoint');

      expect(url).toBe('https://api.example.com/endpoint');
    });

    test('[主体] API Key in query', () => {
      const url = buildAuthUrl('https://api.example.com/endpoint', {
        type: 'apikey',
        location: 'query',
        key: 'api_key',
        value: 'secret',
      });

      expect(url).toContain('api_key=secret');
    });

    test('[主体] API Key in path', () => {
      const url = buildAuthUrl('https://api.example.com/{token}', {
        type: 'apikey',
        location: 'path',
        key: 'token',
        value: 'my-token',
      });

      expect(url).toBe('https://api.example.com/my-token');
    });

    test('[主体] OAuth 参数添加到 query', () => {
      const url = buildAuthUrl('https://api.example.com/endpoint', {
        type: 'oauth1',
        location: 'query',
        key: 'oauth_token',
        value: 'token-value',
      });

      expect(url).toContain('oauth_token=token-value');
    });

    test('[主体] 保留现有 query 参数', () => {
      const url = buildAuthUrl('https://api.example.com/endpoint?existing=param', {
        type: 'apikey',
        location: 'query',
        key: 'api_key',
        value: 'secret',
      });

      expect(url).toContain('existing=param');
      expect(url).toContain('api_key=secret');
    });
  });

  describe('createOAuth1', () => {
    test('[主体] 创建 OAuth1 helper', () => {
      const helper = createOAuth1({
        consumerKey: 'key',
        consumerSecret: 'secret',
      });

      expect(helper).toBeInstanceOf(OAuth1Helper);
    });
  });

  describe('createOAuth2', () => {
    test('[主体] 创建 OAuth2 helper', () => {
      const helper = createOAuth2({
        clientId: 'client',
        clientSecret: 'secret',
        authUrl: 'https://auth.example.com',
        tokenUrl: 'https://auth.example.com/token',
        redirectUri: 'http://localhost/callback',
      });

      expect(helper).toBeInstanceOf(OAuth2Helper);
    });
  });
});