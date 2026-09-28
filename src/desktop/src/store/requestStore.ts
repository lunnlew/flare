/**
 * Request Store - Request builder state (PERSISTED)
 *
 * Key Patterns:
 * 1. Per-endpoint state map - Each endpoint (method:path) stores its own state
 * 2. Actions colocated with state they manage
 * 3. Persistence via Zustand persist middleware
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  saveRequest as saveRequestApi,
  saveResponse as saveResponseApi,
  getResponses,
  deleteResponses,
  clearResponses,
  deleteRequest as deleteRequestApi,
  executeRequest,
  type ExecuteRequestConfig,
  type SaveResponseData,
} from '../services/api';
import type { KeyValue } from '../constants/http';
import { DEFAULT_AWS_REGION } from '../components/Common/Auth/constants';
import type { ResponseData } from '../types/api';
import type { EndpointData, HttpMethod } from '../types';
import { generateMockBody } from '../utils/mock';
import { toast } from './notificationStore';
import { getErrorMessage } from '../utils/string';
import { logger } from '../utils/logger';

const requestLogger = logger.child('request');

// ============================================================================
// Helper Functions
// ============================================================================

// Content type classification for response handling
export type ResponseContentCategory = 'json' | 'xml' | 'text' | 'binary' | 'unknown';

export interface TransformedResponse {
  statusCode: number;
  description: string;
  schema?: Record<string, unknown>;
  example?: unknown;
  contentType?: string;
  contentCategory: ResponseContentCategory;
}

// Classify content type into category
function classifyContentType(contentType: string | undefined): ResponseContentCategory {
  if (!contentType) return 'unknown';

  const ct = contentType.toLowerCase();

  // JSON types
  if (ct.includes('json') || ct === 'application/json' || ct === 'text/json') {
    return 'json';
  }

  // XML types
  if (ct.includes('xml') || ct === 'application/xml' || ct === 'text/xml') {
    return 'xml';
  }

  // Text types
  if (ct.includes('text/') || ct === 'text/plain' || ct === 'text/html') {
    return 'text';
  }

  // Binary types
  if (
    ct.includes('octet-stream') ||
    ct.includes('pdf') ||
    ct.includes('image/') ||
    ct.includes('audio/') ||
    ct.includes('video/') ||
    ct.includes('zip') ||
    ct.includes('gzip') ||
    ct.includes('grpc+proto') ||
    ct.includes('protobuf')
  ) {
    return 'binary';
  }

  return 'unknown';
}

// Get priority key from content object
function getBestContentKey(content: Record<string, unknown> | undefined): { key: string; contentType: string } | null {
  if (!content || Object.keys(content).length === 0) return null;

  // Priority order for content type selection
  const priorityKeys = [
    'application/json',
    'application/ld+json',
    'text/json',
    'text/xml',
    'application/xml',
    'text/plain',
    'text/html',
    '*/*',  // wildcard fallback
  ];

  // First try to find by priority
  for (const key of priorityKeys) {
    if (content[key]) {
      return { key, contentType: key };
    }
  }

  // Fallback: return first available key
  const firstKey = Object.keys(content)[0];
  return { key: firstKey, contentType: firstKey };
}

// ============================================================================
// Flat Key to Nested Schema Conversion
// ============================================================================

/**
 * Convert flat parameter schemas to nested structure
 * Input: { "teamShifts[0].attr1": { type: "string" }, "teamShifts[0].attr2": { type: "number" } }
 * Output: { "teamShifts": { type: "array", items: { type: "object", properties: { "attr1": {...}, "attr2": {...} } } }
 */
function convertFlatParamsToNested(flatSchemas: Record<string, Record<string, unknown>>): Record<string, Record<string, unknown>> {
  const result: Record<string, Record<string, unknown>> = {};

  for (const [key, schema] of Object.entries(flatSchemas)) {
    // Check if key contains array notation like "[0]"
    const hasArrayNotation = /\[\d+\]/.test(key);

    if (hasArrayNotation) {
      // Extract root key (e.g., "teamShifts" from "teamShifts[0].attr1")
      const rootKey = key.split('[')[0];

      if (!result[rootKey]) {
        // First time seeing this root, create array structure
        result[rootKey] = {
          type: 'array',
          items: {
            type: 'object',
            properties: {} as Record<string, unknown>,
          },
        };
      }

      // Extract property path from key (e.g., "attr1" from "teamShifts[0].attr1")
      const parts = key.split('.');
      const propertyPath = parts.slice(1); // ["attr1"] or ["attr1", "nested"]

      // Build the property path in the items
      type NestedRecord = Record<string, unknown>;
      let current: NestedRecord = result[rootKey].items as NestedRecord;
      for (let i = 0; i < propertyPath.length - 1; i++) {
        const part = propertyPath[i];
        if (!current.properties) {
          current.properties = {} as NestedRecord;
        }
        const props = current.properties as NestedRecord;
        if (!props[part]) {
          props[part] = { type: 'object', properties: {} as NestedRecord };
        }
        current = props[part] as NestedRecord;
      }

      // Set the final property
      const finalProp = propertyPath[propertyPath.length - 1];
      if (!current.properties) {
        current.properties = {} as NestedRecord;
      }
      (current.properties as NestedRecord)[finalProp] = { ...schema };
    } else {
      // No array notation, use as-is
      result[key] = schema;
    }
  }

  return result;
}

