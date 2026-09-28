import { useEffect, lazy, Suspense } from "react";
import { ModeTab } from "./components/Layout/ModeTab";
import { useUIStore, useCollectionStore, useEnvironmentStore, useRequestStore, useNotificationStore, useSettingsStore, type Theme, type AppMode } from "./store";
import { ToastContainer } from "./components/Common/Toast";
import { useToasts } from "./store/notificationStore";
import { ConfirmDialog } from "./components/Common/ConfirmDialog";
import { Spinner } from "./components/Common/Spinner";
import { useCaptureServer } from "./hooks/Capture/useCaptureServer";
import { useTranslation } from "./utils/i18n";
import { logger } from "./utils/logger";

// Lazy load components for better initial load time
const FlowCanvas = lazy(() => import("./components/Flow/FlowCanvas").then(m => ({ default: m.FlowCanvas })));
const Workspace = lazy(() => import("./components/Layout/Workspace").then(m => ({ default: m.Workspace })));
const AIChatMode = lazy(() => import("./components/AI/AIChatMode").then(m => ({ default: m.AIChatMode })));
const RequestBuilder = lazy(() => import("./components/Request/RequestBuilder").then(m => ({ default: m.RequestBuilder })));
const EnvConfig = lazy(() => import("./components/Settings/EnvConfig").then(m => ({ default: m.EnvConfig })));
const MockConfig = lazy(() => import("./components/Settings/MockConfig").then(m => ({ default: m.MockConfig })));
const AppSettings = lazy(() => import("./components/Settings/AppSettings").then(m => ({ default: m.AppSettings })));
const GitPanel = lazy(() => import("./components/Settings/GitPanel").then(m => ({ default: m.GitPanel })));
const CustomTitleBar = lazy(() => import("./components/Layout/CustomTitleBar").then(m => ({ default: m.CustomTitleBar })));

// Loading fallback component
function LoadingFallback({ loadingText }: { loadingText: string }) {
  return (
    <div className="h-full flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" borderColor="var(--border-color)" topColor="var(--accent)" />
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{loadingText}</span>
      </div>
    </div>
  );
}

const themes: { id: Theme; nameKey: string; preview: string }[] = [
  { id: "dark", nameKey: "app.theme.dark", preview: "#0d1117" },
  { id: "light", nameKey: "app.theme.light", preview: "#FFFFFF" },
  { id: "blue", nameKey: "app.theme.blue", preview: "#2C3333" },
  { id: "notion", nameKey: "app.theme.notion", preview: "#FFF8F0" },
  { id: "vermont", nameKey: "app.theme.vermont", preview: "#1A1A1A" },
];

