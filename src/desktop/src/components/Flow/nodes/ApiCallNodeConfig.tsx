/**
 * ApiCallNodeConfig - API Call node configuration
 *
 * Enhanced version with:
 * - Searchable interface selector (from store)
 * - Collapsible sections
 * - Inline validation
 * - Better UX for loading configs
 */
import { useState, useCallback, useEffect } from "react";
import {
  ConfigSection,
  ConfigField,
  ConfigInput,
  ConfigCheckbox,
  ConfigNumberInput,
  NodeHeader,
  ConfigDeleteButton,
} from "./NodeConfigBase";
import { useCollectionStore } from "../../../store";
import { useFlowCanvasUIStore } from "../../../store/flowCanvasUIStore";
import { substituteVariables, getErrorMessage } from "../../../utils/string";
import { keyValueToRecord } from "../../../utils/object";
import { ApiRequestConfigPanel } from "../../Request/ApiRequestConfigPanel";
import type { ApiRequestConfig } from "../../Request/ApiRequestConfigPanel";
import type { BodyType } from "../../../constants/http";
import type { Endpoint } from "../../../types";

// Type for endpoint parameter
type EndpointParam = NonNullable<Endpoint['parameters']>[number];

interface ApiCallNodeConfigProps {
  selectedNode: { id: string; type?: string; data: Record<string, unknown> };
  updateNodeData: (nodeId: string, data: Record<string, unknown>) => void;
  currentEnvVariables: Array<{ key: string; value: string; enabled?: boolean }>;
  envVariablesMap?: Record<string, string>;
  onUpdateVariable: (key: string, value: string) => void;
  onToggleVariableEnabled?: (key: string, enabled: boolean) => void;
}