// Transform API spec responses format to UI-friendly format
// API spec format: { "200": { description, content: { "*/*": { schema } } } }
// UI format: { "200": { statusCode, description, schema, example, contentType, contentCategory } }
function transformResponseSchemas(responses?: Record<string, {
  statusCode?: number;
  description?: string;
  schema?: Record<string, unknown>;
  example?: unknown;
  content?: Record<string, { schema?: Record<string, unknown>; example?: unknown }>;
}>): Record<string, TransformedResponse> | undefined {
  if (!responses) return undefined;

  const result: Record<string, TransformedResponse> = {};

  for (const [code, resp] of Object.entries(responses)) {
    let schema = resp.schema;
    let example = resp.example;
    let contentType: string | undefined;
    let contentCategory: ResponseContentCategory = 'unknown';

    if (resp.content) {
      const matched = getBestContentKey(resp.content);
      if (matched) {
        const contentEntry = resp.content[matched.key] as Record<string, unknown> | undefined;
        if (contentEntry) {
          schema = contentEntry.schema as Record<string, unknown> | undefined;
          example = contentEntry.example;
        }
        contentType = matched.contentType;
        contentCategory = classifyContentType(contentType);
      }
    } else if (schema) {
      // No content wrapper, assume JSON if schema exists
      contentCategory = 'json';
      contentType = 'application/json';
    }

    result[code] = {
      statusCode: resp.statusCode || parseInt(code) || 0,
      description: resp.description || "",
      schema: contentCategory === 'json' || contentCategory === 'xml' ? schema : undefined,
      example,
      contentType,
      contentCategory,
    };
  }

  return result;
}

// ============================================================================
// Type Definitions
// ============================================================================

// HTTP error interface for type-safe error handling
interface HttpError {
  status?: number;
  code?: string;
  message?: string;
}

// Auth config interface for type-safe access
interface AuthConfig {
  bearerToken?: string;
  bearerPrefix?: string;
  basicUsername?: string;
  basicPassword?: string;
  apiKeyName?: string;
  apiKeyValue?: string;
  apiKeyLocation?: string;
}

// Helper to safely extract error info
function getHttpError(e: unknown): HttpError {
  if (e && typeof e === 'object') {
    return e as HttpError;
  }
  return {};
}

export interface RequestState {
  method: string;
  url: string;
  params: KeyValue[];
  headers: KeyValue[];
  bodyType: string;
  reqBody: string;
  urlencodedBody: KeyValue[];
  formData: KeyValue[];
  graphqlVariables: string;
  graphqlQuery: string;
  sslVerify: boolean;
  authType: string;
  bearerToken: string;
  bearerPrefix: string;
  basicUsername: string;
  basicPassword: string;
  apiKeyName: string;
  apiKeyValue: string;
  apiKeyLocation: string;
  oauth2AuthUrl: string;
  oauth2AccessTokenUrl: string;
  oauth2TokenType: string;
  oauth2ClientId: string;
  oauth2ClientSecret: string;
  oauth2AccessToken: string;
  oauth2RefreshToken: string;
  oauth2Scope: string;
  oauth2ClientAuthentication: "header" | "body" | "none";
  awsAccessKey: string;
  awsSecretKey: string;
  awsSessionToken: string; // Temporary credentials (for AWS STS)
  awsRegion: string;
  awsService: string;
  timeout: number; // Request timeout in ms (0 = no timeout)
  retryConfig: {
    maxRetries: number; // 0 = no retry
    retryDelay: number; // Base delay in ms
    enabled: boolean;
  };
  binaryFile?: { name: string; size: number; content: string } | null; // Binary body file
  activeTab: string;
  description: string; // Request description for documentation
  // Schema info for mock generation (fieldName -> JSON Schema)
  parameterSchemas?: Record<string, Record<string, unknown>>;
  // Response schema from API doc for display
  responseSchemas?: Record<string, TransformedResponse>;
}

