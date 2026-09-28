/**
 * useCanvasHandlers - Canvas event handlers
 *
 * Handles ReactFlow events: onNodeClick, onConnect, onContextMenu, etc.
 */
import React, { useCallback } from 'react';
import { applyNodeChanges, applyEdgeChanges, addEdge, MarkerType } from 'reactflow';
import type { NodeChange, EdgeChange, Connection, Node as RFNode } from 'reactflow';
import { useFlowStore } from '../../../store';
import { useFlowCanvasUIStore } from '../../../store';

export function useCanvasHandlers() {
  const {
    nodes: storeNodes,
    edges: storeEdges,
    setNodes: storeSetNodes,
    setEdges: storeSetEdges,
  } = useFlowStore();

  const {
    setSelectedNodeId,
    setContextMenuNodeId,
    setShowNodeContextMenu,
    setAddNodeMenuPos,
    setShowAddNodeMenu,
    setPendingConnectionSource,
    setMenuPosition,
    setShowNodeMenu,
    setNodeContextMenuPos,
  } = useFlowCanvasUIStore();

  // ReactFlow change handlers - update store directly
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    const newNodes = applyNodeChanges(changes, storeNodes);
    storeSetNodes(newNodes);
  }, [storeNodes, storeSetNodes]);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    const newEdges = applyEdgeChanges(changes, storeEdges);
    storeSetEdges(newEdges);
  }, [storeEdges, storeSetEdges]);

  const onConnect = useCallback((params: Connection) => {
    if (params.source && params.target) {
      storeSetEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
          },
          eds
        )
      );
    }
  }, [storeSetEdges]);

  // Track connection start to know source node
  const onConnectStart = useCallback((_: unknown, params: { nodeId: string | null; handleId: string | null; handleType: string | null }) => {
    if (params.nodeId) {
      setPendingConnectionSource(params.nodeId);
    }
  }, [setPendingConnectionSource]);

  // Show menu when connection ends without target
  const onConnectEnd = useCallback((e: MouseEvent | TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0]?.clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0]?.clientY : e.clientY;

    const target = e.target as HTMLElement;
    const isHandle = target.closest('.react-flow__handle');

    if (!isHandle && clientX !== undefined && useFlowCanvasUIStore.getState().pendingConnectionSource) {
      setMenuPosition({ x: clientX, y: clientY });
      setShowNodeMenu(true);
    }
  }, [setMenuPosition, setShowNodeMenu]);

  const onNodeClick = useCallback((_: unknown, node: RFNode) => {
    setSelectedNodeId(node.id);
  }, [setSelectedNodeId]);

  const onNodeContextMenu = useCallback((e: React.MouseEvent, node: RFNode) => {
    e.preventDefault();
    setNodeContextMenuPos({ x: e.clientX, y: e.clientY });
    setContextMenuNodeId(node.id);
    setShowNodeContextMenu(true);
  }, [setNodeContextMenuPos, setContextMenuNodeId, setShowNodeContextMenu]);

  const onPaneContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setAddNodeMenuPos({ x: e.clientX, y: e.clientY });
    setShowAddNodeMenu(true);
  }, [setAddNodeMenuPos, setShowAddNodeMenu]);

  return {
    onNodesChange,
    onEdgesChange,
    onConnect,
    onConnectStart,
    onConnectEnd,
    onNodeClick,
    onNodeContextMenu,
    onPaneContextMenu,
  };
}