import { useState, useRef, useCallback } from "react";
import type { Node as RFNode } from "reactflow";
import { useFlowStore, useSettingsStore } from "../../store";
import { useClickOutside } from "../../hooks/common/useClickOutside";
import { NODE_OUTPUT_FIELDS } from "../../constants/flow";
import { extractNestedFields } from "../../utils/object";
import { useTranslation } from "../../utils/i18n";

// Re-export for backward compatibility
export { NODE_OUTPUT_FIELDS };

export interface VariableSuggestion {
  label: string;
  value: string;
  scope: "env" | "global" | "workflow" | "node";
  nodeId?: string;
  nodeType?: string;
  isNested?: boolean;
}

interface UseFlowVariableAutocompleteProps {
  currentEnv: Record<string, string>;
  nodes?: RFNode[];
}

/**
 * 获取嵌套字段提示
 */
function getNestedSuggestions(
  nodeId: string,
  fieldPath: string,
  nodeOutput: any,
  fieldPrefix: string
): VariableSuggestion[] {
  if (!nodeOutput) return [];

  // 导航到目标字段
  let current = nodeOutput;
  const parts = fieldPath.split(".").filter(Boolean);

  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = current[part];
    } else {
      return [];
    }
  }

  // 提取子字段（相对于 current 的路径）
  const subFields = extractNestedFields(current);
  const lowerPrefix = fieldPrefix.toLowerCase();

  // 完整路径 = nodeId.fieldPath.subField
  const fullPrefix = `${nodeId}.${fieldPath}`;

  return subFields
    .filter((f) => f.toLowerCase().includes(lowerPrefix))
    .map((f) => ({
      label: `${fullPrefix}${f}`,
      value: `${fullPrefix}${f}`,
      scope: "node" as const,
      nodeId,
      isNested: true,
    }));
}

