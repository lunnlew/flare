import { z } from 'zod';

// ============================================================
// 基础枚举
// ============================================================

// HTTP方法 (扩展支持WebSocket)
export const HttpMethod = z.enum([
  'GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS',
  'SUBSCRIBE', 'PUBLISH'
]);
export type HttpMethod = z.infer<typeof HttpMethod>;

// 认证类型
export const AuthType = z.enum([
  'none', 'bearer', 'basic', 'apiKey', 'oauth2', 'oauth1', 'awsSig', 'hawk', 'ntlm', 'mutualTLS'
]);
export type AuthType = z.infer<typeof AuthType>;

// 参数位置 (JSON Schema兼容)
export const ParamLocation = z.enum(['path', 'query', 'header', 'cookie', 'body']);
export type ParamLocation = z.infer<typeof ParamLocation>;

// OAuth 2.0 流程类型
export const OAuth2FlowType = z.enum([
  'authorizationCode', 'clientCredentials', 'implicit', 'password'
]);
export type OAuth2FlowType = z.infer<typeof OAuth2FlowType>;

// ============================================================
// JSON Schema Core (Draft 2020-12)
// ============================================================

// JSON Schema 基本类型
export const JsonSchemaType = z.enum([
  'string', 'number', 'integer', 'boolean', 'array', 'object', 'null'
]);

// JSON Schema Value (递归结构)
export const JsonSchemaValue: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(JsonSchemaValue),
    z.record(JsonSchemaValue),
  ])
);

// JSON Schema Object (用于schema字段)
export const JsonSchemaObject = z.record(z.any());

// ============================================================
// 参数定义 (Parameter)
// ============================================================

export const ParameterSchema = z.object({
  // 必需字段
  name: z.string(),
  location: ParamLocation,

  // 可选字段
  required: z.boolean().default(false),
  description: z.string().optional(),
  deprecated: z.boolean().default(false),

  // JSON Schema兼容
  schema: JsonSchemaObject.optional(),
  example: z.any().optional(),
  examples: z.record(z.any()).optional(),
  default: z.any().optional(),

  // OpenAPI特定
  allowEmptyValue: z.boolean().default(false),
  style: z.string().optional(),
  explode: z.boolean().optional(),
  allowReserved: z.boolean().default(false),

  // 值约束 (JSON Schema Validation)
  enum: z.array(z.any()).optional(),
  const: z.any().optional(),
  minimum: z.number().optional(),
  maximum: z.number().optional(),
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  pattern: z.string().optional(),
  format: z.string().optional(),
});
export type ParameterSchema = z.infer<typeof ParameterSchema>;

// ============================================================
// 请求体 (Request Body)
// ============================================================

export const RequestBodySchema = z.object({
  description: z.string().optional(),
  required: z.boolean().default(false),

  // 内容类型
  contentType: z.string().optional(),

  // JSON Schema
  schema: JsonSchemaObject.optional(),
  example: z.any().optional(),
  examples: z.record(z.any()).optional(),

  // 编码 (OpenAPI)
  encoding: z.record(z.object({
    contentType: z.string().optional(),
    headers: z.record(ParameterSchema).optional(),
    style: z.string().optional(),
    explode: z.boolean().optional(),
  })).optional(),
});
export type RequestBodySchema = z.infer<typeof RequestBodySchema>;

// ============================================================
// 响应 (Response)
// ============================================================

export const ResponseSchema = z.object({
  // 必需字段
  statusCode: z.number(),
  description: z.string(),

  // 可选字段
  contentType: z.string().optional(),
  headers: z.array(ParameterSchema).optional(),

  // JSON Schema
  schema: JsonSchemaObject.optional(),
  example: z.any().optional(),
  examples: z.record(z.any()).optional(),

  // Links (OpenAPI)
  links: z.record(z.any()).optional(),
});
export type ResponseSchema = z.infer<typeof ResponseSchema>;

// ============================================================
// 认证配置 (Auth)
// ============================================================

// OAuth 2.0 Flow
export const OAuth2FlowSchema = z.object({
  type: OAuth2FlowType,
  authorizationUrl: z.string().optional(),
  tokenUrl: z.string().optional(),
  refreshUrl: z.string().optional(),
  scopes: z.record(z.string()).optional(),
  codeChallengeMethod: z.enum(['S256', 'plain']).optional(),
});
export type OAuth2FlowSchema = z.infer<typeof OAuth2FlowSchema>;

// OAuth 1.0
export const OAuth1Schema = z.object({
  consumerKey: z.string(),
  consumerSecret: z.string(),
  token: z.string().optional(),
  tokenSecret: z.string().optional(),
  signatureMethod: z.enum(['HMAC-SHA1', 'RSA-SHA1', 'PLAINTEXT']).optional(),
  nonce: z.string().optional(),
  timestamp: z.string().optional(),
});
export type OAuth1Schema = z.infer<typeof OAuth1Schema>;

