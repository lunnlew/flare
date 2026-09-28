import type { API, EndpointSchema, ParameterSchema, RequestBodySchema, AuthConfig, HttpMethod, ParamLocation } from '../ir/index.js';
import type { Parser } from './index.js';

export const postmanParser: Parser = {
  name: 'postman',

  detect(source: string): boolean {
    try {
      const json = JSON.parse(source);
      return Boolean(json.info && json.info.schema && json.info.schema.includes('getpostman.com') && json.info.schema.includes('collection'));
    } catch {
      return false;
    }
  },

  async parse(source: string): Promise<API> {
    let doc;
    try {
      doc = JSON.parse(source);
    } catch (error) {
      throw new Error(`Failed to parse Postman collection: ${error instanceof Error ? error.message : String(error)}`);
    }
    const info = doc.info || {};

    const endpoints: EndpointSchema[] = [];
    const items = flattenItems(doc.item || []);

    // Extract base URL from first request if available
    let baseUrl = '';

    // Collect API-level auth from first request that has auth
    let apiAuth: AuthConfig | undefined;

    for (const item of items) {
      const request = item.request;
      if (!request) continue;

      let method = (request.method || 'GET').toUpperCase() as HttpMethod;
      let url = request.url;
      if (typeof url === 'object') {
        url = url.raw || '';
        // Try to extract base URL from url object
        if (!baseUrl && request.url?.protocol && request.url?.host) {
          baseUrl = `${request.url.protocol}//${request.url.host}`;
        }
      }

      // Extract auth from first request with auth (API-level)
      if (!apiAuth && request.auth) {
        apiAuth = convertPostmanAuth(request.auth);
      }

      // Convert Postman headers to IR parameters
      const parameters: ParameterSchema[] = [];
      if (request.header && Array.isArray(request.header)) {
        for (const header of request.header) {
          parameters.push({
            name: header.key || header.name || '',
            location: 'header' as ParamLocation,
            required: false,
            description: header.description,
            example: header.value,
          });
        }
      }

      // Convert Postman body to IR requestBody
      let requestBody: RequestBodySchema | undefined;
      if (request.body) {
        const body = request.body;
        let contentType = 'application/json';
        if (body.mode === 'raw' && body.options?.raw?.language) {
          contentType = getContentTypeFromLanguage(body.options.raw.language);
        } else if (body.mode === 'urlencoded') {
          contentType = 'application/x-www-form-urlencoded';
        } else if (body.mode === 'formdata') {
          contentType = 'multipart/form-data';
        } else if (body.mode === 'file') {
          contentType = 'application/octet-stream';
        }

        requestBody = {
          required: false,
          contentType,
          schema: body.raw ? { type: 'string', example: body.raw } : undefined,
        };
      }

      endpoints.push({
        path: url,
        method,
        operationId: item.name || `${method}_${url}`,
        summary: item.name,
        description: item.description,
        parameters: parameters.length > 0 ? parameters : undefined,
        requestBody,
      });
    }

    return {
      name: info.name || 'Postman Collection',
      version: '1.0.0',
      description: info.description,
      baseUrl,
      endpoints,
      auth: apiAuth,
      source: { type: 'postman', file: info._postman_id },
    };
  },
};

function flattenItems(items: any[]): any[] {
  const result: any[] = [];

  for (const item of items) {
    if (item.item) {
      result.push(...flattenItems(item.item));
    } else {
      result.push(item);
    }
  }

  return result;
}

function getContentTypeFromLanguage(language: string): string {
  const contentTypeMap: Record<string, string> = {
    json: 'application/json',
    javascript: 'application/javascript',
    xml: 'application/xml',
    html: 'text/html',
    text: 'text/plain',
    markdown: 'text/markdown',
  };
  return contentTypeMap[language.toLowerCase()] || 'text/plain';
}

function convertPostmanAuth(auth: any): AuthConfig | undefined {
  if (!auth || !auth.type) return undefined;

  const type = auth.type;
  const authData = auth[type] || {};

  switch (type) {
    case 'bearer':
      return {
        type: 'bearer',
        bearerToken: authData.token || '',
      };
    case 'basic':
      return {
        type: 'basic',
        username: authData.username || '',
        password: authData.password || '',
      };
    case 'apikey':
      return {
        type: 'apiKey',
        apiKeyName: authData.key || '',
        apiKeyValue: authData.value || '',
        apiKeyLocation: (authData.in === 'header' ? 'header' : 'query') as 'header' | 'query',
      };
    case 'oauth2':
      return {
        type: 'oauth2',
        oauth2: {
          type: authData.grantType || 'authorizationCode',
          authorizationUrl: authData.authUrl || '',
          tokenUrl: authData.accessTokenUrl || '',
          scopes: authData.scope ? { scope: authData.scope } : undefined,
        },
      };
    case 'oauth1':
      return {
        type: 'oauth1',
        oauth1: {
          consumerKey: authData.consumerKey || '',
          consumerSecret: authData.consumerSecret || '',
          token: authData.token || '',
          tokenSecret: authData.tokenSecret || '',
        },
      };
    default:
      return { type: 'none' };
  }
}