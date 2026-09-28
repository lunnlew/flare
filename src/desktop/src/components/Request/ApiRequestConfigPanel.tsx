/**
 * API Request Configuration Component
 * 复用 Request Builder 的配置组件 (HeadersPanel, BodyPanel, AuthPanel)
 */

import React, { useEffect } from "react";
import { HeadersPanel } from "./HeadersPanel";
import { BodyPanel } from "./BodyPanel";
import { ParamsPanel } from "./ParamsPanel";
import { AuthPanel } from "./AuthPanel";
import { EnvPanel } from "./EnvPanel";
import { AuthType, BodyType, KeyValue } from "../../constants/http";
import { substituteVariables } from "../../utils/string";
import { useSettingsStore } from "../../store";
import { useTranslation } from "../../utils/i18n";
import type { Variable } from "../../store/environmentStore";

export type { KeyValue } from "../../constants/http";

export interface ApiRequestConfig {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";
  url: string;
  templateUrl?: string; // Original URL with {{variable}} placeholders
  headers: KeyValue[];
  params: KeyValue[];
  bodyType: BodyType;
  body: {
    formData: KeyValue[];
    binaryFile: { name: string; size: number; content: string } | null;
    urlencodedData: KeyValue[];
    rawContentType: string;
    reqBody: string;
    graphqlQuery: string;
    graphqlVariables: string;
  };
  auth: {
    authType: AuthType;
    bearerToken?: string;
    bearerPrefix?: string;
    basicUsername?: string;
    basicPassword?: string;
    apiKeyName?: string;
    apiKeyValue?: string;
    apiKeyLocation?: "header" | "query";
    oauthConfig?: {
      callbackUrl: string;
      authUrl: string;
      accessTokenUrl: string;
      clientId: string;
      clientSecret: string;
      scope: string;
      tokenType: string;
      accessToken: string;
      refreshToken: string;
      state?: string;
    };
    awsAccessKey?: string;
    awsSecretKey?: string;
    awsRegion?: string;
    awsService?: string;
  };
  // Schema info for mock generation (from OpenAPI endpoint)
  parameterSchemas?: Record<string, Record<string, unknown>>; // paramName -> JSON Schema
  requestBodySchema?: Record<string, unknown>; // JSON Schema for request body
}

interface ApiRequestConfigPanelProps {
  config: ApiRequestConfig;
  onUpdate: (config: ApiRequestConfig) => void;
  currentEnv?: Variable[];
  envVariablesMap?: Record<string, string>;
  onUpdateVariable?: (key: string, value: string) => void;
  onDeleteVariable?: (key: string) => void;
  onToggleEnabled?: (key: string, enabled: boolean) => void;
  onExport?: () => void;
  onImport?: () => void;
  inheritedKeys?: Set<string>;
  showTabs?: {
    headers?: boolean;
    body?: boolean;
    auth?: boolean;
    params?: boolean;
    env?: boolean;
  };
}

type TabType = "params" | "headers" | "body" | "auth" | "env";

