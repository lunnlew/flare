import { useState, useEffect, useCallback } from "react";
import type { API } from "../../types/api";
import { useChatStore } from "../../store";

export function useSemanticSearch(apis: API[]) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const searchApis = useChatStore((s) => s.searchApis);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    try {
      const searchResults = await searchApis(q);
      setResults(searchResults);
    }
    catch (e) {
      // Fallback to local filtering
      const lq = q.toLowerCase();
      const m: string[] = [];
      apis.forEach(api => {
        if (api.name.toLowerCase().includes(lq)) { m.push(api.name); return; }
        api.endpoints.forEach(ep => {
          if (ep.path.toLowerCase().includes(lq) || ep.summary?.toLowerCase().includes(lq)) {
            if (!m.includes(api.name)) m.push(api.name);
          }
        });
      });
      setResults(m);
    }
  }, [apis, searchApis]);
  return { query, setQuery, results, search };
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  useEffect(() => {
    try {
      const s = localStorage.getItem("flare-favorites");
      if (s) setFavorites(new Set(JSON.parse(s)));
    } catch (e) {
      // localStorage unavailable (private browsing, quota exceeded) - use in-memory defaults
      console.debug('[useListMode] Failed to load favorites:', e);
    }
  }, []);
  const toggle = useCallback((name: string) => {
    setFavorites(prev => {
      const n = new Set(prev);
      n.has(name) ? n.delete(name) : n.add(name);
      try { localStorage.setItem("flare-favorites", JSON.stringify([...n])); } catch (e) {
        // Best effort - localStorage write failed, favorites won't persist
        console.debug('[useListMode] Failed to save favorites:', e);
      }
      return n;
    });
  }, []);
  return { favorites, toggle };
}