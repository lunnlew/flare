import { useEffect, RefObject } from 'react';

/**
 * Hook for detecting clicks outside of a container element.
 * Extracted from duplicate implementations in useVariableAutocomplete,
 * useFlowVariableAutocomplete, Workspace, RequestBuilder.
 */
export function useClickOutside(
  containerRef: RefObject<HTMLElement | null>,
  callback: () => void
): void {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        callback();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [containerRef, callback]);
}