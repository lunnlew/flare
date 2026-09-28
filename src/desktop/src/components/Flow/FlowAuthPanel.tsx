import { useEffect, useMemo } from "react";
import { ConfigSection } from "./nodes/NodeConfigBase";
import { useOAuthFlow, OAuthConfig } from "../../hooks/Flow/useOAuthFlow";
import { FlowVariableInput } from "./FlowVariableInput";
import { useSettingsStore } from "../../store";
import { useTranslation } from "../../utils/i18n";
import { DEFAULT_AWS_REGION } from "../Common/Auth/constants";

export type AuthType = "none" | "bearer" | "basic" | "apiKey" | "oauth2" | "aws";

export interface FlowAuthConfig {
  authType: AuthType;
  bearerToken?: string;
  bearerPrefix?: string;
  basicUsername?: string;
  basicPassword?: string;
  apiKeyName?: string;
  apiKeyValue?: string;
  apiKeyLocation?: "header" | "query";
  oauth2?: OAuthConfig;
  awsAccessKey?: string;
  awsSecretKey?: string;
  awsSessionToken?: string;
  awsRegion?: string;
  awsService?: string;
}

interface FlowAuthPanelProps {
  authConfig: FlowAuthConfig;
  onAuthConfigChange: (config: FlowAuthConfig) => void;
  envVariablesMap?: Record<string, string>;
}

const AUTH_TYPE_KEYS: AuthType[] = ["none", "bearer", "basic", "apiKey", "oauth2", "aws"];

const AWS_REGIONS = [
  { value: "us-east-1", label: "US East (N. Virginia)" },
  { value: "us-west-2", label: "US West (Oregon)" },
  { value: "us-west-1", label: "US West (N. California)" },
  { value: "eu-west-1", label: "EU (Ireland)" },
  { value: "eu-central-1", label: "EU (Frankfurt)" },
  { value: "ap-northeast-1", label: "Asia Pacific (Tokyo)" },
  { value: "ap-southeast-1", label: "Asia Pacific (Singapore)" },
  { value: "ap-southeast-2", label: "Asia Pacific (Sydney)" },
  { value: "ap-south-1", label: "Asia Pacific (Mumbai)" },
  { value: "sa-east-1", label: "South America (São Paulo)" },
];

