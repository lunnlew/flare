/**
 * Scripts Store - Pre-request and post-response scripts state
 *
 * Key Patterns:
 * 1. Per-endpoint state via endpointScripts map - each endpoint stores its own scripts
 * 2. currentEndpointId is sourced from requestStore (single source of truth)
 * 3. Persisted to localStorage
 * 4. Actions colocated with state they manage
 * 5. Supports multiple interceptor stages: preBuild, preSend, postResponse, postError
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import { useRequestStore } from './requestStore';
import { logger } from '../utils/logger';

const scriptLogger = logger.child('scripts');

export type ScriptLogLevel = 'info' | 'warn' | 'error';
export type InterceptorStage = 'preBuild' | 'preSend' | 'postResponse' | 'postError';

export interface ScriptLog {
  time: Date;
  level: ScriptLogLevel;
  message: string;
  stack?: string; // Error stack trace if available
}

export interface Interceptor {
  id: string;
  name: string;
  stage: InterceptorStage;
  script: string;
  enabled: boolean;
  order: number;
}

// Per-endpoint script data
interface EndpointScriptData {
  preRequestScript: string;
  postResponseScript: string;
  scriptEnabled: boolean;
  interceptors: Interceptor[];
}

interface ScriptsState {
  // Per-endpoint state map
  endpointScripts: Record<string, EndpointScriptData>;
  // Console logs (transient, not persisted)
  scriptConsole: ScriptLog[];
}

interface ScriptsActions {
  // Get current endpoint's script data
  getCurrentScripts: () => EndpointScriptData;
  // Legacy actions (use current endpoint from requestStore)
  setPreRequestScript: (script: string) => void;
  setPostResponseScript: (script: string) => void;
  setScriptEnabled: (enabled: boolean) => void;
  // Interceptor actions
  addInterceptor: (interceptor: Omit<Interceptor, 'id'>) => void;
  updateInterceptor: (id: string, updates: Partial<Interceptor>) => void;
  removeInterceptor: (id: string) => void;
  reorderInterceptors: (ids: string[]) => void;
  // Console actions
  setScriptConsole: (logs: ScriptLog[] | ((prev: ScriptLog[]) => ScriptLog[])) => void;
  addScriptLog: (log: Omit<ScriptLog, 'time'>) => void;
  clearScriptConsole: () => void;
  resetScripts: () => void;
}

type ScriptsStore = ScriptsState & ScriptsActions;

// Default script data for new endpoints
const getDefaultEndpointScripts = (): EndpointScriptData => ({
  preRequestScript: '',
  postResponseScript: '',
  scriptEnabled: true,
  interceptors: [],
});

const initialState: ScriptsState = {
  endpointScripts: {},
  scriptConsole: [],
};

// Helper to get current endpoint ID from requestStore (single source of truth)
const getCurrentEndpointId = (): string | null => {
  return useRequestStore.getState().currentEndpointId;
};

export const useScriptsStore = create<ScriptsStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      getCurrentScripts: () => {
        const currentEndpointId = getCurrentEndpointId();
        if (!currentEndpointId) return getDefaultEndpointScripts();
        const state = get();
        return state.endpointScripts[currentEndpointId] || getDefaultEndpointScripts();
      },

      setPreRequestScript: (preRequestScript) => set((state) => {
        const currentEndpointId = getCurrentEndpointId();
        if (!currentEndpointId) return state;
        const current = state.endpointScripts[currentEndpointId] || getDefaultEndpointScripts();
        return {
          endpointScripts: {
            ...state.endpointScripts,
            [currentEndpointId]: { ...current, preRequestScript }
          }
        };
      }),

      setPostResponseScript: (postResponseScript) => set((state) => {
        const currentEndpointId = getCurrentEndpointId();
        if (!currentEndpointId) return state;
        const current = state.endpointScripts[currentEndpointId] || getDefaultEndpointScripts();
        return {
          endpointScripts: {
            ...state.endpointScripts,
            [currentEndpointId]: { ...current, postResponseScript }
          }
        };
      }),

      setScriptEnabled: (scriptEnabled) => set((state) => {
        const currentEndpointId = getCurrentEndpointId();
        if (!currentEndpointId) return state;
        const current = state.endpointScripts[currentEndpointId] || getDefaultEndpointScripts();
        return {
          endpointScripts: {
            ...state.endpointScripts,
            [currentEndpointId]: { ...current, scriptEnabled }
          }
        };
      }),

      addInterceptor: (interceptor) => set((state) => {
        const currentEndpointId = getCurrentEndpointId();
        if (!currentEndpointId) return state;
        const current = state.endpointScripts[currentEndpointId] || getDefaultEndpointScripts();
        return {
          endpointScripts: {
            ...state.endpointScripts,
            [currentEndpointId]: {
              ...current,
              interceptors: [...current.interceptors, { ...interceptor, id: `int_${Date.now()}` }]
            }
          }
        };
      }),

      updateInterceptor: (id, updates) => set((state) => {
        const currentEndpointId = getCurrentEndpointId();
        if (!currentEndpointId) return state;
        const current = state.endpointScripts[currentEndpointId] || getDefaultEndpointScripts();
        return {
          endpointScripts: {
            ...state.endpointScripts,
            [currentEndpointId]: {
              ...current,
              interceptors: current.interceptors.map(i => i.id === id ? { ...i, ...updates } : i)
            }
          }
        };
      }),

      removeInterceptor: (id) => set((state) => {
        const currentEndpointId = getCurrentEndpointId();
        if (!currentEndpointId) return state;
        const current = state.endpointScripts[currentEndpointId] || getDefaultEndpointScripts();
        return {
          endpointScripts: {
            ...state.endpointScripts,
            [currentEndpointId]: {
              ...current,
              interceptors: current.interceptors.filter(i => i.id !== id)
            }
          }
        };
      }),

      reorderInterceptors: (ids) => set((state) => {
        const currentEndpointId = getCurrentEndpointId();
        if (!currentEndpointId) return state;
        const current = state.endpointScripts[currentEndpointId] || getDefaultEndpointScripts();
        const orderMap = new Map(ids.map((id, idx) => [id, idx]));
        return {
          endpointScripts: {
            ...state.endpointScripts,
            [currentEndpointId]: {
              ...current,
              interceptors: current.interceptors
                .map(i => ({ ...i, order: orderMap.get(i.id) ?? i.order }))
                .sort((a, b) => a.order - b.order)
            }
          }
        };
      }),

      setScriptConsole: (logsOrFn) => set((state) => ({
        scriptConsole: typeof logsOrFn === 'function'
          ? logsOrFn(state.scriptConsole)
          : logsOrFn
      })),

      addScriptLog: (log) => {
        // Emit to unified logging system
        scriptLogger.log(log.level, log.message, { stack: log.stack });

        set((state) => ({
          scriptConsole: [...state.scriptConsole, { ...log, time: new Date() }]
        }));
      },

      clearScriptConsole: () => set({ scriptConsole: [] }),
      resetScripts: () => set(initialState),
    }), {
      name: 'flare-scripts',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        endpointScripts: state.endpointScripts,
      }),
    }
  )
);

// Convenience selectors
export const useScriptsState = () => {
  const store = useScriptsStore(useShallow((s) => ({
    endpointScripts: s.endpointScripts,
    scriptConsole: s.scriptConsole,
  })));

  const currentEndpointId = useRequestStore((s) => s.currentEndpointId);

  const currentScripts = currentEndpointId
    ? store.endpointScripts[currentEndpointId] || getDefaultEndpointScripts()
    : getDefaultEndpointScripts();

  return {
    preRequestScript: currentScripts.preRequestScript,
    postResponseScript: currentScripts.postResponseScript,
    scriptEnabled: currentScripts.scriptEnabled,
    interceptors: currentScripts.interceptors,
    scriptConsole: store.scriptConsole,
    currentEndpointId,
  };
};

export const useScriptsActions = () => useScriptsStore(
  useShallow((s) => ({
    getCurrentScripts: s.getCurrentScripts,
    setPreRequestScript: s.setPreRequestScript,
    setPostResponseScript: s.setPostResponseScript,
    setScriptEnabled: s.setScriptEnabled,
    addInterceptor: s.addInterceptor,
    updateInterceptor: s.updateInterceptor,
    removeInterceptor: s.removeInterceptor,
    reorderInterceptors: s.reorderInterceptors,
    setScriptConsole: s.setScriptConsole,
    addScriptLog: s.addScriptLog,
    clearScriptConsole: s.clearScriptConsole,
  }))
);