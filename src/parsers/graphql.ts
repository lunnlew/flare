import type { API, EndpointSchema, ParameterSchema, HttpMethod, ParamLocation } from '../ir/index.js';
import type { Parser } from './index.js';

export const graphqlParser: Parser = {
  name: 'graphql',

  detect(source: string): boolean {
    return source.includes('type ') && source.includes('{') ||
           source.includes('schema') ||
           source.includes('type Query');
  },

  async parse(source: string): Promise<API> {
    const doc = parseGraphQL(source);

    const endpoints: EndpointSchema[] = [];
    const queries = doc.query || {};
    const mutations = doc.mutation || {};
    const subscriptions = doc.subscription || {};

    for (const [name, field] of Object.entries(queries)) {
      endpoints.push(createEndpoint(name, 'POST', field, doc));
    }

    for (const [name, field] of Object.entries(mutations)) {
      endpoints.push(createEndpoint(name, 'POST', field, doc));
    }

    for (const [name, field] of Object.entries(subscriptions)) {
      endpoints.push(createEndpoint(name, 'SUBSCRIBE', field, doc));
    }

    return {
      name: doc.name || 'GraphQL Schema',
      version: '1.0.0',
      description: doc.description,
      baseUrl: doc.url || '',
      endpoints,
      source: { type: 'graphql' },
    };
  },
};

interface GraphQLField {
  description?: string;
  arguments?: GraphQLArgument[];
  type?: string;
}

interface GraphQLArgument {
  name: string;
  type: string;
  description?: string;
  defaultValue?: string;
}

interface GraphQLDoc {
  name?: string;
  description?: string;
  url?: string;
  query?: Record<string, GraphQLField>;
  mutation?: Record<string, GraphQLField>;
  subscription?: Record<string, GraphQLField>;
  types?: Record<string, any>;
}

function createEndpoint(name: string, method: HttpMethod, field: GraphQLField, doc: GraphQLDoc): EndpointSchema {
  // Convert GraphQL arguments to IR parameters
  const parameters: ParameterSchema[] = [];
  if (field.arguments && Array.isArray(field.arguments)) {
    for (const arg of field.arguments) {
      const mappedType = mapGraphQLType(arg.type);
      parameters.push({
        name: arg.name,
        location: 'query' as ParamLocation,
        required: !arg.defaultValue && mappedType.isNonNull,
        description: arg.description,
        schema: {
          type: mappedType.type,
          isArray: mappedType.isArray,
        },
        default: arg.defaultValue,
      });
    }
  }

  return {
    path: `/graphql/${name}`,
    method,
    operationId: name,
    summary: name,
    description: field.description,
    parameters: parameters.length > 0 ? parameters : undefined,
  };
}

function mapGraphQLType(type: string): { type: string; isArray: boolean; isNonNull: boolean } {
  // Map GraphQL types to JSON Schema compatible types
  const typeMap: Record<string, string> = {
    'String': 'string',
    'Int': 'integer',
    'Float': 'number',
    'Boolean': 'boolean',
    'ID': 'string',
  };

  // Handle nullable types (e.g., String!)
  const isNonNull = type.endsWith('!');
  const cleanType = type.replace(/!/g, '');

  // Handle list types (e.g., [User!]!)
  const isArray = cleanType.startsWith('[') && cleanType.endsWith(']');
  const innerType = isArray ? cleanType.slice(1, -1) : cleanType;

  // Check for nested non-null inside list (e.g., [User!])
  const isInnerNonNull = innerType.endsWith('!');
  const baseType = innerType.replace(/!/g, '');

  const jsonSchemaType = typeMap[baseType] || 'string';

  return {
    type: jsonSchemaType,
    isArray,
    isNonNull: isNonNull || (isArray && isInnerNonNull),
  };
}

function parseGraphQL(source: string): GraphQLDoc {
  const doc: GraphQLDoc = {
    query: {},
    mutation: {},
    subscription: {},
    types: {},
  };

  const lines = source.split('\n');
  let currentType: 'query' | 'mutation' | 'subscription' | 'type' | 'input' | null = null;
  let currentField: string | null = null;
  let currentArgs: GraphQLArgument[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip comments and empty lines
    if (trimmed.startsWith('#') || !trimmed) continue;

    if (trimmed.startsWith('type Query')) {
      currentType = 'query';
    } else if (trimmed.startsWith('type Mutation')) {
      currentType = 'mutation';
    } else if (trimmed.startsWith('type Subscription')) {
      currentType = 'subscription';
    } else if (trimmed.startsWith('input ')) {
      // Input type definition
      const match = trimmed.match(/input\s+(\w+)/);
      if (match) {
        doc.types![match[1]] = { __isInput: true };
        currentType = 'input';
      }
    } else if (trimmed.startsWith('type ') && !trimmed.includes('Query') && !trimmed.includes('Mutation') && !trimmed.includes('Subscription')) {
      currentType = 'type';
      const match = trimmed.match(/type\s+(\w+)/);
      if (match) {
        doc.types![match[1]] = {};
      }
    } else if (trimmed.startsWith('schema')) {
      const urlMatch = trimmed.match(/url:\s*["']([^"']+)["']/);
      if (urlMatch) doc.url = urlMatch[1];
    } else if (currentType && trimmed === '}') {
      // End of type definition
      if (currentField && currentArgs.length > 0 && doc[currentType as keyof GraphQLDoc] && typeof doc[currentType as keyof GraphQLDoc] === 'object') {
        const typeMap = doc[currentType as keyof GraphQLDoc] as Record<string, GraphQLField>;
        if (typeMap[currentField]) {
          typeMap[currentField] = {
            ...typeMap[currentField],
            arguments: [...currentArgs],
          };
        }
      }
      currentType = null;
      currentField = null;
      currentArgs = [];
    } else if (currentType && trimmed.includes('(')) {
      // Field with arguments - more robust regex
      const match = trimmed.match(/(\w+)\s*\(([^)]*)\)\s*:\s*([^\s{,]+)/);
      if (match) {
        const [, fieldName, argsStr, returnType] = match;
        currentField = fieldName;

        // Parse arguments - handle complex types like [User!]!
        currentArgs = [];
        if (argsStr) {
          // Match argument name: type pattern, handling nested types
          const argMatches = argsStr.matchAll(/(\w+)\s*:\s*([\w!\[\]!]+)(?:\s*=\s*([^,]+))?/g);
          for (const argMatch of argMatches) {
            currentArgs.push({
              name: argMatch[1],
              type: argMatch[2],
              defaultValue: argMatch[3]?.trim(),
            });
          }
        }

        // Initialize the field
        if (!doc[currentType as keyof GraphQLDoc]) {
          (doc as any)[currentType] = {};
        }
        const typeMap = doc[currentType as keyof GraphQLDoc] as Record<string, GraphQLField>;
        typeMap[fieldName] = {
          type: returnType,
          arguments: [...currentArgs],
        };
      }
    } else if (currentType && trimmed.includes(':') && !trimmed.startsWith('#')) {
      // Simple field without arguments - handle complex return types
      const match = trimmed.match(/(\w+)\s*:\s*([^\s{,]+)/);
      if (match && !trimmed.includes('(')) {
        const [, fieldName, fieldType] = match;
        if (!doc[currentType as keyof GraphQLDoc]) {
          (doc as any)[currentType] = {};
        }
        const typeMap = doc[currentType as keyof GraphQLDoc] as Record<string, GraphQLField>;
        typeMap[fieldName] = {
          type: fieldType.replace(/,/g, ''),
          arguments: [],
        };
      }
    }
  }

  return doc;
}