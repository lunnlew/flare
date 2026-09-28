/**
 * NodeConfigBase - Shared base components for node configurations
 *
 * Provides consistent patterns: section headers, collapsible sections,
 * inline validation, and common layouts
 */
import React, { useState } from "react";
import type { Node as RFNode } from "reactflow";
import type { Variable } from "../../../store/environmentStore";
import { TEXT_MUTED_STYLE, INPUT_STYLE, INPUT_CLASS } from "../FlowCanvas.constants";
import { useTranslation } from "../../../utils/i18n";
import { useSettingsStore } from "../../../store";

/**
 * Node type metadata for display
 */
export const NODE_TYPE_META: Record<string, { label: string; icon: string; description: string }> = {
  apiCall: { label: "API Call", icon:"🌐", description: "Execute HTTP request" },
  auth: { label: "Auth", icon: "🔐", description: "Authentication/Authorization" },
  condition: { label: "Condition", icon: "🔀", description: "Branch based on expression" },
  loop: { label: "Loop", icon: "🔁", description: "Repeat operations" },
  transform: { label: "Transform", icon: "🔄", description: "Transform data" },
  assert: { label: "Assert", icon: "✅", description: "Validate assertions" },
  delay: { label: "Delay", icon: "⏱", description: "Wait for duration" },
  log: { label: "Log", icon: "📝", description: "Log message" },
  script: { label: "Script", icon: "📜", description: "Custom JavaScript" },
};

/**
 * Base props for all node config components
 */
export interface BaseNodeConfigProps {
  selectedNode: RFNode;
  updateNodeData: (nodeId: string, data: Record<string, unknown>) => void;
  currentEnvVariables?: Variable[];
  envVariablesMap?: Record<string, string>;
}

/**
 * Collapsible section component
 */
export function ConfigSection({
  title,
  children,
  defaultOpen = true,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`border rounded-lg overflow-hidden ${className}`} style={{ borderColor: "var(--border-color)" }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 flex items-center justify-between text-xs font-medium"
        style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-primary)" }}
      >
        <span>{title}</span>
        <span style={{ color: "var(--text-muted)" }}>{isOpen ? "▼" : "▶"}</span>
      </button>
      {isOpen && <div className="p-3 space-y-3">{children}</div>}
    </div>
  );
}

/**
 * Form field wrapper with label
 */
export function ConfigField({
  label,
  children,
  helpText,
  error,
}: {
  label: string;
  children: React.ReactNode;
  helpText?: string;
  error?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs" style={TEXT_MUTED_STYLE}>
        {label}
      </label>
      {children}
      {helpText && !error && (
        <div className="text-xs" style={{ color: "var(--text-muted)" }}>
          {helpText}
        </div>
      )}
      {error && (
        <div className="text-xs" style={{ color: "var(--danger)" }}>
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}

/**
 * Text input with consistent styling
 */
export function ConfigInput({
  value,
  onChange,
  placeholder,
  type = "text",
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full px-2 py-1.5 rounded text-xs ${className}`}
      style={{ ...INPUT_STYLE, backgroundColor: "var(--bg-primary)", color: "var(--text-primary)" }}
    />
  );
}

/**
 * Number input with consistent styling
 */
export function ConfigNumberInput({
  value,
  onChange,
  placeholder,
  min,
  max,
  className = "",
}: {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  min?: number;
  max?: number;
  className?: string;
}) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value) || 0)}
      placeholder={placeholder}
      min={min}
      max={max}
      className={`w-full px-2 py-1.5 rounded text-xs ${className}`}
      style={{ ...INPUT_STYLE, backgroundColor: "var(--bg-primary)", color: "var(--text-primary)" }}
    />
  );
}

/**
 * Select dropdown with consistent styling
 */
export function ConfigSelect({
  value,
  onChange,
  options,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full px-2 py-1.5 rounded text-xs ${className}`}
      style={{ ...INPUT_STYLE, backgroundColor: "var(--bg-primary)", color: "var(--text-primary)" }}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

/**
 * Checkbox with label
 */
export function ConfigCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded"
      />
      <span className="text-xs" style={{ color: "var(--text-primary)" }}>
        {label}
      </span>
    </label>
  );
}

/**
 * Delete button with confirmation
 */
export function ConfigDeleteButton({
  onDelete,
}: {
  onDelete: () => void;
}) {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);
  const [confirm, setConfirm] = useState(false);

  if (confirm) {
    return (
      <div className="flex items-center gap-2 p-2 rounded" style={{ backgroundColor: "rgba(239, 68, 68, 0.1)" }}>
        <span className="text-xs" style={{ color: "var(--danger)" }}>{t('node.confirmDelete')}</span>
        <button
          onClick={onDelete}
          className="px-2 py-1 text-xs rounded"
          style={{ backgroundColor: "var(--danger)", color: "var(--text-inverse)" }}
        >
          {t('common.delete')}
        </button>
        <button
          onClick={() => setConfirm(false)}
          className="px-2 py-1 text-xs rounded border"
          style={{ borderColor: "var(--border-color)", color: "var(--text-muted)" }}
        >
          {t('common.cancel')}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="w-full px-3 py-2 text-xs rounded border transition-colors"
      style={{
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        color: "var(--danger)",
        borderColor: "var(--danger)",
      }}
    >
      Delete Node
    </button>
  );
}

/**
 * Node header with type icon and label input
 */
export function NodeHeader({
  nodeType,
  label,
  onLabelChange,
}: {
  nodeType: string;
  label: string;
  onLabelChange: (label: string) => void;
}) {
  const meta = NODE_TYPE_META[nodeType] || { label: nodeType, icon:"📦", description: "" };

  return (
    <div className="flex items-center gap-3 pb-3 border-b" style={{ borderColor: "var(--border-color)" }}>
      <span className="text-2xl">{meta.icon}</span>
      <div className="flex-1">
        <div className="text-xs mb-1" style={TEXT_MUTED_STYLE}>
          {meta.label}
        </div>
        <input
          type="text"
          value={label || ""}
          onChange={(e) => onLabelChange(e.target.value)}
          placeholder="Enter node label..."
          className={`w-full px-2 py-1.5 rounded text-sm ${INPUT_CLASS}`}
          style={{ backgroundColor: "var(--bg-primary)", color: "var(--text-primary)" }}
        />
      </div>
    </div>
  );
}