import { useState, memo } from "react";
import { ParamsPanel } from "./ParamsPanel";
import { HeadersPanel } from "./HeadersPanel";
import { BodyPanel } from "./BodyPanel";
import { AuthPanel } from "./AuthPanel";
import { EnvPanel } from "./EnvPanel";
import { ScriptsPanel } from "./ScriptsPanel";
import { SchemaPanel } from "./SchemaPanel";
import { HistoryPanel } from "../History/HistoryPanel";
import { useRequestStore, useSettingsStore } from "../../store";
import { useTranslation } from "../../utils/i18n";
import type { RequestState } from "../../store";

export type TabType = "params" | "headers" | "body" | "auth" | "env" | "scripts" | "schema" | "history";

interface RequestPanelProps {
  activeTab: string;
  setActiveTab: (t: TabType) => void;
  requestState: RequestState;
  setRequestState: (updates: Partial<RequestState>) => void;
  currentEnv: Record<string, string>;
}

const tabs: { id: TabType; label: string }[] = [
  { id: "params", label: '{{request.params}}' },
  { id: "headers", label: '{{request.headers}}' },
  { id: "body", label: '{{request.body}}' },
  { id: "auth", label: '{{request.auth}}' },
  { id: "env", label: '{{flow.environment}}' },
  { id: "scripts", label: '{{request.scripts}}' },
  { id: "schema", label: "Schema" },
  { id: "history", label: '{{request.history}}' },
];

export const RequestPanel = memo(function RequestPanel({
  activeTab, setActiveTab,
  requestState, setRequestState,
  currentEnv
}: RequestPanelProps) {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);

  const [showDescription, setShowDescription] = useState(false);
  const description = requestState.description || "";

  return (
    <div className="flex flex-col h-full border-r overflow-hidden" style={{ borderColor: 'var(--border-color)' }}>
      {/* Tabs */}
      <div className="flex px-2 pt-2 gap-1" style={{ borderBottom: '1px solid var(--border-color)' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-3 py-1.5 text-xs rounded-t"
            style={activeTab === tab.id ? { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' } : { color: 'var(--text-muted)' }}
          >
            {tab.label.startsWith('{{') && tab.label.endsWith('}}') ? t(tab.label.slice(2, -2) as any) : tab.label}
          </button>
        ))}
      </div>

      {/* Description Section */}
      <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--border-color)' }}>
        <div className="flex items-center gap-2 mb-1">
          <button
            onClick={() => setShowDescription(!showDescription)}
            className="text-xs flex items-center gap-1"
            style={{ color: 'var(--text-muted)' }}
          >
            <span>{showDescription ? '▼' : '▶'}</span>
            <span>{t('request.requestDescription')}</span>
            {description && !showDescription && (
              <span className="text-[10px] px-1.5 rounded" style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}>
                {t('request.added')}
              </span>
            )}
          </button>
        </div>
        {showDescription && (
          <textarea
            value={description}
            onChange={(e) => setRequestState({ description: e.target.value })}
            placeholder={t('request.addRequestDescription')}
            className="w-full px-2 py-1.5 rounded text-xs resize-none"
            rows={2}
            style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
          />
        )}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === "params" && (
          <ParamsPanel
            currentEnv={currentEnv}
            schemaMap={requestState.parameterSchemas}
          />
        )}
        {activeTab === "headers" && (
          <HeadersPanel
            headers={requestState.headers}
            setHeaders={(h) => setRequestState({ headers: h })}
            currentEnv={currentEnv}
          />
        )}
        {activeTab === "body" && (
          <BodyPanel currentEnv={currentEnv} />
        )}
        {activeTab === "auth" && (
          <AuthPanel />
        )}
        {activeTab === "env" && (
          <EnvPanel />
        )}
        {activeTab === "scripts" && (
          <ScriptsPanel />
        )}
        {activeTab === "schema" && (
          <SchemaPanel
            requestSchemas={requestState.parameterSchemas}
            responseSchemas={requestState.responseSchemas}
            onRequestSchemasChange={(schemas, renameInfo) => {
              if (renameInfo) {
                useRequestStore.getState().renameParamKey(renameInfo.oldKey, renameInfo.newKey);
                setRequestState({ parameterSchemas: schemas as any });
              } else {
                setRequestState({ parameterSchemas: schemas as any });
              }
            }}
            onResponseSchemasChange={(schemas) => setRequestState({ responseSchemas: schemas as any })}
          />
        )}
        <div style={{ display: activeTab === "history" ? "block" : "none" }}>
          <HistoryPanel />
        </div>
      </div>
    </div>
  );
});