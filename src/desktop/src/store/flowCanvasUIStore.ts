/**
 * FlowCanvasUI Store - Flow canvas UI state (NOT PERSISTED)
 *
 * Key Patterns:
 * 1. NOT persisted - UI state only
 * 2. Actions colocated with state they manage
 */

import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import type { ExecutionLog, NodeStatus } from '../components/Flow/FlowExecutionEngine';
import type { ExecutionStatus } from '../types/flow';

interface FlowCanvasUIState {
  // API selection/search state
  interfaceSearch: string;
  interfaceLoadError: string | null;
  // Node selection state
  selectedNodeId: string | null;
  // Context menu state
  showAddNodeMenu: boolean;
  addNodeMenuPos: { x: number; y: number };
  showEnvMenu: boolean;
  envMenuPos: { x: number; y: number };
  showNodeContextMenu: boolean;
  nodeContextMenuPos: { x: number; y: number };
  contextMenuNodeId: string | null;
  // Step mode
  stepMode: boolean;
  currentStepIndex: number;
  isStepping: boolean;
  // Variable editing
  pendingConnectionSource: string | null;
  // Execution state (migrated from FlowCanvas local state)
  executionStatus: ExecutionStatus;
  executionLog: ExecutionLog[];
  nodeStatuses: Record<string, NodeStatus>;
  // UI state
  showNodeMenu: boolean;
  menuPosition: { x: number; y: number };
  contextMenuNodeIdAlt: string | null;
  // Selected node IDs for context menu (set when selection context menu opens)
  contextMenuSelectedIds: string[];
  // Subflow panel
  showSubflowPanel: boolean;
}

interface FlowCanvasUIActions {
  setInterfaceSearch: (search: string) => void;
  setInterfaceLoadError: (error: string | null) => void;
  setSelectedNodeId: (id: string | null) => void;
  setShowAddNodeMenu: (show: boolean) => void;
  setAddNodeMenuPos: (pos: { x: number; y: number }) => void;
  setShowEnvMenu: (show: boolean) => void;
  setEnvMenuPos: (pos: { x: number; y: number }) => void;
  setShowNodeContextMenu: (show: boolean) => void;
  setNodeContextMenuPos: (pos: { x: number; y: number }) => void;
  setContextMenuNodeId: (id: string | null) => void;
  setStepMode: (enabled: boolean) => void;
  setCurrentStepIndex: (index: number | ((prev: number) => number)) => void;
  setIsStepping: (isStepping: boolean) => void;
  incrementStepIndex: () => void;
  setPendingConnectionSource: (id: string | null) => void;
  resetUI: () => void;
  // Execution actions
  setExecutionStatus: (status: ExecutionStatus) => void;
  setExecutionLog: (logs: ExecutionLog[]) => void;
  addExecutionLog: (log: ExecutionLog) => void;
  setNodeStatuses: (statuses: Record<string, NodeStatus>) => void;
  setShowNodeMenu: (show: boolean) => void;
  setMenuPosition: (pos: { x: number; y: number }) => void;
  resetExecution: () => void;
  setShowSubflowPanel: (show: boolean) => void;
  setContextMenuSelectedIds: (ids: string[]) => void;
}

type FlowCanvasUIStore = FlowCanvasUIState & FlowCanvasUIActions;

const initialState: FlowCanvasUIState = {
  interfaceSearch: "",
  interfaceLoadError: null,
  selectedNodeId: null,
  showAddNodeMenu: false,
  addNodeMenuPos: { x: 0, y: 0 },
  showEnvMenu: false,
  envMenuPos: { x: 0, y: 0 },
  showNodeContextMenu: false,
  nodeContextMenuPos: { x: 0, y: 0 },
  contextMenuNodeId: null,
  stepMode: false,
  currentStepIndex: 0,
  isStepping: false,
  pendingConnectionSource: null,
  // Execution state
  executionStatus: 'idle',
  executionLog: [],
  nodeStatuses: {},
  // UI state
  showNodeMenu: false,
  menuPosition: { x: 0, y: 0 },
  contextMenuNodeIdAlt: null,
  contextMenuSelectedIds: [],
  // Subflow panel
  showSubflowPanel: false,
};