export function ApiRequestConfigPanel({
  config,
  onUpdate,
  currentEnv = [],
  envVariablesMap = {},
  onUpdateVariable,
  onDeleteVariable,
  onToggleEnabled,
  onExport,
  onImport,
  inheritedKeys,
  showTabs = { params: true, headers: true, body: true, auth: true, env: true },
}: ApiRequestConfigPanelProps) {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);

  const [activeTab, setActiveTab] = React.useState<TabType>("params");

  const updateConfig = <K extends keyof ApiRequestConfig>(key: K, value: ApiRequestConfig[K]) => {
    onUpdate({ ...config, [key]: value });
  };

  const updateAuth = <K extends keyof ApiRequestConfig["auth"]>(
    key: K,
    value: ApiRequestConfig["auth"][K]
  ) => {
    onUpdate({ ...config, auth: { ...config.auth, [key]: value } });
  };

  const updateBody = <K extends keyof ApiRequestConfig["body"]>(
    key: K,
    value: ApiRequestConfig["body"][K]
  ) => {
    onUpdate({ ...config, body: { ...config.body, [key]: value } });
  };

  const tabs: { key: TabType; label: string; count?: number }[] = [
    { key: "params" as TabType, label: t('request.params'), count: config.params.filter(p => p.enabled).length },
    { key: "headers" as TabType, label: t('request.headers'), count: config.headers.filter(h => h.enabled).length },
    { key: "body" as TabType, label: "Body" },
    { key: "auth" as TabType, label: t('request.auth') },
    { key: "env" as TabType, label: t('flow.environment') },
  ].filter(tab => {
    if (tab.key === "params") return showTabs.params;
    if (tab.key === "headers") return showTabs.headers;
    if (tab.key === "body") return showTabs.body;
    if (tab.key === "auth") return showTabs.auth;
    if (tab.key === "env") return showTabs.env;
    return true;
  });

  // Re-substitute URL when environment variables change
  const [displayUrl, setDisplayUrl] = React.useState(config.url);
  useEffect(() => {
    const template = config.templateUrl || config.url;
    const substituted = substituteVariables(template, envVariablesMap);
    setDisplayUrl(substituted);
  }, [envVariablesMap, config.templateUrl, config.url]);

  return (
    <div className="space-y-3">
      {/* Method + URL */}
      <div className="flex gap-2">
        <select
          value={config.method}
          onChange={(e) => updateConfig("method", e.target.value as ApiRequestConfig["method"])}
          className="px-2 py-1.5 rounded text-xs font-medium"
          style={{
            backgroundColor: "var(--bg-tertiary)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-color)",
          }}
        >
          {["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"].map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <input
          type="text"
          value={displayUrl}
          onChange={(e) => updateConfig("url", e.target.value)}
          placeholder="https://api.example.com/{{endpoint}}"
          className="flex-1 px-3 py-1.5 rounded text-xs font-mono"
          style={{
            backgroundColor: "var(--bg-primary)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-color)",
          }}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b" style={{ borderColor: "var(--border-color)" }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="px-3 py-1.5 text-xs font-medium relative"
            style={{
              color: activeTab === tab.key ? "var(--accent)" : "var(--text-muted)",
              borderBottom: activeTab === tab.key ? "2px solid var(--accent)" : "2px solid transparent",
            }}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span
                className="ml-1 px-1.5 py-0.5 rounded text-[10px]"
                style={{ backgroundColor: "var(--accent-muted)", color: "var(--accent)" }}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[200px]">
        {activeTab === "params" && showTabs.params && (
          <ParamsPanel
            params={config.params}
            setParams={(params) => updateConfig("params", params)}
            currentEnv={envVariablesMap}
            schemaMap={config.parameterSchemas}
          />
        )}

        {activeTab === "headers" && showTabs.headers && (
          <HeadersPanel
            headers={config.headers}
            setHeaders={(headers) => updateConfig("headers", headers)}
            currentEnv={envVariablesMap}
          />
        )}

        {activeTab === "body" && showTabs.body && (
          <BodyPanel
            bodyType={config.bodyType}
            setBodyType={(t) => updateConfig("bodyType" as any, t)}
            formData={config.body.formData}
            setFormData={(f) => updateBody("formData", f)}
            binaryFile={config.body.binaryFile}
            setBinaryFile={(f) => updateBody("binaryFile", f)}
            urlencodedData={config.body.urlencodedData}
            setUrlencodedData={(f) => updateBody("urlencodedData", f)}
            rawContentType={config.body.rawContentType}
            setRawContentType={(t) => updateBody("rawContentType", t)}
            reqBody={config.body.reqBody}
            setReqBody={(b) => updateBody("reqBody", b)}
            graphqlQuery={config.body.graphqlQuery}
            setGraphqlQuery={(q) => updateBody("graphqlQuery", q)}
            graphqlVariables={config.body.graphqlVariables}
            currentEnv={envVariablesMap}
            schemaMap={config.parameterSchemas}
          />
        )}

        {activeTab === "auth" && showTabs.auth && (
          <AuthPanel
            authType={config.auth.authType}
            setAuthType={(t) => updateAuth("authType", t)}
            bearerToken={config.auth.bearerToken}
            setBearerToken={(t) => updateAuth("bearerToken", t)}
            bearerPrefix={config.auth.bearerPrefix}
            setBearerPrefix={(t) => updateAuth("bearerPrefix", t)}
            basicUsername={config.auth.basicUsername}
            setBasicUsername={(t) => updateAuth("basicUsername", t)}
            basicPassword={config.auth.basicPassword}
            setBasicPassword={(t) => updateAuth("basicPassword", t)}
            apiKeyName={config.auth.apiKeyName}
            setApiKeyName={(t) => updateAuth("apiKeyName", t)}
            apiKeyValue={config.auth.apiKeyValue}
            setApiKeyValue={(t) => updateAuth("apiKeyValue", t)}
            apiKeyLocation={config.auth.apiKeyLocation}
            setApiKeyLocation={(t) => updateAuth("apiKeyLocation", t)}
            oauthConfig={config.auth.oauthConfig}
            setOauthConfig={(c) => updateAuth("oauthConfig", c)}
            awsAccessKey={config.auth.awsAccessKey}
            setAwsAccessKey={(t) => updateAuth("awsAccessKey", t)}
            awsSecretKey={config.auth.awsSecretKey}
            setAwsSecretKey={(t) => updateAuth("awsSecretKey", t)}
            awsRegion={config.auth.awsRegion}
            setAwsRegion={(t) => updateAuth("awsRegion", t)}
            awsService={config.auth.awsService}
            setAwsService={(t) => updateAuth("awsService", t)}
          />
        )}
        {activeTab === "env" && (
          <EnvPanel
            currentEnv={currentEnv || []}
            onUpdateVariable={onUpdateVariable || ((_: string, __: string) => {})}
            onDeleteVariable={onDeleteVariable || ((_: string) => {})}
            onToggleEnabled={onToggleEnabled}
            onExport={onExport || (() => {})}
            onImport={onImport || (() => {})}
            inheritedKeys={inheritedKeys}
          />
        )}
      </div>
    </div>
  );
}

