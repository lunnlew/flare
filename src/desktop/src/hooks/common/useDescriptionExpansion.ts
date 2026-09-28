import { useToggleSet } from './useToggleSet';

/**
 * Hook for managing description expansion state in key-value editors.
 * Extracted from HeadersPanel, ParamsPanel, BodyPanel duplicate implementations.
 * Built on top of useToggleSet for code reuse.
 */
export function useDescriptionExpansion(initialExpanded: Set<number> = new Set()) {
  const { set: expandedDescriptions, toggle: toggleDescription, has } = useToggleSet<number>(initialExpanded);

  return { expandedDescriptions, toggleDescription, has };
}