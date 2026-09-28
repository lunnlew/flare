/**
 * AssertNodeConfig - Assert node configuration
 *
 * Enhanced with:
 * - Visual assertion builder
 * - Real-time JSON validation
 * - Syntax highlighting placeholder
 */
import { useState } from "react";
import {
  BaseNodeConfigProps,
  ConfigSection,
  ConfigField,
  ConfigSelect,
  ConfigInput,
  NodeHeader,
  ConfigDeleteButton,
} from "./NodeConfigBase";

interface Assertion {
  type: string;
  expression: string;
  expected?: string;
  operator?: string;
}

const ASSERT_TYPES = [
  { value: "statusCode", label: "Status Code" },
  { value: "body", label: "Body Content" },
  { value: "header", label: "Header" },
  { value: "jsonpath", label: "JSONPath" },
  { value: "responseTime", label: "Response Time (ms)" },
];

const OPERATORS = [
  { value: "eq", label: "equals" },
  { value: "ne", label: "not equals" },
  { value: "gt", label: "greater than" },
  { value: "gte", label: "greater or equal" },
  { value: "lt", label: "less than" },
  { value: "lte", label: "less or equal" },
  { value: "contains", label: "contains" },
  { value: "matches", label: "matches regex" },
];

export function AssertNodeConfig({ selectedNode, updateNodeData }: BaseNodeConfigProps) {
  const assertions = (selectedNode.data.assertions as Assertion[]) || [{ type: "statusCode", expression: "", operator: "eq", expected: "200" }];
  const [jsonError, setJsonError] = useState<string | null>(null);

  const updateAssertion = (index: number, updates: Partial<Assertion>) => {
    const newAssertions = [...assertions];
    newAssertions[index] = { ...newAssertions[index], ...updates };
    updateNodeData(selectedNode.id, { assertions: newAssertions });
  };

  const addAssertion = () => {
    updateNodeData(selectedNode.id, {
      assertions: [...assertions, { type: "statusCode", expression: "", operator: "eq", expected: "200" }],
    });
  };

  const removeAssertion = (index: number) => {
    const newAssertions = assertions.filter((_, i) => i !== index);
    updateNodeData(selectedNode.id, { assertions: newAssertions.length > 0 ? newAssertions : [{ type: "statusCode", expression: "", operator: "eq", expected: "200" }] });
  };

  return (
    <div className="space-y-4">
      <NodeHeader
        nodeType="assert"
        label={selectedNode.data.label as string || ""}
        onLabelChange={(label) => updateNodeData(selectedNode.id, { label })}
      />

      <ConfigSection title="✅ Assertions">
        <div className="space-y-3">
          {assertions.map((assertion, index) => (
            <div
              key={index}
              className="p-3 rounded border"
              style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)" }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                  Assertion #{index + 1}
                </span>
                {assertions.length > 1 && (
                  <button
                    onClick={() => removeAssertion(index)}
                    className="text-xs px-2 py-0.5 rounded"
                    style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", color: "var(--danger)" }}
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="space-y-2">
                <ConfigField label="Type">
                  <ConfigSelect
                    value={assertion.type}
                    onChange={(v) => updateAssertion(index, { type: v })}
                    options={ASSERT_TYPES}
                  />
                </ConfigField>

                {assertion.type !== "responseTime" && (
                  <ConfigField
                    label={assertion.type === "header" ? "Header Name" : "JSONPath Expression"}
                    helpText={assertion.type === "jsonpath" ? "e.g., $.data.status" : undefined}
                  >
                    <ConfigInput
                      value={assertion.expression}
                      onChange={(v) => updateAssertion(index, { expression: v })}
                      placeholder={assertion.type === "header" ? "Content-Type" : "$.data.status"}
                    />
                  </ConfigField>
                )}

                <div className="flex gap-2">
                  <div className="flex-1">
                    <ConfigField label="Operator">
                      <ConfigSelect
                        value={assertion.operator || "eq"}
                        onChange={(v) => updateAssertion(index, { operator: v })}
                        options={OPERATORS}
                      />
                    </ConfigField>
                  </div>
                  {!["exists", "notExists"].includes(assertion.operator || "") && (
                    <div className="flex-1">
                      <ConfigField label="Expected">
                        <ConfigInput
                          value={assertion.expected || ""}
                          onChange={(v) => updateAssertion(index, { expected: v })}
                          placeholder="200"
                        />
                      </ConfigField>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={addAssertion}
            className="w-full py-2 text-xs rounded border border-dashed"
            style={{ borderColor: "var(--border-color)", color: "var(--text-muted)" }}
          >
            + Add Assertion
          </button>
        </div>
      </ConfigSection>

      {/* JSON Editor */}
      <ConfigSection title="📋 JSON View" defaultOpen={false}>
        <div className="relative">
          <textarea
            value={JSON.stringify(assertions, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                setJsonError(null);
                updateNodeData(selectedNode.id, { assertions: parsed });
              } catch (err) {
                setJsonError((err as Error).message);
              }
            }}
            className="w-full h-32 px-2 py-1.5 rounded text-xs font-mono"
            style={{ backgroundColor: "var(--bg-primary)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }}
          />
          {jsonError && (
            <div className="absolute bottom-1 right-1 text-xs px-1 rounded" style={{ backgroundColor: "rgba(239, 68, 68, 0.2)", color: "var(--danger)" }}>
              JSON Error
            </div>
          )}
        </div>
      </ConfigSection>

      <ConfigDeleteButton onDelete={() => updateNodeData(selectedNode.id, { __delete: true })} />
    </div>
  );
}