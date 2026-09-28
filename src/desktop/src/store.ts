/**
 * Zustand Store - Re-exports and Convenience Selectors
 *
 * Key Patterns:
 * 1. Slice Pattern - Split stores by domain (UI, Collections, Request, Environment, Settings)
 * 2. Atomic Subscriptions - Components subscribe only to what they need
 * 3. useShallow for object selectors - Prevents unnecessary re-renders
 * 4. Separate persistence storage keys - Different concerns isolated
 * 5. Colocated actions - Actions live with the state they manage
 */

import { useShallow } from 'zustand/react/shallow';

// Request store imports
import { getDefaultRequestState } from './store/requestStore';

// Re-exports from notification store
export { useNotificationStore, useToasts, useDialog, toast } from './store/notificationStore';
export type { Toast, ToastType, DialogState } from './store/notificationStore';

// Re-exports from response store
export { useResponseStore, useResponseData, useResponseUI, useResponseUIActions, useCompareData, useCompareActions } from './store/responseStore';
export type { ResponseTab, ResponseView } from './store/responseStore';

// Re-exports from scripts store
export { useScriptsStore, useScriptsState, useScriptsActions } from './store/scriptsStore';
export type { ScriptLog, ScriptLogLevel } from './store/scriptsStore';

// Re-exports from flow store
export { useFlowStore, useFlowState, useFlowActions } from './store/flowStore';
export type { SavedFlowInfo } from './store/flowStore';

// Re-exports from flow canvas UI store
export { useFlowCanvasUIStore, useFlowCanvasUI, useFlowCanvasUIActions } from './store/flowCanvasUIStore';

// Re-exports from request store
export { useRequestStore, getDefaultRequestState } from './store/requestStore';
export type { RequestState } from './store/requestStore';

// Re-exports from UI store
export { useUIStore } from './store/uiStore';
export type { AppMode, Theme } from './store/uiStore';

// Re-exports from collection store
export { useCollectionStore } from './store/collectionStore';
export type { Collection, SavedRequest } from './store/collectionStore';

// Re-exports from chat store
export { useChatStore } from './store/chatStore';

// Re-exports from environment store
export { useEnvironmentStore } from './store/environmentStore';
export type { Environment } from './store/environmentStore';

// Re-exports from settings store
export { useSettingsStore } from './store/settingsStore';

// Re-exports from mock store
export { useMockStore, useMockConfig } from './store/mockStore';
export type { MockLocale, MockDataPool, FieldRule, MockConfigState } from './store/mockStore';
export { LOCALE_PRESETS } from './store/mockStore';

// Re-exports from audit store
export { useAuditStore, useAuditLog, useAuditCategories, getActionLabel } from './store/auditStore';
export type { AuditAction, AuditEntry } from './store/auditStore';

// Re-exports from secure store
export { useSecureStore } from './store/secureStore';

// ============================================================================
// Convenience Selectors with useShallow - Prevents unnecessary re-renders
// ============================================================================

import { useCollectionStore } from './store/collectionStore';
import { useRequestStore } from './store/requestStore';
import { useEnvironmentStore } from './store/environmentStore';
import { useSettingsStore } from './store/settingsStore';

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

// Stable reference for default state
const DEFAULT_STATE = getDefaultRequestState();

/**
 * Request state with defaults applied - subscribes to endpoint state changes
 */
export const useRequestState = () => useRequestStore((state) => {
  const currentEndpointId = state.currentEndpointId;
  if (!currentEndpointId) return DEFAULT_STATE;
  return state.endpointStates[currentEndpointId] || DEFAULT_STATE;
});

/**
 * Request-level settings (sslVerify, timeout, retryConfig) for quick access
 * Use this selector to avoid re-renders when other request state changes
 */
export const useRequestSettings = () => useRequestStore((state) => {
  const currentEndpointId = state.currentEndpointId;
  if (!currentEndpointId) return { sslVerify: true, timeout: 0, retryConfig: { maxRetries: 0, retryDelay: 1000, enabled: false } };
  const endpointState = state.endpointStates[currentEndpointId];
  return {
    sslVerify: endpointState?.sslVerify ?? true,
    timeout: endpointState?.timeout ?? 0,
    retryConfig: endpointState?.retryConfig ?? { maxRetries: 0, retryDelay: 1000, enabled: false },
  };
});

/**
 * Environment state selector
 */
export const useEnvironmentsState = () => useEnvironmentStore(
  useShallow((state) => ({
    environments: state.environments,
    selectedEnv: state.selectedEnv,
    canvasEnv: state.canvasEnv,
    editingEnv: state.editingEnv,
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

// ============================================================================
// Type Re-exports
// ============================================================================

export type { KeyValue, Endpoint, EnvVariable } from './types/api';
export type { Message } from './types/chat';