export function useFlowVariableAutocomplete({
  currentEnv,
  nodes: propNodes,
}: UseFlowVariableAutocompleteProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionList, setSuggestionList] = useState<VariableSuggestion[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const storeNodes = useFlowStore((state) => state.nodes);
  const workflowResult = useFlowStore((state) => state.workflowResult);
  const globalVariables = useFlowStore((state) => state.variables);
  const workflowVariables = useFlowStore((state) => state.variables);

  const nodes = propNodes || storeNodes;

  const envKeys = Object.keys(currentEnv);
  const globalKeys = Object.keys(globalVariables);
  const workflowKeys = Object.keys(workflowVariables);

  /**
   * 解析用户输入，返回匹配建议
   * 流程：
   * 1. 输入 {{ → 显示作用域前缀和节点ID列表
   * 2. 选择 nodeId → 显示 nodeId.field 列表
   * 3. 选择 field → 判断是否有子字段，有则继续提示
   */
  const getSuggestions = useCallback(
    (text: string): VariableSuggestion[] => {
      if (!text) return [];

      // 检查是否在 {{ }} 内
      const lastBraceOpen = text.lastIndexOf("{{");
      const lastBraceClose = text.lastIndexOf("}}");

      // 如果在闭合的 }} 之后，不显示提示
      if (lastBraceClose > lastBraceOpen && lastBraceClose !== -1) {
        return [];
      }

      // 如果没有 {{，检查是否刚输入了 {{
      const match = text.match(/\{\{([^}]*)$/);
      if (!match) return [];

      const partial = match[1];
      const lowerPartial = partial.toLowerCase();

      // 检查是否是完整的作用域前缀（env. | global. | workflow.)
      if (lowerPartial === "env.") {
        return envKeys.map((k) => ({
          label: `env.${k}`,
          value: `env.${k}`,
          scope: "env" as const,
        }));
      }
      if (lowerPartial === "global.") {
        return globalKeys.map((k) => ({
          label: `global.${k}`,
          value: `global.${k}`,
          scope: "global" as const,
        }));
      }
      if (lowerPartial === "workflow.") {
        return workflowKeys.map((k) => ({
          label: `workflow.${k}`,
          value: `workflow.${k}`,
          scope: "workflow" as const,
        }));
      }

      // 检查是否在输入节点路径：nodeId.field 或 nodeId.field.subfield
      const nodePathMatch = partial.match(/^([a-zA-Z0-9_]+)\.([a-zA-Z_][a-zA-Z0-9_.]*)?$/i);
      if (nodePathMatch) {
        const [, nodeId, fieldPart] = nodePathMatch;

        const node = nodes.find((n) => n.id.toLowerCase() === nodeId.toLowerCase());
        if (!node) return [];

        // 有 fieldPart：继续输入字段
        if (fieldPart) {
          // 如果有 . 表示嵌套路径
          if (fieldPart.includes(".")) {
            const [baseField, ...rest] = fieldPart.split(".");
            const nested = rest.join(".");
            return getNestedPathSuggestions(node, baseField, nested);
          }
          // 单层字段输入
          const fields = node.type ? (NODE_OUTPUT_FIELDS[node.type] || []) : [];
          return fields
            .filter((f) => f.toLowerCase().startsWith(fieldPart.toLowerCase()))
            .map((f) => ({
              label: `${node.id}.${f}`,
              value: `${node.id}.${f}`,
              scope: "node" as const,
              nodeId: node.id,
              nodeType: node.type,
            }));
        }

        // 没有 fieldPart，只有 nodeId.：显示节点的所有字段
        const fields = node.type ? (NODE_OUTPUT_FIELDS[node.type] || []) : [];
        return fields.map((f) => ({
          label: `${node.id}.${f}`,
          value: `${node.id}.${f}`,
          scope: "node" as const,
          nodeId: node.id,
          nodeType: node.type,
        }));
      }

      // 部分输入：显示作用域前缀和节点ID
      const allSuggestions: VariableSuggestion[] = [];

      // 作用域前缀
      if ("env".startsWith(lowerPartial)) {
        allSuggestions.push({ label: "env.", value: "env.", scope: "env" as const });
      }
      if ("global".startsWith(lowerPartial)) {
        allSuggestions.push({ label: "global.", value: "global.", scope: "global" as const });
      }
      if ("workflow".startsWith(lowerPartial)) {
        allSuggestions.push({ label: "workflow.", value: "workflow.", scope: "workflow" as const });
      }

      // 节点 ID（不带点）
      for (const node of nodes) {
        if (node.id.toLowerCase().startsWith(lowerPartial)) {
          allSuggestions.push({
            label: `${node.id}.`,
            value: `${node.id}.`,
            scope: "node",
            nodeId: node.id,
            nodeType: node.type,
          });
        }
      }

      // 环境变量（无点时）
      if (!partial.includes(".")) {
        for (const k of envKeys) {
          if (k.toLowerCase().startsWith(lowerPartial)) {
            allSuggestions.push({
              label: `env.${k}`,
              value: `env.${k}`,
              scope: "env",
            });
          }
        }
      }

      return allSuggestions;
    },
    [nodes, envKeys, globalKeys, workflowKeys, workflowResult]
  );

  /**
   * 获取嵌套路径的提示
   */
  const getNestedPathSuggestions = useCallback(
    (node: RFNode, baseField: string, nestedPath: string): VariableSuggestion[] => {
      const suggestions: VariableSuggestion[] = [];

      // 检查预定义字段中是否有匹配
      const fields = node.type ? (NODE_OUTPUT_FIELDS[node.type] || []) : [];
      const matching = fields.filter((f: string) => f.toLowerCase().startsWith(`${baseField}.${nestedPath}`.toLowerCase()));
      for (const f of matching) {
        suggestions.push({
          label: `${node.id}.${f}`,
          value: `${node.id}.${f}`,
          scope: "node" as const,
          nodeId: node.id,
          nodeType: node.type,
        });
      }

      // 检查运行时输出
      const nodeOutput = workflowResult?.results?.[node.id];
      if (nodeOutput) {
        const nested = getNestedSuggestions(node.id, `${baseField}.${nestedPath}`, nodeOutput, "");
        suggestions.push(...nested);
      }

      return suggestions;
    },
    [workflowResult]
  );

  /**
   * 将变量插入到输入框
   * 前缀（带.结尾）直接继续，最终字段判断是否有子字段
   */
  const insertVariable = useCallback(
    (
      inputEl: HTMLInputElement | HTMLTextAreaElement,
      suggestion: VariableSuggestion
    ) => {
      const { value, nodeId, nodeType } = suggestion;
      const text = inputEl.value;
      const cursorPos = inputEl.selectionStart || 0;

      const beforeCursor = text.slice(0, cursorPos);
      const lastBraceOpen = beforeCursor.lastIndexOf("{{");
      const lastBraceClose = beforeCursor.lastIndexOf("}}");

      // 判断是否应该继续添加字段
      const endsWithDot = value.endsWith(".");
      let insertValue = value;
      let shouldContinue = false;

      if (endsWithDot) {
        // 带点的前缀，直接继续
        shouldContinue = true;
      } else if (nodeId && nodeType) {
        // 最终字段，检查是否有子字段
        const fields = NODE_OUTPUT_FIELDS[nodeType] || [];
        const fieldPart = value.split(".").slice(1).join(".");
        shouldContinue = fields.some((f) => f.toLowerCase().startsWith(fieldPart.toLowerCase() + "."));
        if (!shouldContinue && workflowResult) {
          const nodeOutput = workflowResult.results?.[nodeId];
          if (nodeOutput) {
            const val = fieldPart.split(".").reduce<unknown>((obj, k) => (obj as Record<string, unknown>)?.[k], nodeOutput);
            shouldContinue = val !== undefined && val !== null && typeof val === "object" && !Array.isArray(val);
          }
        }
        if (shouldContinue) {
          insertValue = `${value}.`;
        }
      }

      let newText: string;
      let newCursorPos: number;

      if (lastBraceOpen > lastBraceClose) {
        const prefix = text.slice(0, lastBraceOpen + 2);
        newText = prefix + insertValue + (shouldContinue ? "" : "}}") + text.slice(cursorPos);
        newCursorPos = prefix.length + insertValue.length + (shouldContinue ? 0 : 2);
      } else {
        newText = text.slice(0, cursorPos) + `{{${insertValue}}}` + text.slice(cursorPos);
        newCursorPos = cursorPos + insertValue.length + 4;
      }

      inputEl.value = newText;
      inputEl.setSelectionRange(newCursorPos, newCursorPos);
      inputEl.focus();
      setShowSuggestions(false);
      return newText;
    },
    [workflowResult]
  );

  useClickOutside(containerRef, () => setShowSuggestions(false));

  const handleInputChange = useCallback(
    (text: string) => {
      const suggestions = getSuggestions(text);
      setSuggestionList(suggestions);
      setShowSuggestions(suggestions.length > 0);
    },
    [getSuggestions]
  );

  return {
    containerRef,
    showSuggestions,
    suggestionList,
    getSuggestions,
    insertVariable,
    handleInputChange,
    setShowSuggestions,
  };
}

/**
 * 分组显示的建议列表组件
 */
export function FlowVariableSuggestions({
  suggestions,
  onSelect,
  onClose,
}: {
  suggestions: VariableSuggestion[];
  onSelect: (suggestion: VariableSuggestion) => void;
  onClose: () => void;
}) {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);

  if (suggestions.length === 0) return null;

  // 按 scope 分组
  const groups: Record<string, VariableSuggestion[]> = {
    scope: [],
    node: [],
    env: [],
    global: [],
    workflow: [],
  };

  for (const s of suggestions) {
    if (s.value.endsWith(".")) {
      groups.scope.push(s);
    } else if (s.scope === "node") {
      groups.node.push(s);
    } else {
      groups[s.scope].push(s);
    }
  }

  return (
    <div
      ref={undefined}
      className="absolute left-0 top-full mt-1 p-1 rounded shadow-lg z-50 w-64 max-h-60 overflow-y-auto"
      style={{
        backgroundColor: "var(--bg-secondary)",
        border: "1px solid var(--border-color)",
      }}
    >
      {/* Scope prefixes */}
      {groups.scope.length > 0 && (
        <div className="mb-1">
          <div
            className="text-[10px] px-2 py-1 font-medium"
            style={{ color: "var(--text-muted)" }}
          >
            {t('flow.scope')}
          </div>
          {groups.scope.map((s) => (
            <button
              key={s.label}
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(s);
              }}
              className="w-full text-left px-2 py-1 text-xs rounded hover:opacity-80"
              style={{ backgroundColor: "transparent", color: "var(--accent)" }}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Node outputs */}
      {groups.node.length > 0 && (
        <div className="mb-1">
          <div
            className="text-[10px] px-2 py-1 font-medium"
            style={{ color: "var(--text-muted)" }}
          >
            {t('flow.nodeOutput')}
          </div>
          {groups.node.map((s) => (
            <button
              key={`${s.nodeId}-${s.value}`}
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(s);
              }}
              className="w-full text-left px-2 py-1 text-xs rounded hover:opacity-80 flex items-center justify-between"
              style={{ backgroundColor: "transparent", color: "var(--accent)" }}
            >
              <span className="font-mono">{s.value}</span>
              {s.nodeType && (
                <span
                  className="text-[9px] px-1 rounded"
                  style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-muted)" }}
                >
                  {s.nodeType}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Environment variables */}
      {groups.env.length > 0 && (
        <div className="mb-1">
          <div
            className="text-[10px] px-2 py-1 font-medium"
            style={{ color: "var(--text-muted)" }}
          >
            {t('flow.envVariable')}
          </div>
          {groups.env.map((s) => (
            <button
              key={s.label}
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(s);
              }}
              className="w-full text-left px-2 py-1 text-xs rounded hover:opacity-80"
              style={{ backgroundColor: "transparent", color: "var(--accent)" }}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Global variables */}
      {groups.global.length > 0 && (
        <div className="mb-1">
          <div
            className="text-[10px] px-2 py-1 font-medium"
            style={{ color: "var(--text-muted)" }}
          >
            {t('flow.globalVariable')}
          </div>
          {groups.global.map((s) => (
            <button
              key={s.label}
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(s);
              }}
              className="w-full text-left px-2 py-1 text-xs rounded hover:opacity-80"
              style={{ backgroundColor: "transparent", color: "var(--accent)" }}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Workflow variables */}
      {groups.workflow.length > 0 && (
        <div className="mb-1">
          <div
            className="text-[10px] px-2 py-1 font-medium"
            style={{ color: "var(--text-muted)" }}
          >
            {t('flow.workflowVariable')}
          </div>
          {groups.workflow.map((s) => (
            <button
              key={s.label}
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(s);
              }}
              className="w-full text-left px-2 py-1 text-xs rounded hover:opacity-80"
              style={{ backgroundColor: "transparent", color: "var(--accent)" }}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      <button
        onMouseDown={(e) => {
          e.preventDefault();
          onClose();
        }}
        className="w-full text-left px-2 py-1 text-[10px] rounded"
        style={{ color: "var(--text-muted)" }}
      >
        {t('common.close')}
      </button>
    </div>
  );
}