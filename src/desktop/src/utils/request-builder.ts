import { substituteVariables } from "./string";
import { sanitizeUrlForId as _sanitizeUrlForId } from "./url";
import { escapeForCurl } from "./RequestUtils";
import type { KeyValue } from "../constants/http";

// Re-export from url.ts for backwards compatibility
export const sanitizeUrlForId = _sanitizeUrlForId;

interface BuildUrlOptions {
  baseUrl: string;
  params: KeyValue[];
  env: Record<string, string>;
}

export function buildRequestUrl({ baseUrl, params, env }: BuildUrlOptions): string {
  if (!baseUrl) return baseUrl;
  const enabled = params.filter(p => p.enabled && p.key.trim());
  if (enabled.length === 0) return baseUrl;
  const qs = enabled
    .map(p => `${encodeURIComponent(substituteVariables(p.key, env))}=${encodeURIComponent(substituteVariables(p.value, env))}`)
    .join("&");
  return `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}${qs}`;
}

interface BuildHeadersOptions {
  headers: KeyValue[];
  authType: string;
  bearerToken?: string;
  bearerPrefix?: string;
  basicUsername?: string;
  basicPassword?: string;
  apiKeyName?: string;
  apiKeyValue?: string;
  apiKeyLocation?: string;
  oauth2AccessToken?: string;
  oauth2TokenType?: string;
  awsAccessKey?: string;
  awsSecretKey?: string;
  awsRegion?: string;
  awsService?: string;
  env: Record<string, string>;
}

export function buildRequestHeaders({
  headers,
  authType,
  bearerToken,
  bearerPrefix,
  basicUsername,
  basicPassword,
  apiKeyName,
  apiKeyValue,
  apiKeyLocation,
  oauth2AccessToken,
  oauth2TokenType,
  awsAccessKey,
  awsSecretKey,
  awsRegion,
  awsService,
  env,
}: BuildHeadersOptions): Record<string, string> {
  const result: Record<string, string> = {};
  headers.filter(h => h.enabled && h.key.trim()).forEach(h => {
    result[substituteVariables(h.key, env)] = substituteVariables(h.value, env);
  });

  if (authType === "bearer" && bearerToken) {
    result["Authorization"] = `${bearerPrefix || 'Bearer'} ${substituteVariables(bearerToken, env)}`;
  } else if (authType === "basic" && basicUsername) {
    result["Authorization"] = `Basic ${btoa(`${basicUsername}:${substituteVariables(basicPassword || '', env)}`)}`;
  } else if (authType === "apiKey" && apiKeyName && apiKeyLocation === "header") {
    result[apiKeyName] = substituteVariables(apiKeyValue || '', env);
  } else if (authType === "oauth2" && oauth2AccessToken) {
    result["Authorization"] = `${oauth2TokenType || 'Bearer'} ${substituteVariables(oauth2AccessToken, env)}`;
  } else if (authType === "aws" && awsAccessKey && awsSecretKey && awsRegion && awsService) {
    // AWS Signature Version 4 will be added by the caller using signAwsRequest
  }
  return result;
}

// ============================================================================
// AWS Signature Version 4 Signing
// ============================================================================

interface AwsSignOptions {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
  accessKey: string;
  secretKey: string;
  region: string;
  service: string;
}

/**
 * Hash a string using SHA-256
 */
async function sha256Hash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Hmac-SHA256 function using Web Crypto API
 */
async function hmacSha256(key: any, data: string): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const result = await crypto.subtle.sign('HMAC', cryptoKey, dataBuffer);
  return new Uint8Array(result);
}

/**
 * Generate AWS Signature Version 4 authorization headers
 */