// Stable reference for default state - prevents unnecessary re-renders
// when useRequestState returns the default
const DEFAULT_REQUEST_STATE: RequestState = {
  method: "GET",
  url: "",
  params: [{ key: "", value: "", enabled: true }],
  headers: [{ key: "Content-Type", value: "application/json", enabled: true }],
  bodyType: "raw",
  reqBody: "",
  urlencodedBody: [{ key: "", value: "", enabled: true }],
  formData: [{ key: "", value: "", enabled: true }],
  graphqlVariables: "",
  graphqlQuery: "",
  sslVerify: true,
  authType: "none",
  bearerToken: "",
  bearerPrefix: "Bearer",
  basicUsername: "",
  basicPassword: "",
  apiKeyName: "X-API-Key",
  apiKeyValue: "",
  apiKeyLocation: "header",
  oauth2AuthUrl: "",
  oauth2AccessTokenUrl: "",
  oauth2TokenType: "Bearer",
  oauth2ClientId: "",
  oauth2ClientSecret: "",
  oauth2AccessToken: "",
  oauth2RefreshToken: "",
  oauth2Scope: "",
  oauth2ClientAuthentication: "header",
  awsAccessKey: "",
  awsSecretKey: "",
  awsSessionToken: "",
  awsRegion: DEFAULT_AWS_REGION,
  awsService: "",
  timeout: 0,
  retryConfig: { maxRetries: 0, retryDelay: 1000, enabled: false },
  binaryFile: null,
  activeTab: "params",
  description: "",
};

// Returns stable reference - caller should NOT mutate this object
export const getDefaultRequestState = (): RequestState => DEFAULT_REQUEST_STATE;

// ============================================================================
// Store Interface
// ============================================================================

// Parameter location type
interface ParamLocation {
  location?: string;
  in?: string;
}

// Helper to get location from parameter
function getParamLocation(p: ParamLocation): string {
  return p.location || p.in || 'query';
}

// Open endpoint tab info
export interface OpenEndpointTab {
  id: string; // endpointId = "method:path"
  method: string;
  path: string;
  name: string; // display name (summary or path)
}

interface RequestStore {
  // Per-endpoint state map: key is "method:path", value is the request state
  endpointStates: Record<string, RequestState>;
  // Current active endpoint identifier
  currentEndpointId: string | null;
  // Open endpoint tabs for multi-tab UI
  openEndpointTabs: OpenEndpointTab[];
  setRequestState: (updates: Partial<RequestState>) => void;
  getRequestState: () => RequestState;
  setFullRequestState: (state: RequestState) => void;
  resetRequestState: () => void;
  // Synchronized rename for params and parameterSchemas
  renameParamKey: (oldKey: string, newKey: string) => void;
  // Endpoint tab actions
  openEndpointTab: (endpoint: EndpointData | null, baseUrl?: string) => void;
  closeEndpointTab: (endpointId: string) => void;
  closeTabsToRight: (endpointId: string) => void;
  closeTabsToLeft: (endpointId: string) => void;
  closeOtherTabs: (endpointId: string) => void;
  switchEndpointTab: (endpointId: string) => void;
  // Endpoint loading action - handles state persistence across endpoint switches
  loadEndpoint: (endpoint: EndpointData | null, baseUrl?: string) => void;
  // Backend history (not persisted - loaded from backend)
  backendHistory: import('../services/api').HistoryItem[];
  isLoadingHistory: boolean;
  loadBackendHistory: (endpointId?: string) => Promise<void>;
  deleteBackendHistory: (ids: string[]) => Promise<void>;
  clearBackendHistory: () => Promise<void>;
  // Backend actions
  saveRequest: () => Promise<{ success: boolean; requestId?: string; error?: string }>;
  deleteRequest: (requestId: string) => Promise<{ success: boolean; error?: string }>;
  // HTTP execution actions
  executeRequest: (config: ExecuteRequestConfig) => Promise<import('../types/api').ResponseData>;
  saveResponse: (response: SaveResponseData) => Promise<void>;
  // Convenience save actions that combine request and response
  saveRequestAndResponse: (requestId: string, requestData: Record<string, unknown>, responseData: ResponseData) => Promise<void>;
}

