import { useMemo } from 'react';
import type { KeyValue } from '../../constants/http';

interface UseUrlParseConfirmationOptions {
  /** The processed URL with variables substituted */
  processedUrl: string;
}

/**
 * Hook for parsing query parameters from URL.
 * Returns parsed params - component decides whether to show modal or auto-apply.
 */
export function useUrlParseConfirmation({
  processedUrl,
}: UseUrlParseConfirmationOptions): KeyValue[] {
  // Parse URL params from URL string
  const parsedParams = useMemo(() => {
    if (!processedUrl) return [];

    try {
      const urlObj = new URL(processedUrl);
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
  }, [processedUrl]);

  return parsedParams;
}
