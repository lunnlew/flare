import { useRef } from "react";
import type { ExecutionStatus } from "../../types/flow";
import { SavedFlowInfo, useEnvironmentStore, useSettingsStore, useFlowStore } from "../../store";
import { formatDate } from "../../utils/text";
import { useTranslation } from "../../utils/i18n";
import {
  EXECUTION_STATUS_COLORS,
  TEXT_MUTED_STYLE,
  BG_TERTIARY_STYLE,
  BTN_CLASS,
  BTN_DISABLED_CLASS,
} from "./FlowCanvas.constants";

interface FlowToolbarProps {
  currentFlowName: string;
  onFlowNameChange: (name: string) => void;
  onSaveFlow: () => void;
  onShowFlowList: () => void;
  onShowSubflows: () => void;
}

export function FlowToolbar({
  currentFlowName,
  onFlowNameChange,
  onSaveFlow,
  onShowFlowList,
  onShowSubflows,
}: FlowToolbarProps) {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);

  const environments = useEnvironmentStore((s) => s.environments);
  const canvasEnv = useEnvironmentStore((s) => s.canvasEnv);
  const setCanvasEnv = useEnvironmentStore((s) => s.setCanvasEnv);
  const exportFlowToFile = useFlowStore((s) => s.exportFlowToFile);
  const importFlowFromFile = useFlowStore((s) => s.importFlowFromFile);

  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className="flex items-center gap-3 rounded-lg p-2"
      style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-color)" }}
    >
      {/* Flow name */}
      <div className="flex items-center gap-2">
        <span className="text-xs" style={TEXT_MUTED_STYLE}>Flow:</span>
        <input
          type="text"
          value={currentFlowName}
          onChange={(e) => onFlowNameChange(e.target.value)}
          className="px-2 py-0.5 rounded text-xs w-36"
          style={{
            backgroundColor: "var(--bg-primary)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-color)",
          }}
        />
      </div>

      <div className="h-4 w-px" style={{ backgroundColor: "var(--border-color)" }} />

      {/* Environment selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs" style={TEXT_MUTED_STYLE}>{t('flow.environment')}:</span>
        <div className="flex gap-1">
          {environments.map(env => (
            <button
              key={env.name}
              onClick={() => setCanvasEnv(env.name)}
              className="px-2 py-0.5 rounded text-xs"
              style={
                canvasEnv === env.name
                  ? { backgroundColor: "var(--accent)", color: "var(--text-inverse)" }
                  : BG_TERTIARY_STYLE
              }
            >
              {env.name}
            </button>
          ))}
        </div>
      </div>

      <div className="h-4 w-px" style={{ backgroundColor: "var(--border-color)" }} />

      {/* Save/Load buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={onSaveFlow}
          className="px-2 py-0.5 rounded text-xs"
          style={{ backgroundColor: "var(--accent)", color: "var(--text-inverse)" }}
          title={t('flow.saveFlowAutoSave')}
        >
          💾 {t('common.save')}
        </button>
        <button
          onClick={onShowFlowList}
          className="px-2 py-0.5 rounded text-xs"
          style={BG_TERTIARY_STYLE}
          title={t('flow.loadExistingFlow')}
        >
          📂 {t('flow.load')}
        </button>
        <button
          onClick={onShowSubflows}
          className="px-2 py-0.5 rounded text-xs"
          style={BG_TERTIARY_STYLE}
          title={t('flow.insertSubflow')}
        >
          🔀 {t('flow.subflows')}
        </button>
        <button
          onClick={() => {
            exportFlowToFile();
          }}
          className="px-2 py-0.5 rounded text-xs"
          style={BG_TERTIARY_STYLE}
          title={t('flow.exportFlow')}
        >
          📤 {t('common.export')}
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-2 py-0.5 rounded text-xs"
          style={BG_TERTIARY_STYLE}
          title={t('flow.importFlow')}
        >
          📥 {t('common.import')}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) {
              await importFlowFromFile(file);
              e.target.value = '';
            }
          }}
        />
      </div>
    </div>
  );
}

interface ExecutionControlsProps {
  executionStatus: ExecutionStatus;
  executionOrderPreview: string[];
  nodeStatuses: Record<string, string>;
  onStartExecution: (options?: { maxConcurrency?: number }) => void;
  onPauseExecution: () => void;
  onStepExecute: () => void;
  onResetExecution: () => void;
  stepMode: boolean;
  maxConcurrency: number;
  onMaxConcurrencyChange: (value: number) => void;
}

export function ExecutionControls({
  executionStatus,
  executionOrderPreview: _executionOrderPreview,
  nodeStatuses: _nodeStatuses,
  onStartExecution,
  onPauseExecution,
  onStepExecute,
  onResetExecution,
  stepMode,
  maxConcurrency,
  onMaxConcurrencyChange,
}: ExecutionControlsProps) {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);

  return (
    <div
      className="flex flex-col gap-2"
      style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "8px" }}
    >
      {/* Control Buttons - Always visible */}
      <div className="flex gap-1">
        <button
          onClick={() => onStartExecution({ maxConcurrency })}
          disabled={executionStatus === "running"}
          className={BTN_DISABLED_CLASS}
          style={{ backgroundColor: "var(--success)", color: "var(--text-inverse)" }}
          title="Run workflow"
        >
          ▶
        </button>
        <button
          onClick={onPauseExecution}
          disabled={executionStatus !== "running"}
          className={BTN_DISABLED_CLASS}
          style={{ backgroundColor: "var(--warning)", color: "var(--text-inverse)" }}
          title="Pause execution"
        >
          ⏸
        </button>
        <button
          onClick={onStepExecute}
          disabled={executionStatus !== "paused" || !stepMode}
          className={BTN_DISABLED_CLASS}
          style={{ backgroundColor: "var(--accent)", color: "var(--text-inverse)" }}
          title="Step through"
        >
          ⏭
        </button>
        <button
          onClick={onResetExecution}
          className={BTN_CLASS}
          style={BG_TERTIARY_STYLE}
          title="Reset"
        >
          ↺
        </button>
      </div>

      {/* Max Concurrency Control */}
      <div className="flex items-center gap-1">
        <span className="text-xs" style={TEXT_MUTED_STYLE}>{t('flow.concurrency')}:</span>
        <select
          value={maxConcurrency}
          onChange={(e) => onMaxConcurrencyChange(Number(e.target.value))}
          className="px-1 py-0.5 rounded text-xs"
          style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }}
          title={t('flow.maxParallelNodes')}
        >
          <option value={0}>{t('flow.unlimited')}</option>
          <option value={1}>1</option>
          <option value={2}>2</option>
          <option value={4}>4</option>
          <option value={8}>8</option>
        </select>
      </div>

      {/* Status indicator */}
      <div
        className="flex items-center gap-1 text-xs px-1 py-0.5 rounded"
        style={{
          backgroundColor: EXECUTION_STATUS_COLORS[executionStatus as keyof typeof EXECUTION_STATUS_COLORS] || 'var(--bg-tertiary)',
          color: "var(--text-inverse)",
        }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--text-primary)' }} />
        {executionStatus}
      </div>
    </div>
  );
}

