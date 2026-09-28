import { useState, useCallback, useEffect, useMemo } from "react";
import { SchemaTreeEditor, jsonSchemaToSchema, schemaToJsonSchema } from "../Common/SchemaTreeEditor";
import { useSettingsStore } from "../../store";
import { useTranslation } from "../../utils/i18n";

// Content type categories
type ContentCategory = 'json' | 'xml' | 'text' | 'binary' | 'unknown';

interface ResponseSchema {
  statusCode: number;
  description: string;
  schema?: Record<string, unknown>;
  example?: unknown;
  contentType?: string;
  contentCategory?: ContentCategory;
}

interface ResponsesPanelProps {
  responseSchemas?: Record<string, ResponseSchema>;
  onResponseSchemasChange?: (schemas: Record<string, ResponseSchema>) => void;
}

const QUICK_STATUS_CODES = [
  { code: 200, label: '200' },
  { code: 201, label: '201' },
  { code: 204, label: '204' },
  { code: 400, label: '400' },
  { code: 401, label: '401' },
  { code: 404, label: '404' },
  { code: 500, label: '500' },
];

function getStatusCodeColor(code: number): string {
  if (code >= 200 && code < 300) return 'var(--success)';
  if (code >= 400 && code < 500) return 'var(--warning)';
  if (code >= 500) return 'var(--danger)';
  return 'var(--text-muted)';
}

function getContentCategoryIcon(category?: ContentCategory): string {
  switch (category) {
    case 'json': return '{ }';
    case 'xml': return '</>';
    case 'text': return 'Aa';
    case 'binary': return 'Bin';
    default: return '?';
  }
}

function getContentCategoryColor(category?: ContentCategory): string {
  switch (category) {
    case 'json': return 'var(--accent)';
    case 'xml': return 'var(--warning)';
    case 'text': return 'var(--text-muted)';
    case 'binary': return 'var(--danger)';
    default: return 'var(--text-muted)';
  }
}

