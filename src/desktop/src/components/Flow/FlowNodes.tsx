import { Handle, Position } from "reactflow";
import type { ScriptNodeData } from "../../types/flow";
import { METHOD_STYLES } from "../../styles/method-colors";
import { useTranslation } from "../../utils/i18n";
import { useSettingsStore } from "../../store";

export const STATUS_COLORS = {
  pending: { border: 'var(--border-color)' },
  running: { border: 'var(--accent)', animation: 'pulse' },
  success: { border: 'var(--success)' },
  error: { border: 'var(--danger)' },
  paused: { border: 'var(--warning)' },
};

function getTimingColor(duration: number): string {
  if (duration < 100) return 'var(--success)';
  if (duration < 500) return 'var(--warning)';
  return 'var(--danger)';
}

// Breakpoint indicator component
function BreakpointIndicator({ enabled }: { enabled: boolean }) {
  const t = useNodeTranslation();
  if (!enabled) return null;
  return (
    <span
      className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
      style={{ backgroundColor: 'var(--danger)', border: '2px solid var(--bg-secondary)' }}
      title={t('flow.breakpointEnabled')}
    />
  );
}

export interface ApiCallNodeData {
  label: string;
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
  status?: "pending" | "running" | "success" | "error";
  response?: any;
  duration?: number;
}

export interface AuthNodeData {
  label: string;
  type: string;
  config?: any;
  status?: "pending" | "running" | "success" | "error";
  duration?: number;
}

export interface ConditionNodeData {
  label: string;
  expression: string;
  trueBranch?: string;
  falseBranch?: string;
  status?: "pending" | "running" | "success" | "error";
  duration?: number;
}

export interface LoopNodeData {
  label: string;
  iterations: number;
  currentIteration: number;
  status?: "pending" | "running" | "success" | "error";
  duration?: number;
}

export interface TransformNodeData {
  label: string;
  inputMapping: string;
  outputMapping: string;
  status?: "pending" | "running" | "success" | "error";
  duration?: number;
}

export interface AssertNodeData {
  label: string;
  expression: string;
  expectedValue?: string;
  status?: "pending" | "running" | "success" | "error";
  duration?: number;
}

export interface DelayNodeData {
  label: string;
  duration: number;
  status?: "pending" | "running" | "success" | "error";
  actualDuration?: number;
}

export interface LogNodeData {
  label: string;
  message: string;
  status?: "pending" | "running" | "success" | "error";
  duration?: number;
}

// Shared translation hook for node components
function useNodeTranslation() {
  const language = useSettingsStore((s) => s.language);
  return useTranslation(language);
}

export function ApiCallNode({ data, selected }: { data: ApiCallNodeData & { breakpoint?: boolean }; selected?: boolean }) {
  const t = useNodeTranslation();
  return (
    <div
      className="px-4 py-2 rounded-lg border-2 min-w-[180px] relative"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderColor: selected ? 'var(--accent)' : STATUS_COLORS[data.status || "pending"].border,
        boxShadow: selected ? '0 0 0 2px var(--accent), 0 0 12px rgba(59, 130, 246, 0.4)' : undefined,
        color: 'var(--text-primary)',
      }}
    >
      <BreakpointIndicator enabled={data.breakpoint ?? false} />
      <Handle type="target" position={Position.Top} className="w-3 h-3" style={{ backgroundColor: 'var(--border-color)' }} />
      <div className="flex items-center gap-2">
        <span
          className="px-2 py-0.5 text-xs font-bold rounded"
          style={{ backgroundColor: METHOD_STYLES[data.method]?.bg || 'var(--bg-tertiary)', color: 'var(--text-inverse)' }}
        >
          {data.method}
        </span>
        <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{data.label}</span>
      </div>
      {data.url && (
        <div className="mt-1 text-xs truncate font-mono" style={{ color: 'var(--text-muted)' }}>{data.url}</div>
      )}
      {data.status === "success" && (
        <div className="mt-1 flex items-center justify-between">
          <span className="text-xs" style={{ color: 'var(--success)' }}>✓ {data.response?.status || t('common.success')}</span>
          {data.duration && (
            <span className="text-xs font-mono" style={{ color: getTimingColor(data.duration) }}>
              {data.duration}ms
            </span>
          )}
        </div>
      )}
      {data.status === "error" && (
        <div className="mt-1 flex items-center justify-between">
          <span className="text-xs" style={{ color: 'var(--danger)' }}>✗ {t('common.error')}</span>
          {data.duration && (
            <span className="text-xs font-mono" style={{ color: getTimingColor(data.duration) }}>
              {data.duration}ms
            </span>
          )}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" style={{ backgroundColor: 'var(--border-color)' }} />
    </div>
  );
}

