import { useEffect, useRef } from "react";
import { useCollectionStore } from "../../store";

/**
 * useApiLoader - Loads APIs from backend with optimistic loading
 *
 * Optimistic loading pattern:
 * 1. Wait for store hydration (localStorage restore) before deciding loading state
 * 2. If cached data exists, show immediately and refresh from backend in background
 * 3. If no cache, show loading and fetch from backend
 *
 * This hook calls loadApis from the store which handles API fetching internally.
 * It also maintains the collections array for FlowCanvas compatibility.
 */
export function useApiLoader() {
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const loadApis = useCollectionStore.getState().loadApis;
    loadApis();
  }, []);
}