// 默认配置工厂函数
export function createDefaultApiConfig(): ApiRequestConfig {
  return {
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
    auth: {
      authType: "none",
    },
  };
}

// 将 ApiRequestConfig 转换为执行引擎可用的格式
export function configToExecutionData(config: ApiRequestConfig): Record<string, unknown> {
  const { auth, body, ...rest } = config;

  // 构建 Auth 配置
  let authConfig: Record<string, unknown> = { type: auth.authType };
  switch (auth.authType) {
    case "bearer":
      authConfig.token = auth.bearerToken;
      authConfig.prefix = auth.bearerPrefix;
      break;
    case "basic":
      authConfig.username = auth.basicUsername;
      authConfig.password = auth.basicPassword;
      break;
    case "apiKey":
      authConfig.key = auth.apiKeyName;
      authConfig.value = auth.apiKeyValue;
      authConfig.location = auth.apiKeyLocation;
      break;
    case "oauth2":
      authConfig = { ...authConfig, ...auth.oauthConfig };
      break;
    case "aws":
      authConfig.accessKey = auth.awsAccessKey;
      authConfig.secretKey = auth.awsSecretKey;
      authConfig.region = auth.awsRegion;
      authConfig.service = auth.awsService;
      break;
  }

  // 构建 Body
  let bodyData: unknown;
  switch (config.bodyType) {
    case "form-data":
      bodyData = body.formData;
      break;
    case "x-www-form-urlencoded":
      bodyData = body.urlencodedData;
      break;
    case "raw":
      bodyData = body.reqBody;
      break;
    case "graphql":
      bodyData = { query: body.graphqlQuery, variables: body.graphqlVariables };
      break;
    case "binary":
      bodyData = body.binaryFile?.content;
      break;
    default:
      bodyData = undefined;
  }

  return {
    ...rest,
    body: bodyData,
    auth: authConfig,
  };
}