export function AuthNode({ data, selected }: { data: AuthNodeData; selected?: boolean }) {
  return (
    <div
      className="px-4 py-2 rounded-lg border-2 min-w-[140px]"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderColor: selected ? 'var(--accent)' : STATUS_COLORS[data.status || "pending"].border,
        boxShadow: selected ? '0 0 0 2px var(--accent), 0 0 12px rgba(59, 130, 246, 0.4)' : undefined,
        color: 'var(--text-primary)',
      }}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3" style={{ backgroundColor: 'var(--border-color)' }} />
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
        <span className="text-sm">{data.label}</span>
      </div>
      <div className="mt-1 flex items-center justify-between">
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{data.type}</span>
        {data.duration && (
          <span className="text-xs font-mono" style={{ color: getTimingColor(data.duration) }}>
            {data.duration}ms
          </span>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" style={{ backgroundColor: 'var(--border-color)' }} />
    </div>
  );
}

export function ConditionNode({ data, selected }: { data: ConditionNodeData; selected?: boolean }) {
  const t = useNodeTranslation();
  return (
    <div
      className="px-4 py-2 rounded-lg border min-w-[160px]"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderColor: selected ? 'var(--accent)' : 'var(--accent)',
        boxShadow: selected ? '0 0 0 2px var(--accent), 0 0 12px rgba(59, 130, 246, 0.4)' : undefined,
        color: 'var(--text-primary)',
      }}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3" style={{ backgroundColor: 'var(--border-color)' }} />
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="5" x2="12" y2="19" />
          <polyline points="19 12 12 19 5 12" />
        </svg>
        <span className="text-sm">{data.label}</span>
      </div>
      <div className="mt-1 flex items-center justify-between">
        <span className="text-xs font-mono truncate" style={{ color: 'var(--text-muted)' }}>{data.expression || "condition"}</span>
        {data.duration && (
          <span className="text-xs font-mono ml-1" style={{ color: getTimingColor(data.duration) }}>
            {data.duration}ms
          </span>
        )}
      </div>
      <div className="flex mt-1">
        <Handle type="source" position={Position.Bottom} className="w-3 h-3" style={{ left: "30%", backgroundColor: 'var(--border-color)' }} id="true" />
        <span className="text-xs absolute" style={{ left: "20%", top: "70%", color: 'var(--success)' }}>{t('common.true')}</span>
        <Handle type="source" position={Position.Bottom} className="w-3 h-3" style={{ left: "70%", backgroundColor: 'var(--border-color)' }} id="false" />
        <span className="text-xs absolute" style={{ left: "60%", top: "70%", color: 'var(--danger)' }}>{t('common.false')}</span>
      </div>
    </div>
  );
}

export function LoopNode({ data, selected }: { data: LoopNodeData; selected?: boolean }) {
  return (
    <div
      className="px-4 py-2 rounded-lg border min-w-[140px]"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderColor: selected ? 'var(--accent)' : 'var(--node-loop)',
        boxShadow: selected ? '0 0 0 2px var(--accent), 0 0 12px rgba(59, 130, 246, 0.4)' : undefined,
        color: 'var(--text-primary)',
      }}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3" style={{ backgroundColor: 'var(--border-color)' }} />
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 2l4 4-4 4M3 11v-1a4 4 0 014-4h14M7 22l-4-4 4-4M21 13v1a4 4 0 01-4 4H3" />
        </svg>
        <span className="text-sm">{data.label}</span>
      </div>
      <div className="mt-1 flex items-center justify-between">
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {data.currentIteration || 0} / {data.iterations || 1}
        </span>
        {data.duration && (
          <span className="text-xs font-mono" style={{ color: getTimingColor(data.duration) }}>
            {data.duration}ms
          </span>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" style={{ backgroundColor: 'var(--border-color)' }} />
    </div>
  );
}

export function TransformNode({ data, selected }: { data: TransformNodeData; selected?: boolean }) {
  return (
    <div
      className="px-4 py-2 rounded-lg border min-w-[140px]"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderColor: selected ? 'var(--accent)' : 'var(--node-transform)',
        boxShadow: selected ? '0 0 0 2px var(--accent), 0 0 12px rgba(59, 130, 246, 0.4)' : undefined,
        color: 'var(--text-primary)',
      }}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3" style={{ backgroundColor: 'var(--border-color)' }} />
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
        <span className="text-sm">{data.label}</span>
      </div>
      <div className="mt-1 flex items-center justify-between">
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Transform</span>
        {data.duration && (
          <span className="text-xs font-mono" style={{ color: getTimingColor(data.duration) }}>
            {data.duration}ms
          </span>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" style={{ backgroundColor: 'var(--border-color)' }} />
    </div>
  );
}

