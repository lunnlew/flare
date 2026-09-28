import type { MouseEvent as ReactMouseEvent } from "react";
import { useSettingsStore } from "../../store";
import { useTranslation } from "../../utils/i18n";

interface ContextMenuItem {
  label: string;
  value: string;
  icon?: string;
  danger?: boolean;
  disabled?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onSelect: (value: string) => void;
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onSelect, onClose }: ContextMenuProps) {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);
  const handleClick = (item: ContextMenuItem) => {
    if (!item.disabled) {
      onSelect(item.value);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        onContextMenu={(e: ReactMouseEvent) => {
          e.preventDefault();
          onClose();
        }}
      />
      {/* Menu */}
      <div
        className="fixed z-50 rounded-lg shadow-xl overflow-hidden"
        role="menu"
        style={{
          left: Math.min(x, window.innerWidth - 220),
          top: Math.min(y, window.innerHeight - 300),
          backgroundColor: "var(--bg-secondary)",
          border: "1px solid var(--border-color)",
          minWidth: "180px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
        }}
      >
        <div className="py-1">
          {items.map((item, index) => (
            item.label === "" ? (
              <div
                key={`sep-${index}`}
                className="mx-2 my-1 border-t"
                style={{ borderColor: "var(--border-color)" }}
                role="separator"
              />
            ) : (
              <div
                key={item.value}
                className="flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors"
                role="menuitem"
                aria-disabled={item.disabled}
                style={{
                  color: item.disabled ? "var(--text-muted)" : item.danger ? "var(--danger)" : "var(--text-primary)",
                  opacity: item.disabled ? 0.5 : 1,
                  backgroundColor: "transparent",
                }}
                onMouseEnter={(e) => {
                  if (!item.disabled) {
                    e.currentTarget.style.backgroundColor = item.danger ? "rgba(239, 68, 68, 0.15)" : "var(--accent-muted)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
                onClick={() => handleClick(item)}
              >
                {item.icon && <span className="text-sm">{item.icon}</span>}
                <span className="text-xs flex-1">{item.label}</span>
                {item.disabled && <span className="text-xs" style={{ color: "var(--text-muted)" }}>{t('common.noContent')}</span>}
              </div>
            )
          ))}
        </div>
      </div>
    </>
  );
}

interface NodeTypeMenuProps {
  position: { x: number; y: number };
  onSelect: (type: string) => void;
  onClose: () => void;
  sourceNodeId?: string;
}

const NODE_TYPES = [
  { type: "apiCall", labelKey: "node.apiCall", icon: "🌐" },
  { type: "auth", labelKey: "node.auth", icon: "🔐" },
  { type: "condition", labelKey: "node.condition", icon: "⚡" },
  { type: "loop", labelKey: "node.loop", icon: "🔄" },
  { type: "assert", labelKey: "node.assert", icon: "✅" },
  { type: "transform", labelKey: "node.transform", icon: "🔧" },
  { type: "delay", labelKey: "node.delay", icon: "⏱" },
  { type: "log", labelKey: "node.log", icon: "📝" },
  { type: "script", labelKey: "node.script", icon: "📜" },
];

export function NodeTypeMenu({ position, onSelect, onClose, sourceNodeId }: NodeTypeMenuProps) {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
        onClick={onClose}
        onContextMenu={(e: ReactMouseEvent) => {
          e.preventDefault();
          onClose();
        }}
      />
      {/* Modal */}
      <div
        className="fixed z-50 rounded-lg shadow-xl flex flex-col overflow-hidden"
        role="menu"
        aria-label={t('flow.addChildNode')}
        style={{
          left: Math.min(position.x, window.innerWidth - 320),
          top: Math.min(position.y, window.innerHeight - 400),
          transform: "translate(-50%, -50%)",
          backgroundColor: "var(--bg-secondary)",
          border: "1px solid var(--border-color)",
          minWidth: "300px",
          boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-4 py-3 border-b"
          style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-tertiary)" }}
        >
          <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            {t('flow.addChildNode')}
          </div>
          {sourceNodeId && (
            <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              Drag from node <span className="font-mono" style={{ color: "var(--accent)" }}>{sourceNodeId}</span>
            </div>
          )}
        </div>
        {/* Grid */}
        <div className="grid grid-cols-3 gap-2 p-3">
          {NODE_TYPES.map((node) => (
            <button
              key={node.type}
              onClick={() => onSelect(node.type)}
              className="flex flex-col items-center p-3 rounded-lg transition-all"
              role="menuitem"
              aria-label={t(node.labelKey as any)}
              style={{
                backgroundColor: "var(--bg-tertiary)",
                color: "var(--text-secondary)",
                border: "1px solid transparent",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--accent-muted)";
                e.currentTarget.style.borderColor = "var(--accent)";
                e.currentTarget.style.color = "var(--accent)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "var(--bg-tertiary)";
                e.currentTarget.style.borderColor = "transparent";
                e.currentTarget.style.color = "var(--text-secondary)";
              }}
            >
              <span className="text-xl mb-1.5">{node.icon}</span>
              <span className="text-xs">{t(node.labelKey as any)}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}