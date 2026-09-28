/**
 * Flow Execution Engine
 * 实现数据流驱动的拓扑排序执行
 */

import { toast } from "../../store/notificationStore";
import { isSuccess } from "../../utils/RequestUtils";
import { executeRequest, type ExecuteRequestConfig } from "../../services/api";
import { t } from "../../utils/i18n";
import { useSettingsStore } from "../../store";
import type { Edge } from "reactflow";
import type {
  ExecutionContext,
  ExecutionLog,
  FlowNode,
  NodeStatus,
  ExecutionStatus,
  ErrorHandlingMode,
  WorkflowVariable,
  GlobalVariable,
} from "../../types/flow";
import type { EnvVariable } from "../../types/api";

export type { NodeStatus, ExecutionLog, ExecutionContext, ErrorHandlingMode, GlobalVariable };
export type { EnvVariable };

// ============================================
// Semaphore for concurrency control
// ============================================

/**
 * Semaphore for limiting concurrent executions
 */
class Semaphore {
  private permits: number;
  private waitQueue: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this.waitQueue.push(resolve);
    });
  }

  release(): void {
    this.permits++;
    const next = this.waitQueue.shift();
    if (next) {
      this.permits--;
      next();
    }
  }
}

/**
 * Execute tasks with limited concurrency using semaphore
 */
async function executeWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  maxConcurrency: number
): Promise<T[]> {
  if (maxConcurrency <= 0 || tasks.length <= maxConcurrency) {
    return Promise.all(tasks.map((t) => t()));
  }

  const semaphore = new Semaphore(maxConcurrency);
  const results: T[] = new Array(tasks.length);

  const executeTask = async (index: number, task: () => Promise<T>) => {
    await semaphore.acquire();
    try {
      results[index] = await task();
    } finally {
      semaphore.release();
    }
  };

  await Promise.all(tasks.map((task, index) => executeTask(index, task)));
  return results;
}

// ============================================
// 变量系统
// ============================================

/**
 * 创建执行上下文
 */
export function createExecutionContext(
  _nodes: FlowNode[],
  _edges: Edge[],
  errorHandling: ErrorHandlingMode = "fail-fast",
  globalVariables: GlobalVariable[] = [],
  envVariables: EnvVariable[] = [],
  workflowVariables: Record<string, string> = {}
): ExecutionContext {
  const variables = new Map<string, WorkflowVariable>();

  // Initialize global variables
  globalVariables.forEach(gv => {
    if (gv.enabled) {
      variables.set(`global.${gv.key}`, {
        name: gv.key,
        value: gv.value,
        scope: "global",
      });
    }
  });

  // Initialize environment variables
  envVariables.forEach(ev => {
    const enabled = ev.enabled !== false; // default to true if not specified
    if (enabled) {
      variables.set(`env.${ev.key}`, {
        name: ev.key,
        value: ev.value,
        scope: "env",
      });
    }
  });

  // Initialize workflow variables
  Object.entries(workflowVariables).forEach(([key, value]) => {
    variables.set(`workflow.${key}`, {
      name: key,
      value: value,
      scope: "workflow",
    });
  });

  return {
    variables,
    nodeOutputs: new Map<string, Record<string, unknown>>(),
    executionOrder: [],
    currentNodeIndex: 0,
    status: "idle" as ExecutionStatus,
    logs: [],
    errorHandling,
  };
}

/**
 * 解析变量引用 {{variable.path}}
 */
export function parseVariableReference(input: string): { scope: string; path: string } | null {
  const match = input.match(/^\{\{([^}]+)\}\}$/);
  if (!match) return null;

  const varPath = match[1];
  const dotIndex = varPath.indexOf(".");
  if (dotIndex === -1) {
    return { scope: varPath, path: "" };
  }
  return {
    scope: varPath.slice(0, dotIndex),
    path: varPath.slice(dotIndex + 1),
  };
}

/**
 * 替换字符串中的变量引用
 */
export function substituteVariables(
  input: string,
  context: ExecutionContext,
  nodeId?: string
): string {
  return input.replace(/\{\{([^}]+)\}\}/g, (match, varPath) => {
    const value = resolveVariable(varPath.trim(), context, nodeId);
    return value !== undefined ? String(value) : match;
  });
}

/**
 * 解析并获取变量值
 */
