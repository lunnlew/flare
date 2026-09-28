/**
 * Unified Logger - Frontend structured logging API
 *
 * Provides:
 * - Structured logging with correlation ID support
 * - Bridging to Rust backend via Tauri IPC
 * - Child loggers with prefixed categories
 * - Live log subscription for log viewer
 *
 * Log entries are emitted to Rust via `invoke('emit_log', ...)` and written
 * to NDJSON log files with daily rotation.
 */

import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { uuidv4 } from './uuid';

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'critical';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  category: string;
  correlationId?: string;
  data?: Record<string, unknown>;
}

export interface LoggerConfig {
  category: string;
  correlationId?: string;
}

/**
 * Unified Logger class
 *
 * @example
 * const logger = new Logger({ category: 'app' });
 * logger.info('User logged in', { userId: '123' });
 *
 * @example
 * const childLogger = logger.child('http');
 * childLogger.info('Request sent', { method: 'POST', url: '/api/users' });
 *
 * @example
 * const correlatedLogger = logger.withCorrelationId('req-123');
 * correlatedLogger.info('Processing request');
 */
class Logger {
  private category: string;
  private correlationId?: string;

  constructor(config: LoggerConfig) {
    this.category = config.category;
    this.correlationId = config.correlationId;
  }

  /**
   * Create a child logger with a specific category
   * The child category will be prefixed with the parent's category
   */
  child(category: string): Logger {
    return new Logger({
      category: `${this.category}:${category}`,
      correlationId: this.correlationId,
    });
  }

  /**
   * Create a new logger instance with a specific correlation ID
   * Used for request-scoped logging to trace a single operation
   */
  withCorrelationId(correlationId: string): Logger {
    return new Logger({
      category: this.category,
      correlationId,
    });
  }

  /**
   * Generate a new correlation ID (UUID v4)
   */
  static generateCorrelationId(): string {
    return uuidv4();
  }

  /**
   * Emit a log entry to the Rust backend via Tauri IPC
   */
  private emit(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      category: this.category,
      correlation_id: this.correlationId,
      data,
    };

    // Emit to Rust backend (fire-and-forget, non-blocking)
    invoke('emit_log', entry).catch((err) => {
      // Fallback to console if Tauri invoke fails
      console.error('[Logger] Failed to emit log to backend:', err);
      console.log(`[${level.toUpperCase()}] [${this.category}] ${message}`, data);
    });
  }

  trace(message: string, data?: Record<string, unknown>): void {
    this.emit('trace', message, data);
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.emit('debug', message, data);
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.emit('info', message, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.emit('warn', message, data);
  }

  error(message: string, data?: Record<string, unknown>): void {
    this.emit('error', message, data);
  }

  critical(message: string, data?: Record<string, unknown>): void {
    this.emit('critical', message, data);
  }

  /**
   * Generic log method with dynamic level
   */
  log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    this.emit(level, message, data);
  }
}

/**
 * Default application logger
 * Use this directly or create child loggers for specific domains
 */
export const logger = new Logger({ category: 'app' });

/**
 * Subscribe to log events from backend (for live log viewer)
 *
 * @example
 * let unlisten: UnlistenFn;
 * subscribeToLogs((entry) => {
 *   console.log('Live log:', entry);
 * }).then((fn) => {
 *   unlisten = fn;
 * });
 * // Later: unlisten();
 */
export function subscribeToLogs(
  callback: (entry: LogEntry) => void
): Promise<UnlistenFn> {
  return listen<LogEntry>('log', (event) => {
    callback(event.payload);
  });
}

/**
 * Create a request-scoped logger with a new correlation ID
 *
 * @example
 * const requestLogger = createRequestLogger();
 * requestLogger.info('Starting request');
 * // Use requestLogger.withCorrelationId() to propagate the same ID
 */
export function createRequestLogger(correlationId?: string): Logger {
  return logger.withCorrelationId(correlationId || Logger.generateCorrelationId());
}

// Re-export for convenience
export { Logger };