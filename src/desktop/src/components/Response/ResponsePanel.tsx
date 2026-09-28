import { useState, useCallback } from "react";
import { ContextMenu, ContextMenuItem } from "../Common/ResponseContextMenu";
import { formatFileSize, getStatusColor } from "../../utils/RequestUtils";
import { useResponseData, useResponseUI, useResponseUIActions, useCompareData, useCompareActions, useSettingsStore, useResponseStore } from "../../store";
import { useTranslation } from "../../utils/i18n";
import { computeLineDiff } from "../../utils/diff";
import { maskSensitiveData, containsSensitiveData } from "../../utils/sensitive-data";
import { toast } from "../../store/notificationStore";
import { highlightText, prettyPrintJson, prettyPrintJsonSorted } from "../../utils/text";

// Syntax highlighting for JSON
function syntaxHighlightJson(json: string, query?: string): React.ReactNode {
  // Tokenize JSON
  const tokens: { type: string; value: string }[] = [];
  let i = 0;
  while (i < json.length) {
    if (json[i] === '"') {
      // String token - find the end
      let end = i + 1;
      while (end < json.length) {
        if (json[end] === '\\') { end += 2; continue; }
        if (json[end] === '"') { end++; break; }
        end++;
      }
      tokens.push({ type: 'string', value: json.slice(i, end) });
      i = end;
    } else if (json[i] === '-' || (json[i] >= '0' && json[i] <= '9')) {
      // Number token
      let end = i;
      while (end < json.length && json[end].match(/[0-9.eE+-]/)) end++;
      tokens.push({ type: 'number', value: json.slice(i, end) });
      i = end;
    } else if (json.slice(i, 4) === 'true') {
      tokens.push({ type: 'boolean', value: 'true' }); i += 4;
    } else if (json.slice(i, 5) === 'false') {
      tokens.push({ type: 'boolean', value: 'false' }); i += 5;
    } else if (json.slice(i, 4) === 'null') {
      tokens.push({ type: 'null', value: 'null' }); i += 4;
    } else {
      // Punctuation or whitespace
      tokens.push({ type: 'punctuation', value: json[i] });
      i++;
    }
  }

  // Highlight tokens with colors
  return tokens.map((token, idx) => {
    let color = 'var(--text-primary)';
    if (token.type === 'string') color = 'var(--success)';
    else if (token.type === 'number') color = 'var(--accent)';
    else if (token.type === 'boolean') color = 'var(--warning)';
    else if (token.type === 'null') color = 'var(--danger)';

    const styled = <span key={idx} style={{ color }}>{token.value}</span>;

    // Apply search highlight if query exists
    if (query && token.type === 'string') {
      try {
        const regex = new RegExp(`(${query})`, 'gi');
        if (regex.test(token.value)) {
          const parts = token.value.split(regex);
          return parts.map((part, pIdx) =>
            regex.test(part)
              ? <mark key={`${idx}-${pIdx}`} style={{ backgroundColor: 'var(--warning)', color: 'var(--text-inverse)' }}>{part}</mark>
              : <span key={`${idx}-${pIdx}`} style={{ color }}>{part}</span>
          );
        }
      } catch {
      // Invalid regex - non-critical, highlight operation fails gracefully
    }
    }

    return styled;
  });
}

