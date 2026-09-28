/**
 * DelayNodeConfig - Delay node configuration
 */
import {
  BaseNodeConfigProps,
  ConfigSection,
  ConfigField,
  ConfigNumberInput,
  NodeHeader,
  ConfigDeleteButton,
} from "./NodeConfigBase";
import { useTranslation } from "../../../utils/i18n";
import { useSettingsStore } from "../../../store";

export function DelayNodeConfig({ selectedNode, updateNodeData }: BaseNodeConfigProps) {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);

  const duration = selectedNode.data.duration as number || 1000;

  return (
    <div className="space-y-4">
      <NodeHeader
        nodeType="delay"
        label={selectedNode.data.label as string || ""}
        onLabelChange={(label) => updateNodeData(selectedNode.id, { label })}
      />

      <ConfigSection title="⏱️ Delay Settings">
        <ConfigField label="Duration (ms)" helpText="Time to wait before proceeding">
          <ConfigNumberInput
            value={duration}
            onChange={(duration) => updateNodeData(selectedNode.id, { duration })}
            min={0}
            max={600000}
          />
        </ConfigField>

        <div className="text-xs p-2 rounded" style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-muted)" }}>
          <div className="font-medium mb-1">{t('node.presetDurations')}</div>
          <div className="flex gap-2 flex-wrap">
            {[100, 500, 1000, 2000, 5000].map((ms) => (
              <button
                key={ms}
                onClick={() => updateNodeData(selectedNode.id, { duration: ms })}
                className="px-2 py-0.5 rounded text-xs hover:opacity-80"
                style={{ backgroundColor: "var(--bg-primary)", color: "var(--text-secondary)" }}
              >
                {ms}ms
              </button>
            ))}
          </div>
        </div>
      </ConfigSection>

      <ConfigDeleteButton onDelete={() => updateNodeData(selectedNode.id, { __delete: true })} />
    </div>
  );
}
