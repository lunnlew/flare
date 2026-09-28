import { useState, useCallback, useMemo } from "react";
import { HttpMethod, HTTP_METHODS } from "../../constants/http";
import { METHOD_STYLES } from "../../styles/method-colors";
import { useRequestStore, useResponseStore, useSettingsStore, useUIStore, useEnvironmentStore, useRequestState, useRequestSettings } from "../../store";
import { substituteVariables } from "../../utils/string";
import { useVariableValidation } from "../../hooks/Variable/useVariableValidation";
import { Spinner } from "../Common/Spinner";
import { useTranslation } from "../../utils/i18n";

interface UrlBarProps {
  // Action callbacks (not moved to store - complex logic stays in parent)
  onSend?: () => void;
  onCancel?: () => void;
  onSave?: () => void;
  saveStatus?: 'idle' | 'saving' | 'success' | 'error';
}

export function UrlBar(props: UrlBarProps = {}) {
  const {
    onSend,
    onCancel,
    onSave,
    saveStatus = 'idle',
  } = props;

  // Request state from store
  const requestState = useRequestState();
  const setRequestState = useRequestStore((s) => s.setRequestState);
  const method = requestState.method as HttpMethod;
  const url = requestState.url;

  // Response state
  const isLoading = useResponseStore((s) => s.isLoading);

  // Settings state
  const autoParseUrl = useSettingsStore((s) => s.autoParseUrl);
  const setAutoParseUrl = useSettingsStore((s) => s.setAutoParseUrl);
  const autoEncodeUrl = useSettingsStore((s) => s.autoEncodeUrl);
  const setAutoEncodeUrl = useSettingsStore((s) => s.setAutoEncodeUrl);

  // UI state from UI store
  const showCodeGen = useUIStore((s) => s.showCodeGen);
  const setShowCodeGen = useUIStore((s) => s.setShowCodeGen);

  // Layout mode from settings store
  const layoutMode = useSettingsStore((s) => s.layoutMode);
  const setLayoutMode = useSettingsStore((s) => s.setLayoutMode);

  // Request-level settings (sslVerify, timeout, retryConfig) from store
  const { sslVerify, timeout, retryConfig } = useRequestSettings();

  // Language and i18n
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);

  // Advanced settings dropdown state (local UI state)
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Environment state - use global environment variables (memoized for stable reference)
  const selectedEnv = useEnvironmentStore((s) => s.selectedEnv);
  const setSelectedEnv = useEnvironmentStore((s) => s.setSelectedEnv);
  const environments = useEnvironmentStore((s) => s.environments);
  const currentEnvRecord = useMemo(() => {
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

  // Global variables from settings store
  const globalVariables = useSettingsStore((s) => s.globalVariables);
  const globalRecord = useMemo(() => {
    const map: Record<string, string> = {};
    globalVariables.forEach(v => {
      if (v.enabled !== false) {
        map[v.key] = v.value;
      }
    });
    return map;
  }, [globalVariables]);

  // Variable validation - detect undefined variables in URL
  const globalVarKeys = useMemo(() => new Set(Object.keys(globalRecord)), [globalRecord]);
  const { undefinedVariables, hasIssues } = useVariableValidation(url, {
    enabled: !!url && url.includes('{{'),
    globalVariables: globalVarKeys,
  });

  // URL history for autocomplete
  const urlHistory = useSettingsStore((s) => s.urlHistory);

  // Filter URL history based on input
  const urlSuggestions = useMemo(() => {
    if (!url || url.length < 2) return [];
    const lower = url.toLowerCase();
    return urlHistory
      .filter(h => h.url.toLowerCase().includes(lower) || h.url.toLowerCase().startsWith(lower))
      .slice(0, 5);
  }, [url, urlHistory]);

  // Computed values - pass both env and global context
  const processedUrl = substituteVariables(url, { env: currentEnvRecord, global: globalRecord });

  // Local UI state
  const [showUrlHighlight, setShowUrlHighlight] = useState(false);
  const [previewMode, setPreviewMode] = useState<'highlight' | 'substituted'>('highlight');

  // Setters
  const setMethod = useCallback((m: HttpMethod) => setRequestState({ method: m }), [setRequestState]);
  const setUrl = useCallback((u: string) => setRequestState({ url: u }), [setRequestState]);

  // Compute encoded URL for preview
  const getEncodedUrl = () => {
    if (!url) return '';
    try {
      const urlObj = new URL(url);
      const encodedSearchParams = new URLSearchParams(urlObj.search);
      urlObj.search = encodedSearchParams.toString();
      return urlObj.toString();
    } catch {
      return encodeURIComponent(url);
    }
  };

  const needsEncoding = url && url !== getEncodedUrl() && !url.includes('{{');
  const encodedUrl = getEncodedUrl();

  const renderUrlHighlight = (urlStr: string) => {
    try {
      const urlObj = new URL(urlStr);
      const protocol = urlObj.protocol.replace(':', '');
      const hostname = urlObj.hostname;
      const port = urlObj.port ? `:${urlObj.port}` : '';
      const path = urlObj.pathname;
      const search = urlObj.search;
      const hash = urlObj.hash;
      // Highlight path params like /:id blue, {{userId}} green
      const highlightPathParams = (str: string) => str.replace(/(:\w+|\/:\w+)/g, '<span style="background-color: rgba(59, 130, 246, 0.2); color: rgb(59, 130, 246); border-radius: 2px; padding: 0 2px;">$1</span>');
      const highlightVars = (str: string) => str.replace(/\{\{(\w+)\}\}/g, '<span style="background-color: var(--accent-muted); color: var(--accent); border-radius: 2px; padding: 0 2px;">{{$1}}</span>');
      return (
        <span className="font-mono text-xs">
          <span style={{ color: 'var(--text-muted)' }}>{protocol}://</span>
          <span style={{ color: 'var(--success)' }}>{hostname}{port}</span>
          <span style={{ color: 'var(--text-primary)' }}>{highlightPathParams(highlightVars(path))}</span>
          <span style={{ color: 'var(--warning)' }}>{highlightVars(search)}</span>
          <span style={{ color: 'var(--text-muted)' }}>{highlightVars(hash)}</span>
        </span>
      );
    } catch {
      // Fallback: highlight path params blue, {{vars}} green
      const highlightPathParams = (str: string) => str.replace(/(:\w+|\/:\w+)/g, '<span style="background-color: rgba(59, 130, 246, 0.2); color: rgb(59, 130, 246); border-radius: 2px; padding: 0 2px;">$1</span>');
      const highlightVars = (str: string) => str.replace(/\{\{(\w+)\}\}/g, '<span style="background-color: var(--accent-muted); color: var(--accent); border-radius: 2px; padding: 0 2px;">{{$1}}</span>');
      return <span className="font-mono text-xs" style={{ color: 'var(--text-primary)' }}>{highlightPathParams(highlightVars(urlStr))}</span>;
    }
  };

  return (
    <>
      {/* URL Bar */}
      <div className="px-4 py-3 flex gap-2" style={{ borderBottom: '1px solid var(--border-color)' }}>
        {/* Environment selector - before method selector */}
        <select
          value={selectedEnv}
          onChange={e => setSelectedEnv(e.target.value)}
          className="px-2 py-1.5 rounded text-xs"
          style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
        >
          <option value="">{t('url.noEnvironment')}</option>
          {environments.map(env => <option key={env.name} value={env.name}>{env.name}</option>)}
        </select>
        <select value={method} onChange={e => setMethod(e.target.value as HttpMethod)} className="px-2 py-1.5 rounded text-xs font-mono" style={{ backgroundColor: METHOD_STYLES[method].bg, color: METHOD_STYLES[method].color, border: '1px solid var(--border-color)' }}>
          {HTTP_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <div className="flex-1 relative">
          <input id="url-input" type="text" value={url} onChange={e => setUrl(e.target.value)} placeholder={t('request.urlPlaceholder')} className="w-full px-3 py-1.5 rounded text-xs" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} onKeyDown={e => { if (e.key === "Enter") onSend?.(); if (e.key === "Escape" && isLoading) onCancel?.(); }} onFocus={() => setShowUrlHighlight(true)} onBlur={() => setTimeout(() => setShowUrlHighlight(false), 200)} aria-label={t('request.url')} />
          {showUrlHighlight && (
            <div className="absolute left-0 top-full mt-1 p-2 rounded-lg shadow-xl z-50 w-full" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
              {/* URL History Suggestions */}
              {urlSuggestions.length > 0 && (
                <div className="mb-2 pb-2" style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{t('url.history')}</span>
                  </div>
                  <div className="space-y-1">
                    {urlSuggestions.map((h, i) => (
                      <button
                        key={i}
                        onMouseDown={() => { setUrl(h.url); }}
                        className="w-full px-2 py-1 rounded text-xs text-left flex items-center justify-between"
                        style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                      >
                        <span className="font-mono truncate">{h.url}</span>
                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          {new Date(h.lastUsed).toLocaleDateString()}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {url && (
              <>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{t('url.preview')}</span>
                {Object.keys(currentEnvRecord).length > 0 && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => setPreviewMode('highlight')}
                      className="px-1.5 py-0.5 rounded text-[10px]"
                      style={previewMode === 'highlight' ? { backgroundColor: 'var(--accent-muted)', color: 'var(--accent)' } : { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
                    >
                      {t('url.highlight')}
                    </button>
                    <button
                      onClick={() => setPreviewMode('substituted')}
                      className="px-1.5 py-0.5 rounded text-[10px]"
                      style={previewMode === 'substituted' ? { backgroundColor: 'var(--accent-muted)', color: 'var(--accent)' } : { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
                    >
                      {t('url.replaceValue')}
                    </button>
                  </div>
                )}
              </div>
             <div>
                {previewMode === 'highlight'
                  ? renderUrlHighlight(processedUrl)
                  : <div className="text-xs font-mono break-all" style={{ color: 'var(--text-primary)' }}>{processedUrl}</div>
                }
              </div>
              {needsEncoding && autoEncodeUrl && (
                <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--border-color)' }}>
                  <div className="text-[10px] mb-1" style={{ color: 'var(--warning)' }}>{t('url.encodePreview')}</div>
                  <div className="text-[10px] font-mono break-all" style={{ color: 'var(--text-muted)' }}>{encodedUrl}</div>
                </div>
              )}
              {hasIssues && undefinedVariables.length > 0 && (
                <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--border-color)' }}>
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-[10px]" style={{ color: 'var(--danger)' }}>⚠ {t('url.undefinedVariable')}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--danger)', color: 'var(--text-inverse)' }}>{undefinedVariables.length}</span>
                  </div>
                  <div className="space-y-1">
                    {undefinedVariables.map((uv, idx) => (
                      <div key={idx} className="flex items-center gap-2 px-2 py-1 rounded" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
                        <span className="font-mono text-[10px]" style={{ color: 'var(--danger)' }}>{uv.fullMatch}</span>
                        <span className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>{uv.context}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {Object.keys(currentEnvRecord).length > 0 && (
                <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--border-color)' }}>
                  <div className="text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>{t('url.envVariables')}</div>
                  <div className="flex flex-wrap gap-1">
                    {Object.keys(currentEnvRecord).map(k => (
                      <button key={k} onMouseDown={() => { setUrl(url + `{{${k}}}`); }} className="px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: 'var(--accent-muted)', color: 'var(--accent)' }}>{`{{${k}}}`}</button>
                    ))}
                  </div>
                </div>
              )}
              {Object.keys(globalRecord).length > 0 && (
                <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--border-color)' }}>
                  <div className="text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>{t('url.globalVariables')}</div>
                  <div className="flex flex-wrap gap-1">
                    {Object.keys(globalRecord).map(k => (
                      <button key={k} onMouseDown={() => { setUrl(url + `{{global.${k}}}`); }} className="px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>{`{{global.${k}}}`}</button>
                    ))}
                  </div>
                </div>
              )}
              </>
              )}
            </div>
          )}
        </div>
         <button onClick={isLoading ? onCancel : onSend} className="px-4 py-1.5 rounded text-xs font-medium" aria-label={isLoading ? t('url.cancel') : t('url.send')} style={isLoading ? { backgroundColor: 'var(--danger)', color: 'var(--text-inverse)' } : { backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}>{isLoading ? t('url.cancel') : t('url.send')}</button>
        {onSave && (
           <button onClick={onSave} disabled={saveStatus === 'saving'} className="px-3 py-1.5 rounded text-xs flex items-center justify-center gap-1.5 w-14" style={{
            backgroundColor: saveStatus === 'success' ? 'var(--success)' : saveStatus === 'error' ? 'var(--danger)' : 'var(--bg-tertiary)',
            color: saveStatus === 'success' || saveStatus === 'error' ? 'var(--text-inverse)' : 'var(--text-muted)',
          }} title={t('url.saveRequest')}>
            {saveStatus === 'saving' && <Spinner size="sm" />}
            {saveStatus === 'success' && '✓'}
            {saveStatus === 'error' && '✕'}
            {saveStatus === 'idle' && t('url.save')}
          </button>
        )}
        <button onClick={() => setShowCodeGen(!showCodeGen)} className="px-3 py-1.5 rounded text-xs" style={showCodeGen ? { backgroundColor: 'var(--accent-muted)', color: 'var(--accent)' } : { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>{t('url.code')}</button>
        <select
          value={layoutMode}
          onChange={e => setLayoutMode(e.target.value as any)}
          className="px-2 py-1.5 rounded text-xs"
          style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
        >
          <option value="horizontal">{t('url.horizontal')}</option>
          <option value="vertical">{t('url.vertical')}</option>
          <option value="request-focus">{t('url.requestFocus')}</option>
          <option value="response-focus">{t('url.responseFocus')}</option>
        </select>
        <div className="relative">
           <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="px-3 py-1.5 rounded text-xs"
            style={{ backgroundColor: showAdvanced ? 'var(--accent-muted)' : 'var(--bg-tertiary)', color: showAdvanced ? 'var(--accent)' : 'var(--text-muted)' }}
          >
            {t('url.settings')} {!sslVerify || timeout > 0 || retryConfig.enabled || !autoParseUrl || !autoEncodeUrl ? '⚠' : ''}
          </button>
          {showAdvanced && (
            <div
              className="absolute right-0 top-full mt-1 p-3 rounded-lg shadow-xl z-50 w-56"
              style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
            >
              {/* URL Settings */}
              <div className="space-y-3 mb-4 pb-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: 'var(--text-primary)' }}>{t('url.autoParseUrl')}</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoParseUrl}
                      onChange={e => setAutoParseUrl(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: 'var(--text-primary)' }}>{t('url.autoEncodeUrl')}</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoEncodeUrl}
                      onChange={e => setAutoEncodeUrl(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
              {/* Request Settings */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: 'var(--text-primary)' }}>{t('url.sslVerify')}</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sslVerify}
                      onChange={e => setRequestState({ sslVerify: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: 'var(--text-primary)' }}>{t('url.timeout')}</span>
                  <input
                    type="number"
                    value={timeout}
                    onChange={e => setRequestState({ timeout: parseInt(e.target.value) || 0 })}
                    className="w-24 px-2 py-1 rounded text-xs"
                    style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                    placeholder="0"
                    min="0"
                    step="1000"
                  />
                </div>
                <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {timeout === 0 ? t('url.noTimeout') : `${t('url.timeoutValue')}${timeout}ms`}
                </div>
                {/* Retry Settings */}
                <div className="border-t pt-3 mt-3" style={{ borderColor: 'var(--border-color)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs" style={{ color: 'var(--text-primary)' }}>{t('url.retryOnFailure')}</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={retryConfig.enabled}
                        onChange={e => setRequestState({ retryConfig: { ...retryConfig, enabled: e.target.checked } })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  {retryConfig.enabled && (
                    <div className="space-y-2 mt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('url.maxRetries')}</span>
                        <input
                          type="number"
                          value={retryConfig.maxRetries}
                          onChange={e => setRequestState({ retryConfig: { ...retryConfig, maxRetries: Math.max(0, Math.min(5, parseInt(e.target.value) || 0)) } })}
                          className="w-20 px-2 py-1 rounded text-xs"
                          style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                          min="0"
                          max="5"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('url.retryDelay')}</span>
                        <input
                          type="number"
                          value={retryConfig.retryDelay}
                          onChange={e => setRequestState({ retryConfig: { ...retryConfig, retryDelay: Math.max(100, parseInt(e.target.value) || 1000) } })}
                          className="w-20 px-2 py-1 rounded text-xs"
                          style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                          min="100"
                          step="100"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}