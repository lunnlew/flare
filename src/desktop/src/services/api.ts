/**
 * API Service Layer
 *
 * Centralized backend API calls using Tauri's invoke.
 * All async operations with the backend should go through these functions.
 */

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { ResponseData, ImportConfig as ImportConfigType } from "../types/api";
import type { KeyValue } from "../constants/http";
import type { FlowData } from "../types/flow";

// Re-export for convenience
export type ImportConfig = ImportConfigType;

// ============================================================================
// Error Handling Wrapper
// ============================================================================

/**
 * Wrapper for invoke calls with consistent error handling.
 * Ensures all backend calls properly propagate errors.
 */
async function invokeApi<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(cmd, args);
  } catch (error) {
    console.error(`[API] ${cmd} failed:`, error);
    throw error;
  }
}

// ============================================================================
// Type Definitions
// ============================================================================

export interface EnvConfig {
  environments: { name: string; variables: Record<string, string> }[];
  selected: string;
}

export interface SaveRequestData {
  id: string;
  name: string;
  method: string;
  url: string;
  params: KeyValue[];
  headers: KeyValue[];
  body_type: string;
  req_body: string;
  urlencoded_body: KeyValue[];
  form_data: KeyValue[];
  graphql_variables: string;
  auth_type: string;
  auth_config: Record<string, string>;
  ssl_verify?: boolean;
  created_at: string;
  updated_at: string;
}

export interface SaveResponseData {
  id: string;
  request_id: string;
  status: number;
  status_text: string;
  headers: Record<string, string>;
  body: string;
  size: number;
  time: number;
  created_at: string;
  endpoint_id?: string;
}

// ============================================================================
// Environment API
// ============================================================================

export async function getEnvConfig(): Promise<EnvConfig> {
  return invokeApi<EnvConfig>("get_env_config_cmd");
}

export async function createEnv(envName: string): Promise<void> {
  return invokeApi("create_env_cmd", { envName });
}

export async function saveEnvConfig(config: EnvConfig): Promise<void> {
  return invokeApi("save_env_config_cmd", { config });
}

export async function switchEnv(envName: string): Promise<void> {
  return invokeApi("switch_env_cmd", { envName });
}

// ============================================================================
// Request/Response API
// ============================================================================

export async function saveRequest(request: SaveRequestData): Promise<void> {
  return invokeApi("save_request_cmd", { request });
}

export async function saveResponse(response: SaveResponseData): Promise<void> {
  return invokeApi("save_response_cmd", { response });
}

export async function saveResponseToFile(body: string, defaultName: string): Promise<void> {
  return invokeApi("save_response_to_file", { body, defaultName });
}

import type { HistoryItem } from '../types/index';
export type { HistoryItem };

export async function getResponses(requestId?: string, endpointId?: string): Promise<HistoryItem[]> {
  return invokeApi("get_responses_cmd", { requestId: requestId || null, endpointId: endpointId || null });
}

export async function deleteResponses(ids: string[]): Promise<void> {
  return invokeApi("delete_responses_cmd", { ids });
}

export async function clearResponses(): Promise<void> {
  return invokeApi("clear_responses_cmd");
}

export async function deleteRequest(id: string): Promise<void> {
  return invokeApi("delete_request_cmd", { id });
}

// ============================================================================
// Import Config API
// ============================================================================

export async function getImportConfigs(): Promise<ImportConfig[]> {
  return invokeApi("get_import_configs");
}

export async function saveImportConfig(config: Omit<ImportConfig, 'id' | 'created_at'> & { id?: string }): Promise<void> {
  return invokeApi("save_import_config", { config });
}

export async function deleteImportConfig(id: string): Promise<void> {
  return invokeApi("delete_import_config", { id });
}

export async function syncImportConfig(configId: string): Promise<string[]> {
  return invokeApi("sync_import_config", { configId });
}

// ============================================================================
// API/Collection Loading
// ============================================================================

export interface ApiInfo {
  name: string;
  path: string;
}

export interface ApiSpec {
  name: string;
  version: string;
  baseUrl?: string;
  description?: string;
  tags?: string[];
  // Internal format
  endpoints?: Array<{
    id?: string;
    path: string;
    method: string;
    summary?: string;
    description?: string;
    parameters?: unknown[];
    requestBody?: unknown;
    security?: unknown;
    responses?: unknown;
    tags?: string[];
  }>;
  // OpenAPI format
  paths?: Record<string, Record<string, {
    summary?: string;
    description?: string;
    parameters?: unknown[];
    requestBody?: unknown;
    security?: unknown;
    responses?: unknown;
    tags?: string[];
  }>>;
}

export async function getApis(): Promise<ApiInfo[]> {
  return invokeApi("get_apis");
}

export async function getApi(name: string): Promise<{ name: string; spec: ApiSpec }> {
  return invokeApi("get_api", { name });
}

