/**
 * LoopNodeConfig - Loop node configuration
 */
import {
  BaseNodeConfigProps,
  ConfigSection,
  ConfigField,
  ConfigNumberInput,
  NodeHeader,
  ConfigDeleteButton,
} from "./NodeConfigBase";

export function LoopNodeConfig({ selectedNode, updateNodeData }: BaseNodeConfigProps) {
  const iterations = selectedNode.data.iterations as number || 1;

  return (
    <div className="space-y-4">
      <NodeHeader
        nodeType="loop"
        label={selectedNode.data.label as string || ""}
        onLabelChange={(label) => updateNodeData(selectedNode.id, { label })}
      />

      <ConfigSection title="🔄 Loop Settings">
        <ConfigField label="Iterations" helpText="Number of times to repeat">
          <ConfigNumberInput
            value={iterations}
            onChange={(iterations) => updateNodeData(selectedNode.id, { iterations })}
            min={1}
            max={1000}
          />
        </ConfigField>
      </ConfigSection>

      <ConfigDeleteButton onDelete={() => updateNodeData(selectedNode.id, { __delete: true })} />
    </div>
  );
}