export function resolveVariable(
  varPath: string,
  context: ExecutionContext,
  currentNodeId?: string
): unknown {
  const dotIndex = varPath.indexOf(".");
  const scope = dotIndex === -1 ? varPath : varPath.slice(0, dotIndex);
  const path = dotIndex === -1 ? "" : varPath.slice(dotIndex + 1);

  if (path) {
    const nodeOutput = context.nodeOutputs.get(scope);
    if (nodeOutput) {
      return getNestedValue(nodeOutput, path);
    }
  }

  switch (scope) {
    case "env": {
      const envVar = context.variables.get(`env.${path}`);
      return envVar?.value;
    }
    case "global": {
      const globalVar = context.variables.get(`global.${path}`);
      return globalVar?.value;
    }
    case "workflow": {
      const workflowVar = context.variables.get(`workflow.${path}`);
      return workflowVar?.value;
    }
    case "tmp": {
      const tmpVar = context.variables.get(`tmp.${path}`);
      return tmpVar?.value;
    }
    default: {
      // No scope prefix - check all scopes for the variable
      // First check if it's a node output
      if (currentNodeId && !path) {
        return context.nodeOutputs.get(currentNodeId);
      }
      // Check workflow variables (most common case for bare variables)
      const workflowVar = context.variables.get(`workflow.${scope}`);
      if (workflowVar !== undefined) {
        return workflowVar.value;
      }
      // Check env variables
      const envVar = context.variables.get(`env.${scope}`);
      if (envVar !== undefined) {
        return envVar.value;
      }
      // Check global variables
      const globalVar = context.variables.get(`global.${scope}`);
      if (globalVar !== undefined) {
        return globalVar.value;
      }
      return undefined;
    }
  }
}

/**
 * 获取嵌套对象值
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  if (!obj) return undefined;
  return path.split(".").reduce<unknown>((current, key) => (current as Record<string, unknown>)?.[key], obj);
}

// ============================================
// 拓扑排序
// ============================================

/**
 * 拓扑排序 - 确定节点执行顺序
 */
export function topologicalSort(nodes: FlowNode[], edges: Edge[]): string[] {
  const adjacency = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  nodes.forEach(node => {
    adjacency.set(node.id, []);
    inDegree.set(node.id, 0);
  });

  edges.forEach(edge => {
    const sources = adjacency.get(edge.source) || [];
    sources.push(edge.target);
    adjacency.set(edge.source, sources);
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  });

  const queue: string[] = [];
  const result: string[] = [];

  inDegree.forEach((degree, nodeId) => {
    if (degree === 0) queue.push(nodeId);
  });

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    result.push(nodeId);

    adjacency.get(nodeId)?.forEach(nextNodeId => {
      const newDegree = (inDegree.get(nextNodeId) || 0) - 1;
      inDegree.set(nextNodeId, newDegree);
      if (newDegree === 0) {
        queue.push(nextNodeId);
      }
    });
  }

  if (result.length !== nodes.length) {
    toast.error(t('flow.error.circularDependency', useSettingsStore.getState().language));
  }

  return result;
}

/**
 * 按执行层级分组 - 同层节点可并行执行
 */
export function groupByExecutionLevel(
  _nodes: FlowNode[],
  edges: Edge[],
  sortedIds: string[]
): { level: number; nodes: string[] }[] {
  const nodeLevel = new Map<string, number>();

  sortedIds.forEach(nodeId => {
    const nodeEdges = edges.filter(e => e.target === nodeId);

    if (nodeEdges.length === 0) {
      nodeLevel.set(nodeId, 0);
    } else {
      const maxLevel = Math.max(...nodeEdges.map(e => nodeLevel.get(e.source) || 0));
      nodeLevel.set(nodeId, maxLevel + 1);
    }
  });

  const levelMap = new Map<number, string[]>();
  nodeLevel.forEach((level, nodeId) => {
    if (!levelMap.has(level)) levelMap.set(level, []);
    levelMap.get(level)!.push(nodeId);
  });

  return Array.from(levelMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([level, nodeIds]) => ({ level, nodes: nodeIds }));
}

// ============================================
// API 执行
// ============================================

interface HttpResponse {
  status: number;
  body: unknown;
  headers: Record<string, string>;
}

/**
 * 发送真实 HTTP 请求
 */