export async function signAwsRequest({
  method,
  url,
  headers,
  body,
  accessKey,
  secretKey,
  region,
  service,
}: AwsSignOptions): Promise<Record<string, string>> {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const dateStamp = now.toISOString().split('T')[0]; // YYYYMMDD

  // 1. Create canonical request
  const parsedUrl = new URL(url);
  const canonicalUri = parsedUrl.pathname === '/' ? '/' : parsedUrl.pathname.replace(/%2F/g, '/');
  const canonicalQueryString = parsedUrl.search.slice(1) || '';

  // Normalize headers (lowercase, trim)
  const normalizedHeaders: Record<string, string> = {};
  Object.entries(headers).forEach(([k, v]) => {
    normalizedHeaders[k.toLowerCase().trim()] = v.trim();
  });

  // Host header is required
  normalizedHeaders['host'] = parsedUrl.host;

  const signedHeadersList = Object.keys(normalizedHeaders).sort();
  const signedHeadersString = signedHeadersList.join(';');

  // Canonical headers: lowercase key:value\n
  const canonicalHeaders = signedHeadersList.map(h => `${h}:${normalizedHeaders[h]}`).join('\n') + '\n';

  // 2. Create payload hash
  let payloadHash: string;
  if (body) {
    payloadHash = await sha256Hash(body);
  } else {
    payloadHash = await sha256Hash('');
  }

  // 3. Create canonical request
  const canonicalRequest = [
    method.toUpperCase(),
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeadersString,
    payloadHash,
  ].join('\n');

  // 4. Create string to sign
  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const canonicalRequestHash = await sha256Hash(canonicalRequest);
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    canonicalRequestHash,
  ].join('\n');

  // 5. Calculate signature
  // AWS4 secret key prefix
  const kSecret = secretKey;
  const kDate = await hmacSha256(new TextEncoder().encode('AWS4' + kSecret), dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  const kSigning = await hmacSha256(kService, 'aws4_request');

  const signatureBuffer = await hmacSha256(kSigning, stringToSign);
  const signature = Array.from(signatureBuffer).map(b => b.toString(16).padStart(2, '0')).join('');

  // 6. Create authorization header
  const authorizationHeader = [
    `${algorithm} Credential=${accessKey}/${credentialScope}`,
    `SignedHeaders=${signedHeadersString}`,
    `Signature=${signature}`,
  ].join(', ');

  // Return updated headers with authorization
  const resultHeaders: Record<string, string> = { ...headers };
  resultHeaders['Authorization'] = authorizationHeader;
  resultHeaders['X-Amz-Date'] = amzDate;

  return resultHeaders;
}

interface BuildQueryParamsOptions {
  params: KeyValue[];
  authType: string;
  apiKeyName?: string;
  apiKeyValue?: string;
  apiKeyLocation?: string;
  env: Record<string, string>;
}

export function buildRequestQueryParams({
  params,
  authType,
  apiKeyName,
  apiKeyValue,
  apiKeyLocation,
  env,
}: BuildQueryParamsOptions): Record<string, string> {
  const result: Record<string, string> = {};
  params.filter(p => p.enabled && p.key.trim()).forEach(p => {
    result[substituteVariables(p.key, env)] = substituteVariables(p.value, env);
  });
  if (authType === "apiKey" && apiKeyLocation === "query" && apiKeyName) {
    result[apiKeyName] = substituteVariables(apiKeyValue || '', env);
  }
  return result;
}

interface BuildUrlencodedBodyOptions {
  urlencodedBody: KeyValue[];
  env: Record<string, string>;
}

export function buildUrlencodedBody({ urlencodedBody, env }: BuildUrlencodedBodyOptions): string {
  return urlencodedBody
    .filter(b => b.enabled && b.key.trim())
    .map(b => `${encodeURIComponent(substituteVariables(b.key, env))}=${encodeURIComponent(substituteVariables(b.value, env))}`)
    .join("&");
}

// ============================================================================
// Curl Command Generator
// ============================================================================

interface GenerateCurlOptions {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
}

export function generateCurlCommand({ method, url, headers, body }: GenerateCurlOptions): string {
  const headerStr = Object.entries(headers).map(([k, v]) => `-H "${k}: ${v}"`).join(" ");
  const bodyStr = body ? `-d '${escapeForCurl(body)}'` : "";
  return `curl -X ${method} "${url}" ${headerStr} ${bodyStr}`.trim();
}

// ============================================================================
// Request ID & Fingerprint Utilities
// ============================================================================

/**
 * Generate stable request fingerprint based on request characteristics
 */
export function generateRequestFingerprint(
  params: { key: string; value: string; enabled: boolean }[],
  headers: { key: string; value: string; enabled: boolean }[],
  reqBody: string,
  bodyType: string
): string {
  const paramsStr = params.filter(p => p.enabled && p.key.trim()).map(p => `${p.key}=${p.value}`).join('&');
  const headersStr = headers.filter(h => h.enabled && h.key.trim()).map(h => `${h.key}=${h.value}`).join('&');
  const combined = `${paramsStr}|${headersStr}|${bodyType}|${reqBody}`;
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}