// AWS Signature
export const AwsSigSchema = z.object({
  accessKeyId: z.string().optional(),
  secretAccessKey: z.string().optional(),
  sessionToken: z.string().optional(),
  region: z.string().optional(),
  service: z.string().optional(),
});
export type AwsSigSchema = z.infer<typeof AwsSigSchema>;

// API认证配置
export const AuthConfigSchema = z.object({
  type: AuthType,

  // Bearer Token
  bearerToken: z.string().optional(),
  bearerPrefix: z.string().default('Bearer'),

  // Basic Auth
  username: z.string().optional(),
  password: z.string().optional(),

  // API Key
  apiKeyName: z.string().optional(),
  apiKeyLocation: z.enum(['header', 'query', 'cookie']).default('header'),
  apiKeyValue: z.string().optional(),
  apiKeyPrefix: z.string().optional(),

  // OAuth 2.0
  oauth2: OAuth2FlowSchema.optional(),

  // OAuth 1.0
  oauth1: OAuth1Schema.optional(),

  // AWS Signature
  awsSig: AwsSigSchema.optional(),

  // Hawk Auth
  hawk: z.object({
    id: z.string(),
    key: z.string(),
    algorithm: z.enum(['sha256', 'sha1']).optional(),
  }).optional(),

  // 自定义Header
  additionalHeaders: z.record(z.string()).optional(),
});
export type AuthConfig = z.infer<typeof AuthConfigSchema>;

// ============================================================
// 安全需求 (Security Requirement)
// ============================================================

export const SecurityRequirementSchema = z.object({
  name: z.string(),
  scopes: z.array(z.string()).optional(),
});
export type SecurityRequirement = z.infer<typeof SecurityRequirementSchema>;

// ============================================================
// 端点 (Endpoint)
// ============================================================

export const EndpointSchema = z.object({
  // 必需字段
  path: z.string(),
  method: HttpMethod,

  // 标识
  operationId: z.string().optional(),
  externalDocs: z.string().optional(),

  // 描述
  summary: z.string().optional(),
  description: z.string().optional(),
  deprecated: z.boolean().default(false),
  tags: z.array(z.string()).optional(),

  // 参数
  parameters: z.array(ParameterSchema).optional(),

  // 请求体
  requestBody: RequestBodySchema.optional(),
  requestBodyContentType: z.string().optional(),

  // 响应 (支持多状态码)
  responses: z.record(ResponseSchema).optional(),

  // 安全
  security: z.array(SecurityRequirementSchema).optional(),

  // 服务器覆盖
  servers: z.array(z.object({
    url: z.string(),
    description: z.string().optional(),
    variables: z.record(z.any()).optional(),
  })).optional(),

  // 回调 (OpenAPI)
  callbacks: z.record(z.any()).optional(),

  // 特定协议扩展
  // WebSocket
  websocket: z.object({
    protocol: z.string().optional(),
    messageType: z.enum(['text', 'binary', 'json']).optional(),
  }).optional(),

  // gRPC
  grpc: z.object({
    service: z.string(),
    package: z.string().optional(),
    protoFile: z.string().optional(),
  }).optional(),

  // 变更追踪
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  version: z.string().optional(),
});
export type EndpointSchema = z.infer<typeof EndpointSchema>;

// ============================================================
// API主格式 (API)
// ============================================================

// 服务器定义
export const ServerSchema = z.object({
  url: z.string(),
  description: z.string().optional(),
  variables: z.record(z.any()).optional(),
});

// 能力标签 (用于AI语义理解)
export const CapabilitySchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  examples: z.array(z.string()).optional(),
});
export type Capability = z.infer<typeof CapabilitySchema>;

// 来源信息
export const SourceInfoSchema = z.object({
  type: z.enum([
    'openapi', 'openapi-2', 'asyncapi', 'asyncapi-2',
    'graphql', 'postman', 'har', 'http', 'swaggerhub',
    'wsdl', 'protobuf', 'avro'
  ]),
  url: z.string().optional(),
  file: z.string().optional(),
  version: z.string().optional(),
  importedAt: z.string().optional(),
  lastUpdated: z.string().optional(),
});

