import { useEffect } from "react";
import { useEnvironmentStore } from "../../store";

/**
 * useEnvironments hook - provides computed environment values
 * Uses EnvironmentStore for state management
 */
export function useEnvironments() {
  const environments = useEnvironmentStore((s) => s.environments);
  const selectedEnv = useEnvironmentStore((s) => s.selectedEnv);
  const loadEnvironments = useEnvironmentStore((s) => s.loadEnvironments);
  const getVariablesMap = useEnvironmentStore((s) => s.getVariablesMap);

  // Load environments on mount if empty or invalid
  useEffect(() => {
    if (!environments || environments.length === 0) {
      loadEnvironments();
    }
  }, []);

  // Get current environment
  const currentEnv = environments.find(e => e.name === selectedEnv);

  // Get variables as Record for URL substitution
  const currentEnvRecord = getVariablesMap();

  return { environments, selectedEnv, currentEnv, currentEnvRecord };
}