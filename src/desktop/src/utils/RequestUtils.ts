// Generate cURL command from request parts
export function generateCurlCommand(
  method: string,
  url: string,
  headers: Record<string, string>,
  body?: string
): string {
  const headerStr = Object.entries(headers)
    .map(([k, v]) => `-H "${k}: ${v}"`)
    .join(" ");
  const bodyStr = body ? `-d '${escapeForCurl(body)}'` : "";
  return `curl -X ${method} "${url}" ${headerStr} ${bodyStr}`.trim();
}

/**
 * Escape single quotes in a string for use in cURL command single-quoted strings.
 * Replaces ' with '\'' (end quote, escaped quote, start new quote)
 */
export function escapeForCurl(str: string): string {
  return str.replace(/'/g, "'\\''");
}

// Format file size for display
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Encode URL with parameters
export function encodeUrlWithParams(
  baseUrl: string,
  params: { key: string; value: string; enabled: boolean }[],
  autoEncode: boolean = true
): string {
  const enabled = params.filter(p => p.enabled && p.key.trim());
  if (enabled.length === 0) return baseUrl;

  const qs = enabled
    .map(p => {
      const key = autoEncode ? encodeURIComponent(p.key) : p.key;
      const value = autoEncode ? encodeURIComponent(p.value) : p.value;
      return `${key}=${value}`;
    })
    .join("&");

  return `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}${qs}`;
}

// Get status color based on HTTP status code
export function getStatusColor(s: number): string {
  return s >= 200 && s < 300 ? 'var(--success)' : s >= 400 ? 'var(--danger)' : 'var(--warning)';
}

// Check if HTTP status is success (2xx)
export function isSuccess(status: number): boolean {
  return status >= 200 && status < 300;
}

// Check if HTTP status is error (4xx, 5xx)
export function isError(status: number): boolean {
  return status >= 400;
}
