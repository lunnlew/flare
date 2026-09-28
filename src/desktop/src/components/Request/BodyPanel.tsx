import React, { useState, useRef, useCallback } from "react";
import { useVariableAutocomplete, VariableSuggestions } from "../Common/useVariableAutocomplete";
import { InputModal } from "../Common/InputModal";
import MonacoEditor from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import { formatFileSize } from "../../utils/RequestUtils";
import { useRequestStore, useRequestState, useMockStore, useNotificationStore, useSettingsStore } from "../../store";
import { BodyType, KeyValue } from "../../constants/http";
import { generateMockValue as mockGenerateMockValue } from "../../utils/mock";
import { useDescriptionExpansion } from "../../hooks/common/useDescriptionExpansion";
import { smartGenerateForKeyValue } from "../../utils/request";
import { prettyPrintJson } from "../../utils/text";
import { getErrorMessage } from "../../utils/string";
import { useGraphQLSchema } from "../../hooks/GraphQL/useGraphQLSchema";
import { GraphQLSchemaDocs } from "../Common/GraphQLSchemaDocs";
import { useTranslation } from "../../utils/i18n";

// Max file size for binary uploads (10MB)
const MAX_BINARY_FILE_SIZE = 10 * 1024 * 1024;

// Register GraphQL completion provider for Monaco Editor
function registerGraphQLCompletionProvider(
  monaco: typeof Monaco,
  getSuggestions: (partialQuery: string) => string[]
) {
  monaco.languages.registerCompletionItemProvider("graphql", {
    triggerCharacters: ["{", " ", "\n"],
    provideCompletionItems: (model, position) => {
      const textUntilPosition = model.getValueInRange({
        startLineNumber: position.lineNumber,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      });

      // Get suggestions for query fields
      const suggestions = getSuggestions(textUntilPosition);

      const completions: Monaco.languages.CompletionItem[] = [];

      // Check if we're in a query context
      const isQueryContext = textUntilPosition.includes("query") || textUntilPosition.includes("{");

      if (isQueryContext) {
        suggestions.forEach(fieldName => {
          const word = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };

          completions.push({
            label: fieldName,
            kind: monaco.languages.CompletionItemKind.Field,
            insertText: fieldName,
            detail: 'Query field',
            range,
          });
        });

        // Also add common GraphQL keywords
        const keywords = ["query", "mutation", "subscription", "fragment", "on", "typename", "__typename"];
        keywords.forEach(kw => {
          const word = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };
          completions.push({
            label: kw,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: kw,
            detail: 'GraphQL keyword',
            range,
          });
        });
      }

      return { suggestions: completions };
    },
  });
}

interface BodyPanelProps {
  // For ApiRequestConfigPanel prop-based mode
  bodyType?: BodyType;
  setBodyType?: (t: BodyType) => void;
  formData?: KeyValue[];
  setFormData?: (f: KeyValue[]) => void;
  binaryFile?: { name: string; size: number; content: string } | null;
  setBinaryFile?: (f: { name: string; size: number; content: string } | null) => void;
  urlencodedData?: KeyValue[];
  setUrlencodedData?: (f: KeyValue[]) => void;
  rawContentType?: string;
  setRawContentType?: (t: string) => void;
  reqBody?: string;
  setReqBody?: (b: string) => void;
  graphqlQuery?: string;
  setGraphqlQuery?: (q: string) => void;
  graphqlVariables?: string;
  setGraphqlVariables?: (v: string) => void;
  currentEnv?: Record<string, string>;
  // Schema map for mock generation (fieldName -> JSON Schema)
  schemaMap?: Record<string, Record<string, unknown>>;
}