// API主格式
export const APISchema = z.object({
  // 必需字段
  name: z.string(),
  version: z.string().default('1.0.0'),
  baseUrl: z.string(),

  // 可选字段
  description: z.string().optional(),
  termsOfService: z.string().optional(),

  // 多服务器
  servers: z.array(ServerSchema).optional(),
  tags: z.array(z.string()).optional(),

  // 端点
  endpoints: z.array(EndpointSchema),

  // 全局Auth
  auth: AuthConfigSchema.optional(),

  // 安全
  security: z.array(SecurityRequirementSchema).optional(),

  // AI语义
  capabilities: z.array(CapabilitySchema).optional(),

  // 元数据
  contact: z.object({
    name: z.string().optional(),
    email: z.string().optional(),
    url: z.string().optional(),
  }).optional(),
  license: z.object({
    name: z.string(),
    url: z.string().optional(),
  }).optional(),

  // 来源追踪
  source: SourceInfoSchema.optional(),

  // 自定义元数据
  metadata: z.record(z.any()).optional(),

  // 分类
  category: z.string().optional(),
  environment: z.enum(['development', 'staging', 'production', 'local']).optional(),

  // 变更追踪
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  lastSyncedAt: z.string().optional(),
});
export type API = z.infer<typeof APISchema>;

// Collections (API 分组)
export const CollectionSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  apis: z.array(z.string()),
  variables: z.record(z.any()).optional(),
});
export type Collection = z.infer<typeof CollectionSchema>;

// ============================================================
// Flow Canvas
// ============================================================

export const FlowNodeType = z.enum([
  'apiCall', 'auth', 'condition', 'loop', 'transform', 'assert', 'log', 'delay'
]);
export type FlowNodeType = z.infer<typeof FlowNodeType>;

// Flow Canvas 节点定义
export const FlowNodeSchema = z.object({
  id: z.string(),
  type: FlowNodeType,
  label: z.string().optional(),
  position: z.object({ x: z.number(), y: z.number() }),
  config: z.record(z.any()).optional(),

  // API关联
  apiName: z.string().optional(),
  endpointPath: z.string().optional(),
  method: HttpMethod.optional(),

  // 状态
  status: z.enum(['pending', 'running', 'success', 'error', 'skipped']).optional(),
});
export type FlowNode = z.infer<typeof FlowNodeSchema>;

// Flow Canvas 连线
export const FlowEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  type: z.enum(['data', 'control', 'assertion']).default('data'),
  label: z.string().optional(),
  animated: z.boolean().default(false),
});
export type FlowEdge = z.infer<typeof FlowEdgeSchema>;

// Flow Canvas 图
export const FlowGraphSchema = z.object({
  nodes: z.array(FlowNodeSchema),
  edges: z.array(FlowEdgeSchema),
  metadata: z.record(z.any()).optional(),
});
export type FlowGraph = z.infer<typeof FlowGraphSchema>;

// ============================================================
// 断言 (Assert)
// ============================================================

export const AssertType = z.enum(['status', 'body', 'header', 'time', 'jsonpath', 'cookie', 'size']);
export const AssertOperator = z.enum(['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'contains', 'notContains', 'startsWith', 'endsWith', 'matches', 'exists', 'notExists']);

export const AssertSchema = z.object({
  type: AssertType,
  expression: z.string(),
  operator: AssertOperator.optional(),
  expected: z.any().optional(),
  caseSensitive: z.boolean().default(false),
});
export type Assert = z.infer<typeof AssertSchema>;

export const AssertResultSchema = z.object({
  passed: z.boolean(),
  type: AssertType,
  message: z.string(),
  expression: z.string().optional(),
  actual: z.any().optional(),
  expected: z.any().optional(),
  time: z.number().optional(),
});
export type AssertResult = z.infer<typeof AssertResultSchema>;

// ============================================================
// Mock规则
// ============================================================

export const MockConditionOperator = z.enum(['eq', 'ne', 'contains', 'startsWith', 'endsWith', 'matches', 'exists', 'notExists', 'gt', 'lt']);

export const MockConditionSchema = z.object({
  field: z.string(),
  operator: MockConditionOperator,
  value: z.any().optional(),
});

export const MockResponseSchema = z.object({
  status: z.number().default(200),
  headers: z.record(z.string()).optional(),
  body: z.any(),
  bodyContentType: z.string().optional(),
  delay: z.number().default(0),
});

export const MockRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),

  // 匹配条件
  method: z.union([HttpMethod, z.literal('*')]).default('*'),
  path: z.string(),
  enabled: z.boolean().default(true),
  priority: z.number().default(0),

  condition: MockConditionSchema.optional(),

  response: MockResponseSchema,
});
export type MockRule = z.infer<typeof MockRuleSchema>;

export const MockConfigSchema = z.object({
  rules: z.array(MockRuleSchema),
  defaultResponse: MockResponseSchema,
  enabled: z.boolean().default(true),
  port: z.number().default(8080),
});
export type MockConfig = z.infer<typeof MockConfigSchema>;

// ============================================================
// 测试场景
// ============================================================

export const TestStepType = z.enum(['request', 'assert', 'delay', 'loop', 'condition', 'script']);

