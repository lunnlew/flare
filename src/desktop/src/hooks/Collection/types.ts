/**
 * Types for import/export formats in useCollections
 * Replaces `any` types with proper interfaces
 */

// ============================================================================
// Postman v2.1 Format
// ============================================================================

export interface PostmanHeader {
  key: string;
  value: string;
  disabled?: boolean;
  enabled?: boolean;
}

export interface PostmanURL {
  raw: string;
  host?: string[];
  path?: string[];
}

export interface PostmanBody {
  mode?: 'raw' | 'graphql' | 'urlencoded' | 'formdata' | 'file';
  raw?: string;
  graphql?: {
    query?: string;
    variables?: string;
  };
  urlencoded?: PostmanHeader[];
  formdata?: PostmanHeader[];
}

export interface PostmanRequest {
  method?: string;
  url?: string | PostmanURL;
  header?: PostmanHeader[];
  body?: PostmanBody;
}

export interface PostmanItem {
  name: string;
  request?: PostmanRequest;
}

export interface PostmanCollection {
  info: {
    name: string;
    description?: string;
    schema: string;
  };
  item: PostmanItem[];
}

// ============================================================================
// OpenAPI Format
// ============================================================================

export interface OpenAPIOperation {
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: OpenAPIParameter[];
  requestBody?: OpenAPIRequestBody;
  responses?: Record<string, OpenAPIResponse>;
}

export interface OpenAPIParameter {
  name: string;
  in?: 'query' | 'header' | 'path' | 'cookie';
  required?: boolean;
  schema?: Record<string, unknown>;
}

export interface OpenAPIRequestBody {
  content?: {
    'application/json'?: {
      schema?: Record<string, unknown>;
    };
  };
}

export interface OpenAPIResponse {
  description?: string;
}

export interface OpenAPIPath {
  [method: string]: OpenAPIOperation;
}

export interface OpenAPIDocument {
  openapi?: string;
  swagger?: string;
  info?: {
    title?: string;
    version?: string;
    description?: string;
  };
  paths?: Record<string, OpenAPIPath>;
  components?: {
    schemas?: Record<string, unknown>;
  };
}

// ============================================================================
// HAR (HTTP Archive) Format
// ============================================================================

export interface HARQueryParam {
  name: string;
  value: string;
  enabled?: boolean;
}

export interface HARPostData {
  mimeType?: string;
  text?: string;
  params?: HARQueryParam[];
}

export interface HARRequest {
  method?: string;
  url?: string;
  headers?: HARHeader[];
  queryString?: HARQueryParam[];
  postData?: HARPostData;
}

export interface HARHeader {
  name: string;
  value: string;
}

export interface HAREntry {
  startedDateTime?: string;
  request?: HARRequest;
  response?: {
    status?: number;
    statusText?: string;
    headers?: HARHeader[];
    content?: {
      size?: number;
      mimeType?: string;
    };
  };
}

export interface HARLog {
  version?: string;
  creator?: {
    name?: string;
    version?: string;
  };
  entries?: HAREntry[];
}

export interface HARDocument {
  log?: HARLog;
}

// ============================================================================
// Insomnia Format
// ============================================================================

export interface InsomniaResource {
  _type: 'request' | 'workspace' | 'environment' | string;
  id?: string;
  name?: string;
  method?: string;
  url?: string;
  body?: {
    mode?: 'json' | 'form-urlencoded' | 'multipart-form' | 'graphql' | 'raw';
    text?: string | Record<string, unknown>;
    params?: InsomniaParam[];
    query?: string;
    variables?: string;
  };
  headers?: InsomniaParam[];
  parameters?: InsomniaParam[];
}

export interface InsomniaParam {
  name: string;
  value: string;
  disabled?: boolean;
}

export interface InsomniaExport {
  _type: 'export';
  format: 'insomnia';
  name?: string;
  title?: string;
  resources?: InsomniaResource[];
}

// ============================================================================
// APIPark Format
// ============================================================================

export interface APIParkAPI {
  name?: string;
  method?: string;
  url?: string;
  body?: string;
}

export interface APIParkCollection {
  name?: string;
  title?: string;
  apis?: APIParkAPI[];
}

export interface APIParkExport {
  _type: 'export';
  format: 'apipark';
  name?: string;
  title?: string;
  collections?: APIParkCollection[];
}

// ============================================================================
// Apifox Format
// ============================================================================

export interface ApifoxRequest {
  method?: string;
  url?: string | { rawUrl?: string };
  header?: ApifoxHeader[];
  body?: {
    mode?: string;
    raw?: string;
  };
}

export interface ApifoxHeader {
  key: string;
  value: string;
}

export interface ApifoxItem {
  name: string;
  request?: ApifoxRequest;
}

export interface ApifoxCollection {
  name?: string;
  title?: string;
  item?: ApifoxItem[];
}

export interface ApifoxExport {
  _type: 'export';
  format: 'apifox';
  name?: string;
  title?: string;
  data?: ApifoxCollection[];
}

// ============================================================================
// Generic Import Types
// ============================================================================

export type ImportFormat = 'postman' | 'openapi' | 'har' | 'insomnia' | 'apipark' | 'apifox' | 'unknown';

export interface ParsedImport {
  format: ImportFormat;
  collectionName: string;
  requests: ImportRequest[];
}

export interface ImportRequest {
  id: string;
  name: string;
  method: string;
  url: string;
  params: KeyValue[];
  headers: KeyValue[];
  bodyType: 'raw' | 'graphql' | 'urlencoded' | 'form-data';
  reqBody: string;
  urlencodedBody: KeyValue[];
  formData: KeyValue[];
  graphqlVariables: string;
  authType: string;
  createdAt: number;
  description?: string;
  parameters?: unknown[];
  requestBody?: unknown;
}

export interface KeyValue {
  key: string;
  value: string;
  enabled: boolean;
}