export function BodyPanel(props: BodyPanelProps = {}) {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);
  const {
    bodyType: propBodyType,
    setBodyType: propSetBodyType,
    formData: propFormData,
    setFormData: propSetFormData,
    binaryFile: propBinaryFile,
    setBinaryFile: propSetBinaryFile,
    urlencodedData: propUrlencodedData,
    setUrlencodedData: propSetUrlencodedData,
    rawContentType: propRawContentType,
    setRawContentType: propSetRawContentType,
    reqBody: propReqBody,
    setReqBody: propSetReqBody,
    graphqlQuery: propGraphqlQuery,
    setGraphqlQuery: propSetGraphqlQuery,
    graphqlVariables: propGraphqlVariables,
    setGraphqlVariables: propSetGraphqlVariables,
    currentEnv = {},
    schemaMap,
  } = props;

  // Store-based state (no-props mode)
  const requestState = useRequestState();
  const setRequestState = useRequestStore((s) => s.setRequestState);

  // Determine which mode we're in
  const isPropMode = propBodyType !== undefined;

  // Store-based values and setters
  const storeBodyType = requestState.bodyType as BodyType;
  const storeFormData = requestState.formData;
  const storeUrlencodedBody = requestState.urlencodedBody;
  const storeReqBody = requestState.reqBody;
  const storeRawContentType = requestState.headers.find(h => h.key.toLowerCase() === 'content-type')?.value || 'application/json';
  const storeGraphqlQuery = requestState.graphqlQuery;
  const storeGraphqlVariables = requestState.graphqlVariables;
  const storeBinaryFile = requestState.binaryFile ?? null;

  const storeSetBodyType = useCallback((t: BodyType) => setRequestState({ bodyType: t }), [setRequestState]);
  const storeSetFormData = useCallback((f: KeyValue[]) => setRequestState({ formData: f }), [setRequestState]);
  const storeSetUrlencodedData = useCallback((u: KeyValue[]) => setRequestState({ urlencodedBody: u }), [setRequestState]);
  const storeSetReqBody = useCallback((b: string) => setRequestState({ reqBody: b }), [setRequestState]);
  const storeSetGraphqlQuery = useCallback((q: string) => setRequestState({ graphqlQuery: q }), [setRequestState]);
  const storeSetGraphqlVariables = useCallback((g: string) => setRequestState({ graphqlVariables: g }), [setRequestState]);
  const storeSetRawContentType = useCallback((t: string) => {
    const existing = requestState.headers.findIndex(h => h.key.toLowerCase() === 'content-type');
    if (existing >= 0) {
      setRequestState({
        headers: requestState.headers.map((h, i) => i === existing ? { ...h, value: t } : h)
      });
    } else {
      setRequestState({
        headers: [...requestState.headers, { key: 'Content-Type', value: t, enabled: true }]
      });
    }
  }, [requestState.headers, setRequestState]);
  const storeSetBinaryFile = useCallback((f: { name: string; size: number; content: string } | null) => setRequestState({ binaryFile: f }), [setRequestState]);

  // Active values (use props if in prop mode, otherwise use store)
  const bodyType = isPropMode ? propBodyType! : storeBodyType;
  const formData = isPropMode ? propFormData! : storeFormData;
  const urlencodedBody = isPropMode ? propUrlencodedData! : storeUrlencodedBody;
  const reqBody = isPropMode ? propReqBody! : storeReqBody;
  const rawContentType = isPropMode ? propRawContentType! : storeRawContentType;
  const graphqlQuery = isPropMode ? propGraphqlQuery! : storeGraphqlQuery;
  const graphqlVariables = isPropMode ? propGraphqlVariables! : storeGraphqlVariables;
  const binaryFile = isPropMode ? propBinaryFile! : storeBinaryFile;

  // Active setters
  const setBodyType = isPropMode ? propSetBodyType! : storeSetBodyType;
  const setFormData = isPropMode ? propSetFormData! : storeSetFormData;
  const setUrlencodedData = isPropMode ? propSetUrlencodedData! : storeSetUrlencodedData;
  const setReqBody = isPropMode ? propSetReqBody! : storeSetReqBody;
  const setGraphqlQuery = isPropMode ? propSetGraphqlQuery! : storeSetGraphqlQuery;
  const setGraphqlVariables = isPropMode ? propSetGraphqlVariables! : storeSetGraphqlVariables;
  const setRawContentType = isPropMode ? propSetRawContentType! : storeSetRawContentType;
  const setBinaryFile = isPropMode ? propSetBinaryFile! : storeSetBinaryFile;

  // Active schemaMap (use prop if in prop mode, otherwise use store's parameterSchemas)
  const activeSchemaMap = isPropMode ? schemaMap : (requestState.parameterSchemas || {});

  // Toast for user feedback
  const showToast = useNotificationStore((s) => s.showToast);

  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | HTMLTextAreaElement | null>>({});

  // Description expansion state for form-data and urlencoded
  const { expandedDescriptions: formDataExpandedDesc, toggleDescription: toggleFormDataDescription } = useDescriptionExpansion();
  const { expandedDescriptions: urlencodedExpandedDesc, toggleDescription: toggleUrlencodedDescription } = useDescriptionExpansion();

  const { containerRef, showSuggestions, suggestionList, handleInputChange, insertVariable, setShowSuggestions, hideSuggestionsDelayed } = useVariableAutocomplete({ currentEnv });

  // Mock locale for i18n
  const currentLocale = useMockStore((s) => s.currentLocale);
  const smartDetectionEnabled = useMockStore((s) => s.smartDetectionEnabled);
  const getEnabledBuiltinRules = useMockStore((s) => s.getEnabledBuiltinRules);

  // Smart generate all for form-data
  const smartGenerateFormData = useCallback(async () => {
    const enabledRules = getEnabledBuiltinRules();
    const filled = await Promise.all(formData.map(async (p) => {
      if (p.key.trim() && !p.isFile) {
        const fieldSchema = activeSchemaMap?.[p.key] || {};
        const schemaWithName = { ...fieldSchema, name: p.key };
        const mockValue = await mockGenerateMockValue(
          schemaWithName as any,
          { locale: currentLocale, smartDetectionEnabled, enabledRules }
        );
        const displayValue = typeof mockValue === 'object' ? JSON.stringify(mockValue) : String(mockValue ?? '');
        return { ...p, value: displayValue || `${p.key}_sample` };
      }
      return p;
    }));
    setFormData(filled);
  }, [formData, setFormData, currentLocale, smartDetectionEnabled, getEnabledBuiltinRules, activeSchemaMap]);

  // Smart generate all for urlencoded
  const smartGenerateUrlencoded = useCallback(async () => {
    await smartGenerateForKeyValue(urlencodedBody, setUrlencodedData, {
      locale: currentLocale,
      smartDetectionEnabled,
      enabledRules: getEnabledBuiltinRules(),
      schemaMap: activeSchemaMap,
    });
  }, [urlencodedBody, setUrlencodedData, currentLocale, smartDetectionEnabled, getEnabledBuiltinRules, activeSchemaMap]);

  // Bulk import state for x-www-form-urlencoded
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);

  // GraphQL Schema introspection state
  const [graphqlSchemaUrl, setGraphqlSchemaUrl] = useState('');
  const [showGraphqlSchemaDocs, setShowGraphqlSchemaDocs] = useState(false);
  const { schema: graphqlSchema, loading: graphqlLoading, error: graphqlSchemaError, fetchSchema: fetchGraphQLSchema, clearSchema: clearGraphQLSchema, getSuggestions } = useGraphQLSchema();

  const handleLoadGraphQLSchema = useCallback(async () => {
    if (!graphqlSchemaUrl.trim()) return;
    try {
      await fetchGraphQLSchema(graphqlSchemaUrl.trim());
      showToast?.(t('body.schemaLoadSuccess'), 'success');
    } catch (err) {
      showToast?.(getErrorMessage(err) || t('body.schemaLoadFailed'), 'error');
    }
  }, [graphqlSchemaUrl, fetchGraphQLSchema, showToast]);

  const handleClearGraphQLSchema = useCallback(() => {
    clearGraphQLSchema();
    setGraphqlSchemaUrl('');
    showToast?.(t('body.schemaCleared'), 'info');
  }, [clearGraphQLSchema, showToast]);

  // Parse query string or JSON and add to urlencodedBody
  const handleBulkImport = useCallback((input: string) => {
    if (!input.trim()) return;

    let newEntries: KeyValue[] = [];

    try {
      // Try parsing as JSON first
      if (input.trim().startsWith('{') || input.trim().startsWith('[')) {
        const json = JSON.parse(input.trim());
        if (Array.isArray(json)) {
          // Array of objects [{key, value}, ...] or [{name, value}, ...]
          json.forEach(item => {
            const key = item.key || item.name || '';
            const value = item.value !== undefined ? String(item.value) : '';
            if (key) {
              newEntries.push({ key, value, enabled: true });
            }
          });
        } else {
          // Object {key: value, ...}
          Object.entries(json).forEach(([key, value]) => {
            newEntries.push({ key, value: String(value), enabled: true });
          });
        }
      }
    } catch {
      // Try parsing as query string (key=value&key2=value2)
      const params = new URLSearchParams(input.trim());
      if (params.toString()) {
        params.forEach((value, key) => {
          newEntries.push({ key, value, enabled: true });
        });
      }
    }

    if (newEntries.length > 0) {
      setUrlencodedData([...urlencodedBody, ...newEntries]);
    }
    setShowBulkImportModal(false);
  }, [urlencodedBody, setUrlencodedData, setShowBulkImportModal]);

  const updateFormData = useCallback((i: number, f: keyof KeyValue, v: string | boolean | File | null) => {
    const n = [...formData];
    n[i] = { ...n[i], [f]: v };
    setFormData(n);
  }, [formData, setFormData]);

  const removeFormData = useCallback((i: number) => {
    setFormData(formData.filter((_: KeyValue, idx: number) => idx !== i));
  }, [formData, setFormData]);

  const addFormData = useCallback(() => {
    setFormData([...formData, { key: "", value: "", enabled: true }]);
  }, [formData, setFormData]);

  const toggleFormDataFile = useCallback((i: number) => {
    const n = [...formData];
    n[i] = { ...n[i], isFile: !formData[i].isFile, file: formData[i].isFile ? null : undefined };
    setFormData(n);
  }, [formData, setFormData]);

  // Drag and drop handlers
  const [isDragging, setIsDragging] = useState(false);
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const newEntries: KeyValue[] = files.map(file => ({
        key: "",
        value: file.name,
        enabled: true,
        isFile: true,
        file: file
      }));
      setFormData([...formData, ...newEntries]);
    }
  }, [formData, setFormData]);

  // Drag sorting state for form-data and urlencoded
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
      const item = formData[dragSortIndex];
      const filtered = formData.filter((_, i) => i !== dragSortIndex);
      const reordered = [
        ...filtered.slice(0, dropTargetIndex),
        item,
        ...filtered.slice(dropTargetIndex)
      ];
      setFormData(reordered);
    }
    setDragSortIndex(null);
    setDropTargetIndex(null);
  }, [dragSortIndex, dropTargetIndex, formData, setFormData]);

  return (
    <div className="space-y-4" ref={containerRef}>
      <div className="flex gap-2">{(["none", "form-data", "x-www-form-urlencoded", "raw", "binary", "graphql"] as BodyType[]).map(bodyKey => (
        <button key={bodyKey} onClick={() => setBodyType(bodyKey)} className="px-2 py-1 text-xs rounded" style={bodyType === bodyKey ? { backgroundColor: 'var(--accent-muted)', color: 'var(--accent)' } : { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>{bodyKey === "none" ? t('body.none') : bodyKey === "form-data" ? t('body.formData') : bodyKey === "x-www-form-urlencoded" ? "x-www" : bodyKey === "raw" ? "Raw" : bodyKey === "binary" ? "Binary" : "GraphQL"}</button>
      ))}</div>
      {bodyType === "raw" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Content-Type:</span>
            <select value={rawContentType} onChange={e => setRawContentType(e.target.value)} className="px-2 py-1 rounded text-xs" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
              <option value="application/json">application/json</option>
              <option value="application/xml">application/xml</option>
              <option value="text/plain">text/plain</option>
              <option value="text/html">text/html</option>
              <option value="text/javascript">text/javascript</option>
              <option value="application/octet-stream">application/octet-stream</option>
            </select>
            {rawContentType === 'application/json' && (
              <button
                onClick={() => {
                  try {
                    const formatted = prettyPrintJson(reqBody || '{}');
                    setReqBody(formatted);
                  } catch {
                    showToast(t('body.jsonFormatError'), 'error');
                  }
                }}
                className="px-2 py-1 text-[10px] rounded"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
              >
                {t('body.format')}
              </button>
            )}
          </div>
          <div className="relative">
            <MonacoEditor
              height="200px"
              language={rawContentType.includes('xml') ? 'xml' : rawContentType.includes('html') ? 'html' : rawContentType.includes('javascript') ? 'javascript' : 'json'}
              value={reqBody || ''}
              onChange={(v) => { setReqBody(v || ''); handleInputChange(v || ''); }}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                lineNumbers: 'on',
                fontSize: 12,
                tabSize: 2,
                automaticLayout: true,
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                folding: true,
                lineDecorationsWidth: 5,
                lineNumbersMinChars: 3,
              }}
            />
            {showSuggestions && focusedInput === 'raw' && suggestionList.length > 0 && (
              <VariableSuggestions
                suggestions={suggestionList}
                onSelect={(v) => { setReqBody(insertVariable(document.querySelector('.monaco-editor textarea') as HTMLTextAreaElement, v)); }}
                onClose={() => setShowSuggestions(false)}
              />
            )}
          </div>
        </div>
      )}
      {bodyType === "form-data" && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={isDragging ? 'p-2 rounded border-2 border-dashed' : ''}
          style={isDragging ? { borderColor: 'var(--accent)', backgroundColor: 'var(--accent-muted)' } : {}}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Form Data</span>
            <button
              onClick={smartGenerateFormData}
              className="px-2 py-0.5 text-[10px] rounded flex items-center gap-1"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}
              title={t('body.autoGenerate')}
            >
              <span>🔄</span>
              <span>{t('body.generate')}</span>
            </button>
          </div>
          {formData.length === 0 && (
            <div className="text-center py-4 mb-2 rounded" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('body.dragFileHere')}</div>
            </div>
          )}
          {formData.map((p: KeyValue, i: number) => (
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
                <input type="checkbox" checked={p.enabled} onChange={e => updateFormData(i, "enabled", e.target.checked)} className="w-3.5 h-3.5 rounded" />
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={p.key}
                    onChange={e => { updateFormData(i, "key", e.target.value); handleInputChange(e.target.value); }}
                    onFocus={() => { setFocusedInput(`form-key-${i}`); handleInputChange(p.key); }}
                    onBlur={() => hideSuggestionsDelayed()}
                    placeholder="Key"
                    className="w-full px-2 py-1 rounded text-xs"
                    style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                    ref={el => { inputRefs.current[`form-key-${i}`] = el; }}
                  />
                  {showSuggestions && focusedInput === `form-key-${i}` && suggestionList.length > 0 && (
                    <VariableSuggestions
                      suggestions={suggestionList}
                      onSelect={(v) => { updateFormData(i, "key", insertVariable(inputRefs.current[`form-key-${i}`] as HTMLInputElement, v)); }}
                      onClose={() => setShowSuggestions(false)}
                    />
                  )}
                </div>
                {p.isFile ? (
                  <div className="flex items-center gap-1 flex-1">
                    <input type="file" id={`form-file-${i}`} className="hidden" multiple onChange={e => { const files = Array.from(e.target.files || []); if (files.length > 0) { const file = files[0]; if (file.size > MAX_BINARY_FILE_SIZE) { showToast(`${t('body.fileTooLarge')}: ${formatFileSize(file.size)}. ${t('body.maxAllowed')} ${formatFileSize(MAX_BINARY_FILE_SIZE)}`, 'error'); return; } updateFormData(i, "file", file || null); updateFormData(i, "value", file ? file.name : ''); } }} />
                    <label htmlFor={`form-file-${i}`} className="px-3 py-1 rounded text-xs cursor-pointer flex-1 text-center" style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}>
                      {p.value ? `${t('body.selected')}: ${p.value}` : t('body.clickToSelect')}
                    </label>
                    {p.file && (
                      <>
                        <span className="text-[10px] px-1 flex items-center gap-1" style={{ color: p.file.size > MAX_BINARY_FILE_SIZE ? 'var(--danger)' : 'var(--text-muted)' }}>
                          {formatFileSize(p.file.size)}
                          {p.file.size > MAX_BINARY_FILE_SIZE && ' ⚠️'}
                        </span>
                        <span className="px-1 rounded text-[10px]" style={{ backgroundColor: 'var(--bg-tertiary)' }}>{p.file.type.split('/')[1] || p.file.type}</span>
                      </>
                    )}
                    <button onClick={() => { updateFormData(i, "isFile", false); updateFormData(i, "file", null); updateFormData(i, "value", ""); }} className="p-1" title={t('body.removeFile')} style={{ color: 'var(--text-muted)' }}>
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={p.value}
                      onChange={e => { updateFormData(i, "value", e.target.value); handleInputChange(e.target.value); }}
                      onFocus={() => { setFocusedInput(`form-value-${i}`); handleInputChange(p.value); }}
                      onBlur={() => hideSuggestionsDelayed()}
                      placeholder="Value"
                      className="w-full px-2 py-1 rounded text-xs"
                      style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                      ref={el => { inputRefs.current[`form-value-${i}`] = el; }}
                    />
                    {showSuggestions && focusedInput === `form-value-${i}` && suggestionList.length > 0 && (
                      <VariableSuggestions
                        suggestions={suggestionList}
                        onSelect={(v) => { updateFormData(i, "value", insertVariable(inputRefs.current[`form-value-${i}`] as HTMLInputElement, v)); }}
                        onClose={() => setShowSuggestions(false)}
                      />
                    )}
                  </div>
                )}
                <button onClick={() => toggleFormDataFile(i)} className="px-1.5 py-0.5 text-[10px] rounded" style={p.isFile ? { backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' } : { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>{p.isFile ? t('body.file') : t('body.text')}</button>
                <button
                  onClick={() => toggleFormDataDescription(i)}
                  className="w-5 h-5 flex items-center justify-center rounded text-xs"
                  style={{
                    backgroundColor: formDataExpandedDesc.has(i) || p.description ? 'var(--accent)' : 'var(--bg-tertiary)',
                    color: formDataExpandedDesc.has(i) || p.description ? 'var(--text-inverse)' : 'var(--text-muted)'
                  }}
                  title={p.description ? t('body.description') : t('body.addDescription')}
                >
                  📝
                </button>
                <button onClick={() => removeFormData(i)} className="p-1" style={{ color: 'var(--text-muted)' }}><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
              {formDataExpandedDesc.has(i) && (
                <div className="flex items-center gap-1.5 py-1 pl-6">
                  <span className="text-xs" style={{ color: "var(--text-muted)", minWidth: "50px" }}>{t('body.description')}:</span>
                  <input
                    type="text"
                    value={p.description || ""}
                    onChange={e => updateFormData(i, "description", e.target.value)}
                    placeholder={t('body.fieldDescription')}
                    className="flex-1 px-2 py-0.5 rounded text-xs"
                    style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }}
                  />
                </div>
              )}
            </div>
          ))}
          <button onClick={() => addFormData()} className="text-xs" style={{ color: 'var(--accent)' }}>+ {t('body.addField')}</button>
          {isDragging && (
            <div className="text-center py-2 text-xs" style={{ color: 'var(--accent)' }}>
              {t('body.dropToAdd')}
            </div>
          )}
        </div>
      )}
      {bodyType === "x-www-form-urlencoded" && (
        <div>
          <InputModal
            isOpen={showBulkImportModal}
            title={t('body.bulkImport')}
            placeholder={t('body.pasteJsonOrQuery')}
            confirmText={t('body.import')}
            onConfirm={handleBulkImport}
            onCancel={() => setShowBulkImportModal(false)}
          />
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>x-www-form-urlencoded</span>
            <div className="flex gap-2">
              <button
                onClick={() => setShowBulkImportModal(true)}
                className="px-2 py-0.5 text-[10px] rounded flex items-center gap-1"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                title={t('body.bulkImport')}
              >
                <span>📥</span>
                <span>{t('body.import')}</span>
              </button>
              <button
                onClick={smartGenerateUrlencoded}
                className="px-2 py-0.5 text-[10px] rounded flex items-center gap-1"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}
                title={t('body.autoGenerate')}
              >
                <span>🔄</span>
                <span>{t('body.generate')}</span>
              </button>
            </div>
          </div>
          {urlencodedBody.map((p: KeyValue, i: number) => (
          <div key={i} className="flex flex-col">
            <div className="flex items-center gap-1.5 py-1">
              <input type="checkbox" checked={p.enabled} onChange={e => { const n = [...urlencodedBody]; n[i] = { ...n[i], enabled: e.target.checked }; setUrlencodedData(n); }} className="w-3.5 h-3.5 rounded" />
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={p.key}
                  onChange={e => { const n = [...urlencodedBody]; n[i] = { ...n[i], key: e.target.value }; setUrlencodedData(n); handleInputChange(e.target.value); }}
                  onFocus={() => { setFocusedInput(`urlenc-key-${i}`); handleInputChange(p.key); }}
                  onBlur={() => hideSuggestionsDelayed()}
                  placeholder="Key"
                  className="w-full px-2 py-1 rounded text-xs"
                  style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                  ref={el => { inputRefs.current[`urlenc-key-${i}`] = el; }}
                />
                {showSuggestions && focusedInput === `urlenc-key-${i}` && suggestionList.length > 0 && (
                  <VariableSuggestions
                    suggestions={suggestionList}
                    onSelect={(v) => { const n = [...urlencodedBody]; n[i] = { ...n[i], key: insertVariable(inputRefs.current[`urlenc-key-${i}`] as HTMLInputElement, v) }; setUrlencodedData(n); }}
                    onClose={() => setShowSuggestions(false)}
                  />
                )}
              </div>
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={p.value}
                  onChange={e => { const n = [...urlencodedBody]; n[i] = { ...n[i], value: e.target.value }; setUrlencodedData(n); handleInputChange(e.target.value); }}
                  onFocus={() => { setFocusedInput(`urlenc-value-${i}`); handleInputChange(p.value); }}
                  onBlur={() => hideSuggestionsDelayed()}
                  placeholder="Value"
                  className="w-full px-2 py-1 rounded text-xs"
                  style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                  ref={el => { inputRefs.current[`urlenc-value-${i}`] = el; }}
                />
                {showSuggestions && focusedInput === `urlenc-value-${i}` && suggestionList.length > 0 && (
                  <VariableSuggestions
                    suggestions={suggestionList}
                    onSelect={(v) => { const n = [...urlencodedBody]; n[i] = { ...n[i], value: insertVariable(inputRefs.current[`urlenc-value-${i}`] as HTMLInputElement, v) }; setUrlencodedData(n); }}
                    onClose={() => setShowSuggestions(false)}
                  />
                )}
              </div>
              <button
                onClick={() => toggleUrlencodedDescription(i)}
                className="w-5 h-5 flex items-center justify-center rounded text-xs"
                style={{
                  backgroundColor: urlencodedExpandedDesc.has(i) || p.description ? 'var(--accent)' : 'var(--bg-tertiary)',
                  color: urlencodedExpandedDesc.has(i) || p.description ? 'var(--text-inverse)' : 'var(--text-muted)'
                }}
                title={p.description ? t('body.description') : t('body.addDescription')}
              >
                📝
              </button>
              <button onClick={() => setUrlencodedData(urlencodedBody.filter((_: KeyValue, idx: number) => idx !== i))} className="p-1" style={{ color: 'var(--text-muted)' }}><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            {urlencodedExpandedDesc.has(i) && (
              <div className="flex items-center gap-1.5 py-1 pl-6">
                <span className="text-xs" style={{ color: "var(--text-muted)", minWidth: "50px" }}>{t('body.description')}:</span>
                <input
                  type="text"
                  value={p.description || ""}
                  onChange={e => { const n = [...urlencodedBody]; n[i] = { ...n[i], description: e.target.value }; setUrlencodedData(n); }}
                  placeholder={t('body.fieldDescription')}
                  className="flex-1 px-2 py-0.5 rounded text-xs"
                  style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }}
                />
              </div>
            )}
          </div>
        ))}<button onClick={() => setUrlencodedData([...urlencodedBody, { key: "", value: "", enabled: true }])} className="text-xs" style={{ color: 'var(--accent)' }}>+ {t('body.addField')}</button></div>
      )}
      {bodyType === "graphql" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 flex-1">
              <input
                type="text"
                placeholder={t('body.graphQLSchemaUrl')}
                value={graphqlSchemaUrl}
                onChange={(e) => setGraphqlSchemaUrl(e.target.value)}
                className="flex-1 px-2 py-1 rounded text-xs"
                style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
              />
              <button
                onClick={handleLoadGraphQLSchema}
                disabled={graphqlLoading || !graphqlSchemaUrl}
                className="px-2 py-1 rounded text-xs"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)', opacity: graphqlLoading || !graphqlSchemaUrl ? 0.5 : 1 }}
              >
                {graphqlLoading ? t('body.loading') : t('body.loadSchema')}
              </button>
              {graphqlSchema && (
                <button
                  onClick={handleClearGraphQLSchema}
                  className="px-2 py-1 rounded text-xs"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
                >
                  {t('body.clear')}
                </button>
              )}
            </div>
          </div>
          {graphqlSchema && (
            <div className="flex items-center justify-between">
              <div className="text-[10px] px-2 py-1 rounded" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
                {t('body.schemaLoaded')}: {graphqlSchema.types?.length || 0} {t('body.types')} | Query: {graphqlSchema.queryType?.name || 'N/A'}
              </div>
              <button
                onClick={() => setShowGraphqlSchemaDocs(!showGraphqlSchemaDocs)}
                className="px-2 py-1 rounded text-xs"
                style={{ backgroundColor: showGraphqlSchemaDocs ? 'var(--accent)' : 'var(--bg-tertiary)', color: showGraphqlSchemaDocs ? 'var(--text-inverse)' : 'var(--text-muted)' }}
              >
                {showGraphqlSchemaDocs ? t('body.hideDocs') : t('body.viewDocs')}
              </button>
            </div>
          )}
          {showGraphqlSchemaDocs && graphqlSchema && (
            <GraphQLSchemaDocs schema={graphqlSchema} />
          )}
          {graphqlSchemaError && (
            <div className="text-[10px] px-2 py-1 rounded" style={{ backgroundColor: 'rgba(248, 113, 113, 0.1)', color: 'var(--danger)' }}>
              {graphqlSchemaError}
            </div>
          )}
          <div className="relative">
            <MonacoEditor
              height="120px"
              language="graphql"
              value={graphqlQuery || ''}
              onChange={(v) => { setGraphqlQuery?.(v || ''); handleInputChange(v || ''); }}
              theme="vs-dark"
              beforeMount={(monaco) => {
                registerGraphQLCompletionProvider(monaco, getSuggestions);
              }}
              options={{
                minimap: { enabled: false },
                lineNumbers: 'on',
                fontSize: 12,
                tabSize: 2,
                automaticLayout: true,
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                folding: true,
              }}
            />
            {showSuggestions && focusedInput === 'graphql-query' && suggestionList.length > 0 && (
              <VariableSuggestions
                suggestions={suggestionList}
                onSelect={(v) => { setGraphqlQuery?.(insertVariable(document.querySelector('.monaco-editor textarea') as HTMLTextAreaElement, v)); }}
                onClose={() => setShowSuggestions(false)}
              />
            )}
          </div>
          <div className="relative">
            <div className="text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>Variables:</div>
            <MonacoEditor
              height="80px"
              language="json"
              value={graphqlVariables}
              onChange={(v) => { setGraphqlVariables(v || ''); handleInputChange(v || ''); }}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                lineNumbers: 'on',
                fontSize: 12,
                tabSize: 2,
                automaticLayout: true,
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                folding: true,
              }}
            />
            {showSuggestions && focusedInput === 'graphql-vars' && suggestionList.length > 0 && (
              <VariableSuggestions
                suggestions={suggestionList}
                onSelect={(v) => { setGraphqlVariables(insertVariable(document.querySelectorAll('.monaco-editor textarea')[1] as HTMLTextAreaElement, v)); }}
                onClose={() => setShowSuggestions(false)}
              />
            )}
          </div>
        </div>
      )}
      {bodyType === "binary" && (
        <div className="border-2 border-dashed border-gray-300 rounded p-4 text-center">
          <input type="file" id="shared-binary-file" className="hidden" onChange={async e => { const file = e.target.files?.[0]; if (file) { if (file.size > MAX_BINARY_FILE_SIZE) { showToast(`${t('body.fileTooLarge')}: ${formatFileSize(file.size)}. ${t('body.maxAllowed')} ${formatFileSize(MAX_BINARY_FILE_SIZE)}`, 'error'); return; } const reader = new FileReader(); const content = await new Promise<string>((resolve) => { reader.onload = () => resolve(reader.result as string); reader.readAsDataURL(file); }); setBinaryFile({ name: file.name, size: file.size, content }); } }} />
          <label htmlFor="shared-binary-file" className="cursor-pointer text-xs" style={{ color: 'var(--accent)' }}>
            {binaryFile ? `${binaryFile.name} (${formatFileSize(binaryFile.size)})` : t('body.selectBinaryFile')}
          </label>
          {binaryFile && (
            <>
              {binaryFile.size > MAX_BINARY_FILE_SIZE && (
                <div className="mt-2 text-xs" style={{ color: 'var(--danger)' }}>
                  ⚠️ {t('body.fileExceedLimit')} ({formatFileSize(binaryFile.size)} / {formatFileSize(MAX_BINARY_FILE_SIZE)})
                </div>
              )}
              <button onClick={() => setBinaryFile(null)} className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>{t('body.clear')}</button>
            </>
          )}
        </div>
      )}
      {bodyType === "none" && <div className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>{t('body.noRequestBody')}</div>}
    </div>
  );
}