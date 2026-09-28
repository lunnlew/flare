import { useState, useCallback } from "react";
import { useSettingsStore } from "../../store";
import { useTranslation } from "../../utils/i18n";

// Editor mode - determines which field properties are used
export type EditorMode = 'schema' | 'param';

// Base field interface with common properties
export interface BaseField {
  id: string;
  key: string;
  type: "string" | "number" | "integer" | "boolean" | "object" | "array";
  description?: string;
  children?: BaseField[];  // for object
  items?: BaseField;       // for array
}

// Schema mode field (for response/request body schemas)
export interface SchemaField extends BaseField {
  mode?: 'schema';
  example?: string;
  enum?: string[];
  format?: string;
  minimum?: number;
  maximum?: number;
  default?: unknown;
  const?: unknown;
}

// Param mode field (for query params, headers, etc.)
export interface ParamField extends BaseField {
  mode?: 'param';
  value?: string | number | boolean;
  enabled?: boolean;
  required?: boolean;
  location?: 'query' | 'header' | 'path' | 'body' | 'cookie';
  paramType?: 'string' | 'number' | 'boolean' | 'array';
  default?: unknown;
  minimum?: number;
  maximum?: number;
  enum?: string[];
  format?: string;
}

// Union type for flexibility
export type TreeField = SchemaField | ParamField;

// Default type
type Schema = SchemaField;

interface SchemaEditorProps {
  schema: Schema;
  onChange: (schema: Schema) => void;
  mode?: EditorMode;
}

