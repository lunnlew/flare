/**
 * useVariableValidation - Hook for detecting undefined variables in real-time
 *
 * Provides:
 * 1. Real-time undefined variable detection
 * 2. Visual warnings for undefined variables
 * 3. Variable usage tracking
 */

import { useMemo, useCallback, useState } from 'react';
import { useEnvironmentStore } from '../../store/environmentStore';
import { useSettingsStore } from '../../store';
import { useTranslation } from '../../utils/i18n';
import {
  extractVariableReferences,
  findUndefinedVariables,
  UndefinedVariable,
  VariableReference,
} from '../../utils/variable-utils';

interface UseVariableValidationOptions {
  /** Enable real-time validation */
  enabled?: boolean;
  /** Custom variable sources (in addition to environment) */
  additionalVariables?: Set<string>;
  /** Global variables set */
  globalVariables?: Set<string>;
}

interface VariableValidationResult {
  /** All variable references found */
  references: VariableReference[];
  /** Variables that are not defined */
  undefinedVariables: UndefinedVariable[];
  /** Total count of references */
  totalCount: number;
  /** Count of undefined variables */
  undefinedCount: number;
  /** Whether there are any issues */
  hasIssues: boolean;
}

/**
 * Hook for validating variable usage in text
 */
export function useVariableValidation(
  text: string,
  options: UseVariableValidationOptions = {}
) {
  const { enabled = true, additionalVariables, globalVariables } = options;

  const environments = useEnvironmentStore(state => state.environments);
  const selectedEnv = useEnvironmentStore(state => state.selectedEnv);

  const result = useMemo((): VariableValidationResult => {
    if (!enabled || !text) {
      return {
        references: [],
        undefinedVariables: [],
        totalCount: 0,
        undefinedCount: 0,
        hasIssues: false,
      };
    }

    // Get all defined variables from current environment
    const definedVars = new Set<string>();

    // Add variables from current environment
    const currentEnv = environments.find(e => e.name === selectedEnv);
    if (currentEnv) {
      currentEnv.groups.forEach(group => {
        group.variables.forEach(v => {
          if (v.enabled !== false) {
            definedVars.add(v.key);
          }
        });
      });
    }

    // Add additional variables
    additionalVariables?.forEach(v => definedVars.add(v));

    // Extract and validate references
    const references = extractVariableReferences(text);
    const undefinedVariables = findUndefinedVariables(text, definedVars, globalVariables);

    return {
      references,
      undefinedVariables,
      totalCount: references.length,
      undefinedCount: undefinedVariables.length,
      hasIssues: undefinedVariables.length > 0,
    };
  }, [text, enabled, environments, selectedEnv, additionalVariables, globalVariables]);

  return result;
}

/**
 * Multiple text validation hook
 */
export function useMultiVariableValidation(
  texts: { [key: string]: string },
  options: UseVariableValidationOptions = {}
) {
  const { enabled = true, additionalVariables, globalVariables } = options;

  const environments = useEnvironmentStore(state => state.environments);
  const selectedEnv = useEnvironmentStore(state => state.selectedEnv);

  const result = useMemo(() => {
    if (!enabled) {
      return {
        allReferences: [] as VariableReference[],
        allUndefined: [] as UndefinedVariable[],
        byField: {} as { [key: string]: VariableValidationResult },
        hasIssues: false,
      };
    }

    // Get defined variables
    const definedVars = new Set<string>();
    const currentEnv = environments.find(e => e.name === selectedEnv);
    if (currentEnv) {
      currentEnv.groups.forEach(group => {
        group.variables.forEach(v => {
          if (v.enabled !== false) {
            definedVars.add(v.key);
          }
        });
      });
    }
    additionalVariables?.forEach(v => definedVars.add(v));

    const byField: { [key: string]: VariableValidationResult } = {};
    let allReferences: VariableReference[] = [];
    let allUndefined: UndefinedVariable[] = [];

    for (const [field, text] of Object.entries(texts)) {
      if (!text) continue;

      const references = extractVariableReferences(text);
      const undefinedVariables = findUndefinedVariables(text, definedVars, globalVariables);

      byField[field] = {
        references,
        undefinedVariables,
        totalCount: references.length,
        undefinedCount: undefinedVariables.length,
        hasIssues: undefinedVariables.length > 0,
      };

      allReferences = [...allReferences, ...references];
      allUndefined = [...allUndefined, ...undefinedVariables];
    }

    return {
      allReferences,
      allUndefined,
      byField,
      hasIssues: allUndefined.length > 0,
    };
  }, [texts, enabled, environments, selectedEnv, additionalVariables, globalVariables]);

  return result;
}

/**
 * Component for displaying variable warnings
 */
export interface VariableWarningProps {
  undefinedVariables: UndefinedVariable[];
  className?: string;
}

export function VariableWarningDisplay({ undefinedVariables, className = '' }: VariableWarningProps) {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);

  if (undefinedVariables.length === 0) return null;

  return (
    <div className={`variable-warning-container ${className}`}>
      <div className="text-xs font-medium mb-1" style={{ color: 'var(--warning)' }}>
        {t('flow.undefinedVariables')}
      </div>
      {undefinedVariables.map((uv, idx) => (
        <div key={idx} className="text-xs pl-2 py-1" style={{ color: 'var(--warning)' }}>
          <span className="font-mono">{uv.fullMatch}</span>
          <span className="ml-2 text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {uv.context}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Hook for tracking variable changes in a request
 */
export function useVariableChangeTracker() {
  const [trackedVariables, setTrackedVariables] = useState<Map<string, Set<string>>>(new Map());

  const trackRequestVariables = useCallback((requestId: string, text: string) => {
    const refs = extractVariableReferences(text);
    const varNames = new Set(refs.map(r => r.name));
    setTrackedVariables(prev => {
      const next = new Map(prev);
      next.set(requestId, varNames);
      return next;
    });
  }, []);

  const removeRequestVariables = useCallback((requestId: string) => {
    setTrackedVariables(prev => {
      const next = new Map(prev);
      next.delete(requestId);
      return next;
    });
  }, []);

  const getVariableRequests = useCallback((variableName: string): string[] => {
    const requests: string[] = [];
    trackedVariables.forEach((vars, requestId) => {
      if (vars.has(variableName)) {
        requests.push(requestId);
      }
    });
    return requests;
  }, [trackedVariables]);

  return {
    trackedVariables,
    trackRequestVariables,
    removeRequestVariables,
    getVariableRequests,
  };
}