import { parse } from 'yaml';
import type { API, EndpointSchema, ParameterSchema, ResponseSchema, HttpMethod, AuthConfig, AuthType } from '../ir/index.js';
import type { Parser } from './index.js';

// OpenAPI 2.0 (Swagger) Parser
export const openApi2Parser: Parser = {
  name: 'openapi-2',

  detect(source: string): boolean {
    try {
      const json = JSON.parse(source);
      return json.swagger === '2.0';
    } catch {
      return source.includes('swagger:') && source.includes('2.0');
    }
  },

  async parse(source: string): Promise<API> {
    const doc = await parseSwaggerDoc(source);

    // Extract info
    const info = doc.info || {};
    const baseUrl = buildBaseUrl(doc);

    // Parse paths
    const endpoints: EndpointSchema[] = [];
    const paths = doc.paths || {};

    for (const [path, pathItem] of Object.entries(paths)) {
      const methods = getHttpMethods(pathItem);

      for (const method of methods) {
        const operation = pathItem[method];
        if (!operation) continue;

        const endpoint: EndpointSchema = {
          path,
          method: method.toUpperCase() as HttpMethod,
          operationId: operation.operationId,
          summary: operation.summary,
          description: operation.description,
          tags: operation.tags,
          deprecated: operation.deprecated || false,
          parameters: parseParameters(operation.parameters || [], doc),
          responses: parseResponses(operation.responses || {}),
        };

        // requestBody (Swagger 2.0 uses body parameter)
        if (operation.body) {
          endpoint.requestBody = {
            description: operation.body.description,
            required: operation.body.required || false,
            contentType: 'application/json',
            schema: operation.body.schema,
          };
        }

        endpoints.push(endpoint);
      }
    }

    // Parse global auth
    let auth: AuthConfig | undefined;
    if (doc.securityDefinitions) {
      auth = parseSecurityDefinitions(doc.securityDefinitions);
    }

    return {
      name: info.title || 'Untitled API',
      version: info.version || '1.0.0',
      description: info.description,
      baseUrl,
      endpoints,
      tags: doc.tags?.map((t: any) => t.name),
      auth,
      source: { type: 'openapi-2', url: doc.host ? `https://${doc.host}${doc.basePath || ''}` : undefined },
    };
  },
};

function parseSwaggerDoc(source: string): any {
  try {
    return JSON.parse(source);
  } catch {
    return parse(source, { strict: false });
  }
}

function buildBaseUrl(doc: any): string {
  const scheme = doc.schemes?.[0] || 'https';
  const host = doc.host || '';
  const basePath = doc.basePath || '';
  return `${scheme}://${host}${basePath}`.replace(/\/$/, '');
}

function getHttpMethods(pathItem: Record<string, any>): string[] {
  const methods = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'];
  return methods.filter(m => pathItem[m]);
}

function parseParameters(params: any[], doc: any): ParameterSchema[] {
  return params.map((p: any) => {
    // Handle $ref
    let schema = p.schema || p;
    if (p.schema?.$ref) {
      schema = resolveRef(doc, p.schema.$ref);
    } else if (p.$ref) {
      schema = resolveRef(doc, p.$ref);
    }

    return {
      name: p.name,
      location: p.in || 'body',
      required: p.required || false,
      description: p.description,
      schema,
      example: p.default || schema?.example,
    };
  });
}

function parseResponses(responses: any): Record<string, ResponseSchema> {
  const result: Record<string, ResponseSchema> = {};

  for (const [code, response] of Object.entries(responses)) {
    const resp = response as any;
    const schema = resp.schema || resp;

    result[code] = {
      statusCode: parseInt(code),
      description: resp.description,
      contentType: 'application/json',
      schema,
    };
  }

  return result;
}

function parseSecurityDefinitions(defs: Record<string, any>): AuthConfig {
  const types: Record<string, AuthType> = {
    basic: 'basic',
    bearer: 'bearer',
    apiKey: 'apiKey',
    oauth2: 'oauth2',
  };

  // Find the first security scheme
  for (const [name, def] of Object.entries(defs)) {
    const d = def as any;
    const type = types[d.type];

    if (type) {
      const auth: AuthConfig = { type };

      if (type === 'basic' && d.type === 'basic') {
        // Basic auth - no additional config needed
      } else if (type === 'bearer' && d.type === 'apiKey' && d.in === 'header' && d.name.toLowerCase().includes('bearer')) {
        auth.bearerToken = '';
      } else if (type === 'apiKey') {
        auth.apiKeyName = d.name;
        auth.apiKeyLocation = d.in as 'header' | 'query' | 'cookie';
      } else if (type === 'oauth2' && d.type === 'oauth2') {
        auth.oauth2 = {
          type: 'authorizationCode',
          authorizationUrl: d.authorizationUrl,
          tokenUrl: d.tokenUrl,
          scopes: d.scopes || {},
        };
      }

      return auth;
    }
  }

  return { type: 'none' };
}

function resolveRef(doc: any, ref: string): any {
  const parts = ref.replace('#/', '').split('/');
  let current = doc;
  for (const part of parts) {
    current = current?.[part];
  }
  return current;
}