import { useState, useRef, useCallback, useEffect } from 'react';
import { useVariableAutocomplete, VariableSuggestions } from '../Common/useVariableAutocomplete';
import { FieldEditor } from '../Common/FieldEditor';
import { useRequestStore, useSettingsStore, useRequestState, useMockStore } from '../../store';
import { KeyValue } from '../../constants/http';
import { detectFieldType } from '../../utils/mock';
import { useDescriptionExpansion } from '../../hooks/common/useDescriptionExpansion';
import { clearKeyValueItems, smartGenerateForKeyValue } from '../../utils/request';
import { useTranslation } from '../../utils/i18n';

// OpenAPI parameter schema info
export interface ParamSchema {
  name: string;
  type?: string;
  format?: string;
  enum?: string[];
  default?: any;
  example?: any;
  required?: boolean;
  description?: string;
}

interface ParamsPanelProps {
  // For ApiRequestConfigPanel prop-based mode
  params?: KeyValue[];
  setParams?: (params: KeyValue[]) => void;
  currentEnv?: Record<string, string>;
  // Schema map for mock generation (fieldName -> JSON Schema)
  schemaMap?: Record<string, Record<string, unknown>>;
}

export function ParamsPanel(props: ParamsPanelProps = {}) {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);
  const {
    params: propParams,
    setParams: propSetParams,
    currentEnv = {},
    schemaMap,
  } = props;

  // Determine which mode we're in
  const isPropMode = propParams !== undefined;

  // Store-based state (no-props mode)
  const requestState = useRequestState();
  const setRequestState = useRequestStore((s) => s.setRequestState);

  const storeParams = requestState.params;
  const storeSetParams = useCallback(
    (newParams: KeyValue[]) => {
      // Detect key rename by comparing old and new params
      const oldKeys = storeParams.map(p => p.key);
      const newKeys = newParams.map(p => p.key);

      // Find renamed keys (same count, one removed, one added)
      if (oldKeys.length === newKeys.length && oldKeys.length > 0) {
        const oldSet = new Set(oldKeys);
        const newSet = new Set(newKeys);
        const removedKey = oldKeys.find(k => !newSet.has(k));
        const addedKey = newKeys.find(k => !oldSet.has(k));

        if (removedKey && addedKey && removedKey !== addedKey) {
          // Use centralized store action for synchronized rename
          useRequestStore.getState().renameParamKey(removedKey, addedKey);
          return;
        }
      }
      setRequestState({ params: newParams });
    },
    [storeParams, setRequestState]
  );

  // Active values
  const params = isPropMode ? propParams! : storeParams;
  const setParams = isPropMode ? propSetParams! : storeSetParams;

  // Auto-encode setting (always from store)
  const autoEncodeParams = useSettingsStore((s) => s.autoEncodeParams);
  const setAutoEncodeParams = useSettingsStore((s) => s.setAutoEncodeParams);
  const paramValueHistory = useSettingsStore((s) => s.paramValueHistory);
  const addToParamValueHistory = useSettingsStore((s) => s.addToParamValueHistory);

  const [focusedInput, setFocusedInput] = useState<number | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Value history dropdown state
  const [showValueHistory, setShowValueHistory] = useState<number | null>(null);
  const [valueHistoryList, setValueHistoryList] = useState<{ value: string; lastUsed: number }[]>([]);

  // Field editor state
  const [editingField, setEditingField] = useState<{ index: number; key: string; value: string } | null>(null);

  // Copy/paste state for parameters
  const [copiedParam, setCopiedParam] = useState<KeyValue | null>(null);

  // Description expansion state
  const { expandedDescriptions, toggleDescription } = useDescriptionExpansion();

  // Mock locale for i18n
  const currentLocale = useMockStore((s) => s.currentLocale);
  const smartDetectionEnabled = useMockStore((s) => s.smartDetectionEnabled);
  const getEnabledBuiltinRules = useMockStore((s) => s.getEnabledBuiltinRules);

  const { containerRef, showSuggestions, suggestionList, handleInputChange, insertVariable, setShowSuggestions, hideSuggestionsDelayed } = useVariableAutocomplete({ currentEnv });

  const addParam = useCallback(() => {
    setParams([...params, { key: "", value: "", enabled: true }]);
  }, [params, setParams]);

  const removeParam = useCallback(
    (i: number) => {
      setParams(params.filter((_: KeyValue, idx: number) => idx !== i));
    },
    [params, setParams]
  );

  const updateParam = useCallback(
    (i: number, f: keyof KeyValue, v: string | boolean | undefined) => {
      const n = [...params];
      n[i] = { ...n[i], [f]: v };
      setParams(n);
    },
    [params, setParams]
  );

  // Specialized update for paramType that also marks it as modified by user
  const updateParamType = useCallback(
    (i: number, newType: string) => {
      const n = [...params];
      n[i] = { ...n[i], paramType: newType as KeyValue['paramType'], paramTypeModified: true };
      setParams(n);
    },
    [params, setParams]
  );

  // Copy a parameter to clipboard
  const copyParam = useCallback((i: number) => {
    const param = params[i];
    if (param) {
      setCopiedParam({ ...param });
    }
  }, [params]);

  // Paste a parameter from clipboard
  const pasteParam = useCallback(() => {
    if (copiedParam) {
      const newParam = { ...copiedParam, key: copiedParam.key + '_copy' };
      setParams([...params, newParam]);
    }
  }, [copiedParam, params, setParams]);

   // Keyboard shortcut handler for Ctrl+C/V on focused input
  // Store callbacks in refs to avoid effect re-runs when callbacks change
  const copyParamRef = useRef(copyParam);
  const pasteParamRef = useRef(pasteParam);

  useEffect(() => {
    copyParamRef.current = copyParam;
    pasteParamRef.current = pasteParam;
  }, [copyParam, pasteParam]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'c' && focusedInput !== null) {
          const idx = focusedInput < 1000 ? focusedInput : focusedInput - 1000;
          if (idx >= 0 && idx < params.length) {
            copyParamRef.current(idx);
          }
        }
        // Ctrl+V only triggers paste-new-row if NOT inside an input/textarea
        // This allows normal text paste into value fields
        else if (e.key === 'v' && copiedParam) {
          const target = e.target as HTMLElement;
          const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
          if (!isInputField) {
            pasteParamRef.current();
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedInput, params.length, copiedParam]);

  // Drag sorting state for parameters
  const [dragSortIndex, setDragSortIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);

  const handleSortDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDragSortIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleSortDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTargetIndex(index);
  }, []);

  const handleSortDragEnd = useCallback(() => {
    if (dragSortIndex !== null && dropTargetIndex !== null && dragSortIndex !== dropTargetIndex) {
      const item = params[dragSortIndex];
      const filtered = params.filter((_, i) => i !== dragSortIndex);
      const reordered = [
        ...filtered.slice(0, dropTargetIndex),
        item,
        ...filtered.slice(dropTargetIndex)
      ];
      setParams(reordered);
    }
    setDragSortIndex(null);
    setDropTargetIndex(null);
  }, [dragSortIndex, dropTargetIndex, params, setParams]);

  // Auto-detect type from key name using mock.ts's unified logic
  const getTypeInfo = useCallback((key: string) => {
    if (!key) return null;
    return detectFieldType(key, currentLocale);
  }, [currentLocale]);

  const clearAll = useCallback(() => {
    setParams(clearKeyValueItems(params));
  }, [params, setParams]);

  // Get value history for a specific param key
  const getValueHistoryForKey = useCallback((paramKey: string) => {
    const entry = paramValueHistory.find(p => p.paramKey === paramKey);
    return entry?.values || [];
  }, [paramValueHistory]);

  // Handle value input focus - show history dropdown
  const handleValueFocus = useCallback((index: number, paramKey: string) => {
    setFocusedInput(index + 1000);
    handleInputChange(params[index].value);
    if (paramKey) {
      const history = getValueHistoryForKey(paramKey);
      if (history.length > 0) {
        setValueHistoryList(history);
        setShowValueHistory(index);
      }
    }
  }, [params, getValueHistoryForKey, handleInputChange]);

  // Handle selecting a value from history
  const handleSelectFromHistory = useCallback((index: number, value: string) => {
    updateParam(index, 'value', value);
    setShowValueHistory(null);
  }, [updateParam]);

  // Save value to history when param changes (on blur)
  const handleValueBlur = useCallback((index: number) => {
    const param = params[index];
    if (param?.key && param?.value) {
      addToParamValueHistory(param.key, param.value);
    }
    setShowValueHistory(null);
  }, [params, addToParamValueHistory]);

  // Smart generate all - analyze field names and generate appropriate values
  const smartGenerateAll = useCallback(async () => {
    await smartGenerateForKeyValue(params, setParams, {
      locale: currentLocale,
      smartDetectionEnabled,
      enabledRules: getEnabledBuiltinRules(),
      schemaMap,
    });
  }, [params, setParams, currentLocale, smartDetectionEnabled, getEnabledBuiltinRules, schemaMap]);

  // Handle field editor apply
  const handleFieldEditorApply = useCallback((_key: string, value: string) => {
    if (editingField !== null) {
      updateParam(editingField.index, 'value', value);
      setEditingField(null);
    }
  }, [editingField, updateParam]);

  // Validate parameter value based on type
  const validateParamValue = useCallback((value: string, paramType: string | undefined): string | null => {
    if (!value || !paramType || paramType === 'string') return null;

    switch (paramType) {
      case 'number':
        if (isNaN(Number(value))) return t('params.invalidNumber');
        break;
      case 'boolean':
        if (value !== 'true' && value !== 'false' && value !== '0' && value !== '1') return t('params.invalidBoolean');
        break;
      case 'array':
        if (!value.includes(',') && !value.startsWith('[')) return t('params.arrayFormat');
        break;
    }
    return null;
  }, []);

  // Get border color for validation error
  const getValueBorderColor = useCallback((value: string, paramType: string | undefined): string | undefined => {
    const error = validateParamValue(value, paramType);
    return error ? 'var(--danger)' : undefined;
  }, [validateParamValue]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{t('params.title')}</span>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setAutoEncodeParams(!autoEncodeParams)}
            className="px-2 py-0.5 text-[10px] rounded"
            style={autoEncodeParams ? { backgroundColor: 'var(--success)', color: 'var(--text-inverse)' } : { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
            title={t('params.autoEncode')}
          >
            {t('params.encode')}{autoEncodeParams ? '✓' : ''}
          </button>
          <button
            onClick={smartGenerateAll}
            className="px-2 py-0.5 text-[10px] rounded flex items-center gap-1"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}
            title={t('body.autoGenerate')}
          >
            <span>🔄</span>
            <span>{t('params.generate')}</span>
          </button>
          <button onClick={clearAll} className="px-2 py-0.5 text-[10px] rounded" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>{t('params.reset')}</button>
        </div>
      </div>

      <div ref={containerRef} className="relative">
        {params.map((p: KeyValue, i: number) => (
          <div key={i} className="flex flex-col">
            <div
              className="flex items-center gap-1.5 py-1"
              draggable
              onDragStart={(e) => handleSortDragStart(e, i)}
              onDragOver={(e) => handleSortDragOver(e, i)}
              onDragEnd={handleSortDragEnd}
              style={{
                opacity: dragSortIndex === i ? 0.5 : 1,
                backgroundColor: dropTargetIndex === i ? 'var(--accent-muted)' : 'transparent',
                borderRadius: '4px',
                cursor: 'grab'
              }}
            >
              <span className="text-xs cursor-grab" style={{ color: 'var(--text-muted)' }}>⋮⋮</span>
              <button onClick={() => updateParam(i, "locked", !p.locked)} className={`w-5 h-5 flex items-center justify-center rounded text-xs ${p.locked ? 'bg-amber-500' : 'bg-var(--bg-tertiary)'}`} style={{ color: p.locked ? 'var(--text-inverse)' : 'var(--text-muted)' }} title={p.locked ? t('params.unlock') : t('params.lock')}>
                {p.locked ? '🔒' : '🔓'}
              </button>
              <input type="checkbox" checked={p.enabled} onChange={e => updateParam(i, "enabled", e.target.checked)} className="w-3.5 h-3.5 rounded" />
              <div className="flex-1 relative flex items-center gap-1">
                <input
                  type="text"
                  value={p.key}
                  onChange={e => { updateParam(i, "key", e.target.value); handleInputChange(e.target.value); }}
                  onFocus={() => { setFocusedInput(i); handleInputChange(p.key); }}
                  onBlur={() => hideSuggestionsDelayed()}
                  placeholder="Key"
                  className="flex-1 px-2 py-1 rounded text-xs"
                  style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                  ref={el => { inputRefs.current[i] = el; }}
                />
                {p.key && getTypeInfo(p.key) && (
                  <span className="text-xs" title={`${p.key} → ${getTypeInfo(p.key)?.label}`}>{getTypeInfo(p.key)?.emoji}</span>
                )}
              </div>
              {showSuggestions && focusedInput === i && suggestionList.length > 0 && (
                <VariableSuggestions
                  suggestions={suggestionList}
                  onSelect={(v) => { updateParam(i, "key", insertVariable(inputRefs.current[i]!, v)); }}
                  onClose={() => setShowSuggestions(false)}
                />
              )}
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={p.value}
                  onChange={e => { updateParam(i, "value", e.target.value); handleInputChange(e.target.value); }}
                  onFocus={() => handleValueFocus(i, p.key)}
                  onBlur={() => { hideSuggestionsDelayed(); handleValueBlur(i); }}
                  placeholder="Value"
                  className="w-full px-2 py-1 rounded text-xs"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    border: `1px solid ${getValueBorderColor(p.value, p.paramType) || 'var(--border-color)'}`,
                  }}
                  ref={el => { inputRefs.current[i + 1000] = el; }}
                />
                {showSuggestions && focusedInput === i + 1000 && suggestionList.length > 0 && (
                  <VariableSuggestions
                    suggestions={suggestionList}
                    onSelect={(v) => { updateParam(i, "value", insertVariable(inputRefs.current[i + 1000]!, v)); }}
                    onClose={() => setShowSuggestions(false)}
                  />
                )}
                {/* Value History Dropdown */}
                {showValueHistory === i && valueHistoryList.length > 0 && (
                  <div
                    className="absolute z-50 mt-1 py-1 rounded shadow-lg w-full max-h-40 overflow-y-auto"
                    style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                  >
                    <div className="text-[10px] px-2 py-1" style={{ color: 'var(--text-muted)' }}>{t('params.historyValues')}</div>
                    {valueHistoryList.map((item, idx) => (
                      <button
                        key={idx}
                        onMouseDown={(e) => { e.preventDefault(); handleSelectFromHistory(i, item.value); }}
                        className="w-full text-left px-2 py-1 text-xs hover:bg-[var(--bg-tertiary)]"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {item.value}
                      </button>
                    ))}
                  </div>
                )}
              </div>
             <select
                value={p.paramType || (typeof schemaMap?.[p.key]?.type === 'string' ? schemaMap[p.key].type as string : 'string')}
                onChange={e => updateParamType(i, e.target.value)}
                className="px-1 py-0.5 text-[10px] rounded"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}
                title={typeof schemaMap?.[p.key]?.type === 'string' ? `${t('params.schemaType')}${schemaMap[p.key].type}` : t('params.paramType')}
              >
                <option value="string">{t('params.string')}</option>
                <option value="number">{t('params.number')}</option>
                <option value="boolean">{t('params.boolean')}</option>
                <option value="array">{t('params.array')}</option>
              </select>
              <button
                onClick={() => setEditingField({ index: i, key: p.key, value: p.value })}
                className="p-1 text-xs"
                style={{ color: 'var(--accent)' }}
                title={t('params.editField')}
              >
                ✏️
              </button>
              <button
                onClick={() => toggleDescription(i)}
                className="w-5 h-5 flex items-center justify-center rounded text-xs"
                style={{
                  backgroundColor: expandedDescriptions.has(i) ? 'var(--accent)' : 'var(--bg-tertiary)',
                  color: expandedDescriptions.has(i) ? 'var(--text-inverse)' : 'var(--text-muted)'
                }}
                title={p.description ? t('params.description') : t('params.addDescription')}
              >
                📝
              </button>
              <button onClick={() => copyParam(i)} className="p-1 text-xs" style={{ color: 'var(--text-muted)' }} title={t('params.copy')}>📋</button>
              {copiedParam && (
                <button onClick={pasteParam} className="p-1 text-xs" style={{ color: 'var(--success)' }} title={t('params.paste')}>📄</button>
              )}
              <button onClick={() => removeParam(i)} className="p-1 text-xs" style={{ color: 'var(--text-muted)' }}>✕</button>
            </div>
            {expandedDescriptions.has(i) && (
              <div className="flex items-center gap-1.5 py-1 pl-6">
                <span className="text-xs" style={{ color: "var(--text-muted)", minWidth: "50px" }}>{t('params.description')}:</span>
                <input
                  type="text"
                  value={p.description || ""}
                  onChange={e => updateParam(i, "description", e.target.value)}
                  placeholder={t('params.description')}
                  className="flex-1 px-2 py-0.5 rounded text-xs"
                  style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
      <button onClick={addParam} className="text-xs" style={{ color: 'var(--accent)' }}>+ {t('params.addParam')}</button>

      {/* Field Editor Modal */}
      {editingField && (
        <FieldEditor
          fieldKey={editingField.key}
          currentValue={editingField.value}
          index={editingField.index}
          onApply={handleFieldEditorApply}
          onClose={() => setEditingField(null)}
          genType="auto"
          suffixType="none"
          customSuffix=""
        />
      )}
    </div>
  );
}