export async function searchApis(query: string): Promise<string[]> {
  return invokeApi("search_apis", { query });
}

// ============================================================================
// Execution API
// ============================================================================

export interface ExecuteRequestConfig {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
  queryParams: Record<string, string>;
  signal?: boolean;
  sslVerify?: boolean;
  timeout?: number; // Request timeout in ms (0 = no timeout)
  // SSL Certificates (base64 encoded PEM content)
  clientCert?: string;
  clientKey?: string;
  caCert?: string;
  retry?: {
    maxRetries: number; // 0 = no retry (default)
    retryDelay: number; // Base delay in ms (default 1000)
    retryOn: number[]; // Status codes to retry on (default [0, 503, 504, 429, 408])
  };
}

export async function executeRequest(config: ExecuteRequestConfig): Promise<ResponseData> {
  return invokeApi<ResponseData>("execute_request", { ...config } as Record<string, unknown>);
}

// Read file and return base64 encoded content
export async function readFileBase64(path: string): Promise<string> {
  return invokeApi<string>("read_file_base64", { path });
}

// ============================================================================
// Agent/Chat API
// ============================================================================

export async function getAgentContext(selectedApi?: string, selectedEndpoint?: string): Promise<string> {
  return invokeApi<string>("get_agent_context", { selectedApi, selectedEndpoint });
}

export async function executeAgentCommand(prompt: string, context: string): Promise<string> {
  return invokeApi<string>("execute_agent_command", { prompt, context });
}

export interface AgentStreamChunk {
  chunk: string;
  is_final: boolean;
}

export async function executeAgentCommandStream(
  prompt: string,
  context: string,
  onChunk: (chunk: string) => void
): Promise<void> {
  const eventName = 'agent-stream-response';

  const unlisten = await listen<AgentStreamChunk>(eventName, (event) => {
    if (event.payload.is_final) {
      return;
    }
    onChunk(event.payload.chunk);
  });

  try {
    await invoke<void>("execute_agent_command_stream", { prompt, context });
  } finally {
    unlisten();
  }
}

export type { FlowData } from '../types/flow';

// ============================================================================
// Flow/Worfklow API
// ============================================================================

export async function getFlow(id: string): Promise<FlowData> {
  return invoke<FlowData>("get_flow_cmd", { id });
}

export async function saveFlow(flow: FlowData): Promise<FlowData> {
  return invoke<FlowData>("save_flow_cmd", { flow });
}

export async function deleteFlow(id: string): Promise<void> {
  return invokeApi("delete_flow_cmd", { id });
}

export async function listFlows(): Promise<Array<{ id: string; name: string; updated_at: string }>> {
  return invoke<Array<{ id: string; name: string; updated_at: string }>>("get_flows_cmd");
}

export async function exportAllData(): Promise<string> {
  return invoke<string>("export_all_data_cmd");
}

export async function exportBackup(defaultName: string): Promise<string> {
  try {
    return await invoke<string>("export_backup_cmd", { defaultName });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Backup export failed: ${msg}`);
  }
}

export async function exportFlow(flowJson: string, defaultName: string): Promise<string> {
  try {
    return await invoke<string>("export_flow_cmd", { flowJson, defaultName });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Flow export failed: ${msg}`);
  }
}

// ============================================================================
// Git API
// ============================================================================

export interface GitCommit {
  hash: string;
  short_hash: string;
  message: string;
  author: string;
  email: string;
  timestamp: number;
  files: string[];
}

export interface RepoStatus {
  clean: boolean;
  staged: string[];
  unstaged: string[];
  untracked: string[];
  conflicting: string[];
}

export interface DiffLine {
  type: string;
  content: string;
  old_line_number: number | null;
  new_line_number: number | null;
}

export interface DiffHunk {
  lines: DiffLine[];
  old_start: number;
  old_lines: number;
  new_start: number;
  new_lines: number;
}

export interface DiffFile {
  path: string;
  hunks: DiffHunk[];
}

export interface DiffResult {
  files: DiffFile[];
  summary: {
    added: number;
    removed: number;
  };
}

export interface Branch {
  name: string;
  current: boolean;
  remote: boolean;
}

export async function gitStatus(): Promise<RepoStatus> {
  return invoke<RepoStatus>("git_status");
}

export async function gitLog(apiName?: string, limit?: number): Promise<GitCommit[]> {
  return invoke<GitCommit[]>("git_log", { apiName, limit });
}

export async function gitDiff(apiName: string, commitA: string, commitB?: string): Promise<DiffResult> {
  return invoke<DiffResult>("git_diff", { apiName, commitA, commitB });
}

export async function gitStage(files: string[]): Promise<void> {
  return invokeApi("git_stage", { files });
}

export async function gitCommit(message: string): Promise<void> {
  return invokeApi("git_commit", { message });
}