function App() {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);
  const mode = useUIStore((s) => s.mode);
  const setMode = useUIStore((s) => s.setMode);
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useUIStore((s) => s.setSidebarCollapsed);
  const currentTheme = useUIStore((s) => s.currentTheme);
  const setCurrentTheme = useUIStore((s) => s.setCurrentTheme);
  const showThemeMenu = useUIStore((s) => s.showThemeMenu);
  const setShowThemeMenu = useUIStore((s) => s.setShowThemeMenu);
  const loadApis = useCollectionStore((s) => s.loadApis);
  const loadEnvironments = useEnvironmentStore((s) => s.loadEnvironments);
  // 主题切换
  const handleThemeChange = (theme: Theme) => {
    setCurrentTheme(theme);
    document.documentElement.setAttribute("data-theme", theme);
    // 直接保存到 localStorage - 使用不可变模式
    try {
      const saved = localStorage.getItem('flare-ui-state');
      const parsed = saved ? JSON.parse(saved) : { state: {} };
      const updated = { ...parsed, state: { ...parsed.state, currentTheme: theme } };
      localStorage.setItem('flare-ui-state', JSON.stringify(updated));
    } catch (e) {
      logger.warn('Failed to persist theme preference', { error: String(e) });
    }
    setShowThemeMenu(false);
  };

  // 初始化数据
  useEffect(() => {
    loadApis();
    loadEnvironments();
  }, []);

  // Capture WebSocket server - singleton at app level
  useCaptureServer();

  // 同步 DOM 与 store 的主题
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", currentTheme);
  }, [currentTheme]);

  const currentThemeData = themes.find(t => t.id === currentTheme) || themes[0];

  // Mode mapping for keyboard shortcuts (Ctrl+1-8)
  const modeShortcuts: Record<string, AppMode> = {
    '1': 'list',
    '2': 'flow',
    '3': 'request',
    '4': 'env',
    '5': 'mock',
    '6': 'chat',
    '7': 'settings',
    '8': 'git',
  };

  // Mode cycle order for Tab navigation
  const modeCycle: AppMode[] = ['list', 'flow', 'request', 'env', 'mock', 'chat', 'settings', 'git'];

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        // Mode switching shortcuts (Ctrl+1 through Ctrl+8)
        if (e.key >= '1' && e.key <= '8') {
          const targetMode = modeShortcuts[e.key];
          if (targetMode) {
            e.preventDefault();
            setMode(targetMode);
            return;
          }
        }

        // Ctrl+Tab: next mode, Ctrl+Shift+Tab: previous mode
        if (e.key === 'Tab') {
          e.preventDefault();
          const currentIndex = modeCycle.indexOf(mode);
          if (e.shiftKey) {
            // Previous mode
            const prevIndex = currentIndex <= 0 ? modeCycle.length - 1 : currentIndex - 1;
            setMode(modeCycle[prevIndex]);
          } else {
            // Next mode
            const nextIndex = currentIndex >= modeCycle.length - 1 ? 0 : currentIndex + 1;
            setMode(modeCycle[nextIndex]);
          }
          return;
        }

        switch (e.key.toLowerCase()) {
          case 'b':
            e.preventDefault();
            setSidebarCollapsed(!sidebarCollapsed);
            break;
          case 'e':
            e.preventDefault();
            setMode('env');
            break;
          case ',':
            e.preventDefault();
            setMode('settings');
            break;
                   case 'n':
            e.preventDefault();
            // Create new request - clear current endpoint and reset state
            useRequestStore.getState().resetRequestState();
            useRequestStore.getState().loadEndpoint(null);
            break;
          case 'w':
            e.preventDefault();
            // Close any open overlays (theme menu, etc.)
            if (showThemeMenu) setShowThemeMenu(false);
            break;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sidebarCollapsed, setSidebarCollapsed, setMode, mode, showThemeMenu, setShowThemeMenu]);

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {/* Custom Title Bar - independent, at top level */}
      <Suspense fallback={null}>
        <CustomTitleBar />
      </Suspense>

      {/* Body: Sidebar + Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar Navigation */}
        <ModeTab mode={mode} onModeChange={setMode} collapsed={sidebarCollapsed} />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Main Area Header */}
          <header className="h-11 flex items-center px-4 border-b" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1.5 rounded-md transition-colors mr-3"
              style={{ color: 'var(--text-muted)' }}
              title={sidebarCollapsed ? t('app.expand') : t('app.collapse')}
            >
              <svg
                className={`w-4 h-4 transition-transform duration-200 ${sidebarCollapsed ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex-1" />

            {/* Theme Selector */}
            <div className="relative">
              <button
                onClick={() => setShowThemeMenu(!showThemeMenu)}
                className="flex items-center gap-2 px-2 py-1 rounded text-xs transition-colors"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
              >
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: currentThemeData.preview, outline: '1px solid var(--border-color)' }} />
                <span>{t(currentThemeData.nameKey as any)}</span>
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showThemeMenu && (
                <div className="absolute right-0 top-full mt-1 p-1.5 rounded-lg shadow-xl z-50 flex gap-1" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                  {themes.map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => handleThemeChange(theme.id)}
                      className="flex flex-col items-center gap-1 p-2 rounded-md transition-all"
                      style={{ backgroundColor: currentTheme === theme.id ? 'var(--accent-muted)' : 'transparent' }}
                      title={t(theme.nameKey as any)}
                    >
                      <span className="w-6 h-6 rounded-full" style={{ backgroundColor: theme.preview, outline: '1px solid var(--border-color)' }} />
                      <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{t(theme.nameKey as any)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-hidden">
            <Suspense fallback={<LoadingFallback loadingText={t('app.loading')} />}>
              <div className={mode === "flow" ? "h-full" : "h-full hidden"}>
                <FlowCanvas />
              </div>
              <div className={mode === "list" ? "h-full" : "h-full hidden"}>
                <Workspace />
              </div>
              <div className={mode === "chat" ? "h-full" : "h-full hidden"}>
                <AIChatMode />
              </div>
              <div className={mode === "request" ? "h-full" : "h-full hidden"}>
                <RequestBuilder />
              </div>
              <div className={mode === "env" ? "h-full" : "h-full hidden"}>
                <EnvConfig />
              </div>
              <div className={mode === "mock" ? "h-full" : "h-full hidden"}>
                <MockConfig />
              </div>
              <div className={mode === "settings" ? "h-full" : "h-full hidden"}>
                <AppSettings />
              </div>
              <div className={mode === "git" ? "h-full" : "h-full hidden"}>
                <GitPanel />
              </div>
            </Suspense>
          </main>
        </div>
      </div>

      {/* Global Notifications */}
      <GlobalNotifications />
    </div>
  );
}

function GlobalNotifications() {
  const toasts = useToasts();
  const hideToast = useNotificationStore((s) => s.hideToast);
  const dialog = useNotificationStore((s) => s.dialog);
  const confirm = useNotificationStore((s) => s.confirm);
  const cancel = useNotificationStore((s) => s.cancel);

  return (
    <>
      <ToastContainer toasts={toasts} onHide={hideToast} />
      <ConfirmDialog
        isOpen={dialog.isOpen}
        title={dialog.title}
        message={dialog.message || ""}
        confirmText={dialog.confirmText}
        cancelText={dialog.cancelText}
        destructive={dialog.destructive}
        onConfirm={confirm}
        onCancel={cancel}
      />
    </>
  );
}

export default App;
