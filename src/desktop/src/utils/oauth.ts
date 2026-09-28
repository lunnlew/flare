import { isAbortError, getErrorMessage } from "./string";
import { OAuthConfig } from "../hooks/Flow/useOAuthFlow";

/**
 * OAuth HTTP operations utility
 * Shared by both AuthPanel (Builder) and FlowAuthPanel (FlowCanvas)
 */

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  [key: string]: unknown;
}

interface OAuthTokenResult {
  success: boolean;
  data?: TokenResponse;
  error?: string;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
  code: string,
  oauthConfig: OAuthConfig,
  signal?: AbortSignal
): Promise<OAuthTokenResult> {
  const headers: Record<string, string> = { "Content-Type": "application/x-www-form-urlencoded" };
  const bodyParams: Record<string, string> = {
    grant_type: "authorization_code",
    code: code.trim(),
    redirect_uri: oauthConfig.callbackUrl,
    client_id: oauthConfig.clientId,
    client_secret: oauthConfig.clientSecret,
  };

  if (oauthConfig.clientAuthentication === "header") {
    const credentials = btoa(`${oauthConfig.clientId}:${oauthConfig.clientSecret}`);
    headers["Authorization"] = `Basic ${credentials}`;
    delete bodyParams.client_id;
    delete bodyParams.client_secret;
  } else if (oauthConfig.clientAuthentication === "none") {
    delete bodyParams.client_id;
    delete bodyParams.client_secret;
  }

  try {
    const response = await fetch(oauthConfig.accessTokenUrl, {
      method: "POST",
      headers,
      body: new URLSearchParams(bodyParams),
      signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (data.access_token) {
      return { success: true, data: data as TokenResponse };
    }
    throw new Error("No access_token in response");
  } catch (e) {
    if (isAbortError(e)) return { success: false, error: "Request aborted" };
    return { success: false, error: getErrorMessage(e) };
  }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(
  oauthConfig: OAuthConfig,
  signal?: AbortSignal
): Promise<OAuthTokenResult> {
  const headers: Record<string, string> = { "Content-Type": "application/x-www-form-urlencoded" };
  const bodyParams: Record<string, string> = {
    grant_type: "refresh_token",
    refresh_token: oauthConfig.refreshToken,
    client_id: oauthConfig.clientId,
    client_secret: oauthConfig.clientSecret,
  };

  if (oauthConfig.clientAuthentication === "header") {
    const credentials = btoa(`${oauthConfig.clientId}:${oauthConfig.clientSecret}`);
    headers["Authorization"] = `Basic ${credentials}`;
    delete bodyParams.client_id;
    delete bodyParams.client_secret;
  } else if (oauthConfig.clientAuthentication === "none") {
    delete bodyParams.client_id;
    delete bodyParams.client_secret;
  }

  try {
    const response = await fetch(oauthConfig.accessTokenUrl, {
      method: "POST",
      headers,
      body: new URLSearchParams(bodyParams),
      signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (data.access_token) {
      return { success: true, data: data as TokenResponse };
    }
    throw new Error("No access_token in response");
  } catch (e) {
    if (isAbortError(e)) return { success: false, error: "Request aborted" };
    return { success: false, error: getErrorMessage(e) };
  }
}

/**
 * Client credentials grant - direct token request
 */
export async function clientCredentialsToken(
  oauthConfig: OAuthConfig,
  signal?: AbortSignal
): Promise<OAuthTokenResult> {
  const headers: Record<string, string> = { "Content-Type": "application/x-www-form-urlencoded" };
  const bodyParams: Record<string, string> = {
    grant_type: "client_credentials",
    client_id: oauthConfig.clientId,
    client_secret: oauthConfig.clientSecret,
  };

  if (oauthConfig.clientAuthentication === "header") {
    const credentials = btoa(`${oauthConfig.clientId}:${oauthConfig.clientSecret}`);
    headers["Authorization"] = `Basic ${credentials}`;
    delete bodyParams.client_id;
    delete bodyParams.client_secret;
  } else if (oauthConfig.clientAuthentication === "none") {
    delete bodyParams.client_id;
    delete bodyParams.client_secret;
  }

  try {
    const response = await fetch(oauthConfig.accessTokenUrl, {
      method: "POST",
      headers,
      body: new URLSearchParams(bodyParams),
      signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (data.access_token) {
      return { success: true, data: data as TokenResponse };
    }
    throw new Error("No access_token in response");
  } catch (e) {
    if (isAbortError(e)) return { success: false, error: "Request aborted" };
    return { success: false, error: getErrorMessage(e) };
  }
}

/**
 * Generate random state for OAuth security
 */
export function generateOAuthState(): string {
  return Math.random().toString(36).substring(2, 15);
}

/**
 * Build OAuth authorization URL
 */
export function buildAuthUrl(oauthConfig: OAuthConfig): string | null {
  if (!oauthConfig?.authUrl || !oauthConfig?.clientId || !oauthConfig?.callbackUrl) return null;
  const params = new URLSearchParams({
    response_type: "code",
    client_id: oauthConfig.clientId,
    redirect_uri: oauthConfig.callbackUrl,
    scope: oauthConfig.scope || "read write",
    state: oauthConfig.state || generateOAuthState(),
  });
  return `${oauthConfig.authUrl.includes("?") ? oauthConfig.authUrl : oauthConfig.authUrl + "?"}${params.toString()}`;
}