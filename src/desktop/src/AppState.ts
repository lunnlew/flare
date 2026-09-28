/**
 * AppState - Unified Application State
 *
 * This module provides a single entry point for accessing all application state.
 * It combines zustand stores with convenience selectors to enable:
 * 1. Unified state management across the application
 * 2. Atomic subscriptions to prevent unnecessary re-renders
 * 3. Easy state discovery and coordination
 *
 * Key Patterns:
 * 1. Convenience selectors with useShallow - prevents re-renders when unrelated state changes
 * 2. Colocated actions - actions live with the state they manage
 * 3. Slice pattern - stores split by domain (UI, Request, Collection, etc.)
 *
 * Usage:
 *   import { useRequestState, useCollectionState } from './AppState';
 *   const requestState = useRequestState();
 *   const { collections, selectedApi } = useCollectionState();
 */

import { useShallow } from 'zustand/react/shallow';

// ============================================================================
// Store Imports
// ============================================================================

import { useCollectionStore } from './store/collectionStore';
import { useEnvironmentStore } from './store/environmentStore';
import { useSettingsStore } from './store/settingsStore';
import { useResponseStore } from './store/responseStore';
import { useUIStore } from './store/uiStore';
import { useNotificationStore, useToasts } from './store/notificationStore';
import { useFlowStore } from './store/flowStore';
import { useFlowCanvasUIStore, useFlowCanvasUI, useFlowCanvasUIActions } from './store/flowCanvasUIStore';
import { useScriptsStore } from './store/scriptsStore';
import { useChatStore } from './store/chatStore';
import { useMockStore, useMockConfig } from './store/mockStore';
import { useSecureStore } from './store/secureStore';

// ============================================================================
// Type Re-exports
// ============================================================================

export type { RequestState } from './store/requestStore';
export type { Collection, SavedRequest } from './store/collectionStore';
export type { Environment } from './store/environmentStore';
export type { Toast, ToastType, DialogState } from './store/notificationStore';
export type { ResponseTab, ResponseView } from './store/responseStore';
export type { ScriptLog, ScriptLogLevel } from './store/scriptsStore';
export type { SavedFlowInfo } from './store/flowStore';
export type { AppMode, Theme } from './store/uiStore';
export type { KeyValue, Endpoint, EnvVariable } from './types/api';
export type { Message } from './types/chat';
export type { MockLocale, MockDataPool, FieldRule, MockConfigState } from './store/mockStore';
export { LOCALE_PRESETS } from './store/mockStore';

// ============================================================================
// Store Exports
// ============================================================================

export {
  useCollectionStore,
  useEnvironmentStore,
  useSettingsStore,
  useResponseStore,
  useUIStore,
  useNotificationStore,
  useToasts,
  useFlowStore,
  useFlowCanvasUIStore,
  useFlowCanvasUI,
  useFlowCanvasUIActions,
  useScriptsStore,
  useChatStore,
  useMockStore,
  useMockConfig,
  useSecureStore,
};

// ============================================================================
// Convenience Selectors - Prevents Unnecessary Re-renders
// ============================================================================

/**
 * Request state with defaults applied - subscribes to endpoint state changes
 * NOTE: useRequestState is re-exported from store.ts to avoid duplicate definitions
 */
export { useRequestState, useRequestSettings } from './store';

/**
 * Combined collection state - for components that need multiple collection fields
 */
export const useCollectionState = () => useCollectionStore(
  useShallow((state) => ({
    collections: state.collections,
    selectedApi: state.selectedApi,
    selectedEp: state.selectedEp,
    searchQuery: state.searchQuery,
    favOnly: state.favOnly,
  }))
);

/**
 * Environment state selector
 */
export const useEnvironmentsState = () => useEnvironmentStore(
  useShallow((state) => ({
    environments: state.environments,
    selectedEnv: state.selectedEnv,
    isLoading: state.isLoading,
  }))
);

/**
 * Settings state selector (includes UI preferences)
 */
export const useSettingsState = () => useSettingsStore(
  useShallow((state) => ({
    autoParseUrl: state.autoParseUrl,
    autoEncodeUrl: state.autoEncodeUrl,
    autoEncodeParams: state.autoEncodeParams,
    headerPresets: state.headerPresets,
    globalVariables: state.globalVariables,
    layoutMode: state.layoutMode,
    leftPanelWidth: state.leftPanelWidth,
    topPanelHeight: state.topPanelHeight,
  }))
);

/**
 * Response UI state - excludes large data like responseBody
 */
export const useResponseUI = () => useResponseStore(
  useShallow((state) => ({
    activeTab: state.activeTab,
    responseView: state.responseView,
    showSearch: state.showSearch,
    searchQuery: state.searchQuery,
  }))
);

/**
 * Scripts state - pre/post request scripts
 * NOTE: useScriptsState is re-exported from scriptsStore to use per-endpoint isolation
 */
export { useScriptsState } from './store/scriptsStore';

/**
 * Chat state - AI chat messages and UI state
 */
