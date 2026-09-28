/**
 * VariablesPanel - Variable watch panel
 *
 * Displays all variables in the workflow and their current values
 */

import { memo, useState } from "react";
import { useFlowStore, useSettingsStore } from "../../../store";
import { TEXT_MUTED_STYLE, BG_TERTIARY_STYLE } from "../FlowCanvas.constants";
import { useTranslation } from "../../../utils/i18n";

export const VariablesPanel = memo(function VariablesPanel() {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);

  const variables = useFlowStore((s) => s.variables);
  const setVariables = useFlowStore((s) => s.setVariables);

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const allVariables = variables;

  const handleEditStart = (key: string, value: string) => {
    setEditingKey(key);
    setEditValue(value);
  };

  const handleEditEnd = () => {
    if (editingKey !== null) {
      setVariables({ ...variables, [editingKey]: editValue });
      setEditingKey(null);
      setEditValue("");
    }
  };

  const handleDelete = (key: string) => {
    const newVars = { ...variables };
    delete newVars[key];
    setVariables(newVars);
  };

  const handleAdd = () => {
    const newKey = `var_${Object.keys(variables).length + 1}`;
    setVariables({ ...variables, [newKey]: "" });
    setEditingKey(newKey);
    setEditValue("");
  };

  const entries = Object.entries(allVariables);

  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
          {t('flow.variableWatch')} ({entries.length})
        </span>
        <button
          onClick={handleAdd}
          className="px-2 py-1 rounded text-xs"
          style={{ backgroundColor: "var(--accent)", color: "var(--text-inverse)" }}
        >
          {t('flow.addVariable')}
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-4 text-xs" style={TEXT_MUTED_STYLE}>
          {t('flow.noVariables')}
         <div className="mt-1" style={TEXT_MUTED_STYLE}>
            {t('flow.useVariableSyntax')}
          </div>
        </div>
      ) : (
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {entries.map(([key, value]) => (
            <div
              key={key}
              className="flex items-center gap-2 p-2 rounded text-xs"
              style={BG_TERTIARY_STYLE}
            >
              <span
                className="flex-shrink-0 font-mono"
                style={{ color: "var(--accent)" }}
              >
                {key}
              </span>
              <span className="flex-1 truncate" style={TEXT_MUTED_STYLE}>
                =
              </span>
              {editingKey === key ? (
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={handleEditEnd}
                  onKeyDown={(e) => e.key === "Enter" && handleEditEnd()}
                  className="flex-1 px-1 py-0.5 rounded text-xs font-mono"
                  style={{
                    backgroundColor: "var(--bg-primary)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--accent)",
                  }}
                  autoFocus
                />
              ) : (
                <span
                  className="flex-1 truncate font-mono cursor-pointer"
                  style={{ color: "var(--text-primary)" }}
                  onClick={() => handleEditStart(key, value)}
                  title={t('flow.clickToEdit')}
                >
                  {value || t('flow.empty')}
                </span>
              )}
              <button
                onClick={() => handleDelete(key)}
                className="px-1.5 py-0.5 rounded text-xs"
                style={{ backgroundColor: "var(--danger)", color: "var(--text-inverse)" }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

     <div className="mt-3 pt-2 border-t text-xs" style={{ borderColor: "var(--border-color)", color: "var(--text-muted)" }}>
        <div className="font-medium mb-1">{t('flow.variableSyntax')}</div>
        <div className="space-y-0.5 font-mono">
          <div>{t('flow.globalVar')} {"{{global.varName}}"}</div>
          <div>{t('flow.envVar')} {"{{env.varName}}"}</div>
          <div>{t('flow.workflowVar')} {"{{workflow.varName}}"}</div>
          <div>{t('flow.nodeOutputVar')} {"{{nodeId.response}}"}</div>
        </div>
      </div>
    </div>
  );
});