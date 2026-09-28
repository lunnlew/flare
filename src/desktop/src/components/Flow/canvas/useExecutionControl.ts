/**
 * useExecutionControl - Workflow execution control
 *
 * Handles start, pause, step, reset execution logic
 */
import { useCallback, useRef } from 'react';
import { useFlowStore } from '../../../store';
import { useFlowCanvasUIStore } from '../../../store';
import { useSettingsStore } from '../../../store';
import { useEnvironmentStore } from '../../../store';
import { toast } from '../../../store/notificationStore';
import { useTranslation } from '../../../utils/i18n';
import {
  executeWorkflow,
  topologicalSort,
  createExecutionContext,
  executeNode,
  ExecutionLog,
  NodeStatus,
} from '../FlowExecutionEngine';
import type { FlowData } from '../../../types/flow';

interface WorkflowResult {
  success: boolean;
  results: Record<string, Record<string, unknown>>;
  logs: ExecutionLog[];
  timings: Array<{
    nodeId: string;
    nodeName: string;
    startTime: number;
    endTime: number;
    duration: number;
    status: string;
  }>;
}

export function useExecutionControl() {
  const {
    nodes: storeNodes,
    edges: storeEdges,
    variables: storeVariables,
    executionStatus: storeExecutionStatus,
    executionLog: storeExecutionLog,
    nodeStatuses: storeNodeStatuses,
    workflowResult: storeWorkflowResult,
    nodeOutputs: storeNodeOutputs,
    currentFlowId,
    currentFlowName,
    setNodes: storeSetNodes,
    setExecutionStatus,
    setExecutionLog,
    addExecutionLog,
    setNodeStatuses,
    setWorkflowResult,
    setNodeOutput,
    resetExecution: storeResetExecution,
    saveCurrentFlow,
  } = useFlowStore();

  const {
    stepMode,
    currentStepIndex,
    setCurrentStepIndex,
    setIsStepping,
    incrementStepIndex,
    isStepping,
  } = useFlowCanvasUIStore();

  const globalVariables = useSettingsStore((state) => state.globalVariables || []);
  const getVariablesMap = useEnvironmentStore((s) => s.getVariablesMap);
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);
  const resultRef = useRef<WorkflowResult | null>(null);

  const startExecution = useCallback(async (options?: { maxConcurrency?: number }) => {
    setExecutionLog([]);
    setWorkflowResult(null);
    setNodeStatuses({});

    storeSetNodes((nds) =>
      nds.map((node) => ({ ...node, data: { ...node.data, status: 'pending' as NodeStatus } }))
    );

    // Step mode: initialize and pause for step-by-step execution
    // Read stepMode fresh from store at call time to avoid stale closure
    const currentStepMode = useFlowCanvasUIStore.getState().stepMode;
    if (currentStepMode) {
      resultRef.current = {
        success: true,
        results: {},
        logs: [],
        timings: [],
      };
      setCurrentStepIndex(0);
      setExecutionStatus('paused');
      return;
    }

    setExecutionStatus('running');
    resultRef.current = null;

    try {
      const result = await executeWorkflow(storeNodes, storeEdges, {
        errorHandling: 'fail-fast',
        onProgress: (nodeId, status) => {
          setNodeStatuses({ ...storeNodeStatuses, [nodeId]: status });
          storeSetNodes((nds) =>
            nds.map((node) =>
              node.id === nodeId ? { ...node, data: { ...node.data, status } } : node
            )
          );
        },
        onLog: (log: ExecutionLog) => {
          addExecutionLog(log);
        },
        globalVariables,
        envVariables: Object.entries(getVariablesMap()).map(([key, value]) => ({ key, value })),
        maxConcurrency: options?.maxConcurrency,
      });

      const resultForStore: WorkflowResult = {
        ...result,
        results: Object.fromEntries(result.results) as Record<string, Record<string, unknown>>,
      };

      resultRef.current = resultForStore;
      setWorkflowResult(resultForStore);

      for (const [nodeId, outputs] of Object.entries(resultForStore.results)) {
        setNodeOutput(nodeId, outputs);
      }

      // Add logs from execution result
      if (result.logs && result.logs.length > 0) {
        for (const log of result.logs) {
          addExecutionLog(log);
        }
      }

      // Update node durations from timing info
      if (resultForStore.timings) {
        storeSetNodes((nds) =>
          nds.map((node) => {
            const timing = resultForStore.timings.find((t) => t.nodeId === node.id);
            if (timing) {
              return { ...node, data: { ...node.data, duration: timing.duration } };
            }
            return node;
          })
        );
      }

      setExecutionStatus(result.success ? 'completed' : 'error');
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(t('flow.executionFailed'));
      const errorLog: ExecutionLog = {
        timestamp: Date.now(),
        nodeId: '',
        nodeName: 'Workflow',
        level: 'error',
        message: `Execution failed: ${err.message}`,
      };
      addExecutionLog(errorLog);
      setExecutionStatus('error');
    }
  }, [storeNodes, storeEdges, storeSetNodes, storeNodeStatuses, storeExecutionLog, globalVariables, setCurrentStepIndex]);

  const pauseExecution = useCallback(() => {
    // If pausing during step execution, clear the stepping flag
    if (isStepping) {
      setIsStepping(false);
    }
    setExecutionStatus('paused');
  }, [setExecutionStatus, isStepping, setIsStepping]);

  // Stop/cancel execution - completely stops and resets
  const stopExecution = useCallback(() => {
    setIsStepping(false);
    setExecutionStatus('idle');
    setExecutionLog([]);
    setWorkflowResult(null);
    resultRef.current = null;
    setNodeStatuses({});
    // Note: do NOT reset stepMode - user may want to run again in step mode
    setCurrentStepIndex(0);
    storeSetNodes((nds) =>
      nds.map((node) => ({ ...node, data: { ...node.data, status: 'pending' as NodeStatus } }))
    );
    addExecutionLog({
      timestamp: Date.now(),
      nodeId: '',
      nodeName: 'Workflow',
      level: 'warning',
      message: t('flow.executionStopped'),
    });
  }, [setIsStepping, setExecutionStatus, setExecutionLog, setWorkflowResult, setNodeStatuses, setCurrentStepIndex, storeSetNodes, addExecutionLog]);

  const resetExecution = useCallback(() => {
    setExecutionStatus('idle');
    setExecutionLog([]);
    setWorkflowResult(null);
    resultRef.current = null;
    setNodeStatuses({});
    // Note: do NOT reset stepMode - user may want to run again in same mode
    setCurrentStepIndex(0);
    storeSetNodes((nds) =>
      nds.map((node) => ({ ...node, data: { ...node.data, status: 'pending' as NodeStatus } }))
    );
    storeResetExecution();
  }, [storeSetNodes, setExecutionStatus, setExecutionLog, setWorkflowResult, setNodeStatuses, setCurrentStepIndex, storeResetExecution]);

  const runNodeOnly = useCallback(async (nodeId: string) => {
    const node = storeNodes.find(n => n.id === nodeId);
    if (!node) return;

    const result: WorkflowResult = {
      success: true,
      results: {},
      logs: [],
      timings: [],
    };

    const envVariables = Object.entries(getVariablesMap()).map(([key, value]: [string, string]) => ({ key, value }));
    const context = createExecutionContext(storeNodes, storeEdges, 'fail-fast', globalVariables, envVariables, storeVariables);

    const inputs = storeEdges
      .filter(e => e.target === nodeId)
      .reduce((acc, edge) => ({
        ...acc,
        ...(storeNodeOutputs?.[edge.source] || {})
      }), {} as Record<string, unknown>);

    setNodeStatuses({ ...storeNodeStatuses, [nodeId]: 'running' });
    storeSetNodes((nds) =>
      nds.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, status: 'running' as NodeStatus } } : n
      )
    );

    try {
      const outputs = await executeNode(node, context, inputs);
      result.results[nodeId] = outputs;

      setNodeStatuses({ ...storeNodeStatuses, [nodeId]: 'success' });
      storeSetNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, status: 'success' as NodeStatus } } : n
        )
      );

      const singleResult: WorkflowResult = {
        success: true,
        results: { [nodeId]: outputs },
        logs: [],
        timings: [],
      };
      setWorkflowResult(singleResult);
      setNodeOutput(nodeId, outputs);
      addExecutionLog({
        timestamp: Date.now(),
        nodeId,
        nodeName: String(node.data.label || node.type),
        level: 'success',
        message: `${node.type} executed successfully`,
      });
    } catch (error: unknown) {
      const err = error as Error;
      setNodeStatuses({ ...storeNodeStatuses, [nodeId]: 'error' });
      storeSetNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, status: 'error' as NodeStatus } } : n
        )
      );
      addExecutionLog({
        timestamp: Date.now(),
        nodeId,
        nodeName: String(node.data.label || node.type),
        level: 'error',
        message: `Error: ${err.message}`,
      });
    }
  }, [storeNodes, storeEdges, storeSetNodes, storeNodeStatuses, storeExecutionLog, storeNodeOutputs, globalVariables, storeVariables]);

  const runDownstream = useCallback(async (startNodeId: string) => {
    const startNode = storeNodes.find(n => n.id === startNodeId);
    if (!startNode) return;

    const sortedNodes = topologicalSort(storeNodes, storeEdges);
    const startIndex = sortedNodes.indexOf(startNodeId);
    if (startIndex === -1) return;

    const nodesToExecute = sortedNodes.slice(startIndex);

    const result: WorkflowResult = {
      success: true,
      results: {},
      logs: [],
      timings: [],
    };

    const envVariables = Object.entries(getVariablesMap()).map(([key, value]: [string, string]) => ({ key, value }));
    const context = createExecutionContext(storeNodes, storeEdges, 'fail-fast', globalVariables, envVariables, storeVariables);

    setExecutionStatus('running');

    for (const nodeId of nodesToExecute) {
      const node = storeNodes.find(n => n.id === nodeId);
      if (!node) continue;

      const inputs = storeEdges
        .filter(e => e.target === nodeId)
        .reduce((acc, edge) => ({
          ...acc,
          ...(result.results[edge.source] || {})
        }), {} as Record<string, unknown>);

      setNodeStatuses({ ...storeNodeStatuses, [nodeId]: 'running' });

      try {
        const outputs = await executeNode(node, context, inputs);
        result.results[nodeId] = outputs;
        setNodeOutput(nodeId, outputs);
        setNodeStatuses({ ...storeNodeStatuses, [nodeId]: 'success' });
      } catch (error: unknown) {
        const err = error as Error;
        result.success = false;
        setNodeStatuses({ ...storeNodeStatuses, [nodeId]: 'error' });
        addExecutionLog({
          timestamp: Date.now(),
          nodeId,
          nodeName: String(node.data.label || node.type),
          level: 'error',
          message: `Error: ${err.message}`,
        });
        break;
      }
    }

    setExecutionStatus(result.success ? 'completed' : 'error');
    setWorkflowResult(result);
  }, [storeNodes, storeEdges, storeSetNodes, storeNodeStatuses, storeExecutionLog, storeNodeOutputs, globalVariables, storeVariables]);

  const stepExecuteCurrent = useCallback(async () => {
    if (storeExecutionStatus !== 'paused') {
      toast.error(t('flow.pleaseStartStepMode'));
      return;
    }
    // Read stepMode fresh from store at call time to avoid stale closure
    const currentStepMode = useFlowCanvasUIStore.getState().stepMode;
    if (currentStepMode === false) {
      toast.error(t('flow.pleaseEnableStepMode'));
      return;
    }

    const sortedNodes = topologicalSort(storeNodes, storeEdges);
    if (currentStepIndex >= sortedNodes.length) {
      setExecutionStatus('completed');
      // Note: do NOT auto-reset stepMode - let user decide
      return;
    }

    const nodeId = sortedNodes[currentStepIndex];
    const node = storeNodes.find(n => n.id === nodeId);
    if (!node) return;

    // Set stepping state to show loading
    setIsStepping(true);
    setExecutionStatus('running');

    try {
      const results = resultRef.current?.results || {};
      const inputs = storeEdges
        .filter(e => e.target === nodeId)
        .reduce((acc, edge) => ({
          ...acc,
          ...(results[edge.source] || {})
        }), {} as Record<string, unknown>);

      const envVariables = Object.entries(getVariablesMap()).map(([key, value]: [string, string]) => ({ key, value }));
      const context = createExecutionContext(storeNodes, storeEdges, 'fail-fast', globalVariables, envVariables, storeVariables);
      const outputs = await executeNode(node, context, inputs);

      if (resultRef.current) {
        resultRef.current.results[nodeId] = outputs;
      }

      setNodeStatuses({ ...storeNodeStatuses, [nodeId]: 'success' });
      storeSetNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, status: 'success' as NodeStatus } } : n
        )
      );

      addExecutionLog({
        timestamp: Date.now(),
        nodeId,
        nodeName: String(node.data.label || node.type),
        level: 'success',
        message: `Step ${currentStepIndex + 1}: ${node.type} completed`,
      });

      incrementStepIndex();

      // Clear stepping state after successful execution
      setIsStepping(false);

      if (currentStepIndex + 1 >= sortedNodes.length) {
        setExecutionStatus('completed');
        // Note: do NOT auto-reset stepMode - let user decide
      } else {
        // More steps to execute, set back to paused
        setExecutionStatus('paused');
      }
    } catch (error: unknown) {
      const err = error as Error;
      setNodeStatuses({ ...storeNodeStatuses, [nodeId]: 'error' });
      addExecutionLog({
        timestamp: Date.now(),
        nodeId,
        nodeName: String(node.data.label || node.type),
        level: 'error',
        message: `Error: ${err.message}`,
      });
      setExecutionStatus('error');
      // Note: do NOT auto-reset stepMode - let user decide
      setIsStepping(false);
    }
  }, [storeNodes, storeEdges, storeExecutionStatus, stepMode, currentStepIndex, storeSetNodes, storeNodeStatuses, storeExecutionLog, globalVariables, storeVariables, incrementStepIndex, setIsStepping, setExecutionStatus]);

  const handleSaveFlow = useCallback(async (e?: React.MouseEvent) => {
    e?.preventDefault();
    try {
      const flowData: FlowData = {
        id: currentFlowId || '',
        name: currentFlowName || `Flow ${Date.now()}`,
        nodes: storeNodes,
        edges: storeEdges,
        variables: storeVariables,
        version: 1,
        created_at: '',
        updated_at: '',
      };
      const result = await saveCurrentFlow(flowData);
      if (!currentFlowId && result) {
        useFlowStore.getState().setCurrentFlowId(result);
      }
      addExecutionLog({
        timestamp: Date.now(),
        nodeId: '',
        nodeName: 'Workflow',
        level: 'success',
        message: `Flow saved: ${flowData.name}`,
      });
    } catch (err) {
      addExecutionLog({
        timestamp: Date.now(),
        nodeId: '',
        nodeName: 'Workflow',
        level: 'error',
        message: `Failed to save flow: ${err}`,
      });
    }
  }, [storeNodes, storeEdges, storeVariables, currentFlowName, currentFlowId, saveCurrentFlow]);

  // Cancel current step execution - sets status back to paused
  const cancelStepExecution = useCallback(() => {
    setIsStepping(false);
    setExecutionStatus('paused');
    addExecutionLog({
      timestamp: Date.now(),
      nodeId: '',
      nodeName: 'Workflow',
      level: 'warning',
      message: t('flow.steppingCancelled'),
    });
  }, [setIsStepping, setExecutionStatus, addExecutionLog]);

  return {
    executionStatus: storeExecutionStatus,
    setExecutionStatus,
    workflowResult: storeWorkflowResult,
    nodeStatuses: storeNodeStatuses,
    executionLog: storeExecutionLog,
    startExecution,
    pauseExecution,
    stopExecution,
    resetExecution,
    stepExecuteCurrent,
    cancelStepExecution,
    runNodeOnly,
    runDownstream,
    handleSaveFlow,
    isStepping,
  };
}