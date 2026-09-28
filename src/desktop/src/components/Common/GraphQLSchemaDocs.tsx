/**
 * GraphQLSchemaDocs - Schema Documentation Panel
 *
 * Displays GraphQL schema types, fields, and descriptions.
 * Allows browsing the schema structure.
 */

import { useState, useMemo } from 'react';
import type { GraphQLSchema } from '../../hooks/GraphQL/useGraphQLSchema';
import { extractTypesForSidebar, getTypeKindLabel, getTypeKindColor, type SchemaTypeInfo } from '../../utils/graphql';
import { useSettingsStore } from '../../store';
import { useTranslation } from '../../utils/i18n';

interface GraphQLSchemaDocsProps {
  schema: GraphQLSchema | null;
  onClose?: () => void;
}

type FilterKind = 'all' | 'OBJECT' | 'INPUT_OBJECT' | 'ENUM' | 'INTERFACE' | 'UNION';

export function GraphQLSchemaDocs({ schema, onClose }: GraphQLSchemaDocsProps) {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);

  const [filterKind, setFilterKind] = useState<FilterKind>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());

  const types = useMemo(() => {
    if (!schema) return [];
    return extractTypesForSidebar(schema);
  }, [schema]);

  const filteredTypes = useMemo(() => {
    return types.filter(t => {
      if (filterKind !== 'all' && t.kind !== filterKind) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        if (!t.name.toLowerCase().includes(query) &&
            !t.description?.toLowerCase().includes(query) &&
            !t.fields?.some(f => f.name.toLowerCase().includes(query)) &&
            !t.inputFields?.some(f => f.name.toLowerCase().includes(query)) &&
            !t.enumValues?.some(v => v.name.toLowerCase().includes(query))) {
          return false;
        }
      }
      return true;
    });
  }, [types, filterKind, searchQuery]);

  const toggleExpanded = (name: string) => {
    setExpandedTypes(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  if (!schema) return null;

  return (
    <div className="rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{t('graphql.schemaDocs')}</span>
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {t('graphql.typesCount').replace('{count}', String(types.length))}
          </span>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="px-3 py-2 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border-color)' }}>
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder={t('graphql.searchTypes')}
          className="flex-1 px-2 py-1 rounded text-xs"
          style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
        />
        <select
          value={filterKind}
          onChange={e => setFilterKind(e.target.value as FilterKind)}
          className="px-2 py-1 rounded text-xs"
          style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
        >
          <option value="all">{t('graphql.all')}</option>
          <option value="OBJECT">{t('graphql.object')}</option>
          <option value="INPUT_OBJECT">{t('graphql.input')}</option>
          <option value="ENUM">{t('graphql.enum')}</option>
         <option value="INTERFACE">{t('graphql.interface')}</option>
          <option value="UNION">{t('graphql.union')}</option>
        </select>
      </div>

      {/* Type List */}
      <div className="max-h-96 overflow-y-auto">
        {filteredTypes.length === 0 ? (
          <div className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>
            {t('graphql.noMatch')}
          </div>
        ) : (
          filteredTypes.map(type => (
            <TypeItem
              key={type.name}
              type={type}
              expanded={expandedTypes.has(type.name)}
              onToggle={() => toggleExpanded(type.name)}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface TypeItemProps {
  type: SchemaTypeInfo;
  expanded: boolean;
  onToggle: () => void;
}

function TypeItem({ type, expanded, onToggle }: TypeItemProps) {
  const kindColor = getTypeKindColor(type.kind);
  const hasDetails = (type.fields?.length ||0) + (type.inputFields?.length || 0) + (type.enumValues?.length || 0) > 0;

  return (
    <div className="border-b border-solid" style={{ borderColor: 'var(--border-color)' }}>
      <button
        onClick={onToggle}
        className="w-full px-3 py-2 flex items-start gap-2 text-left hover:opacity-80 transition-opacity"
      >
        <span className="mt-0.5">
          {hasDetails ? (
            expanded ? (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            ) : (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )
          ) : (
            <span className="w-3 h-3" />
          )}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-medium" style={{ color: 'var(--text-primary)' }}>
              {type.name}
            </span>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded"
              style={{ backgroundColor: kindColor, color: 'var(--text-inverse)' }}
            >
              {getTypeKindLabel(type.kind)}
            </span>
          </div>
          {type.description && (
            <div className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
              {type.description}
            </div>
          )}
        </div>
      </button>

      {expanded && hasDetails && (
        <div className="px-3 pb-2 pl-6 space-y-2">
          {/* Fields */}
          {type.fields && type.fields.length > 0 && (
            <div>
              <div className="text-[10px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Fields</div>
              {type.fields.map(field => (
                <FieldItem key={field.name} name={field.name} type={field.type} description={field.description} />
              ))}
            </div>
          )}

          {/* Input Fields */}
          {type.inputFields && type.inputFields.length > 0 && (
            <div>
              <div className="text-[10px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Input Fields</div>
              {type.inputFields.map(field => (
                <FieldItem key={field.name} name={field.name} type={field.type} description={field.description} />
              ))}
            </div>
          )}

          {/* Enum Values */}
          {type.enumValues && type.enumValues.length > 0 && (
            <div>
              <div className="text-[10px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Values</div>
              {type.enumValues.map(value => (
                <div key={value.name} className="py-0.5">
                  <span className="text-xs font-mono" style={{ color: 'var(--text-primary)' }}>{value.name}</span>
                  {value.description && (
                    <span className="text-[10px] ml-2" style={{ color: 'var(--text-muted)' }}>{value.description}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface FieldItemProps {
  name: string;
  type: string;
  description?: string;
}

function FieldItem({ name, type, description }: FieldItemProps) {
  return (
    <div className="py-0.5">
      <div className="flex items-center gap-1">
        <span className="text-xs font-mono" style={{ color: 'var(--accent)' }}>{name}</span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>: </span>
        <span className="text-xs font-mono" style={{ color: 'var(--success)' }}>{type}</span>
      </div>
      {description && (
        <div className="text-[10px] pl-2 mt-0.5" style={{ color: 'var(--text-muted)' }}>{description}</div>
      )}
    </div>
  );
}