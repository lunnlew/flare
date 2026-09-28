import { useCallback } from "react";

/**
 * Hook for handling prop-based vs store-based state management pattern.
 * Used in panels like HeadersPanel, ParamsPanel, BodyPanel, AuthPanel.
 *
 * When a prop is provided, use it directly (prop mode).
 * When no prop is provided, fall back to store-based state.
 */
export function usePropOrStore<T>(
  propValue: T | undefined,
  storeGetter: () => T,
  storeSetter?: (value: T) => void
): [T, (value: T) => void | undefined] {
  const storeValue = storeGetter();
  const value = propValue !== undefined ? propValue : storeValue;

  const setter = useCallback(
    (newValue: T) => {
      if (propValue !== undefined) {
        // Prop mode: caller is responsible for handling
        return;
      }
      storeSetter?.(newValue);
    },
    [propValue, storeSetter]
  );

  return [value, setter];
}

/**
 * Check if component is in prop mode (controlled) or store mode (uncontrolled)
 */
export function isPropMode<T>(propValue: T | undefined): boolean {
  return propValue !== undefined;
}