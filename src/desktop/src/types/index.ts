// IR Types for Desktop Application
// These types mirror the IR schema from src/ir/index.ts
// Note: IR types and Desktop types have diverged over time. Full unification requires:
// 1. Adding missing IR exports (Server, SourceInfo, OAuth2Flow, etc.)
// 2. Updating all Desktop components that use Desktop-specific fields (id, bodyType, body, auth on Endpoint)
// For now, this file maintains its own copy to avoid breaking existing code.

export type HttpMethod =
  | 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'
  | 'SUBSCRIBE' | 'PUBLISH';

export type AuthType =
  | 'none' | 'bearer' | 'basic' | 'apiKey' | 'oauth2' | 'oauth1'
  | 'awsSig' | 'hawk' | 'ntlm' | 'mutualTLS';

export type ParamLocation = 'path' | 'query' | 'header' | 'cookie' | 'body';

// Parameter schema
export interface Parameter {
  name: string;
  location: ParamLocation;
  required: boolean;
  description?: string;
  deprecated: boolean;
  schema?: Record<string, unknown>;
  example?: unknown;
  examples?: Record<string, unknown>;
  default?: unknown;
  // JSON Schema validation
  enum?: unknown[];
  const?: unknown;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  // Additional type info (for compatibility)
  type?: string;
}

// Request body schema
export interface RequestBody {
  description?: string;
  required: boolean;
  contentType?: string;
  schema?: Record<string, unknown>;
  example?: unknown;
  examples?: Record<string, unknown>;
}

// Response schema
export interface Response {
  statusCode: number;
  description: string;
  contentType?: string;
  headers?: Parameter[];
  schema?: Record<string, unknown>;
  example?: unknown;
  examples?: Record<string, unknown>;
}

// OAuth 2.0 flow
export interface OAuth2Flow {
  type: 'authorizationCode' | 'clientCredentials' | 'implicit' | 'password';
  authorizationUrl?: string;
  tokenUrl?: string;
  refreshUrl?: string;
  scopes?: Record<string, string>;
  codeChallengeMethod?: 'S256' | 'plain';
}

// OAuth 1.0
export interface OAuth1 {
  consumerKey: string;
  consumerSecret: string;
  token?: string;
  tokenSecret?: string;
  signatureMethod?: 'HMAC-SHA1' | 'RSA-SHA1' | 'PLAINTEXT';
  nonce?: string;
  timestamp?: string;
}

// AWS Signature
export interface AwsSig {
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
  region?: string;
  service?: string;
}

// Auth configuration
export interface AuthConfig {
  type: AuthType;
  bearerToken?: string;
  bearerPrefix?: string;
  username?: string;
  password?: string;
  apiKeyName?: string;
  apiKeyLocation?: 'header' | 'query' | 'cookie';
  apiKeyValue?: string;
  apiKeyPrefix?: string;
  oauth2?: OAuth2Flow;
  oauth1?: OAuth1;
  awsSig?: AwsSig;
  hawk?: {
    id: string;
    key: string;
    algorithm?: 'sha256' | 'sha1';
  };
  additionalHeaders?: Record<string, string>;
}

// Endpoint schema
export interface Endpoint {
  id?: string;  // Optional unique identifier (generated from path+method if not provided)
  path: string;
  method: HttpMethod;
  operationId?: string;
  externalDocs?: string;
  summary?: string;
  description?: string;
  deprecated?: boolean;
  tags?: string[];
  parameters?: Parameter[];
  requestBody?: RequestBody;
  requestBodyContentType?: string;
  responses?: Record<string, Response>;
  security?: Array<{ name: string; scopes?: string[] }>;
  servers?: Array<{
    url: string;
    description?: string;
    variables?: Record<string, unknown>;
  }>;
  // Protocol extensions
  websocket?: {
    protocol?: string;
    messageType?: 'text' | 'binary' | 'json';
  };
  grpc?: {
    service: string;
    package?: string;
    protoFile?: string;
  };
  // Request body fields (for API call node)
  bodyType?: string;
  body?: {
    rawContentType?: string;
    reqBody?: string;
    raw?: string;
    graphqlQuery?: string;
    graphqlVariables?: string;
  };
  // Auth config (for API call node)
  auth?: { authType: 'none' | 'bearer' | 'basic' | 'apiKey' | 'oauth2' | 'aws' };
  // Tracking
  createdAt?: string;
  updatedAt?: string;
  version?: string;
}

