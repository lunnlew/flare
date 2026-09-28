import type { ResponseData } from '../types/api';

interface SubstitutionContext {
  env: Record<string, string>;
  global?: Record<string, string>;
  response?: ResponseData | null;
}

function isSubstitutionContext(obj: unknown): obj is SubstitutionContext {
  return typeof obj === 'object' && obj !== null && 'env' in obj;
}

// URL variable substitution: {{var}} -> env[var]
// Also supports {{global.varName}} for global variables
// And {{response.body.path}} for extracting response data
export function substituteVariables(input: string, context: SubstitutionContext | Record<string, string>): string {
  // Handle both simple env map and extended context
  const env: Record<string, string> = isSubstitutionContext(context) ? context.env : context;
  const global: Record<string, string> = isSubstitutionContext(context) ? (context.global || {}) : {};
  const response: ResponseData | null | undefined = isSubstitutionContext(context) ? context.response : undefined;

  if (!response) {
    return input.replace(/\{\{([^}]+)\}\}/g, (_, v) => {
      // Check for global.* syntax
      if (v.startsWith('global.')) {
        const key = v.substring(7);
        return global[key] ?? _;
      }
      return env[v] ?? _;
    });
  }

  // Enhanced substitution with response access
  return input.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
    // Check for global.* syntax
    if (path.startsWith('global.')) {
      const key = path.substring(7);
      return global[key] ?? _;
    }
    // Check for response.* syntax
    if (path.startsWith('response.')) {
      const jsonPath = path.substring(9); // Remove 'response.' prefix
      return getResponseValue(response, jsonPath) ?? _;
    }
    // Standard environment variable
    return env[path] ?? _;
  });
}

// Extract value from response using JSON path (e.g., "body.token", "body.data.items.0.name")
function getResponseValue(response: ResponseData, path: string): string | undefined {
  try {
    // Handle body parsing
    if (path.startsWith('body.')) {
      const bodyPath = path.substring(5);
      const body = typeof response.body === 'string'
        ? JSON.parse(response.body)
        : response.body;
      return getNestedValue(body, bodyPath);
    }
    // Handle header access
    if (path.startsWith('header.')) {
      const headerName = path.substring(7);
      return response.headers?.[headerName];
    }
    // Handle status
    if (path === 'status') {
      return String(response.status);
    }
    if (path === 'statusText') {
      return response.statusText;
    }
    if (path === 'time') {
      return String(response.time);
    }
    // Default: try to parse as body path
    const body = typeof response.body === 'string'
      ? JSON.parse(response.body)
      : response.body;
    return getNestedValue(body, path);
  } catch {
    return undefined;
  }
}

// Get nested value from object using dot notation
function getNestedValue(obj: unknown, path: string): string | undefined {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    // Handle array index like "items.0.name"
    const arrayMatch = part.match(/^(.+)\.(\d+)$/);
    if (arrayMatch) {
      const key = arrayMatch[1];
      const index = parseInt(arrayMatch[2], 10);
      current = (current as Record<string, unknown>)[key];
      if (Array.isArray(current)) {
        current = current[index];
      } else {
        return undefined;
      }
    } else if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  if (current === null || current === undefined) return undefined;
  if (typeof current === 'object') return JSON.stringify(current);
  return String(current);
}

// Truncate string with ellipsis
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

// Generate random string
export function randomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Match a value against a pattern that may be a regex or plain string.
 * Used in DynamicMock for matching URLs, paths, and body content.
 */
export function matchesPattern(value: string, pattern: string): boolean {
  // If pattern contains regex special characters, test as regex
  const isRegexPattern = /[.*+?^${}()|[\]\\]/.test(pattern);

  if (isRegexPattern) {
    try {
      const regex = new RegExp(pattern);
      return regex.test(value);
    } catch {
      // Invalid regex pattern - treat as literal match failure
      return false;
    }
  }

  // Plain string match (no regex special chars)
  return value.includes(pattern);
}

/**
 * Check if an error is an abort/cancellation error.
 * Handles both DOMException AbortError and error messages containing "cancelled".
 */
export function isAbortError(error: unknown): boolean {
  if (error instanceof Error) {
    if (error.name === 'AbortError') return true;
    if (error.message?.toLowerCase().includes('cancelled')) return true;
  }
  return false;
}

/**
 * Extract error message from an error object or fallback to string conversion.
 */
export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