export const useChatState = () => useChatStore((state) => ({
  messages: state.messages,
  isLoading: state.isLoading,
  showHelp: state.showHelp,
  error: state.error,
  chatInput: state.chatInput,
}));

/**
 * Mock config state selector - for MOCK data generation settings
 */
export const useMockState = () => useMockStore((state) => ({
  currentLocale: state.currentLocale,
  builtinRules: state.builtinRules,
  smartDetectionEnabled: state.smartDetectionEnabled,
  sequencePrefix: state.sequencePrefix,
  sequenceStart: state.sequenceStart,
  sequencePadding: state.sequencePadding,
  defaultSuffixType: state.defaultSuffixType,
  customSuffix: state.customSuffix,
  customRules: state.customRules,
}));

/**
 * UI state - app mode, sidebar, and dialogs
 */
export const useUIState = () => useUIStore(
  useShallow((state) => ({
    mode: state.mode,
    sidebarCollapsed: state.sidebarCollapsed,
    showEnvManager: state.showEnvManager,
    showCodeGen: state.showCodeGen,
    showSaveDialog: state.showSaveDialog,
    showImportModal: state.showImportModal,
  }))
);

/**
 * Flow canvas UI state - includes execution state and context menus
 */
export const useFlowCanvasState = () => useFlowCanvasUIStore(
  useShallow((state) => ({
    // Execution state
    executionStatus: state.executionStatus,
    executionLog: state.executionLog,
    nodeStatuses: state.nodeStatuses,
    // UI state
    showNodeMenu: state.showNodeMenu,
    menuPosition: state.menuPosition,
    showAddNodeMenu: state.showAddNodeMenu,
    addNodeMenuPos: state.addNodeMenuPos,
    showEnvMenu: state.showEnvMenu,
    envMenuPos: state.envMenuPos,
    showNodeContextMenu: state.showNodeContextMenu,
    nodeContextMenuPos: state.nodeContextMenuPos,
    stepMode: state.stepMode,
    currentStepIndex: state.currentStepIndex,
    // Node selection state (migrated from local useState)
    selectedNodeId: state.selectedNodeId,
    contextMenuNodeId: state.contextMenuNodeId,
  }))
);

// ============================================================================
// Migration Status
// ============================================================================

/**
 * Migration tracking - update this as state is migrated
 *
 * HIGH PRIORITY:
 * - FlowCanvas: execution state (executionStatus, executionLog, nodeStatuses) ✓
 * - FlowCanvas: context menu state (showNodeMenu, menuPosition) ✓
 *
 * MEDIUM PRIORITY:
 * - Workspace: viewMode, selectedApiName, selectedCollection ✓
 * - AuthPanel: oauthStatus, oauthError, oauthCode ✓
 * - BodyPanel: graphqlQuery, graphqlVariables ✓
 *
 * LOW PRIORITY:
 * - Collection/ListMode: search/filter state
 */

/** All migrations completed - state management consolidated to AppState pattern */
export const MIGRATION_STATUS = {
  // Flow system - fully migrated
  flowCanvasExecutionState: 'complete',
  flowCanvasContextMenuState: 'complete',
  flowCanvasNodeMenuState: 'complete',
  flowVariableAutocomplete: 'complete',
  flowCanvasLocalStateCleanup: 'complete',
  flowCanvasNodesEdgesStore: 'complete',
  flowCanvasInterfaceSearchState: 'complete',

  // Request/Response system - fully migrated
  requestActiveTab: 'complete',
  responseState: 'complete',
  historyPanelState: 'complete',

  // UI dialogs/modals - fully migrated
  workspaceViewState: 'complete',
  authPanelOAuthState: 'complete',
  bodyPanelGraphqlState: 'complete',
  codeGenPanelState: 'complete',
  listModeSearchState: 'complete',
  importModalState: 'complete',
  workspaceSearchState: 'complete',
  envPanelState: 'complete',
  uiStateSelector: 'complete',

  // AI Chat - fully migrated
  aiChatInputState: 'complete',
  chatStateSelector: 'complete',

  // App initialization - data loading centralized to App.tsx
  appDataInitialization: 'complete',

  // Mock store - unified through AppState
  mockStoreAccess: 'complete',

  // Preserved as component-local (appropriate):
  // - contextMenu (transient UI state)
  // - authItems (form state within modal)
  // - binaryFile (transient file selection)
  // - selectedNode (component-internal selection)
  // - loadBackendHistory (refresh button handler in HistoryPanel)

  // Node config panels - all use local state appropriately:
  // - AssertNodeConfig: local assertion editing state
  // - ConditionNodeConfig: simple/expression mode toggle
  // - ApiCallNodeConfig: selectedEndpoint local selection
  // - DelayNodeConfig: preset button selection (transient)
  // - ResizablePanel: width/resizing (transient drag state)
  // - JsonTreeView: collapsed state (transient UI)
  // - KeyValueEditor: focusedInput (transient focus)
  // - Toast: internal toast queue (component-scoped)
  // - useVariableAutocomplete: suggestion state (transient)
} as const;