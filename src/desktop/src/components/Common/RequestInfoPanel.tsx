import { useMemo } from "react";
import { useEnvironmentStore, useRequestState, useSettingsStore } from "../../store";
import { substituteVariables } from "../../utils/string";
import { prettyPrintJson } from "../../utils/text";
import { useTranslation } from "../../utils/i18n";

export function RequestInfoPanel() {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);
  // Get request state from store - useRequestState subscribes to endpointStates[currentEndpointId]
  const requestState = useRequestState();
  const method = requestState.method;
  const url = requestState.url;
  const bodyType = requestState.bodyType;
  const reqBody = requestState.reqBody;
  const params = requestState.params;
  const headers = requestState.headers;
  const urlencodedBody = requestState.urlencodedBody;
  const description = requestState.description || "";
  const responseSchemas = requestState.responseSchemas;

  // Get current environment for variable substitution (memoized)
  const selectedEnv = useEnvironmentStore((s) => s.selectedEnv);
  const environments = useEnvironmentStore((s) => s.environments);
  const envRecord = useMemo(() => {
    const env = environments.find(e => e.name === selectedEnv);
    if (!env || !env.groups) return {};
    const map: Record<string, string> = {};
    env.groups.forEach(group => {
      group.variables.forEach(v => {
        if (v.enabled !== false) {
          map[v.key] = v.value;
        }
      });
    });
    return map;
  }, [selectedEnv, environments]);

  // Build URL with variable substitution
  const processedUrl = useMemo(() => {
    const subbedUrl = substituteVariables(url, envRecord);
    const enabled = params.filter(p => p.enabled && p.key.trim());
    if (enabled.length === 0) return subbedUrl;
    const qs = enabled.map(p =>
      `${encodeURIComponent(substituteVariables(p.key, envRecord))}=${encodeURIComponent(substituteVariables(p.value, envRecord))}`
    ).join("&");
    return `${subbedUrl}${subbedUrl.includes("?") ? "&" : "?"}${qs}`;
  }, [url, params, envRecord]);

  // Build headers with variable substitution
  const builtHeaders = useMemo(() => {
    const result: Record<string, string> = {};
    headers.filter(h => h.enabled && h.key.trim()).forEach(h => {
      result[substituteVariables(h.key, envRecord)] = substituteVariables(h.value, envRecord);
    });
    return result;
  }, [headers, envRecord]);

  // Build query params for display
  const buildQueryParams = useMemo(() => {
    const result: Record<string, string> = {};
    params.filter(p => p.enabled && p.key.trim()).forEach(p => {
      result[substituteVariables(p.key, envRecord)] = substituteVariables(p.value, envRecord);
    });
    return result;
  }, [params, envRecord]);

  // Build urlencoded body for display
  const buildUrlencodedBody = useMemo(() => {
    return urlencodedBody
      .filter(p => p.enabled && p.key.trim())
      .map(p => `${encodeURIComponent(substituteVariables(p.key, envRecord))}=${encodeURIComponent(substituteVariables(p.value, envRecord))}`)
      .join("&");
  }, [urlencodedBody, envRecord]);

  return (
    <div className="px-4 py-3 space-y-3" style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{t('request.detail')}</span>
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{t('request.preview')}</span>
      </div>

      {/* URL Section */}
      <div className="space-y-1">
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}>{method}</span>
          <span className="text-xs font-mono break-all" style={{ color: 'var(--text-primary)' }}>{processedUrl}</span>
        </div>
        <div className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
          <span>{t('request.rawUrl')}</span>
          <span className="font-mono">{url}</span>
        </div>
      </div>

      {/* Description Section */}
      {description && (
        <div className="space-y-1">
          <div className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>DESCRIPTION</div>
          <div className="p-2 rounded text-xs" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
            {description}
          </div>
        </div>
      )}

      {/* Query Params */}
      {Object.keys(buildQueryParams).length > 0 && (
        <div className="space-y-1">
          <div className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>QUERY PARAMETERS</div>
          <div className="space-y-0.5">
            {Object.entries(buildQueryParams).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2 text-xs font-mono">
                <span style={{ color: 'var(--warning)' }}>{k}</span>
                <span style={{ color: 'var(--text-muted)' }}>=</span>
                <span style={{ color: 'var(--success)' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Headers */}
      {Object.keys(builtHeaders).length > 0 && (
        <div className="space-y-1">
          <div className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>HEADERS</div>
          <div className="space-y-0.5">
            {Object.entries(builtHeaders).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2 text-xs font-mono">
                <span style={{ color: 'var(--accent)' }}>{k}</span>
                <span style={{ color: 'var(--text-muted)' }}>:</span>
                <span style={{ color: 'var(--text-primary)' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Body */}
      {["POST", "PUT", "PATCH"].includes(method) && bodyType !== 'none' && (
        <div className="space-y-1">
          <div className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>BODY</div>
          <div className="p-2 rounded text-xs font-mono overflow-x-auto" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
            {bodyType === 'raw' && reqBody}
            {bodyType === 'x-www-form-urlencoded' && buildUrlencodedBody}
            {bodyType === 'form-data' && <span style={{ color: 'var(--text-muted)' }}>[form-data file upload]</span>}
            {bodyType === 'binary' && <span style={{ color: 'var(--text-muted)' }}>[binary file]</span>}
            {bodyType === 'graphql' && <span style={{ color: 'var(--text-muted)' }}>[graphql]</span>}
          </div>
        </div>
      )}

      {/* Response Schemas */}
      {responseSchemas && Object.keys(responseSchemas).length > 0 && (
        <div className="space-y-1">
          <div className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>RESPONSE SCHEMAS</div>
          <div className="space-y-2">
            {Object.entries(responseSchemas).map(([key, resp]) => (
              <div key={key} className="p-2 rounded" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                    style={{
                      backgroundColor: resp.statusCode >= 200 && resp.statusCode < 300 ? 'var(--success)' : 'var(--danger)',
                      color: 'var(--text-inverse)',
                    }}
                  >
                    {resp.statusCode}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {resp.description}
                  </span>
                  {resp.contentType && (
                    <span className="text-[10px] px-1 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                      {resp.contentType}
                    </span>
                  )}
                </div>
                {resp.schema ? (
                  <div className="mt-1">
                    <div className="text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>SCHEMA:</div>
                    <pre
                      className="text-xs font-mono p-2 rounded overflow-x-auto"
                      style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                    >
                      {prettyPrintJson(JSON.stringify(resp.schema) || '')}
                    </pre>
                  </div>
                ) : (
                  <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {resp.contentType?.includes('octet-stream') || resp.contentType?.includes('pdf') || resp.contentType?.includes('image')
                      ? t('request.binaryResponse')
                      : resp.contentType?.includes('xml')
                        ? t('request.xmlResponse')
                        : resp.contentType
                          ? t('request.textResponse').replace('{type}', resp.contentType)
                          : t('request.noSchema')}
                  </div>
                )}
                {!!resp.example && (
                  <div className="mt-1">
                    <div className="text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>EXAMPLE:</div>
                    <pre
                      className="text-xs font-mono p-2 rounded overflow-x-auto"
                      style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                    >
                      {prettyPrintJson(typeof resp.example === 'string' ? resp.example : (JSON.stringify(resp.example) || ''))}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}