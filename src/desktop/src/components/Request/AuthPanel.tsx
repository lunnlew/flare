import { useCallback, useRef } from "react";
import { useRequestStore, useRequestState, useUIStore, useSecureStore, useSettingsStore } from "../../store";
import { useTranslation } from "../../utils/i18n";
import { AuthType } from "../../constants/http";
import { DEFAULT_AWS_REGION } from "../Common/Auth/constants";
import type { OAuthStatus } from "../../hooks/OAuth/useOAuth";
import { getOAuthConfigId } from "../../store/secureStore";
import { Spinner } from "../Common/Spinner";
import { isAbortError, getErrorMessage } from "../../utils/string";

interface AuthPanelProps {
  // Prop-based mode (for ApiRequestConfigPanel)
  authType?: AuthType;
  setAuthType?: (t: AuthType) => void;
  bearerToken?: string;
  setBearerToken?: (t: string) => void;
  bearerPrefix?: string;
  setBearerPrefix?: (t: string) => void;
  basicUsername?: string;
  setBasicUsername?: (t: string) => void;
  basicPassword?: string;
  setBasicPassword?: (t: string) => void;
  apiKeyName?: string;
  setApiKeyName?: (t: string) => void;
  apiKeyValue?: string;
  setApiKeyValue?: (t: string) => void;
  apiKeyLocation?: "header" | "query";
  setApiKeyLocation?: (t: "header" | "query") => void;
  oauthConfig?: { callbackUrl: string; authUrl: string; accessTokenUrl: string; clientId: string; clientSecret: string; scope: string; tokenType: string; accessToken: string; refreshToken: string; state?: string; clientAuthentication?: "header" | "body" | "none" };
  setOauthConfig?: (c: AuthPanelProps['oauthConfig']) => void;
  awsAccessKey?: string;
  setAwsAccessKey?: (t: string) => void;
  awsSecretKey?: string;
  setAwsSecretKey?: (t: string) => void;
  awsSessionToken?: string;
  setAwsSessionToken?: (t: string) => void;
  awsRegion?: string;
  setAwsRegion?: (t: string) => void;
  awsService?: string;
  setAwsService?: (t: string) => void;
}

