/**
 * TransformNodeConfig - Transform node configuration
 */
import {
  BaseNodeConfigProps,
  ConfigSection,
  ConfigField,
  NodeHeader,
  ConfigDeleteButton,
} from "./NodeConfigBase";
import { FlowVariableInput } from "../FlowVariableInput";

export function TransformNodeConfig({ selectedNode, updateNodeData, envVariablesMap }: BaseNodeConfigProps) {
  const inputMapping = selectedNode.data.inputMapping as string || "";
  const transformation = selectedNode.data.transformation as string || "";

  return (
    <div className="space-y-4">
      <NodeHeader
        nodeType="transform"
        label={selectedNode.data.label as string || ""}
        onLabelChange={(label) => updateNodeData(selectedNode.id, { label })}
      />

      <ConfigSection title="📥 Input Mapping">
        <ConfigField
          label="Source variable"
          helpText="The variable to transform (e.g., {{nodeId.response}})"
        >
          <FlowVariableInput
            value={inputMapping}
            onChange={(v) => updateNodeData(selectedNode.id, { inputMapping: v })}
            placeholder="{{nodeId.response}}"
            currentEnv={envVariablesMap || {}}
          />
        </ConfigField>
      </ConfigSection>

      <ConfigSection title="🔄 Transformation">
        <ConfigField
          label="JSONPath or Template"
          helpText="Use JSONPath ($.data.name) or template ({{field}}) syntax"
        >
          <FlowVariableInput
            value={transformation}
            onChange={(v) => updateNodeData(selectedNode.id, { transformation: v })}
            placeholder="$.data.name or {{nodeId.field}}"
            currentEnv={envVariablesMap || {}}
            multiline
            rows={3}
          />
        </ConfigField>

        <div className="text-xs p-2 rounded" style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-muted)" }}>
          <div className="font-medium mb-1">Examples:</div>
          <div className="font-mono">$.data.items[0].name</div>
          <div className="font-mono">$.data[?(@.active==true)]</div>
          <div className="font-mono">{"{{nodeId.response.data}}"}</div>
        </div>
      </ConfigSection>

      <ConfigDeleteButton onDelete={() => updateNodeData(selectedNode.id, { __delete: true })} />
    </div>
  );
}