export async function executeApiRequest(
  nodeData: Record<string, unknown>,
  context: ExecutionContext
): Promise<{
  response: unknown;
  statusCode: number;
  headers: Record<string, string>;
  executionTime: number;
  error?: string;
}> {
  const startTime = Date.now();

  try {
    // Support both flat fields and nested apiConfig structure
    // apiConfig format: { headers: KeyValue[], params: KeyValue[], body: { reqBody: string }, auth: FlowAuthConfig }
    const apiConfig = nodeData.apiConfig as Record<string, unknown> | undefined;

    // Extract url and method - prefer top-level, fallback to apiConfig
    const url = substituteVariables(String(nodeData.url || apiConfig?.url || ""), context);
    const method = String(nodeData.method || apiConfig?.method || "GET");

    // Extract headers - prefer apiConfig KeyValue[] (has enabled info) over flat Record
    const headers: Record<string, string> = {};
    if (apiConfig?.headers && Array.isArray(apiConfig.headers)) {
      // KeyValue[] format from apiConfig - preferred
      for (const item of apiConfig.headers as { key: string; value: string; enabled?: boolean }[]) {
        if (item.enabled !== false && item.key) {
          headers[item.key] = substituteVariables(item.value || "", context);
        }
      }
    } else if (nodeData.headers && typeof nodeData.headers === "object" && !Array.isArray(nodeData.headers)) {
      // Flat record format as fallback
      for (const [key, value] of Object.entries(nodeData.headers as Record<string, string>)) {
        if (value) {
          headers[key] = substituteVariables(value, context);
        }
      }
    }

    // Extract auth and apply authorization headers
    const authConfig = nodeData.auth || apiConfig?.auth;
    if (authConfig) {
      const authHeaders = handleAuth(authConfig as Record<string, unknown>, context);
      Object.assign(headers, authHeaders);
    }

    // Extract query params - prefer apiConfig KeyValue[] over flat Record
    const queryParams = new URLSearchParams();
    if (apiConfig?.params && Array.isArray(apiConfig.params)) {
      // KeyValue[] format from apiConfig - preferred
      for (const item of apiConfig.params as { key: string; value: string; enabled?: boolean }[]) {
        if (item.enabled !== false && item.key) {
          queryParams.append(item.key, substituteVariables(item.value || "", context));
        }
      }
    } else if (nodeData.params && typeof nodeData.params === "object" && !Array.isArray(nodeData.params)) {
      // Flat record format as fallback
      for (const [key, value] of Object.entries(nodeData.params as Record<string, string>)) {
        if (value) {
          queryParams.append(key, substituteVariables(value, context));
        }
      }
    }

    // Extract query params as separate record for execute_request
    const queryParamsRecord: Record<string, string> = {};
    queryParams.forEach((value, key) => {
      queryParamsRecord[key] = value;
    });

    // Extract body - could be string or from apiConfig.body.reqBody
    let body: string | undefined;
    const bodyData = nodeData.body || (apiConfig?.body as Record<string, unknown>)?.reqBody;
    if (bodyData && !["GET", "HEAD"].includes(method)) {
      if (typeof bodyData === "string") {
        body = substituteVariables(bodyData, context);
      } else {
        body = JSON.stringify(bodyData);
        headers["Content-Type"] = headers["Content-Type"] || "application/json";
      }
    }

    const response = await sendHttpRequest({
      method,
      url, // Pass base URL without query params
      headers,
      body,
      queryParams: queryParamsRecord,
    });

    return {
      response: response.body,
      statusCode: response.status,
      headers: response.headers,
      executionTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      response: null,
      statusCode: 0,
      headers: {},
      executionTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : "Request failed",
    };
  }
}

/**
 * 处理认证
 * 支持两种格式:
 * 1. 执行引擎格式: type, token, username, password, key, value
 * 2. FlowAuthConfig格式: authType, bearerToken, basicUsername, basicPassword, apiKeyName, apiKeyValue
 */
