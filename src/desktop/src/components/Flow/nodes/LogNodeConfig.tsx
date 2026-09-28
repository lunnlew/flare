/**
 * LogNodeConfig - Log node configuration
 */
import {
  BaseNodeConfigProps,
  ConfigSection,
  ConfigField,
  NodeHeader,
  ConfigDeleteButton,
} from "./NodeConfigBase";
import { FlowVariableInput } from "../FlowVariableInput";

export function LogNodeConfig({ selectedNode, updateNodeData, envVariablesMap }: BaseNodeConfigProps) {
  const message = selectedNode.data.message as string || "";

  return (
    <div className="space-y-4">
      <NodeHeader
        nodeType="log"
        label={selectedNode.data.label as string || ""}
        onLabelChange={(label) => updateNodeData(selectedNode.id, { label })}
      />

      <ConfigSection title="📝 Log Message">
        <ConfigField label="Message" helpText="Supports {{variable}} substitution">
          <FlowVariableInput
            value={message}
            onChange={(message) => updateNodeData(selectedNode.id, { message })}
            placeholder="Log message with {{variable}}"
            currentEnv={envVariablesMap || {}}
            multiline
            rows={3}
          />
        </ConfigField>
      </ConfigSection>

      <ConfigDeleteButton onDelete={() => updateNodeData(selectedNode.id, { __delete: true })} />
    </div>
  );
}
