/**
 * Environment Store - Multiple environments with variable groups
 *
 * Key Patterns:
 * 1. Multiple named environments (Dev, Staging, Prod, etc.)
 * 2. Each environment has variable groups
 * 3. Switch between environments via selectedEnv
 * 4. Variables substitution: resolved from selected environment
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getEnvConfig, saveEnvConfig } from '../services/api';
import { toast } from './notificationStore';
import { t } from '../utils/i18n';
import { useSettingsStore } from './settingsStore';
import { logger } from '../utils/logger';

const envLogger = logger.child('environment');

export interface Variable {
  key: string;
  value: string;
  enabled?: boolean;
}

export interface VariableGroup {
  name: string;
  variables: Variable[];
}

export interface Environment {
  name: string;
  groups: VariableGroup[];
}

// Type guard for raw API environment data (handles untyped API responses)
function isValidEnvData(e: unknown): e is { name: string; variables?: Record<string, unknown> } {
  return typeof e === 'object' && e !== null && 'name' in e && typeof (e as Record<string, unknown>).name === 'string';
}

interface EnvironmentStore {
  environments: Environment[];
  selectedEnv: string;
  canvasEnv: string;
  editingEnv: string;
  isLoading: boolean;
  setEnvironments: (environments: Environment[]) => void;
  setSelectedEnv: (selectedEnv: string) => void;
  setCanvasEnv: (canvasEnv: string) => void;
  setEditingEnv: (editingEnv: string) => void;
  loadEnvironments: () => Promise<void>;
  createEnvironment: (name: string) => Promise<void>;
  deleteEnvironment: (name: string) => Promise<void>;
  renameEnvironment: (oldName: string, newName: string) => Promise<void>;
  duplicateEnvironment: (name: string) => Promise<void>;
  moveEnvironment: (fromIndex: number, toIndex: number) => Promise<void>;
  addGroup: (envName: string, groupName: string) => Promise<void>;
  deleteGroup: (envName: string, groupName: string) => Promise<void>;
  renameGroup: (envName: string, oldName: string, newName: string) => Promise<void>;
  updateVariable: (envName: string, groupName: string, key: string, value: string) => Promise<void>;
  toggleVariableEnabled: (envName: string, groupName: string, key: string, enabled: boolean) => Promise<void>;
  deleteVariable: (envName: string, groupName: string, key: string) => Promise<void>;
  setIsLoading: (loading: boolean) => void;
  // Computed helpers
  getCurrentEnv: () => Environment | undefined;
  getVariablesMap: (envName?: string) => Record<string, string>;
  // Import/Export
  exportEnvConfig: () => string;
  importEnvConfig: (json: string) => Promise<{ success: boolean; error?: string }>;
}

export const useEnvironmentStore = create<EnvironmentStore>()(
  persist(
    (set, get) => ({
      environments: [],
      selectedEnv: "",
      canvasEnv: "",
      editingEnv: "",
      isLoading: false,

      setEnvironments: (environments) => set({ environments }),
      setSelectedEnv: (selectedEnv) => set({ selectedEnv }),
      setCanvasEnv: (canvasEnv) => set({ canvasEnv }),
      setEditingEnv: (editingEnv) => set({ editingEnv }),
      setIsLoading: (isLoading) => set({ isLoading }),

      getCurrentEnv: () => {
        const { environments, selectedEnv } = get();
        return environments.find(e => e.name === selectedEnv);
      },

      getVariablesMap: (envName?: string) => {
        const { environments } = get();
        const targetEnv = envName
          ? environments.find(e => e.name === envName)
          : environments.find(e => e.name === get().selectedEnv);
        if (!targetEnv || !targetEnv.groups) return {};
        const result: Record<string, string> = {};
        targetEnv.groups.forEach(group => {
          group.variables.forEach(v => {
            if (v.enabled !== false) {
              result[v.key] = v.value;
            }
          });
        });
        return result;
      },

      exportEnvConfig: () => {
        const { environments, selectedEnv } = get();
        return JSON.stringify({ environments, selectedEnv }, null, 2);
      },

      importEnvConfig: async (json: string) => {
        try {
          const parsed = JSON.parse(json);
          if (!parsed.environments || !Array.isArray(parsed.environments)) {
            return { success: false, error: 'Invalid format: missing environments array' };
          }
          // Validate structure
          for (const env of parsed.environments) {
            if (!env.name || !Array.isArray(env.groups)) {
              return { success: false, error: 'Invalid environment structure' };
            }
            for (const group of env.groups) {
              if (!group.name || !Array.isArray(group.variables)) {
                return { success: false, error: 'Invalid group structure' };
              }
            }
          }
          set({
            environments: parsed.environments,
            selectedEnv: parsed.selectedEnv || parsed.environments[0]?.name || '',
          });
          // Persist to backend
          await saveEnvConfig({
            environments: parsed.environments.map((e: Environment) => ({
              name: e.name,
              variables: e.groups?.reduce((acc: Record<string, string>, g: VariableGroup) => {
                g.variables.forEach(v => {
                  acc[`${g.name}.${v.key}`] = v.value;
                });
                return acc;
              }, {}) || {}
            })),
            selected: parsed.selectedEnv || parsed.environments[0]?.name || '',
          });
          return { success: true };
        } catch (e) {
          return { success: false, error: e instanceof Error ? e.message : 'Parse error' };
        }
      },

      loadEnvironments: async () => {
        set({ isLoading: true });
        try {
          const configs = await getEnvConfig();

          let environments: Environment[] = configs.environments
            .filter(isValidEnvData)
            .map((e) => {
            const variables = Object.entries(e.variables || {}).map(([key, value]) => ({
              key,
              value: String(value)
            }));

            // Check for stored group names
            const groupsKeyEntry = variables.find(v => v.key === '__flare_groups__');
            let storedGroupNames: string[] | null = null;
            if (groupsKeyEntry) {
              try {
                storedGroupNames = JSON.parse(groupsKeyEntry.value);
              } catch (err) {
                envLogger.warn('Failed to parse stored group names', { error: String(err) });
                storedGroupNames = null;
              }
            }

            // If we have stored group names, use them to create groups and distribute variables
            if (storedGroupNames && storedGroupNames.length > 0) {
              const groups: VariableGroup[] = storedGroupNames.map(name => ({
                name,
                variables: [] as Variable[]
              }));
              // Distribute variables to corresponding groups (immutable)
              const distributedGroups = variables
                .filter(v => v.key !== '__flare_groups__')
                .reduce<VariableGroup[]>((acc, v) => {
                  const parts = v.key.split('.');
                  if (parts.length > 1) {
                    const groupName = parts[0];
                    const actualKey = parts.slice(1).join('.');
                    const group = acc.find(g => g.name === groupName);
                    if (group) {
                      return acc.map(g => g.name === groupName
                        ? { ...g, variables: [...g.variables, { key: actualKey, value: v.value }] }
                        : g
                      );
                    }
                  } else if (acc.length > 0) {
                    return acc.map((g, i) => i === 0
                      ? { ...g, variables: [...g.variables, v] }
                      : g
                    );
                  }
                  return acc;
                }, groups);
              return { name: e.name, groups: distributedGroups };
            }

            // Group by first part of key if contains dot, else "Default"
            const groupMap = new Map<string, Variable[]>();
            variables.forEach(v => {
              const parts = v.key.split('.');
              if (parts.length > 1) {
                const groupName = parts[0];
                const actualKey = parts.slice(1).join('.');
                if (!groupMap.has(groupName)) groupMap.set(groupName, []);
                groupMap.get(groupName)!.push({ key: actualKey, value: v.value });
              } else {
                if (!groupMap.has('Default')) groupMap.set('Default', []);
                groupMap.get('Default')!.push(v);
              }
            });

            const groups: VariableGroup[] = [];
            groupMap.forEach((vars, name) => {
              groups.push({ name, variables: vars });
            });

            return { name: e.name, groups };
          });

          // Ensure at least one environment exists (immutable)
          if (environments.length === 0) {
            environments = [{ name: 'Default', groups: [{ name: 'Default', variables: [] }] }];
          } else {
            // Ensure each environment has at least one group (immutable)
            environments = environments.map(env =>
              env.groups.length === 0
                ? { ...env, groups: [{ name: 'Default', variables: [] }] }
                : env
            );
          }

          const defaultEnv = configs.selected || environments[0].name;
          const currentSelectedEnv = get().selectedEnv;
          const currentEditingEnv = get().editingEnv;
          const currentCanvasEnv = get().canvasEnv;
          // Preserve all env selections if they're still valid, otherwise set to default
          const validSelectedEnv = environments.some(e => e.name === currentSelectedEnv)
            ? currentSelectedEnv
            : defaultEnv;
          const validEditingEnv = environments.some(e => e.name === currentEditingEnv)
            ? currentEditingEnv
            : defaultEnv;
          const validCanvasEnv = environments.some(e => e.name === currentCanvasEnv)
            ? currentCanvasEnv
            : defaultEnv;
          set({
            environments,
            selectedEnv: validSelectedEnv,
            canvasEnv: validCanvasEnv,
            editingEnv: validEditingEnv
          });
        } catch (e) {
          toast.error(t('env.loadFailed', useSettingsStore.getState().language));
          set({
            environments: [{ name: 'Default', groups: [{ name: 'Default', variables: [] }] }],
            selectedEnv: 'Default',
            canvasEnv: 'Default',
            editingEnv: 'Default'
          });
        } finally {
          set({ isLoading: false });
        }
      },

      createEnvironment: async (name: string) => {
        if (!name?.trim()) return;
        const { environments } = get();
        if (environments.some(e => e.name === name)) {
          toast.error(t('env.envAlreadyExists', useSettingsStore.getState().language));
          return;
        }

        const updated: Environment[] = [...environments, { name, groups: [{ name: 'Default', variables: [] }] }];
        set({ environments: updated });

        try {
          await saveEnvConfig(getBackendFormat(updated, get().selectedEnv));
        } catch (e) {
          toast.error(t('env.createEnvFailed', useSettingsStore.getState().language));
          await get().loadEnvironments();
        }
      },

      deleteEnvironment: async (name: string) => {
        const { environments, selectedEnv, canvasEnv, editingEnv } = get();
        if (environments.length <= 1) {
          toast.error(t('env.mustKeepOneEnv', useSettingsStore.getState().language));
          return;
        }

        if (!confirm(`确定要删除环境 "${name}" 吗？`)) return;

        const updated = environments.filter(e => e.name !== name);
        const newSelected = selectedEnv === name ? updated[0]?.name || "" : selectedEnv;
        const newCanvas = canvasEnv === name ? updated[0]?.name || "" : canvasEnv;
        const newEditing = editingEnv === name ? updated[0]?.name || "" : editingEnv;
        set({ environments: updated, selectedEnv: newSelected, canvasEnv: newCanvas, editingEnv: newEditing });

        try {
          await saveEnvConfig(getBackendFormat(updated, newSelected));
        } catch (e) {
          toast.error(t('env.deleteEnvFailed', useSettingsStore.getState().language));
          await get().loadEnvironments();
        }
      },

      renameEnvironment: async (oldName: string, newName: string) => {
        if (!newName?.trim()) return;
        const { environments, selectedEnv, canvasEnv, editingEnv } = get();
        if (environments.some(e => e.name === newName && e.name !== oldName)) {
          toast.error(t('env.envNameAlreadyExists', useSettingsStore.getState().language));
          return;
        }

        const updated = environments.map(e =>
          e.name === oldName ? { ...e, name: newName } : e
        );
        set({
          environments: updated,
          selectedEnv: selectedEnv === oldName ? newName : selectedEnv,
          canvasEnv: canvasEnv === oldName ? newName : canvasEnv,
          editingEnv: editingEnv === oldName ? newName : editingEnv,
        });

        try {
          await saveEnvConfig(getBackendFormat(updated, selectedEnv === oldName ? newName : selectedEnv));
        } catch (e) {
          toast.error(t('env.renameEnvFailed', useSettingsStore.getState().language));
          await get().loadEnvironments();
        }
      },

      duplicateEnvironment: async (name: string) => {
        const { environments } = get();
        const sourceEnv = environments.find(e => e.name === name);
        if (!sourceEnv) {
          toast.error(t('env.envNotFound', useSettingsStore.getState().language));
          return;
        }

        let newName = `Copy of ${name}`;
        let counter = 1;
        while (environments.some(e => e.name === newName)) {
          counter++;
          newName = `Copy ${counter} of ${name}`;
        }

        const duplicated: Environment = {
          name: newName,
          groups: sourceEnv.groups.map(g => ({
            name: g.name,
            variables: g.variables.map(v => ({ ...v }))
          }))
        };

        const updated = [...environments, duplicated];
        set({ environments: updated });

        try {
          await saveEnvConfig(getBackendFormat(updated, get().selectedEnv));
          toast.success(`已复制环境为 "${newName}"`);
        } catch (e) {
          toast.error(t('env.copyEnvFailed', useSettingsStore.getState().language));
          await get().loadEnvironments();
        }
      },

      moveEnvironment: async (fromIndex: number, toIndex: number) => {
        const { environments } = get();
        if (fromIndex < 0 || fromIndex >= environments.length) return;
        if (toIndex < 0 || toIndex >= environments.length) return;
        if (fromIndex === toIndex) return;

        const item = environments[fromIndex];
        const reordered = [
          ...environments.slice(0, fromIndex),
          ...environments.slice(fromIndex + 1).slice(0, toIndex),
          item,
          ...environments.slice(fromIndex + 1).slice(toIndex),
        ];
        set({ environments: reordered });

        try {
          await saveEnvConfig(getBackendFormat(reordered, get().selectedEnv));
        } catch (e) {
          toast.error(t('env.sortEnvFailed', useSettingsStore.getState().language));
          await get().loadEnvironments();
        }
      },

      addGroup: async (envName: string, groupName: string) => {
        const { environments } = get();
        const env = environments.find(e => e.name === envName);
        if (!env) return;
        if (env.groups.some(g => g.name === groupName)) {
          toast.error(t('env.groupAlreadyExists', useSettingsStore.getState().language));
          return;
        }

        const updated = environments.map(e =>
          e.name === envName
            ? { ...e, groups: [...e.groups, { name: groupName, variables: [] }] }
            : e
        );
        set({ environments: updated });

        try {
          await saveEnvConfig(getBackendFormat(updated, get().selectedEnv));
        } catch (e) {
          toast.error(t('env.addGroupFailed', useSettingsStore.getState().language));
          await get().loadEnvironments();
        }
      },

      deleteGroup: async (envName: string, groupName: string) => {
        const { environments } = get();
        const env = environments.find(e => e.name === envName);
        if (!env) return;
        if (env.groups.length <= 1) {
          toast.error(t('env.mustKeepOneGroup', useSettingsStore.getState().language));
          return;
        }

        if (!confirm(`确定要删除分组 "${groupName}" 吗？`)) return;

        const updated = environments.map(e =>
          e.name === envName
            ? { ...e, groups: e.groups.filter(g => g.name !== groupName) }
            : e
        );
        set({ environments: updated });

        try {
          await saveEnvConfig(getBackendFormat(updated, get().selectedEnv));
        } catch (e) {
          toast.error(t('env.deleteGroupFailed', useSettingsStore.getState().language));
          await get().loadEnvironments();
        }
      },

      renameGroup: async (envName: string, oldName: string, newName: string) => {
        if (!newName?.trim()) return;
        const { environments } = get();
        const env = environments.find(e => e.name === envName);
        if (!env) return;
        if (env.groups.some(g => g.name === newName && g.name !== oldName)) {
          toast.error(t('env.groupNameAlreadyExists', useSettingsStore.getState().language));
          return;
        }

        const updated = environments.map(e =>
          e.name === envName
            ? { ...e, groups: e.groups.map(g => g.name === oldName ? { ...g, name: newName } : g) }
            : e
        );
        set({ environments: updated });

        try {
          await saveEnvConfig(getBackendFormat(updated, get().selectedEnv));
        } catch (e) {
          toast.error(t('env.renameGroupFailed', useSettingsStore.getState().language));
          await get().loadEnvironments();
        }
      },

      updateVariable: async (envName: string, groupName: string, key: string, value: string) => {
        if (!key?.trim()) return;
        const { environments } = get();

        const updated = environments.map(env => {
          if (env.name !== envName) return env;
          return {
            ...env,
            groups: env.groups.map(group => {
              if (group.name !== groupName) return group;
              const existingIdx = group.variables.findIndex(v => v.key === key);
              if (existingIdx >= 0) {
                const newVars = group.variables.map((v, i) =>
                  i === existingIdx ? { key, value, enabled: v.enabled } : v
                );
                return { ...group, variables: newVars };
              } else {
                return { ...group, variables: [...group.variables, { key, value }] };
              }
            })
          };
        });

        set({ environments: updated });

        try {
          await saveEnvConfig(getBackendFormat(updated, get().selectedEnv));
        } catch (e) {
          toast.error(t('env.saveVarFailed', useSettingsStore.getState().language));
          await get().loadEnvironments();
        }
      },

      toggleVariableEnabled: async (envName: string, groupName: string, key: string, enabled: boolean) => {
        const { environments } = get();

        const updated = environments.map(env => {
          if (env.name !== envName) return env;
          return {
            ...env,
            groups: env.groups.map(group => {
              if (group.name !== groupName) return group;
              const existingIdx = group.variables.findIndex(v => v.key === key);
              if (existingIdx >= 0) {
                const newVars = group.variables.map((v, i) =>
                  i === existingIdx ? { ...v, enabled } : v
                );
                return { ...group, variables: newVars };
              }
              return group;
            })
          };
        });
        set({ environments: updated });

        try {
          await saveEnvConfig(getBackendFormat(updated, get().selectedEnv));
        } catch (e) {
          toast.error(t('env.toggleVarFailed', useSettingsStore.getState().language));
          await get().loadEnvironments();
        }
      },

      deleteVariable: async (envName: string, groupName: string, key: string) => {
        if (!key?.trim()) return;
        const { environments } = get();

        const updated = environments.map(env => {
          if (env.name !== envName) return env;
          return {
            ...env,
            groups: env.groups.map(group => {
              if (group.name !== groupName) return group;
              return { ...group, variables: group.variables.filter(v => v.key !== key) };
            })
          };
        });
        set({ environments: updated });

        try {
          await saveEnvConfig(getBackendFormat(updated, get().selectedEnv));
        } catch (e) {
          toast.error(t('env.deleteVarFailed', useSettingsStore.getState().language));
          await get().loadEnvironments();
        }
      },
    }),
    {
      name: 'flare-env-state',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        environments: state.environments,
        selectedEnv: state.selectedEnv,
        canvasEnv: state.canvasEnv,
        editingEnv: state.editingEnv,
      }),
    }
  )
);

// Helper function to convert to backend format
function getBackendFormat(envs: Environment[], selected: string) {
  const environments = envs.map(env => {
    const variables: Record<string, string> = {};
    // Store group names in a special key
    if (env.groups.length > 0) {
      variables['__flare_groups__'] = JSON.stringify(env.groups.map(g => g.name));
    }
    env.groups.forEach(group => {
      group.variables.forEach(v => {
        if (env.groups.length > 1) {
          variables[`${group.name}.${v.key}`] = v.value;
        } else {
          variables[v.key] = v.value;
        }
      });
    });
    return { name: env.name, variables };
  });

  return { environments, selected };
}