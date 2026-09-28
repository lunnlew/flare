import { useState, useRef, useCallback } from "react";
import { InputModal } from "../Common/InputModal";
import { useVariableAutocomplete, VariableSuggestions } from "../Common/useVariableAutocomplete";
import { useUIStore, useSettingsStore, useMockStore, useRequestStore, useRequestState } from "../../store";
import { HEADER_PRESETS, KeyValue, DEFAULT_ORIGIN } from "../../constants/http";
import { useDescriptionExpansion } from "../../hooks/common/useDescriptionExpansion";
import { clearKeyValueItems } from "../../utils/request";
import { useTranslation } from "../../utils/i18n";

// Common HTTP headers for auto-complete
const COMMON_HEADERS = [
  'Accept', 'Accept-CH', 'Accept-Encoding', 'Accept-Language', 'Accept-Ranges',
  'Access-Control-Allow-Credentials', 'Access-Control-Allow-Headers', 'Access-Control-Allow-Methods',
  'Access-Control-Allow-Origin', 'Access-Control-Expose-Headers', 'Access-Control-Max-Age',
  'Access-Control-Request-Headers', 'Access-Control-Request-Method', 'Authorization',
  'Cache-Control', 'Clear-Site-Data', 'Connection', 'Content-Encoding',
  'Content-Language', 'Content-Length', 'Content-Type', 'Cookie', 'Cross-Origin-Embedder-Policy',
  'Cross-Origin-Opener-Policy', 'Cross-Origin-Resource-Policy', 'Date', 'Device-Memory',
  'Downlink', 'ECT', 'ETag', 'Expect', 'Expect-CT', 'Expires', 'Forwarded',
  'From', 'Host', 'If-Match', 'If-Modified-Since', 'If-None-Match', 'If-Range',
  'Keep-Alive', 'Last-Modified', 'Origin', 'Ping-From', 'Ping-To', 'Pragma',
  'Proxy-Authenticate', 'Proxy-Authorization', 'Public-Key-Pins', 'Public-Key-Pins-Report-Only',
  'Range', 'Referer', 'Referrer-Policy', 'Refresh', 'Retry-After', 'Save-Data',
  'Sec-WebSocket-Accept', 'Sec-WebSocket-Extensions', 'Sec-WebSocket-Key', 'Sec-WebSocket-Protocol',
  'Sec-WebSocket-Version', 'Server', 'Server-Timing', 'Service-Worker-Allowed',
  'Service-Worker-Navigation-Preload', 'Set-Cookie', 'SourceMap', 'Strict-Transport-Security',
  'Supports-Loading-Mode', 'TE', 'Timing-Allow-Origin', 'Trailer', 'Transfer-Encoding',
  'Upgrade', 'Upgrade-Insecure-Requests', 'User-Agent', 'Vary', 'Via', 'WWW-Authenticate',
  'X-Content-Type-Options', 'X-DNS-Prefetch-Control', 'X-Frame-Options', 'X-Permitted-Cross-Domain-Policies',
  'X-Powered-By', 'X-Requested-With', 'X-XSS-Protection'
];

// Get header name suggestions based on input prefix
function getHeaderSuggestions(input: string): string[] {
  if (!input) return [];
  const lower = input.toLowerCase();
  return COMMON_HEADERS.filter(h => h.toLowerCase().startsWith(lower));
}

// Common header value generators based on header name patterns
function generateHeaderValue(headerKey: string, locale: string): string {
  const key = headerKey.toLowerCase();

  // User-Agent patterns
  if (key.includes('user-agent') || key === 'user-agent') {
    return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  }

  // Accept patterns
  if (key === 'accept' || key.includes('accept')) {
    return 'application/json, text/plain, */*';
  }

  // Content-Type patterns
  if (key === 'content-type' || key.includes('content-type')) {
    return 'application/json';
  }

  // Authorization patterns
  if (key === 'authorization' || key.includes('authorization')) {
    return 'Bearer ';
  }

  // Accept-Language
  if (key === 'accept-language' || key.includes('accept-language')) {
    return locale === 'zh-CN' ? 'zh-CN,zh;q=0.9,en;q=0.8' : 'en-US,en;q=0.9';
  }

  // Accept-Encoding
  if (key === 'accept-encoding' || key.includes('accept-encoding')) {
    return 'gzip, deflate, br';
  }

  // Cache-Control
  if (key === 'cache-control' || key.includes('cache-control')) {
    return 'no-cache';
  }

  // Connection
  if (key === 'connection' || key.includes('connection')) {
    return 'keep-alive';
  }

  // Origin (for CORS)
  if (key === 'origin' || key.includes('origin')) {
    return DEFAULT_ORIGIN;
  }

  // Referer
  if (key === 'referer' || key.includes('referer')) {
    return `${DEFAULT_ORIGIN}/`;
  }

  // X-Request-ID (common custom header)
  if (key.includes('request-id') || key.includes('requestid')) {
    return `req-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }

  // X-Correlation-ID
  if (key.includes('correlation') || key.includes('x-id')) {
    return `corr-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }

  // Host
  if (key === 'host') {
    return 'api.example.com';
  }

  return '';
}

