/**
 * Dynamic Mock Store - 动态Mock数据生成配置
 *
 * 支持基于请求参数生成动态Mock响应
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { matchesPattern } from '../utils/string';
import type { FieldGenType } from '../utils/mock';
import type { HttpMethod } from '../types';
import {
  addMockCustomRule as apiAddMockCustomRule,
  updateMockCustomRule as apiUpdateMockCustomRule,
  deleteMockCustomRule as apiDeleteMockCustomRule,
  toggleMockCustomRule as apiToggleMockCustomRule,
} from '../services/api';
import { toast } from './notificationStore';

// ============================================================================
// Type Definitions
// ============================================================================

export interface RequestData {
  method: HttpMethod;
  url: string;
  params: Record<string, string>;
  headers: Record<string, string>;
  body?: unknown;
}

export interface DynamicMockTrigger {
  pathPattern?: string;        // URL path regex pattern
  method?: HttpMethod[];      // HTTP methods
  params?: Record<string, string>;  // Required query params
  headers?: Record<string, string>; // Required headers
  bodySchema?: string;         // JSON path to match in body
  // Scenario support
  scenario?: string;           // Scenario name for stateful mocks
  requiredState?: string;     // Required state value to match this rule
}

export interface DynamicMockResponse {
  statusCode: number;
  headers?: Record<string, string>;
  bodyTemplate: string;        // JSON template with {{variable}} placeholders
  delay?: number; // Response delay in ms
  // Scenario response variant
  scenarioState?: string;      // State to set after this response is used
}

export interface DynamicMockVariable {
  paramName: string;           // Name from request (param/header/body path)
  mockRule: FieldGenType;       // Mock generation type
  transform?: string;           // Optional transformation (e.g., 'uppercase')
}

export interface DynamicMockRule {
  id: string;
  name: string;
  enabled: boolean;
  // Trigger conditions
  trigger: DynamicMockTrigger;
  // Response template
  response: DynamicMockResponse;
  // Variable mappings (deprecated - use custom rules instead)
  variables: DynamicMockVariable[];
  // Metadata
  createdAt: string;
  updatedAt: string;
}

// Scenario state entry
export interface ScenarioState {
  scenario: string;
  callCount: number;
  lastState: string;
  createdAt: number;
}

// Response-specific custom rule
export interface ResponseCustomRule {
  id: string;
  variable: string;    // Variable name used in template, e.g., "userEmail"
  targetType: string;   // Target rule type, e.g., "email"
  enabled: boolean;
}

interface DynamicMockStore {
  rules: DynamicMockRule[];
  activeRuleId: string | null;
  isEnabled: boolean;
  // Response-specific custom rules (for {{userEmail}} → email mapping)
  customRules: ResponseCustomRule[];
  // Scenario state for stateful mocks
  scenarioStates: Record<string, ScenarioState>;

  // CRUD operations
  addRule: (rule: Omit<DynamicMockRule, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateRule: (id: string, updates: Partial<DynamicMockRule>) => void;
  deleteRule: (id: string) => void;
  duplicateRule: (id: string) => string | null;

  // Custom rules operations
  addCustomRule: (rule: ResponseCustomRule) => void;
  updateCustomRule: (id: string, updates: Partial<ResponseCustomRule>) => void;
  removeCustomRule: (id: string) => void;
  getRuleByVariable: (variable: string) => ResponseCustomRule | null;

  // Rule management
  setActiveRule: (id: string | null) => void;
  setEnabled: (enabled: boolean) => void;
  reorderRules: (rules: DynamicMockRule[]) => void;

  // Scenario management
  getScenarioState: (scenario: string) => ScenarioState | undefined;
  updateScenarioState: (scenario: string, updates: Partial<ScenarioState>) => void;
  resetScenario: (scenario: string) => void;
  resetAllScenarios: () => void;

  // Matching
  matchRules: (request: RequestData) => DynamicMockRule[];
  getActiveRule: () => DynamicMockRule | null;
}

// ============================================================================
// Helpers
// ============================================================================

function matchTrigger(
  request: RequestData,
  trigger: DynamicMockTrigger,
  scenarioStates: Record<string, ScenarioState>
): boolean {
  // Check method
  if (trigger.method && trigger.method.length > 0) {
    if (!trigger.method.includes(request.method)) {
      return false;
    }
  }

  // Check path pattern
  if (trigger.pathPattern) {
    const urlPath = request.url.split('?')[0];
    if (!matchesPattern(urlPath, trigger.pathPattern)) {
      return false;
    }
  }

  // Check required params
  if (trigger.params) {
    for (const [key, expectedValue] of Object.entries(trigger.params)) {
      const actualValue = request.params[key];
      if (!actualValue || (expectedValue && actualValue !== expectedValue)) {
        return false;
      }
    }
  }

  // Check required headers
  if (trigger.headers) {
    for (const [key, expectedValue] of Object.entries(trigger.headers)) {
      const actualValue = request.headers[key];
      if (!actualValue || (expectedValue && actualValue !== expectedValue)) {
        return false;
      }
    }
  }

  // Check body schema (JSON path)
  if (trigger.bodySchema && request.body) {
    try {
      const bodyStr = JSON.stringify(request.body);
      if (!matchesPattern(bodyStr, trigger.bodySchema)) {
        return false;
      }
    } catch {
      return false;
    }
  }

  // Check scenario state requirements
  if (trigger.scenario && trigger.requiredState) {
    const state = scenarioStates[trigger.scenario];
    if (!state || state.lastState !== trigger.requiredState) {
      return false;
    }
  }

  return true;
}

// ============================================================================
// Store Implementation
// ============================================================================

const DEFAULT_STATE = {
  rules: [] as DynamicMockRule[],
  activeRuleId: null as string | null,
  isEnabled: false,
  customRules: [] as ResponseCustomRule[],
  scenarioStates: {} as Record<string, ScenarioState>,
};

export const useDynamicMockStore = create<DynamicMockStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_STATE,

      addRule: (ruleData) => {
        const id = `dm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date().toISOString();
        const rule: DynamicMockRule = {
          ...ruleData,
          id,
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ rules: [...state.rules, rule] }));
        return id;
      },

      updateRule: (id, updates) => set((state) => ({
        rules: state.rules.map(r =>
          r.id === id
            ? { ...r, ...updates, updatedAt: new Date().toISOString() }
            : r
        ),
      })),

      deleteRule: (id) => set((state) => ({
        rules: state.rules.filter(r => r.id !== id),
        activeRuleId: state.activeRuleId === id ? null : state.activeRuleId,
      })),

      duplicateRule: (id) => {
        const rule = get().rules.find(r => r.id === id);
        if (!rule) return null;
        return get().addRule({
          name: `${rule.name} (copy)`,
          enabled: rule.enabled,
          trigger: { ...rule.trigger },
          response: { ...rule.response },
          variables: [...rule.variables],
        });
      },

      // Custom rules operations (synced with backend)
      addCustomRule: async (rule) => {
        // Sync to backend first
        try {
          await apiAddMockCustomRule(rule.variable, rule.targetType);
          await apiToggleMockCustomRule(rule.variable, rule.enabled);
          // Only update local state after successful sync
          set((state) => ({
            customRules: [...state.customRules, rule]
          }));
        } catch (e) {
          toast.error(`同步自定义规则失败: ${rule.variable}`);
        }
      },

      updateCustomRule: async (id, updates) => {
        const existingRule = get().customRules.find(r => r.id === id);
        if (!existingRule) return;

        // Sync to backend
        try {
          if (updates.variable !== undefined && updates.variable !== existingRule.variable) {
            // Variable changed: delete old, add new
            await apiDeleteMockCustomRule(existingRule.variable);
            await apiAddMockCustomRule(updates.variable, updates.targetType || existingRule.targetType);
            if (updates.enabled !== undefined) {
              await apiToggleMockCustomRule(updates.variable, updates.enabled);
            }
          } else {
            // Just update targetType and/or enabled
            if (updates.targetType !== undefined) {
              await apiUpdateMockCustomRule(existingRule.variable, updates.targetType);
            }
            if (updates.enabled !== undefined) {
              await apiToggleMockCustomRule(existingRule.variable, updates.enabled);
            }
          }
        } catch (e) {
          toast.error(`同步自定义规则更新失败: ${existingRule.variable}`);
          return;
        }

        // Only update local state after successful sync
        set((state) => ({
          customRules: state.customRules.map(r => r.id === id ? { ...r, ...updates } : r)
        }));
      },

      removeCustomRule: async (id) => {
        const rule = get().customRules.find(r => r.id === id);
        if (!rule) return;

        // Sync to backend first
        try {
          await apiDeleteMockCustomRule(rule.variable);
          // Only update local state after successful sync
          set((state) => ({
            customRules: state.customRules.filter(r => r.id !== id)
          }));
        } catch (e) {
          toast.error(`删除自定义规则失败: ${rule.variable}`);
        }
      },

      setActiveRule: (id) => set({ activeRuleId: id }),

      setEnabled: (enabled) => set({ isEnabled: enabled }),

      reorderRules: (rules) => set({ rules }),

      matchRules: (request) => {
        const { rules, scenarioStates } = get();
        return rules.filter(r =>
          r.enabled && matchTrigger(request, r.trigger, scenarioStates)
        );
      },

      getActiveRule: () => {
        const { rules, activeRuleId } = get();
        return activeRuleId
          ? rules.find(r => r.id === activeRuleId) || null
          : null;
      },

      getScenarioState: (scenario: string) => {
        const { scenarioStates } = get();
        return scenarioStates[scenario];
      },

      updateScenarioState: (scenario: string, updates: Partial<ScenarioState>) => {
        set((state) => {
          const existing = state.scenarioStates[scenario];
          if (existing) {
            return {
              scenarioStates: {
                ...state.scenarioStates,
                [scenario]: { ...existing, ...updates },
              },
            };
          } else {
            // Create new scenario state
            const newState: ScenarioState = {
              scenario,
              callCount: 0,
              lastState: '',
              createdAt: Date.now(),
              ...updates,
            };
            return {
              scenarioStates: {
                ...state.scenarioStates,
                [scenario]: newState,
              },
            };
          }
        });
      },

      resetScenario: (scenario: string) => {
        set((state) => {
          const { [scenario]: _, ...rest } = state.scenarioStates;
          return { scenarioStates: rest };
        });
      },

      resetAllScenarios: () => set({ scenarioStates: {} }),

      getRuleByVariable: (variable: string) => {
        const { customRules } = get();
        return customRules.find(r => r.variable === variable && r.enabled) || null;
      },
    }),
    {
      name: 'flare-dynamic-mock',
      storage: createJSONStorage(() => localStorage),
    }
  )
);