export async function gitBranchList(): Promise<Branch[]> {
  return invokeApi<Branch[]>("git_branch_list");
}

export async function gitBranchCreate(branchName: string): Promise<void> {
  return invokeApi("git_branch_create", { branchName });
}

export async function gitCheckout(branch: string): Promise<void> {
  return invokeApi("git_checkout", { branch });
}

export async function gitReset(commitHash: string, mode: "hard" | "mixed" = "hard"): Promise<void> {
  return invokeApi("git_reset", { commitHash, mode });
}

export async function gitRevert(commitHash: string): Promise<void> {
  return invokeApi("git_revert", { commitHash });
}

export async function initGitRepo(): Promise<void> {
  return invokeApi("init_git_repo");
}

// ============================================================================
// Mock Server API
// ============================================================================

export interface MockTrigger {
  pathPattern?: string;
  method?: string[];
}

export interface MockResponse {
  statusCode: number;
  headers?: Record<string, string>;
  bodyTemplate: string;
  delayMs: number;
}

export interface MockRule {
  id: string;
  name: string;
  enabled: boolean;
  trigger: MockTrigger;
  response: MockResponse;
  /** Locale for response template processing (default: "en-US") */
  locale?: string;
}

export interface MockServerStatus {
  running: boolean;
  port: number;
  rulesCount: number;
  requestCount: number;
}

export async function getMockServerStatus(): Promise<MockServerStatus> {
  return invoke<MockServerStatus>("get_mock_server_status");
}

export async function startMockServer(port: number): Promise<MockServerStatus> {
  return invoke<MockServerStatus>("start_mock_server_cmd", { port });
}

export async function stopMockServer(): Promise<void> {
  return invokeApi("stop_mock_server_cmd");
}

export async function getMockRules(): Promise<MockRule[]> {
  return invokeApi<MockRule[]>("get_mock_rules");
}

export async function addMockRule(rule: MockRule): Promise<void> {
  return invokeApi("add_mock_rule", { rule });
}

export async function updateMockRule(rule: MockRule): Promise<void> {
  return invokeApi("update_mock_rule", { rule });
}

export async function deleteMockRule(id: string): Promise<void> {
  return invokeApi("delete_mock_rule", { id });
}

export async function clearMockRules(): Promise<void> {
  return invokeApi("clear_mock_rules");
}

export interface MockRequestLog {
  timestamp: string;
  method: string;
  path: string;
  matched_rule_id: string | null;
  response_status: number;
  response_time_ms: number;
}

export async function getMockRequestLogs(): Promise<MockRequestLog[]> {
  return invokeApi<MockRequestLog[]>("get_mock_request_logs");
}

export async function clearMockRequestLogs(): Promise<void> {
  return invokeApi("clear_mock_request_logs");
}

// Unified Mock Generation API (Backend as Single Source of Truth)

export async function generateMockValue(ruleType: string, locale?: string): Promise<string> {
  return invokeApi<string>("generate_mock_value", { ruleType, locale: locale || null });
}

export async function processMockTemplate(template: string, locale?: string): Promise<string> {
  return invoke<string>("process_mock_template", { template, locale: locale || null });
}

// Custom Rules API (Backend unified management)

export interface MockCustomRule {
  variable: string;
  target_type: string;
  enabled: boolean;
}

export async function getMockCustomRules(): Promise<MockCustomRule[]> {
  return invoke<MockCustomRule[]>("get_mock_custom_rules");
}

export async function addMockCustomRule(variable: string, targetType: string): Promise<MockCustomRule> {
  return invoke<MockCustomRule>("add_mock_custom_rule", { variable, targetType });
}

export async function updateMockCustomRule(variable: string, targetType: string): Promise<MockCustomRule> {
  return invoke<MockCustomRule>("update_mock_custom_rule", { variable, targetType });
}

export async function deleteMockCustomRule(variable: string): Promise<void> {
  return invokeApi("delete_mock_custom_rule", { variable });
}

export async function toggleMockCustomRule(variable: string, enabled: boolean): Promise<MockCustomRule> {
  return invoke<MockCustomRule>("toggle_mock_custom_rule", { variable, enabled });
}

// ============================================================================
// Log Query API
// ============================================================================

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  category: string;
  correlationId?: string;
  data?: Record<string, unknown>;
}

export interface LogQueryParams {
  level?: string;
  category?: string;
  correlationId?: string;
  startTime?: string;
  endTime?: string;
  limit?: number;
}

export async function queryLogs(params: LogQueryParams): Promise<LogEntry[]> {
  return invoke<LogEntry[]>("query_logs", {
    level: params.level || null,
    category: params.category || null,
    correlationId: params.correlationId || null,
    startTime: params.startTime || null,
    endTime: params.endTime || null,
    limit: params.limit || 1000,
  });
}

export async function getLogPath(): Promise<string> {
  return invoke<string>("get_log_path");
}