export function ResponsesPanel({ responseSchemas, onResponseSchemasChange }: ResponsesPanelProps) {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);

  const schemas = responseSchemas || {};
  const [editingResponseKey, setEditingResponseKey] = useState<string | null>(null);
  const [addStatusCode, setAddStatusCode] = useState("200");
  const [addDescription, setAddDescription] = useState("");

  // Auto-expand first response when panel first loads (only on mount with schemas)
  useEffect(() => {
    if (schemas && Object.keys(schemas).length > 0 && editingResponseKey === null) {
      const firstKey = Object.keys(schemas)[0];
      setEditingResponseKey(firstKey);
    }
  }, []);

  // Sort responses: 2xx first, then 4xx/5xx, by status code
  const sortedSchemas = useMemo(() => {
    return Object.entries(schemas).sort(([, a], [, b]) => {
      const aGroup = Math.floor(a.statusCode / 100);
      const bGroup = Math.floor(b.statusCode / 100);
      if (aGroup === 2 && bGroup !== 2) return -1;
      if (aGroup !== 2 && bGroup === 2) return 1;
      return a.statusCode - b.statusCode;
    });
  }, [schemas]);

  const handleAddResponse = useCallback(() => {
    const newKey = `resp_${Date.now()}`;
    const newSchema: ResponseSchema = {
      statusCode: parseInt(addStatusCode) || 200,
      description: addDescription || "Response",
      schema: { type: "object", properties: {} },
    };
    onResponseSchemasChange?.({ ...schemas, [newKey]: newSchema });
    setAddDescription("");
  }, [addStatusCode, addDescription, schemas, onResponseSchemasChange]);

  const handleQuickSelectStatus = (code: number) => {
    setAddStatusCode(code.toString());
  };

  const handleDeleteResponse = useCallback((key: string) => {
    const updated = { ...schemas };
    delete updated[key];
    onResponseSchemasChange?.(updated);
    if (editingResponseKey === key) {
      setEditingResponseKey(null);
    }
  }, [schemas, editingResponseKey, onResponseSchemasChange]);

  const handleUpdateResponse = useCallback((key: string, updates: Partial<ResponseSchema>) => {
    const updated = { ...schemas };
    if (updated[key]) {
      updated[key] = { ...updated[key], ...updates };
      onResponseSchemasChange?.(updated);
    }
  }, [schemas, onResponseSchemasChange]);

  return (
    <div className="space-y-4">
      {/* Add New Response */}
      <div className="p-3 rounded border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
        <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-primary)' }}>{t('response.addResponse')}</div>

        {/* Quick status code buttons */}
        <div className="flex gap-1 mb-2 flex-wrap">
          {QUICK_STATUS_CODES.map(({ code, label }) => (
            <button
              key={code}
              onClick={() => handleQuickSelectStatus(code)}
              className="px-2 py-1 rounded text-xs font-mono"
              style={{
                backgroundColor: addStatusCode === code.toString() ? getStatusCodeColor(code) : 'var(--bg-tertiary)',
                color: addStatusCode === code.toString() ? 'var(--text-inverse)' : 'var(--text-primary)',
                border: '1px solid var(--border-color)',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={addStatusCode}
            onChange={(e) => setAddStatusCode(e.target.value)}
            placeholder="200"
            className="px-2 py-1 rounded text-xs w-16 text-center font-mono"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: `1px solid ${getStatusCodeColor(parseInt(addStatusCode) || 200)}`, fontWeight: 'bold' }}
          />
          <input
            type="text"
            value={addDescription}
            onChange={(e) => setAddDescription(e.target.value)}
            placeholder={t('request.responseDescription')}
            className="flex-1 px-2 py-1 rounded text-xs"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
          />
          <button
            onClick={handleAddResponse}
            className="px-3 py-1 rounded text-xs"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}
          >
            {t('response.add')}
          </button>
        </div>
      </div>

      {/* Response List */}
      {Object.keys(schemas).length === 0 ? (
        <div className="text-xs text-center py-8" style={{ color: 'var(--text-muted)' }}>
          {t('response.noResponseDefinition')}
        </div>
      ) : (
        sortedSchemas.map(([key, resp]) => (
          <div
            key={key}
            className="rounded border overflow-hidden"
            style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
          >
            {/* Response Header */}
            <div className="flex items-center justify-between px-3 py-2" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <div className="flex items-center gap-2">
                <span
                  className="text-xs px-2 py-0.5 rounded font-mono font-bold"
                  style={{
                    backgroundColor: getStatusCodeColor(resp.statusCode),
                    color: 'var(--text-inverse)',
                  }}
                >
                  {resp.statusCode}
                </span>
                <input
                  type="text"
                  value={resp.description}
                  onChange={(e) => handleUpdateResponse(key, { description: e.target.value })}
                  placeholder={t('request.responseDescription')}
                  className="px-2 py-0.5 rounded text-xs"
                  style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                />
                {/* Content Type Badge */}
                {resp.contentType && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                    style={{
                      backgroundColor: getContentCategoryColor(resp.contentCategory),
                      color: 'var(--text-inverse)',
                    }}
                    title={resp.contentType}
                  >
                    {getContentCategoryIcon(resp.contentCategory)} {resp.contentType.split('/')[1] || resp.contentType}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {resp.contentCategory !== 'binary' && resp.contentCategory !== 'unknown' && (
                  <button
                    onClick={() => setEditingResponseKey(editingResponseKey === key ? null : key)}
                    className="px-2 py-0.5 rounded text-xs"
                    style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
                  >
                    {editingResponseKey === key ? t('response.collapse') : t('response.editSchema')}
                  </button>
                )}
                <button
                  onClick={() => handleDeleteResponse(key)}
                  className="px-2 py-0.5 rounded text-xs"
                  style={{ backgroundColor: 'var(--danger)', color: 'var(--text-inverse)' }}
                >
                  {t('response.delete')}
                </button>
              </div>
            </div>

            {/* Schema Editor or Binary/Text Indicator */}
            {editingResponseKey === key && (
              <div className="p-3" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                {resp.contentCategory === 'binary' ? (
                  <div className="flex items-center gap-2 py-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span className="text-lg" title={resp.contentType}>📦</span>
                    <span>{t('response.binaryResponse', { type: resp.contentType || 'unknown type' })}</span>
                    <span className="text-[10px] px-1 rounded" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                      {resp.contentType}
                    </span>
                  </div>
                ) : resp.contentCategory === 'text' ? (
                  <div className="flex items-center gap-2 py-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span className="text-lg">📄</span>
                    <span>{t('response.textResponse')}</span>
                    <span className="text-[10px] px-1 rounded" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                      {resp.contentType}
                    </span>
                  </div>
                ) : resp.contentCategory === 'xml' ? (
                  <div className="flex items-center gap-2 py-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span className="text-lg">&lt;/&gt;</span>
                    <span>{t('response.xmlResponse')}</span>
                    <span className="text-[10px] px-1 rounded" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                      {resp.contentType}
                    </span>
                  </div>
                ) : resp.schema ? (
                  <SchemaTreeEditor
                    schema={jsonSchemaToSchema(resp.schema)}
                    onChange={(newSchema) => handleUpdateResponse(key, { schema: schemaToJsonSchema(newSchema) })}
                  />
                ) : (
                  <div className="flex items-center gap-2 py-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span className="text-lg">❓</span>
                    <span>{t('response.noSchemaDefinition')}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
