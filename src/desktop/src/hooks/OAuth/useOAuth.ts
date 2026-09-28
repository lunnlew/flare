import { useState, useCallback, useRef } from "react";
import { isAbortError, getErrorMessage } from "../../utils/string";
import { t } from "../../utils/i18n";
import { useSettingsStore } from "../../store";

export type OAuthStatus = "idle" | "authorizing" | "authorized" | "error";

interface OAuthConfig {
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
}

interface UseOAuthResult {
  status: OAuthStatus;
  error: string;
  codeInput: string;
  setCodeInput: (v: string) => void;
  buildAuthUrl: (config: OAuthConfig) => string | null;
  handleGetToken: (config: OAuthConfig) => Promise<void>;
  handleExchangeCode: (config: OAuthConfig, code: string, onSuccess: (updated: Partial<OAuthConfig>) => void) => Promise<void>;
  handleRefreshToken: (config: OAuthConfig, onSuccess: (updated: Partial<OAuthConfig>) => void) => Promise<void>;
  handleClearToken: (onClear: () => void) => void;
}

export function useOAuth(): UseOAuthResult {
  const [status, setStatus] = useState<OAuthStatus>("idle");
  const [error, setError] = useState<string>("");
  const [codeInput, setCodeInput] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);

  const generateState = () => Math.random().toString(36).substring(2, 15);

  const buildAuthUrl = useCallback((config: OAuthConfig): string | null => {
    if (!config.authUrl || !config.clientId || !config.callbackUrl) return null;
    const params = new URLSearchParams({
      response_type: "code",
      client_id: config.clientId,
      redirect_uri: config.callbackUrl,
      scope: config.scope || "read write",
      state: config.state || generateState(),
    });
    return `${config.authUrl.includes('?') ? config.authUrl : config.authUrl + '?'}${params.toString()}`;
  }, []);

  const handleGetToken = useCallback(async (config: OAuthConfig) => {
    const authUrl = buildAuthUrl(config);
    if (!authUrl) {
      setError(t('oauth.error.incompleteConfig', useSettingsStore.getState().language));
      setStatus("error");
      return;
    }
    setStatus("authorizing");
    setError("");
    try {
      window.open(authUrl, "_blank");
    } catch {
      setError(t('oauth.error.cannotOpenBrowser', useSettingsStore.getState().language) + authUrl);
      setStatus("error");
    }
  }, [buildAuthUrl]);

  const handleExchangeCode = useCallback(async (
    config: OAuthConfig,
    code: string,
    onSuccess: (updated: Partial<OAuthConfig>) => void
  ) => {
    if (!code.trim() || !config.accessTokenUrl || !config.clientId || !config.clientSecret) {
      setError(t('oauth.error.enterAuthCode', useSettingsStore.getState().language));
      return;
    }
    // Cancel any existing request
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    try {
      const response = await fetch(config.accessTokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: code.trim(),
          redirect_uri: config.callbackUrl,
          client_id: config.clientId,
          client_secret: config.clientSecret,
        }),
        signal: abortControllerRef.current.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data.access_token) {
        onSuccess({ accessToken: data.access_token, refreshToken: data.refresh_token || config.refreshToken, tokenType: data.token_type || "Bearer" });
        setStatus("authorized");
        setCodeInput("");
      } else {
        throw new Error("No access_token in response");
      }
    } catch (err) {
      if (isAbortError(err)) return;
      setError(t('oauth.error.tokenExchangeFailed', useSettingsStore.getState().language) + getErrorMessage(err));
      setStatus("error");
    }
  }, []);

  const handleRefreshToken = useCallback(async (
    config: OAuthConfig,
    onSuccess: (updated: Partial<OAuthConfig>) => void
  ) => {
    if (!config.refreshToken || !config.accessTokenUrl || !config.clientId || !config.clientSecret) {
      setError(t('oauth.error.ensureRefreshToken', useSettingsStore.getState().language));
      return;
    }
    // Cancel any existing request
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    try {
      const response = await fetch(config.accessTokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: config.refreshToken,
          client_id: config.clientId,
          client_secret: config.clientSecret,
        }),
        signal: abortControllerRef.current.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data.access_token) {
        onSuccess({ accessToken: data.access_token, refreshToken: data.refresh_token || config.refreshToken });
        setStatus("authorized");
      } else {
        throw new Error("No access_token in response");
      }
    } catch (err) {
      if (isAbortError(err)) return;
      setError(t('oauth.error.refreshFailed', useSettingsStore.getState().language) + getErrorMessage(err));
      setStatus("error");
    }
  }, []);

  const handleClearToken = useCallback((onClear: () => void) => {
    onClear();
    setStatus("idle");
    setError("");
  }, []);

  return { status, error, codeInput, setCodeInput, buildAuthUrl, handleGetToken, handleExchangeCode, handleRefreshToken, handleClearToken };
}
