/**
 * ConditionNodeConfig - Condition node configuration
 */
import { useState } from "react";
import {
  BaseNodeConfigProps,
  ConfigSection,
  ConfigField,
  ConfigSelect,
  NodeHeader,
  ConfigDeleteButton,
} from "./NodeConfigBase";
import { FlowVariableInput } from "../FlowVariableInput";
import { useTranslation } from "../../../utils/i18n";
import { useSettingsStore } from "../../../store";

const OPERATOR_OPTIONS = [
  { value: "==", label: "== equal" },
  { value: "!=", label: "!= not equal" },
  { value: ">", label: "> greater than" },
  { value: "<", label: "< less than" },
  { value: ">=", label: ">= greater or equal" },
  { value: "<=", label: "<= less or equal" },
  { value: "contains", label: "contains" },
  { value: "notContains", label: "not contains" },
  { value: "startsWith", label: "starts with" },
  { value: "endsWith", label: "ends with" },
  { value: "matches", label: "matches regex" },
  { value: "exists", label: "exists" },
  { value: "notExists", label: "not exists" },
];

export function ConditionNodeConfig({ selectedNode, updateNodeData, envVariablesMap }: BaseNodeConfigProps) {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);

  const expression = selectedNode.data.expression as string || "";
  const [useSimpleMode, setUseSimpleMode] = useState(!expression);

  // Parse expression for simple mode
  const parseSimpleExpression = (expr: string) => {
    const match = expr.match(/^\{\{(.+?)\}\}\s*(==|!=|>|<|>=|<=|contains|notContains)\s*(.+)$/);
    if (match) {
      return { field: match[1], operator: match[2], value: match[3] };
    }
    return { field: "", operator: "==", value: "" };
  };

  const simple = parseSimpleExpression(expression);

  const buildExpression = (field: string, operator: string, value: string) => {
    if (!field && !value) return "";
    return `{{${field}}} ${operator} ${value}`;
  };

  const handleSimpleChange = (field: string, operator: string, value: string) => {
    const expr = buildExpression(field, operator, value);
    updateNodeData(selectedNode.id, { expression: expr, field, operator, value });
  };

  return (
    <div className="space-y-4">
      <NodeHeader
        nodeType="condition"
        label={selectedNode.data.label as string || ""}
        onLabelChange={(label) => updateNodeData(selectedNode.id, { label })}
      />

      <ConfigSection title="🔀 Expression">
        <ConfigField label="Mode">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={useSimpleMode}
              onChange={(e) => setUseSimpleMode(e.target.checked)}
            />
            <span className="text-xs">{t('node.useSimpleMode')}</span>
          </label>
        </ConfigField>

        {useSimpleMode ? (
          <div className="space-y-3">
            <ConfigField label="Field (variable)">
              <FlowVariableInput
                value={simple.field}
                onChange={(field) => handleSimpleChange(field, simple.operator, simple.value)}
                placeholder="{{nodeId.field}}"
                currentEnv={envVariablesMap || {}}
              />
            </ConfigField>
            <ConfigField label="Operator">
              <ConfigSelect
                value={simple.operator}
                onChange={(operator) => handleSimpleChange(simple.field, operator, simple.value)}
                options={OPERATOR_OPTIONS}
              />
            </ConfigField>
            {!["exists", "notExists"].includes(simple.operator) && (
              <ConfigField label="Value">
                <FlowVariableInput
                  value={simple.value}
                  onChange={(value) => handleSimpleChange(simple.field, simple.operator, value)}
                  placeholder="expected value"
                  currentEnv={envVariablesMap || {}}
                />
              </ConfigField>
            )}
          </div>
        ) : (
          <ConfigField label="Expression" helpText="Format: {{field}} operator value">
            <FlowVariableInput
              value={expression}
              onChange={(expr) => updateNodeData(selectedNode.id, { expression: expr })}
              placeholder="{{statusCode}} == 200"
              currentEnv={envVariablesMap || {}}
              multiline
              rows={2}
            />
          </ConfigField>
        )}

        <div className="text-xs p-2 rounded" style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-muted)" }}>
          <div className="font-medium mb-1">{t('node.supportedOperators')}</div>
          <div>Comparison: ==, !=, &gt;, &lt;, &gt;=, &lt;=</div>
          <div>String: contains, notContains, startsWith, endsWith, matches</div>
          <div>Null: exists, notExists</div>
        </div>
      </ConfigSection>

      <ConfigDeleteButton onDelete={() => updateNodeData(selectedNode.id, { __delete: true })} />
    </div>
  );
}