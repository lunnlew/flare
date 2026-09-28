import { useState, useCallback, useRef } from "react";
import {
  exchangeCodeForToken,
  refreshAccessToken,
  clientCredentialsToken,
  buildAuthUrl,
} from "../../utils/oauth";
import { t } from "../../utils/i18n";
import { useSettingsStore } from "../../store";

export type OAuthStatus = "idle" | "authorizing" | "authorized" | "error";

export interface OAuthConfig {
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
  clientAuthentication?: "header" | "body" | "none";
}

interface UseOAuthFlowOptions {
  oauthConfig: OAuthConfig;
  onOauthConfigChange: (config: OAuthConfig) => void;
  onSaveToken?: (tokens: { accessToken: string; refreshToken?: string; tokenType?: string }) => Promise<void>;
}

export function useOAuthFlow({ oauthConfig, onOauthConfigChange, onSaveToken }: UseOAuthFlowOptions) {
  const [oauthStatus, setOauthStatus] = useState<OAuthStatus>("idle");
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState<string>("");

  const abortControllerRef = useRef<AbortController | null>(null);

  // Handle OAuth authorization - opens auth URL in browser
  const handleGetToken = useCallback(async () => {
    const authUrl = buildAuthUrl(oauthConfig);
    if (!authUrl) {
      setOauthError(t('oauth.error.incompleteConfig', useSettingsStore.getState().language));
      setOauthStatus("error");
      return;
    }
    setOauthStatus("authorizing");
    setOauthError("");
    try {
      window.open(authUrl, "_blank");
    } catch {
      setOauthError(t('oauth.error.cannotOpenBrowser', useSettingsStore.getState().language) + authUrl);
      setOauthStatus("error");
    }
  }, [oauthConfig]);

  // Exchange authorization code for access token
  const handleExchangeCode = useCallback(async () => {
    if (!codeInput.trim() || !oauthConfig?.accessTokenUrl || !oauthConfig?.clientId || !oauthConfig?.clientSecret) {
      setOauthError(t('oauth.error.enterAuthCode', useSettingsStore.getState().language));
      return;
    }
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    const result = await exchangeCodeForToken(codeInput, oauthConfig, abortControllerRef.current.signal);

    if (result.success && result.data) {
      onOauthConfigChange({
        ...oauthConfig,
        accessToken: result.data.access_token,
        refreshToken: result.data.refresh_token || oauthConfig.refreshToken,
        tokenType: result.data.token_type || "Bearer",
      });
      setOauthStatus("authorized");
      setCodeInput("");
      if (onSaveToken) {
        await onSaveToken({
          accessToken: result.data.access_token,
          refreshToken: result.data.refresh_token,
          tokenType: result.data.token_type,
        });
      }
    } else {
      setOauthError(t('oauth.error.tokenExchangeFailed', useSettingsStore.getState().language) + result.error);
      setOauthStatus("error");
    }
  }, [codeInput, oauthConfig, onOauthConfigChange, onSaveToken]);

  // Refresh access token using refresh token
  const handleRefreshToken = useCallback(async () => {
    if (!oauthConfig?.refreshToken || !oauthConfig?.accessTokenUrl || !oauthConfig?.clientId || !oauthConfig?.clientSecret) {
      setOauthError(t('oauth.error.ensureRefreshToken', useSettingsStore.getState().language));
      return;
    }
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    const result = await refreshAccessToken(oauthConfig, abortControllerRef.current.signal);

    if (result.success && result.data) {
      onOauthConfigChange({
        ...oauthConfig,
        accessToken: result.data.access_token,
        refreshToken: result.data.refresh_token || oauthConfig.refreshToken,
      });
      setOauthStatus("authorized");
      if (onSaveToken) {
        await onSaveToken({ accessToken: result.data.access_token, refreshToken: result.data.refresh_token });
      }
    } else {
      setOauthError(t('oauth.error.refreshFailed', useSettingsStore.getState().language) + result.error);
      setOauthStatus("error");
    }
  }, [oauthConfig, onOauthConfigChange, onSaveToken]);

  // Clear OAuth token
  const handleClearToken = useCallback(() => {
    onOauthConfigChange({ ...oauthConfig, accessToken: "", refreshToken: "" });
    setOauthStatus("idle");
    setOauthError("");
  }, [oauthConfig, onOauthConfigChange]);

  // Client Credentials grant type - direct token request
  const handleClientCredentials = useCallback(async () => {
    if (!oauthConfig?.accessTokenUrl || !oauthConfig?.clientId || !oauthConfig?.clientSecret) {
      setOauthError(t('oauth.error.incompleteTokenConfig', useSettingsStore.getState().language));
      setOauthStatus("error");
      return;
    }
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    setOauthStatus("authorizing");
    setOauthError("");

    const result = await clientCredentialsToken(oauthConfig, abortControllerRef.current.signal);

    if (result.success && result.data) {
      onOauthConfigChange({
        ...oauthConfig,
        accessToken: result.data.access_token,
        refreshToken: result.data.refresh_token || oauthConfig.refreshToken,
        tokenType: result.data.token_type || "Bearer",
      });
      setOauthStatus("authorized");
      if (onSaveToken) {
        await onSaveToken({
          accessToken: result.data.access_token,
          refreshToken: result.data.refresh_token,
          tokenType: result.data.token_type,
        });
      }
    } else {
      setOauthError(t('oauth.error.clientCredentialsFailed', useSettingsStore.getState().language) + result.error);
      setOauthStatus("error");
    }
  }, [oauthConfig, onOauthConfigChange, onSaveToken]);

  // Handle OAuth config field changes - merges partial updates
  const handleOauthConfigChange = useCallback((updates: Partial<OAuthConfig>) => {
    onOauthConfigChange({ ...oauthConfig, ...updates });
  }, [oauthConfig, onOauthConfigChange]);

  return {
    oauthStatus,
    oauthError,
    codeInput,
    setCodeInput,
    handleGetToken,
    handleExchangeCode,
    handleRefreshToken,
    handleClearToken,
    handleClientCredentials,
    handleOauthConfigChange,
    buildAuthUrl: () => buildAuthUrl(oauthConfig),
  };
}