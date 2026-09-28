import type { API, EndpointSchema, HistoryEntry, HttpMethod, ParameterSchema, ParamLocation } from '../ir/index.js';
import type { Parser } from './index.js';

// HAR (HTTP Archive) 1.2 Parser
export const harParser: Parser = {
  name: 'har',

  detect(source: string): boolean {
    try {
      const json = JSON.parse(source);
      return Boolean(json.log && json.log.entries && Array.isArray(json.log.entries));
    } catch {
      return false;
    }
  },

  async parse(source: string): Promise<API> {
    let har;
    try {
      har = JSON.parse(source);
    } catch (error) {
      throw new Error(`Failed to parse HAR file: ${error instanceof Error ? error.message : String(error)}`);
    }
    const log = har.log;

    // Group entries by URL pattern to create API endpoints
    const endpointMap = new Map<string, { endpoint: EndpointSchema; queryParams: Set<string>; headerParams: Set<string> }>();
    const baseUrl = extractBaseUrl(log.entries);

    for (const entry of log.entries) {
      const request = entry.request;
      const url = new URL(request.url);

      // Skip non-API URLs (images, fonts, etc.)
      if (isStaticAsset(url.pathname)) continue;

      const path = url.pathname;
      const method = (request.method.toUpperCase() as HttpMethod) || 'GET';

      const key = `${method}:${path}`;
      if (!endpointMap.has(key)) {
        endpointMap.set(key, {
          endpoint: {
            path,
            method,
            summary: extractSummaryFromUrl(url),
            description: '',
            deprecated: false,
            responses: {},
            parameters: [],
          },
          queryParams: new Set<string>(),
          headerParams: new Set<string>(),
        });
      }

      const entryData = endpointMap.get(key)!;

      // Collect unique query parameters
      if (request.queryString) {
        for (const q of request.queryString) {
          if (!entryData.queryParams.has(q.name)) {
            entryData.queryParams.add(q.name);
            entryData.endpoint.parameters!.push({
              name: q.name,
              location: 'query' as ParamLocation,
              required: false,
              description: '',
              deprecated: false,
              example: q.value,
            });
          }
        }
      }

      // Collect unique header parameters (excluding common headers)
      const commonHeaders = ['content-type', 'content-length', 'host', 'accept', 'authorization'];
      if (request.headers) {
        for (const h of request.headers) {
          const headerName = h.name.toLowerCase();
          if (!commonHeaders.includes(headerName) && !entryData.headerParams.has(headerName)) {
            entryData.headerParams.add(headerName);
            entryData.endpoint.parameters!.push({
              name: h.name,
              location: 'header' as ParamLocation,
              required: false,
              description: '',
              deprecated: false,
              example: h.value,
            });
          }
        }
      }

      // Add response to endpoint
      const response = entry.response;
      const statusCode = response.status;

      // Get first matching response schema
      const contentType = getContentType(response.headers);
      let schema: any;

      if (contentType.includes('json') && response.content.text) {
        try {
          const body = JSON.parse(response.content.text);
          schema = inferSchema(body);
        } catch {
          schema = { type: 'string' };
        }
      } else {
        schema = { type: contentType.includes('xml') ? 'xml' : 'string' };
      }

      entryData.endpoint.responses![statusCode] = {
        statusCode,
        description: response.statusText || getStatusDescription(statusCode),
        contentType,
        schema,
      };
    }

    // Convert to endpoints array, clean up empty parameters
    const endpoints: EndpointSchema[] = Array.from(endpointMap.values()).map(({ endpoint }) => ({
      ...endpoint,
      parameters: endpoint.parameters!.length > 0 ? endpoint.parameters : undefined,
    }));

    // Extract API name from HAR creator
    const creator = log.creator || {};
    const apiName = creator.name || 'Imported API';

    return {
      name: apiName,
      version: '1.0.0',
      description: `Imported from HAR archive by ${creator.name || 'Unknown'} ${creator.version || ''}`.trim(),
      baseUrl,
      endpoints,
      source: {
        type: 'har',
        url: log.pages?.[0]?.id,
      },
      metadata: {
        HARVersion: har.version,
        creator: log.creator,
        browser: log.browser,
        pages: log.pages?.map((p: any) => ({ id: p.id, title: p.title, startedDateTime: p.startedDateTime })),
      },
    };
  },
};

