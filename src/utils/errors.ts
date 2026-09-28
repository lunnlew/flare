/**
 * FlareError - Unified error type for flare-api-spec
 */

export const ErrorCodes = {
  PARSE_ERROR: 'PARSE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  STORAGE_ERROR: 'STORAGE_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

export class FlareError extends Error {
  public readonly code: ErrorCode;
  public readonly details?: unknown;
  public readonly suggestion?: string;

  constructor(
    message: string,
    code: ErrorCode,
    details?: unknown,
    suggestion?: string
  ) {
    super(message);
    this.name = 'FlareError';
    this.code = code;
    this.details = details;
    this.suggestion = suggestion;

    // Maintains proper stack trace for where error was thrown (V8 engines)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, FlareError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      suggestion: this.suggestion,
    };
  }
}

/**
 * Create a parse error
 */
export function parseError(details: unknown, suggestion?: string): FlareError {
  return new FlareError(
    'Failed to parse API specification',
    ErrorCodes.PARSE_ERROR,
    details,
    suggestion || 'Check if the file is valid JSON/YAML and follows the expected format'
  );
}

/**
 * Create a network error
 */
export function networkError(details: unknown, suggestion?: string): FlareError {
  return new FlareError(
    'Network request failed',
    ErrorCodes.NETWORK_ERROR,
    details,
    suggestion || 'Check your network connection and the API endpoint URL'
  );
}

/**
 * Create an auth error
 */
export function authError(details: unknown, suggestion?: string): FlareError {
  return new FlareError(
    'Authentication failed',
    ErrorCodes.AUTH_ERROR,
    details,
    suggestion || 'Check your API key, credentials, or OAuth configuration'
  );
}

/**
 * Create a storage error
 */
export function storageError(operation: string, details: unknown, suggestion?: string): FlareError {
  return new FlareError(
    `Storage operation '${operation}' failed`,
    ErrorCodes.STORAGE_ERROR,
    details,
    suggestion || 'Check disk space and file permissions'
  );
}

/**
 * Create a timeout error
 */
export function timeoutError(timeoutMs: number, suggestion?: string): FlareError {
  return new FlareError(
    `Request timeout after ${timeoutMs}ms`,
    ErrorCodes.TIMEOUT_ERROR,
    { timeoutMs },
    suggestion || 'The server took too long to respond. Try increasing REQUEST_TIMEOUT.'
  );
}

/**
 * Check if an error is a FlareError
 */
export function isFlareError(error: unknown): error is FlareError {
  return error instanceof FlareError;
}

/**
 * Get error code from unknown error
 */
export function getErrorCode(error: unknown): string {
  if (isFlareError(error)) {
    return error.code;
  }
  return 'UNKNOWN_ERROR';
}