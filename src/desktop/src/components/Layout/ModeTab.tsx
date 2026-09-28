import type { AppMode } from "../../store";
import { useTranslation } from "../../utils/i18n";
import { useSettingsStore } from "../../store";

interface ModeTabProps {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
  collapsed: boolean;
}

const tabs: { id: AppMode; labelKey: string; icon: string }[] = [
  { id: "list", labelKey: "nav.apiList", icon: "M4 6h16M4 10h16M4 14h16M4 18h16" },
  { id: "flow", labelKey: "nav.flowCanvas", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
  { id: "request", labelKey: "nav.requestBuilder", icon: "M12 19l9 2-9-18-9 18 9-2zm0 0v-8" },
  { id: "env", labelKey: "nav.environment", icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" },
  { id: "mock", labelKey: "nav.mockConfig", icon: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" },
  { id: "chat", labelKey: "nav.aiChat", icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" },
  { id: "settings", labelKey: "nav.settings", icon: "M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" },
  { id: "git", labelKey: "nav.gitVersion", icon: "M12 2v6M12 18v6M4.93 4.93l4.24 4.24M14.8314.83l4.24 4.24M212h6M18 12h6M4.93 19.07l4.24-4.24M14.83 9.17l4.24-4.24" },
];

export function ModeTab({ mode, onModeChange, collapsed }: ModeTabProps) {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);

  return (
    <nav
      className="h-full flex flex-col transition-all duration-200"
      style={{ backgroundColor: 'var(--bg-secondary)', borderRight: '1px solid var(--border-color)' }}
    >
      {/* Nav Items */}
      <div className="flex-1 py-2 px-1.5 space-y-0.5">
        {tabs.map((tab) => {
          const isActive = mode === tab.id;
          const label = t(tab.labelKey as any);
          return (
            <button
              key={tab.id}
              onClick={() => onModeChange(tab.id)}
              title={label}
              className="w-full flex items-center gap-2 px-2 py-2 rounded-md transition-all duration-150"
              style={{
                backgroundColor: isActive ? 'var(--accent-muted)' : 'transparent',
                color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
              }}
            >
              <svg className="w-[18px] h-[18px] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
              </svg>
              {!collapsed && (
                <span className="text-xs font-medium">{label}</span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
