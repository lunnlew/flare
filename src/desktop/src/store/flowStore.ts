/**
 * Flow Store - Workflow canvas state
 *
 * Key Patterns:
 * 1. Persists nodes/edges to prevent state loss on re-render
 * 2. Actions colocated with state they manage
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import { getFlow, saveFlow, deleteFlow as deleteFlowApi, listFlows, exportFlow } from '../services/api';
import type { FlowData, FlowNode, FlowEdge, NodeTiming } from '../types/flow';
import type { ExecutionLog, NodeStatus } from '../components/Flow/FlowExecutionEngine';
import type { ExecutionStatus } from '../types/flow';
import { toast } from './notificationStore';
import { logger } from '../utils/logger';
import { t } from '../utils/i18n';
import { useSettingsStore } from './settingsStore';

const flowLogger = logger.child('flow');

export interface SavedFlowInfo {
  id: string;
  name: string;
  updated_at: string;
}

interface FlowState {
  // Saved flows from backend
  savedFlows: SavedFlowInfo[];
  isLoadingFlows: boolean;

  // Current flow
  currentFlowId: string | null;
  currentFlowName: string;

  // Canvas state (persisted to prevent loss on re-render)
  nodes: FlowNode[];
  edges: FlowEdge[];
  variables: Record<string, string>;

  // Execution state
  executionStatus: ExecutionStatus;
  executionLog: ExecutionLog[];
  nodeStatuses: Record<string, NodeStatus>;
  // 本次执行结果（用于 Results 面板显示）
  workflowResult: { success: boolean; results: Record<string, Record<string, unknown>>; logs: ExecutionLog[]; timings: NodeTiming[] } | null;
  // 节点输出历史（用于后续节点作为输入，只保留成功执行的结果）
  nodeOutputs: Record<string, Record<string, unknown>>;
  // 断点状态
  breakpoints: Record<string, boolean>;

  // Subflows (saved as reusable workflow fragments)
  subflows: SavedFlowInfo[];

  // UI state
  showFlowList: boolean;
}

interface FlowActions {
  // Load saved flows from backend
  loadSavedFlows: () => Promise<void>;

  // Save current flow
  saveCurrentFlow: (flowData: FlowData) => Promise<string | null>;

  // Load a specific flow
  loadFlow: (flowId: string) => Promise<FlowData | null>;

  // Delete a flow
  deleteFlow: (flowId: string) => Promise<void>;

  // Set current flow
  setCurrentFlowId: (id: string | null) => void;
  setCurrentFlowName: (name: string) => void;

  // Canvas state management
  setNodes: (nodesOrFn: FlowNode[] | ((nodes: FlowNode[]) => FlowNode[])) => void;
  setEdges: (edgesOrFn: FlowEdge[] | ((edges: FlowEdge[]) => FlowEdge[])) => void;
  setVariables: (variables: Record<string, string>) => void;

  // Execution state management
  setExecutionStatus: (status: ExecutionStatus) => void;
  setExecutionLog: (logs: ExecutionLog[]) => void;
  addExecutionLog: (log: ExecutionLog) => void;
  setNodeStatuses: (statuses: Record<string, NodeStatus>) => void;
  setWorkflowResult: (result: FlowState['workflowResult']) => void;
  setNodeOutput: (nodeId: string, output: Record<string, unknown>) => void;
  resetExecution: () => void;

  // Breakpoint management
  toggleBreakpoint: (nodeId: string) => void;
  clearAllBreakpoints: () => void;

  // Subflow management
  loadSubflows: () => Promise<void>;
  saveAsSubflow: (name: string, nodes: FlowNode[], edges: FlowEdge[]) => Promise<string | null>;
  instantiateSubflow: (subflowId: string, position?: { x: number; y: number }) => Promise<{ nodes: FlowNode[]; edges: FlowEdge[] } | null>;

  // UI state
  setShowFlowList: (show: boolean) => void;

  // File-based export/import
  exportFlowToFile: () => void;
  importFlowFromFile: (file: File) => Promise<boolean>;
}

type FlowStore = FlowState & FlowActions;

export const useFlowStore = create<FlowStore>()(
  persist(
    (set) => ({
      // Initial state
      savedFlows: [],
      isLoadingFlows: false,
      currentFlowId: null,
      currentFlowName: '',
      nodes: [],
      edges: [],
      variables: {},
      executionStatus: 'idle',
      executionLog: [],
      nodeStatuses: {},
      workflowResult: null,
      nodeOutputs: {},
      breakpoints: {},
      subflows: [],
      showFlowList: false,

      loadSavedFlows: async () => {
        set({ isLoadingFlows: true });
        try {
          const flows = await listFlows();
          set({ savedFlows: flows });
        } catch (e) {
          flowLogger.error('加载流程列表失败', { error: String(e) });
          toast.error(t('flow.loadListFailed', useSettingsStore.getState().language));
        } finally {
          set({ isLoadingFlows: false });
        }
      },

      saveCurrentFlow: async (flowData: FlowData) => {
        try {
          const result = await saveFlow(flowData);
          // Refresh flow list after save
          const flows = await listFlows();
          set({ savedFlows: flows });
          return result.id || null;
        } catch (e) {
          toast.error(t('flow.saveFailed', useSettingsStore.getState().language));
          return null;
        }
      },

      loadFlow: async (flowId: string) => {
        try {
          const flow = await getFlow(flowId);
          set({
            currentFlowId: flowId,
            currentFlowName: flow.name,
            nodes: flow.nodes || [],
            edges: flow.edges || [],
            variables: flow.variables || {},
          });
          return flow;
        } catch (e) {
          toast.error(t('flow.loadFailed', useSettingsStore.getState().language));
          return null;
        }
      },

      deleteFlow: async (flowId: string) => {
        try {
          await deleteFlowApi(flowId);
          set((state) => ({
            savedFlows: state.savedFlows.filter(f => f.id !== flowId),
            currentFlowId: state.currentFlowId === flowId ? null : state.currentFlowId,
          }));
        } catch (e) {
          toast.error(t('flow.deleteFailed', useSettingsStore.getState().language));
        }
      },

      setCurrentFlowId: (currentFlowId) => set({ currentFlowId }),
      setCurrentFlowName: (currentFlowName) => set({ currentFlowName }),
      setShowFlowList: (showFlowList) => set({ showFlowList }),

      // File-based export/import
      exportFlowToFile: async () => {
        try {
          const state = useFlowStore.getState();
          const exportData = {
            version: '1.0',
            type: 'flare-flow',
            exportedAt: new Date().toISOString(),
            flow: {
              name: state.currentFlowName,
              nodes: state.nodes,
              edges: state.edges,
              variables: state.variables,
            },
          };
          const json = JSON.stringify(exportData, null, 2);
          const defaultName = `${state.currentFlowName.replace(/[^a-zA-Z0-9一-龥]/g, '_') || 'flow'}-${Date.now()}.json`;
          await exportFlow(json, defaultName);
          toast.success(t('flow.exportSuccess', useSettingsStore.getState().language));
        } catch (e) {
          toast.error(t('flow.exportFailed', useSettingsStore.getState().language));
        }
      },

      importFlowFromFile: async (file: File) => {
        try {
          const text = await file.text();
          const data = JSON.parse(text);
          if (data.type !== 'flare-flow' || !data.flow || typeof data.flow !== 'object') {
            toast.error(t('flow.importInvalidFormat', useSettingsStore.getState().language));
            return false;
          }
          const { flow } = data;
          // Validate flow structure
          if (!flow ||
              (flow.nodes && !Array.isArray(flow.nodes)) ||
              (flow.edges && !Array.isArray(flow.edges)) ||
              (flow.variables && typeof flow.variables !== 'object')) {
            toast.error(t('flow.importInvalidStructure', useSettingsStore.getState().language));
            return false;
          }
          set({
            currentFlowName: flow.name || t('flow.importFlow', useSettingsStore.getState().language),
            nodes: Array.isArray(flow.nodes) ? flow.nodes : [],
            edges: Array.isArray(flow.edges) ? flow.edges : [],
            variables: flow.variables && typeof flow.variables === 'object' ? flow.variables : {},
            currentFlowId: null, // Mark as unsaved
          });
          toast.success(t('flow.importSuccess', useSettingsStore.getState().language));
          return true;
        } catch (e) {
          toast.error(t('flow.importFailed', useSettingsStore.getState().language));
          return false;
        }
      },

      // Canvas state management
      setNodes: (nodesOrFn) => set((state) => {
        if (typeof nodesOrFn === 'function') {
          return { nodes: nodesOrFn(state.nodes) };
        }
        return { nodes: nodesOrFn };
      }),
      setEdges: (edgesOrFn) => set((state) => {
        if (typeof edgesOrFn === 'function') {
          return { edges: edgesOrFn(state.edges) };
        }
        return { edges: edgesOrFn };
      }),
      setVariables: (variables) => set({ variables }),

      // Execution state management
      setExecutionStatus: (executionStatus) => set({ executionStatus }),
      setExecutionLog: (executionLog) => set({ executionLog }),
      addExecutionLog: (log) => {
        // Emit to unified logging system
        flowLogger.info(log.message, { nodeId: log.nodeId, nodeName: log.nodeName, level: log.level });

        set((state) => ({ executionLog: [...state.executionLog, log] }));
      },
      setNodeStatuses: (nodeStatuses) => set({ nodeStatuses }),
      setWorkflowResult: (workflowResult) => set({ workflowResult }),
      setNodeOutput: (nodeId, output) => set((state) => ({
        nodeOutputs: { ...state.nodeOutputs, [nodeId]: output },
      })),
      resetExecution: () => set({
        executionStatus: 'idle',
        executionLog: [],
        nodeStatuses: {},
        workflowResult: null,
        nodeOutputs: {},
      }),

      // Breakpoint management
      toggleBreakpoint: (nodeId) => set((state) => ({
        breakpoints: {
          ...state.breakpoints,
          [nodeId]: !state.breakpoints[nodeId],
        },
      })),
      clearAllBreakpoints: () => set({ breakpoints: {} }),

      // Subflow management
      loadSubflows: async () => {
        // Subflows are saved as regular flows with a tag/flag
        // For now, load all flows and filter by a marker
        const allFlows = await listFlows();
        // In a real implementation, we'd have a separate API for subflows
        // For now, we filter flows that start with "subflow/" prefix
        const subflowList = allFlows.filter(f => f.name.startsWith('subflow/'));
        set({ subflows: subflowList });
      },
      saveAsSubflow: async (name, nodes, edges) => {
        try {
          const subflowData: FlowData = {
            id: '', // Will be assigned by backend
            name: `subflow/${name}`,
            nodes,
            edges,
            variables: {},
            version: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          const result = await saveFlow(subflowData);
          // Refresh subflow list
          const allFlows = await listFlows();
          const subflowList = allFlows.filter(f => f.name.startsWith('subflow/'));
          set({ subflows: subflowList });
          return result.id || null;
        } catch (e) {
          toast.error(t('flow.saveSubflowFailed', useSettingsStore.getState().language));
          return null;
        }
      },
      instantiateSubflow: async (subflowId, position) => {
        try {
          const flow = await getFlow(subflowId);
          if (!flow) return null;

          // Generate new IDs and offset positions to avoid conflicts
          const idMap: Record<string, string> = {};
          const now = Date.now();

          const newNodes = flow.nodes.map((node) => {
            const newId = `${node.type}-${now}-${Math.random().toString(36).substring(2, 11)}`;
            idMap[node.id] = newId;
            return {
              ...node,
              id: newId,
              position: {
                x: (node.position?.x || 0) + (position?.x || 0),
                y: (node.position?.y || 0) + (position?.y || 0),
              },
              data: { ...node.data },
            };
          });

          const newEdges = (flow.edges || []).map((edge) => ({
            ...edge,
            id: `edge-${now}-${Math.random().toString(36).substr(2, 9)}`,
            source: idMap[edge.source] || edge.source,
            target: idMap[edge.target] || edge.target,
          }));

          return { nodes: newNodes, edges: newEdges };
        } catch (e) {
          toast.error(t('flow.instantiateSubflowFailed', useSettingsStore.getState().language));
          return null;
        }
      },
    }),
    {
      name: 'flare-flow-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        nodes: state.nodes,
        edges: state.edges,
        variables: state.variables,
        currentFlowId: state.currentFlowId,
        currentFlowName: state.currentFlowName,
        // Persist execution state so it survives page refresh
        executionStatus: state.executionStatus,
        executionLog: state.executionLog,
        nodeStatuses: state.nodeStatuses,
      }),
    }
  )
);

// Convenience selectors - use useShallow to prevent unnecessary re-renders
export const useFlowState = () => useFlowStore(
  useShallow((s) => ({
    savedFlows: s.savedFlows,
    isLoadingFlows: s.isLoadingFlows,
    currentFlowId: s.currentFlowId,
    currentFlowName: s.currentFlowName,
    showFlowList: s.showFlowList,
    nodes: s.nodes,
    edges: s.edges,
    variables: s.variables,
    executionStatus: s.executionStatus,
    executionLog: s.executionLog,
    nodeStatuses: s.nodeStatuses,
    workflowResult: s.workflowResult,
  })))
;

export const useFlowActions = () => useFlowStore(
  useShallow((s) => ({
  loadSavedFlows: s.loadSavedFlows,
  saveCurrentFlow: s.saveCurrentFlow,
  loadFlow: s.loadFlow,
  deleteFlow: s.deleteFlow,
  setCurrentFlowId: s.setCurrentFlowId,
  setCurrentFlowName: s.setCurrentFlowName,
  setShowFlowList: s.setShowFlowList,
  setNodes: s.setNodes,
  setEdges: s.setEdges,
  setVariables: s.setVariables,
  setExecutionStatus: s.setExecutionStatus,
  setExecutionLog: s.setExecutionLog,
  addExecutionLog: s.addExecutionLog,
  setNodeStatuses: s.setNodeStatuses,
  setWorkflowResult: s.setWorkflowResult,
  resetExecution: s.resetExecution,
})));