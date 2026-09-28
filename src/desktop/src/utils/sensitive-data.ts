/**
 * Sensitive Data Utilities - Data masking and sanitization
 *
 * Provides functionality for:
 * 1. Detecting sensitive data patterns (tokens, keys, passwords)
 * 2. Masking sensitive data in logs and output
 * 3. Redacting sensitive information from API responses
 */

export interface SensitivePattern {
  /** Pattern name for identification */
  name: string;
  /** Regex pattern to match */
  pattern: RegExp;
  /** Replacement mask */
  mask: string;
  /** Whether this pattern is high sensitivity (e.g., passwords) */
  highSensitivity?: boolean;
}

/**
 * Check if a key name suggests it contains sensitive data.
 * Used for UI to show/hide values based on key names.
 *
 * @param key - The variable/key name to check
 * @returns true if the key name suggests sensitive content
 */
export function isSensitiveKey(key: string): boolean {
  const sensitivePatterns = [
    'password', 'passwd', 'pwd', 'secret', 'token', 'api_key', 'apikey',
    'auth', 'credential', 'private', 'access', 'bearer', 'jwt',
    'key', 'signature', 'crypt', 'cert', 'credential', 'oauth',
  ];
  const lowerKey = key.toLowerCase();
  return sensitivePatterns.some((p) => lowerKey.includes(p));
}

