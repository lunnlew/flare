/**
 * NodeConfigPanel - Main configuration panel for Flow nodes
 *
 * Delegates to modular node config components for each node type.
 */
import { useCallback } from "react";
import type { Node as RFNode } from "reactflow";
import type { Variable } from "../../store/environmentStore";
import { ApiCallNodeConfig } from "./nodes/ApiCallNodeConfig";
import { AuthNodeConfig } from "./nodes/AuthNodeConfig";
import { ConditionNodeConfig } from "./nodes/ConditionNodeConfig";
import { TransformNodeConfig } from "./nodes/TransformNodeConfig";
import { AssertNodeConfig } from "./nodes/AssertNodeConfig";
import { LoopNodeConfig } from "./nodes/LoopNodeConfig";
import { DelayNodeConfig } from "./nodes/DelayNodeConfig";
import { LogNodeConfig } from "./nodes/LogNodeConfig";
import { ScriptNodeConfig } from "./nodes/ScriptNodeConfig";

interface NodeConfigPanelProps {
  selectedNode: RFNode;
  onUpdateNodeData: (nodeId: string, data: Record<string, unknown>) => void;
  currentEnvVariables: Variable[];
  envVariablesMap: Record<string, string>;
  onUpdateVariable: (key: string, value: string) => void;
  onToggleVariableEnabled?: (key: string, enabled: boolean) => void;
}

export function NodeConfigPanel({
  selectedNode,
  onUpdateNodeData,
  currentEnvVariables,
  envVariablesMap,
  onUpdateVariable,
  onToggleVariableEnabled,
}: NodeConfigPanelProps) {

  const updateNodeData = useCallback((nodeId: string, data: Record<string, unknown>) => {
    onUpdateNodeData(nodeId, data);
  }, [onUpdateNodeData]);

  const renderConfig = () => {
    switch (selectedNode.type) {
      case "apiCall":
        return (
          <ApiCallNodeConfig
            selectedNode={selectedNode}
            updateNodeData={updateNodeData}
            currentEnvVariables={currentEnvVariables}
            envVariablesMap={envVariablesMap}
            onUpdateVariable={onUpdateVariable}
            onToggleVariableEnabled={onToggleVariableEnabled}
          />
        );
      case "auth":
        return (
          <AuthNodeConfig
            selectedNode={selectedNode}
            updateNodeData={updateNodeData}
            envVariablesMap={envVariablesMap}
          />
        );
      case "condition":
        return (
          <ConditionNodeConfig
            selectedNode={selectedNode}
            updateNodeData={updateNodeData}
            envVariablesMap={envVariablesMap}
          />
        );
      case "transform":
        return (
          <TransformNodeConfig
            selectedNode={selectedNode}
            updateNodeData={updateNodeData}
            envVariablesMap={envVariablesMap}
          />
        );
      case "assert":
        return (
          <AssertNodeConfig
            selectedNode={selectedNode}
            updateNodeData={updateNodeData}
          />
        );
      case "loop":
        return (
          <LoopNodeConfig
            selectedNode={selectedNode}
            updateNodeData={updateNodeData}
          />
        );
      case "delay":
        return (
          <DelayNodeConfig
            selectedNode={selectedNode}
            updateNodeData={updateNodeData}
          />
        );
      case "log":
        return (
          <LogNodeConfig
            selectedNode={selectedNode}
            updateNodeData={updateNodeData}
            envVariablesMap={envVariablesMap}
          />
        );
      case "script":
        return (
          <ScriptNodeConfig
            selectedNode={selectedNode}
            updateNodeData={updateNodeData}
            envVariablesMap={envVariablesMap}
          />
        );
      default:
        return (
          <div className="text-sm" style={{ color: "var(--text-muted)" }}>
            Unknown node type: {selectedNode.type}
          </div>
        );
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Configure: {selectedNode.type}
        </h3>
      </div>
      {renderConfig()}
    </div>
  );
}
