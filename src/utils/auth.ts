/**
 * Auth Helper Library
 * 通用鉴权辅助函数，支持 header、cookie、query、path 多种位置
 * 支持 OAuth1、OAuth2、Bearer、Basic、APIKey 等认证类型
 */

import { createHmac, randomBytes } from 'crypto';

export type AuthLocation = 'header' | 'cookie' | 'query' | 'path';
export type AuthType = 'oauth1' | 'oauth2' | 'bearer' | 'basic' | 'apikey';

export interface AuthItem {
  type?: AuthType;
  location?: AuthLocation;
  key: string;
  value: string;
}

export type AuthConfig = AuthItem | AuthItem[];

/**
 * OAuth1 Helper - HMAC-SHA1 signature generation
 */
export class OAuth1Helper {
  private consumerKey: string;
  private consumerSecret: string;
  private accessToken?: string;
  private tokenSecret?: string;

  constructor(config: {
    consumerKey: string;
    consumerSecret: string;
    accessToken?: string;
    tokenSecret?: string;
  }) {
    this.consumerKey = config.consumerKey;
    this.consumerSecret = config.consumerSecret;
    this.accessToken = config.accessToken;
    this.tokenSecret = config.tokenSecret;
  }

  /**
   * Generate OAuth1 authorization header
   */
  generateAuthHeader(method: string, url: string, additionalParams?: Record<string, string>): string {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = randomBytes(16).toString('hex');

    const params: Record<string, string> = {
      oauth_consumer_key: this.consumerKey,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: timestamp,
      oauth_nonce: nonce,
      oauth_version: '1.0',
      ...additionalParams,
    };

    if (this.accessToken) {
      params.oauth_token = this.accessToken;
    }

    // Sort parameters
    const sortedParams = Object.keys(params)
      .sort()
      .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
      .join('&');

    // Create signature base string
    const signatureBase = [
      method.toUpperCase(),
      encodeURIComponent(url),
      encodeURIComponent(sortedParams),
    ].join('&');

    // Generate signature
    const signingKey = `${encodeURIComponent(this.consumerSecret)}&${encodeURIComponent(this.tokenSecret || '')}`;
    const signature = createHmac('sha1', signingKey)
      .update(signatureBase)
      .digest('base64');

    params.oauth_signature = signature;

    // Build authorization header
    const authHeader = 'OAuth ' + Object.keys(params)
      .sort()
      .map(k => `${encodeURIComponent(k)}="${encodeURIComponent(params[k])}"`)
      .join(', ');

    return authHeader;
  }
}

/**
 * OAuth2 Helper - Token management
 */
export class OAuth2Helper {
  private clientId: string;
  private clientSecret: string;
  private authUrl: string;
  private tokenUrl: string;
  private redirectUri: string;

