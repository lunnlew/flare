/**
 * Settings Store - App settings, global variables, and UI preferences
 *
 * Key Patterns:
 * 1. All settings persisted
 * 2. Actions colocated with state they manage
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface ProxyConfig {
  protocol: string;
  host: string;
  port: string;
  username: string;
  password: string;
}

interface SslCertConfig {
  clientCertEnabled: boolean;
  clientCertFile: string;
  clientKeyFile: string;
  caCertFile: string;
}

interface KeyboardShortcut {
  key: string;
  modifiers: string[];
  description: string;
  enabled: boolean;
}

// Capture settings interface
interface CaptureSettings {
  // Allowed domains (empty = capture all)
  allowedDomains: string[];
  // Static resource patterns to exclude
  excludePatterns: string[];
  // Enable/disable capture
  enabled: boolean;
}

interface SettingsStore {
  autoParseUrl: boolean;
  autoEncodeUrl: boolean;
  autoEncodeParams: boolean;
  headerPresets: { name: string; headers: { key: string; value: string; enabled: boolean }[] }[];
  globalVariables: { key: string; value: string; enabled: boolean }[];
  // Capture settings
  captureSettings: CaptureSettings;
  // UI Preferences (persisted)
  layoutMode: 'horizontal' | 'vertical' | 'request-focus' | 'response-focus';
  leftPanelWidth: number;
  topPanelHeight: number;
  // Theme settings (persisted)
  theme: string;
  fontSize: number;
  tabSize: number; // 2 or 4 spaces
  lineHeight: 'compact' | 'normal' | 'relaxed'; // line height setting
  autoSave: boolean;
  autoSaveInterval: number; // interval in seconds: 30, 60, 120, 300
  // Request settings (persisted)
  requestTimeout: number; // timeout in ms
  followRedirects: boolean; // follow HTTP redirects
  // Proxy settings (persisted)
  proxyEnabled: boolean;
  proxyConfig: ProxyConfig;
  // SSL/TLS Certificate settings (persisted)
  sslCertConfig: SslCertConfig;
  // URL history for autocomplete
  urlHistory: { url: string; lastUsed: number }[];
  // Parameter value history for autocomplete (per parameter key)
  paramValueHistory: { paramKey: string; values: { value: string; lastUsed: number }[] }[];
  // Sensitive data masking setting
  sensitiveMaskEnabled: boolean;
  // Keyboard shortcuts (persisted)
  keyboardShortcuts: KeyboardShortcut[];
  // App language
  language: 'zh-CN' | 'en-US';
  addToUrlHistory: (url: string) => void;
  clearUrlHistory: () => void;
  addToParamValueHistory: (paramKey: string, value: string) => void;
  clearParamValueHistory: (paramKey?: string) => void;
  setAutoParseUrl: (v: boolean) => void;
  setAutoEncodeUrl: (v: boolean) => void;
  setAutoEncodeParams: (v: boolean) => void;
  setHeaderPresets: (presets: { name: string; headers: { key: string; value: string; enabled: boolean }[] }[]) => void;
  setGlobalVariables: (vars: { key: string; value: string; enabled: boolean }[]) => void;
  setLayoutMode: (mode: 'horizontal' | 'vertical' | 'request-focus' | 'response-focus') => void;
  setLeftPanelWidth: (width: number) => void;
  setTopPanelHeight: (height: number) => void;
  setTheme: (theme: string) => void;
  setFontSize: (size: number) => void;
  setTabSize: (size: number) => void;
  setLineHeight: (height: 'compact' | 'normal' | 'relaxed') => void;
  setAutoSave: (enabled: boolean) => void;
  setAutoSaveInterval: (interval: number) => void;
  setRequestTimeout: (timeout: number) => void;
  setFollowRedirects: (follow: boolean) => void;
  setProxyEnabled: (enabled: boolean) => void;
  setProxyConfig: (config: ProxyConfig) => void;
  setSslCertConfig: (config: SslCertConfig) => void;
  setSensitiveMaskEnabled: (enabled: boolean) => void;
  setKeyboardShortcuts: (shortcuts: KeyboardShortcut[]) => void;
  setLanguage: (lang: 'zh-CN' | 'en-US') => void;
  resetKeyboardShortcuts: () => void;
  setCaptureSettings: (settings: CaptureSettings) => void;
  // Export/Import settings (excludes sensitive data like passwords)
  exportSettings: () => string;
  importSettings: (json: string) => { success: boolean; error?: string };
}

// Default keyboard shortcuts
const DEFAULT_KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  { key: 'Enter', modifiers: ['ctrl'], description: '发送请求 (Ctrl+Enter)', enabled: true },
  { key: 'c', modifiers: ['ctrl', 'shift'], description: '复制完整 cURL (Ctrl+Shift+C)', enabled: true },
  { key: 'l', modifiers: ['ctrl'], description: '聚焦 URL 输入框 (Ctrl+L)', enabled: true },
  { key: 'Delete', modifiers: ['ctrl', 'shift'], description: '清除当前请求 (Ctrl+Shift+Delete)', enabled: true },
  { key: 's', modifiers: ['ctrl'], description: '保存请求 (Ctrl+S)', enabled: true },
  { key: 'k', modifiers: ['ctrl'], description: '打开快捷键帮助 (Ctrl+K)', enabled: true },
];

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      autoParseUrl: true,
      autoEncodeUrl: true,
      autoEncodeParams: true,
      headerPresets: [] as { name: string; headers: { key: string; value: string; enabled: boolean }[] }[],
      globalVariables: [] as { key: string; value: string; enabled: boolean }[],
      // UI Preferences defaults
      layoutMode: 'horizontal',
      leftPanelWidth: 60,
      topPanelHeight: 60,
      // Theme settings defaults
      theme: 'dark',
      fontSize: 12,
      tabSize: 2,
      lineHeight: 'normal',
      autoSave: false,
      autoSaveInterval: 60, // default 60 seconds
      // Request settings defaults
      requestTimeout: 30000, // 30 seconds default
      followRedirects: true, // follow redirects by default
      // Proxy settings defaults
      proxyEnabled: false,
      proxyConfig: { protocol: "http", host: "", port: "", username: "", password: "" },
      // SSL/TLS Certificate settings defaults
      sslCertConfig: { clientCertEnabled: false, clientCertFile: "", clientKeyFile: "", caCertFile: "" },
      // URL history defaults
      urlHistory: [] as { url: string; lastUsed: number }[],
      // Parameter value history defaults
      paramValueHistory: [] as { paramKey: string; values: { value: string; lastUsed: number }[] }[],
      // Sensitive data masking defaults (disabled by default)
      sensitiveMaskEnabled: false,
      // Keyboard shortcuts defaults
      keyboardShortcuts: DEFAULT_KEYBOARD_SHORTCUTS,
      // App language defaults
      language: 'zh-CN',
      // Capture settings defaults
      captureSettings: {
        enabled: true,
        allowedDomains: [] as string[],
        excludePatterns: [
          '\\.js(\\?.*)?$',
          '\\.css(\\?.*)?$',
          '\\.png(\\?.*)?$',
          '\\.jpg(\\?.*)?$',
          '\\.jpeg(\\?.*)?$',
          '\\.gif(\\?.*)?$',
          '\\.svg(\\?.*)?$',
          '\\.ico(\\?.*)?$',
          '\\.woff2?(\\?.*)?$',
          '\\.ttf(\\?.*)?$',
          '\\.eot(\\?.*)?$',
          '\\.map(\\?.*)?$',
          '\\.webp(\\?.*)?$',
          '\\.avif(\\?.*)?$',
          '/static/',
          '/assets/',
          '/dist/',
          '/build/',
          '/sockjs-node/',
          '/info\\?t=',
          'chrome-extension/',
          'chrome:\\/\\/',
        ] as string[],
      },
      addToUrlHistory: (url: string) => set((state) => {
        if (!url.trim()) return state;
        // Extract hostname from URL for better autocomplete
        try {
          const urlObj = new URL(url);
          const hostname = urlObj.origin;
          // Remove existing entry with same URL
          const filtered = state.urlHistory.filter(h => h.url !== hostname);
          // Add to front with current timestamp
          const newEntry = { url: hostname, lastUsed: Date.now() };
          // Keep only last 10 entries
          const updated = [newEntry, ...filtered].slice(0, 10);
          return { urlHistory: updated };
        } catch {
          return state;
        }
      }),
      clearUrlHistory: () => set({ urlHistory: [] }),
      addToParamValueHistory: (paramKey: string, value: string) => set((state) => {
        if (!paramKey.trim() || !value.trim()) return state;
        // Find existing entry for this param key
        const existingIndex = state.paramValueHistory.findIndex(p => p.paramKey === paramKey);
        if (existingIndex >= 0) {
          // Update existing param key entry
          const updated = [...state.paramValueHistory];
          const paramEntry = { ...updated[existingIndex] };
          // Remove existing value if present
          paramEntry.values = paramEntry.values.filter(v => v.value !== value);
          // Add new value to front with timestamp
          paramEntry.values = [{ value, lastUsed: Date.now() }, ...paramEntry.values].slice(0, 5);
          updated[existingIndex] = paramEntry;
          return { paramValueHistory: updated };
        } else {
          // Create new entry
          const newEntry = {
            paramKey,
            values: [{ value, lastUsed: Date.now() }]
          };
          return { paramValueHistory: [newEntry, ...state.paramValueHistory].slice(0, 20) };
        }
      }),
      clearParamValueHistory: (paramKey?: string) => set((state) => {
        if (paramKey) {
          // Clear only for specific param key
          return { paramValueHistory: state.paramValueHistory.filter(p => p.paramKey !== paramKey) };
        }
        // Clear all
        return { paramValueHistory: [] };
      }),
      setAutoParseUrl: (autoParseUrl) => set({ autoParseUrl }),
      setAutoEncodeUrl: (autoEncodeUrl) => set({ autoEncodeUrl }),
      setAutoEncodeParams: (autoEncodeParams) => set({ autoEncodeParams }),
      setHeaderPresets: (headerPresets) => set({ headerPresets }),
      setGlobalVariables: (globalVariables) => set({ globalVariables }),
      setLayoutMode: (layoutMode) => set({ layoutMode }),
      setLeftPanelWidth: (leftPanelWidth) => set({ leftPanelWidth }),
      setTopPanelHeight: (topPanelHeight) => set({ topPanelHeight }),
      setTheme: (theme) => set({ theme }),
      setFontSize: (fontSize) => set({ fontSize }),
      setTabSize: (tabSize) => set({ tabSize }),
      setLineHeight: (lineHeight) => set({ lineHeight }),
      setAutoSave: (autoSave) => set({ autoSave }),
      setAutoSaveInterval: (autoSaveInterval) => set({ autoSaveInterval }),
      setRequestTimeout: (requestTimeout) => set({ requestTimeout }),
      setFollowRedirects: (followRedirects) => set({ followRedirects }),
      setProxyEnabled: (proxyEnabled) => set({ proxyEnabled }),
      setProxyConfig: (proxyConfig) => set({ proxyConfig }),
      setSslCertConfig: (sslCertConfig) => set({ sslCertConfig }),
      setSensitiveMaskEnabled: (sensitiveMaskEnabled) => set({ sensitiveMaskEnabled }),
      setKeyboardShortcuts: (keyboardShortcuts) => set({ keyboardShortcuts }),
      setLanguage: (language) => set({ language }),
      resetKeyboardShortcuts: () => set({ keyboardShortcuts: DEFAULT_KEYBOARD_SHORTCUTS }),
      setCaptureSettings: (captureSettings) => set({ captureSettings }),

      exportSettings: () => {
        const state = get();
        // Exclude sensitive data (passwords, certificates content) from export
        const exportData = {
          autoParseUrl: state.autoParseUrl,
          autoEncodeUrl: state.autoEncodeUrl,
          autoEncodeParams: state.autoEncodeParams,
          headerPresets: state.headerPresets,
          globalVariables: state.globalVariables,
          layoutMode: state.layoutMode,
          leftPanelWidth: state.leftPanelWidth,
          topPanelHeight: state.topPanelHeight,
          theme: state.theme,
          fontSize: state.fontSize,
          tabSize: state.tabSize,
          lineHeight: state.lineHeight,
          autoSave: state.autoSave,
          autoSaveInterval: state.autoSaveInterval,
          requestTimeout: state.requestTimeout,
          followRedirects: state.followRedirects,
          proxyEnabled: state.proxyEnabled,
          proxyConfig: {
            protocol: state.proxyConfig.protocol,
            host: state.proxyConfig.host,
            port: state.proxyConfig.port,
            username: state.proxyConfig.username,
            password: '', // Excluded for security
          },
          sslCertConfig: {
            clientCertEnabled: state.sslCertConfig.clientCertEnabled,
            clientCertFile: '', // Excluded for security
            clientKeyFile: '', // Excluded for security
            caCertFile: '', // Excluded for security
          },
          keyboardShortcuts: state.keyboardShortcuts,
          language: state.language,
          captureSettings: state.captureSettings,
        };
        return JSON.stringify(exportData, null, 2);
      },

      importSettings: (json: string) => {
        try {
          const data = JSON.parse(json);
          // Validate required fields
          if (typeof data !== 'object' || data === null) {
            return { success: false, error: 'Invalid settings format' };
          }
          // Build update object with only valid fields
          const updates: Partial<SettingsStore> = {};
          const validFields = [
            'autoParseUrl', 'autoEncodeUrl', 'autoEncodeParams', 'headerPresets',
            'globalVariables', 'layoutMode', 'leftPanelWidth', 'topPanelHeight',
            'theme', 'fontSize', 'tabSize', 'lineHeight', 'autoSave', 'autoSaveInterval',
            'requestTimeout', 'followRedirects', 'proxyEnabled', 'keyboardShortcuts',
            'language', 'captureSettings'
          ];
          for (const field of validFields) {
            if (field in data) {
              (updates as Record<string, unknown>)[field] = data[field];
            }
          }
          // Validate and sanitize numeric fields
          if ('fontSize' in updates && typeof updates.fontSize !== 'number') {
            updates.fontSize = Number(updates.fontSize) || 12;
          }
          if ('tabSize' in updates) {
            const tabSize = Number(updates.tabSize) || 2;
            updates.tabSize = (tabSize === 2 || tabSize === 4) ? tabSize : 2;
          }
          if ('leftPanelWidth' in updates) {
            const width = Number(updates.leftPanelWidth) || 60;
            updates.leftPanelWidth = Math.min(100, Math.max(20, width));
          }
          if ('topPanelHeight' in updates) {
            const height = Number(updates.topPanelHeight) || 60;
            updates.topPanelHeight = Math.min(100, Math.max(20, height));
          }
          if ('autoSaveInterval' in updates) {
            const interval = Number(updates.autoSaveInterval) || 60;
            updates.autoSaveInterval = [30, 60, 120, 300].includes(interval) ? interval : 60;
          }
          if ('requestTimeout' in updates) {
            const timeout = Number(updates.requestTimeout) || 30000;
            updates.requestTimeout = timeout > 0 ? timeout : 30000;
          }
          // Validate language field
          if ('language' in updates && updates.language !== 'zh-CN' && updates.language !== 'en-US') {
            updates.language = 'zh-CN';
          }
          // Handle proxyConfig separately to ensure we don't overwrite password if not provided
          if (data.proxyConfig) {
            updates.proxyConfig = {
              protocol: data.proxyConfig.protocol || 'http',
              host: data.proxyConfig.host || '',
              port: data.proxyConfig.port || '',
              username: data.proxyConfig.username || '',
              password: data.proxyConfig.password || '', // Will be empty if not provided
            };
          }
          // Handle sslCertConfig separately
          if (data.sslCertConfig) {
            updates.sslCertConfig = {
              clientCertEnabled: data.sslCertConfig.clientCertEnabled || false,
              clientCertFile: '',
              clientKeyFile: '',
              caCertFile: '',
            };
          }
          set(updates);
          return { success: true };
        } catch (e) {
          return { success: false, error: e instanceof Error ? e.message : 'Parse error' };
        }
      },
    }),
    {
      name: 'flare-settings-state',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        autoParseUrl: state.autoParseUrl,
        autoEncodeUrl: state.autoEncodeUrl,
        autoEncodeParams: state.autoEncodeParams,
        headerPresets: state.headerPresets,
        globalVariables: state.globalVariables,
        layoutMode: state.layoutMode,
        leftPanelWidth: state.leftPanelWidth,
        topPanelHeight: state.topPanelHeight,
        theme: state.theme,
        fontSize: state.fontSize,
        tabSize: state.tabSize,
        lineHeight: state.lineHeight,
        autoSave: state.autoSave,
        autoSaveInterval: state.autoSaveInterval,
        requestTimeout: state.requestTimeout,
        followRedirects: state.followRedirects,
        proxyEnabled: state.proxyEnabled,
        // Note: Sensitive fields (password, cert file contents) are excluded from persistence
        // to prevent accidental exposure. Users need to re-enter passwords after app restart.
        proxyConfig: {
          protocol: state.proxyConfig.protocol,
          host: state.proxyConfig.host,
          port: state.proxyConfig.port,
          username: state.proxyConfig.username,
          password: '', // Excluded for security
        },
        sslCertConfig: {
          clientCertEnabled: state.sslCertConfig.clientCertEnabled,
          clientCertFile: '', // Excluded for security
          clientKeyFile: '', // Excluded for security
          caCertFile: '', // Excluded for security
        },
        urlHistory: state.urlHistory,
        paramValueHistory: state.paramValueHistory,
        keyboardShortcuts: state.keyboardShortcuts,
        language: state.language,
        captureSettings: state.captureSettings,
      }),
    }
  )
);