export const useFlowCanvasUIStore = create<FlowCanvasUIStore>((set) => ({
  ...initialState,

  setInterfaceSearch: (interfaceSearch) => set({ interfaceSearch }),
  setInterfaceLoadError: (interfaceLoadError) => set({ interfaceLoadError }),
  setSelectedNodeId: (selectedNodeId) => set({ selectedNodeId }),
  setShowAddNodeMenu: (showAddNodeMenu) => set({ showAddNodeMenu }),
  setAddNodeMenuPos: (addNodeMenuPos) => set({ addNodeMenuPos }),
  setShowEnvMenu: (showEnvMenu) => set({ showEnvMenu }),
  setEnvMenuPos: (envMenuPos) => set({ envMenuPos }),
  setShowNodeContextMenu: (showNodeContextMenu) => set({ showNodeContextMenu }),
  setNodeContextMenuPos: (nodeContextMenuPos) => set({ nodeContextMenuPos }),
  setContextMenuNodeId: (contextMenuNodeId) => set({ contextMenuNodeId }),
  setStepMode: (stepMode) => set({ stepMode }),
  setCurrentStepIndex: (indexOrFn) => set((state) => ({
    currentStepIndex: typeof indexOrFn === 'function'
      ? indexOrFn(state.currentStepIndex)
      : indexOrFn,
  })),
  setIsStepping: (isStepping) => set({ isStepping }),
  incrementStepIndex: () => set((state) => ({ currentStepIndex: state.currentStepIndex + 1 })),
  setPendingConnectionSource: (pendingConnectionSource) => set({ pendingConnectionSource }),
  resetUI: () => set(initialState),

  // Execution actions
  setExecutionStatus: (executionStatus) => set({ executionStatus }),
  setExecutionLog: (executionLog) => set({ executionLog }),
  addExecutionLog: (log) => set((state) => ({ executionLog: [...state.executionLog, log] })),
  setNodeStatuses: (nodeStatuses) => set({ nodeStatuses }),
  setShowNodeMenu: (showNodeMenu) => set({ showNodeMenu }),
  setMenuPosition: (menuPosition) => set({ menuPosition }),
  resetExecution: () => set({
    executionStatus: 'idle',
    executionLog: [],
    nodeStatuses: {},
  }),
  setShowSubflowPanel: (showSubflowPanel) => set({ showSubflowPanel }),
  setContextMenuSelectedIds: (contextMenuSelectedIds) => set({ contextMenuSelectedIds }),
}));

// Convenience selectors
export const useFlowCanvasUI = () => useFlowCanvasUIStore(
  useShallow((s) => ({
    interfaceSearch: s.interfaceSearch,
    interfaceLoadError: s.interfaceLoadError,
    selectedNodeId: s.selectedNodeId,
    stepMode: s.stepMode,
    currentStepIndex: s.currentStepIndex,
    isStepping: s.isStepping,
  }))
);

export const useFlowCanvasUIActions = () => useFlowCanvasUIStore(
  useShallow((s) => ({
    setInterfaceSearch: s.setInterfaceSearch,
    setInterfaceLoadError: s.setInterfaceLoadError,
    setSelectedNodeId: s.setSelectedNodeId,
    setShowAddNodeMenu: s.setShowAddNodeMenu,
    setAddNodeMenuPos: s.setAddNodeMenuPos,
    setShowEnvMenu: s.setShowEnvMenu,
    setEnvMenuPos: s.setEnvMenuPos,
    setShowNodeContextMenu: s.setShowNodeContextMenu,
    setNodeContextMenuPos: s.setNodeContextMenuPos,
    setContextMenuNodeId: s.setContextMenuNodeId,
    setStepMode: s.setStepMode,
    setCurrentStepIndex: s.setCurrentStepIndex,
    setIsStepping: s.setIsStepping,
    incrementStepIndex: s.incrementStepIndex,
    setPendingConnectionSource: s.setPendingConnectionSource,
    resetUI: s.resetUI,
  }))
);