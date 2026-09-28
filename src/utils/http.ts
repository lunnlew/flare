/**
 * HTTP utility with timeout support and SSRF protection
 */

import { timeoutError } from './errors.js';
import { getRequestTimeout } from './config.js';

export interface FetchOptions extends RequestInit {
  timeout?: number;
}

/**
 * Check if a URL is blocked for SSRF protection
 * Blocks: localhost, 127.0.0.1, ::1, 169.254.169.254, and private IP ranges
 */
export function isBlockedUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    // Block localhost
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      return true;
    }

    // Block cloud metadata endpoint
    if (hostname === '169.254.169.254') {
      return true;
    }

    // Block private IP ranges
    const privateRanges = [
      /^10\./i,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./i,
      /^192\.168\./i,
      /^169\.254\./i,
    ];

    for (const range of privateRanges) {
      if (range.test(hostname)) {
        return true;
      }
    }

    return false;
  } catch {
    // If URL parsing fails, block it for safety
    return true;
  }
}

/**
 * Fetch with timeout protection
 */
export async function fetchWithTimeout(
  url: string,
  options: FetchOptions = {},
  timeoutMs?: number
): Promise<Response> {
  const timeout = timeoutMs || options.timeout || getRequestTimeout();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw timeoutError(timeout);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Build URL with query parameters
 */
export function buildUrl(
  baseUrl: string,
  path: string,
  queryParams?: Record<string, string | number | boolean>
): string {
  const url = new URL(path, baseUrl);
  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    }
  }
  return url.toString();
}

/**
 * Parse response as JSON, handling errors gracefully
 */
export async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Failed to parse response as JSON: ${text.substring(0, 200)}`);
  }
}