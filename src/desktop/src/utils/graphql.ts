/**
 * GraphQL Schema Documentation Generator
 *
 * Generates human-readable documentation from GraphQL schemas.
 */

import type { GraphQLSchema, GraphQLType } from '../hooks/GraphQL/useGraphQLSchema';

/**
 * Format a GraphQL type reference for display
 */
export function formatTypeName(typeRef: { kind: string; name?: string; ofType?: { kind: string; name?: string; ofType?: any } }): string {
  if (typeRef.kind === 'NON_NULL') {
    return `${formatTypeName(typeRef.ofType!)}!`;
  }
  if (typeRef.kind === 'LIST') {
    return `[${formatTypeName(typeRef.ofType!)}]`;
  }
  return typeRef.name || 'Unknown';
}

/**
 * Get the kind label for a type
 */
export function getTypeKindLabel(kind: string): string {
  const labels: Record<string, string> = {
    SCALAR: '标量',
    OBJECT: '对象',
    INTERFACE: '接口',
    UNION: '联合',
    ENUM: '枚举',
    INPUT_OBJECT: '输入对象',
    LIST: '列表',
    NON_NULL: '非空',
  };
  return labels[kind] || kind;
}

/**
 * Get color for type kind badge
 */
export function getTypeKindColor(kind: string): string {
  const colors: Record<string, string> = {
    SCALAR: 'var(--success)',
    OBJECT: 'var(--accent)',
    INTERFACE: 'var(--warning)',
    UNION: 'var(--text-muted)',
    ENUM: '#9333ea',
    INPUT_OBJECT: 'var(--info)',
  };
  return colors[kind] || 'var(--text-muted)';
}

/**
 * Generate markdown documentation for a schema
 */
export function generateSchemaDocs(schema: GraphQLSchema): string {
  const lines: string[] = [];
  const typeMap = new Map<string, GraphQLType>();

  // Build type map
  for (const type of schema.types) {
    if (type.name && !type.name.startsWith('__')) {
      typeMap.set(type.name, type);
    }
  }

  // Query type section
  if (schema.queryType) {
    lines.push(`## Query Type: ${schema.queryType.name}`);
    lines.push('');
    const queryType = typeMap.get(schema.queryType.name);
    if (queryType?.description) {
      lines.push(queryType.description);
      lines.push('');
    }
    if (queryType?.fields) {
      for (const field of queryType.fields) {
        lines.push(`- \`${field.name}\`: ${formatTypeName(field.type)}`);
        if (field.description) {
          lines.push(`  - ${field.description}`);
        }
      }
    }
    lines.push('');
  }

  // Mutation type section
  if (schema.mutationType) {
    lines.push(`## Mutation Type: ${schema.mutationType.name}`);
    lines.push('');
    const mutationType = typeMap.get(schema.mutationType.name);
    if (mutationType?.description) {
      lines.push(mutationType.description);
      lines.push('');
    }
    if (mutationType?.fields) {
      for (const field of mutationType.fields) {
        lines.push(`- \`${field.name}\`: ${formatTypeName(field.type)}`);
        if (field.description) {
          lines.push(`  - ${field.description}`);
        }
      }
    }
    lines.push('');
  }

  // Subscription type section
  if (schema.subscriptionType) {
    lines.push(`## Subscription Type: ${schema.subscriptionType.name}`);
    lines.push('');
    const subType = typeMap.get(schema.subscriptionType.name);
    if (subType?.description) {
      lines.push(subType.description);
      lines.push('');
    }
    if (subType?.fields) {
      for (const field of subType.fields) {
        lines.push(`- \`${field.name}\`: ${formatTypeName(field.type)}`);
        if (field.description) {
          lines.push(`  - ${field.description}`);
        }
      }
    }
    lines.push('');
  }

  // Types section
  lines.push('## Types');
  lines.push('');

  const sortedTypes = Array.from(typeMap.values())
    .filter(t => t.kind !== 'SCALAR' && t.kind !== 'INTERFACE' && t.kind !== 'UNION')
    .sort((a, b) => {
      // Sort by kind priority then name
      const kindOrder = { OBJECT: 0, INPUT_OBJECT: 1, ENUM: 2 };
      const aOrder = kindOrder[a.kind as keyof typeof kindOrder] ?? 99;
      const bOrder = kindOrder[b.kind as keyof typeof kindOrder] ?? 99;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.name!.localeCompare(b.name!);
    });

  for (const type of sortedTypes) {
    lines.push(`### ${type.name} (${getTypeKindLabel(type.kind)})`);
    lines.push('');
    if (type.description) {
      lines.push(type.description);
      lines.push('');
    }

    // Fields
    if (type.fields?.length) {
      lines.push('**Fields:**');
      for (const field of type.fields) {
        const argsStr = field.args.length > 0
          ? `(${field.args.map(a => `${a.name}: ${formatTypeName(a.type)}`).join(', ')})`
          : '';
        lines.push(`- \`${field.name}${argsStr}\`: ${formatTypeName(field.type)}`);
        if (field.description) {
          lines.push(`  - ${field.description}`);
        }
      }
      lines.push('');
    }

    // Input fields
    if (type.inputFields?.length) {
      lines.push('**Input Fields:**');
      for (const field of type.inputFields) {
        lines.push(`- \`${field.name}\`: ${formatTypeName(field.type)}`);
        if (field.description) {
          lines.push(`  - ${field.description}`);
        }
      }
      lines.push('');
    }

    // Enum values
    if (type.enumValues?.length) {
      lines.push('**Values:**');
      for (const value of type.enumValues) {
        lines.push(`- \`${value.name}\``);
        if (value.description) {
          lines.push(`  - ${value.description}`);
        }
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Extract type information for sidebar display
 */
export interface SchemaTypeInfo {
  name: string;
  kind: string;
  description?: string;
  fields?: { name: string; type: string; description?: string }[];
  inputFields?: { name: string; type: string; description?: string }[];
  enumValues?: { name: string; description?: string }[];
}

export function extractTypesForSidebar(schema: GraphQLSchema): SchemaTypeInfo[] {
  const result: SchemaTypeInfo[] = [];

  for (const type of schema.types) {
    if (!type.name || type.name.startsWith('__')) continue;
    if (type.kind === 'SCALAR') continue; // Skip built-in scalars

    const info: SchemaTypeInfo = {
      name: type.name,
      kind: type.kind,
      description: type.description,
    };

    if (type.fields?.length) {
      info.fields = type.fields.map(f => ({
        name: f.name,
        type: formatTypeName(f.type),
        description: f.description,
      }));
    }

    if (type.inputFields?.length) {
      info.inputFields = type.inputFields.map(f => ({
        name: f.name,
        type: formatTypeName(f.type),
        description: f.description,
      }));
    }

    if (type.enumValues?.length) {
      info.enumValues = type.enumValues.map(v => ({
        name: v.name,
        description: v.description,
      }));
    }

    result.push(info);
  }

  // Sort: Query > Mutation > Subscription > Objects > InputObjects > Enums
  result.sort((a, b) => {
    const priority: Record<string, number> = {
      'OBJECT': 0, // Query/Mutation/Subscription
      'INPUT_OBJECT': 1,
      'ENUM': 2,
      'INTERFACE': 3,
      'UNION': 4,
    };

    const aP = priority[a.kind] ?? 99;
    const bP = priority[b.kind] ?? 99;
    if (aP !== bP) return aP - bP;
    return a.name.localeCompare(b.name);
  });

  return result;
}