interface FlowListModalProps {
  show: boolean;
  savedFlows: SavedFlowInfo[];
  onClose: () => void;
  onSelectFlow: (flowId: string) => void;
  onDeleteFlow: (flowId: string) => void;
}

export function FlowListModal({
  show,
  savedFlows,
  onClose,
  onSelectFlow,
  onDeleteFlow,
}: FlowListModalProps) {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);

  if (!show) return null;

  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 50 }}
      onClick={onClose}
    >
      <div
        className="rounded-lg p-4 w-96 max-h-96 overflow-y-auto"
        style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-color)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {t('flow.savedFlows')}
          </h3>
          <button onClick={onClose} style={TEXT_MUTED_STYLE}>
            ✕
          </button>
        </div>
        {savedFlows.length === 0 ? (
          <div className="text-xs" style={TEXT_MUTED_STYLE}>{t('flow.noSavedFlows')}</div>
        ) : (
          <div className="space-y-2">
            {savedFlows.map((flow) => (
              <div
                key={flow.id}
                className="flex items-center justify-between p-2 rounded"
                style={BG_TERTIARY_STYLE}
              >
                <div>
                  <div className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                    {flow.name}
                  </div>
                  <div className="text-xs" style={TEXT_MUTED_STYLE}>
                    {formatDate(flow.updated_at)}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onSelectFlow(flow.id)}
                    className="px-2 py-1 rounded text-xs"
                    style={{ backgroundColor: "var(--accent)", color: "var(--text-inverse)" }}
                  >
                    Load
                  </button>
                  <button
                    onClick={() => onDeleteFlow(flow.id)}
                    className="px-2 py-1 rounded text-xs"
                    style={{ backgroundColor: "var(--danger)", color: "var(--text-inverse)" }}
                  >
                    Delete
                  </button>
                </div>
              </div>
                       ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface SubflowPanelProps {
  show: boolean;
  subflows: SavedFlowInfo[];
  onClose: () => void;
  onInsertSubflow: (subflowId: string) => void;
  onDeleteSubflow: (subflowId: string) => void;
}

export function SubflowPanel({
  show,
  subflows,
  onClose,
  onInsertSubflow,
  onDeleteSubflow,
}: SubflowPanelProps) {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);

  if (!show) return null;

  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 50 }}
      onClick={onClose}
    >
      <div
        className="rounded-lg p-4 w-[28rem] max-h-[80vh] overflow-y-auto"
        style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-color)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {t('flow.subflowLibrary')}
          </h3>
          <button onClick={onClose} style={TEXT_MUTED_STYLE}>
            ✕
          </button>
        </div>
        <div className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
          {t('flow.insertOrDeleteHint')}
        </div>
        {subflows.length === 0 ? (
          <div className="text-xs py-8 text-center" style={{ color: "var(--text-muted)" }}>
            {t('flow.noSubflows')}
           <div className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
              {t('flow.createSubflowHint')}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {subflows.map((subflow) => (
              <div
                key={subflow.id}
                className="flex items-center justify-between p-3 rounded"
                style={BG_TERTIARY_STYLE}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>
                    {subflow.name.replace(/^subflow\//, '')}
                  </div>
                  <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                    {formatDate(subflow.updated_at)}
                  </div>
                </div>
                <div className="flex gap-2 ml-3">
                  <button
                    onClick={() => onInsertSubflow(subflow.id)}
                    className="px-3 py-1.5 rounded text-xs"
                    style={{ backgroundColor: "var(--accent)", color: "var(--text-inverse)" }}
                  >
                    {t('common.insert')}
                  </button>
                  <button
                    onClick={() => onDeleteSubflow(subflow.id)}
                    className="px-2 py-1 rounded text-xs"
                    style={{ backgroundColor: "var(--danger)", color: "var(--text-inverse)" }}
                  >
                    {t('common.delete')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}