import { useState, useCallback } from "react";

/**
 * Generic hook for managing a Set of items with toggle functionality.
 * Common pattern used in:
 * - EnvVariablesList (hiddenValues)
 * - Workspace (expandedItems)
 * - ExecutionLogPanel (expandedSections)
 * - GraphQLSchemaDocs (expandedTypes)
 *
 * @param initial - Initial Set value (defaults to empty Set)
 */
export function useToggleSet<T = string>(initial: Set<T> = new Set()) {
  const [set, setSet] = useState<Set<T>>(initial);

  const toggle = useCallback((item: T) => {
    setSet((prev) => {
      const next = new Set(prev);
      if (next.has(item)) {
        next.delete(item);
      } else {
        next.add(item);
      }
      return next;
    });
  }, []);

  const add = useCallback((item: T) => {
    setSet((prev) => new Set(prev).add(item));
  }, []);

  const remove = useCallback((item: T) => {
    setSet((prev) => {
      const next = new Set(prev);
      next.delete(item);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setSet(new Set());
  }, []);

  const has = useCallback((item: T) => set.has(item), [set]);

  const toggleAll = useCallback((items: T[]) => {
    setSet((prev) => {
      const next = new Set(prev);
      items.forEach((item) => {
        if (next.has(item)) {
          next.delete(item);
        } else {
          next.add(item);
        }
      });
      return next;
    });
  }, []);

  return { set, toggle, add, remove, clear, has, toggleAll };
}