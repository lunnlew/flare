import { parse } from 'yaml';
import type { API, EndpointSchema, ParameterSchema, ResponseSchema, HttpMethod, SecurityRequirementSchema } from '../ir/index.js';
import type { Parser } from './index.js';

// OpenAPI 3.x Parser
export const openApiParser: Parser = {
  name: 'openapi',

  detect(source: string): boolean {
    try {
      const json = JSON.parse(source);
      return Boolean(json.openapi && json.openapi.startsWith('3.'));
    } catch {
      return source.includes('openapi:') && source.includes('3.');
    }
  },

  async parse(source: string): Promise<API> {
    const doc = await parseOpenAPIDoc(source);

    // Extract info
    const info = doc.info || {};
    const servers = doc.servers || [];
    const baseUrl = resolveServerVariables(servers[0]);

    // Parse paths
    const endpoints: EndpointSchema[] = [];
    const paths = doc.paths || {};

    for (const [path, pathItem] of Object.entries(paths)) {
      const methods = getHttpMethods(pathItem);

      for (const method of methods) {
        const operation = pathItem[method];
        if (!operation) continue;

        // Parse security requirements
        const security = parseSecurity(operation.security || []);

        // Parse callbacks
        const callbacks = operation.callbacks ? parseCallbacks(operation.callbacks, doc) : undefined;

        // Parse servers (operation-level override)
        const operationServers = operation.servers ? operation.servers.map((s: any) => ({
          url: resolveServerVariables(s),
          description: s.description,
        })) : undefined;

        const endpoint: EndpointSchema = {
          path,
          method: method.toUpperCase() as HttpMethod,
          operationId: operation.operationId,
          summary: operation.summary,
          description: operation.description,
          deprecated: operation.deprecated || false,
          tags: operation.tags,
          parameters: parseParameters(operation.parameters || [], doc),
          responses: parseResponses(operation.responses || {}),
          security,
          servers: operationServers,
          callbacks,
        };

        // requestBody
        if (operation.requestBody) {
          endpoint.requestBody = {
            description: operation.requestBody.description,
            required: operation.requestBody.required || false,
            contentType: Object.keys(operation.requestBody.content || {})[0],
            schema: operation.requestBody.content,
          };
        }

        // Parse links
        if (operation.responses) {
          for (const [code, resp] of Object.entries(operation.responses)) {
            const response = resp as any;
            if (response.links) {
              // Store links in the response schema
              const parsedResponses = endpoint.responses as Record<string, ResponseSchema>;
              if (parsedResponses[code]) {
                parsedResponses[code].links = parseLinks(response.links);
              }
            }
          }
        }

        endpoints.push(endpoint);
      }
    }

    // Parse global security
    const globalSecurity = parseSecurity(doc.security || []);

    return {
      name: info.title || 'Untitled API',
      version: info.version || '1.0.0',
      description: info.description,
      termsOfService: info.termsOfService,
      baseUrl,
      servers: servers.map((s: any) => ({
        url: s.url,
        description: s.description,
        variables: s.variables,
      })),
      endpoints,
      tags: doc.tags?.map((t: any) => t.name),
      security: globalSecurity,
      source: {
        type: 'openapi',
        url: doc.servers?.[0]?.url,
        version: doc.openapi,
      },
    };
  },
};

async function parseOpenAPIDoc(source: string): Promise<any> {
  try {
    // Try JSON first
    return JSON.parse(source);
  } catch {
    // Use yaml library for YAML parsing
    return parse(source, { strict: false });
  }
}

function getHttpMethods(pathItem: Record<string, any>): string[] {
  const methods = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'];
  return methods.filter(m => pathItem[m]);
}

function parseParameters(params: any[], doc: any): ParameterSchema[] {
  return params.map((p: any) => {
    // 解析 schema 引用
    let schema = p.schema;
    if (p.schema?.$ref) {
      schema = resolveRef(doc, p.schema.$ref);
    }

    return {
      name: p.name,
      location: p.in,
      required: p.required || false,
      description: p.description,
      schema,
      example: p.example || p.schema?.example,
    };
  });
}

function parseResponses(responses: any): Record<string, ResponseSchema> {
  const result: Record<string, ResponseSchema> = {};

  for (const [code, response] of Object.entries(responses)) {
    const resp = response as any;
    const content = resp.content || {};
    const contentType = Object.keys(content)[0] || 'application/json';
    const schema = content[contentType]?.schema;

    result[code] = {
      statusCode: parseInt(code),
      description: resp.description,
      contentType,
      schema,
    };
  }

  return result;
}

function resolveRef(doc: any, ref: string): any {
  // Resolve $ref, e.g., #/components/schemas/Pet
  const parts = ref.replace('#/', '').split('/');
  let current = doc;
  for (const part of parts) {
    current = current?.[part];
  }
  return current;
}

function resolveServerVariables(server: any): string {
  if (!server) return '';
  let url = server.url || '';

  if (server.variables) {
    for (const [key, val] of Object.entries(server.variables)) {
      const varDef = val as any;
      const defaultValue = varDef.default || varDef.enum?.[0] || '';
      url = url.replace(`{${key}}`, defaultValue);
    }
  }

  return url;
}

function parseSecurity(security: any[]): Array<{ name: string; scopes?: string[] }> | undefined {
  if (!security || security.length === 0) return undefined;

  return security.map((req: any) => {
    if (typeof req === 'object') {
      const name = Object.keys(req)[0];
      const scopes = req[name] || [];
      return {
        name,
        scopes: scopes.length > 0 ? scopes : undefined,
      };
    }
    return { name: req, scopes: undefined };
  });
}

function parseCallbacks(callbacks: Record<string, any>, doc: any): Record<string, any> | undefined {
  const result: Record<string, any> = {};

  for (const [name, callback] of Object.entries(callbacks)) {
    const resolvedCallback: Record<string, any> = {};

    if (typeof callback === 'object') {
      for (const [expression, pathItem] of Object.entries(callback)) {
        const resolvedPathItem: Record<string, any> = {};
        for (const [method, operation] of Object.entries(pathItem as Record<string, any>)) {
          if (typeof operation === 'object' && operation.$ref) {
            resolvedPathItem[method] = resolveRef(doc, operation.$ref);
          } else {
            resolvedPathItem[method] = operation;
          }
        }
        resolvedCallback[expression as string] = resolvedPathItem;
      }
    }

    result[name] = resolvedCallback;
  }

  return result;
}

function parseLinks(links: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};

  for (const [name, link] of Object.entries(links)) {
    if (typeof link === 'object' && link.$ref) {
      result[name] = link;
    } else {
      result[name] = link;
    }
  }

  return result;
}