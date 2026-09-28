import type { CapturedRequest } from '../types/capture';
import type { EndpointData } from '../types/api';
import { useCollectionStore } from '../store';

/**
 * Find the best matching endpoint for a captured request using longest suffix match.
 * Returns the matched endpoint and the extracted path (without baseUrl).
 */
export function matchCapturedRequestToEndpoint(request: CapturedRequest): {
  endpoint: EndpointData | null;
  path: string;
} {
  // Extract path from URL (without query params for matching)
  let path = request.url;
  try {
    if (request.url.startsWith('http')) {
      const urlObj = new URL(request.url);
      path = urlObj.pathname; // Only pathname, no query string
    }
  } catch (e) {
    console.warn('[Capture] URL parse failed, using original:', request.url, e);
  }

  // Find the endpoint with longest suffix match from all APIs
  const apis = useCollectionStore.getState().apis;
  let bestMatch: { endpoint: EndpointData; matchLength: number } | null = null;

  for (const api of apis) {
    // Get the base path for this API (e.g., "/api/mes" from baseUrl)
    const apiBasePath = api.baseUrl ? new URL(api.baseUrl).pathname : '';
    for (const endpoint of api.endpoints || []) {
      const epPath = endpoint.path || '';
      // Try to match against endpoint path directly, or with API base path stripped
      const pathWithoutBase = apiBasePath ? path.replace(apiBasePath, '') : path;
      const cleanPath = pathWithoutBase.startsWith('/') ? pathWithoutBase : '/' + pathWithoutBase;

      // Check if endpoint path is a suffix of the captured path
      if (cleanPath.endsWith(epPath) || cleanPath === epPath || path.endsWith(epPath)) {
        const matchLength = epPath.length;
        if (!bestMatch || matchLength > bestMatch.matchLength) {
          bestMatch = { endpoint, matchLength };
        }
      }
    }
  }

  return {
    endpoint: bestMatch?.endpoint || null,
    path,
  };
}

/**
 * Extract path from a captured request URL, prefixing with {baseUrl} placeholder.
 * Format: {{baseUrl}}/extracted/path
 */
export function extractPathWithBaseUrl(request: CapturedRequest): string {
  let path = request.url;
  try {
    if (request.url.startsWith('http')) {
      const urlObj = new URL(request.url);
      path = urlObj.pathname + urlObj.search;
    }
  } catch (e) {
    console.warn('[Capture] URL parse failed, using original:', request.url, e);
  }

  // Remove leading slash if present, then prepend baseUrl placeholder
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `{{baseUrl}}/${cleanPath}`;
}