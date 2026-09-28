/**
 * useNodeOperations - Node CRUD operations
 *
 * Handles add, delete, duplicate, update node data
 */
import { useCallback } from 'react';
import { addEdge, MarkerType } from 'reactflow';
import type { Node as RFNode } from 'reactflow';
import { useFlowStore } from '../../../store';
import { useFlowCanvasUIStore } from '../../../store';
import { NODE_TEMPLATES } from '../FlowCanvas.constants';

export type FlowNodeType = 'apiCall' | 'auth' | 'condition' | 'loop' | 'transform' | 'assert' | 'delay' | 'log' | 'script';

function generateNodeId(type: FlowNodeType): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let shortId = '';
  for (let i = 0; i < 6; i++) {
    shortId += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${type}_${shortId}`;
}

export function useNodeOperations() {
  const {
    nodes: storeNodes,
    edges: storeEdges,
    setNodes: storeSetNodes,
    setEdges: storeSetEdges,
  } = useFlowStore();

  const {
    setSelectedNodeId,
  } = useFlowCanvasUIStore();

  const addNode = useCallback((type: FlowNodeType, position?: { x: number; y: number }) => {
    const template = NODE_TEMPLATES[type];
    const id = generateNodeId(type);
    const newNode = {
      ...template,
      id,
      position: position || { x: Math.random() * 300 + 100, y: Math.random() * 200 + 100 },
    };
    storeSetNodes((nds) => [...nds, newNode as RFNode]);
    return id;
  }, [storeSetNodes]);

  // Add node and connect from source node
  const addNodeWithConnection = useCallback((
    type: FlowNodeType,
    sourceNodeId: string,
    position?: { x: number; y: number }
  ) => {
    const template = NODE_TEMPLATES[type];
    const id = generateNodeId(type);

    const sourceNode = storeNodes.find(n => n.id === sourceNodeId);
    const newNodePos = position || (sourceNode
      ? { x: sourceNode.position.x + 200, y: sourceNode.position.y + 50 }
      : { x: Math.random() * 300 + 100, y: Math.random() * 200 + 100 });

    const newNode = {
      ...template,
      id,
      position: newNodePos,
    };
    storeSetNodes((nds) => [...nds, newNode as RFNode]);

    // Create edge from source to new node
    storeSetEdges((eds) =>
      addEdge(
        {
          id: `e-${sourceNodeId}-${id}`,
          source: sourceNodeId,
          target: id,
          animated: true,
          markerEnd: { type: MarkerType.ArrowClosed },
        },
        eds
      )
    );

    return id;
  }, [storeNodes, storeSetNodes, storeSetEdges]);

  const updateNodeData = useCallback((nodeId: string, data: Record<string, unknown>) => {
    storeSetNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
      )
    );
  }, [storeSetNodes]);

  const deleteNode = useCallback((nodeId: string) => {
    const edgesToDelete = storeEdges.filter(e => e.source === nodeId || e.target === nodeId);
    const incomingEdges = edgesToDelete.filter(e => e.target === nodeId);
    const outgoingEdges = edgesToDelete.filter(e => e.source === nodeId);

    if (incomingEdges.length > 0 && outgoingEdges.length > 0) {
      const sourceNodeId = incomingEdges[0].source;
      const targetNodeId = outgoingEdges[0].target;

      storeSetEdges((eds) => {
        const filtered = eds.filter(e => e.source !== nodeId && e.target !== nodeId);
        return [
          ...filtered,
          {
            id: `e-${sourceNodeId}-${targetNodeId}`,
            source: sourceNodeId,
            target: targetNodeId,
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
          }
        ];
      });
    } else {
      storeSetEdges((eds) => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
    }

    storeSetNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setSelectedNodeId(null);
  }, [storeEdges, storeSetNodes, storeSetEdges, setSelectedNodeId]);

  const duplicateNode = useCallback((nodeId: string) => {
    const sourceNode = storeNodes.find(n => n.id === nodeId);
    if (!sourceNode) return;

    const type = sourceNode.type as FlowNodeType;
    addNode(type, {
      x: sourceNode.position.x + 50,
      y: sourceNode.position.y + 50,
    });
  }, [storeNodes, addNode]);

  return {
    addNode,
    addNodeWithConnection,
    updateNodeData,
    deleteNode,
    duplicateNode,
  };
}