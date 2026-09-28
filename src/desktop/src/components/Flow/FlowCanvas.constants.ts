/**
 * FlowCanvas Constants and Templates
 */

import type { FlowNodeType } from "./canvas/useNodeOperations";
import type { ApiRequestConfig } from "../Request/ApiRequestConfigPanel";
import type { Node, Edge } from "reactflow";

// ============================================================================
// Type Definitions
// ============================================================================

interface BaseNodeData {
  label: string;
  status: "pending" | "running" | "success" | "error" | "paused";
}

interface ApiCallNodeData extends BaseNodeData {
  method: string;
  url: string;
}

interface AuthNodeData extends BaseNodeData {
  type: "Bearer" | "Basic" | "ApiKey" | "OAuth2" | "AWS";
}

interface ConditionNodeData extends BaseNodeData {
  expression: string;
}

interface LoopNodeData extends BaseNodeData {
  iterations: number;
  currentIteration: number;
}

interface TransformNodeData extends BaseNodeData {
  inputMapping: string;
  transformation: string;
}

interface AssertNodeData extends BaseNodeData {
  expression: string;
  assertions: Array<{ type: string; expected: number }>;
}

interface DelayNodeData extends BaseNodeData {
  duration: number;
}

interface LogNodeData extends BaseNodeData {
  message: string;
}

interface ScriptNodeData extends BaseNodeData {
  script: string;
}

type FlowNodeData =
  | ApiCallNodeData
  | AuthNodeData
  | ConditionNodeData
  | LoopNodeData
  | TransformNodeData
  | AssertNodeData
  | DelayNodeData
  | LogNodeData
  | ScriptNodeData;

type FlowNode = Node<FlowNodeData, FlowNodeType>;

// Template type - nodes without id (id generated when instantiated)
type FlowNodeTemplate = Omit<FlowNode, 'id'>;

// ============================================================================
// Style Constants
// ============================================================================

export const INPUT_STYLE = {
  backgroundColor: "var(--bg-primary)",
  color: "var(--text-primary)",
  border: "1px solid var(--border-color)",
} as const;

// 节点状态颜色
export const NODE_STATUS_COLORS = {
  running: "var(--accent)",
  success: "var(--success)",
  error: "var(--danger)",
  pending: "var(--bg-tertiary)",
  paused: "var(--warning)",
} as const;

// 执行状态颜色
export const EXECUTION_STATUS_COLORS = {
  running: "var(--success)",
  paused: "var(--warning)",
  error: "var(--danger)",
  idle: "var(--text-muted)",
  completed: "var(--success)",
} as const;

// 日志级别颜色
export const LOG_LEVEL_COLORS = {
  success: "var(--success)",
  error: "var(--danger)",
  warning: "var(--warning)",
  info: "var(--text-secondary)",
} as const;

// 执行时间颜色（根据耗时）
export const TIMING_COLORS = {
  slow: "var(--danger)",
  medium: "var(--warning)",
  fast: "var(--success)",
} as const;

// 获取 timing 颜色
export function getTimingColor(duration: number): string {
  return duration > 1000 ? TIMING_COLORS.slow : duration > 500 ? TIMING_COLORS.medium : TIMING_COLORS.fast;
}

// 通用 className 常量
export const INPUT_CLASS = "w-full px-2 py-1 rounded text-sm focus:outline-none";
export const MONO_INPUT_CLASS = "w-full px-2 py-1 rounded text-sm font-mono focus:outline-none";
export const BTN_CLASS = "px-3 py-1 text-xs rounded transition-colors";
export const BTN_DISABLED_CLASS = "px-3 py-1 text-xs rounded disabled:opacity-50 transition-colors";

// 通用 style 常量
export const TEXT_MUTED_STYLE = { color: "var(--text-muted)" } as const;
export const PANEL_STYLE = { backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-color)" } as const;
export const BG_TERTIARY_STYLE = { backgroundColor: "var(--bg-tertiary)" } as const;

// ============================================================================
// Default Values
// ============================================================================

export const DEFAULT_EDGES: Edge[] = [];

export const DEFAULT_API_CONFIG: ApiRequestConfig = {
  method: "GET",
  url: "",
  headers: [],
  params: [],
  bodyType: "none",
  body: {
    formData: [],
    binaryFile: null,
    urlencodedData: [],
    rawContentType: "application/json",
    reqBody: "",
    graphqlQuery: "",
    graphqlVariables: "{}",
  },
  auth: { authType: "none" },
};

export const DEFAULT_RETRY_STATUS_CODES = [429, 500, 502, 503, 504];

export const AUTH_TYPES = ["bearer", "basic", "apiKey", "oauth2", "aws"] as const;

export const NODE_TYPE_MENU_ITEMS: { label: string; value: FlowNodeType; icon: string }[] = [
  { label: "+ apiCall", value: "apiCall", icon: "🌐" },
  { label: "+ auth", value: "auth", icon: "🔐" },
  { label: "+ condition", value: "condition", icon: "⚡" },
  { label: "+ loop", value: "loop", icon: "🔄" },
  { label: "+ assert", value: "assert", icon: "✅" },
  { label: "+ transform", value: "transform", icon: "🔧" },
  { label: "+ delay", value: "delay", icon: "⏱" },
  { label: "+ log", value: "log", icon: "📝" },
  { label: "+ script", value: "script", icon: "📜" },
];

export const NODE_TEMPLATES: Record<FlowNodeType, FlowNodeTemplate> = {
  apiCall: {
    type: "apiCall",
    data: { label: "API Call", method: "GET", url: "/api/example", status: "pending" },
    position: { x: 0, y: 0 },
  },
  auth: {
    type: "auth",
    data: { label: "Auth", type: "Bearer", status: "pending" },
    position: { x: 0, y: 0 },
  },
  condition: {
    type: "condition",
    data: { label: "Condition", expression: "statusCode == 200", status: "pending" },
    position: { x: 0, y: 0 },
  },
  loop: {
    type: "loop",
    data: { label: "Loop", iterations: 5, currentIteration: 0, status: "pending" },
    position: { x: 0, y: 0 },
  },
  transform: {
    type: "transform",
    data: { label: "Transform", inputMapping: "", transformation: "", status: "pending" },
    position: { x: 0, y: 0 },
  },
  assert: {
    type: "assert",
    data: {
      label: "Assert",
      expression: "response.status == 200",
      assertions: [
        { type: "statusCode", expected: 200 },
      ],
      status: "pending",
    },
    position: { x: 0, y: 0 },
  },
  delay: {
    type: "delay",
    data: { label: "Delay", duration: 1000, status: "pending" },
    position: { x: 0, y: 0 },
  },
  log: {
    type: "log",
    data: { label: "Log", message: "Workflow started", status: "pending" },
    position: { x: 0, y: 0 },
  },
  script: {
    type: "script",
    data: { label: "Script", script: "// Custom JavaScript\nreturn { processed: true };", status: "pending" },
    position: { x: 0, y: 0 },
  },
};