function handleAuth(
  auth: Record<string, unknown>,
  context: ExecutionContext
): Record<string, string> {
  const headers: Record<string, string> = {};

  // Support both "type" (execution engine) and "authType" (FlowAuthConfig)
  const authType = String(auth.type || auth.authType || "none");

  if (authType === "none") return headers;

  switch (authType) {
    case "bearer": {
      // Support both "token" (execution engine) and "bearerToken" (FlowAuthConfig)
      const token = substituteVariables(String(auth.token || auth.bearerToken || ""), context);
      const prefix = auth.bearerPrefix ? substituteVariables(String(auth.bearerPrefix), context) : "Bearer";
      headers["Authorization"] = `${prefix} ${token}`;
      break;
    }
    case "basic": {
      // Support both field names
      const username = substituteVariables(String(auth.username || auth.basicUsername || ""), context);
      const password = substituteVariables(String(auth.password || auth.basicPassword || ""), context);
      headers["Authorization"] = `Basic ${btoa(`${username}:${password}`)}`;
      break;
    }
    case "apiKey": {
      // Support both field names
      const key = substituteVariables(String(auth.key || auth.apiKeyName || ""), context);
      const value = substituteVariables(String(auth.value || auth.apiKeyValue || ""), context);
      if (auth.location === "header" || auth.apiKeyLocation === "header") {
        headers[key] = value;
      }
      break;
    }
    case "oauth2": {
      // OAuth uses bearer token format - get accessToken
      const token = substituteVariables(String(auth.accessToken || ""), context);
      if (token) {
        const tokenType = auth.tokenType || "Bearer";
        headers["Authorization"] = `${tokenType} ${token}`;
      }
      break;
    }
    case "aws": {
      // AWS Signature - requires special signing logic
      // For now, pass through the values for AWS signer to handle
      const accessKey = substituteVariables(String(auth.awsAccessKey || ""), context);
      const secretKey = substituteVariables(String(auth.awsSecretKey || ""), context);
      const sessionToken = substituteVariables(String(auth.awsSessionToken || ""), context);
      const region = substituteVariables(String(auth.awsRegion || ""), context);
      const service = substituteVariables(String(auth.awsService || ""), context);
      // Store in context for AWS signer (would need additional implementation)
      if (accessKey && secretKey) {
        headers["X-AWS-AccessKey"] = accessKey;
        headers["X-AWS-SecretKey"] = secretKey;
        if (sessionToken) headers["X-AWS-SessionToken"] = sessionToken;
        if (region) headers["X-AWS-Region"] = region;
        if (service) headers["X-AWS-Service"] = service;
      }
      break;
    }
    default:
      break;
  }

  return headers;
}

/**
 * 发送 HTTP 请求 - 使用后端 execute_request
 */