// Server definition
export interface Server {
  url: string;
  description?: string;
  variables?: Record<string, unknown>;
}

// Capability tag for AI semantic understanding
export interface Capability {
  name: string;
  description?: string;
  keywords?: string[];
  examples?: string[];
}

// Source information
export interface SourceInfo {
  type: 'openapi' | 'openapi-2' | 'asyncapi' | 'asyncapi-2'
       | 'graphql' | 'postman' | 'har' | 'http' | 'swaggerhub'
       | 'wsdl' | 'protobuf' | 'avro';
  url?: string;
  file?: string;
  version?: string;
  importedAt?: string;
  lastUpdated?: string;
}

// API main format
export interface API {
  name: string;
  version: string;
  baseUrl: string;
  description?: string;
  termsOfService?: string;
  servers?: Server[];
  tags?: string[];
  endpoints: Endpoint[];
  auth?: AuthConfig;
  security?: Array<{ name: string; scopes?: string[] }>;
  capabilities?: Capability[];
  contact?: {
    name?: string;
    email?: string;
    url?: string;
  };
  license?: {
    name: string;
    url?: string;
  };
  source?: SourceInfo;
  metadata?: Record<string, unknown>;
  category?: string;
  environment?: 'development' | 'staging' | 'production' | 'local';
  createdAt?: string;
  updatedAt?: string;
  lastSyncedAt?: string;
}

// Desktop-specific extension
export interface DesktopAPI extends API {
  isModified: boolean;
  lastSynced: string | null;
  gitStatus: 'clean' | 'modified' | 'untracked';
}

// Assert types
export type AssertType = 'status' | 'body' | 'header' | 'time' | 'jsonpath' | 'cookie' | 'size';
export type AssertOperator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'notContains'
                             | 'startsWith' | 'endsWith' | 'matches' | 'exists' | 'notExists';

export interface Assert {
  type: AssertType;
  expression: string;
  operator?: AssertOperator;
  expected?: unknown;
  caseSensitive: boolean;
}

export interface AssertResult {
  passed: boolean;
  type: AssertType;
  message: string;
  expression?: string;
  actual?: unknown;
  expected?: unknown;
  time?: number;
}

// History entry
export interface HistoryEntry {
  id: string;
  timestamp: number;
  method: HttpMethod;
  url: string;
  apiName?: string;
  endpointPath?: string;
  request: {
    headers: Record<string, string>;
    queryParams?: Record<string, string>;
    pathParams?: Record<string, string>;
    body?: string;
    bodyContentType?: string;
    auth?: {
      type: AuthType;
      details?: Record<string, string>;
    };
  };
  response?: {
    status: number;
    statusText?: string;
    headers: Record<string, string>;
    body: string;
    time: number;
    size?: number;
    compressedSize?: number;
  };
  assertResults?: AssertResult[];
  mockMatched?: string;
  error?: string;
  collection?: string;
  folder?: string;
  tags?: string[];
}

// Backend HistoryItem - from API responses
export interface HistoryItem {
  id: string;
  request_id: string;
  status: number;
  status_text: string;
  headers: Record<string, string>;
  body: string;
  size: number;
  time: number;
  created_at: string;
  // Endpoint identifier for filtering history by endpoint
  endpointId?: string;
}

// Environment
export interface EnvironmentVariable {
  key: string;
  value: string;
  enabled: boolean;
  description?: string;
  sensitive: boolean;
}

export interface Environment {
  name: string;
  variables: Record<string, string>;
  variableObjects?: EnvironmentVariable[];
}

// Simple EnvVariable alias for backwards compatibility
export interface EnvVariable {
  key: string;
  value: string;
  enabled?: boolean;
}