export function AssertNode({ data, selected }: { data: AssertNodeData; selected?: boolean }) {
  return (
    <div
      className="px-4 py-2 rounded-lg border min-w-[140px]"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderColor: selected ? 'var(--accent)' : 'var(--success)',
        boxShadow: selected ? '0 0 0 2px var(--accent), 0 0 12px rgba(59, 130, 246, 0.4)' : undefined,
        color: 'var(--text-primary)',
      }}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3" style={{ backgroundColor: 'var(--border-color)' }} />
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span className="text-sm">{data.label}</span>
      </div>
      <div className="mt-1 flex items-center justify-between">
        <span className="text-xs font-mono truncate" style={{ color: 'var(--text-muted)' }}>{data.expression || "assert"}</span>
        {data.duration && (
          <span className="text-xs font-mono ml-1" style={{ color: getTimingColor(data.duration) }}>
            {data.duration}ms
          </span>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" style={{ backgroundColor: 'var(--border-color)' }} />
    </div>
  );
}

export function DelayNode({ data, selected }: { data: DelayNodeData; selected?: boolean }) {
  return (
    <div
      className="px-4 py-2 rounded-lg border min-w-[120px]"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderColor: selected ? 'var(--accent)' : 'var(--warning)',
        boxShadow: selected ? '0 0 0 2px var(--accent), 0 0 12px rgba(59, 130, 246, 0.4)' : undefined,
        color: 'var(--text-primary)',
      }}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3" style={{ backgroundColor: 'var(--border-color)' }} />
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <span className="text-sm">{data.label}</span>
      </div>
      <div className="mt-1 flex items-center justify-between">
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{data.duration}ms</span>
        {data.actualDuration && (
          <span className="text-xs font-mono" style={{ color: getTimingColor(data.actualDuration) }}>
            ({data.actualDuration}ms)
          </span>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" style={{ backgroundColor: 'var(--border-color)' }} />
    </div>
  );
}

export function LogNode({ data, selected }: { data: LogNodeData; selected?: boolean }) {
  return (
    <div
      className="px-4 py-2 rounded-lg border min-w-[120px]"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderColor: selected ? 'var(--accent)' : 'var(--border-color)',
        boxShadow: selected ? '0 0 0 2px var(--accent), 0 0 12px rgba(59, 130, 246, 0.4)' : undefined,
        color: 'var(--text-primary)',
      }}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3" style={{ backgroundColor: 'var(--border-color)' }} />
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
        <span className="text-sm">{data.label || "Log"}</span>
      </div>
      <div className="mt-1 flex items-center justify-between">
        <span className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{data.message || 'Log'}</span>
        {data.duration && (
          <span className="text-xs font-mono ml-1" style={{ color: getTimingColor(data.duration) }}>
            {data.duration}ms
          </span>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" style={{ backgroundColor: 'var(--border-color)' }} />
    </div>
  );
}

export function ScriptNode({ data, selected }: { data: ScriptNodeData & { duration?: number }; selected?: boolean }) {
  return (
    <div
      className="px-4 py-2 rounded-lg border min-w-[140px]"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderColor: selected ? 'var(--accent)' : STATUS_COLORS[data.status || "pending"].border,
        boxShadow: selected ? '0 0 0 2px var(--accent), 0 0 12px rgba(59, 130, 246, 0.4)' : undefined,
        color: 'var(--text-primary)',
      }}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3" style={{ backgroundColor: 'var(--border-color)' }} />
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
        <span className="text-sm">{data.label || "Script"}</span>
      </div>
      <div className="mt-1 flex items-center justify-between">
        <span className="text-xs truncate font-mono" style={{ color: 'var(--text-muted)' }}>
          {data.script ? data.script.slice(0, 25) + (data.script.length > 25 ? '...' : '') : 'JavaScript'}
        </span>
        {data.duration && (
          <span className="text-xs font-mono ml-1" style={{ color: getTimingColor(data.duration) }}>
            {data.duration}ms
          </span>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" style={{ backgroundColor: 'var(--border-color)' }} />
    </div>
  );
}
