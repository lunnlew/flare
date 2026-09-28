/**
 * Response Store - Response data and comparison state
 *
 * Key Patterns:
 * 1. Per-endpoint response isolation via endpointResponses map
 * 2. currentEndpointId is sourced from requestStore (single source of truth)
 * 3. Response data persisted with size limits
 * 4. UI state persisted for user convenience
 * 5. Atomic subscriptions - components subscribe only to what they need
 * 6. Actions colocated with state they manage
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import type { ResponseData } from '../types/api';
import { useRequestStore } from './requestStore';

// ============================================================================
// Type Definitions
// ============================================================================

export type ResponseTab = "body" | "headers" | "timeline" | "compare";
export type ResponseView = "pretty" | "raw" | "preview";

// Per-endpoint response data (persisted with size limits)
interface EndpointResponseData {
  response: ResponseData | null;
  error: string | null;
  compareResponse: ResponseData | null;
}

interface ResponseState {
  // Per-endpoint response data map
  endpointResponses: Record<string, EndpointResponseData>;

  // Response history (global, persisted)
  responseHistory: ResponseData[];

  // UI state for response panel (global, persisted)
  activeTab: ResponseTab;
  responseView: ResponseView;
  showSearch: boolean;
  searchQuery: string;

  // Loading state (transient)
  isLoading: boolean;

  // History panel state (global, not persisted)
  historyFocusedId: string | null;
  favoritesOnly: boolean;
}

interface ResponseActions {
  // Get current endpoint's response data
  getCurrentResponse: () => EndpointResponseData;

  // Response data actions (use current endpoint from requestStore)
  setResponse: (response: ResponseData | null) => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  clearResponse: () => void;

  // History actions (global)
  setResponseHistory: (history: ResponseData[] | ((prev: ResponseData[]) => ResponseData[])) => void;
  addToHistory: (response: ResponseData) => void;

  // UI state actions (global)
  setActiveTab: (tab: ResponseTab) => void;
  setResponseView: (view: ResponseView) => void;
  setShowSearch: (show: boolean) => void;
  setSearchQuery: (query: string) => void;

  // Compare actions (use current endpoint from requestStore)
  setCompareResponse: (response: ResponseData | null) => void;
  clearCompare: () => void;

  // History panel actions (global)
  setHistoryFocusedId: (id: string | null) => void;
  setFavoritesOnly: (favoritesOnly: boolean) => void;
  toggleFavorite: (responseId: string) => void;
}

type ResponseStore = ResponseState & ResponseActions;

// Default response data for new endpoints
const getDefaultEndpointResponse = (): EndpointResponseData => ({
  response: null,
  error: null,
  compareResponse: null,
});

// Helper to get current endpoint ID from requestStore (single source of truth)
const getCurrentEndpointId = (): string | null => {
  return useRequestStore.getState().currentEndpointId;
};

export const useResponseStore = create<ResponseStore>()(
  persist(
    (set, get) => ({
      // Initial state
      endpointResponses: {},

      responseHistory: [],

      activeTab: "body",
      responseView: "pretty",
      showSearch: false,
      searchQuery: "",

      isLoading: false,

      historyFocusedId: null,
      favoritesOnly: false,

      // Get current endpoint's response data
      getCurrentResponse: () => {
        const currentEndpointId = getCurrentEndpointId();
        if (!currentEndpointId) return getDefaultEndpointResponse();
        const state = get();
        return state.endpointResponses[currentEndpointId] || getDefaultEndpointResponse();
      },

      // Response data actions (per-endpoint)
      setResponse: (response) => set((state) => {
        const currentEndpointId = getCurrentEndpointId();
        if (!currentEndpointId) return state;
        const current = state.endpointResponses[currentEndpointId] || getDefaultEndpointResponse();
        return {
          endpointResponses: {
            ...state.endpointResponses,
            [currentEndpointId]: { ...current, response }
          }
        };
      }),

      setError: (error) => set((state) => {
        const currentEndpointId = getCurrentEndpointId();
        if (!currentEndpointId) return state;
        const current = state.endpointResponses[currentEndpointId] || getDefaultEndpointResponse();
        return {
          endpointResponses: {
            ...state.endpointResponses,
            [currentEndpointId]: { ...current, error }
          }
        };
      }),

      setLoading: (isLoading) => set({ isLoading }),

      clearResponse: () => set((state) => {
        const currentEndpointId = getCurrentEndpointId();
        if (!currentEndpointId) return { isLoading: false };
        const current = state.endpointResponses[currentEndpointId] || getDefaultEndpointResponse();
        return {
          endpointResponses: {
            ...state.endpointResponses,
            [currentEndpointId]: { ...current, response: null, error: null }
          },
          isLoading: false
        };
      }),

      // History actions (global)
      setResponseHistory: (historyOrFn) => set((state) => ({
        responseHistory: typeof historyOrFn === 'function'
          ? historyOrFn(state.responseHistory || [])
          : historyOrFn
      })),

      addToHistory: (response) => set((state) => ({
        responseHistory: [response, ...(state.responseHistory || [])].slice(0, 50)
      })),

      // UI state actions (global)
      setActiveTab: (activeTab) => set({ activeTab }),
      setResponseView: (responseView) => set({ responseView }),
      setShowSearch: (showSearch) => set({ showSearch }),
      setSearchQuery: (searchQuery) => set({ searchQuery }),

      // Compare actions (per-endpoint)
      setCompareResponse: (compareResponse) => set((state) => {
        const currentEndpointId = getCurrentEndpointId();
        if (!currentEndpointId) return state;
        const current = state.endpointResponses[currentEndpointId] || getDefaultEndpointResponse();
        return {
          endpointResponses: {
            ...state.endpointResponses,
            [currentEndpointId]: { ...current, compareResponse }
          }
        };
      }),

      clearCompare: () => set((state) => {
        const currentEndpointId = getCurrentEndpointId();
        if (!currentEndpointId) return state;
        const current = state.endpointResponses[currentEndpointId] || getDefaultEndpointResponse();
        return {
          endpointResponses: {
            ...state.endpointResponses,
            [currentEndpointId]: { ...current, compareResponse: null }
          }
        };
      }),

      // History panel actions (global)
      setHistoryFocusedId: (historyFocusedId) => set({ historyFocusedId }),
      setFavoritesOnly: (favoritesOnly) => set({ favoritesOnly }),
      toggleFavorite: (responseId) => set((state) => ({
        responseHistory: state.responseHistory.map((r) =>
          r.id === responseId ? { ...r, isFavorite: !r.isFavorite } : r
        )
      })),
    }),
    {
      name: 'flare-response-state',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => {
        // Persist endpoint responses with size limits to avoid localStorage overflow
        // Limit each response body to ~500KB to stay within localStorage ~5MB limit
        const MAX_BODY_SIZE = 500 * 1024;
        const persistedEndpointResponses: Record<string, EndpointResponseData> = {};

        for (const [endpointId, data] of Object.entries(state.endpointResponses)) {
          const persisted: EndpointResponseData = {
            response: null,
            error: data.error,
            compareResponse: null,
          };

          if (data.response) {
            // Only persist if body is under size limit
            if (data.response.body && data.response.body.length <= MAX_BODY_SIZE) {
              persisted.response = data.response;
            }
            // If body is too large, response will be null (user can re-send request)
          }

          persistedEndpointResponses[endpointId] = persisted;
        }

        return {
          // Persist endpoint response data (with size limits)
          endpointResponses: persistedEndpointResponses,
          // UI state
          responseHistory: state.responseHistory,
          activeTab: state.activeTab,
          responseView: state.responseView,
          showSearch: state.showSearch,
          searchQuery: state.searchQuery,
          favoritesOnly: state.favoritesOnly,
        };
      },
    }
  )
);

// ============================================================================
// Convenience Selectors
// ============================================================================

/**
 * Response data selector - gets current endpoint's response
 */
