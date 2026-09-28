/**
 * Flow Execution Engine Types
 */

import type { Node, Edge } from "reactflow";

// Flow data from backend
export interface FlowData {
  id: string;
  name: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  variables: Record<string, string>;
  version: number;
  created_at: string;
  updated_at: string;
}

export type NodeStatus = "pending" | "running" | "success" | "error" | "paused";

// Variable types for flow execution
export interface GlobalVariable {
  key: string;
  value: string;
  enabled: boolean;
}

export type VariableScope = "global" | "workflow" | "node" | "env" | "tmp";

export interface WorkflowVariable {
  name: string;
  value: unknown;
  scope: VariableScope;
  nodeId?: string;
}

export interface ExecutionContext {
  variables: Map<string, WorkflowVariable>;
  nodeOutputs: Map<string, Record<string, unknown>>;
  executionOrder: string[];
  currentNodeIndex: number;
  status: ExecutionStatus;
  logs: ExecutionLog[];
  errorHandling: ErrorHandlingMode;
}

export type ExecutionStatus = "idle" | "running" | "paused" | "completed" | "error";
export type ErrorHandlingMode = "fail-fast" | "continue";

export interface ExecutionLog {
  timestamp: number;
  nodeId: string;
  nodeName: string;
  level: LogLevel;
  message: string;
}

export type LogLevel = "info" | "success" | "error" | "warning";

// Flow edge extensions
export type FlowEdge = Edge & {
  targetPort?: string;
  sourcePort?: string;
};

// Node data interfaces
export interface ApiCallNodeData {
  label: string;
  method: string;
  url: string;
  headers?: Record<string, string>;
  params?: Record<string, string>;
  body?: unknown;
  auth?: AuthConfig;
  status: NodeStatus;
  response?: unknown;
  statusCode?: number;
  executionTime?: number;
  error?: string;
}

export interface AuthConfig {
  type: "bearer" | "basic" | "apiKey" | "oauth2" | "aws" | "none";
  token?: string;
  username?: string;
  password?: string;
  key?: string;
  value?: string;
  location?: "header" | "query" | "cookie";
}

export interface TransformNodeData {
  label: string;
  inputMapping: string;
  transformation: string;
  status: NodeStatus;
}

export interface ConditionNodeData {
  label: string;
  expression: string;
  status: NodeStatus;
  result?: boolean;
}

export interface LoopNodeData {
  label: string;
  iterations: number;
  currentIteration: number;
  status: NodeStatus;
}

export interface AssertNodeData {
  label: string;
  assertions: Assertion[];
  status: NodeStatus;
}

export interface Assertion {
  type: "statusCode" | "responseTime" | "responseSize" | "jsonPath" | "regex" | "schema";
  expected?: unknown;
  path?: string;
  max?: number;
  pattern?: string;
  schema?: unknown;
}

export interface DelayNodeData {
  label: string;
  duration: number;
  status: NodeStatus;
}

export interface LogNodeData {
  label: string;
  message: string;
  status: NodeStatus;
}

export interface ScriptNodeData {
  label: string;
  script: string;
  status: NodeStatus;
}

export type FlowNode = Node;

// Parallel Execution Types
export interface ParallelExecutionConfig {
  maxConcurrency: number;        // Max parallel nodes (default: 5)
  continueOnError: boolean;       // Continue if one node fails
  timeoutPerNode: number;         // Per-node timeout in ms
}

export interface NodeExecutionResult {
  nodeId: string;
  status: NodeStatus;
  output?: Record<string, unknown>;
  error?: string;
  startTime: number;
  endTime: number;
}

export interface ParallelExecutionResult {
  success: boolean;
  totalNodes: number;
  completedNodes: number;
  failedNodes: number;
  results: Record<string, NodeExecutionResult>;
  timings: NodeTiming[];
}

export interface NodeTiming {
  nodeId: string;
  nodeName: string;
  startTime: number;
  endTime: number;
  duration: number;
  status: string;
}