interface HAREntry {
  startedDateTime?: string;
  request: {
    method: string;
    url: string;
    headers: Array<{ name: string; value: string }>;
    queryString?: Array<{ name: string; value: string }>;
    postData?: {
      mimeType: string;
      text: string;
    };
  };
  response: {
    status: number;
    statusText: string;
    headers: Array<{ name: string; value: string }>;
    content: {
      mimeType: string;
      text: string;
      size: number;
    };
  };
  time: number;
}

function extractBaseUrl(entries: HAREntry[]): string {
  if (entries.length === 0) return '';

  const firstUrl = entries[0]?.request?.url;
  if (!firstUrl) return '';

  try {
    const url = new URL(firstUrl);
    return `${url.protocol}//${url.host}`;
  } catch {
    return '';
  }
}

function isStaticAsset(pathname: string): boolean {
  const staticExtensions = [
    '.js', '.css', '.ico', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp',
    '.woff', '.woff2', '.ttf', '.eot', '.map', '.ico',
  ];
  const ext = pathname.toLowerCase().slice(pathname.lastIndexOf('.'));
  return staticExtensions.includes(ext);
}

function extractSummaryFromUrl(url: URL): string {
  const pathParts = url.pathname.split('/').filter(Boolean);
  if (pathParts.length === 0) return 'Root';

  // Use last meaningful path segment
  const lastPart = pathParts[pathParts.length - 1];
  return lastPart
    .replace(/[-_]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase();
}

function getContentType(headers: Array<{ name: string; value: string }>): string {
  const ct = headers.find(h => h.name.toLowerCase() === 'content-type');
  return ct?.value || 'application/octet-stream';
}

function getStatusDescription(code: number): string {
  const descriptions: Record<number, string> = {
    200: 'OK',
    201: 'Created',
    204: 'No Content',
    301: 'Moved Permanently',
    302: 'Found',
    304: 'Not Modified',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
  };
  return descriptions[code] || 'Unknown';
}

function inferSchema(data: unknown): any {
  if (data === null) return { type: 'null' };
  if (data === undefined) return { type: 'undefined' };

  if (Array.isArray(data)) {
    if (data.length === 0) return { type: 'array', items: {} };
    return { type: 'array', items: inferSchema(data[0]) };
  }

  switch (typeof data) {
    case 'string': return { type: 'string' };
    case 'number': return Number.isInteger(data) ? { type: 'integer' } : { type: 'number' };
    case 'boolean': return { type: 'boolean' };
    case 'object': {
      const properties: Record<string, any> = {};
      for (const [key, value] of Object.entries(data as object)) {
        properties[key] = inferSchema(value);
      }
      return { type: 'object', properties };
    }
    default:
      return {};
  }
}

// Helper to convert HAR to history entries
export function harToHistory(har: any, limit?: number): HistoryEntry[] {
  const entries = (har.log?.entries || []).slice(0, limit);

  return entries.map((entry: HAREntry, index: number): HistoryEntry => {
    const request = entry.request;
    const response = entry.response;
    const url = new URL(request.url);

    return {
      id: `har-${index}-${Date.now()}`,
      timestamp: new Date(entry.startedDateTime || Date.now()).getTime(),
      method: request.method as HttpMethod,
      url: request.url,
      request: {
        headers: Object.fromEntries(request.headers.map((h: any) => [h.name, h.value])),
        queryParams: Object.fromEntries((request.queryString || []).map((q: any) => [q.name, q.value])),
        body: request.postData?.text,
        bodyContentType: request.postData?.mimeType,
      },
      response: response ? {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.map((h: any) => [h.name, h.value])),
        body: response.content?.text || '',
        time: entry.time || 0,
        size: response.content?.size || 0,
      } : undefined,
    };
  });
}