export const useResponseData = () => {
  const store = useResponseStore(useShallow((s) => ({
    responseHistory: s.responseHistory,
    isLoading: s.isLoading,
    endpointResponses: s.endpointResponses,
  })));

  const currentEndpointId = useRequestStore((s) => s.currentEndpointId);

  const currentResponse = currentEndpointId
    ? (store.endpointResponses[currentEndpointId] || getDefaultEndpointResponse())
    : getDefaultEndpointResponse();

  return {
    response: currentResponse.response,
    error: currentResponse.error,
    isLoading: store.isLoading,
    responseHistory: store.responseHistory,
    currentEndpointId,
  };
};

/**
 * Response UI state selector (global)
 */
export const useResponseUI = () => useResponseStore(
  useShallow((s) => ({
    activeTab: s.activeTab,
    responseView: s.responseView,
    showSearch: s.showSearch,
    searchQuery: s.searchQuery,
  }))
);

/**
 * Response UI actions selector
 */
export const useResponseUIActions = () => useResponseStore(
  useShallow((s) => ({
    setActiveTab: s.setActiveTab,
    setResponseView: s.setResponseView,
    setShowSearch: s.setShowSearch,
    setSearchQuery: s.setSearchQuery,
  }))
);

/**
 * Compare state selector - per-endpoint compare response
 */
export const useCompareData = () => {
  const store = useResponseStore(useShallow((s) => ({
    endpointResponses: s.endpointResponses,
  })));

  const currentEndpointId = useRequestStore((s) => s.currentEndpointId);

  const currentResponse = currentEndpointId
    ? (store.endpointResponses[currentEndpointId] || getDefaultEndpointResponse())
    : getDefaultEndpointResponse();

  return {
    compareResponse: currentResponse.compareResponse,
  };
};

/**
 * Compare actions selector
 */
export const useCompareActions = () => useResponseStore(
  useShallow((s) => ({
    setCompareResponse: s.setCompareResponse,
    clearCompare: s.clearCompare,
  }))
);