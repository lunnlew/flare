/**
 * Full Export/Import Tests
 *
 * Uses REAL stores with mocked localStorage.
 * Tests actual importAllData functionality.
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import type { Collection } from '../store/collectionStore';
import type { FlowNode, FlowEdge } from '../types/flow';
import type { Environment } from '../store/environmentStore';

// Mock localStorage for all stores
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Import stores and function under test
import { useCollectionStore } from '../store/collectionStore';
import { useEnvironmentStore } from '../store/environmentStore';
import { useFlowStore } from '../store/flowStore';
import { useSettingsStore } from '../store/settingsStore';
import { importAllData } from './fullExport';

describe('fullExport - importAllData with real stores', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockClear();
    // Reset all stores to initial state
    useCollectionStore.setState({
      collections: [],
      selectedApi: null,
      selectedEp: null,
      selectedCollectionId: null,
      selectedRequestId: null,
      searchQuery: '',
      favOnly: false,
    });
    useEnvironmentStore.setState({
      environments: [],
      selectedEnv: '',
      canvasEnv: '',
      editingEnv: '',
    });
    useFlowStore.setState({
      currentFlowId: null,
      currentFlowName: '',
      nodes: [],
      edges: [],
      variables: {},
    });
    useSettingsStore.setState({
      theme: 'dark',
      fontSize: 12,
      tabSize: 2,
      language: 'zh-CN',
    });
  });

  function createValidExportData(overrides = {}) {
    return {
      version: '1.0',
      type: 'flare-full-export',
      exportedAt: new Date().toISOString(),
      data: {
        collections: [] as Collection[],
        environments: {
          environments: [] as Environment[],
          selectedEnv: '',
          canvasEnv: '',
          editingEnv: '',
        },
        flows: {
          currentFlowId: null as string | null,
          currentFlowName: 'Test Flow',
          nodes: [] as FlowNode[],
          edges: [] as FlowEdge[],
          variables: {} as Record<string, string>,
        },
        settings: { theme: 'dark' },
        ...overrides,
      },
    };
  }

  test('imports collections with real store state', () => {
    const collection: Collection = {
      id: 'col-123',
      name: 'Users API',
      requests: [{
        id: 'req-1',
        name: 'Get All Users',
        method: 'GET',
        url: '/users',
        params: [],
        headers: [],
        bodyType: 'none',
        authType: 'none',
        createdAt: Date.now(),
      }],
    };

    const data = createValidExportData({ collections: [collection] });
    importAllData(JSON.stringify(data), { merge: false });

    // Verify REAL store state was updated
    const state = useCollectionStore.getState();
    expect(state.collections).toHaveLength(1);
    expect(state.collections[0].id).toBe('col-123');
    expect(state.collections[0].name).toBe('Users API');
  });

  test('imports flow nodes and edges with real store state', () => {
    const nodes: FlowNode[] = [
      { id: 'node-1', type: 'request', data: { label: 'Test' }, position: { x: 100, y: 200 } },
    ];
    const edges: FlowEdge[] = [
      { id: 'edge-1', source: 'node-1', target: 'node-1', type: 'default' },
    ];

    const data = createValidExportData({
      flows: {
        currentFlowId: 'flow-1',
        currentFlowName: 'User Flow',
        nodes,
        edges,
        variables: { API_URL: '{{env.API_URL}}' },
      },
    });
    importAllData(JSON.stringify(data), { merge: false });

    // Verify REAL store state was updated
    const state = useFlowStore.getState();
    expect(state.currentFlowId).toBe('flow-1');
    expect(state.currentFlowName).toBe('User Flow');
    expect(state.nodes).toHaveLength(1);
    expect(state.nodes[0].id).toBe('node-1');
    expect(state.edges).toHaveLength(1);
    expect(state.variables.API_URL).toBe('{{env.API_URL}}');
  });

  test('imports environments with real store state', () => {
    const data = createValidExportData({
      environments: {
        environments: [
          {
            name: 'dev',
            groups: [{
              name: 'default',
              variables: [{ key: 'BASE_URL', value: 'http://localhost:3000', enabled: true }],
            }],
          },
          {
            name: 'prod',
            groups: [{
              name: 'default',
              variables: [{ key: 'BASE_URL', value: 'https://api.example.com', enabled: true }],
            }],
          },
        ],
        selectedEnv: 'dev',
        canvasEnv: 'dev',
        editingEnv: 'dev',
      },
    });
    importAllData(JSON.stringify(data), { merge: false });

    // Verify REAL store state was updated
    const state = useEnvironmentStore.getState();
    expect(state.environments).toHaveLength(2);
    expect(state.selectedEnv).toBe('dev');
    expect(state.canvasEnv).toBe('dev');
    expect(state.editingEnv).toBe('dev');
  });

  test('imports environment with nested groups structure', () => {
    const data = createValidExportData({
      environments: {
        environments: [
          {
            name: 'test-env',
            groups: [
              {
                name: 'default',
                variables: [
                  { key: 'KEY1', value: 'value1', enabled: true },
                  { key: 'KEY2', value: 'value2', enabled: false },
                ],
              },
            ],
          },
        ],
        selectedEnv: 'test-env',
        canvasEnv: 'test-env',
        editingEnv: 'test-env',
      },
    });
    importAllData(JSON.stringify(data), { merge: false });

    const state = useEnvironmentStore.getState();
    expect(state.environments).toHaveLength(1);

    // Verify the nested structure is correct
    const env = state.environments[0];
    expect(env.name).toBe('test-env');
    expect(env.groups).toHaveLength(1);
    expect(env.groups[0].name).toBe('default');
    expect(env.groups[0].variables).toHaveLength(2);

    // Verify variables are preserved correctly
    const varMap = Object.fromEntries(
      env.groups[0].variables.map(v => [v.key, v.value])
    );
    expect(varMap.KEY1).toBe('value1');
    expect(varMap.KEY2).toBe('value2');
  });

  test('merge mode adds to existing collections', () => {
    // Pre-existing collection
    useCollectionStore.setState({
      collections: [{ id: 'existing', name: 'Existing API', requests: [] }],
    });

    const data = createValidExportData({
      collections: [{ id: 'new', name: 'New API', requests: [] }],
    });
    importAllData(JSON.stringify(data), { merge: true });

    // Verify both collections exist
    const state = useCollectionStore.getState();
    expect(state.collections).toHaveLength(2);
    expect(state.collections.find(c => c.id === 'existing')).toBeTruthy();
    expect(state.collections.find(c => c.id === 'new')).toBeTruthy();
  });

  test('replace mode clears existing collections', () => {
    // Pre-existing collection
    useCollectionStore.setState({
      collections: [{ id: 'existing', name: 'Existing API', requests: [] }],
    });

    const data = createValidExportData({
      collections: [{ id: 'new', name: 'New API', requests: [] }],
    });
    importAllData(JSON.stringify(data), { merge: false });

    // Verify only new collection exists
    const state = useCollectionStore.getState();
    expect(state.collections).toHaveLength(1);
    expect(state.collections[0].id).toBe('new');
  });

  test('fails with invalid JSON', () => {
    const result = importAllData('not valid json', { merge: false });
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  test('fails with missing type field', () => {
    const data = { version: '1.0', exportedAt: new Date().toISOString(), data: {} };
    const result = importAllData(JSON.stringify(data), { merge: false });
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid export file format');
  });

  test('fails with wrong type', () => {
    const data = { version: '1.0', type: 'wrong-type', exportedAt: new Date().toISOString(), data: {} };
    const result = importAllData(JSON.stringify(data), { merge: false });
    expect(result.success).toBe(false);
  });

  test('fails with wrong version', () => {
    const data = { version: '2.0', type: 'flare-full-export', exportedAt: new Date().toISOString(), data: {} };
    const result = importAllData(JSON.stringify(data), { merge: false });
    expect(result.success).toBe(false);
  });

  test('succeeds with only collections (null others)', () => {
    const data = {
      version: '1.0',
      type: 'flare-full-export',
      exportedAt: new Date().toISOString(),
      data: {
        collections: [{ id: 'col-1', name: 'Test', requests: [] }],
        environments: null,
        flows: null,
        settings: null,
      },
    };
    const result = importAllData(JSON.stringify(data), { merge: false });
    expect(result.success).toBe(true);

    // Verify collections were imported
    const state = useCollectionStore.getState();
    expect(state.collections).toHaveLength(1);
  });

  test('imports settings correctly', () => {
    const data = createValidExportData({
      settings: { theme: 'light', fontSize: 14 },
    });
    importAllData(JSON.stringify(data), { merge: false });

    // Verify REAL settings store state was updated
    const state = useSettingsStore.getState();
    expect(state.theme).toBe('light');
    expect(state.fontSize).toBe(14);
  });

  test('merge mode skips duplicate collection IDs', () => {
    // Pre-existing collection with same ID
    useCollectionStore.setState({
      collections: [{ id: 'col-1', name: 'Existing', requests: [] }],
    });

    const data = createValidExportData({
      collections: [{ id: 'col-1', name: 'New Name', requests: [] }],
    });
    importAllData(JSON.stringify(data), { merge: true });

    // Should keep existing, not add duplicate
    const state = useCollectionStore.getState();
    expect(state.collections).toHaveLength(1);
    expect(state.collections[0].name).toBe('Existing');
  });

  test('merge mode adds new collections with unique IDs', () => {
    useCollectionStore.setState({
      collections: [{ id: 'existing', name: 'Existing', requests: [] }],
    });

    const data = createValidExportData({
      collections: [
        { id: 'new-1', name: 'New 1', requests: [] },
        { id: 'new-2', name: 'New 2', requests: [] },
      ],
    });
    importAllData(JSON.stringify(data), { merge: true });

    const state = useCollectionStore.getState();
    expect(state.collections).toHaveLength(3);
    expect(state.collections.map(c => c.id)).toContain('existing');
    expect(state.collections.map(c => c.id)).toContain('new-1');
    expect(state.collections.map(c => c.id)).toContain('new-2');
  });

  test('imports flow with multiple nodes and edges', () => {
    const nodes: FlowNode[] = [
      { id: 'node-1', type: 'request', data: { label: 'Req 1' }, position: { x: 0, y: 0 } },
      { id: 'node-2', type: 'request', data: { label: 'Req 2' }, position: { x: 100, y: 100 } },
      { id: 'node-3', type: 'transform', data: { label: 'Transform' }, position: { x: 200, y: 200 } },
    ];
    const edges: FlowEdge[] = [
      { id: 'edge-1', source: 'node-1', target: 'node-2', type: 'default' },
      { id: 'edge-2', source: 'node-2', target: 'node-3', type: 'default' },
    ];

    const data = createValidExportData({
      flows: {
        currentFlowId: 'flow-1',
        currentFlowName: 'Complex Flow',
        nodes,
        edges,
        variables: { VAR1: 'val1', VAR2: 'val2' },
      },
    });
    importAllData(JSON.stringify(data), { merge: false });

    const state = useFlowStore.getState();
    expect(state.nodes).toHaveLength(3);
    expect(state.edges).toHaveLength(2);
    expect(Object.keys(state.variables)).toHaveLength(2);
    expect(state.variables.VAR1).toBe('val1');
  });

  test('handles null collections in data', () => {
    const data = createValidExportData({
      collections: null as unknown as Collection[],
    });
    const result = importAllData(JSON.stringify(data), { merge: false });
    expect(result.success).toBe(true);
  });

  test('handles invalid flows.nodes type', () => {
    const data = {
      version: '1.0',
      type: 'flare-full-export',
      exportedAt: new Date().toISOString(),
      data: {
        collections: [],
        environments: null,
        flows: {
          currentFlowId: 'flow-1',
          currentFlowName: 'Test',
          nodes: 'not an array', // invalid type
          edges: [],
          variables: {},
        },
        settings: null,
      },
    };
    importAllData(JSON.stringify(data), { merge: false });

    // Should handle gracefully, default to empty array
    const state = useFlowStore.getState();
    expect(state.nodes).toEqual([]);
  });

  test('handles invalid flows.edges type', () => {
    const data = {
      version: '1.0',
      type: 'flare-full-export',
      exportedAt: new Date().toISOString(),
      data: {
        collections: [],
        environments: null,
        flows: {
          currentFlowId: 'flow-1',
          currentFlowName: 'Test',
          nodes: [],
          edges: 'not an array', // invalid type
          variables: {},
        },
        settings: null,
      },
    };
    importAllData(JSON.stringify(data), { merge: false });

    const state = useFlowStore.getState();
    expect(state.edges).toEqual([]);
  });

  test('handles invalid flows.variables type', () => {
    const data = {
      version: '1.0',
      type: 'flare-full-export',
      exportedAt: new Date().toISOString(),
      data: {
        collections: [],
        environments: null,
        flows: {
          currentFlowId: 'flow-1',
          currentFlowName: 'Test',
          nodes: [],
          edges: [],
          variables: 'not an object', // invalid type
        },
        settings: null,
      },
    };
    importAllData(JSON.stringify(data), { merge: false });

    const state = useFlowStore.getState();
    expect(state.variables).toEqual({});
  });

  test('fails when settings import has invalid data', () => {
    const data = createValidExportData({
      settings: { tabSize: 'not a number' }, // invalid type for number field
    });
    importAllData(JSON.stringify(data), { merge: false });

    // Settings store should handle gracefully
    const state = useSettingsStore.getState();
    expect(state.tabSize).toBeDefined();
  });

  test('replace mode clears and replaces environments', () => {
    // Pre-existing environment (store format)
    const oldEnv: Environment = { name: 'old', groups: [] };
    useEnvironmentStore.setState({
      environments: [oldEnv],
      selectedEnv: 'old',
    });

    const data = createValidExportData({
      environments: {
        environments: [{
          name: 'new',
          groups: [{
            name: 'default',
            variables: [{ key: 'KEY', value: 'VALUE', enabled: true }],
          }],
        }],
        selectedEnv: 'new',
        canvasEnv: 'new',
        editingEnv: 'new',
      },
    });
    importAllData(JSON.stringify(data), { merge: false });

    const state = useEnvironmentStore.getState();
    expect(state.environments).toHaveLength(1);
    expect(state.environments[0].name).toBe('new');
    expect(state.selectedEnv).toBe('new');
  });

  test('merge mode preserves existing environments', () => {
    const existingEnv: Environment = { name: 'existing', groups: [] };
    useEnvironmentStore.setState({
      environments: [existingEnv],
      selectedEnv: 'existing',
    });

    const data = createValidExportData({
      environments: {
        environments: [{
          name: 'new',
          groups: [{ name: 'default', variables: [] }],
        }],
        selectedEnv: 'new',
        canvasEnv: 'new',
        editingEnv: 'new',
      },
    });
    importAllData(JSON.stringify(data), { merge: true });

    const state = useEnvironmentStore.getState();
    expect(state.environments).toHaveLength(2);
    expect(state.environments.map(e => e.name)).toContain('existing');
    expect(state.environments.map(e => e.name)).toContain('new');
    expect(state.selectedEnv).toBe('new');
  });
});