/** Predefined sensitive data patterns */
export const SENSITIVE_PATTERNS: SensitivePattern[] = [
  {
    name: 'Bearer Token',
    pattern: /Bearer\s+[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+/g,
    mask: 'Bearer ***',
    highSensitivity: true,
  },
  {
    name: 'API Key (Generic)',
    pattern: /(?:api[_-]?key|apikey|api[_-]?secret|api[_-]?token)\s*[:=]\s*["']?([A-Za-z0-9_\-]{20,})["']?/gi,
    mask: '[API_KEY]',
    highSensitivity: true,
  },
  {
    name: 'Authorization Header',
    pattern: /Authorization\s*:\s*[^,\n]+/gi,
    mask: 'Authorization: ***',
    highSensitivity: true,
  },
  {
    name: 'Password Field',
    pattern: /("password"|'password'|password|passwd|pwd)\s*[:=]\s*["']?([A-Za-z0-9@#$%^&*!]{4,})["']?/gi,
    mask: '"password": "***"',
    highSensitivity: true,
  },
  {
    name: 'AWS Access Key',
    pattern: /AKIA[0-9A-Z]{16}/g,
    mask: 'AKIA************',
    highSensitivity: true,
  },
  {
    name: 'AWS Secret Key',
    pattern: /[A-Za-z0-9/+=]{40}(?=["'?\s]|$)/g,
    mask: '***AWS_SECRET_KEY***',
    highSensitivity: true,
  },
  {
    name: 'GitHub Token',
    pattern: /gh[pousr]_[A-Za-z0-9_]{36,}/g,
    mask: 'gh_***',
    highSensitivity: true,
  },
  {
    name: 'Generic Secret',
    pattern: /(?:secret|token|credential|certificate|private[_-]?key)\s*[:=]\s*["']?([A-Za-z0-9_\-]{16,})["']?/gi,
    mask: '"secret": "***"',
    highSensitivity: true,
  },
  {
    name: 'Credit Card',
    pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
    mask: '****-****-****-****',
    highSensitivity: true,
  },
  {
    name: 'Email Address',
    pattern: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}/g,
    mask: '***@***.***',
  },
  {
    name: 'Phone Number',
    pattern: /(\+?\d{1,3}[-\s]?)?\(?\d{3}\)?[-\s]?\d{3}[-\s]?\d{4}/g,
    mask: '***-***-****',
  },
  {
    name: 'Social Security Number',
    pattern: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,
    mask: '***-**-****',
    highSensitivity: true,
  },
  {
    name: 'JWT Token',
    pattern: /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
    mask: '***JWT_TOKEN***',
    highSensitivity: true,
  },
  {
    name: 'Basic Auth',
    pattern: /Basic\s+[A-Za-z0-9+/=]{20,}/g,
    mask: 'Basic ***',
    highSensitivity: true,
  },
  {
    name: 'Set-Cookie Header',
    pattern: /Set-Cookie\s*:\s*[^,\n]+/gi,
    mask: 'Set-Cookie: ***',
    highSensitivity: true,
  },
  {
    name: 'Cookie Header',
    pattern: /Cookie\s*:\s*[^,\n]+/gi,
    mask: 'Cookie: ***',
    highSensitivity: true,
  },
];

/**
 * Mask sensitive data in a string
 */
export function maskSensitiveData(
  text: string,
  options: {
    patterns?: SensitivePattern[];
    maskChar?: string;
    preserveLength?: boolean;
    highSensitivityOnly?: boolean;
  } = {}
): string {
  const {
    patterns = SENSITIVE_PATTERNS,
    maskChar = '*',
    preserveLength = false,
    highSensitivityOnly = false,
  } = options;

  let result = text;

  for (const pattern of patterns) {
    if (highSensitivityOnly && !pattern.highSensitivity) {
      continue;
    }

    result = result.replace(pattern.pattern, (match) => {
      if (preserveLength) {
        // Keep same length as original
        return maskChar.repeat(match.length);
      }
      return pattern.mask;
    });
  }

  return result;
}

/**
 * Mask sensitive data in an object (deep traversal)
 */
export function maskSensitiveObject(
  obj: unknown,
  options: {
    patterns?: SensitivePattern[];
    maskChar?: string;
    preserveLength?: boolean;
    highSensitivityOnly?: boolean;
    keysToMask?: string[];
  } = {}
): unknown {
  const { keysToMask = [], ...rest } = options;

  // Default keys that should always be masked
  const defaultKeysToMask = [
    'password', 'passwd', 'pwd', 'secret', 'token', 'apiKey', 'api_key',
    'authorization', 'auth', 'credential', 'privateKey', 'private_key',
    'accessToken', 'access_token', 'refreshToken', 'refresh_token',
    'clientSecret', 'client_secret', 'ssn', 'socialSecurityNumber',
  ];

  const allKeysToMask = [...new Set([...defaultKeysToMask, ...keysToMask])];

  if (typeof obj === 'string') {
    return maskSensitiveData(obj, rest);
  }

  if (typeof obj === 'number' || typeof obj === 'boolean' || obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => maskSensitiveObject(item, { ...rest, keysToMask: allKeysToMask }));
  }

  if (typeof obj === 'object') {
    const masked: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const shouldMask = allKeysToMask.some(
        maskKey => key.toLowerCase().includes(maskKey.toLowerCase())
      );

      if (shouldMask) {
        // Mask the value
        if (typeof value === 'string') {
          masked[key] = '***MASKED***';
        } else {
          masked[key] = value;
        }
      } else {
        // Recursively process
        masked[key] = maskSensitiveObject(value, { ...rest, keysToMask: allKeysToMask });
      }
    }
    return masked;
  }

  return obj;
}

/**
 * Check if a string contains sensitive data
 */
export function containsSensitiveData(
  text: string | undefined,
  options: { highSensitivityOnly?: boolean } = {}
): { hasSensitive: boolean; matches: string[] } {
  const { highSensitivityOnly = false } = options;
  const matches: string[] = [];

  // Guard against undefined or null
  if (!text) {
    return { hasSensitive: false, matches: [] };
  }

  for (const pattern of SENSITIVE_PATTERNS) {
    if (highSensitivityOnly && !pattern.highSensitivity) {
      continue;
    }

    const found = text.match(pattern.pattern);
    if (found) {
      matches.push(...found);
    }
  }

  return {
    hasSensitive: matches.length > 0,
    matches,
  };
}

/**
 * Create a redacted version of an API response for logging
 */
export function redactForLogging(
  response: {
    status?: number;
    headers?: Record<string, string>;
    body?: unknown;
  },
  options: {
    preserveStatus?: boolean;
    preserveHeaders?: string[];
    maskBody?: boolean;
  } = {}
): {
  status?: number;
  headers?: Record<string, string>;
  body?: unknown;
  _redacted: boolean;
  _redactedAt: string;
} {
  const { preserveStatus = true, preserveHeaders = [], maskBody = true } = options;

  const result: ReturnType<typeof redactForLogging> = {
    _redacted: true,
    _redactedAt: new Date().toISOString(),
  };

  if (preserveStatus && response.status !== undefined) {
    result.status = response.status;
  }

  if (response.headers) {
    result.headers = {};
    for (const [key, value] of Object.entries(response.headers)) {
      const shouldPreserve = preserveHeaders.some(h => key.toLowerCase().includes(h.toLowerCase()));
      if (shouldPreserve) {
        result.headers[key] = value;
      } else {
        result.headers[key] = '***';
      }
    }
  }

  if (maskBody) {
    result.body = maskSensitiveObject(response.body, { highSensitivityOnly: true });
  }

  return result;
}

/**
 * Get a safe summary of an object for display (e.g., in tooltips)
 */
export function getSafeSummary(
  obj: unknown,
  maxLength: number = 100
): string {
  if (obj === null || obj === undefined) {
    return 'null';
  }

  if (typeof obj === 'string') {
    const masked = maskSensitiveData(obj, { highSensitivityOnly: true });
    return masked.length > maxLength ? masked.substring(0, maxLength) + '...' : masked;
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return String(obj);
  }

  if (Array.isArray(obj)) {
    return `[${obj.length} items]`;
  }

  if (typeof obj === 'object') {
    const keys = Object.keys(obj as Record<string, unknown>);
    if (keys.length === 0) {
      return '{}';
    }
    const keySummary = keys.slice(0, 3).join(', ');
    const more = keys.length > 3 ? ` +${keys.length - 3} more` : '';
    return `{${keySummary}${more}}`;
  }

  return '***';
}

/**
 * Configuration for sensitive data detection
 */
export interface SensitiveDataConfig {
  /** Additional patterns to detect */
  customPatterns?: SensitivePattern[];
  /** Keys that should always be masked */
  alwaysMaskKeys?: string[];
  /** Keys that should never be masked */
  neverMaskKeys?: string[];
  /** Whether to enable by default */
  enabled?: boolean;
}

/**
 * Create a sensitive data masker with custom configuration
 */
export function createSensitiveMasker(config: SensitiveDataConfig = {}) {
  const { customPatterns = [], alwaysMaskKeys = [] } = config;

  return {
    mask(text: string) {
      return maskSensitiveData(text, { patterns: [...SENSITIVE_PATTERNS, ...customPatterns] });
    },
    maskObject(obj: unknown) {
      return maskSensitiveObject(obj, {
        patterns: [...SENSITIVE_PATTERNS, ...customPatterns],
        keysToMask: alwaysMaskKeys,
      });
    },
    check(text: string) {
      return containsSensitiveData(text);
    },
  };
}