// Extended endpoint data for pre-filling the request builder from OpenAPI import
export interface EndpointData {
  path: string;
  method: HttpMethod;
  summary?: string;
  description?: string;
  parameters?: Array<{
    name: string;
    location?: 'path' | 'query' | 'header' | 'cookie' | 'body';
    in?: 'path' | 'query' | 'header' | 'cookie' | 'body';
    required?: boolean;
    description?: string;
    schema?: Record<string, unknown>;
    example?: unknown;
  }>;
  requestBody?: {
    description?: string;
    required?: boolean;
    contentType?: string;
    schema?: Record<string, unknown>;
    example?: unknown;
  };
  security?: Array<{ name: string; scopes?: string[] }>;
  responses?: Record<string, {
    statusCode: number;
    description: string;
    schema?: Record<string, unknown>;
    example?: unknown;
  }>;
  tags?: string[];
}

// Git types for desktop
export interface GitCommit {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  email: string;
  timestamp: number;
  files: string[];
}

export interface DiffLine {
  type: 'add' | 'remove' | 'context';
  content: string;
  oldLineNumber: number | null;
  newLineNumber: number | null;
}

export interface DiffHunk {
  lines: DiffLine[];
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
}

export interface DiffFile {
  path: string;
  hunks: DiffHunk[];
}

export interface DiffResult {
  files: DiffFile[];
  summary: { added: number; removed: number };
}

export interface RepoStatus {
  clean: boolean;
  staged: string[];
  unstaged: string[];
  untracked: string[];
  conflicting: string[];
}

export interface Branch {
  name: string;
  current: boolean;
  remote: boolean;
}

export interface Tag {
  name: string;
  message: string | null;
  hash: string;
}

// Desktop state
export interface DesktopState {
  apis: Map<string, DesktopAPI>;
  currentApi: string | null;
  currentEndpoint: string | null;
  environments: Environment[];
  activeEnvironment: string;
  gitStatus: RepoStatus | null;
}

// API info for list display
export interface ApiInfo {
  name: string;
  version: string;
  description?: string;
  baseUrl: string;
  endpointCount: number;
  tags?: string[];
  source?: SourceInfo;
}

// Request execution result
export interface RequestResult {
  success: boolean;
  status: number;
  headers: Record<string, string>;
  body: string;
  time?: number;
  error?: string;
}

// ============================================
// Desktop-specific types (from former types/api.ts)
// ============================================

export interface SelectedItem {
  api: string;
  path?: string;
  method?: string;
  baseUrl?: string;
}

export interface ListModeProps {
  onSendToRequestBuilder: (item: SelectedItem) => void;
}

export interface ResponseData {
  id: string;
  status: number;
  statusText: string;
  body: string;
  headers: Record<string, string>;
  time: number;
  error?: string;
  isFavorite?: boolean;
  // Endpoint identifier for filtering history by endpoint
  endpointId?: string;
  // Request ID for backend persistence (linked to saved request)
  requestId?: string;
  // Actual request that was sent (with substituted variables)
  request?: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: string;
    queryParams?: Record<string, string>;
  };
}

// SavedResponse for backend persistence (linked to request via request_id)
export interface SavedResponse {
  id: string;
  request_id: string;
  status: number;
  status_text: string;
  headers: Record<string, string>;
  body: string;
  size: number;
  time: number;
  created_at: string;
}

// Auth types
export type AuthLocation = "header" | "cookie" | "query" | "path";

export interface AuthItem {
  location: AuthLocation;
  key: string;
  value: string;
}

// Collection types
export interface RequestCollection {
  id: string;
  name: string;
  requests?: any[];
  endpoints?: any[];
  baseUrl?: string;
  description?: string;
  version?: string;
}

// Import config type
export interface ImportConfig {
  id: string;
  name: string;
  url: string;
  headers: Record<string, string>;
  auth_items: any[];
  sync_interval_minutes: number;
  last_sync: string | null;
  created_at: string;
}

// Chat message type
export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  action?: {
    type: "api_call" | "search" | "list" | "agent";
    data: any;
  };
}