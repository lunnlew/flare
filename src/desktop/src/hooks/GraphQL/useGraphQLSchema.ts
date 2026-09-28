/**
 * useGraphQLSchema - GraphQL Schema Introspection Hook
 *
 * Fetches and caches GraphQL schemas from remote endpoints via introspection.
 * Enables field autocompletion and type hints based on the schema.
 */

import { useState, useCallback } from 'react';
import { getErrorMessage } from '../../utils/string';

export interface GraphQLType {
  name: string;
  kind: string;
  description?: string;
  fields?: GraphQLField[];
  inputFields?: GraphQLField[];
  enumValues?: { name: string; description?: string }[];
}

export interface GraphQLField {
  name: string;
  description?: string;
  type: GraphQLTypeRef;
  args: GraphQLFieldArg[];
}

export interface GraphQLFieldArg {
  name: string;
  description?: string;
  type: GraphQLTypeRef;
  defaultValue?: string;
}

export interface GraphQLTypeRef {
  kind: string;
  name?: string;
  ofType?: GraphQLTypeRef;
}

export interface GraphQLSchema {
  queryType: { name: string } | null;
  mutationType: { name: string } | null;
  subscriptionType: { name: string } | null;
  types: GraphQLType[];
}

export interface GraphQLIntrospectionResult {
  data?: {
    __schema: GraphQLSchema;
  };
  errors?: { message: string }[];
}

// Introspection query
const INTROSPECTION_QUERY = `
  query IntrospectionQuery {
    __schema {
      queryType { name }
      mutationType { name }
      subscriptionType { name }
      types {
        ...FullType
      }
      directives {
        name
        description
        locations
        args {
          ...InputValue
        }
      }
    }
  }
  fragment FullType on __Type {
    kind
    name
    description
    fields(includeDeprecated: true) {
      name
      description
      args {
        ...InputValue
      }
      type {
        ...TypeRef
      }
      isDeprecated
      deprecationReason
    }
    inputFields {
      ...InputValue
    }
    interfaces {
      ...TypeRef
    }
    enumValues(includeDeprecated: true) {
      name
      description
      isDeprecated
      deprecationReason
    }
    possibleTypes {
      ...TypeRef
    }
  }
  fragment InputValue on __InputValue {
    name
    description
    type {
      ...TypeRef
    }
    defaultValue
  }
  fragment TypeRef on __Type {
    kind
    name
    ofType {
      kind
      name
      ofType {
        kind
        name
        ofType {
          kind
          name
          ofType {
            kind
            name
            ofType {
              kind
              name
              ofType {
                kind
                name
              }
            }
          }
        }
      }
    }
  }
`;

// Extract scalar and object types from schema
function extractTypes(schema: GraphQLSchema): Map<string, GraphQLType> {
  const typeMap = new Map<string, GraphQLType>();
  for (const type of schema.types) {
    if (type.name && !type.name.startsWith('__')) {
      typeMap.set(type.name, type);
    }
  }
  return typeMap;
}

// Get type name from reference
function getTypeName(ref: GraphQLTypeRef): string {
  if (ref.name) return ref.name;
  if (ref.ofType) return getTypeName(ref.ofType);
  return 'Unknown';
}

// Format type for display
function formatTypeName(ref: GraphQLTypeRef): string {
  if (ref.kind === 'NON_NULL') {
    return `${formatTypeName(ref.ofType!)!}`;
  }
  if (ref.kind === 'LIST') {
    return `[${formatTypeName(ref.ofType!)}]`;
  }
  return ref.name || 'Unknown';
}

export function useGraphQLSchema() {
  const [schema, setSchema] = useState<GraphQLSchema | null>(null);
  const [typeMap, setTypeMap] = useState<Map<string, GraphQLType>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schemaUrl, setSchemaUrl] = useState<string | null>(null);

  // Fetch schema from endpoint
  const fetchSchema = useCallback(async (endpoint: string, headers?: Record<string, string>) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({
          query: INTROSPECTION_QUERY,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json() as GraphQLIntrospectionResult;

      if (result.errors?.length) {
        throw new Error(result.errors[0]?.message || 'GraphQL introspection failed');
      }

      if (!result.data?.__schema) {
        throw new Error('Invalid introspection response');
      }

      const schemaData = result.data.__schema;
      setSchema(schemaData);
      setTypeMap(extractTypes(schemaData));
      setSchemaUrl(endpoint);

      return schemaData;
    } catch (err) {
      const message = getErrorMessage(err) || 'Failed to fetch schema';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get fields for a type
  const getTypeFields = useCallback((typeName: string): GraphQLField[] => {
    const type = typeMap.get(typeName);
    return type?.fields || [];
  }, [typeMap]);

  // Get input fields for a type
  const getInputFields = useCallback((typeName: string): GraphQLField[] => {
    const type = typeMap.get(typeName);
    return type?.inputFields || [];
  }, [typeMap]);

  // Get enum values
  const getEnumValues = useCallback((typeName: string): { name: string; description?: string }[] => {
    const type = typeMap.get(typeName);
    return type?.enumValues || [];
  }, [typeMap]);

  // Get query type fields
  const getQueryFields = useCallback((): GraphQLField[] => {
    if (!schema?.queryType) return [];
    return getTypeFields(schema.queryType.name);
  }, [schema, getTypeFields]);

  // Clear schema
  const clearSchema = useCallback(() => {
    setSchema(null);
    setTypeMap(new Map());
    setSchemaUrl(null);
    setError(null);
  }, []);

  // Get suggestions for autocompletion
  const getSuggestions = useCallback((partialQuery: string): string[] => {
    if (!schema?.queryType) return [];

    const queryFields = getQueryFields();
    const suggestions: string[] = [];

    // Extract partial field name
    const match = partialQuery.match(/\{?\s*(\w*)$/);
    if (!match) return [];

    const partial = match[1].toLowerCase();

    for (const field of queryFields) {
      if (field.name.toLowerCase().startsWith(partial)) {
        suggestions.push(field.name);
      }
    }

    return suggestions;
  }, [schema, getQueryFields]);

  return {
    schema,
    typeMap,
    loading,
    error,
    schemaUrl,
    fetchSchema,
    getTypeFields,
    getInputFields,
    getEnumValues,
    getQueryFields,
    getSuggestions,
    clearSchema,
    formatTypeName,
    getTypeName,
  };
}