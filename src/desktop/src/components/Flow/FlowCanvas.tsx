/**
 * FlowCanvas - Main workflow canvas component
 *
 * Modular architecture: handlers extracted to hooks, panels extracted to components
 */
import React, { useCallback, useMemo, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Panel,
  SelectionMode,
  type Node as RFNode,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  ApiCallNode,
  AuthNode,
  ConditionNode,
  LoopNode,
  TransformNode,
  AssertNode,
  DelayNode,
  LogNode,
  ScriptNode,
} from './FlowNodes';
import { ResizablePanel } from '../Layout/ResizablePanel';
import { ContextMenu, NodeTypeMenu } from '../Common/ContextMenu';
import { FlowToolbar, FlowListModal, SubflowPanel } from './FlowToolbar';
import { NodeConfigPanel } from './NodeConfigPanel';
import {
  NODE_TYPE_MENU_ITEMS,
  TEXT_MUTED_STYLE,
  PANEL_STYLE,
  LOG_LEVEL_COLORS,
  EXECUTION_STATUS_COLORS,
  BG_TERTIARY_STYLE,
  BTN_CLASS,
  BTN_DISABLED_CLASS,
} from './FlowCanvas.constants';
import { useFlowStore, useFlowCanvasUIStore, useEnvironmentStore, useSettingsStore } from '../../store';
import { useTranslation } from '../../utils/i18n';
import { useCanvasHandlers } from './canvas/useCanvasHandlers';
import { useNodeOperations, type FlowNodeType } from './canvas/useNodeOperations';
import { useExecutionControl } from './canvas/useExecutionControl';
import type { FlowEdge } from '../../types/flow';

const nodeTypes = {
  apiCall: ApiCallNode,
  auth: AuthNode,
  condition: ConditionNode,
  loop: LoopNode,
  transform: TransformNode,
  assert: AssertNode,
  delay: DelayNode,
  log: LogNode,
  script: ScriptNode,
};

