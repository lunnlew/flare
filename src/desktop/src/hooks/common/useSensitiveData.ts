/**
 * useSensitiveData - Hook for sensitive data masking in UI
 *
 * Provides:
 * 1. Real-time sensitive data detection in text
 * 2. Safe display of potentially sensitive values
 * 3. Logging with automatic redaction
 */

import { useMemo, useCallback } from 'react';
import {
  maskSensitiveData,
  maskSensitiveObject,
  containsSensitiveData,
  redactForLogging,
  getSafeSummary,
  type SensitiveDataConfig,
} from '../../utils/sensitive-data';

interface UseSensitiveDataOptions {
  /** Enable automatic masking */
  enabled?: boolean;
  /** Custom sensitive data configuration */
  config?: SensitiveDataConfig;
  /** Keys that should always be masked */
  alwaysMaskKeys?: string[];
}

interface SensitiveDataResult {
  /** Whether the text contains sensitive data */
  hasSensitive: boolean;
  /** Masked version of the text */
  masked: string;
  /** List of detected sensitive patterns */
  matches: string[];
}

/**
 * Hook for masking sensitive data in text
 */
export function useSensitiveData(
  text: string,
  options: UseSensitiveDataOptions = {}
) {
  const { enabled = true, config } = options;

  const result = useMemo((): SensitiveDataResult => {
    if (!enabled || !text) {
      return {
        hasSensitive: false,
        masked: text,
        matches: [],
      };
    }

    const { hasSensitive, matches } = containsSensitiveData(text, { highSensitivityOnly: true });
    const masked = hasSensitive
      ? maskSensitiveData(text, { patterns: config?.customPatterns })
      : text;

    return {
      hasSensitive,
      masked,
      matches,
    };
  }, [text, enabled, config]);

  return result;
}

/**
 * Hook for masking sensitive data in objects
 */
export function useSensitiveObject<T = unknown>(
  obj: T,
  options: UseSensitiveDataOptions = {}
) {
  const { enabled = true, config, alwaysMaskKeys = [] } = options;

  const masked = useMemo(() => {
    if (!enabled) return obj;
    return maskSensitiveObject(obj, {
      patterns: config?.customPatterns,
      keysToMask: alwaysMaskKeys,
    });
  }, [obj, enabled, config]);

  return masked;
}

/**
 * Hook for getting safe summary of values
 */
export function useSafeSummary(value: unknown, maxLength: number = 100) {
  return useMemo(() => getSafeSummary(value, maxLength), [value, maxLength]);
}

/**
 * Hook for logging with automatic sensitive data redaction
 */
export function useSensitiveLogger() {
  const log = useCallback((
    level: 'info' | 'warn' | 'error' | 'debug',
    message: string,
    data?: unknown
  ) => {
    const timestamp = new Date().toISOString();

    // Redact sensitive data in the data object
    const redactedData = data ? redactForLogging(
      typeof data === 'object' ? data as { status?: number; headers?: Record<string, string>; body?: unknown } : { body: data },
      { preserveStatus: true, maskBody: true }
    ) : undefined;

    // Log with redaction
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    if (redactedData) {
      console[level](logMessage, redactedData);
    } else {
      console[level](logMessage);
    }
  }, []);

  return {
    info: (message: string, data?: unknown) => log('info', message, data),
    warn: (message: string, data?: unknown) => log('warn', message, data),
    error: (message: string, data?: unknown) => log('error', message, data),
    debug: (message: string, data?: unknown) => log('debug', message, data),
  };
}

/**
 * Component props for displaying masked sensitive data
 */
export interface SensitiveDisplayProps {
  /** The value to display */
  value: string;
  /** Whether to show the actual value (on click, etc.) */
  revealOnClick?: boolean;
  /** Custom mask to use when hidden */
  mask?: string;
  /** CSS class for styling */
  className?: string;
}

/**
 * Default mask for sensitive data
 */
export const DEFAULT_SENSITIVE_MASK = '••••••••';