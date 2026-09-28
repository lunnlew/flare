import type { KeyValue } from '../types/http';

/**
 * Parse query parameters from a URL string.
 * Returns an array of KeyValue objects with key, value, and enabled properties.
 */
export function parseUrlParams(url: string): KeyValue[] {
  if (!url) return [];

  try {
    const urlObj = new URL(url);
    const queryString = urlObj.search;
    if (!queryString) return [];

    const queryParams = new URLSearchParams(queryString);
    const parsed: KeyValue[] = [];
    queryParams.forEach((value, key) => {
      parsed.push({ key, value, enabled: true });
    });

    return parsed;
  } catch {
    return [];
  }
}

/**
 * Sanitize URL for generating a stable ID.
 * Uses the pathname portion, replacing non-alphanumeric characters with underscores.
 */
export function sanitizeUrlForId(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname;
    return path.replace(/[^a-zA-Z0-9]/g, '_').replace(/^_+|_+$/g, '');
  } catch {
    return url.split('?')[0].replace(/[^a-zA-Z0-9]/g, '_').replace(/^_+|_+$/g, '');
  }
}

/**
 * Check if a URL is a valid absolute URL.
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract the base URL (protocol + host + port) from a full URL.
 */
export function getBaseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return '';
  }
}

/**
 * Build a URL with query parameters.
 */
export function buildUrlWithParams(
  baseUrl: string,
  params: { key: string; value: string; enabled: boolean }[],
  autoEncode: boolean = true
): string {
  const enabled = params.filter((p) => p.enabled && p.key.trim());
  if (enabled.length === 0) return baseUrl;

  const qs = enabled
    .map((p) => {
      const key = autoEncode ? encodeURIComponent(p.key) : p.key;
      const value = autoEncode ? encodeURIComponent(p.value) : p.value;
      return `${key}=${value}`;
    })
    .join('&');

  return `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}${qs}`;
}

/**
 * Parse URL and return its components.
 * Returns hostname, pathname, search from a URL string.
 */
export function parseUrlComponents(url: string): { hostname: string; pathname: string; search: string } | null {
  try {
    const urlObj = new URL(url);
    return {
      hostname: urlObj.hostname,
      pathname: urlObj.pathname,
      search: urlObj.search,
    };
  } catch {
    return null;
  }
}