export function AuthPanel(props: AuthPanelProps = {}) {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);
  // Abort controller for OAuth requests
  const abortControllerRef = useRef<AbortController | null>(null);

  const {
    authType: propAuthType,
    setAuthType: propSetAuthType,
    bearerToken: propBearerToken,
    setBearerToken: propSetBearerToken,
    bearerPrefix: propBearerPrefix,
    setBearerPrefix: propSetBearerPrefix,
    basicUsername: propBasicUsername,
    setBasicUsername: propSetBasicUsername,
    basicPassword: propBasicPassword,
    setBasicPassword: propSetBasicPassword,
    apiKeyName: propApiKeyName,
    setApiKeyName: propSetApiKeyName,
    apiKeyValue: propApiKeyValue,
    setApiKeyValue: propSetApiKeyValue,
    apiKeyLocation: propApiKeyLocation,
    setApiKeyLocation: propSetApiKeyLocation,
    oauthConfig: propOauthConfig,
    setOauthConfig: propSetOauthConfig,
    awsAccessKey: propAwsAccessKey,
    setAwsAccessKey: propSetAwsAccessKey,
    awsSecretKey: propAwsSecretKey,
    setAwsSecretKey: propSetAwsSecretKey,
    awsSessionToken: propAwsSessionToken,
    setAwsSessionToken: propSetAwsSessionToken,
    awsRegion: propAwsRegion,
    setAwsRegion: propSetAwsRegion,
    awsService: propAwsService,
    setAwsService: propSetAwsService,
  } = props;

  // Store-based state (no-props mode)
  const requestState = useRequestState();
  const setRequestState = useRequestStore((s) => s.setRequestState);

  // Determine which mode we're in
  const isPropMode = propAuthType !== undefined;

  // Store-based values
  const storeAuthType = requestState.authType as AuthType;
  const storeBearerToken = requestState.bearerToken;
  const storeBearerPrefix = requestState.bearerPrefix;
  const storeBasicUsername = requestState.basicUsername;
  const storeBasicPassword = requestState.basicPassword;
  const storeApiKeyName = requestState.apiKeyName;
  const storeApiKeyValue = requestState.apiKeyValue;
  const storeApiKeyLocation = requestState.apiKeyLocation as "header" | "query";
  const storeOauthConfig = {
    callbackUrl: "",
    authUrl: requestState.oauth2AuthUrl,
    accessTokenUrl: requestState.oauth2AccessTokenUrl,
    tokenType: requestState.oauth2TokenType,
    clientId: requestState.oauth2ClientId,
    clientSecret: requestState.oauth2ClientSecret,
    scope: requestState.oauth2Scope,
    accessToken: requestState.oauth2AccessToken,
    refreshToken: requestState.oauth2RefreshToken,
    state: "",
    clientAuthentication: requestState.oauth2ClientAuthentication,
  };
  const storeAwsAccessKey = requestState.awsAccessKey;
  const storeAwsSecretKey = requestState.awsSecretKey;
  const storeAwsSessionToken = requestState.awsSessionToken;
  const storeAwsRegion = requestState.awsRegion;
  const storeAwsService = requestState.awsService;

  // Store-based setters
  const storeSetAuthType = useCallback((t: AuthType) => setRequestState({ authType: t }), [setRequestState]);
  const storeSetBearerToken = useCallback((t: string) => setRequestState({ bearerToken: t }), [setRequestState]);
  const storeSetBearerPrefix = useCallback((t: string) => setRequestState({ bearerPrefix: t }), [setRequestState]);
  const storeSetBasicUsername = useCallback((t: string) => setRequestState({ basicUsername: t }), [setRequestState]);
  const storeSetBasicPassword = useCallback((t: string) => setRequestState({ basicPassword: t }), [setRequestState]);
  const storeSetApiKeyName = useCallback((t: string) => setRequestState({ apiKeyName: t }), [setRequestState]);
  const storeSetApiKeyValue = useCallback((t: string) => setRequestState({ apiKeyValue: t }), [setRequestState]);
  const storeSetApiKeyLocation = useCallback((t: "header" | "query") => setRequestState({ apiKeyLocation: t }), [setRequestState]);
  const storeSetOauthConfig = useCallback((c: NonNullable<AuthPanelProps['oauthConfig']>) => setRequestState({
    oauth2AuthUrl: c.authUrl || "",
    oauth2AccessTokenUrl: c.accessTokenUrl || "",
    oauth2TokenType: c.tokenType || "Bearer",
    oauth2ClientId: c.clientId || "",
    oauth2ClientSecret: c.clientSecret || "",
    oauth2Scope: c.scope || "",
    oauth2AccessToken: c.accessToken || "",
    oauth2RefreshToken: c.refreshToken || "",
    oauth2ClientAuthentication: c.clientAuthentication || "header",
  }), [setRequestState]);
  const storeSetAwsAccessKey = useCallback((t: string) => setRequestState({ awsAccessKey: t }), [setRequestState]);
  const storeSetAwsSecretKey = useCallback((t: string) => setRequestState({ awsSecretKey: t }), [setRequestState]);
  const storeSetAwsSessionToken = useCallback((t: string) => setRequestState({ awsSessionToken: t }), [setRequestState]);
  const storeSetAwsRegion = useCallback((t: string) => setRequestState({ awsRegion: t }), [setRequestState]);
  const storeSetAwsService = useCallback((t: string) => setRequestState({ awsService: t }), [setRequestState]);

  // Active values
  const authType = isPropMode ? propAuthType! : storeAuthType;
  const bearerToken = isPropMode ? propBearerToken! : storeBearerToken;
  const bearerPrefix = isPropMode ? propBearerPrefix! : storeBearerPrefix;
  const basicUsername = isPropMode ? propBasicUsername! : storeBasicUsername;
  const basicPassword = isPropMode ? propBasicPassword! : storeBasicPassword;
  const apiKeyName = isPropMode ? propApiKeyName! : storeApiKeyName;
  const apiKeyValue = isPropMode ? propApiKeyValue! : storeApiKeyValue;
  const apiKeyLocation = isPropMode ? propApiKeyLocation! : storeApiKeyLocation;
  const oauthConfig = isPropMode ? propOauthConfig! : storeOauthConfig;
  const awsAccessKey = isPropMode ? propAwsAccessKey! : storeAwsAccessKey;
  const awsSecretKey = isPropMode ? propAwsSecretKey! : storeAwsSecretKey;
  const awsSessionToken = isPropMode ? propAwsSessionToken! : storeAwsSessionToken;
  const awsRegion = isPropMode ? propAwsRegion! : storeAwsRegion;
  const awsService = isPropMode ? propAwsService! : storeAwsService;

  // Active setters
  const setAuthType = isPropMode ? propSetAuthType! : storeSetAuthType;
  const setBearerToken = isPropMode ? propSetBearerToken! : storeSetBearerToken;
  const setBearerPrefix = isPropMode ? propSetBearerPrefix! : storeSetBearerPrefix;
  const setBasicUsername = isPropMode ? propSetBasicUsername! : storeSetBasicUsername;
  const setBasicPassword = isPropMode ? propSetBasicPassword! : storeSetBasicPassword;
  const setApiKeyName = isPropMode ? propSetApiKeyName! : storeSetApiKeyName;
  const setApiKeyValue = isPropMode ? propSetApiKeyValue! : storeSetApiKeyValue;
  const setApiKeyLocation = isPropMode ? propSetApiKeyLocation! : storeSetApiKeyLocation;
  const setOauthConfig = isPropMode ? propSetOauthConfig! : storeSetOauthConfig;
  const setAwsAccessKey = isPropMode ? propSetAwsAccessKey! : storeSetAwsAccessKey;
  const setAwsSecretKey = isPropMode ? propSetAwsSecretKey! : storeSetAwsSecretKey;
  const setAwsSessionToken = isPropMode ? propSetAwsSessionToken! : storeSetAwsSessionToken;
  const setAwsRegion = isPropMode ? propSetAwsRegion! : storeSetAwsRegion;
  const setAwsService = isPropMode ? propSetAwsService! : storeSetAwsService;

  // OAuth UI state from uiStore (not persisted - migrated from requestStore)
  const oauthStatus = useUIStore((s) => s.oauthStatus) as OAuthStatus;
  const oauthError = useUIStore((s) => s.oauthError);
  const codeInput = useUIStore((s) => s.oauthCode);
  const setOauthStatus = useUIStore((s) => s.setOauthStatus);
  const setOauthError = useUIStore((s) => s.setOauthError);
  const setCodeInput = useUIStore((s) => s.setOauthCode);
  const oauthGrantType = useUIStore((s) => s.oauthGrantType);
  const setOauthGrantType = useUIStore((s) => s.setOauthGrantType);

  // Secure store for encrypted OAuth tokens
  const saveOAuthToken = useSecureStore.getState().saveOAuthToken;

  // Helper to save OAuth token securely
  const saveOAuthTokenSecurely = useCallback(async (tokens: { accessToken: string; refreshToken?: string; tokenType?: string }) => {
    if (oauthConfig?.clientId && oauthConfig?.accessTokenUrl) {
      const configId = getOAuthConfigId(oauthConfig.clientId, oauthConfig.accessTokenUrl);
      await saveOAuthToken(configId, {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken || "",
        tokenType: tokens.tokenType || "Bearer",
      });
    }
  }, [oauthConfig, saveOAuthToken]);

  // Generate random state for OAuth security
  const generateState = () => Math.random().toString(36).substring(2, 15);

  // Build authorization URL
  const buildAuthUrl = () => {
    if (!oauthConfig?.authUrl || !oauthConfig?.clientId || !oauthConfig?.callbackUrl) return null;
    const params = new URLSearchParams({
      response_type: "code",
      client_id: oauthConfig.clientId,
      redirect_uri: oauthConfig.callbackUrl,
      scope: oauthConfig.scope || "read write",
      state: oauthConfig.state || generateState(),
    });
    return `${oauthConfig.authUrl.includes('?') ? oauthConfig.authUrl : oauthConfig.authUrl + '?'}${params.toString()}`;
  };

  // Handle OAuth authorization - opens auth URL in browser
  const handleGetToken = async () => {
    const authUrl = buildAuthUrl();
    if (!authUrl) {
      setOauthError(t('auth.fillCompleteOAuth'));
      setOauthStatus("error");
      return;
    }
    setOauthStatus("authorizing");
    setOauthError("");
    try {
      window.open(authUrl, "_blank");
    } catch {
      setOauthError(t('auth.cannotOpenBrowser') + authUrl);
      setOauthStatus("error");
    }
  };

  // Exchange authorization code for access token
  const handleExchangeCode = async () => {
    if (!codeInput.trim() || !oauthConfig?.accessTokenUrl || !oauthConfig?.clientId || !oauthConfig?.clientSecret) {
      setOauthError(t('auth.enterAuthCode'));
      return;
    }
    // Cancel any existing request
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    try {
      const headers: Record<string, string> = { "Content-Type": "application/x-www-form-urlencoded" };
      const bodyParams: Record<string, string> = {
        grant_type: "authorization_code",
        code: codeInput.trim(),
        redirect_uri: oauthConfig.callbackUrl,
        client_id: oauthConfig.clientId,
        client_secret: oauthConfig.clientSecret,
      };

      // Apply client authentication method
      if (oauthConfig.clientAuthentication === "header") {
        const credentials = btoa(`${oauthConfig.clientId}:${oauthConfig.clientSecret}`);
        headers["Authorization"] = `Basic ${credentials}`;
        // Remove client_id and client_secret from body when using header auth
        delete bodyParams.client_id;
        delete bodyParams.client_secret;
      } else if (oauthConfig.clientAuthentication === "none") {
        // Don't send client credentials at all
        delete bodyParams.client_id;
        delete bodyParams.client_secret;
      }
      // "body" is the default - credentials stay in body

      const response = await fetch(oauthConfig.accessTokenUrl, {
        method: "POST",
        headers,
        body: new URLSearchParams(bodyParams),
        signal: abortControllerRef.current.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data.access_token) {
        setOauthConfig({ ...oauthConfig, accessToken: data.access_token, refreshToken: data.refresh_token || oauthConfig.refreshToken, tokenType: data.token_type || "Bearer" });
        setOauthStatus("authorized");
        setCodeInput("");
        // Save to encrypted storage
        await saveOAuthTokenSecurely({ accessToken: data.access_token, refreshToken: data.refresh_token, tokenType: data.token_type });
      } else {
        throw new Error("No access_token in response");
      }
    } catch (err) {
      if (isAbortError(err)) return;
      setOauthError(t('auth.tokenExchangeFailed') + getErrorMessage(err));
      setOauthStatus("error");
    }
  };

  // Refresh access token using refresh token
  const handleRefreshToken = async () => {
    if (!oauthConfig?.refreshToken || !oauthConfig?.accessTokenUrl || !oauthConfig?.clientId || !oauthConfig?.clientSecret) {
      setOauthError(t('auth.configureRefreshToken'));
      return;
    }
    // Cancel any existing request
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    try {
      const headers: Record<string, string> = { "Content-Type": "application/x-www-form-urlencoded" };
      const bodyParams: Record<string, string> = {
        grant_type: "refresh_token",
        refresh_token: oauthConfig.refreshToken,
        client_id: oauthConfig.clientId,
        client_secret: oauthConfig.clientSecret,
      };

      // Apply client authentication method
      if (oauthConfig.clientAuthentication === "header") {
        const credentials = btoa(`${oauthConfig.clientId}:${oauthConfig.clientSecret}`);
        headers["Authorization"] = `Basic ${credentials}`;
        delete bodyParams.client_id;
        delete bodyParams.client_secret;
      } else if (oauthConfig.clientAuthentication === "none") {
        delete bodyParams.client_id;
        delete bodyParams.client_secret;
      }

      const response = await fetch(oauthConfig.accessTokenUrl, {
        method: "POST",
        headers,
        body: new URLSearchParams(bodyParams),
        signal: abortControllerRef.current.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data.access_token) {
        setOauthConfig({ ...oauthConfig, accessToken: data.access_token, refreshToken: data.refresh_token || oauthConfig.refreshToken });
        setOauthStatus("authorized");
        // Save to encrypted storage
        await saveOAuthTokenSecurely({ accessToken: data.access_token, refreshToken: data.refresh_token });
      } else {
        throw new Error("No access_token in response");
      }
    } catch (err) {
      if (isAbortError(err)) return;
      setOauthError(t('auth.refreshFailed') + getErrorMessage(err));
      setOauthStatus("error");
    }
  };

  // Clear OAuth token
  const handleClearToken = () => {
    setOauthConfig({ ...oauthConfig, accessToken: "", refreshToken: "" });
    setOauthStatus("idle");
    setOauthError("");
  };

  // Client Credentials grant type - direct token request
  const handleClientCredentials = async () => {
    if (!oauthConfig?.accessTokenUrl || !oauthConfig?.clientId || !oauthConfig?.clientSecret) {
      setOauthError(t('auth.fillCompleteToken'));
      setOauthStatus("error");
      return;
    }
    // Cancel any existing request
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    setOauthStatus("authorizing");
    setOauthError("");
    try {
      const headers: Record<string, string> = { "Content-Type": "application/x-www-form-urlencoded" };
      const bodyParams: Record<string, string> = {
        grant_type: "client_credentials",
        client_id: oauthConfig.clientId,
        client_secret: oauthConfig.clientSecret,
      };

      // Apply client authentication method
      if (oauthConfig.clientAuthentication === "header") {
        const credentials = btoa(`${oauthConfig.clientId}:${oauthConfig.clientSecret}`);
        headers["Authorization"] = `Basic ${credentials}`;
        delete bodyParams.client_id;
        delete bodyParams.client_secret;
      } else if (oauthConfig.clientAuthentication === "none") {
        delete bodyParams.client_id;
        delete bodyParams.client_secret;
      }
      // "body" is the default - credentials stay in body

      const response = await fetch(oauthConfig.accessTokenUrl, {
        method: "POST",
        headers,
        body: new URLSearchParams(bodyParams),
        signal: abortControllerRef.current.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data.access_token) {
        setOauthConfig({ ...oauthConfig, accessToken: data.access_token, refreshToken: data.refresh_token || oauthConfig.refreshToken, tokenType: data.token_type || "Bearer" });
        setOauthStatus("authorized");
        // Save to encrypted storage
        await saveOAuthTokenSecurely({ accessToken: data.access_token, refreshToken: data.refresh_token, tokenType: data.token_type });
      } else {
        throw new Error("No access_token in response");
      }
    } catch (err) {
      if (isAbortError(err)) return;
      setOauthError(t('auth.clientCredentialsFailed') + getErrorMessage(err));
      setOauthStatus("error");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">{(["none", "bearer", "basic", "apiKey", "oauth2", "aws"] as AuthType[]).map(authKey => (
        <button key={authKey} onClick={() => setAuthType(authKey)} className="px-2 py-1 text-xs rounded" style={authType === authKey ? { backgroundColor: 'var(--accent-muted)', color: 'var(--accent)' } : { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
          {authKey === "none" ? t('auth.none') : authKey === "bearer" ? "Bearer" : authKey === "basic" ? "Basic" : authKey === "apiKey" ? "API Key" : authKey === "oauth2" ? "OAuth 2.0" : "AWS"}
        </button>
      ))}</div>
      {authType === "bearer" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <select
              value={["Bearer", "JWT", "BearerJWT", "Token"].includes(bearerPrefix || "Bearer") ? bearerPrefix || "Bearer" : "Custom"}
              onChange={e => setBearerPrefix(e.target.value)}
              className="px-2 py-1 rounded text-xs"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
            >
              <option value="Bearer">Bearer</option>
              <option value="JWT">JWT</option>
              <option value="BearerJWT">BearerJWT</option>
              <option value="Token">Token</option>
              <option value="Custom">{t('auth.custom')}</option>
            </select>
            {!["Bearer", "JWT", "BearerJWT", "Token"].includes(bearerPrefix || "Bearer") && bearerPrefix && (
              <input type="text" value={bearerPrefix} onChange={e => setBearerPrefix(e.target.value)} placeholder={t('auth.customPrefix')} className="w-24 px-2 py-1 rounded text-xs" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} />
            )}
            <input type="text" value={bearerToken || ""} onChange={e => setBearerToken(e.target.value)} placeholder="Token" className="flex-1 px-3 py-1.5 rounded text-xs" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} />
          </div>
        </div>
      )}
      {authType === "basic" && (
        <div className="grid grid-cols-2 gap-2">
          <input type="text" value={basicUsername || ""} onChange={e => setBasicUsername(e.target.value)} placeholder={t('auth.username')} className="px-2 py-1 rounded text-xs" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} />
          <div className="relative">
            <input id="basic-password" type="password" value={basicPassword || ""} onChange={e => setBasicPassword(e.target.value)} placeholder={t('auth.password')} className="w-full px-2 py-1 rounded text-xs pr-8" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} />
            <button type="button" onClick={() => { const input = document.querySelector('#basic-password') as HTMLInputElement; if (input) input.type = input.type === 'password' ? 'text' : 'password'; }} className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-xs" style={{ color: 'var(--text-muted)' }}>👁</button>
          </div>
        </div>
      )}
      {authType === "apiKey" && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input type="text" value={apiKeyName || "X-API-Key"} onChange={e => setApiKeyName(e.target.value)} placeholder="Key Name" className="px-2 py-1 rounded text-xs" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} />
            <select value={apiKeyLocation || "header"} onChange={e => setApiKeyLocation(e.target.value as "header" | "query")} className="px-2 py-1 rounded text-xs" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
              <option value="header">Header</option>
              <option value="query">Query</option>
            </select>
          </div>
          <input type="text" value={apiKeyValue || ""} onChange={e => setApiKeyValue(e.target.value)} placeholder="Value" className="w-full px-3 py-1.5 rounded text-xs" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} />
        </div>
      )}
      {authType === "oauth2" && oauthConfig && setOauthConfig && (
        <div className="space-y-3">
          {oauthGrantType === 'authorization_code' && (
            <div className="grid grid-cols-2 gap-2">
              <input type="text" value={oauthConfig.callbackUrl} onChange={e => setOauthConfig({ ...oauthConfig, callbackUrl: e.target.value })} placeholder="Callback URL" className="px-2 py-1 rounded text-xs" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} />
              <input type="text" value={oauthConfig.authUrl} onChange={e => setOauthConfig({ ...oauthConfig, authUrl: e.target.value })} placeholder="Auth URL" className="px-2 py-1 rounded text-xs" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <input type="text" value={oauthConfig.accessTokenUrl} onChange={e => setOauthConfig({ ...oauthConfig, accessTokenUrl: e.target.value })} placeholder="Access Token URL" className="px-2 py-1 rounded text-xs" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} />
            <input type="text" value={oauthConfig.tokenType} onChange={e => setOauthConfig({ ...oauthConfig, tokenType: e.target.value })} placeholder={t('auth.tokenTypeDefault')} className="px-2 py-1 rounded text-xs" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input type="text" value={oauthConfig.clientId} onChange={e => setOauthConfig({ ...oauthConfig, clientId: e.target.value })} placeholder="Client ID" className="px-2 py-1 rounded text-xs" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} />
            <input type="password" value={oauthConfig.clientSecret} onChange={e => setOauthConfig({ ...oauthConfig, clientSecret: e.target.value })} placeholder="Client Secret" className="px-2 py-1 rounded text-xs" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} />
          </div>
          <input type="text" value={oauthConfig.scope} onChange={e => setOauthConfig({ ...oauthConfig, scope: e.target.value })} placeholder={t('auth.scopeSpaceSeparated')} className="w-full px-2 py-1 rounded text-xs" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} />
          <div className="flex items-center gap-2">
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Client Auth:</span>
            <select
              value={oauthConfig.clientAuthentication || 'header'}
              onChange={e => setOauthConfig({ ...oauthConfig, clientAuthentication: e.target.value as 'header' | 'body' | 'none' })}
              className="px-2 py-1 rounded text-xs"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
            >
              <option value="header">Header (Basic Auth)</option>
              <option value="body">Body</option>
              <option value="none">None</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Grant Type:</span>
            <select
              value={oauthGrantType || 'authorization_code'}
              onChange={e => {
                setOauthGrantType(e.target.value as 'authorization_code' | 'client_credentials');
                if (e.target.value === 'client_credentials') {
                  setOauthStatus("idle");
                }
              }}
              className="px-2 py-1 rounded text-xs"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
            >
              <option value="authorization_code">Authorization Code</option>
              <option value="client_credentials">Client Credentials</option>
            </select>
          </div>

          {/* OAuth Status UI */}
          {oauthStatus === "authorized" && oauthConfig.accessToken ? (
            <div className="p-3 rounded" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--success)' }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium" style={{ color: 'var(--success)' }}>{t('auth.authorized')}</span>
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{oauthConfig.tokenType || 'Bearer'} · {oauthConfig.accessToken.length} {t('auth.characters')}</span>
              </div>
              {oauthConfig.refreshToken && (
                <div className="text-[10px] mb-2" style={{ color: 'var(--text-muted)' }}>{t('auth.refreshTokenAvailable')}</div>
              )}
              <div className="flex gap-2">
                <button onClick={handleRefreshToken} className="px-2 py-1.5 rounded text-xs" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>{t('auth.refresh')}</button>
                <button onClick={() => { navigator.clipboard.writeText(oauthConfig.accessToken); }} className="px-2 py-1.5 rounded text-xs" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>{t('auth.copy')}</button>
                <button onClick={handleClearToken} className="px-2 py-1.5 rounded text-xs" style={{ backgroundColor: 'var(--danger)', color: 'var(--text-inverse)' }}>{t('auth.clear')}</button>
              </div>
            </div>
          ) : oauthStatus === "authorizing" ? (
            <div className="p-3 rounded" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid var(--accent)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Spinner size="md" borderColor="var(--accent)" />
                <span className="text-xs" style={{ color: 'var(--accent)' }}>{t('auth.authorizing')}</span>
              </div>
              <div className="text-[10px] mb-2" style={{ color: 'var(--text-muted)' }}>{t('auth.completeAuthInBrowser')}</div>
              <div className="mb-2">
                <input type="text" value={codeInput} onChange={e => setCodeInput(e.target.value)} placeholder={t('auth.pasteAuthCode')} className="w-full px-2 py-1 rounded text-xs" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} />
              </div>
              <div className="flex gap-2">
                <button onClick={handleExchangeCode} className="px-2 py-1.5 rounded text-xs" style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}>{t('auth.exchangeToken')}</button>
                <button onClick={() => setOauthStatus("idle")} className="px-2 py-1.5 rounded text-xs" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>{t('auth.cancel')}</button>
              </div>
            </div>
          ) : oauthStatus === "error" ? (
            <div className="p-3 rounded" style={{ backgroundColor: 'rgba(248, 113, 113, 0.1)', border: '1px solid var(--danger)' }}>
              <div className="text-xs mb-2" style={{ color: 'var(--danger)' }}>{oauthError}</div>
              <div className="flex gap-2">
                <button onClick={handleGetToken} className="px-2 py-1.5 rounded text-xs" style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}>{t('auth.retry')}</button>
                <button onClick={() => setOauthStatus("idle")} className="px-2 py-1.5 rounded text-xs" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>{t('auth.cancel')}</button>
              </div>
            </div>
          ) : (
            <>
              <input type="text" value={oauthConfig.accessToken} onChange={e => setOauthConfig({ ...oauthConfig, accessToken: e.target.value })} placeholder={t('auth.accessTokenManual')} className="w-full px-2 py-1 rounded text-xs" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} />
              {oauthGrantType === 'authorization_code' && (
                <input type="text" value={oauthConfig.refreshToken} onChange={e => setOauthConfig({ ...oauthConfig, refreshToken: e.target.value })} placeholder={t('auth.refreshTokenOptional')} className="w-full px-2 py-1 rounded text-xs" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} />
              )}
              <div className="flex gap-2">
                {oauthGrantType === 'client_credentials' ? (
                  <button onClick={handleClientCredentials} className="px-3 py-1.5 rounded text-xs" style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}>{t('auth.getToken')}</button>
                ) : (
                  <button onClick={handleGetToken} className="px-3 py-1.5 rounded text-xs" style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}>{t('auth.getToken')}</button>
                )}
                {oauthConfig.accessToken && (
                  <>
                    <button onClick={() => { navigator.clipboard.writeText(oauthConfig.accessToken); }} className="px-2 py-1.5 rounded text-xs" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>{t('auth.copy')}</button>
                    <button onClick={() => { setOauthStatus("authorized"); }} className="px-2 py-1.5 rounded text-xs" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>{t('auth.markAsAuthorized')}</button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}
      {authType === "aws" && (
        <div className="space-y-3">
          <div className="p-3 rounded" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
            <div className="text-[10px] mb-2" style={{ color: 'var(--text-muted)' }}>{t('auth.awsSignatureAuth')}</div>
            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {t('auth.awsSignatureDescription')}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input type="text" value={awsAccessKey || ""} onChange={e => setAwsAccessKey(e.target.value)} placeholder="Access Key ID" className="px-2 py-1 rounded text-xs" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} />
            <input type="password" value={awsSecretKey || ""} onChange={e => setAwsSecretKey(e.target.value)} placeholder="Secret Access Key" className="px-2 py-1 rounded text-xs" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select value={awsRegion || DEFAULT_AWS_REGION} onChange={e => setAwsRegion(e.target.value)} className="px-2 py-1 rounded text-xs" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
              <option value={DEFAULT_AWS_REGION}>US East (N. Virginia)</option>
              <option value="us-west-2">US West (Oregon)</option>
              <option value="us-west-1">US West (N. California)</option>
              <option value="eu-west-1">EU (Ireland)</option>
              <option value="eu-central-1">EU (Frankfurt)</option>
              <option value="ap-northeast-1">Asia Pacific (Tokyo)</option>
              <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
              <option value="ap-southeast-2">Asia Pacific (Sydney)</option>
              <option value="ap-south-1">Asia Pacific (Mumbai)</option>
              <option value="sa-east-1">South America (São Paulo)</option>
            </select>
            <input type="text" value={awsService || ""} onChange={e => setAwsService(e.target.value)} placeholder={t('auth.serviceName')} className="px-2 py-1 rounded text-xs" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} />
          </div>
          <input type="password" value={awsSessionToken || ""} onChange={e => setAwsSessionToken(e.target.value)} placeholder={t('auth.sessionTokenOptional')} className="px-2 py-1 rounded text-xs w-full" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} />
          <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {t('auth.signatureProcess')}
          </div>
        </div>
      )}
    </div>
  );
}