export function ApiCallNodeConfig({
  selectedNode,
  updateNodeData,
  currentEnvVariables,
  envVariablesMap,
  onUpdateVariable,
  onToggleVariableEnabled,
}: ApiCallNodeConfigProps) {
  const apis = useCollectionStore((state) => state.apis);
  const { interfaceSearch, interfaceLoadError, setInterfaceSearch, setInterfaceLoadError } = useFlowCanvasUIStore();
  const [selectedEndpoint, setSelectedEndpoint] = useState<{
    api: string;
    path: string;
    method: string;
  } | null>(null);

  // Sync selectedEndpoint from node data when selectedNode changes
  useEffect(() => {
    const savedEndpoint = selectedNode.data.selectedEndpoint as typeof selectedEndpoint;
    if (savedEndpoint) {
      setSelectedEndpoint(savedEndpoint);
    }
  }, [selectedNode.id]);

  const handleLoadEndpoint = useCallback((apiName: string, epId: string) => {
    const api = apis.find((a) => a.name === apiName);
    if (!api) {
      setInterfaceLoadError(`API not found: ${apiName}`);
      return;
    }

    // Find endpoint by id OR by path+method combination
    const ep = api.endpoints.find((e) => {
      const endpointId = e.id || `${e.path}-${e.method}`;
      return endpointId === epId;
    });
    if (!ep) {
      setInterfaceLoadError(`Endpoint not found: ${epId}`);
      return;
    }

    try {
      const templateUrl = `{{baseUrl}}/${ep.path.replace(/^\//, "")}`;
      const fullUrl = substituteVariables(templateUrl, envVariablesMap || {});

      // Helper to get location from parameter (same as Builder)
      const getParamLocation = (p: { location?: string; in?: string }) => p.location || p.in || 'query';

      // Extract query params and header params separately (like Builder)
      const endpointParams = (ep.parameters || []).filter((p: EndpointParam) => getParamLocation(p) === 'query' && p.name);
      const endpointHeaders = (ep.parameters || []).filter((p: EndpointParam) => getParamLocation(p) === 'header' && p.name);

      // Extract parameter schemas for mock generation
      // Schema structure: param.schema contains JSON Schema fields (type, format, enum, etc.)
      const parameterSchemas: Record<string, Record<string, unknown>> = {};
      if (ep.parameters && Array.isArray(ep.parameters)) {
        for (const param of ep.parameters) {
          if (param.name) {
            const schema = param.schema || {};
            parameterSchemas[param.name] = {
              // Schema-based detection - with fallback to param-level fields
              type: schema.type ?? param.type,
              format: schema.format ?? param.format,
              enum: schema.enum ?? param.enum,
              default: schema.default ?? param.default,
              minimum: schema.minimum ?? param.minimum,
              maximum: schema.maximum ?? param.maximum,
              example: schema.example ?? param.example,
              const: schema.const,
              // Fallback to param-level fields if schema doesn't have them
              description: param.description || schema.description,
              // Also store name for field name matching
              name: param.name,
            };
          }
        }
      }

      // Determine content type from requestBody
      let contentType = 'application/json';
      if (ep.requestBody?.contentType) {
        contentType = ep.requestBody.contentType;
      }

      // Extract request body schema for mock generation
      // RequestBody schema contains the JSON Schema for the body
      const requestBodySchema = ep.requestBody?.schema || undefined;

      const loadedConfig: ApiRequestConfig = {
        method: (ep.method || "GET") as "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS",
        url: fullUrl,
        templateUrl: templateUrl,
        // Headers: from endpoint parameters (filtered by location=header) + Content-Type (like Builder)
        headers: [
          ...endpointHeaders.map((p: EndpointParam) => ({
            key: p.name,
            value: p.example !== undefined ? String(p.example) : '',
            enabled: p.required === true,
            description: p.description,
            required: p.required,
          })),
          { key: "Content-Type", value: contentType, enabled: true },
        ],
        // Params: from endpoint parameters (filtered by location=query) (like Builder)
        params: endpointParams.map((p: EndpointParam) => ({
          key: p.name,
          value: p.example !== undefined ? String(p.example) : '',
          enabled: p.required === true,
          description: p.description,
          required: p.required,
        })),
        bodyType: (ep.bodyType as BodyType) || "none",
        body: {
          formData: [{ key: "", value: "", enabled: true }],
          binaryFile: null,
          urlencodedData: [{ key: "", value: "", enabled: true }],
          rawContentType: ep.body?.rawContentType || "application/json",
          reqBody: ep.body?.reqBody || ep.body?.raw || "",
          graphqlQuery: ep.body?.graphqlQuery || "",
          graphqlVariables: ep.body?.graphqlVariables || "{}",
        },
        auth: ep.auth || { authType: "none" },
        // Pass schema info for mock generation
        parameterSchemas,
        requestBodySchema,
      };

      // Update node data with loaded config
      // Execution engine will read from apiConfig (with proper FlowAuthConfig format support)
      updateNodeData(selectedNode.id, {
        label: ep.summary || ep.path,
        method: ep.method || "GET",
        url: fullUrl,
        apiConfig: loadedConfig,
        selectedEndpoint: { api: apiName, path: ep.path, method: ep.method }
      });
      setSelectedEndpoint({ api: apiName, path: ep.path, method: ep.method });
      setInterfaceLoadError(null);
    } catch (err) {
      setInterfaceLoadError(`Failed to load: ${getErrorMessage(err)}`);
    }
  }, [apis, envVariablesMap, setInterfaceLoadError, updateNodeData, selectedNode.id]);

  const apiConfig = selectedNode.data.apiConfig as ApiRequestConfig | undefined;
  const retry = (selectedNode.data.retry as { enabled?: boolean; maxAttempts?: number; initialDelay?: number; maxDelay?: number }) || {};

  // Handle export apiConfig to JSON file
  const handleExport = useCallback(() => {
    if (!apiConfig) return;
    const json = JSON.stringify(apiConfig, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `api-config-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [apiConfig]);

  // Handle import apiConfig from JSON file
  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        // Validate basic structure
        if (typeof parsed.method !== 'string' || typeof parsed.url !== 'string') {
          alert('Invalid API config format');
          return;
        }
        updateNodeData(selectedNode.id, {
          method: parsed.method,
          url: parsed.url,
          headers: parsed.headers || [],
          params: parsed.params || [],
          bodyType: parsed.bodyType || 'none',
          body: parsed.body || {},
          auth: parsed.auth || { authType: 'none' },
          apiConfig: parsed,
        });
      } catch (err) {
        alert(`Import failed: ${getErrorMessage(err)}`);
      }
    };
    input.click();
  }, [updateNodeData, selectedNode.id]);

  // Handle config update from ApiRequestConfigPanel
  const handleConfigUpdate = useCallback((config: ApiRequestConfig) => {
    updateNodeData(selectedNode.id, {
      method: config.method,
      url: config.url,
      headers: keyValueToRecord(config.headers),
      params: keyValueToRecord(config.params),
      body: config.body.reqBody,
      bodyType: config.bodyType,
      apiConfig: config,
    });
  }, [updateNodeData, selectedNode.id]);

  return (
    <div className="space-y-4">
      <NodeHeader
        nodeType={selectedNode.type || "apiCall"}
        label={selectedNode.data.label as string || ""}
        onLabelChange={(label) => updateNodeData(selectedNode.id, { label })}
      />

      {/* Interface Selection */}
      <ConfigSection title="🌐 Load from Collection">
        <div className="space-y-2">
          <ConfigInput
            value={interfaceSearch}
            onChange={setInterfaceSearch}
            placeholder="Search by name or path..."
          />

          <div className="max-h-40 overflow-y-auto rounded border" style={{ borderColor: "var(--border-color)" }}>
            {apis.length === 0 ? (
              <div className="p-4 text-center text-xs" style={TEXT_MUTED_STYLE}>
                No APIs available. Load APIs from Settings.
              </div>
            ) : (
              apis.map((api, apiIndex: number) => {
                // Always include selected endpoint regardless of search
                const isSelectedApi = selectedEndpoint?.api === api.name;
                const selectedEpId = selectedEndpoint ? `${selectedEndpoint.path}-${selectedEndpoint.method}` : null;

                const filteredEndpoints = (api.endpoints || []).filter((ep) => {
                  if (!interfaceSearch) return true;
                  // Always show selected endpoint
                  const epId = `${ep.path}-${ep.method}`;
                  if (isSelectedApi && selectedEpId === epId) return true;
                  const search = interfaceSearch.toLowerCase();
                  const summaryMatch = (ep.summary || "").toLowerCase().includes(search);
                  const pathMatch = (ep.path || "").toLowerCase().includes(search);
                  const methodMatch = ep.method.toLowerCase().includes(search);
                  return summaryMatch || pathMatch || methodMatch;
                });
                if (filteredEndpoints.length === 0) return null;
                return (
                  <div key={`api-${apiIndex}-${api.name}`}>
                    <div
                      className="px-2 py-1 text-xs font-medium"
                      style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-primary)" }}
                    >
                      📁 {api.name} ({filteredEndpoints.length})
                    </div>
                    {filteredEndpoints.map((ep, epIndex) => {
                      const epId = `${ep.path}-${ep.method}`;
                      return (
                        <button
                          key={`ep-${apiIndex}-${epIndex}-${epId}`}
                          onClick={() => handleLoadEndpoint(api.name, ep.id || epId)}
                          className={`w-full px-2 py-1.5 text-xs text-left hover:opacity-80 ${isSelectedApi && selectedEpId === epId
                            ? "bg-blue-500/20"
                            : ""
                            }`}
                          style={{ color: "var(--text-primary)" }}
                        >
                          <span
                            className="inline-block w-12 text-center rounded mr-2"
                            style={{
                              backgroundColor: ep.method === "GET" ? "var(--success)" :
                                ep.method === "POST" ? "var(--accent)" :
                                  ep.method === "PUT" ? "var(--warning)" :
                                    ep.method === "DELETE" ? "var(--danger)" : "var(--bg-tertiary)",
                              color: "var(--text-inverse)",
                              fontSize: "10px",
                            }}
                          >
                            {ep.method}
                          </span>
                          {ep.summary || ep.path}
                        </button>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>

          {interfaceLoadError && (
            <div className="text-xs p-2 rounded" style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", color: "var(--danger)" }}>
              ⚠️ {interfaceLoadError}
            </div>
          )}
        </div>
      </ConfigSection>

      {/* Manual Configuration */}
       <ConfigSection title="⚙️ Request Configuration">
        <ApiRequestConfigPanel
          config={apiConfig || DEFAULT_API_CONFIG}
          onUpdate={handleConfigUpdate}
          currentEnv={currentEnvVariables}
          envVariablesMap={envVariablesMap}
          onUpdateVariable={onUpdateVariable}
          onToggleEnabled={onToggleVariableEnabled}
          onExport={handleExport}
          onImport={handleImport}
          inheritedKeys={new Set((currentEnvVariables || []).map(v => v.key))}
        />
      </ConfigSection>

      {/* Retry Configuration */}
      <ConfigSection title="🔄 Retry Settings" defaultOpen={false}>
        <ConfigCheckbox
          label="Enable auto-retry on failure"
          checked={retry.enabled || false}
          onChange={(enabled) => updateNodeData(selectedNode.id, {
            retry: { ...retry, enabled, maxAttempts: retry.maxAttempts || 3 }
          })}
        />

        {retry.enabled && (
          <div className="space-y-3 pl-4">
            <ConfigField label="Max attempts">
              <ConfigNumberInput
                value={retry.maxAttempts || 3}
                onChange={(maxAttempts) => updateNodeData(selectedNode.id, { retry: { ...retry, maxAttempts } })}
                min={1}
                max={10}
              />
            </ConfigField>
            <ConfigField label="Initial delay (ms)">
              <ConfigNumberInput
                value={retry.initialDelay || 1000}
                onChange={(initialDelay) => updateNodeData(selectedNode.id, { retry: { ...retry, initialDelay } })}
                min={100}
              />
            </ConfigField>
            <ConfigField label="Max delay (ms)">
              <ConfigNumberInput
                value={retry.maxDelay || 30000}
                onChange={(maxDelay) => updateNodeData(selectedNode.id, { retry: { ...retry, maxDelay } })}
                min={100}
              />
            </ConfigField>
          </div>
        )}
      </ConfigSection>

      {/* Delete */}
      <ConfigDeleteButton
        onDelete={() => updateNodeData(selectedNode.id, { __delete: true })}
      />
    </div>
  );
}

const TEXT_MUTED_STYLE = { color: "var(--text-muted)" };

// Default empty API config
const DEFAULT_API_CONFIG: ApiRequestConfig = {
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
