import type { API, HttpMethod } from '../ir/index.js';
import YAML from 'yaml';
import { buildAuthHeaders, buildAuthUrl, type AuthConfig } from '../utils/auth.js';

export interface SwaggerHubOptions {
  sourceUrl: string;
  auth?: AuthConfig;
  referer?: string;
}

// Swagger Hub Parser
export const swaggerHubParser = {
  name: 'swaggerhub',

  detect(source: string): boolean {
    try {
      const json = JSON.parse(source);
      return json.urls && Array.isArray(json.urls) && json.urls.length > 0 && json.configUrl;
    } catch {
      return false;
    }
  },

  async parse(source: string, options?: SwaggerHubOptions): Promise<API> {
    const config = JSON.parse(source);
    const urls = config.urls || [];

    if (urls.length === 0) {
      throw new Error('No APIs found in Swagger Hub config');
    }

    const firstUrl = urls[0];
    const baseUrl = buildDocUrl(firstUrl.url, options?.sourceUrl);
    const docUrl = buildAuthUrl(baseUrl, options?.auth);

    const response = await fetch(docUrl, {
      headers: {
        ...buildAuthHeaders(options?.auth),
        Referer: options?.referer,
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch ${docUrl}: ${response.status}`);
    }
    const docContent = await response.text();

    const api = await parseSwaggerDoc(docContent, firstUrl.serviceName);

    return {
      ...api,
      name: firstUrl.serviceName || api.name,
      source: { type: 'swaggerhub', url: docUrl },
    } as API;
  },

  async parseAll(source: string, options?: SwaggerHubOptions): Promise<API[]> {
    const config = JSON.parse(source);
    const urls = config.urls || [];
    const apis: API[] = [];

    for (const urlInfo of urls) {
      try {
        const baseUrl = buildDocUrl(urlInfo.url, options?.sourceUrl);
        const docUrl = buildAuthUrl(baseUrl, options?.auth);

        const response = await fetch(docUrl, {
          headers: {
            ...buildAuthHeaders(options?.auth),
            Referer: options?.referer,
          },
        });
        if (!response.ok) {
          console.warn(`Skipping ${urlInfo.serviceName}: HTTP ${response.status}`);
          continue;
        }
        const docContent = await response.text();

        const api = await parseSwaggerDoc(docContent, urlInfo.serviceName);

        apis.push({
          ...api,
          name: urlInfo.serviceName || api.name,
          source: { type: 'swaggerhub', url: docUrl },
        } as API);
      } catch (error) {
        console.warn(`Skipping ${urlInfo.serviceName}: ${error}`);
      }
    }

    return apis;
  },
};

// sourceUrl 的 host + urls.url
function buildDocUrl(apiUrl: string, sourceUrl?: string): string {
  const url = new URL(sourceUrl || 'http://localhost:81');
  return `${url.protocol}//${url.host}${apiUrl}`;
}

async function parseSwaggerDoc(docContent: string, fallbackName: string): Promise<Partial<API>> {
  // 尝试解析 JSON
  try {
    const doc = JSON.parse(docContent);

    if (doc.openapi?.startsWith('3.')) {
      return parseOpenAPI3(doc, fallbackName);
    } else if (doc.swagger?.startsWith('2.')) {
      return parseSwagger2(doc, fallbackName);
    }
  } catch {
    // 不是 JSON，尝试 YAML
  }

  // 尝试解析 YAML
  try {
    const doc = YAML.parse(docContent);

    if (doc.openapi?.startsWith('3.')) {
      return parseOpenAPI3(doc, fallbackName);
    } else if (doc.swagger?.startsWith('2.')) {
      return parseSwagger2(doc, fallbackName);
    }
  } catch {
    // 不是 YAML
  }

  throw new Error('Unsupported API doc format');
}

function parseOpenAPI3(doc: any, fallbackName: string): Partial<API> {
  const info = doc.info || {};
  const servers = doc.servers || [];
  const baseUrl = servers[0]?.url || '';

  const endpoints: any[] = [];
  const paths = doc.paths || {};

  for (const [path, pathItem] of Object.entries(paths)) {
    const methods = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'];

    for (const method of methods) {
      if (!pathItem[method]) continue;
      const operation = pathItem[method];

      endpoints.push({
        path,
        method: method.toUpperCase() as HttpMethod,
        operationId: operation.operationId,
        summary: operation.summary,
        description: operation.description,
        tags: operation.tags,
        deprecated: operation.deprecated || false,
        parameters: operation.parameters || [],
        responses: operation.responses || {},
      });
    }
  }

  return {
    name: info.title || fallbackName || 'Untitled API',
    version: info.version || '1.0.0',
    description: info.description,
    baseUrl,
    endpoints,
    tags: doc.tags?.map((t: any) => t.name),
  };
}

function parseSwagger2(doc: any, fallbackName: string): Partial<API> {
  const info = doc.info || {};
  const basePath = doc.basePath || '';
  const host = doc.host || '';
  const baseUrl = `https://${host}${basePath}`;

  const endpoints: any[] = [];
  const paths = doc.paths || {};

  for (const [path, pathItem] of Object.entries(paths)) {
    const methods = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'];

    for (const method of methods) {
      if (!pathItem[method]) continue;
      const operation = pathItem[method];

      endpoints.push({
        path,
        method: method.toUpperCase() as HttpMethod,
        operationId: operation.operationId,
        summary: operation.summary,
        description: operation.description,
        tags: operation.tags,
        deprecated: operation.deprecated || false,
        parameters: operation.parameters || [],
        responses: operation.responses || {},
      });
    }
  }

  return {
    name: info.title || fallbackName || 'Untitled API',
    version: info.version || '1.0.0',
    description: info.description,
    baseUrl,
    endpoints,
    tags: doc.tags?.map((t: any) => t.name),
  };
}