export const TestStepSchema = z.object({
  type: TestStepType,
  config: z.record(z.any()),
  name: z.string().optional(),
  enabled: z.boolean().default(true),
});

export const TestScenarioSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  steps: z.array(TestStepSchema),
  variables: z.record(z.string()).optional(),
  beforeScript: z.string().optional(),
  afterScript: z.string().optional(),
  tags: z.array(z.string()).optional(),
  timeout: z.number().default(30000),
});
export type TestScenario = z.infer<typeof TestScenarioSchema>;

export const TestReportSchema = z.object({
  id: z.string(),
  scenarioName: z.string(),
  timestamp: z.number(),
  duration: z.number(),
  passed: z.boolean(),
  steps: z.array(z.object({
    name: z.string().optional(),
    passed: z.boolean(),
    duration: z.number().optional(),
    error: z.string().optional(),
    assertResults: z.array(AssertResultSchema).optional(),
  })),
  variables: z.record(z.string()).optional(),
});
export type TestReport = z.infer<typeof TestReportSchema>;

// ============================================================
// 历史记录 (History)
// ============================================================

export const HistoryEntrySchema = z.object({
  id: z.string(),
  timestamp: z.number(),

  // 请求信息
  method: HttpMethod,
  url: z.string(),
  apiName: z.string().optional(),
  endpointPath: z.string().optional(),

  // 请求详情
  request: z.object({
    headers: z.record(z.string()),
    queryParams: z.record(z.string()).optional(),
    pathParams: z.record(z.string()).optional(),
    body: z.string().optional(),
    bodyContentType: z.string().optional(),
    auth: z.object({
      type: AuthType,
      details: z.record(z.string()).optional(),
    }).optional(),
  }),

  // 响应详情
  response: z.object({
    status: z.number(),
    statusText: z.string().optional(),
    headers: z.record(z.string()),
    body: z.string(),
    time: z.number(),
    size: z.number().optional(),
    compressedSize: z.number().optional(),
  }).optional(),

  // 断言结果
  assertResults: z.array(AssertResultSchema).optional(),

  // Mock
  mockMatched: z.string().optional(),
  mockRule: MockRuleSchema.optional(),

  // 错误
  error: z.string().optional(),

  // 关联数据
  collection: z.string().optional(),
  folder: z.string().optional(),
  tags: z.array(z.string()).optional(),
});
export type HistoryEntry = z.infer<typeof HistoryEntrySchema>;

// ============================================================
// 环境变量
// ============================================================

export const EnvironmentVariableSchema = z.object({
  key: z.string(),
  value: z.string(),
  enabled: z.boolean().default(true),
  description: z.string().optional(),
  sensitive: z.boolean().default(false),
});

export const EnvironmentSchema = z.object({
  name: z.string(),
  variables: z.record(z.string()),
  variableObjects: z.array(EnvironmentVariableSchema).optional(),
});
export type Environment = z.infer<typeof EnvironmentSchema>;

// ============================================================
// 验证函数
// ============================================================

export function validateAPI(data: unknown): API {
  return APISchema.parse(data);
}

export function validateEndpoint(data: unknown): EndpointSchema {
  return EndpointSchema.parse(data);
}

export function validateMockRule(data: unknown): MockRule {
  return MockRuleSchema.parse(data);
}

export function validateHistoryEntry(data: unknown): HistoryEntry {
  return HistoryEntrySchema.parse(data);
}

export function validateAuth(data: unknown): AuthConfig {
  return AuthConfigSchema.parse(data);
}

export function validateAssert(data: unknown): Assert {
  return AssertSchema.parse(data);
}

export function isValidHttpMethod(method: string): method is HttpMethod {
  return HttpMethod.safeParse(method).success;
}

export function parseContentType(contentType: string): { type: string; subtype: string; params: Record<string, string> } {
  const [type, ...rest] = contentType.split(';');
  const [main, sub] = type.split('/');
  const params: Record<string, string> = {};
  for (const param of rest) {
    const [key, value] = param.split('=').map(s => s.trim());
    params[key] = value;
  }
  return { type: main, subtype: sub, params };
}

// ============================================================
// 常量
// ============================================================

export const HTTP_STATUS_TEXTS: Record<number, string> = {
  100: 'Continue',
  101: 'Switching Protocols',
  200: 'OK',
  201: 'Created',
  202: 'Accepted',
  204: 'No Content',
  301: 'Moved Permanently',
  302: 'Found',
  304: 'Not Modified',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  409: 'Conflict',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
};

export const COMMON_CONTENT_TYPES = [
  'application/json',
  'application/xml',
  'application/x-www-form-urlencoded',
  'multipart/form-data',
  'text/plain',
  'text/html',
  'text/csv',
  'application/octet-stream',
  'application/graphql',
];