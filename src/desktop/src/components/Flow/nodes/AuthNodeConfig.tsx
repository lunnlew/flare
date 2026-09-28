/**
 * AuthNodeConfig - Authentication node configuration
 */
import {
  BaseNodeConfigProps,
  ConfigSection,
  ConfigField,
  ConfigSelect,
  NodeHeader,
  ConfigDeleteButton,
} from "./NodeConfigBase";
import { FlowVariableInput } from "../FlowVariableInput";
import { AUTH_TYPES } from "../FlowCanvas.constants";

const AUTH_OPTIONS = AUTH_TYPES.map((t) => ({ value: t, label: t }));

export function AuthNodeConfig({ selectedNode, updateNodeData, envVariablesMap }: BaseNodeConfigProps) {
  const authType = selectedNode.data.type as string || "bearer";
  const token = selectedNode.data.token as string || "";

  return (
    <div className="space-y-4">
      <NodeHeader
        nodeType="auth"
        label={selectedNode.data.label as string || ""}
        onLabelChange={(label) => updateNodeData(selectedNode.id, { label })}
      />

      <ConfigSection title="🔐 Authentication Type">
        <ConfigField label="Auth Type">
          <ConfigSelect
            value={authType}
            onChange={(type) => updateNodeData(selectedNode.id, { type })}
            options={AUTH_OPTIONS}
          />
        </ConfigField>
      </ConfigSection>

      <ConfigSection title="🎫 Credentials">
        <ConfigField
          label={authType === "bearer" ? "Token" : authType === "basic" ? "Username:Password" : "Value"}
          helpText="Supports {{variable}} substitution"
        >
          <FlowVariableInput
            value={token}
            onChange={(token) => updateNodeData(selectedNode.id, { token })}
            placeholder={authType === "basic" ? "username:password" : "{{env.token}} or raw value"}
            currentEnv={envVariablesMap || {}}
            multiline={authType === "basic"}
            rows={authType === "basic" ? 2 : 1}
          />
        </ConfigField>
      </ConfigSection>

      <ConfigDeleteButton onDelete={() => updateNodeData(selectedNode.id, { __delete: true })} />
    </div>
  );
}