export function FlowAuthPanel({ authConfig, onAuthConfigChange, envVariablesMap = {} }: FlowAuthPanelProps) {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);
  const { authType } = authConfig;

  const AUTH_TYPE_LABELS: Record<AuthType, string> = {
    none: t('flowauth.none'),
    bearer: "Bearer",
    basic: "Basic",
    apiKey: "API Key",
    oauth2: "OAuth 2.0",
    aws: "AWS",
  };

  const BEARER_PREFIXES = [
    { value: "Bearer", label: "Bearer" },
    { value: "JWT", label: "JWT" },
    { value: "BearerJWT", label: "BearerJWT" },
    { value: "Token", label: "Token" },
    { value: "Custom", label: t('flowauth.custom') },
  ];

  // Memoize OAuth config to prevent unnecessary recreations
  const oauthConfig = useMemo(() => authConfig.oauth2 || {
    callbackUrl: "",
    authUrl: "",
    accessTokenUrl: "",
    clientId: "",
    clientSecret: "",
    scope: "",
    tokenType: "Bearer",
    accessToken: "",
    refreshToken: "",
    clientAuthentication: "header" as const,
  }, [authConfig.oauth2]);

  // Create stable OAuth flow hook - always call unconditionally
  const oauthFlow = useOAuthFlow({
    oauthConfig,
    onOauthConfigChange: (newConfig) => {
      onAuthConfigChange({ ...authConfig, oauth2: newConfig });
    },
  });

  // Reset OAuth status when switching nodes (when accessToken changes)
  useEffect(() => {
    if (oauthConfig.accessToken && oauthFlow.oauthStatus !== "authorized") {
      // If node has an accessToken, mark as authorized
    }
  }, [oauthConfig.accessToken]);

  const updateConfig = <K extends keyof FlowAuthConfig>(key: K, value: FlowAuthConfig[K]) => {
    onAuthConfigChange({ ...authConfig, [key]: value });
  };

  return (
    <div className="space-y-4">
      {/* Auth Type Selector */}
      <ConfigSection title="🔐 Authentication Type">
        <div className="flex gap-2 flex-wrap">
          {AUTH_TYPE_KEYS.map((type) => (
            <button
              key={type}
              onClick={() => updateConfig("authType", type)}
              className="px-2 py-1 text-xs rounded"
              style={
                authType === type
                  ? { backgroundColor: "var(--accent-muted)", color: "var(--accent)" }
                  : { backgroundColor: "var(--bg-tertiary)", color: "var(--text-muted)" }
              }
            >
              {AUTH_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </ConfigSection>

      {/* Bearer Token */}
      {authType === "bearer" && (
        <ConfigSection title="🎫 Bearer Token">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <select
                value={BEARER_PREFIXES.some((p) => p.value === authConfig.bearerPrefix) ? authConfig.bearerPrefix || "Bearer" : "Custom"}
                onChange={(e) => updateConfig("bearerPrefix", e.target.value)}
                className="px-2 py-1 rounded text-xs"
                style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }}
              >
                {BEARER_PREFIXES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
              {!BEARER_PREFIXES.some((p) => p.value === authConfig.bearerPrefix) && authConfig.bearerPrefix && (
                <input
                  type="text"
                  value={authConfig.bearerPrefix}
                  onChange={(e) => updateConfig("bearerPrefix", e.target.value)}
                  placeholder={t('flowauth.inputCustomPrefix')}
                  className="w-24 px-2 py-1 rounded text-xs"
                  style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }}
                />
              )}
            </div>
            <FlowVariableInput
              value={authConfig.bearerToken || ""}
              onChange={(v) => updateConfig("bearerToken", v)}
              placeholder="{{env.token}} or raw token"
              currentEnv={envVariablesMap}
            />
          </div>
        </ConfigSection>
      )}

      {/* Basic Auth */}
      {authType === "basic" && (
        <ConfigSection title="🔑 Basic Auth Credentials">
          <div className="grid grid-cols-2 gap-2">
            <FlowVariableInput
              value={authConfig.basicUsername || ""}
              onChange={(v) => updateConfig("basicUsername", v)}
              placeholder={t('flowauth.username')}
              currentEnv={envVariablesMap}
            />
            <FlowVariableInput
              value={authConfig.basicPassword || ""}
              onChange={(v) => updateConfig("basicPassword", v)}
              placeholder={t('flowauth.password')}
              currentEnv={envVariablesMap}
            />
          </div>
        </ConfigSection>
      )}

      {/* API Key */}
      {authType === "apiKey" && (
        <ConfigSection title="🔑 API Key">
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <FlowVariableInput
                value={authConfig.apiKeyName || ""}
                onChange={(v) => updateConfig("apiKeyName", v)}
                placeholder={t('auth.keyNamePlaceholder')}
                currentEnv={envVariablesMap}
              />
              <select
                value={authConfig.apiKeyLocation || "header"}
                onChange={(e) => updateConfig("apiKeyLocation", e.target.value as "header" | "query")}
                className="px-2 py-1 rounded text-xs"
                style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }}
              >
                <option value="header">Header</option>
                <option value="query">Query</option>
              </select>
            </div>
            <FlowVariableInput
              value={authConfig.apiKeyValue || ""}
              onChange={(v) => updateConfig("apiKeyValue", v)}
              placeholder="API Key Value"
              currentEnv={envVariablesMap}
            />
          </div>
        </ConfigSection>
      )}

      {/* OAuth 2.0 */}
      {authType === "oauth2" && (
        <ConfigSection title="🔐 OAuth 2.0">
          <div className="space-y-3">
            {/* OAuth Configuration Fields */}
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={oauthConfig.callbackUrl}
                onChange={(e) => oauthFlow.handleOauthConfigChange?.({ callbackUrl: e.target.value })}
                placeholder="Callback URL"
                className="px-2 py-1 rounded text-xs"
                style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }}
              />
              <input
                type="text"
                value={oauthConfig.authUrl}
                onChange={(e) => oauthFlow.handleOauthConfigChange?.({ authUrl: e.target.value })}
                placeholder="Auth URL"
                className="px-2 py-1 rounded text-xs"
                style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={oauthConfig.accessTokenUrl}
                onChange={(e) => oauthFlow.handleOauthConfigChange?.({ accessTokenUrl: e.target.value })}
                placeholder="Access Token URL"
                className="px-2 py-1 rounded text-xs"
                style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }}
              />
              <input
                type="text"
                value={oauthConfig.tokenType}
                onChange={(e) => oauthFlow.handleOauthConfigChange?.({ tokenType: e.target.value })}
                placeholder={t('auth.tokenTypeDefault')}
                className="px-2 py-1 rounded text-xs"
                style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={oauthConfig.clientId}
                onChange={(e) => oauthFlow.handleOauthConfigChange?.({ clientId: e.target.value })}
                placeholder="Client ID"
                className="px-2 py-1 rounded text-xs"
                style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }}
              />
              <input
                type="password"
                value={oauthConfig.clientSecret}
                onChange={(e) => oauthFlow.handleOauthConfigChange?.({ clientSecret: e.target.value })}
                placeholder="Client Secret"
                className="px-2 py-1 rounded text-xs"
                style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }}
              />
            </div>
            <input
              type="text"
              value={oauthConfig.scope}
              onChange={(e) => oauthFlow.handleOauthConfigChange?.({ scope: e.target.value })}
              placeholder={t('auth.scopeSpaceSeparated')}
              className="w-full px-2 py-1 rounded text-xs"
              style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }}
            />
            <div className="flex items-center gap-2">
              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Client Auth:</span>
              <select
                value={oauthConfig.clientAuthentication || "header"}
                onChange={(e) => oauthFlow.handleOauthConfigChange?.({ clientAuthentication: e.target.value as "header" | "body" | "none" })}
                className="px-2 py-1 rounded text-xs"
                style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }}
              >
                <option value="header">Header (Basic Auth)</option>
                <option value="body">Body</option>
                <option value="none">None</option>
              </select>
            </div>
            <FlowVariableInput
              value={oauthConfig.accessToken}
              onChange={(v) => oauthFlow.handleOauthConfigChange?.({ accessToken: v })}
              placeholder="Access Token"
              currentEnv={envVariablesMap}
            />
            <div className="flex gap-2">
              <button
                onClick={oauthFlow.handleClientCredentials}
                className="px-3 py-1.5 rounded text-xs"
                style={{ backgroundColor: "var(--accent)", color: "var(--text-inverse)" }}
              >
                {t('flowauth.getToken')}
              </button>
              {oauthConfig.accessToken && (
                <button
                  onClick={() => navigator.clipboard.writeText(oauthConfig.accessToken)}
                  className="px-2 py-1.5 rounded text-xs"
                  style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-muted)" }}
                >
                  {t('flowauth.copy')}
                </button>
              )}
            </div>
          </div>
        </ConfigSection>
      )}

      {/* AWS Signature */}
      {authType === "aws" && (
        <ConfigSection title="☁️ AWS Signature">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <FlowVariableInput
                value={authConfig.awsAccessKey || ""}
                onChange={(v) => updateConfig("awsAccessKey", v)}
                placeholder="Access Key ID"
                currentEnv={envVariablesMap}
              />
              <FlowVariableInput
                value={authConfig.awsSecretKey || ""}
                onChange={(v) => updateConfig("awsSecretKey", v)}
                placeholder="Secret Access Key"
                currentEnv={envVariablesMap}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={authConfig.awsRegion || DEFAULT_AWS_REGION}
                onChange={(e) => updateConfig("awsRegion", e.target.value)}
                className="px-2 py-1 rounded text-xs"
                style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }}
              >
                {AWS_REGIONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <FlowVariableInput
                value={authConfig.awsService || ""}
                onChange={(v) => updateConfig("awsService", v)}
                placeholder={t('auth.serviceNamePlaceholder')}
                currentEnv={envVariablesMap}
              />
            </div>
            <FlowVariableInput
              value={authConfig.awsSessionToken || ""}
              onChange={(v) => updateConfig("awsSessionToken", v)}
              placeholder={t('auth.sessionTokenPlaceholder')}
              currentEnv={envVariablesMap}
            />
          </div>
        </ConfigSection>
      )}
    </div>
  );
}