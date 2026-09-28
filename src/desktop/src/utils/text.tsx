import { ReactNode } from 'react';

/**
 * Highlight search matches in text by wrapping matched portions in a <mark> element.
 * Used in HistoryPanel, ResponsePanel, and other search-enabled components.
 */
export function highlightText(
  text: string,
  query: string,
  options: {
    escapeRegex?: boolean;
    markStyle?: React.CSSProperties;
  } = {}
): ReactNode {
  if (!query) return text;
  if (!text) return text;

  const { escapeRegex = true, markStyle } = options;

  try {
    const regexPattern = escapeRegex
      ? `(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`
      : `(${query})`;
    const regex = new RegExp(regexPattern, 'gi');
    const parts = text.split(regex);

    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark
          key={i}
          style={{
            backgroundColor: 'var(--warning)',
            color: 'var(--text-inverse)',
            borderRadius: '2px',
            ...markStyle,
          }}
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  } catch {
    return text;
  }
}

/**
 * Truncate a string to a maximum length, adding ellipsis if needed.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Escape regex special characters in a string.
 */
export function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Pretty-print JSON string with 2-space indentation.
 * Returns original string if parsing fails.
 */
export function prettyPrintJson(jsonStr: string): string {
  try {
    return JSON.stringify(JSON.parse(jsonStr), null, 2);
  } catch {
    return jsonStr;
  }
}

/**
 * Pretty-print JSON string with sorted keys (alphabetically).
 * Used for "Preview" view to present organized, sorted output.
 */
export function prettyPrintJsonSorted(jsonStr: string): string {
  try {
    const parsed = JSON.parse(jsonStr);
    return JSON.stringify(sortObjectKeys(parsed), null, 2);
  } catch {
    return jsonStr;
  }
}

/**
 * Recursively sort all keys in an object alphabetically.
 */
function sortObjectKeys(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }
  if (obj !== null && typeof obj === 'object') {
    const sorted: Record<string, any> = {};
    Object.keys(obj).sort().forEach(key => {
      sorted[key] = sortObjectKeys(obj[key]);
    });
    return sorted;
  }
  return obj;
}

/**
 * Format a Date or timestamp to localized string.
 * Handles both Date objects and number/string timestamps.
 */
export function formatDate(timestamp: string | number | Date, options?: Intl.DateTimeFormatOptions): string {
  try {
    const date = typeof timestamp === 'object' ? timestamp : new Date(timestamp);
    return date.toLocaleString(undefined, options);
  } catch {
    return String(timestamp);
  }
}

/**
 * Format headers object to string for clipboard/display.
 * Converts { key: value } entries to "key: value\nkey2: value2" format.
 */
export function formatHeaders(headers: Record<string, string | string[] | undefined>): string {
  return Object.entries(headers)
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
    .join('\n');
}