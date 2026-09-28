/**
 * UI Store - App mode, sidebar state, theme, and dialogs
 *
 * Key Patterns:
 * 1. Persisted - mode, sidebarCollapsed, currentTheme
 * 2. NOT persisted - dialog states
 * 3. Actions colocated with state they manage
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { GeneratorType } from '../constants/http';

export type AppMode = "flow" | "list" | "chat" | "request" | "env" | "mock" | "settings" | "git";
type Theme = "dark" | "light" | "blue" | "notion" | "vermont";

interface UIState {
  mode: AppMode;
  sidebarCollapsed: boolean;
  currentTheme: Theme;
  showThemeMenu: boolean;
  // Dialog states (not persisted)
  showEnvManager: boolean;
  showCodeGen: boolean;
  showSaveDialog: boolean;
  showUrlParseModal: boolean;
  showImportModal: boolean;
  pendingParseParams: { key: string; value: string; enabled: boolean }[];
  // Request builder dialogs (not persisted)
  showSavePresetModal: boolean;
  showManagePresetModal: boolean;
  savePresetName: string;
  saveRequestName: string;
  // EnvManager dialogs (not persisted)
  showAddEnv: boolean;
  newEnvName: string;
  editingEnv: { name: string; newName: string } | null;
  showAddVarModal: boolean;
  // ParamsPanel generator dialogs (not persisted)
  showGenMenu: boolean;
  genType: GeneratorType;
  genPrefix: string;
  seqStart: number;
  fillEmptyOnly: boolean;
  // Collection dialogs (not persisted)
  showCollectionModal: boolean;
  newCollectionName: string;
  editingCollection: { id: string; name: string } | null;
  // Workspace state (persisted for user convenience)
  workspaceViewMode: 'list' | 'endpoints' | 'collections';
  workspaceSelectedApiName: string | null;
  workspaceSelectedCollection: string | null;
  // CodeGen state (not persisted)
  codeGenLang: string;
  codeGenGeneratedCode: string;
  // ListMode state (persisted for search convenience)
  listModeSearch: string;
  listModeEpFilter: string;
  listModeMethodFilter: string[];
  // ImportModal state (not persisted)
  importModalActiveTab: "api" | "collection" | "backup";
  importModalShowForm: boolean;
  importModalUrl: string;
  importModalConfigName: string;
  importModalSyncInterval: number;
  importModalLoading: boolean;
  importModalError: string;
  importModalProgress: string;
  importModalCollectionText: string;
  // AuthPanel OAuth UI state (not persisted - migrated from requestStore)
  oauthStatus: 'idle' | 'authorizing' | 'authorized' | 'error';
  oauthError: string;
  oauthCode: string;
  oauthGrantType: 'authorization_code' | 'client_credentials';
}

interface UIActions {
  setMode: (mode: AppMode) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setCurrentTheme: (theme: Theme) => void;
  setShowThemeMenu: (show: boolean) => void;
  // Dialog actions
  setShowEnvManager: (show: boolean) => void;
  setShowCodeGen: (show: boolean) => void;
  setShowSaveDialog: (show: boolean) => void;
  setShowUrlParseModal: (show: boolean) => void;
  setShowImportModal: (show: boolean) => void;
  setPendingParseParams: (params: { key: string; value: string; enabled: boolean }[]) => void;
  // Request builder dialog actions
  setShowSavePresetModal: (show: boolean) => void;
  setShowManagePresetModal: (show: boolean) => void;
  setSavePresetName: (name: string) => void;
  setSaveRequestName: (name: string) => void;
  // EnvManager dialog actions
  setShowAddEnv: (show: boolean) => void;
  setNewEnvName: (name: string) => void;
  setEditingEnv: (env: { name: string; newName: string } | null) => void;
  setShowAddVarModal: (show: boolean) => void;
  // ParamsPanel generator dialog actions
  setShowGenMenu: (show: boolean) => void;
  setGenType: (type: GeneratorType) => void;
  setGenPrefix: (prefix: string) => void;
  setSeqStart: (start: number) => void;
  setFillEmptyOnly: (fillEmptyOnly: boolean) => void;
  // Collection dialog actions
  setShowCollectionModal: (show: boolean) => void;
  setNewCollectionName: (name: string) => void;
  setEditingCollection: (editing: { id: string; name: string } | null) => void;
  closeAllDialogs: () => void;
  // Workspace actions
  setWorkspaceViewMode: (mode: 'list' | 'endpoints' | 'collections') => void;
  setWorkspaceSelectedApiName: (name: string | null) => void;
  setWorkspaceSelectedCollection: (name: string | null) => void;
  // CodeGen actions
  setCodeGenLang: (lang: string) => void;
  setCodeGenGeneratedCode: (code: string) => void;
  // ListMode actions
  setListModeSearch: (search: string) => void;
  setListModeEpFilter: (filter: string) => void;
  setListModeMethodFilter: (filter: string[]) => void;
  // ImportModal actions
  setImportModalActiveTab: (tab: "api" | "collection" | "backup") => void;
  setImportModalShowForm: (show: boolean) => void;
  setImportModalUrl: (url: string) => void;
  setImportModalConfigName: (name: string) => void;
  setImportModalSyncInterval: (interval: number) => void;
  setImportModalLoading: (loading: boolean) => void;
  setImportModalError: (error: string) => void;
  setImportModalProgress: (progress: string) => void;
  setImportModalCollectionText: (text: string) => void;
  // AuthPanel OAuth UI actions
  setOauthStatus: (status: 'idle' | 'authorizing' | 'authorized' | 'error') => void;
  setOauthError: (error: string) => void;
  setOauthCode: (code: string) => void;
  setOauthGrantType: (type: 'authorization_code' | 'client_credentials') => void;
};

type UIStore = UIState & UIActions;

// 从 localStorage 读取保存的主题作为默认值
function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem('flare-ui-state');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.state?.currentTheme) {
        return parsed.state.currentTheme;
      }
    }
  } catch (e) {
    // Fallback to dark theme
  }
  return 'dark';
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      mode: "list",
      sidebarCollapsed: false,
      currentTheme: getInitialTheme(),
      showThemeMenu: false,
      // Dialog states default to false
      showEnvManager: false,
      showCodeGen: false,
      showSaveDialog: false,
      showUrlParseModal: false,
      showImportModal: false,
      pendingParseParams: [],

      // Request builder dialogs (not persisted)
      showSavePresetModal: false,
      showManagePresetModal: false,
      savePresetName: "",
      saveRequestName: "",

      // EnvManager dialogs (not persisted)
      showAddEnv: false,
      newEnvName: "",
      editingEnv: null,
      showAddVarModal: false,

      // ParamsPanel generator dialogs (not persisted)
      showGenMenu: false,
      genType: 'sequence',
      genPrefix: "",
      seqStart: 1,
      fillEmptyOnly: false,

      // Collection dialogs (not persisted)
      showCollectionModal: false,
      newCollectionName: "",
      editingCollection: null,

      // Workspace state (not persisted)
      workspaceViewMode: 'list',
      workspaceSelectedApiName: null,
      workspaceSelectedCollection: null,

      // CodeGen state (not persisted)
      codeGenLang: 'curl',
      codeGenGeneratedCode: '',

      // ListMode state (not persisted)
      listModeSearch: '',
      listModeEpFilter: '',
      listModeMethodFilter: [],

      // ImportModal state (not persisted)
      importModalActiveTab: 'api',
      importModalShowForm: false,
      importModalUrl: '',
      importModalConfigName: '',
      importModalSyncInterval: 0,
      importModalLoading: false,
      importModalError: '',
      importModalProgress: '',
      importModalCollectionText: '',

      // AuthPanel OAuth UI state (not persisted)
      oauthStatus: 'idle',
      oauthError: '',
      oauthCode: '',
      oauthGrantType: 'authorization_code',

      setMode: (mode) => set({ mode }),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      setCurrentTheme: (currentTheme) => set({ currentTheme }),
      setShowThemeMenu: (showThemeMenu) => set({ showThemeMenu }),
      // Dialog actions
      setShowEnvManager: (showEnvManager) => set({ showEnvManager }),
      setShowCodeGen: (showCodeGen) => set({ showCodeGen }),
      setShowSaveDialog: (showSaveDialog) => set({ showSaveDialog }),
      setShowUrlParseModal: (showUrlParseModal) => set({ showUrlParseModal }),
      setShowImportModal: (showImportModal) => set({ showImportModal }),
      setPendingParseParams: (pendingParseParams) => set({ pendingParseParams }),
      // Request builder dialog actions
      setShowSavePresetModal: (show: boolean) => set({ showSavePresetModal: show }),
      setShowManagePresetModal: (show: boolean) => set({ showManagePresetModal: show }),
      setSavePresetName: (name: string) => set({ savePresetName: name }),
      setSaveRequestName: (name: string) => set({ saveRequestName: name }),
      // EnvManager dialog actions
      setShowAddEnv: (show: boolean) => set({ showAddEnv: show }),
      setNewEnvName: (name: string) => set({ newEnvName: name }),
      setEditingEnv: (env: { name: string; newName: string } | null) => set({ editingEnv: env }),
      setShowAddVarModal: (show: boolean) => set({ showAddVarModal: show }),
      // ParamsPanel generator dialog actions
      setShowGenMenu: (show: boolean) => set({ showGenMenu: show }),
      setGenType: (type: GeneratorType) => set({ genType: type }),
      setGenPrefix: (prefix: string) => set({ genPrefix: prefix }),
      setSeqStart: (start: number) => set({ seqStart: start }),
      setFillEmptyOnly: (fillEmptyOnly: boolean) => set({ fillEmptyOnly: fillEmptyOnly }),
      // Collection dialog actions
      setShowCollectionModal: (show: boolean) => set({ showCollectionModal: show }),
      setNewCollectionName: (name: string) => set({ newCollectionName: name }),
      setEditingCollection: (editing: { id: string; name: string } | null) => set({ editingCollection: editing }),
      closeAllDialogs: () => set({
        showEnvManager: false,
        showCodeGen: false,
        showSaveDialog: false,
        showUrlParseModal: false,
        showImportModal: false,
        pendingParseParams: [],
        showSavePresetModal: false,
        showManagePresetModal: false,
        savePresetName: "",
        saveRequestName: "",
        showAddEnv: false,
        newEnvName: "",
        editingEnv: null,
        showAddVarModal: false,
        showGenMenu: false,
        genType: 'sequence',
        genPrefix: "",
        seqStart: 1,
        fillEmptyOnly: false,
        showCollectionModal: false,
        newCollectionName: "",
        editingCollection: null,
        workspaceViewMode: 'list',
        workspaceSelectedApiName: null,
        workspaceSelectedCollection: null,
      }),
      // Workspace actions
      setWorkspaceViewMode: (workspaceViewMode) => set({ workspaceViewMode }),
      setWorkspaceSelectedApiName: (workspaceSelectedApiName) => set({ workspaceSelectedApiName }),
      setWorkspaceSelectedCollection: (workspaceSelectedCollection) => set({ workspaceSelectedCollection }),
      // CodeGen actions
      setCodeGenLang: (codeGenLang) => set({ codeGenLang }),
      setCodeGenGeneratedCode: (codeGenGeneratedCode) => set({ codeGenGeneratedCode }),
      // ListMode actions
      setListModeSearch: (listModeSearch) => set({ listModeSearch }),
      setListModeEpFilter: (listModeEpFilter) => set({ listModeEpFilter }),
      setListModeMethodFilter: (listModeMethodFilter) => set({ listModeMethodFilter }),
      // ImportModal actions
      setImportModalActiveTab: (importModalActiveTab) => set({ importModalActiveTab }),
      setImportModalShowForm: (importModalShowForm) => set({ importModalShowForm }),
      setImportModalUrl: (importModalUrl) => set({ importModalUrl }),
      setImportModalConfigName: (importModalConfigName) => set({ importModalConfigName }),
      setImportModalSyncInterval: (importModalSyncInterval) => set({ importModalSyncInterval }),
      setImportModalLoading: (importModalLoading) => set({ importModalLoading }),
      setImportModalError: (importModalError) => set({ importModalError }),
      setImportModalProgress: (importModalProgress) => set({ importModalProgress }),
      setImportModalCollectionText: (importModalCollectionText) => set({ importModalCollectionText }),
      // AuthPanel OAuth UI actions
      setOauthStatus: (oauthStatus) => set({ oauthStatus }),
      setOauthError: (oauthError) => set({ oauthError }),
      setOauthCode: (oauthCode) => set({ oauthCode }),
      setOauthGrantType: (oauthGrantType) => set({ oauthGrantType }),
    }),
    {
      name: 'flare-ui-state',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        mode: state.mode,
        sidebarCollapsed: state.sidebarCollapsed,
        currentTheme: state.currentTheme,
        workspaceViewMode: state.workspaceViewMode,
        workspaceSelectedApiName: state.workspaceSelectedApiName,
        listModeSearch: state.listModeSearch,
        listModeEpFilter: state.listModeEpFilter,
        listModeMethodFilter: state.listModeMethodFilter,
      }),
    }
  )
);

export type { Theme };