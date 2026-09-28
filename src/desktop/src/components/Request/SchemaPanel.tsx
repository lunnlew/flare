import { useState } from "react";
import { SchemaTreeEditor, jsonSchemaToSchema, schemaToJsonSchema, type SchemaField } from "../Common/SchemaTreeEditor";
import { useSettingsStore } from "../../store";
import { useTranslation } from "../../utils/i18n";

// Content type categories
type ContentCategory = 'json' | 'xml' | 'text' | 'binary' | 'unknown';

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

function classifyContentType(contentType?: string): ContentCategory {
  if (!contentType) return 'unknown';
  const ct = contentType.toLowerCase();
  if (ct.includes('json')) return 'json';
  if (ct.includes('xml')) return 'xml';
  if (ct.includes('text') || ct.includes('plain')) return 'text';
  if (ct.includes('octet-stream') || ct.includes('binary') || ct.includes('image') || ct.includes('video') || ct.includes('audio')) return 'binary';
  return 'unknown';
}

// Default empty schema (mode='schema')
function createDefaultSchema(): SchemaField {
  return {
    id: 'root',
    key: 'root',
    type: 'object',
    mode: 'schema',
    children: [],
  };
}

const QUICK_STATUS_CODES = [200, 201, 204, 400, 401, 404, 500];

interface RenameInfo {
  oldKey: string;
  newKey: string;
}

interface SchemaPanelProps {
  requestSchemas?: Record<string, any>;
  responseSchemas?: Record<string, any>;
  onRequestSchemasChange?: (schemas: Record<string, any>, renameInfo?: RenameInfo) => void;
  onResponseSchemasChange?: (schemas: Record<string, any>) => void;
}