  constructor(config: {
    clientId: string;
    clientSecret: string;
    authUrl: string;
    tokenUrl: string;
    redirectUri: string;
  }) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.authUrl = config.authUrl;
    this.tokenUrl = config.tokenUrl;
    this.redirectUri = config.redirectUri;
  }

  /**
   * Get authorization URL (Authorization Code flow)
   */
  getAuthorizationUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'read write',
    });
    if (state) {
      params.append('state', state);
    }
    return `${this.authUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<{ accessToken: string; refreshToken?: string; expiresIn?: number }> {
    const response = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: this.redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error(`OAuth2 token exchange failed: ${response.status}`);
    }

    const data = await response.json() as any;
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    };
  }

  /**
   * Get access token using Client Credentials flow
   */
  async getClientCredentialsToken(scope?: string): Promise<string> {
    const response = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        ...(scope ? { scope } : {}),
      }),
    });

    if (!response.ok) {
      throw new Error(`OAuth2 client credentials failed: ${response.status}`);
    }

    const data = await response.json() as any;
    return data.access_token;
  }
}

/**
 * Build authorization header value for Basic auth
 */
export function buildBasicAuthHeader(username: string, password: string): string {
  const credentials = Buffer.from(`${username}:${password}`).toString('base64');
  return `Basic ${credentials}`;
}

/**
 * Build authorization header value for Bearer token
 */
export function buildBearerAuthHeader(token: string): string {
  return `Bearer ${token}`;
}

/**
 * Parse API Key authentication from config
 */
export function parseApiKeyAuth(authItem: AuthItem): { key: string; value: string; location: AuthLocation } {
  const key = authItem.key || 'X-API-Key';
  const value = authItem.value;
  const location = authItem.location || 'header';

  return { key, value, location };
}

/**
 * 构建鉴权请求头
 */
export function buildAuthHeaders(auth?: AuthConfig): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (!auth) {
    return headers;
  }

  const authItems = Array.isArray(auth) ? auth : [auth];

  for (const authItem of authItems) {
    if (!authItem.key || !authItem.value) continue;

    const type = authItem.type;
    const location = authItem.location || 'header';

    // Handle different auth types
    if (type === 'bearer') {
      headers['Authorization'] = buildBearerAuthHeader(authItem.value);
    } else if (type === 'basic') {
      // For basic auth, value should be in format "username:password"
      const [username, password] = authItem.value.split(':');
      if (username && password) {
        headers['Authorization'] = buildBasicAuthHeader(username, password);
      } else {
        // Treat value as already base64 encoded credentials
        headers['Authorization'] = `Basic ${authItem.value}`;
      }
    } else if (type === 'apikey') {
      // API Key in header
      if (location === 'header') {
        headers[authItem.key] = authItem.value;
      } else {
        // Other locations handled in buildAuthUrl
      }
    } else {
      // Default behavior for OAuth or unspecified
      switch (location) {
        case 'header':
          headers[authItem.key] = authItem.value;
          break;
        case 'cookie':
          if (headers['Cookie']) {
            headers['Cookie'] += `; ${authItem.key}=${authItem.value}`;
          } else {
            headers['Cookie'] = `${authItem.key}=${authItem.value}`;
          }
          break;
        case 'query':
          // query 参数在 URL 中处理
          break;
        case 'path':
          // path 参数在 URL 构建时处理
          break;
      }
    }
  }

  return headers;
}

/**
 * 构建带鉴权参数的 URL
 */
export function buildAuthUrl(url: string, auth?: AuthConfig): string {
  if (!auth) {
    return url;
  }

  const authItems = Array.isArray(auth) ? auth : [auth];
  const urlObj = new URL(url);
  const queryParams = new URLSearchParams();

  for (const authItem of authItems) {
    if (!authItem.key || !authItem.value) continue;

    const type = authItem.type;
    const location = authItem.location || 'header';

    // Handle API Key in query or path
    if (type === 'apikey') {
      if (location === 'query') {
        queryParams.append(authItem.key, authItem.value);
      } else if (location === 'path') {
        // 替换 URL 中的 {key} 占位符
        url = url.replace(`{${authItem.key}}`, authItem.value);
      }
    } else if (location === 'query' && type !== 'bearer' && type !== 'basic') {
      // OAuth1/OAuth2 parameters go to query for signature calculation
      queryParams.append(authItem.key, authItem.value);
    }

    // Handle cookie in headers (done in buildAuthHeaders)
    // For path replacement, we already did it above
  }

  // 添加 query 参数
  const queryString = queryParams.toString();
  if (queryString) {
    urlObj.search = urlObj.search
      ? `${urlObj.search}&${queryString}`
      : `?${queryString}`;
    url = urlObj.toString();
  }

  return url;
}

/**
 * Create OAuth1 helper from config
 */
export function createOAuth1(config: {
  consumerKey: string;
  consumerSecret: string;
  accessToken?: string;
  tokenSecret?: string;
}): OAuth1Helper {
  return new OAuth1Helper(config);
}

/**
 * Create OAuth2 helper from config
 */
export function createOAuth2(config: {
  clientId: string;
  clientSecret: string;
  authUrl: string;
  tokenUrl: string;
  redirectUri: string;
}): OAuth2Helper {
  return new OAuth2Helper(config);
}