// Counter for dynamically added fields (stable across re-renders within session)
let dynamicIdCounter = 0;
function generateDynamicId(): string {
  return `dynamic_${++dynamicIdCounter}`;
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

function generateId(key: string, type: string, path: string): string {
  return hashString(`${path}|${key}|${type}`);
}

function createField(overrides: Partial<SchemaField> = {}, path?: string): SchemaField {
  const key = overrides.key || "";
  const type = overrides.type || "string";
  // If path is provided, use path-based ID (for loaded schemas)
  // Otherwise use dynamic ID (for newly added fields)
  const id = path !== undefined
    ? generateId(key, type, path)
    : generateDynamicId();
  return {
    id,
    key,
    type,
    mode: 'schema',
    ...overrides,
  };
}

// Create a param field
export function createParamField(overrides: Partial<ParamField> = {}, path?: string): ParamField {
  const key = overrides.key || "";
  const type = (overrides.type as ParamField['type']) || "string";
  const id = path !== undefined
    ? generateId(key, type, path)
    : generateDynamicId();
  return {
    id,
    key,
    type,
    mode: 'param',
    value: '',
    enabled: true,
    ...overrides,
  };
}

export function SchemaTreeEditor({ schema, onChange, mode = 'schema' }: SchemaEditorProps) {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);

  // Always start fully expanded - no collapsed state by default
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const isParamMode = mode === 'param';

  const toggleCollapse = (id: string) => {
    const newSet = new Set(collapsed);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setCollapsed(newSet);
  };

  const updateField = useCallback((id: string, updates: Partial<SchemaField>) => {
    const update = (fields: SchemaField[]): SchemaField[] => {
      return fields.map(f => {
        if (f.id === id) {
          return { ...f, ...updates };
        }
        if (f.children) {
          return { ...f, children: update(f.children) };
        }
        if (f.items) {
          if (f.items.id === id) {
            return { ...f, items: { ...f.items, ...updates } };
          }
          return { ...f, items: updateInItems(f.items, id, updates) };
        }
        return f;
      });
    };
    onChange(update([schema])[0]);
  }, [schema, onChange]);

  const updateInItems = (item: SchemaField, id: string, updates: Partial<SchemaField>): SchemaField => {
    if (item.id === id) {
      return { ...item, ...updates };
    }
    if (item.children) {
      return { ...item, children: updateInItemsArray(item.children, id, updates) };
    }
    if (item.items) {
      return { ...item, items: updateInItems(item.items, id, updates) };
    }
    return item;
  };

  const updateInItemsArray = (items: SchemaField[], id: string, updates: Partial<SchemaField>): SchemaField[] => {
    return items.map(f => updateInItems(f, id, updates));
  };

  const addChild = useCallback((parentId: string, location: "children" | "items") => {
    const addToParent = (fields: SchemaField[]): SchemaField[] => {
      return fields.map(f => {
        if (f.id === parentId) {
          if (location === "children" && f.type === "object") {
            return { ...f, children: [...(f.children || []), createField({ key: `field_${(f.children?.length || 0) + 1}` })] };
          }
          if (location === "items" && f.type === "array") {
            if (f.items?.type === "object") {
              return { ...f, items: { ...f.items, children: [...(f.items.children || []), createField({ key: `field_${(f.items.children?.length || 0) + 1}` })] } };
            }
            return { ...f, items: createField() };
          }
        }
        if (f.children) {
          return { ...f, children: addToParent(f.children) };
        }
        if (f.items) {
          return { ...f, items: addChildToItems(f.items, parentId, location) };
        }
        return f;
      });
    };
    onChange(addToParent([schema])[0]);
  }, [schema, onChange]);

  const addChildToItems = (item: SchemaField, parentId: string, location: "children" | "items"): SchemaField => {
    if (item.id === parentId) {
      if (location === "children" && item.type === "object") {
        return { ...item, children: [...(item.children || []), createField({ key: `field_${(item.children?.length || 0) + 1}` })] };
      }
      if (location === "items" && item.type === "array") {
        if (item.items?.type === "object") {
          return { ...item, items: { ...item.items, children: [...(item.items.children || []), createField({ key: `field_${(item.items.children?.length || 0) + 1}` })] } };
        }
        return { ...item, items: createField() };
      }
    }
    if (item.children) {
      return { ...item, children: addToItemsChildren(item.children, parentId, location) };
    }
    if (item.items) {
      return { ...item, items: addChildToItems(item.items, parentId, location) };
    }
    return item;
  };

  const addToItemsChildren = (items: SchemaField[], parentId: string, location: "children" | "items"): SchemaField[] => {
    return items.map(item => {
      if (item.id === parentId) {
        if (location === "children" && item.type === "object") {
          return { ...item, children: [...(item.children || []), createField({ key: `field_${(item.children?.length || 0) + 1}` })] };
        }
        if (location === "items" && item.type === "array") {
          if (item.items?.type === "object") {
            return { ...item, items: { ...item.items, children: [...(item.items.children || []), createField({ key: `field_${(item.items.children?.length || 0) + 1}` })] } };
          }
          return { ...item, items: createField() };
        }
      }
      if (item.children) {
        return { ...item, children: addToItemsChildren(item.children, parentId, location) };
      }
      if (item.items) {
        return { ...item, items: addChildToItems(item.items, parentId, location) };
      }
      return item;
    });
  };

  const removeField = useCallback((id: string) => {
    const removeFromTree = (field: SchemaField): SchemaField | undefined => {
      if (field.id === id) {
        return undefined;
      }

      let updated: SchemaField = { ...field };

      if (field.children && field.children.length > 0) {
        const newChildren: SchemaField[] = [];
        for (const child of field.children) {
          const result = removeFromTree(child);
          if (result !== undefined) {
            newChildren.push(result);
          }
        }
        updated.children = newChildren;
      }

      if (field.items) {
        const result = removeFromTree(field.items);
        if (result === undefined) {
          updated.items = undefined;
        } else {
          updated.items = result;
        }
      }

      return updated;
    };

    const newSchema = removeFromTree(schema);
    if (newSchema !== undefined) {
      onChange(newSchema);
    }
  }, [schema, onChange]);

  const renderField = (field: SchemaField, depth: number = 0) => {
    const hasChildren = field.type === "object" && field.children && field.children.length > 0;
    const hasItems = field.type === "array" && field.items;
    const hasContent = hasChildren || (hasItems && (field.items!.type !== "object" || field.items!.children?.length));
    const isCollapsed = collapsed.has(field.id);

    return (
      <div key={field.id} className="mb-1">
        <div
          className="flex items-center gap-2 py-1.5 px-3 rounded"
          style={{ paddingLeft: depth * 20 + 12, backgroundColor: 'var(--bg-tertiary)' }}
        >
          {/* Expand/Collapse */}
          {hasContent ? (
            <button
              onClick={() => toggleCollapse(field.id)}
              className="w-5 h-5 flex items-center justify-center text-xs"
              style={{ color: 'var(--text-muted)' }}
            >
              {isCollapsed ? '▶' : '▼'}
            </button>
          ) : (
            <span className="w-5" />
          )}

          {/* Key */}
          <input
            type="text"
            value={field.key}
            onChange={(e) => updateField(field.id, { key: e.target.value })}
            placeholder={depth === 0 ? t('schema.rootNode') : t('schema.fieldName')}
            disabled={depth === 0}
            className="px-2 py-1 rounded text-xs w-32"
            style={{ backgroundColor: 'var(--bg-secondary)', color: depth === 0 ? 'var(--text-muted)' : '#818cf8', border: '1px solid var(--border-color)' }}
          />

          {/* Type */}
          <select
            value={field.type}
            onChange={(e) => updateField(field.id, { type: e.target.value as SchemaField["type"], children: e.target.value === "object" ? [] : field.children, items: e.target.value === "array" ? undefined : field.items })}
            className="px-2 py-1 rounded text-xs"
            style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
          >
            <option value="string">string</option>
            <option value="number">number</option>
            <option value="integer">integer</option>
            <option value="boolean">boolean</option>
            <option value="object">object</option>
            <option value="array">array</option>
          </select>

          {/* Description */}
          <input
            type="text"
            value={field.description || ""}
            onChange={(e) => updateField(field.id, { description: e.target.value })}
            placeholder={t('schema.description')}
            className="px-2 py-1 rounded text-xs flex-1"
            style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}
          />

          {/* Param mode: value, enabled, required, location */}
          {isParamMode ? (
            <>
              {/* Value input */}
              {field.type !== "object" && field.type !== "array" && (
                <input
                  type="text"
                  value={String((field as ParamField).value ?? "")}
                  onChange={(e) => updateField(field.id, { value: e.target.value } as any)}
                  placeholder={t('schema.value')}
                  className="px-2 py-1 rounded text-xs w-28"
                  style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                />
              )}

              {/* Enabled checkbox */}
              <input
                type="checkbox"
                checked={Boolean((field as ParamField).enabled ?? true)}
                onChange={(e) => updateField(field.id, { enabled: e.target.checked } as any)}
                className="w-4 h-4 rounded"
                title={t('schema.enabled')}
              />

              {/* Required checkbox */}
              <input
                type="checkbox"
                checked={(field as ParamField).required ?? false}
                onChange={(e) => updateField(field.id, { required: e.target.checked } as any)}
                className="w-4 h-4 rounded"
                title={t('schema.required')}
              />

              {/* Location select - hidden, query is default */}
            </>
          ) : (
            /* Schema mode: example */
            <>
              {field.type !== "object" && field.type !== "array" && (
                <input
                  type="text"
                  value={field.example || ""}
                  onChange={(e) => updateField(field.id, { example: e.target.value })}
                  placeholder={t('schema.sample')}
                  className="px-2 py-1 rounded text-xs w-28"
                  style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
                />
              )}
            </>
          )}

          {/* Actions */}
          <div className="flex gap-1">
            {(field.type === "object" || field.type === "array") && (
              <button
                onClick={() => addChild(field.id, field.type === "object" ? "children" : "items")}
                className="px-2 py-1 rounded text-xs font-medium"
                style={{ backgroundColor: 'var(--success)', color: 'var(--text-inverse)' }}
                title={t('schema.addChild')}
              >
                +
              </button>
            )}
            {depth !== 0 && (
              <button
                onClick={() => removeField(field.id)}
                className="px-2 py-1 rounded text-xs font-medium"
                style={{ backgroundColor: 'var(--danger)', color: 'var(--text-inverse)' }}
                title={t('schema.delete')}
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Children */}
        {!isCollapsed && hasContent && (
          <div>
            {field.type === "object" && field.children?.map(child => renderField(child, depth + 1))}
            {field.type === "array" && field.items && renderField(field.items, depth + 1)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-1">
      {renderField(schema, 0)}
    </div>
  );
}

// Convert Schema to JSON Schema format
export function schemaToJsonSchema(schema: Schema): Record<string, unknown> {
  const result: Record<string, unknown> = {
    type: schema.type,
  };

  if (schema.description) result.description = schema.description;
  if (schema.example !== undefined) result.example = schema.example;

  if (schema.type === "object" && schema.children && schema.children.length > 0) {
    const properties: Record<string, unknown> = {};
    for (const child of schema.children) {
      if (child.key) {
        properties[child.key] = schemaToJsonSchema(child);
      }
    }
    result.properties = properties;
  }

  if (schema.type === "array" && schema.items) {
    result.items = schemaToJsonSchema(schema.items);
  }

  return result;
}

// Convert JSON Schema to Schema
export function jsonSchemaToSchema(json?: Record<string, unknown>, path: string = "root"): Schema {
  if (!json) return createField({}, path);

  const type = (json.type as string) || "object";
  const key = "";
  const field: Schema = {
    id: generateId(key, type, path),
    key,
    type: type as SchemaField["type"],
    description: json.description as string,
    example: json.example as string,
  };

  if (type === "object" && json.properties) {
    const props = json.properties as Record<string, Record<string, unknown>>;
    let idx = 0;
    field.children = Object.entries(props).map(([k, value]) => ({
      ...jsonSchemaToSchema(value, `${path}.children.${idx++}`),
      key: k,
    }));
  }

  if (type === "array" && json.items) {
    field.items = jsonSchemaToSchema(json.items as Record<string, unknown>, `${path}.items`);
  }

  return field;
}

// ============================================================================
// Flat Key to Tree Conversion (for API params like "teamShifts[0].attr1")
// ============================================================================

interface KeyValueParam {
  key: string;
  value: string;
  enabled?: boolean;
  description?: string;
  required?: boolean;
  location?: string;
}

/**
 * Parse a flat key like "teamShifts[0].attr1" into path segments
 */
function parseFlatKey(key: string): { segments: string[]; isArrayIndex: boolean[] } {
  const segments: string[] = [];
  const isArrayIndex: boolean[] = [];

  // Split by '.' first level
  const parts = key.split('.');

  for (const part of parts) {
    // Check for array notation like "teamShifts[0]"
    const arrayMatch = part.match(/^([^\[]+)\[(\d+)\]$/);
    if (arrayMatch) {
      segments.push(arrayMatch[1]);
      isArrayIndex.push(true);
      // The index itself is tracked separately
    } else {
      segments.push(part);
      isArrayIndex.push(false);
    }
  }

  return { segments, isArrayIndex };
}

/**
 * Convert flat KeyValue params to a tree structure
 */
export function paramsToTree(params: KeyValueParam[]): ParamField {
  const root = createParamField({ key: '', type: 'object', mode: 'param' });

  for (const param of params) {
    if (!param.key.trim()) continue;

    const { segments, isArrayIndex } = parseFlatKey(param.key);
    let currentLevel = root.children || [];

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const isArray = isArrayIndex[i];
      const isLast = i === segments.length - 1;

      // Find existing node at current level
      let existing = currentLevel.find(c => c.key === segment);

      if (!existing) {
        // Create new node
        const newNode = createParamField({
          key: segment,
          type: isArray ? 'array' : (isLast ? 'string' : 'object'),
          mode: 'param',
          value: isLast ? param.value : undefined,
          enabled: isLast ? param.enabled : true,
          required: param.required,
          description: param.description,
        });

        if (isArray && !isLast) {
          // For array that will have object items, create the items structure
          newNode.items = createParamField({
            key: 'items',
            type: 'object',
            mode: 'param',
          });
          newNode.items.children = [];
        }

        currentLevel.push(newNode);
        existing = newNode;
      }

      if (isArray && existing.items && !isLast) {
        currentLevel = existing.items.children || [];
      } else if (existing.type === 'object' && existing.children) {
        currentLevel = existing.children;
      } else if (existing.type === 'array' && existing.items) {
        currentLevel = existing.items.children || [];
      } else {
        break;
      }
    }
  }

  root.children = root.children || [];
  return root;
}

/**
 * Convert tree structure back to flat KeyValue params
 */
export function treeToParams(tree: ParamField, basePath: string = ''): KeyValueParam[] {
  const result: KeyValueParam[] = [];

  const traverse = (node: ParamField, path: string) => {
    const currentPath = path ? `${path}.${node.key}` : node.key;

    if (node.type === 'object' && node.children) {
      for (const child of node.children) {
        traverse(child, currentPath);
      }
    } else if (node.type === 'array' && node.items) {
      // For arrays, we need to handle each item
      const itemsNode = node.items as ParamField;
      if (itemsNode.type === 'object' && itemsNode.children) {
        // Single item with children - treat as single object
        traverse(itemsNode, `${currentPath}[0]`);
      } else {
        // Primitive array item
        result.push({
          key: currentPath,
          value: String(itemsNode.value || ''),
          enabled: itemsNode.enabled ?? true,
          description: itemsNode.description,
          required: itemsNode.required,
          location: itemsNode.location,
        });
      }
    } else {
      // Leaf node (primitive type)
      const paramNode = node as ParamField;
      result.push({
        key: currentPath,
        value: String(paramNode.value || ''),
        enabled: paramNode.enabled ?? true,
        description: paramNode.description,
        required: paramNode.required,
        location: paramNode.location,
      });
    }
  };

  if (tree.children) {
    for (const child of tree.children) {
      traverse(child, basePath);
    }
  }

  return result;
}

/**
 * Convert KeyValue params to JSON object (for request body)
 */
export function paramsToJson(params: KeyValueParam[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const param of params) {
    if (!param.key.trim()) continue;

    const { segments, isArrayIndex } = parseFlatKey(param.key);
    let current = result;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const isArray = isArrayIndex[i];
      const isLast = i === segments.length - 1;

      if (isLast) {
        if (isArray) {
          // Get or create array
          let arr = current[segment];
          if (!Array.isArray(arr)) {
            arr = [];
            current[segment] = arr;
          }
          (arr as unknown[]).push(param.value);
        } else {
          current[segment] = param.value;
        }
      } else {
        if (isArray) {
          let arr = current[segment];
          if (!Array.isArray(arr)) {
            arr = [];
            current[segment] = arr;
          }
          // Ensure the array has an object at index 0
          if ((arr as unknown[]).length === 0) {
            (arr as unknown[]).push({});
          }
          current = (arr as unknown[])[0] as Record<string, unknown>;
        } else {
          if (!current[segment] || typeof current[segment] !== 'object') {
            current[segment] = {};
          }
          current = current[segment] as Record<string, unknown>;
        }
      }
    }
  }

  return result;
}