interface HeadersPanelProps {
  // For prop-based mode (e.g., ApiRequestConfigPanel)
  headers?: KeyValue[];
  setHeaders?: (f: KeyValue[]) => void;
  customPresets?: { name: string; headers: KeyValue[] }[];
  onSavePreset?: (name: string, headers: KeyValue[]) => void;
  onDeletePreset?: (index: number) => void;
  currentEnv?: Record<string, string>;
}

export function HeadersPanel(props: HeadersPanelProps = {}) {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);
  const {
    headers: propHeaders,
    setHeaders: propSetHeaders,
    customPresets = [],
    onSavePreset,
    onDeletePreset,
    currentEnv = {},
  } = props;

  // Determine which mode we're in
  const isPropMode = propHeaders !== undefined;

  // Store-based state (no-props mode)
  const requestState = useRequestState();
  const setRequestState = useRequestStore((s) => s.setRequestState);

  const storeHeaders = requestState.headers;
  const storeSetHeaders = useCallback(
    (h: KeyValue[]) => setRequestState({ headers: h }),
    [setRequestState]
  );

  // Active values
  const headers = isPropMode ? propHeaders! : storeHeaders;
  const setHeaders = isPropMode ? propSetHeaders! : storeSetHeaders;
  const showSavePresetModal = useUIStore((s) => s.showSavePresetModal);
  const setShowSavePresetModal = useUIStore((s) => s.setShowSavePresetModal);
  const showManagePresetModal = useUIStore((s) => s.showManagePresetModal);
  const setShowManagePresetModal = useUIStore((s) => s.setShowManagePresetModal);
  const [focusedInput, setFocusedInput] = useState<number | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Header name suggestions state
  const [headerSuggestions, setHeaderSuggestions] = useState<string[]>([]);
  const [showHeaderSuggestions, setShowHeaderSuggestions] = useState(false);

  // Description expansion state
  const { expandedDescriptions, toggleDescription } = useDescriptionExpansion();

  // Header presets from settings store
  const headerPresets = useSettingsStore((s) => s.headerPresets);
  const setHeaderPresets = useSettingsStore((s) => s.setHeaderPresets);

  // Mock locale for i18n
  const currentLocale = useMockStore((s) => s.currentLocale);

  const { containerRef, showSuggestions, suggestionList, handleInputChange, insertVariable, setShowSuggestions, hideSuggestionsDelayed } =
    useVariableAutocomplete({ currentEnv });

  const addHeader = useCallback(() => {
    setHeaders([...headers, { key: "", value: "", enabled: true }]);
  }, [headers, setHeaders]);

  const removeHeader = useCallback(
    (i: number) => {
      setHeaders(headers.filter((_: KeyValue, idx: number) => idx !== i));
    },
    [headers, setHeaders]
  );

  const updateHeader = useCallback(
    (i: number, f: keyof KeyValue, v: string | boolean) => {
      const n = [...headers];
      n[i] = { ...n[i], [f]: v };
      setHeaders(n);
    },
    [headers, setHeaders]
  );

  const addPreset = useCallback(
    (presetHeaders: KeyValue[]) => {
      const existingKeys = new Set(headers.map((h: KeyValue) => h.key.toLowerCase()));
      const newHeaders = presetHeaders.filter((p: KeyValue) => !existingKeys.has(p.key.toLowerCase()));
      setHeaders([...headers, ...newHeaders]);
    },
    [headers, setHeaders]
  );

  const saveCustomPreset = useCallback(
    (name: string, headerList: KeyValue[]) => {
      if (onSavePreset) {
        onSavePreset(name, headerList);
      } else {
        const updated = [...headerPresets.filter((p) => p.name !== name), { name, headers: headerList }];
        setHeaderPresets(updated);
      }
    },
    [onSavePreset, headerPresets, setHeaderPresets]
  );

  const deleteCustomPreset = useCallback(
    (index: number) => {
      if (onDeletePreset) {
        onDeletePreset(index);
      } else {
        const updated = headerPresets.filter((_, i) => i !== index);
        setHeaderPresets(updated);
      }
    },
    [onDeletePreset, headerPresets, setHeaderPresets]
  );

  // Smart generate header values based on header name
  const smartGenerateAll = useCallback(() => {
    const filled = headers.map((h) => {
      if (h.key.trim() && !h.value.trim()) {
        const generatedValue = generateHeaderValue(h.key, currentLocale);
        if (generatedValue) {
          return { ...h, value: generatedValue };
        }
      }
      return h;
    });
    setHeaders(filled);
  }, [headers, setHeaders, currentLocale]);

  const clearAll = useCallback(() => {
    setHeaders(clearKeyValueItems(headers));
  }, [headers, setHeaders]);

  return (
    <div className="space-y-2">
      <InputModal
        isOpen={showSavePresetModal}
        title={t('headers.savePreset')}
        placeholder={t('headers.presetName')}
        confirmText={t('headers.save')}
        onConfirm={(name: string) => {
          saveCustomPreset(name, headers);
          setShowSavePresetModal(false);
        }}
        onCancel={() => setShowSavePresetModal(false)}
      />
      <InputModal
        isOpen={showManagePresetModal}
        title={t('headers.managePresets')}
        placeholder=""
        showInput={false}
        confirmText=""
        onConfirm={() => {}}
        onCancel={() => setShowManagePresetModal(false)}
      >
        <div className="space-y-2 mt-2">
          {customPresets.length === 0 && (
            <div className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>{t('headers.noCustomPresets')}</div>
          )}
          {customPresets.map((preset, i: number) => (
            <div key={i} className="flex items-center gap-2 p-2 rounded" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <span className="flex-1 text-xs" style={{ color: 'var(--text-primary)' }}>{preset.name}</span>
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{preset.headers.length} {t('headers.headersCount')}</span>
              <button
                onClick={() => {
                  deleteCustomPreset(i);
                  setShowManagePresetModal(false);
                }}
                className="px-2 py-1 rounded text-xs"
                style={{ backgroundColor: 'var(--danger)', color: 'var(--text-inverse)' }}
              >
                {t('headers.delete')}
              </button>
            </div>
          ))}
        </div>
      </InputModal>
      <div className="flex items-center gap-2 flex-wrap">
        <select
          onChange={(e) => {
            const idx = parseInt(e.target.value);
            if (!isNaN(idx) && idx < HEADER_PRESETS.length) {
              addPreset(HEADER_PRESETS[idx].headers);
            } else if (!isNaN(idx) && customPresets[idx - HEADER_PRESETS.length]) {
              addPreset(customPresets[idx - HEADER_PRESETS.length].headers);
            }
            e.target.value = "";
          }}
          className="px-2 py-1 rounded text-xs"
          style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
        >
          <option value="">+ {t('headers.addPreset')}</option>
          {HEADER_PRESETS.map((p, i) => <option key={`builtin-${i}`} value={i}>{p.name}</option>)}
          {customPresets.map((p, i) => <option key={`custom-${i}`} value={HEADER_PRESETS.length + i}>{p.name} ({t('headers.custom')})</option>)}
        </select>
        {customPresets.length > 0 && (
          <button
            onClick={() => setShowManagePresetModal(true)}
            className="px-2 py-1 rounded text-xs"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
          >
            {t('headers.manage')}
          </button>
        )}
        {/* Smart generate button */}
        <button
          onClick={smartGenerateAll}
          className="px-2 py-1 rounded text-xs"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}
          title={t('headers.smartGenerate')}
        >
          🔄 {t('headers.generate')}
        </button>
        <button
          onClick={clearAll}
          className="px-2 py-1 rounded text-xs"
          style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
        >
          {t('headers.reset')}
        </button>
      </div>
      <div ref={containerRef} className="relative">
        {headers.map((h: KeyValue, i: number) => (
          <div key={i} className="flex flex-col">
            <div className="flex items-center gap-1.5 py-1">
              <button
                onClick={() => updateHeader(i, "locked", !h.locked)}
                className={`w-5 h-5 flex items-center justify-center rounded text-xs ${
                  h.locked ? "bg-amber-500" : "bg-var(--bg-tertiary)"
                }`}
                style={{ color: h.locked ? 'var(--text-inverse)' : 'var(--text-muted)' }}
                title={h.locked ? t('headers.unlock') : t('headers.lock')}
              >
                {h.locked ? "🔒" : "🔓"}
              </button>
              <input
                type="checkbox"
                checked={h.enabled}
                onChange={(e) => updateHeader(i, "enabled", e.target.checked)}
                className="w-3.5 h-3.5 rounded"
              />
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={h.key}
                  onChange={(e) => {
                    updateHeader(i, "key", e.target.value);
                    handleInputChange(e.target.value);
                    // Update header name suggestions
                    const suggestions = getHeaderSuggestions(e.target.value);
                    setHeaderSuggestions(suggestions);
                    setShowHeaderSuggestions(suggestions.length > 0);
                  }}
                  onFocus={() => {
                    setFocusedInput(i);
                    handleInputChange(h.key);
                    // Show header suggestions on focus if there's input
                    const suggestions = getHeaderSuggestions(h.key);
                    setHeaderSuggestions(suggestions);
                    setShowHeaderSuggestions(suggestions.length > 0);
                  }}
                  onBlur={() => {
                    hideSuggestionsDelayed();
                    setTimeout(() => setShowHeaderSuggestions(false), 150);
                  }}
                  placeholder="Header"
                  className="w-full px-2 py-1 rounded text-xs"
                  style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                  ref={(el) => {
                    inputRefs.current[i] = el;
                  }}
                />
                {showSuggestions && focusedInput === i && suggestionList.length > 0 && (
                  <VariableSuggestions
                    suggestions={suggestionList}
                    onSelect={(v: string) => {
                      updateHeader(i, "key", insertVariable(inputRefs.current[i]!, v));
                    }}
                    onClose={() => setShowSuggestions(false)}
                  />
                )}
                {showHeaderSuggestions && focusedInput === i && headerSuggestions.length > 0 && (
                  <div
                    className="absolute left-0 top-full mt-1 py-1 rounded-lg shadow-xl z-50 w-64 max-h-48 overflow-y-auto"
                    style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                  >
                    <div className="text-[10px] px-2 py-1" style={{ color: 'var(--text-muted)' }}>{t('headers.commonHeaders')}</div>
                    {headerSuggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onMouseDown={() => {
                          updateHeader(i, "key", suggestion);
                          setShowHeaderSuggestions(false);
                        }}
                        className="w-full px-2 py-1 text-left text-xs hover:opacity-80"
                        style={{ color: 'var(--text-primary)' }}
                        onMouseEnter={(e) => {
                          (e.target as HTMLElement).style.backgroundColor = 'var(--bg-tertiary)';
                        }}
                        onMouseLeave={(e) => {
                          (e.target as HTMLElement).style.backgroundColor = 'transparent';
                        }}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={h.value}
                  onChange={(e) => {
                    updateHeader(i, "value", e.target.value);
                    handleInputChange(e.target.value);
                  }}
                  onFocus={() => {
                    setFocusedInput(i + 1000);
                    handleInputChange(h.value);
                  }}
                  onBlur={() => hideSuggestionsDelayed()}
                  placeholder="Value"
                  className="w-full px-2 py-1 rounded text-xs"
                  style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                  ref={(el) => {
                    inputRefs.current[i + 1000] = el;
                  }}
                />
                {showSuggestions && focusedInput === i + 1000 && suggestionList.length > 0 && (
                  <VariableSuggestions
                    suggestions={suggestionList}
                    onSelect={(v: string) => {
                      updateHeader(i, "value", insertVariable(inputRefs.current[i + 1000]!, v));
                    }}
                    onClose={() => setShowSuggestions(false)}
                  />
                )}
              </div>
              <button
                onClick={() => toggleDescription(i)}
                className="w-5 h-5 flex items-center justify-center rounded text-xs"
                style={{
                  backgroundColor: expandedDescriptions.has(i) || h.description ? 'var(--accent)' : 'var(--bg-tertiary)',
                  color: expandedDescriptions.has(i) || h.description ? 'var(--text-inverse)' : 'var(--text-muted)'
                }}
                title={h.description ? t('headers.description') : t('headers.addDescription')}
              >
                📝
              </button>
              <button onClick={() => removeHeader(i)} className="p-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                ✕
              </button>
            </div>
            {expandedDescriptions.has(i) && (
              <div className="flex items-center gap-1.5 py-1 pl-6">
                <span className="text-xs" style={{ color: "var(--text-muted)", minWidth: "50px" }}>{t('headers.description')}:</span>
                <input
                  type="text"
                  value={h.description || ""}
                  onChange={e => updateHeader(i, "description", e.target.value)}
                  placeholder={t('headers.description')}
                  className="flex-1 px-2 py-0.5 rounded text-xs"
                  style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
      <button onClick={addHeader} className="text-xs" style={{ color: 'var(--accent)' }}>
        + {t('headers.addHeader')}
      </button>
      {headers.length > 0 && (
        <button onClick={() => setShowSavePresetModal(true)} className="text-xs ml-3" style={{ color: 'var(--accent)' }}>
          {t('headers.saveAsPreset')}
        </button>
      )}
    </div>
  );
}