export function FlowCanvas() {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);

  // Canvas state from store
  const {
    nodes: storeNodes,
    edges: storeEdges,
    currentFlowName,
    showFlowList,
    savedFlows,
    subflows,
    setNodes: storeSetNodes,
    setEdges: storeSetEdges,
    setVariables: storeSetVariables,
    setCurrentFlowName,
    setShowFlowList,
    loadSavedFlows,
    loadFlow,
    deleteFlow,
    loadSubflows,
    instantiateSubflow,
    saveAsSubflow,
  } = useFlowStore();

  // Panel width state for resizable info panel
  const [panelWidth, setPanelWidth] = useState(350);
  const [panelHeight, setPanelHeight] = useState<number | null>(null);
  const [isResizingWidth, setIsResizingWidth] = useState(false);
  const [isResizingHeight, setIsResizingHeight] = useState(false);

  // Section expand/collapse state
  const [expandedLogs, setExpandedLogs] = useState(true);
  const [expandedResults, setExpandedResults] = useState(true);

  // Max concurrency for parallel execution
  const [maxConcurrency, setMaxConcurrency] = useState(0);

  // Use canvas hooks
  const {
    onNodesChange,
    onEdgesChange,
    onConnect,
    onConnectStart,
    onConnectEnd,
    onNodeClick,
    onNodeContextMenu: rawOnNodeContextMenu,
  } = useCanvasHandlers();

  // Wrap onNodeContextMenu to handle multi-select
  // Note: We don't know if multiple nodes are selected here, so we just show single-node menu
  const onNodeContextMenu = useCallback((e: React.MouseEvent, node: RFNode) => {
    rawOnNodeContextMenu(e, node);
  }, [rawOnNodeContextMenu]);

  // Wrap onPaneContextMenu to show add menu (selection menu is handled by onSelectionContextMenu)
  const onPaneContextMenuWithSelection = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const store = useFlowCanvasUIStore.getState();
    store.setAddNodeMenuPos({ x: e.clientX, y: e.clientY });
    store.setShowAddNodeMenu(true);
  }, []);

  const {
    addNode,
    addNodeWithConnection,
    updateNodeData,
    deleteNode,
    duplicateNode,
  } = useNodeOperations();

  // Resize handlers for info panel
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingWidth(true);
    const startX = e.clientX;
    const startWidth = panelWidth;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = startX - e.clientX;
      const newWidth = Math.min(Math.max(startWidth + delta, 200), 650);
      setPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizingWidth(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [panelWidth]);

  // Height resize handler
  const handleHeightResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizingHeight(true);
    const startY = e.clientY;
    const startHeight = panelHeight ?? 500;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientY - startY;
      const newHeight = Math.min(Math.max(startHeight + delta, 200), window.innerHeight - 100);
      setPanelHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizingHeight(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [panelHeight]);

  const {
    executionStatus,
    setExecutionStatus,
    startExecution,
    pauseExecution,
    stopExecution,
    resetExecution,
    stepExecuteCurrent,
    runNodeOnly,
    runDownstream,
    handleSaveFlow,
  } = useExecutionControl();

  // Breakpoint state from store
  const breakpoints = useFlowStore((s) => s.breakpoints);
  const toggleBreakpoint = useFlowStore((s) => s.toggleBreakpoint);
  const executionLog = useFlowStore((s) => s.executionLog);
  const workflowResult = useFlowStore((s) => s.workflowResult);

  // Flow canvas UI state
  const {
    stepMode, setStepMode,
    setCurrentStepIndex,
    pendingConnectionSource,
    showAddNodeMenu, setShowAddNodeMenu,
    addNodeMenuPos,
    showNodeContextMenu, setShowNodeContextMenu,
    nodeContextMenuPos,
    showNodeMenu, setShowNodeMenu,
    menuPosition, setMenuPosition,
    selectedNodeId, setSelectedNodeId,
    contextMenuNodeId, setContextMenuNodeId,
    showSubflowPanel, setShowSubflowPanel,
    contextMenuSelectedIds,
  } = useFlowCanvasUIStore();

  // Derived state
  const selectedNode = selectedNodeId ? storeNodes.find(n => n.id === selectedNodeId) || null : null;
  const contextMenuNode = contextMenuNodeId ? storeNodes.find(n => n.id === contextMenuNodeId) || null : null;

  // Environment support - use canvasEnv for flow canvas
  const canvasEnv = useEnvironmentStore((s) => s.canvasEnv);
  const environments = useEnvironmentStore((s) => s.environments);
  const updateVariableFn = useEnvironmentStore((s) => s.updateVariable);
  const toggleVariableEnabledFn = useEnvironmentStore((s) => s.toggleVariableEnabled);

  // Get variables from canvasEnv (memoized for stable reference)
  const currentEnvVariables = useMemo(() => {
    const env = environments.find(e => e.name === canvasEnv);
    return env?.groups?.flatMap(g =>
      g.variables.map(v => ({ ...v, group: g.name }))
    ) || [];
  }, [canvasEnv, environments]);

  // For variable substitution - simple key-value map (memoized for stable reference)
  const envVariablesMap = useMemo(() => {
    const map: Record<string, string> = {};
    const env = environments.find(e => e.name === canvasEnv);
    env?.groups?.forEach(group => {
      group.variables.forEach(v => {
        if (v.enabled !== false) {
          map[v.key] = v.value;
        }
      });
    });
    return map;
  }, [canvasEnv, environments]);

  const updateVariable = useCallback((key: string, value: string) => {
    // Update in "Default" group of canvas environment
    updateVariableFn(canvasEnv, "Default", key, value);
  }, [updateVariableFn, canvasEnv]);

  const toggleVariable = useCallback((key: string, enabled: boolean) => {
    // Toggle in "Default" group of canvas environment
    toggleVariableEnabledFn(canvasEnv, "Default", key, enabled);
  }, [toggleVariableEnabledFn, canvasEnv]);

  // Flow list handlers
  const handleShowFlowList = useCallback(async () => {
    try {
      await loadSavedFlows();
      setShowFlowList(true);
    } catch (err) {
      useFlowStore.getState().addExecutionLog({
        timestamp: Date.now(),
        nodeId: '',
        nodeName: 'Workflow',
        level: 'error',
        message: `Failed to load flows: ${err}`,
      });
    }
  }, [loadSavedFlows, setShowFlowList]);

  const handleSelectFlow = useCallback(async (flowId: string) => {
    try {
      const flow = await loadFlow(flowId);
      if (flow) {
        storeSetNodes(flow.nodes);
        storeSetEdges(flow.edges.map((e) => ({
          ...e,
          markerEnd: { type: 'ArrowClosed' as const },
        })) as unknown as FlowEdge[]);
        storeSetVariables(flow.variables || {});
        setShowFlowList(false);
      }
    } catch (err) {
      useFlowStore.getState().addExecutionLog({
        timestamp: Date.now(),
        nodeId: '',
        nodeName: 'Workflow',
        level: 'error',
        message: `Failed to load flow: ${err}`,
      });
    }
  }, [loadFlow, setShowFlowList, storeSetNodes, storeSetEdges, storeSetVariables]);

  const handleDeleteFlow = useCallback(async (flowId: string) => {
    try {
      await deleteFlow(flowId);
    } catch (err) {
      useFlowStore.getState().addExecutionLog({
        timestamp: Date.now(),
        nodeId: '',
        nodeName: 'Workflow',
        level: 'error',
        message: `Failed to delete flow: ${err}`,
      });
    }
  }, [deleteFlow]);

  // Subflow handlers
  const handleShowSubflows = useCallback(async () => {
    try {
      await loadSubflows();
      setShowSubflowPanel(true);
    } catch (err) {
      useFlowStore.getState().addExecutionLog({
        timestamp: Date.now(),
        nodeId: '',
        nodeName: 'Workflow',
        level: 'error',
        message: `Failed to load subflows: ${err}`,
      });
    }
  }, [loadSubflows, setShowSubflowPanel]);

  const handleInsertSubflow = useCallback(async (subflowId: string) => {
    try {
      const result = await instantiateSubflow(subflowId, { x: 100, y: 100 });
      if (result) {
        storeSetNodes((prev) => [...prev, ...result.nodes]);
        storeSetEdges((prev) => [...prev, ...result.edges]);
        setShowSubflowPanel(false);
        useFlowStore.getState().addExecutionLog({
          timestamp: Date.now(),
          nodeId: '',
          nodeName: 'Workflow',
          level: 'info',
          message: `Subflow inserted: ${result.nodes.length} nodes`,
        });
      }
    } catch (err) {
      useFlowStore.getState().addExecutionLog({
        timestamp: Date.now(),
        nodeId: '',
        nodeName: 'Workflow',
        level: 'error',
        message: `Failed to insert subflow: ${err}`,
      });
    }
  }, [instantiateSubflow, storeSetNodes, storeSetEdges, setShowSubflowPanel]);

  const handleDeleteSubflow = useCallback(async (subflowId: string) => {
    try {
      await deleteFlow(subflowId);
      await loadSubflows();
    } catch (err) {
      useFlowStore.getState().addExecutionLog({
        timestamp: Date.now(),
        nodeId: '',
        nodeName: 'Workflow',
        level: 'error',
        message: `Failed to delete subflow: ${err}`,
      });
    }
  }, [deleteFlow, loadSubflows]);

  // Inject breakpoint info into nodes for rendering
  // Use shallow comparison to avoid unnecessary re-renders
  const nodesWithBreakpoints = useMemo(() => {
    return storeNodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        breakpoint: !!breakpoints[node.id],
      },
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeNodes]); // Only recompute when storeNodes changes, not breakpoints

  return (
    <div className="h-full w-full relative">
      <ReactFlow
        nodes={nodesWithBreakpoints}
        edges={storeEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onNodeClick={(e, node) => {
          // Clear context menu selection when clicking a node
          useFlowCanvasUIStore.getState().setContextMenuSelectedIds([]);
          onNodeClick(e, node);
        }}
        onNodeContextMenu={onNodeContextMenu}
        onPaneContextMenu={(e) => {
          // Clear context menu selection when clicking pane
          useFlowCanvasUIStore.getState().setContextMenuSelectedIds([]);
          onPaneContextMenuWithSelection(e);
        }}
        onSelectionContextMenu={(e, nodes) => {
          e.preventDefault();
          const store = useFlowCanvasUIStore.getState();
          store.setNodeContextMenuPos({ x: e.clientX, y: e.clientY });
          // Use the first node as contextMenuNode for single-select, or null for multi-select menu
          store.setContextMenuNodeId(nodes.length === 1 ? nodes[0].id : null);
          // Store the selected node IDs for the menu items
          store.setContextMenuSelectedIds(nodes.map(n => n.id));
          store.setShowNodeContextMenu(true);
        }}
        nodeTypes={nodeTypes}
        style={{ backgroundColor: 'var(--bg-primary)' }}
        selectionMode={SelectionMode.Partial}
        elementsSelectable={true}
        nodesDraggable={true}
      >
        <Background style={{ backgroundColor: 'var(--bg-primary)' }} />
        <Controls style={PANEL_STYLE} />
        <MiniMap style={PANEL_STYLE} />

        {/* Toolbar Panel */}
        <Panel position="top-left">
          <FlowToolbar
            currentFlowName={currentFlowName}
            onFlowNameChange={setCurrentFlowName}
            onSaveFlow={handleSaveFlow}
            onShowFlowList={handleShowFlowList}
            onShowSubflows={handleShowSubflows}
          />
        </Panel>

        {/* Execution Info Panel - unified top-right panel */}
        <Panel position="top-right">
          <div
            className="flex flex-col rounded overflow-hidden relative"
            style={{
              width: `${panelWidth}px`,
              height: panelHeight ? `${panelHeight}px` : "500px",
              backgroundColor: "var(--bg-secondary)",
              border: "1px solid var(--border-color)",
            }}
          >
            {/* Width resize handle - left edge inside */}
            <div
              className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize z-10"
              style={{ backgroundColor: isResizingWidth ? 'var(--accent)' : 'transparent' }}
              onMouseDown={handleResizeStart}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--accent)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            />

            {/* Header - fixed, not scrollable */}
            <div
              className="flex items-center justify-between px-2 py-1.5 flex-shrink-0"
              style={{ backgroundColor: "var(--bg-tertiary)" }}
            >
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    const newStepMode = !stepMode;
                    setStepMode(newStepMode);
                    if (newStepMode) {
                      setCurrentStepIndex(0);
                      setExecutionStatus("paused"); // 进入paused状态等待步进
                    } else {
                      // 关闭步进模式时，如果处于paused状态，重置为idle
                      if (executionStatus === "paused") {
                        setExecutionStatus("idle");
                      }
                    }
                  }}
                  disabled={executionStatus === "running"}
                  className={BTN_DISABLED_CLASS}
                  style={{
                    backgroundColor: stepMode ? "var(--accent)" : "var(--bg-secondary)",
                    color: stepMode ? "var(--text-inverse)" : "var(--text-muted)",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    border: stepMode ? "1px solid var(--accent)" : "1px solid var(--border-color)",
                  }}
                  title={stepMode ? t('flow.stepModeOn') : t('flow.stepModeOff')}
                >
                  S
                </button>
                {stepMode ? (
                  //步进模式: 显示步进按钮替代运行按钮
                  <button
                    onClick={stepExecuteCurrent}
                    disabled={executionStatus !== "paused"}
                    className={BTN_DISABLED_CLASS}
                    style={{
                      backgroundColor: "var(--accent)",
                      color: "var(--text-inverse)",
                      padding: "2px 6px",
                      borderRadius: "4px",
                    }}
                    title={t('flow.stepExecute')}
                  >
                    ⏭
                  </button>
                ) : (
                  // 普通模式: 显示运行和暂停按钮
                  <>
                    <button
                      onClick={() => startExecution({ maxConcurrency })}
                      disabled={executionStatus === "running" || executionStatus === "paused"}
                      className={BTN_DISABLED_CLASS}
                      style={{ backgroundColor: "var(--success)", color: "var(--text-inverse)", padding: "2px 6px", borderRadius: "4px" }}
                      title={executionStatus === "paused" ? t('flow.continueRun') : t('flow.run')}
                    >
                      ▶
                    </button>
                    <button
                      onClick={pauseExecution}
                      disabled={executionStatus !== "running"}
                      className={BTN_DISABLED_CLASS}
                      style={{ backgroundColor: "var(--warning)", color: "var(--text-inverse)", padding: "2px 6px", borderRadius: "4px" }}
                      title={t('flow.pause')}
                    >
                      ⏸
                    </button>
                  </>
                )}
                <button
                  onClick={stopExecution}
                  disabled={executionStatus === "idle" || executionStatus === "completed" || executionStatus === "error"}
                  className={BTN_DISABLED_CLASS}
                  style={{ backgroundColor: "var(--danger)", color: "var(--text-inverse)", padding: "2px 6px", borderRadius: "4px" }}
                  title={t('flow.stop')}
                >
                  ⏹
                </button>
                <button
                  onClick={resetExecution}
                  className={BTN_CLASS}
                  style={{ ...BG_TERTIARY_STYLE, padding: "2px 6px", borderRadius: "4px" }}
                  title={t('flow.reset')}
                >
                  ↺
                </button>
                <select
                  value={maxConcurrency}
                  onChange={(e) => setMaxConcurrency(Number(e.target.value))}
                  className="px-1 py-0.5 rounded text-xs"
                  style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }}
                  title={t('flow.maxParallelNodes')}
                >
                  <option value={0}>{t('flow.unlimited')}</option>
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={4}>4</option>
                  <option value={8}>8</option>
                </select>
              </div>
              <span
                className="text-xs px-1.5 py-0.5 rounded"
                style={{
                  backgroundColor: EXECUTION_STATUS_COLORS[executionStatus as keyof typeof EXECUTION_STATUS_COLORS] || 'var(--bg-tertiary)',
                  color: "var(--text-inverse)",
                }}
              >
                {executionStatus}
              </span>
            </div>

            {/* Content sections - each scrolls independently */}
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              {/* Logs Section */}
              <div className={`${expandedLogs ? 'flex-auto' : 'h-0'} min-h-0 overflow-hidden flex flex-col transition-all duration-200`}>
                <button
                  onClick={() => setExpandedLogs(!expandedLogs)}
                  className="w-full flex items-center justify-between px-2 py-1.5 hover:opacity-80 flex-shrink-0"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                >
                  <span className="text-xs">{t('flow.log')} ({executionLog.length})</span>
                  <span
                    style={{
                      transform: expandedLogs ? 'rotate(180deg)' : 'rotate(0)',
                      transition: 'transform 0.2s',
                      fontSize: '10px',
                      opacity: 0.6,
                    }}
                  >
                    ▼
                  </span>
                </button>
                {expandedLogs && (
                  <div className="min-h-0 overflow-y-auto px-2 pb-2" style={{ maxHeight: '100%' }}>
                    {executionLog.length > 0 ? (
                      <div
                        className="rounded overflow-hidden"
                        style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
                      >
                        {executionLog.slice(-15).map((log: any, i: number) => (
                          <div
                            key={i}
                            className="flex text-xs px-2 py-1"
                            style={{
                              color: LOG_LEVEL_COLORS[log.level as keyof typeof LOG_LEVEL_COLORS] || LOG_LEVEL_COLORS.info,
                              borderBottom: i < executionLog.slice(-15).length - 1 ? '1px solid var(--border-color)' : 'none',
                            }}
                          >
                            <span className="text-muted w-16 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                            <span className="flex-1 truncate" title={log.message}>
                              {log.nodeName}: {log.message}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-center py-2" style={{ color: 'var(--text-muted)' }}>
                        {t('flow.noLog')}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Results Section */}
              <div className={`${expandedResults ? 'flex-auto' : 'h-0'} min-h-0 overflow-hidden flex flex-col transition-all duration-200`}>
                <button
                  onClick={() => setExpandedResults(!expandedResults)}
                  className="w-full flex items-center justify-between px-2 py-1.5 hover:opacity-80 flex-shrink-0"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                >
                  <span className="text-xs">{t('flow.result')}</span>
                  <span
                    style={{
                      transform: expandedResults ? 'rotate(180deg)' : 'rotate(0)',
                      transition: 'transform 0.2s',
                      fontSize: '10px',
                      opacity: 0.6,
                    }}
                  >
                    ▼
                  </span>
                </button>
                {expandedResults && (
                  <div className="flex-1 overflow-y-auto px-2 pb-2">
                    {workflowResult ? (
                      <>
                        {/* Node Outputs */}
                        {workflowResult.results && Object.keys(workflowResult.results).length > 0 && (
                          <div className="space-y-2">
                            {Object.entries(workflowResult.results).map(([nodeId, outputs]: [string, any]) => {
                              const node = storeNodes.find(n => n.id === nodeId);
                              const label = node?.data?.label || node?.type || nodeId;
                              const duration = node?.data?.duration;
                              return (
                                <div
                                  key={nodeId}
                                  className="rounded p-2"
                                  style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                                      {label}
                                    </span>
                                    {duration && (
                                      <span className="text-xs font-mono" style={{ color: duration < 100 ? 'var(--success)' : duration < 500 ? 'var(--warning)' : 'var(--danger)' }}>
                                        {duration}ms
                                      </span>
                                    )}
                                  </div>
                                  <pre
                                    className="text-xs p-1.5 rounded overflow-auto"
                                    style={{
                                      backgroundColor: 'var(--bg-tertiary)',
                                      color: 'var(--text-secondary)',
                                      fontSize: '10px',
                                      lineHeight: '1.4',
                                      maxHeight: '150px',
                                    }}
                                  >
                                    {typeof outputs === 'object' ? JSON.stringify(outputs, null, 2) : String(outputs)}
                                  </pre>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-xs text-center py-2" style={{ color: 'var(--text-muted)' }}>
                        {t('flow.noResult')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom resize handle */}
            <div
              className="h-1 cursor-ns-resize flex-shrink-0"
              style={{ backgroundColor: isResizingHeight ? 'var(--accent)' : 'transparent' }}
              onMouseDown={handleHeightResizeStart}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--accent)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            />
          </div>
        </Panel>

        {/* Flow List Modal */}
        {showFlowList && (
          <FlowListModal
            show={showFlowList}
            savedFlows={savedFlows}
            onClose={() => setShowFlowList(false)}
            onSelectFlow={handleSelectFlow}
            onDeleteFlow={handleDeleteFlow}
          />
        )}

        {/* Subflow Panel */}
        {showSubflowPanel && (
          <SubflowPanel
            show={showSubflowPanel}
            subflows={subflows}
            onClose={() => setShowSubflowPanel(false)}
            onInsertSubflow={handleInsertSubflow}
            onDeleteSubflow={handleDeleteSubflow}
          />
        )}
      </ReactFlow>

      {/* Node Context Menu */}
      {showNodeContextMenu && (
        <ContextMenu
          x={nodeContextMenuPos.x}
          y={nodeContextMenuPos.y}
          items={[
            { label: contextMenuSelectedIds.length > 1 ? `${t('flow.configureNodes')} ${contextMenuSelectedIds.length}` : (contextMenuNode ? `${t('flow.configureNode')} ${contextMenuNode.type}` : t('flow.configureNode')), value: 'configure', icon: '📋' },
            { label: t('flow.addChildNode'), value: 'addChild', icon: '➕' },
            { label: contextMenuSelectedIds.length > 1 ? `${t('flow.copyNodes')} ${contextMenuSelectedIds.length}` : t('flow.copyNode'), value: 'duplicate', icon: '📝' },
            { label: contextMenuSelectedIds.length > 1 ? `${t('flow.saveNodesAsSubflow')} ${contextMenuSelectedIds.length}` : t('flow.saveAsSubflow'), value: 'saveAsSubflow', icon: '💾' },
            { label: '', value: 'separator1' },
            { label: contextMenuSelectedIds.length > 1 ? `${t('flow.runNodes')} ${contextMenuSelectedIds.length}` : t('flow.runCurrentNode'), value: 'runNodeOnly', icon: '▶' },
            { label: t('flow.runDownstream'), value: 'runDownstream', icon: '▶▶' },
            { label: t('flow.toggleBreakpoint'), value: 'toggleBreakpoint', icon: '⏸' },
            { label: '', value: 'separator2' },
            { label: contextMenuSelectedIds.length > 1 ? `${t('flow.deleteNodes')} ${contextMenuSelectedIds.length}` : t('flow.deleteNode'), value: 'delete', icon: '🗑', danger: true },
          ]}
          onSelect={(value) => {
            const menuSelectedNodes = storeNodes.filter(n => contextMenuSelectedIds.includes(n.id));
            switch (value) {
              case 'configure':
                if (contextMenuNode) {
                  setSelectedNodeId(contextMenuNode.id);
                }
                break;
              case 'addChild':
                if (contextMenuNode) {
                  setContextMenuNodeId(contextMenuNode.id);
                  setMenuPosition({ x: nodeContextMenuPos.x, y: nodeContextMenuPos.y });
                  setShowNodeMenu(true);
                }
                break;
              case 'duplicate':
                if (contextMenuSelectedIds.length > 1) {
                  menuSelectedNodes.forEach(n => duplicateNode(n.id));
                } else if (contextMenuNode) {
                  duplicateNode(contextMenuNode.id);
                }
                break;
              case 'saveAsSubflow':
                {
                  if (menuSelectedNodes.length === 0) {
                    useFlowStore.getState().addExecutionLog({
                      timestamp: Date.now(),
                      nodeId: '',
                      nodeName: 'Workflow',
                      level: 'warning',
                      message: t('flow.pleaseSelectNode'),
                    });
                    break;
                  }
                  // Get edges that connect these nodes
                  const selectedIds = new Set(menuSelectedNodes.map(n => n.id));
                  const relevantEdges = storeEdges.filter(e => selectedIds.has(e.source) && selectedIds.has(e.target));
                  const subflowName = menuSelectedNodes.length > 1 ? `subflow_${Date.now()}` : (menuSelectedNodes[0].data?.name || menuSelectedNodes[0].type || 'subflow');
                  saveAsSubflow(subflowName, menuSelectedNodes, relevantEdges);
                  useFlowStore.getState().addExecutionLog({
                    timestamp: Date.now(),
                    nodeId: '',
                    nodeName: 'Workflow',
                    level: 'info',
                    message: `${t('flow.savedNodesAsSubflow')} ${menuSelectedNodes.length} ${t('flow.saveNodesAsSubflow')}: ${subflowName}`,
                  });
                }
                break;
              case 'runNodeOnly':
                if (contextMenuNode) {
                  runNodeOnly(contextMenuNode.id);
                }
                break;
              case 'runDownstream':
                if (contextMenuNode) {
                  runDownstream(contextMenuNode.id);
                }
                break;
              case 'toggleBreakpoint':
                if (contextMenuNode) {
                  toggleBreakpoint(contextMenuNode.id);
                }
                break;
              case 'delete':
                if (contextMenuSelectedIds.length > 1) {
                  menuSelectedNodes.forEach(n => deleteNode(n.id));
                } else if (contextMenuNode) {
                  deleteNode(contextMenuNode.id);
                }
                break;
            }
            setShowNodeContextMenu(false);
            setContextMenuNodeId(null);
          }}
          onClose={() => {
            setShowNodeContextMenu(false);
            setContextMenuNodeId(null);
          }}
        />
      )}

      {/* Node Creation Menu */}
      {showNodeMenu && (
        <NodeTypeMenu
          position={menuPosition}
          sourceNodeId={pendingConnectionSource || undefined}
          onSelect={(type) => {
            if (pendingConnectionSource) {
              addNodeWithConnection(type as FlowNodeType, pendingConnectionSource);
            } else {
              addNode(type as FlowNodeType);
            }
            setShowNodeMenu(false);
          }}
          onClose={() => {
            setShowNodeMenu(false);
          }}
        />
      )}

      {/* Add Node Context Menu */}
      {showAddNodeMenu && (
        <ContextMenu
          x={addNodeMenuPos.x}
          y={addNodeMenuPos.y}
          items={NODE_TYPE_MENU_ITEMS}
          onSelect={(value) => {
            addNode(value as FlowNodeType);
            setShowAddNodeMenu(false);
          }}
          onClose={() => setShowAddNodeMenu(false)}
        />
      )}

      {/* Node Configuration Sidebar */}
      {selectedNode && (
        <ResizablePanel
          position="right"
          defaultWidth={450}
          minWidth={300}
          maxWidth={800}
          className="absolute right-0 top-0 h-full"
          style={{ zIndex: 20 }}
        >
          <NodeConfigPanel
            selectedNode={selectedNode}
            onUpdateNodeData={(nodeId, data) => {
              if (data.__delete) {
                deleteNode(nodeId);
                setSelectedNodeId(null);
              } else {
                updateNodeData(nodeId, data);
              }
            }}
            currentEnvVariables={currentEnvVariables}
            envVariablesMap={envVariablesMap}
            onUpdateVariable={updateVariable}
            onToggleVariableEnabled={toggleVariable}
          />
          <button
            onClick={() => setSelectedNodeId(null)}
            className="absolute top-4 right-4 text-xs px-2 py-1 rounded"
            style={TEXT_MUTED_STYLE}
          >
            ✕
          </button>
        </ResizablePanel>
      )}
    </div>
  );
}