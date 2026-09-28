/**
 * Full Export/Import Utility
 *
 * Exports all app data (collections, environments, flows, settings) to a single JSON file.
 * Supports both full replacement and merge modes for import.
 */

import { useCollectionStore } from '../store/collectionStore';
import { useEnvironmentStore } from '../store/environmentStore';
import { useFlowStore } from '../store/flowStore';
import { useSettingsStore } from '../store/settingsStore';

export interface FullExportData {
  version: '1.0';
  type: 'flare-full-export';
  exportedAt: string;
  data: {
    collections: ReturnType<typeof useCollectionStore.getState>['collections'];
    environments: {
      environments: ReturnType<typeof useEnvironmentStore.getState>['environments'];
      selectedEnv: string;
      canvasEnv: string;
      editingEnv: string;
    };
    flows: {
      currentFlowId: string | null;
      currentFlowName: string;
      nodes: ReturnType<typeof useFlowStore.getState>['nodes'];
      edges: ReturnType<typeof useFlowStore.getState>['edges'];
      variables: ReturnType<typeof useFlowStore.getState>['variables'];
    };
    settings: Record<string, unknown>;
  };
}

export interface ImportOptions {
  merge: boolean;
}

/**
 * Import all app data from JSON string
 */
export function importAllData(json: string, options: ImportOptions): { success: boolean; error?: string } {
  try {
    const rawData = JSON.parse(json);

    // Validate basic structure before casting
    if (!rawData ||
        typeof rawData !== 'object' ||
        typeof (rawData as Record<string, unknown>).type !== 'string' ||
        typeof (rawData as Record<string, unknown>).version !== 'string') {
      return { success: false, error: 'Invalid export file format' };
    }

    const data = rawData as FullExportData;

    // Validate format
    if (data.type !== 'flare-full-export' || data.version !== '1.0') {
      return { success: false, error: 'Invalid export file format' };
    }

    if (!data.data || typeof data.data !== 'object') {
      return { success: false, error: 'Missing data in export file' };
    }

    const { collections, environments, flows, settings } = data.data;
    const collectionStore = useCollectionStore.getState();
    const environmentStore = useEnvironmentStore.getState();
    const flowStore = useFlowStore.getState();
    const settingsStore = useSettingsStore.getState();

    // Validate environments structure
    if (environments) {
      if (!Array.isArray(environments.environments)) {
        return { success: false, error: 'Invalid environments data structure' };
      }
    }

    // Validate collections structure
    if (collections && !Array.isArray(collections)) {
      return { success: false, error: 'Invalid collections data structure' };
    }

    // Validate flows structure
    if (flows) {
      if (flows.nodes && !Array.isArray(flows.nodes)) {
        return { success: false, error: 'Invalid flow nodes data structure' };
      }
      if (flows.edges && !Array.isArray(flows.edges)) {
        return { success: false, error: 'Invalid flow edges data structure' };
      }
    }

    // Import settings first (may trigger reload)
    if (settings) {
      const result = settingsStore.importSettings(JSON.stringify(settings));
      if (!result.success) {
        return { success: false, error: `Settings import failed: ${result.error}` };
      }
    }

    // Import environments
    if (environments) {
      // environments.environments is already in store format:
      // { name: string; groups: { name: string; variables: { key, value, enabled }[] }[] }
      const storeEnvs = environments.environments || [];

      if (options.merge) {
        const existingEnvs = environmentStore.environments;
        const newEnvs = storeEnvs.filter(
          (e) => !existingEnvs.some((ex) => ex.name === e.name)
        );
        environmentStore.setEnvironments([...existingEnvs, ...newEnvs]);
      } else {
        environmentStore.setEnvironments(storeEnvs);
      }
      environmentStore.setSelectedEnv(environments.selectedEnv || '');
      environmentStore.setCanvasEnv(environments.canvasEnv || '');
      environmentStore.setEditingEnv(environments.editingEnv || '');
    }

    // Import collections
    if (collections) {
      if (options.merge) {
        // Merge mode: add to existing collections
        const existingIds = new Set(collectionStore.collections.map((c) => c.id));
        const newCollections = collections.filter((c) => !existingIds.has(c.id));
        collectionStore.setCollections([...collectionStore.collections, ...newCollections]);
      } else {
        // Replace mode: clear and import
        collectionStore.setCollections(collections);
      }
    }

    // Import flows
    if (flows) {
      flowStore.setCurrentFlowId(flows.currentFlowId);
      flowStore.setCurrentFlowName(flows.currentFlowName || 'Imported Flow');
      flowStore.setNodes(Array.isArray(flows.nodes) ? flows.nodes : []);
      flowStore.setEdges(Array.isArray(flows.edges) ? flows.edges : []);
      flowStore.setVariables(
        flows.variables &&
        typeof flows.variables === 'object' &&
        !Array.isArray(flows.variables)
          ? flows.variables as Record<string, string>
          : {}
      );
    }

    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Parse error' };
  }
}

/**
 * Download export file
 */
export function downloadExportFile(json: string, filename?: string) {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `flare-backup-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } finally {
    URL.revokeObjectURL(url);
  }
}