/**
 * ScriptNodeConfig - Script node configuration
 */
import {
  BaseNodeConfigProps,
  ConfigSection,
  ConfigField,
  NodeHeader,
  ConfigDeleteButton,
} from "./NodeConfigBase";
import { FlowVariableInput } from "../FlowVariableInput";
import { useTranslation } from "../../../utils/i18n";
import { useSettingsStore } from "../../../store";

export function ScriptNodeConfig({ selectedNode, updateNodeData, envVariablesMap }: BaseNodeConfigProps) {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);

  const script = selectedNode.data.script as string || "";

  return (
    <div className="space-y-4">
      <NodeHeader
        nodeType="script"
        label={selectedNode.data.label as string || ""}
        onLabelChange={(label) => updateNodeData(selectedNode.id, { label })}
      />

      <ConfigSection title="⚡ JavaScript Code">
        <ConfigField
          label="Code"
          helpText="Available: inputs, setOutput(key, value), console.log()"
        >
          <FlowVariableInput
            value={script}
            onChange={(script) => updateNodeData(selectedNode.id, { script })}
            placeholder={"// Custom JavaScript\n// Available: inputs, setOutput(key, value), console.log()\nconsole.log('Processing:', inputs);\nsetOutput('result', inputs.data);"}
            currentEnv={envVariablesMap || {}}
            multiline
            rows={8}
          />
        </ConfigField>

        <div className="text-xs p-2 rounded" style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-muted)" }}>
          <div className="font-medium mb-1">{t('node.availableApis')}</div>
          <div className="space-y-1 font-mono">
            <div>inputs - Input variables from previous nodes</div>
            <div>setOutput('key', value) - Set output variable</div>
            <div>console.log() - Debug output</div>
          </div>
        </div>
      </ConfigSection>

      <ConfigDeleteButton onDelete={() => updateNodeData(selectedNode.id, { __delete: true })} />
    </div>
  );
}