// EndpointData is imported from '../types' - see line 14 import

// ============================================================================
// Store Implementation
// ============================================================================

export const useRequestStore = create<RequestStore>()(
  persist(
    (set, get) => ({
      // Per-endpoint state map and current endpoint
      endpointStates: {},
      currentEndpointId: null,
      openEndpointTabs: [],

      setRequestState: (updates) => set((state) => {
        const currentEndpointId = state.currentEndpointId;
        if (!currentEndpointId) {
          // No active endpoint, fallback to old behavior
          const current = state.endpointStates['_'] || getDefaultRequestState();
          return { endpointStates: { ...state.endpointStates, '_': { ...current, ...updates } } };
        }
        const current = state.endpointStates[currentEndpointId] || getDefaultRequestState();
        return { endpointStates: { ...state.endpointStates, [currentEndpointId]: { ...current, ...updates } } };
      }),

      getRequestState: () => {
        const state = get();
        const currentEndpointId = state.currentEndpointId;
        if (!currentEndpointId) return DEFAULT_REQUEST_STATE;
        return state.endpointStates[currentEndpointId] || DEFAULT_REQUEST_STATE;
      },

      setFullRequestState: (requestState) => set((state) => {
        const currentEndpointId = state.currentEndpointId;
        if (!currentEndpointId) {
          return { endpointStates: { ...state.endpointStates, '_': requestState } };
        }
        return { endpointStates: { ...state.endpointStates, [currentEndpointId]: requestState } };
      }),

      resetRequestState: () => set((state) => {
        const currentEndpointId = state.currentEndpointId;
        if (!currentEndpointId) return state;
        const { [currentEndpointId]: _, ...rest } = state.endpointStates;
        return { endpointStates: rest };
      }),

      // Synchronized rename for params and parameterSchemas
      renameParamKey: (oldKey: string, newKey: string) => set((state) => {
        const currentEndpointId = state.currentEndpointId;
        if (!currentEndpointId) return state;

        const current = state.endpointStates[currentEndpointId];
        if (!current) return state;

        // Update params
        const updatedParams = current.params.map(p =>
          p.key === oldKey ? { ...p, key: newKey } : p
        );

        // Update parameterSchemas
        const updatedSchemas = { ...current.parameterSchemas };
        if (updatedSchemas[oldKey]) {
          updatedSchemas[newKey] = updatedSchemas[oldKey];
          delete updatedSchemas[oldKey];
        }

        return {
          endpointStates: {
            ...state.endpointStates,
            [currentEndpointId]: {
              ...current,
              params: updatedParams,
              parameterSchemas: updatedSchemas,
            },
          },
        };
      }),

      // Open or switch to an endpoint tab
      openEndpointTab: (endpoint, baseUrl) => {
        const endpointId = `${endpoint?.method || 'GET'}:${endpoint?.path || ''}`;

        // If endpoint already open, switch to it and load state if needed
        const existingTab = get().openEndpointTabs.find(t => t.id === endpointId);
        if (existingTab) {
          set({ currentEndpointId: endpointId });

          // If endpoint state doesn't exist, load it
          if (!get().endpointStates[endpointId]) {
            get().loadEndpoint(endpoint, baseUrl);
          }
          return;
        }

        // Build tab info
        const tab: OpenEndpointTab = {
          id: endpointId,
          method: endpoint?.method || 'GET',
          path: endpoint?.path || '',
          name: endpoint?.summary || endpoint?.path || 'New Request',
        };

        // Add to open tabs and switch
        set(state => ({
          openEndpointTabs: [...state.openEndpointTabs, tab],
          currentEndpointId: endpointId,
        }));

        // Load the endpoint state (will call loadEndpoint logic)
        get().loadEndpoint(endpoint, baseUrl);
      },

      // Close an endpoint tab
      closeEndpointTab: (endpointId) => {
        const state = get();
        const tabIndex = state.openEndpointTabs.findIndex(t => t.id === endpointId);
        if (tabIndex === -1) return;

        // Remove tab
        const newTabs = state.openEndpointTabs.filter(t => t.id !== endpointId);

        // If closing current tab, switch to another or null
        let newCurrentEndpointId = state.currentEndpointId;
        if (state.currentEndpointId === endpointId) {
          if (newTabs.length > 0) {
            // Switch to the tab at same index, or last tab if was last
            const newIndex = Math.min(tabIndex, newTabs.length - 1);
            newCurrentEndpointId = newTabs[newIndex].id;
          } else {
            newCurrentEndpointId = null;
          }
        }

        // Update store state
        set({
          openEndpointTabs: newTabs,
          currentEndpointId: newCurrentEndpointId,
        });
      },

      // Close all tabs to the right of the given tab
      closeTabsToRight: (endpointId) => {
        const state = get();
        const tabIndex = state.openEndpointTabs.findIndex(t => t.id === endpointId);
        if (tabIndex === -1) return;

        // Get tabs to keep (all tabs before and including this one)
        const tabsToKeep = state.openEndpointTabs.slice(0, tabIndex + 1);
        const tabsToClose = state.openEndpointTabs.slice(tabIndex + 1);

        // If current tab is in the tabs to close, switch to the given tab
        let newCurrentEndpointId = state.currentEndpointId;
        if (tabsToClose.some(t => t.id === state.currentEndpointId)) {
          newCurrentEndpointId = endpointId;
        }

        set({
          openEndpointTabs: tabsToKeep,
          currentEndpointId: newCurrentEndpointId,
        });
      },

      // Close all tabs to the left of the given tab
      closeTabsToLeft: (endpointId) => {
        const state = get();
        const tabIndex = state.openEndpointTabs.findIndex(t => t.id === endpointId);
        if (tabIndex === -1) return;

        // Get tabs to keep (this tab and all tabs after it)
        const tabsToKeep = state.openEndpointTabs.slice(tabIndex);
        const tabsToClose = state.openEndpointTabs.slice(0, tabIndex);

        // If current tab is in the tabs to close, switch to the given tab
        let newCurrentEndpointId = state.currentEndpointId;
        if (tabsToClose.some(t => t.id === state.currentEndpointId)) {
          newCurrentEndpointId = endpointId;
        }

        set({
          openEndpointTabs: tabsToKeep,
          currentEndpointId: newCurrentEndpointId,
        });
      },

      // Close all tabs except the given tab
      closeOtherTabs: (endpointId) => {
        const state = get();
        const tab = state.openEndpointTabs.find(t => t.id === endpointId);
        if (!tab) return;

        // Keep only the given tab
        set({
          openEndpointTabs: [tab],
          currentEndpointId: endpointId,
        });
      },

      // Switch to an endpoint tab
      switchEndpointTab: (endpointId) => {
        const state = get();
        const tab = state.openEndpointTabs.find(t => t.id === endpointId);
        if (!tab) return;

        // Update store state
        set({ currentEndpointId: endpointId });

        // If endpoint state exists, just switch
        if (state.endpointStates[endpointId]) {
          return;
        }

        // Otherwise load it
        get().loadEndpoint({ method: tab.method as HttpMethod, path: tab.path }, undefined);
      },

      // Backend history (not persisted - loaded from backend)
      backendHistory: [],
      isLoadingHistory: false,

      // Load endpoint - handles state persistence across endpoint switches
      // Each endpoint (method:path) stores its own state in endpointStates map
      loadEndpoint: async (endpoint: {
        method?: string;
        path?: string;
        url?: string;
        summary?: string;
        description?: string;
        parameters?: Array<{
          name: string;
          location?: string;
          in?: string;
          required?: boolean;
          description?: string;
          example?: unknown;
          schema?: Record<string, unknown>;
        }>;
        requestBody?: {
          contentType?: string;
          schema?: Record<string, unknown>;
          example?: unknown;
        };
        responses?: Record<string, {
          statusCode: number;
          description: string;
          schema?: Record<string, unknown>;
          example?: unknown;
        }>;
      } | null, baseUrl?: string) => {

        const state = get();

        // Build endpoint identifier using method+path
        const endpointId = `${endpoint?.method || 'GET'}:${endpoint?.path || ''}`;

        // If same endpoint and we have existing persisted state, update parameterSchemas if needed, then skip
        if (endpointId === state.currentEndpointId && endpointId !== '') {
          const existingState = state.endpointStates[endpointId];

          if (existingState) {
            // Even if we skip full reload, ensure parameterSchemas is up to date
            if (endpoint?.parameters && (!existingState.parameterSchemas || Object.keys(existingState.parameterSchemas).length === 0)) {
              const parameterSchemas: Record<string, Record<string, unknown>> = {};
              for (const p of endpoint.parameters) {
                if (p.name) {
                  const schema = p.schema || {} as Record<string, unknown>;
                  parameterSchemas[p.name] = {
                    type: schema.type as string,
                    format: schema.format as string,
                    enum: schema.enum as unknown[],
                    default: schema.default,
                    minimum: schema.minimum as number,
                    maximum: schema.maximum as number,
                    example: schema.example,
                    const: schema.const,
                    description: p.description || (schema.description as string),
                    name: p.name,
                  };
                }
              }
              // Update existing state with parameterSchemas
              set({
                endpointStates: {
                  ...state.endpointStates,
                  [endpointId]: { ...existingState, parameterSchemas }
                }
              });
            }
            return;
          }
        }

        // If switching to a different endpoint, load existing state for this endpoint if it exists
        if (endpointId !== state.currentEndpointId) {
          const existingState = state.endpointStates[endpointId];

          if (existingState) {
            // Ensure tab exists in openEndpointTabs
            const tabExists = state.openEndpointTabs.some(t => t.id === endpointId);
            const newTab: OpenEndpointTab = {
              id: endpointId,
              method: endpoint?.method || 'GET',
              path: endpoint?.path || '',
              name: endpoint?.summary || endpoint?.path || 'New Request',
            };
            set(state => ({
              currentEndpointId: endpointId,
              openEndpointTabs: tabExists ? state.openEndpointTabs : [...state.openEndpointTabs, newTab],
            }));
            return;
          }
        }

        // Build path with variables - use baseUrl if provided, fall back to endpoint path/url
        let pathWithVars = baseUrl || endpoint?.url || endpoint?.path || "";

        // Build params from endpoint
        const endpointParams = endpoint?.parameters?.filter(p => getParamLocation(p) === 'query' && p.name) || [];
        const endpointHeaders = endpoint?.parameters?.filter(p => getParamLocation(p) === 'header' && p.name) || [];

        // Build parameter schemas for mock generation
        const parameterSchemas: Record<string, Record<string, unknown>> = {};

        if (endpoint?.parameters) {
          for (const p of endpoint.parameters) {
            if (p.name) {
              const schema = p.schema || {} as Record<string, unknown>;

              parameterSchemas[p.name] = {
                // Schema-based detection
                type: schema.type as string,
                format: schema.format as string,
                enum: schema.enum as unknown[],
                default: schema.default,
                minimum: schema.minimum as number,
                maximum: schema.maximum as number,
                example: schema.example,
                const: schema.const,
                description: p.description || (schema.description as string),
                name: p.name,
              };
            }
          }
        }

        // Convert flat parameter keys (like "teamShifts[0].attr1") to nested structure
        const nestedParameterSchemas = convertFlatParamsToNested(parameterSchemas);


        // Build body from schema
        let endpointBodyType: string = 'none';
        let reqBody = '';
        let contentType = 'application/json';
        if (endpoint?.requestBody) {
          const rb = endpoint.requestBody;
          if (rb.contentType) {
            contentType = rb.contentType;
            if (rb.contentType.includes('application/json')) endpointBodyType = 'raw';
            else if (rb.contentType.includes('x-www-form-urlencoded')) endpointBodyType = 'x-www-form-urlencoded';
            else if (rb.contentType.includes('multipart/form-data')) endpointBodyType = 'form-data';
            else if (rb.contentType.includes('graphql')) endpointBodyType = 'graphql';
          }
          if (rb.schema) {
            // Use enhanced mock generator for realistic sample data (async)
            try {
              reqBody = await generateMockBody(rb.schema as Record<string, any>);
            } catch (e) {
              requestLogger.error('Generate mock body failed', { error: String(e) });
              reqBody = '';
            }
          }
        }

        // Initialize state for this endpoint
        const newState: RequestState = {
          method: endpoint?.method || "GET",
          url: pathWithVars,
          params: endpointParams.map(p => ({
            key: p.name,
            value: p.example !== undefined ? String(p.example) : '',
            enabled: p.required === true,
            description: p.description,
            required: p.required,
          })),
          headers: [
            ...endpointHeaders.map(p => ({
              key: p.name,
              value: p.example !== undefined ? String(p.example) : '',
              enabled: p.required === true,
              description: p.description,
              required: p.required,
            })),
            { key: "Content-Type", value: contentType, enabled: true },
          ],
          bodyType: endpointBodyType,
          reqBody,
          urlencodedBody: [{ key: "", value: "", enabled: true }],
          formData: [{ key: "", value: "", enabled: true }],
          graphqlVariables: "",
          graphqlQuery: "",
          sslVerify: true,
          authType: "none",
          bearerToken: "",
          bearerPrefix: "Bearer",
          basicUsername: "",
          basicPassword: "",
          apiKeyName: "X-API-Key",
          apiKeyValue: "",
          apiKeyLocation: "header",
          oauth2AuthUrl: "",
          oauth2AccessTokenUrl: "",
          oauth2TokenType: "Bearer",
          oauth2ClientId: "",
          oauth2ClientSecret: "",
          oauth2AccessToken: "",
          oauth2RefreshToken: "",
          oauth2Scope: "",
          oauth2ClientAuthentication: "header",
          awsAccessKey: "",
          awsSecretKey: "",
          awsSessionToken: "",
          awsRegion: "",
          awsService: "",
          timeout: 0,
          retryConfig: { maxRetries: 0, retryDelay: 1000, enabled: false },
          binaryFile: null,
          activeTab: "params",
          description: endpoint?.description || "",
          parameterSchemas: nestedParameterSchemas,
          // Transform API spec responses format to UI format
          responseSchemas: transformResponseSchemas(endpoint?.responses),
        };

        set(state => {
          // Ensure tab exists in openEndpointTabs
          const tabExists = state.openEndpointTabs.some(t => t.id === endpointId);
          const newTab: OpenEndpointTab = {
            id: endpointId,
            method: endpoint?.method || 'GET',
            path: endpoint?.path || '',
            name: endpoint?.summary || endpoint?.path || 'New Request',
          };
          return {
            currentEndpointId: endpointId,
            endpointStates: { ...state.endpointStates, [endpointId]: newState },
            openEndpointTabs: tabExists ? state.openEndpointTabs : [...state.openEndpointTabs, newTab],
          };
        });
      },

      // Load history from backend
      loadBackendHistory: async (endpointId?: string) => {
        set({ isLoadingHistory: true });
        try {
          const responses = await getResponses(undefined, endpointId);
          set({ backendHistory: responses });
        } catch (e) {
          toast.error('加载历史记录失败');
        } finally {
          set({ isLoadingHistory: false });
        }
      },

      // Delete history items from backend
      deleteBackendHistory: async (ids: string[]) => {
        try {
          await deleteResponses(ids);
          // Remove deleted items from local state
          set(state => ({
            backendHistory: state.backendHistory.filter(item => !ids.includes(item.id))
          }));
        } catch (e) {
          toast.error('删除历史记录失败');
          throw e;
        }
      },

      // Clear all history from backend
      clearBackendHistory: async () => {
        try {
          await clearResponses();
          set({ backendHistory: [] });
        } catch (e) {
          toast.error('清空历史记录失败');
          throw e;
        }
      },

      // Save request to backend
      saveRequest: async () => {
        const requestState = get().getRequestState();
        if (!requestState) {
          return { success: false, error: 'No request state' };
        }

        const requestId = `req-${Date.now()}`;

        const requestToBackend = {
          id: requestId,
          name: requestState.url.split('?')[0].split('/').pop() || '未命名请求',
          method: requestState.method,
          url: requestState.url,
          params: requestState.params,
          headers: requestState.headers,
          body_type: requestState.bodyType,
          req_body: requestState.reqBody,
          urlencoded_body: requestState.urlencodedBody,
          form_data: requestState.formData,
          graphql_variables: requestState.graphqlVariables,
          auth_type: requestState.authType,
          auth_config: {
            bearerToken: requestState.bearerToken || '',
            bearerPrefix: requestState.bearerPrefix || '',
            basicUsername: requestState.basicUsername || '',
            basicPassword: requestState.basicPassword || '',
            apiKeyName: requestState.apiKeyName || '',
            apiKeyValue: requestState.apiKeyValue || '',
            apiKeyLocation: requestState.apiKeyLocation || '',
            oauth2AuthUrl: requestState.oauth2AuthUrl || '',
            oauth2AccessTokenUrl: requestState.oauth2AccessTokenUrl || '',
            oauth2TokenType: requestState.oauth2TokenType || 'Bearer',
            oauth2ClientId: requestState.oauth2ClientId || '',
            oauth2ClientSecret: requestState.oauth2ClientSecret || '',
            oauth2AccessToken: requestState.oauth2AccessToken || '',
            oauth2RefreshToken: requestState.oauth2RefreshToken || '',
            oauth2Scope: requestState.oauth2Scope || '',
            oauth2ClientAuthentication: requestState.oauth2ClientAuthentication || 'header',
            awsAccessKey: requestState.awsAccessKey || '',
            awsSecretKey: requestState.awsSecretKey || '',
            awsSessionToken: requestState.awsSessionToken || '',
            awsRegion: requestState.awsRegion || '',
            awsService: requestState.awsService || '',
          },
          ssl_verify: requestState.sslVerify,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        try {
          await saveRequestApi(requestToBackend);
          return { success: true, requestId };
        } catch (e) {
          const errorMessage = e instanceof Error ? e.message : typeof e === 'string' ? e : JSON.stringify(e);
          requestLogger.error('Save request failed', { error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      // Delete request from backend
      deleteRequest: async (requestId) => {
        try {
          await deleteRequestApi(requestId);
          return { success: true };
        } catch (e) {
          requestLogger.error('Delete request failed', { requestId, error: String(e) });
          toast.error('删除请求失败');
          return { success: false, error: String(e) };
        }
      },

      // Execute HTTP request with retry support
      // NOTE: Response state is managed in responseStore, not here
      executeRequest: async (config: ExecuteRequestConfig) => {
        const { retry, ...requestConfig } = config;
        const maxRetries = retry?.maxRetries ?? 0;
        const baseDelay = retry?.retryDelay ?? 1000;
        const retryOn = retry?.retryOn ?? [0, 503, 504, 429, 408];

        const executeOnce = async (attempt: number): Promise<ResponseData> => {
          try {
            const response = await executeRequest(requestConfig);
            return response;
          } catch (e) {
            // Check if should retry
            if (attempt < maxRetries) {
              const errorMsg = getErrorMessage(e);
              const shouldRetry = retryOn.some(code => {
                const err = getHttpError(e);
                return errorMsg.includes(String(code)) ||
                  err.status === code ||
                  err.code === 'ETIMEDOUT';
              });

              if (shouldRetry) {
                await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, attempt - 1)));
                return executeOnce(attempt + 1);
              }
            }
            throw e;
          }
        };

        const response = await executeOnce(1);
        return response;
      },

      // Save response to backend
      saveResponse: async (responseToSave: SaveResponseData) => {
        try {
          await saveResponseApi(responseToSave);
        } catch (e) {
          requestLogger.error('Save response failed', { error: String(e) });
          toast.error('保存响应失败');
        }
      },

      // Combined save request and response - for request execution workflow
      saveRequestAndResponse: async (requestId: string, requestData: Record<string, unknown>, responseData: ResponseData) => {
        try {
          // Build request for backend
          const requestToBackend = {
            id: requestId,
            name: (requestData.url as string)?.split('?')[0].split('/').pop() || '未命名请求',
            method: requestData.method as string,
            url: requestData.url as string,
            params: requestData.params as KeyValue[],
            headers: requestData.headers as KeyValue[],
            body_type: requestData.bodyType as string,
            req_body: requestData.reqBody as string,
            urlencoded_body: requestData.urlencodedBody as KeyValue[],
            form_data: requestData.formData as KeyValue[],
            graphql_variables: requestData.graphqlVariables as string,
            auth_type: requestData.authType as string,
            auth_config: {
              bearerToken: (requestData.authConfig as AuthConfig)?.bearerToken || '',
              bearerPrefix: (requestData.authConfig as AuthConfig)?.bearerPrefix || '',
              basicUsername: (requestData.authConfig as AuthConfig)?.basicUsername || '',
              basicPassword: (requestData.authConfig as AuthConfig)?.basicPassword || '',
              apiKeyName: (requestData.authConfig as AuthConfig)?.apiKeyName || '',
              apiKeyValue: (requestData.authConfig as AuthConfig)?.apiKeyValue || '',
              apiKeyLocation: (requestData.authConfig as AuthConfig)?.apiKeyLocation || '',
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          // Save request
          await saveRequestApi(requestToBackend);

          // Save response
          const responseToSave: SaveResponseData = {
            id: "",
            request_id: requestId,
            status: responseData.status,
            status_text: responseData.statusText || "",
            headers: responseData.headers,
            body: responseData.body,
            size: responseData.body.length,
            time: responseData.time || 0,
            created_at: new Date().toISOString(),
            endpoint_id: responseData.endpointId,
          };
          await saveResponseApi(responseToSave);

          // Reload backend history to get latest (after both request and response are saved)
          await get().loadBackendHistory();
        } catch (e) {
          requestLogger.error('Save request and response failed', { requestId, error: String(e) });
          toast.error('保存请求和响应失败');
        }
      },
    }),
    {
      name: 'flare-request-state',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        endpointStates: state.endpointStates,
        currentEndpointId: state.currentEndpointId,
        openEndpointTabs: state.openEndpointTabs,
      }),
    }
  )
);