import type { API, HttpMethod } from '../ir/index.js';
import type { Parser } from './index.js';

export const httpParser: Parser = {
  name: 'http',

  detect(source: string): boolean {
    return source.trim().startsWith('curl ') ||
           source.includes(' --request ') ||
           source.includes(' -X ');
  },

  async parse(source: string): Promise<API> {
    const parsed = parseCurl(source);

    return {
      name: parsed.url || 'HTTP Request',
      version: '1.0.0',
      description: 'Raw HTTP request',
      baseUrl: parsed.url || '',
      endpoints: [{
        path: new URL(parsed.url || 'http://localhost').pathname,
        method: (parsed.method || 'GET') as HttpMethod,
        operationId: 'request',
        summary: source.split('\n')[0].slice(0, 50),
      }],
      source: { type: 'http' },
    };
  },
};

interface ParsedCurl {
  url?: string;
  method?: string;
  headers: { name: string; value: string }[];
  body?: string;
}

function parseCurl(source: string): ParsedCurl {
  const result: ParsedCurl = { headers: [] };
  const trimmed = source.trim();

  // curl "https://api.example.com" --request POST ...
  const urlMatch = trimmed.match(/curl\s+["']([^"']+)["']/);
  if (urlMatch) result.url = urlMatch[1];

  // Fallback: curl https://api.example.com (no quotes)
  if (!result.url) {
    const unquotedUrlMatch = trimmed.match(/curl\s+(https?:\/\/[^\s]+)/);
    if (unquotedUrlMatch) result.url = unquotedUrlMatch[1];
  }

  const methodMatch = trimmed.match(/--request\s+(\w+)/);
  if (methodMatch) result.method = methodMatch[1];

  const xMatch = trimmed.match(/-X\s+(\w+)/);
  if (xMatch) result.method = xMatch[1];

  const headerMatches = trimmed.matchAll(/--header\s+["']([^:]+):\s*([^"']+)["']/g);
  for (const match of headerMatches) {
    result.headers.push({ name: match[1], value: match[2] });
  }

  const dataMatch = trimmed.match(/--data(-raw)?\s+["']([^"']+)["']/);
  if (dataMatch) result.body = dataMatch[2];

  return result;
}