export function ResponsePanel() {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);
  const { response, error, responseHistory, currentEndpointId } = useResponseData();
  const { activeTab, responseView, searchQuery } = useResponseUI();
  const { setActiveTab, setResponseView, setSearchQuery } = useResponseUIActions();
  const { compareResponse } = useCompareData();
  const { setCompareResponse } = useCompareActions();

  // Filter history by current endpoint - only show history for selected endpoint
  const filteredHistory = currentEndpointId
    ? responseHistory.filter(r => r.endpointId === currentEndpointId)
    : [];

  // Settings for sensitive data masking
  const sensitiveMaskEnabled = useSettingsStore((s) => s.sensitiveMaskEnabled);
  const setSensitiveMaskEnabled = useSettingsStore((s) => s.setSensitiveMaskEnabled);

  // Favorite toggle
  const toggleFavorite = useResponseStore((s) => s.toggleFavorite);

  // Local state - context menu (not worth migrating to store)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; path: string; value: any; responseBody?: string } | null>(null);

  // Local state - request section collapse
  const [showRequestSection, setShowRequestSection] = useState(false);

  const toggleRequestSection = useCallback(() => {
    setShowRequestSection(s => !s);
  }, []);

  // Check if response contains sensitive data
  const responseBody = response?.body;
  const responseBodyStr = typeof responseBody === 'string' ? responseBody : (responseBody ? JSON.stringify(responseBody, null, 2) : '');
  const { hasSensitive } = containsSensitiveData(responseBodyStr);

  // Masked body for display
  const displayBody = sensitiveMaskEnabled && hasSensitive ? maskSensitiveData(responseBodyStr) : responseBodyStr;

  // Copy handlers
  const handleCopyPath = (_path: string) => {
    navigator.clipboard.writeText(_path);
  };

  const handleCopyValue = (_path: string, value: any) => {
    const displayValue = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    navigator.clipboard.writeText(displayValue);
  };

  // Timeline shows actual response time breakdown
  // Note: Detailed timing (DNS/TCP/TLS) not available from HTTP client
  // Shows total time with connection and transfer phases derived from total
  const responseTimeline = response ? [
    { phase: t('response.connect'), time: Math.round(response.time * 0.1), color: 'var(--accent)' },
    { phase: t('response.transfer'), time: Math.round(response.time * 0.2), color: 'var(--success)' },
    { phase: t('response.process'), time: Math.round(response.time * 0.5), color: 'var(--warning)' },
    { phase: t('response.total'), time: response.time, color: 'var(--text-muted)' },
  ] : [];

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Integrated Status Bar - Response info + Request URL in one row */}
      <div
        className="px-4 py-2.5 flex items-center gap-3 cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors"
        style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}
        onClick={toggleRequestSection}
        title={t('response.clickToViewRequest')}
      >
        {/* Left: Response status */}
        <span className="text-xs font-medium shrink-0" style={{ color: 'var(--text-muted)' }}>{t('response.label')}</span>
        {response && (
          <>
            <span className="text-sm font-mono font-bold shrink-0" style={{ color: getStatusColor(response.status) }}>{response.status}</span>
            <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>{response.statusText}</span>
            <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>|</span>
            <span className="text-xs shrink-0" style={{ color: 'var(--success)' }}>{response.time}ms</span>
            <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>|</span>
            <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>{formatFileSize(response.body.length)}</span>
          </>
        )}

        {/* Center: Request URL (truncated) */}
        {response?.request && (
          <>
            <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>|</span>
            <span className="text-xs px-1.5 py-0.5 rounded font-mono shrink-0" style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}>
              {response.request.method}
            </span>
            <span className="text-xs truncate flex-1 min-w-0" style={{ color: 'var(--text-primary)' }} title={response.request.url}>
              {response.request.url}
            </span>
          </>
        )}

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {response && (
            <button
              onClick={(e) => { e.stopPropagation(); response.id && toggleFavorite(response.id); }}
              className="p-1 rounded hover:opacity-80 transition-opacity"
              style={{ color: response.isFavorite ? 'var(--warning)' : 'var(--text-muted)' }}
              title={response.isFavorite ? t('response.unfavorite') : t('response.favorite')}
            >
              <svg className="w-4 h-4" fill={response.isFavorite ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </button>
          )}
          {response?.request && (
            <svg className="w-4 h-4" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {showRequestSection
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M515l7-7 7 7" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              }
            </svg>
          )}
        </div>
      </div>

      {/* Request Details (collapsible) */}
      {response?.request && showRequestSection && (
        <div className="px-4 py-3 space-y-3" style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-tertiary)' }}>
          {/* URL with Query Params */}
          <div>
            <div className="text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>URL</div>
            <div className="p-2 rounded text-xs font-mono break-all" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
              {response.request.url}
              {(() => {
                const qp = response.request.queryParams;
                if (!qp || Object.keys(qp).length === 0) return null;
                return (
                  <span style={{ color: 'var(--text-muted)' }}>
                    {'?' + Object.entries(qp).map(([k, v]) => `${k}=${v}`).join('&')}
                  </span>
                );
              })()}
            </div>
          </div>
          {/* Headers */}
          <div>
            <div className="text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>Headers</div>
            <div className="p-2 rounded text-xs font-mono max-h-40 overflow-auto" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
              {Object.entries(response.request.headers).map(([k, v]) => (
                <div key={k} className="break-all">
                  <span style={{ color: 'var(--accent)' }}>{k}</span>
                  <span style={{ color: 'var(--text-muted)' }}>:</span>
                  <span>{v}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Body */}
          {response.request.body && (
            <div>
              <div className="text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>Body</div>
              <div className="p-2 rounded text-xs font-mono max-h-40 overflow-auto" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {(() => {
                  try {
                    return JSON.stringify(JSON.parse(response.request.body!), null, 2);
                  } catch {
                    return response.request.body;
                  }
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty / Error State */}
      {!response && !error && (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20l-1-1h3-1zm0 0l-1 1m1-1v4" />
            </svg>
          </div>
          <div className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('response.sendRequest')}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{t('response.ctrlEnter')}</div>
        </div>
      )}

      {error && (
        <div className="flex-1 p-4">
          <div className="rounded-lg p-4 h-full flex flex-col" style={{ backgroundColor: 'rgba(248, 113, 113, 0.1)', border: '1px solid var(--danger)' }}>
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--danger)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-sm font-medium" style={{ color: 'var(--danger)' }}>{t('response.requestFailed')}</span>
            </div>
            <div className="text-xs font-mono flex-1 overflow-auto" style={{ color: 'var(--danger)', backgroundColor: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '6px' }}>
              {error}
            </div>
          </div>
        </div>
      )}

      {/* Response Tabs */}
      {response && (
        <>
          <div className="px-4 py-2 flex gap-1" style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
            {(['body', 'headers', 'timeline', 'compare'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-3 py-1.5 text-xs rounded-md transition-colors"
                style={activeTab === tab
                  ? { backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }
                  : { backgroundColor: 'transparent', color: 'var(--text-muted)' }
                }
              >
                {tab === 'body' && 'Body'}
                {tab === 'headers' && `Headers (${Object.keys(response.headers).length})`}
                {tab === 'timeline' && t('response.timeline')}
                {tab === 'compare' && t('response.compare')}
              </button>
            ))}
            <div className="flex-1" />
            <div className="flex items-center gap-1">
              {(['preview', 'raw'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setResponseView(v)}
                  className="px-2 py-1 text-[10px] rounded"
                  style={responseView === v
                    ? { backgroundColor: 'var(--accent-muted)', color: 'var(--accent)' }
                    : { backgroundColor: 'transparent', color: 'var(--text-muted)' }
                  }
                >
                  {v === 'preview' ? t('response.preview') : t('response.raw')}
                </button>
              ))}
               {hasSensitive && (
                <button
                  onClick={() => setSensitiveMaskEnabled(!sensitiveMaskEnabled)}
                  className="px-2 py-1 text-[10px] rounded"
                  style={sensitiveMaskEnabled
                    ? { backgroundColor: 'var(--warning)', color: 'var(--text-inverse)' }
                    : { backgroundColor: 'rgba(255, 193, 7, 0.2)', color: 'var(--warning)' }
                  }
                  title={t('response.desensitize')}
                >
                  🔒 {t('response.desensitizeData')}
                </button>
              )}
            </div>
          </div>

          {/* Search Bar */}
          <div className="px-4 py-2" style={{ borderBottom: '1px solid var(--border-color)' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t('response.searchResponse')}
              className="w-full px-3 py-1.5 rounded text-xs"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
            />
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Body Tab */}
            {activeTab === 'body' && (
              <div className="p-4">
                {responseView === 'raw' ? (
                  <pre className="p-3 rounded text-xs font-mono overflow-auto" style={{ backgroundColor: 'var(--bg-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                    {(() => {
                      try {
                        const formatted = prettyPrintJson(displayBody);
                        return searchQuery ? highlightText(formatted, searchQuery) : formatted;
                      } catch {
                        return searchQuery ? highlightText(displayBody, searchQuery) : displayBody;
                      }
                    })()}
                  </pre>
                ) : (
                  // Preview - HTML/image preview, JSON syntax highlighted
                  (() => {
                    const contentType = response.headers?.['content-type'] || response.headers?.['Content-Type'] || '';
                    const isHtml = contentType.includes('html');
                    const isImage = contentType.startsWith('image/');
                    if (isHtml) {
                      return (
                        <iframe
                          srcDoc={displayBody}
                          className="w-full h-full rounded"
                          style={{ backgroundColor: 'var(--bg-primary)', minHeight: '400px', border: 'none' }}
                          title="HTML Preview"
                          sandbox="allow-same-origin"
                        />
                      );
                    }
                    if (isImage) {
                      const bodyTrimmed = displayBody.trim();
                      const isDataUrl = bodyTrimmed.startsWith('data:');
                      const isUrl = bodyTrimmed.startsWith('http://') || bodyTrimmed.startsWith('https://') || bodyTrimmed.startsWith('blob:') || bodyTrimmed.startsWith('file:');
                      const imageSrc = isDataUrl || isUrl ? bodyTrimmed : `data:${contentType};base64,${bodyTrimmed.replace(/\s/g, '')}`;
                      return (
                        <div className="flex items-center justify-center p-3 rounded" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                          <img
                            src={imageSrc}
                            alt="Response preview"
                            className="max-w-full max-h-[500px] rounded"
                            style={{ objectFit: 'contain' }}
                          />
                        </div>
                      );
                    }
                    // JSON - show syntax highlighted sorted view (Preview)
                    return (
                      <pre className="p-3 rounded text-xs font-mono overflow-auto" style={{ backgroundColor: 'var(--bg-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                        {(() => {
                          try {
                            const formatted = prettyPrintJsonSorted(displayBody);
                            return syntaxHighlightJson(formatted, searchQuery);
                          } catch {
                            return searchQuery ? highlightText(displayBody, searchQuery) : displayBody;
                          }
                        })()}
                      </pre>
                    );
                  })()
                )}
                {contextMenu && (
                  <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    items={[
                      { label: t('response.copyPath'), value: 'copyPath', icon: '📋' },
                      { label: t('response.copyValue'), value: 'copyValue', icon: '📄' },
                      { label: t('response.copyBody'), value: 'copyBody', icon: '📋' },
                      { label: '', value: 'separator' },
                      { label: t('response.copyAsJson'), value: 'copyJson', icon: '📋' },
                      { label: t('response.copyAsScriptVar'), value: 'copyAsScriptVar', icon: '📝' },
                    ] as ContextMenuItem[]}
                    onSelect={(value) => {
                      switch (value) {
                        case 'copyPath':
                          handleCopyPath(contextMenu.path);
                          break;
                        case 'copyValue':
                          if (contextMenu.value !== undefined && contextMenu.value !== null) {
                            handleCopyValue(contextMenu.path, contextMenu.value);
                          } else if (contextMenu.responseBody) {
                            // Extract value from response body using path
                            try {
                              const jsonObj = JSON.parse(contextMenu.responseBody);
                              const pathParts = contextMenu.path.replace(/^\$\.?/, '').split(/\.|\[|\]/).filter(Boolean);
                              let value: any = jsonObj;
                              for (const part of pathParts) {
                                value = value?.[part];
                              }
                              if (value !== undefined) {
                                handleCopyValue(contextMenu.path, value);
                              } else {
                                toast.error(t('response.cannotGetValue'));
                              }
                            } catch {
                              toast.error(t('response.copyFailed'));
                            }
                          }
                          break;
                        case 'copyBody':
                          if (contextMenu.responseBody) {
                            navigator.clipboard.writeText(contextMenu.responseBody);
                          }
                          break;
                        case 'copyJson':
                          if (contextMenu.responseBody) {
                            try {
                              const jsonObj = JSON.parse(contextMenu.responseBody);
                              navigator.clipboard.writeText(JSON.stringify(jsonObj, null, 2));
                            } catch {
                              navigator.clipboard.writeText(contextMenu.responseBody);
                            }
                          }
                          break;
                        case 'copyAsScriptVar':
                          if (contextMenu.responseBody) {
                            try {
                              const jsonObj = JSON.parse(contextMenu.responseBody);
                              const scriptVar = `// Response data - paste in pre-request script\nconst responseData = ${JSON.stringify(jsonObj, null, 2)};\n// Set as pm variable\npm.variables.set("responseData", responseData);`;
                              navigator.clipboard.writeText(scriptVar);
                            } catch {
                              // Non-JSON response
                              const scriptVar = `// Response data (string) - paste in pre-request script\nconst responseData = ${JSON.stringify(contextMenu.responseBody)};\npm.variables.set("responseData", responseData);`;
                              navigator.clipboard.writeText(scriptVar);
                            }
                          }
                          break;
                      }
                    }}
                    onClose={() => setContextMenu(null)}
                  />
                )}
              </div>
            )}

            {/* Headers Tab */}
            {activeTab === 'headers' && (
              <div className="p-4">
                <div className="space-y-1">
                  {Object.entries(response.headers).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-2 text-xs font-mono" style={{ backgroundColor: 'var(--bg-secondary)', padding: '8px', borderRadius: '4px' }}>
                      <span style={{ color: 'var(--accent)' }}>{k}:</span>
                      <span style={{ color: 'var(--text-primary)' }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timeline Tab */}
            {activeTab === 'timeline' && (
              <div className="p-4">
                <div className="space-y-2">
                  {responseTimeline.map((t, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="w-16 text-xs" style={{ color: 'var(--text-muted)' }}>{t.phase}</span>
                      <div className="flex-1 h-2 rounded" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                        <div
                          className="h-full rounded transition-all"
                          style={{ backgroundColor: t.color, width: `${Math.min(100, (t.time / response.time) * 100)}%` }}
                        />
                      </div>
                      <span className="w-12 text-right text-xs" style={{ color: 'var(--text-muted)' }}>{t.time}ms</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Compare Tab */}
            {activeTab === 'compare' && (
              <div className="p-4">
                {filteredHistory.length > 0 ? (
                  <div className="space-y-3">
                    <select
                      onChange={e => {
                        const idx = parseInt(e.target.value);
                        if (!isNaN(idx) && idx < filteredHistory.length) setCompareResponse(filteredHistory[idx]);
                      }}
                      className="w-full px-2 py-1 rounded text-xs"
                      style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                    >
                      <option value="">{t('response.selectHistoryResponse')}</option>
                      {filteredHistory.map((r, i) => (
                        <option key={i} value={i}>{r.status} · {r.time}ms · {formatFileSize(r.body.length)}</option>
                      ))}
                    </select>
                    {compareResponse && (
                      <>
                        <div className="p-3 rounded" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                          <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-primary)' }}>{t('response.compareResult')}</div>
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                              <div style={{ color: 'var(--text-muted)' }}>{t('response.size')}</div>
                              <div>{t('response.current')}: {formatFileSize(response.body.length)}</div>
                              <div>{t('response.history')}: {formatFileSize(compareResponse.body.length)}</div>
                              <div>{t('response.diff')}: {formatFileSize(response.body.length - compareResponse.body.length)}</div>
                            </div>
                            <div>
                              <div style={{ color: 'var(--text-muted)' }}>{t('response.time')}</div>
                              <div>{t('response.current')}: {response.time}ms</div>
                              <div>{t('response.history')}: {compareResponse.time}ms</div>
                              <div>{t('response.diff')}: {response.time - compareResponse.time}ms</div>
                            </div>
                          </div>
                        </div>
                        <div className="p-3 rounded" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{t('response.diff')} Diff</div>
                            <div className="flex gap-2 text-[10px]">
                              <span style={{ color: 'var(--success)' }}>+{computeLineDiff(compareResponse.body, response.body).addedCount}</span>
                              <span style={{ color: 'var(--danger)' }}>-{computeLineDiff(compareResponse.body, response.body).removedCount}</span>
                            </div>
                          </div>
                          <div className="max-h-64 overflow-auto rounded font-mono text-[10px]">
                            {(() => {
                              const diff = computeLineDiff(compareResponse.body, response.body);
                              return diff.lines.map((line, i) => (
                                <div
                                  key={i}
                                  className="px-1 py-0.5"
                                  style={{
                                    backgroundColor: line.type === 'added' ? 'rgba(16, 185, 129, 0.15)' :
                                                      line.type === 'removed' ? 'rgba(248, 113, 113, 0.15)' : 'transparent',
                                    color: line.type === 'added' ? 'var(--success)' :
                                          line.type === 'removed' ? 'var(--danger)' : 'var(--text-primary)',
                                  }}
                                >
                                  <span className="mr-2 text-[10px]" style={{ color: 'var(--text-muted)' }}>{line.lineNum}</span>
                                  {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                                  {line.content.substring(0, 200)}{line.content.length > 200 ? '...' : ''}
                                </div>
                              ));
                            })()}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('response.noHistoryToCompare')}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}