async function sendHttpRequest(config: {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
  queryParams?: Record<string, string>;
}): Promise<HttpResponse> {
  try {
    const requestConfig: ExecuteRequestConfig = {
      method: config.method,
      url: config.url,
      headers: config.headers,
      body: config.body,
      queryParams: config.queryParams || {},
      sslVerify: true,
      timeout: 30000, // 30s timeout
    };

    const response = await executeRequest(requestConfig);

    return {
      status: response.status || 200,
      body: tryParseJson(response.body),
      headers: response.headers || {},
    };
  } catch (error) {
    throw new Error(`Request failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

function tryParseJson(str: string): unknown {
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}

// ============================================
// 执行引擎
// ============================================

function addLog(
  context: ExecutionContext,
  nodeId: string,
  nodeName: string,
  level: ExecutionLog["level"],
  message: string
): void {
  context.logs.push({
    timestamp: Date.now(),
    nodeId,
    nodeName,
    level,
    message,
  });
}

/**
 * 执行单个节点
 */
export async function executeNode(
  node: FlowNode,
  context: ExecutionContext,
  inputs: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const { type, data, id } = node;

  addLog(context, id, String(data.label || type), "info", "Starting execution");

  try {
    switch (type) {
      case "apiCall":
        return await executeApiNode(node, context);
      case "delay":
        return await executeDelayNode(node, context);
      case "condition":
        return await executeConditionNode(node, context, inputs);
      case "loop":
        return await executeLoopNode(node, context);
      case "transform":
        return await executeTransformNode(node, context, inputs);
      case "assert":
        return await executeAssertNode(node, context, inputs);
      case "log":
        return await executeLogNode(node, context);
      case "script":
        return await executeScriptNode(node, context, inputs);
      default:
        return { ...inputs };
    }
  } catch (error) {
    addLog(
      context,
      id,
      String(data.label || type),
      "error",
      `Error: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    throw error;
  }
}

/**
 * API Call 节点执行
 */
async function executeApiNode(
  node: FlowNode,
  context: ExecutionContext
): Promise<Record<string, unknown>> {
  const nodeRetry = node.data.retry as RetryConfig | undefined;
  const nodeName = String(node.data.label || "API Request");

  let apiResult: {
    response: unknown;
    statusCode: number;
    headers: Record<string, string>;
    executionTime: number;
    error?: string;
  };

  if (nodeRetry?.enabled && nodeRetry.maxAttempts > 1) {
    const executeRequest = async () => {
      return await executeApiRequest(node.data, context);
    };
    apiResult = await executeWithRetry(executeRequest, nodeRetry, context, node.id, nodeName);
  } else {
    apiResult = await executeApiRequest(node.data, context);
  }

  if (apiResult.error) {
    addLog(context, node.id, nodeName, "error", apiResult.error);
  } else {
    addLog(
      context,
      node.id,
      nodeName,
      "success",
      `Response: ${apiResult.statusCode} (${apiResult.executionTime}ms)`
    );
  }

  return {
    response: apiResult.response,
    statusCode: apiResult.statusCode,
    headers: apiResult.headers,
    executionTime: apiResult.executionTime,
    error: apiResult.error,
  };
}

/**
 * Delay 节点执行
 */
async function executeDelayNode(
  node: FlowNode,
  context: ExecutionContext
): Promise<Record<string, unknown>> {
  const duration = Number(node.data.duration || 1000);

  addLog(context, node.id, String(node.data.label), "info", `Delaying ${duration}ms...`);

  await new Promise(resolve => setTimeout(resolve, duration));

  return { completed: true, duration };
}

/**
 * Condition 节点执行
 */
async function executeConditionNode(
  node: FlowNode,
  context: ExecutionContext,
  inputs: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const expression = String(node.data.expression || "");
  const result = evaluateExpression(expression, inputs);

  addLog(context, node.id, String(node.data.label), "info", `Condition "${expression}" = ${result}`);

  return { result, true: result, false: !result };
}

/**
 * Loop 节点执行
 */
async function executeLoopNode(
  node: FlowNode,
  context: ExecutionContext
): Promise<Record<string, unknown>> {
  const iterations = Number(node.data.iterations || 1);
  const results: Record<string, unknown>[] = [];

  for (let i = 0; i < iterations; i++) {
    addLog(context, node.id, String(node.data.label), "info", `Iteration ${i + 1}/${iterations}`);
    results.push({ iteration: i + 1 });
    context.variables.set("tmp.loopIndex", { name: "loopIndex", value: i, scope: "tmp" });
  }

  return { iterations, results, completed: true };
}

/**
 * Transform 节点执行
 */
async function executeTransformNode(
  node: FlowNode,
  context: ExecutionContext,
  inputs: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const inputMapping = String(node.data.inputMapping || "");
  const transformation = String(node.data.transformation || "");

  let inputData = inputs;
  if (inputMapping) {
    const varRef = parseVariableReference(inputMapping);
    if (varRef) {
      inputData = (resolveVariable(inputMapping, context) as Record<string, unknown>) || inputs;
    }
  }

  let outputData: unknown = inputData;
  if (transformation) {
    try {
      if (transformation.startsWith("$.")) {
        outputData = jsonPath(inputData, transformation);
      } else {
        outputData = substituteVariables(transformation, context);
      }
    } catch (error) {
      addLog(
        context,
        node.id,
        String(node.data.label),
        "error",
        `Transform error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  return { output: outputData, original: inputData };
}

/**
 * Assert 节点执行
 */
async function executeAssertNode(
  node: FlowNode,
  context: ExecutionContext,
  inputs: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const assertions = (node.data.assertions || []) as AssertionType[];
  const results: { assertion: AssertionType; passed: boolean }[] = [];
  let allPassed = true;

  for (const assertion of assertions) {
    const passed = evaluateAssertion(assertion, inputs);
    results.push({ assertion, passed });
    if (!passed) allPassed = false;
  }

  const passedCount = results.filter(r => r.passed).length;
  addLog(
    context,
    node.id,
    String(node.data.label),
    allPassed ? "success" : "error",
    allPassed ? `All assertions passed (${results.length})` : `${results.length - passedCount} failed`
  );

  return { passed: allPassed, results };
}

interface AssertionType {
  type: "statusCode" | "responseTime" | "responseSize" | "jsonPath" | "regex" | "schema";
  expected?: unknown;
  path?: string;
  max?: number;
  pattern?: string;
  schema?: unknown;
}

/**
 * Log 节点执行
 */
async function executeLogNode(
  node: FlowNode,
  context: ExecutionContext
): Promise<Record<string, unknown>> {
  const message = substituteVariables(String(node.data.message || ""), context);
  addLog(context, node.id, String(node.data.label), "info", message);
  return { logged: true, message };
}

/**
 * Script 节点执行
 */
async function executeScriptNode(
  node: FlowNode,
  context: ExecutionContext,
  inputs: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const script = String(node.data.script || "");
  const nodeName = String(node.data.label || "Script");

  addLog(context, node.id, nodeName, "info", "Executing script...");

  try {
    // 创建一个安全的执行上下文
    const sandbox = {
      inputs,
      output: {} as Record<string, unknown>,
      console: {
        log: (...args: unknown[]) => {
          addLog(context, node.id, nodeName, "info", args.map(a => String(a)).join(" "));
        },
        error: (...args: unknown[]) => {
          addLog(context, node.id, nodeName, "error", args.map(a => String(a)).join(" "));
        },
        warn: (...args: unknown[]) => {
          addLog(context, node.id, nodeName, "warning", args.map(a => String(a)).join(" "));
        },
      },
      setOutput: (key: string, value: unknown) => {
        sandbox.output[key] = value;
      },
      // 工具函数
      Date,
      Math,
      JSON,
      parseInt,
      parseFloat,
      String,
      Number,
      Boolean,
      Array,
      Object,
    };

    // 执行脚本
    const fn = new Function(
      "inputs",
      "output",
      "console",
      "setOutput",
      "Date",
      "Math",
      "JSON",
      "parseInt",
      "parseFloat",
      "String",
      "Number",
      "Boolean",
      "Array",
      "Object",
      script
    );

    fn(
      sandbox.inputs,
      sandbox.output,
      sandbox.console,
      sandbox.setOutput,
      sandbox.Date,
      sandbox.Math,
      sandbox.JSON,
      sandbox.parseInt,
      sandbox.parseFloat,
      sandbox.String,
      sandbox.Number,
      sandbox.Boolean,
      sandbox.Array,
      sandbox.Object
    );

    addLog(context, node.id, nodeName, "success", "Script executed successfully");

    return {
      success: true,
      output: sandbox.output,
      inputs,
    };
  } catch (error) {
    addLog(context, node.id, nodeName, "error", `Script error: ${error instanceof Error ? error.message : "Unknown error"}`);
    throw error;
  }
}

// ============================================
// 表达式求值
// ============================================

export function evaluateExpression(expression: string, context: Record<string, unknown>): boolean {
  const operators = ["==", "!=", ">", "<", ">=", "<=", "contains", "matches"];

  for (const op of operators) {
    const parts = expression.split(op);
    if (parts.length === 2) {
      const [left, right] = parts.map(p => p.trim());
      const leftVal = resolvePath(left, context);
      const rightVal = resolvePath(right, context);

      switch (op) {
        case "==": return leftVal == rightVal;
        case "!=": return leftVal != rightVal;
        case ">": return Number(leftVal) > Number(rightVal);
        case "<": return Number(leftVal) < Number(rightVal);
        case ">=": return Number(leftVal) >= Number(rightVal);
        case "<=": return Number(leftVal) <= Number(rightVal);
        case "contains": return String(leftVal).includes(String(rightVal));
        case "matches": return new RegExp(String(rightVal)).test(String(leftVal));
      }
    }
  }

  return Boolean(context[expression]);
}

function resolvePath(path: string, context: Record<string, unknown>): unknown {
  if (path.startsWith("{{") && path.endsWith("}}")) {
    const inner = path.slice(2, -2);
    return inner.split(".").reduce<unknown>((obj, key) => (obj as Record<string, unknown>)?.[key], context);
  }
  return context[path];
}

function evaluateAssertion(assertion: AssertionType, context: Record<string, unknown>): boolean {
  switch (assertion.type) {
    case "statusCode":
      return context.statusCode === assertion.expected;
    case "responseTime":
      return Number(context.executionTime) <= Number(assertion.max);
    case "responseSize":
      return Number(context.responseSize) <= Number(assertion.max);
    case "jsonPath":
      return jsonPath(context.response, assertion.path || "") === assertion.expected;
    case "regex":
      return new RegExp(String(assertion.pattern)).test(String(context.response));
    default:
      return true;
  }
}

function jsonPath(obj: unknown, path: string): unknown {
  if (!path.startsWith("$")) return obj;

  const pathPart = path.slice(1); // Remove leading $

  // Handle root operator
  if (pathPart.startsWith(".")) {
    // Object property access: $.data.users
    const segments = pathPart.slice(1).split(".");
    return navigatePath(obj, segments);
  } else if (pathPart.startsWith("[")) {
    // Array or filter access: $[0] or $[?(@.x > 1)]
    return navigatePath(obj, [pathPart]);
  }

  return obj;
}

function navigatePath(obj: unknown, segments: string[]): unknown {
  let result: unknown = obj;

  for (const segment of segments) {
    if (result === null || result === undefined) return undefined;

    // Handle wildcard [*]
    if (segment === "*" || segment === "[*]") {
      result = Array.isArray(result) ? result : Object.values(result as Record<string, unknown>);
      continue;
    }

    // Handle array index [n]
    const indexMatch = segment.match(/^\[(\d+)\]$/);
    if (indexMatch) {
      result = (result as unknown[])[parseInt(indexMatch[1])];
      continue;
    }

    // Handle array slice [start:end] or [:end] or [start:]
    const sliceMatch = segment.match(/^\[(\d*):(\d*)\]$/);
    if (sliceMatch) {
      const start = sliceMatch[1] ? parseInt(sliceMatch[1]) : 0;
      const end = sliceMatch[2] ? parseInt(sliceMatch[2]) : (result as unknown[]).length;
      result = (result as unknown[]).slice(start, end);
      continue;
    }

    // Handle filter expression $[?(@.field op value)]
    const filterMatch = segment.match(/^\[\?\(@\.(\w+)([<>=!]+)(.+)\]\$/);
    if (filterMatch) {
      const [, field, operator, valueStr] = filterMatch;
      const filterValue = parseFilterValue(valueStr);
      result = (result as unknown[]).filter(item => {
        const fieldValue = (item as Record<string, unknown>)[field];
        return compareValues(fieldValue, operator, filterValue);
      });
      continue;
    }

    // Handle object property access (removing leading . if present)
    const propName = segment.startsWith(".") ? segment.slice(1) : segment;
    if (propName) {
      result = (result as Record<string, unknown>)?.[propName];
    }
  }

  return result;
}

function parseFilterValue(valueStr: string): unknown {
  const trimmed = valueStr.trim();
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1);
  }
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1);
  }
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "null") return null;
  if (!isNaN(Number(trimmed))) return Number(trimmed);
  return trimmed;
}

function compareValues(actual: unknown, operator: string, expected: unknown): boolean {
  switch (operator) {
    case "==":
    case "===": return actual == expected;
    case "!=":
    case "!==": return actual != expected;
    case ">": return Number(actual) > Number(expected);
    case "<": return Number(actual) < Number(expected);
    case ">=": return Number(actual) >= Number(expected);
    case "<=": return Number(actual) <= Number(expected);
    case "contains": return String(actual).includes(String(expected));
    default: return actual == expected;
  }
}

// ============================================
// 主执行流程
// ============================================

export interface ExecuteWorkflowOptions {
  errorHandling?: ErrorHandlingMode;
  onProgress?: (nodeId: string, status: NodeStatus) => void;
  onLog?: (log: ExecutionLog) => void;
  retry?: RetryConfig;
  globalVariables?: GlobalVariable[];
  envVariables?: EnvVariable[];
  workflowVariables?: Record<string, string>;
  maxConcurrency?: number;  // Max parallel nodes (default: unlimited)
}

export interface NodeTiming {
  nodeId: string;
  nodeName: string;
  startTime: number;
  endTime: number;
  duration: number;
  status: NodeStatus;
}

export interface WorkflowExecutionResult {
  success: boolean;
  results: Map<string, Record<string, unknown>>;
  logs: ExecutionLog[];
  timings: NodeTiming[];
}

interface RetryConfig {
  enabled?: boolean;
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryOn: number[];
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  retryOn: [429, 500, 502, 503, 504],
};

/**
 * 执行带重试的API请求
 */
async function executeWithRetry(
  executeFn: () => Promise<{
    response: unknown;
    statusCode: number;
    headers: Record<string, string>;
    executionTime: number;
    error?: string;
  }>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  context: ExecutionContext,
  nodeId: string,
  nodeName: string
): Promise<{
  response: unknown;
  statusCode: number;
  headers: Record<string, string>;
  executionTime: number;
  error?: string;
}> {
  let lastResult: {
    response: unknown;
    statusCode: number;
    headers: Record<string, string>;
    executionTime: number;
    error?: string;
  } | null = null;
  let delay = config.initialDelay;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    const result = await executeFn();
    lastResult = result;

    // 如果成功或不需要重试的错误码，直接返回
    if (isSuccess(result.statusCode)) {
      if (attempt > 1) {
        addLog(context, nodeId, nodeName, "success", `Retry succeeded after ${attempt} attempts`);
      }
      return result;
    }

    // 检查是否应该重试
    if (config.retryOn.includes(result.statusCode) && attempt < config.maxAttempts) {
      addLog(context, nodeId, nodeName, "warning", `Attempt ${attempt} failed with ${result.statusCode}, retrying in ${delay}ms...`);

      await new Promise(resolve => setTimeout(resolve, delay));

      // 指数退避
      delay = Math.min(delay * config.backoffMultiplier, config.maxDelay);
      continue;
    }

    // 不需要重试的错误码或已达到最大重试次数
    return result;
  }

  return lastResult || { response: null, statusCode: 0, headers: {}, executionTime: 0, error: "Max retry attempts reached" };
}

export async function executeWorkflow(
  nodes: FlowNode[],
  edges: Edge[],
  options: ExecuteWorkflowOptions = {}
): Promise<WorkflowExecutionResult> {
  const { errorHandling = "fail-fast", onProgress, globalVariables = [], envVariables = [], workflowVariables = {}, maxConcurrency } = options;

  const context = createExecutionContext(nodes, edges, errorHandling, globalVariables, envVariables, workflowVariables);
  context.executionOrder = topologicalSort(nodes, edges);
  const levels = groupByExecutionLevel(nodes, edges, context.executionOrder);

  context.status = "running";
  const results = new Map<string, Record<string, unknown>>();
  const timings: NodeTiming[] = [];
  let workflowHasError = false;

  for (const level of levels) {
    // 并行执行同层节点，可通过 maxConcurrency 限制并发数
    const levelTasks = level.nodes.map((nodeId) => async () => {
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return null;

      const startTime = Date.now();
      onProgress?.(nodeId, "running");

      try {
        const inputs = getNodeInputs(nodeId, edges, results);
        const outputs = await executeNode(node, context, inputs);
        const endTime = Date.now();

        results.set(nodeId, outputs);
        context.nodeOutputs.set(nodeId, outputs);

        timings.push({
          nodeId,
          nodeName: String(node.data.label || node.type),
          startTime,
          endTime,
          duration: endTime - startTime,
          status: "success",
        });

        onProgress?.(nodeId, "success");
        return { nodeId, success: true, outputs };
      } catch (error) {
        const endTime = Date.now();

        timings.push({
          nodeId,
          nodeName: String(node.data.label || node.type),
          startTime,
          endTime,
          duration: endTime - startTime,
          status: "error",
        });

        onProgress?.(nodeId, "error");

        if (errorHandling === "fail-fast") {
          workflowHasError = true;
        }
        return { nodeId, success: false, error };
      }
    });

    // 使用 semaphore 控制并发数
    if (maxConcurrency && maxConcurrency > 0) {
      await executeWithConcurrency(levelTasks, maxConcurrency);
    } else {
      await Promise.all(levelTasks.map(t => t()));
    }

    if (errorHandling === "fail-fast" && workflowHasError) {
      break;
    }
  }

  context.status = workflowHasError ? "error" : "completed";

  return {
    success: context.status === "completed",
    results,
    logs: context.logs,
    timings,
  };
}

function getNodeInputs(
  nodeId: string,
  edges: Edge[],
  results: Map<string, Record<string, unknown>>
): Record<string, unknown> {
  const inputs: Record<string, unknown> = {};

  edges
    .filter(e => e.target === nodeId)
    .forEach(edge => {
      const sourceOutputs = results.get(edge.source) || {};
      const handleId = (edge as Record<string, unknown>).targetHandle as string || "response";

      if (handleId && sourceOutputs[handleId]) {
        inputs[handleId] = sourceOutputs[handleId];
      } else {
        Object.assign(inputs, sourceOutputs);
      }
    });

  return inputs;
}