// Request Schema Section
function RequestSchemaSection({
  schemas,
  onChange,
}: {
  schemas?: Record<string, any>;
  onChange?: (schemas: Record<string, any>, renameInfo?: RenameInfo) => void;
}) {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [renamingKey, setRenamingKey] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [addName, setAddName] = useState("");

  const items = schemas || {};

  return (
    <div className="space-y-3">
      <div className="text-xs font-medium flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
        <span>{t('request.requestSchema')}</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
          {t('request.parameterCount', { count: Object.keys(items).length })}
        </span>
      </div>

      {/* Add Form */}
      <div className="p-2 rounded border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            placeholder={t('request.paramName')}
            className="px-2 py-1 rounded text-xs flex-1"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
          />
          <button
            onClick={() => {
              if (!addName.trim()) return;
              const newSchemas = {
                ...items,
                [addName.trim()]: { type: 'object', properties: {} },
              };
              onChange?.(newSchemas);
              setAddName("");
            }}
            className="px-2 py-1 rounded text-xs"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}
          >
            +
          </button>
        </div>
      </div>

      {/* Rename Input */}
      {renamingKey && (
        <div className="p-2 rounded border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--accent)' }}>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('request.rename')}</span>
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="px-2 py-1 rounded text-xs flex-1"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--accent)' }}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && renameValue.trim() && renameValue !== renamingKey) {
                  const newItems = { ...items };
                  const schema = newItems[renamingKey];
                  delete newItems[renamingKey];
                  newItems[renameValue.trim()] = schema;
                  onChange?.(newItems, { oldKey: renamingKey, newKey: renameValue.trim() });
                  setRenamingKey(null);
                } else if (e.key === 'Escape') {
                  setRenamingKey(null);
                }
              }}
            />
            <button
              onClick={() => {
                if (renameValue.trim() && renameValue !== renamingKey) {
                  const newItems = { ...items };
                  const schema = newItems[renamingKey];
                  delete newItems[renamingKey];
                  newItems[renameValue.trim()] = schema;
                  onChange?.(newItems, { oldKey: renamingKey, newKey: renameValue.trim() });
                }
                setRenamingKey(null);
              }}
              className="px-2 py-1 rounded text-xs"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}
            >
              {t('request.confirm')}
            </button>
            <button
              onClick={() => setRenamingKey(null)}
              className="px-2 py-1 rounded text-xs"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
            >
              {t('request.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Schema List */}
      {Object.keys(items).length === 0 ? (
        <div className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>
          {t('request.noRequestParams')}
        </div>
      ) : (
        Object.entries(items).map(([key, schema]) => (
          <div
            key={key}
            className="rounded border overflow-hidden"
            style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
          >
            <div className="flex items-center justify-between px-2 py-1.5" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <div className="flex items-center gap-2">
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                  style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}
                >
                  {key}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setEditingKey(editingKey === key ? null : key)}
                  className="px-1.5 py-0.5 rounded text-[10px]"
                  style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
                >
                  {editingKey === key ? t('request.collapse') : t('request.edit')}
                </button>
                <button
                  onClick={() => {
                    setRenamingKey(key);
                    setRenameValue(key);
                  }}
                  className="px-1.5 py-0.5 rounded text-[10px]"
                  style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
                >
                  {t('request.rename')}
                </button>
                <button
                  onClick={() => {
                    const updated = { ...items };
                    delete updated[key];
                    onChange?.(updated);
                  }}
                  className="px-1.5 py-0.5 rounded text-[10px]"
                  style={{ backgroundColor: 'var(--danger)', color: 'var(--text-inverse)' }}
                >
                  ×
                </button>
              </div>
            </div>

            {editingKey === key && (
              <div className="p-2" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <SchemaTreeEditor
                  schema={schema ? jsonSchemaToSchema(schema) : createDefaultSchema()}
                  onChange={(newSchema) => {
                    onChange?.({ ...items, [key]: schemaToJsonSchema(newSchema) });
                  }}
                />
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

// Response Schema Section
function ResponseSchemaSection({
  schemas,
  onChange,
}: {
  schemas?: Record<string, any>;
  onChange?: (schemas: Record<string, any>) => void;
}) {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [addStatusCode, setAddStatusCode] = useState("200");
  const [addDescription, setAddDescription] = useState("");

  const items = schemas || {};

  return (
    <div className="space-y-3">
      <div className="text-xs font-medium flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
        <span>{t('request.responseSchema')}</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
          {t('request.parameterCount', { count: Object.keys(items).length })}
        </span>
      </div>

      {/* Add Form */}
      <div className="p-2 rounded border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
        <div className="flex gap-1 mb-2 flex-wrap">
          {QUICK_STATUS_CODES.map((code) => (
            <button
              key={code}
              onClick={() => setAddStatusCode(code.toString())}
              className="px-1.5 py-0.5 rounded text-[10px] font-mono"
              style={{
                backgroundColor: addStatusCode === code.toString() ? getStatusCodeColor(code) : 'var(--bg-tertiary)',
                color: addStatusCode === code.toString() ? 'var(--text-inverse)' : 'var(--text-primary)',
                border: '1px solid var(--border-color)',
              }}
            >
              {code}
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
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: `1px solid ${getStatusCodeColor(parseInt(addStatusCode) || 200)}` }}
          />
          <input
            type="text"
            value={addDescription}
            onChange={(e) => setAddDescription(e.target.value)}
            placeholder={t('request.responseDescription')}
            className="px-2 py-1 rounded text-xs flex-1"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
          />
          <button
            onClick={() => {
              const code = parseInt(addStatusCode) || 200;
              const key = `resp_${code}_${Date.now()}`;
              const contentCategory = code >= 200 && code < 300 ? 'json' : 'text';
              const newSchemas = {
                ...items,
                [key]: {
                  statusCode: code,
                  description: addDescription || 'Response',
                  schema: { type: 'object', properties: {} },
                  contentType: 'application/json',
                  contentCategory,
                },
              };
              onChange?.(newSchemas);
              setAddDescription("");
            }}
            className="px-2 py-1 rounded text-xs"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}
          >
            +
          </button>
        </div>
      </div>

      {/* Schema List */}
      {Object.keys(items).length === 0 ? (
        <div className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>
          {t('request.noResponseDefinition')}
        </div>
      ) : (
        Object.entries(items).sort(([, a], [, b]) => {
          const aCode = a.statusCode || 200;
          const bCode = b.statusCode || 200;
          const aGroup = Math.floor(aCode / 100);
          const bGroup = Math.floor(bCode / 100);
          if (aGroup === 2 && bGroup !== 2) return -1;
          if (aGroup !== 2 && bGroup === 2) return 1;
          return aCode - bCode;
        }).map(([key, resp]: [string, any]) => {
          const contentCategory = resp.contentCategory ?? classifyContentType(resp.contentType) ?? 'json';
          return (
            <div
              key={key}
              className="rounded border overflow-hidden"
              style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
            >
              <div className="flex items-center justify-between px-2 py-1.5" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold"
                    style={{ backgroundColor: getStatusCodeColor(resp.statusCode || 200), color: 'var(--text-inverse)' }}
                  >
                    {resp.statusCode || 200}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-primary)' }}>
                    {resp.description || 'Response'}
                  </span>
                  {resp.contentType && (
                    <span
                      className="text-[9px] px-1 py-0.5 rounded font-mono"
                      style={{ backgroundColor: getContentCategoryColor(contentCategory), color: 'var(--text-inverse)' }}
                      title={resp.contentType}
                    >
                      {getContentCategoryIcon(contentCategory)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditingKey(editingKey === key ? null : key)}
                    className="px-1.5 py-0.5 rounded text-[10px]"
                    style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
                  >
                    {editingKey === key ? t('request.collapse') : t('request.edit')}
                  </button>
                  <button
                    onClick={() => {
                      const updated = { ...items };
                      delete updated[key];
                      onChange?.(updated);
                    }}
                    className="px-1.5 py-0.5 rounded text-[10px]"
                    style={{ backgroundColor: 'var(--danger)', color: 'var(--text-inverse)' }}
                  >
                    ×
                  </button>
                </div>
              </div>

              {editingKey === key && (
                <div className="p-2" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  {contentCategory === 'binary' ? (
                    <div className="flex items-center gap-2 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                      <span>📦</span>
                      <span>{t('request.binary')}</span>
                    </div>
                  ) : (
                    <SchemaTreeEditor
                      schema={resp.schema ? jsonSchemaToSchema(resp.schema) : createDefaultSchema()}
                      onChange={(newSchema) => {
                        onChange?.({
                          ...items,
                          [key]: { ...resp, schema: schemaToJsonSchema(newSchema) },
                        });
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

export function SchemaPanel({
  requestSchemas = {},
  responseSchemas = {},
  onRequestSchemasChange,
  onResponseSchemasChange,
}: SchemaPanelProps) {
  return (
    <div className="space-y-6">
      <RequestSchemaSection
        schemas={requestSchemas}
        onChange={onRequestSchemasChange}
      />
      <ResponseSchemaSection
        schemas={responseSchemas}
        onChange={onResponseSchemasChange}
      />
    </div>
  );
}