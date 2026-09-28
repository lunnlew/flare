/**
 * Example Generator
 * Auto-generates request/response examples from API schemas
 */

import type { API, EndpointSchema, ParameterSchema, RequestBodySchema, ResponseSchema } from '../ir/index.js';

/**
 * Generate example value based on schema type
 */
function generateExampleForType(type?: string, format?: string, schema?: Record<string, any>): any {
  if (!type && schema?.type) {
    type = schema.type;
  }
  if (!format && schema?.format) {
    format = schema.format;
  }

  switch (type) {
    case 'string':
      if (format === 'date') return '2024-01-15';
      if (format === 'date-time') return '2024-01-15T10:30:00Z';
      if (format === 'email') return 'user@example.com';
      if (format === 'uri') return 'https://api.example.com/resource';
      if (format === 'uuid') return '550e8400-e29b-41d4-a716-446655440000';
      return 'sample string';

    case 'number':
    case 'integer':
      if (format === 'float' || format === 'double') return 3.14;
      return 42;

    case 'boolean':
      return true;

    case 'array':
      if (schema?.items) {
        return [generateExampleForType(schema.items.type, schema.items.format, schema.items)];
      }
      return ['item1', 'item2'];

    case 'object':
      if (schema?.properties) {
        const obj: Record<string, any> = {};
        for (const [key, prop] of Object.entries(schema.properties)) {
          obj[key] = generateExampleForType(
            (prop as any).type,
            (prop as any).format,
            prop as Record<string, any>
          );
        }
        return obj;
      }
      return { key: 'value' };

    default:
      return null;
  }
}

/**
 * Generate request parameters example from endpoint
 */
export function generateRequestExample(endpoint: EndpointSchema): {
  queryParams?: Record<string, any>;
  headers?: Record<string, string>;
  pathParams?: Record<string, string>;
  body?: any;
} {
  const result: {
    queryParams?: Record<string, any>;
    headers?: Record<string, string>;
    pathParams?: Record<string, string>;
    body?: any;
  } = {};

  // Process parameters
  if (endpoint.parameters) {
    for (const param of endpoint.parameters) {
      // Get type from schema if available
      const paramType = param.schema?.type as string | undefined;
      const paramFormat = param.schema?.format as string | undefined;
      const example = generateExampleForType(paramType, paramFormat, param.schema);

      switch (param.location) {
        case 'query':
          if (!result.queryParams) result.queryParams = {};
          result.queryParams[param.name] = example;
          break;
        case 'header':
          if (!result.headers) result.headers = {};
          result.headers[param.name] = String(example);
          break;
        case 'path':
          if (!result.pathParams) result.pathParams = {};
          result.pathParams[param.name] = String(example);
          break;
      }
    }
  }

  // Process request body
  if (endpoint.requestBody) {
    const bodySchema = endpoint.requestBody.schema;
    if (bodySchema) {
      result.body = generateExampleForType(
        bodySchema.type as string | undefined,
        bodySchema.format as string | undefined,
        bodySchema as Record<string, any>
      );
    }
  }

  return result;
}

/**
 * Generate response example from endpoint
 */
export function generateResponseExample(endpoint: EndpointSchema, statusCode: number = 200): {
  status: number;
  headers?: Record<string, string>;
  body?: any;
} {
  const result: {
    status: number;
    headers?: Record<string, string>;
    body?: any;
  } = { status: statusCode };

  const responses = endpoint.responses;
  if (!responses) {
    result.body = { message: 'Success' };
    return result;
  }

  // Find matching response
  const response = responses[statusCode] || responses['default'] || Object.values(responses)[0];

  if (response) {
    const respSchema = (response as ResponseSchema).schema;
    if (respSchema) {
      result.body = generateExampleForType(
        respSchema.type as string | undefined,
        respSchema.format as string | undefined,
        respSchema as Record<string, any>
      );
    } else if ('body' in response) {
      result.body = (response as any).body;
    }
  }

  result.headers = {
    'Content-Type': 'application/json',
  };

  return result;
}

/**
 * Generate complete example for an endpoint
 */
export function generateEndpointExample(
  api: API,
  endpointPath: string,
  method: string
): {
  api: API;
  endpoint: EndpointSchema;
  request: {
    method: string;
    url: string;
    queryParams?: Record<string, any>;
    headers?: Record<string, string>;
    body?: any;
  };
  response: {
    status: number;
    headers?: Record<string, string>;
    body?: any;
  };
} | null {
  const endpoint = api.endpoints.find(
    e => e.path === endpointPath && e.method.toUpperCase() === method.toUpperCase()
  );

  if (!endpoint) {
    return null;
  }

  const request = generateRequestExample(endpoint);
  const url = `${api.baseUrl}${endpoint.path}`;

  return {
    api,
    endpoint,
    request: {
      method: endpoint.method,
      url,
      queryParams: request.queryParams,
      headers: request.headers,
      body: request.body,
    },
    response: generateResponseExample(endpoint),
  };
}

/**
 * CLI helper to generate and display example
 */
export function formatExampleAsJson(example: any): string {
  return JSON.stringify(example, null, 2);
}

/**
 * Generate example for CLI output
 */
export function generateCliExample(
  apiName: string,
  endpointPath: string,
  method: string,
  api?: API
): string {
  if (!api) {
    return JSON.stringify({
      error: 'API not found',
      suggestion: `Check if ${apiName} is a valid API name`,
    }, null, 2);
  }

  const example = generateEndpointExample(api, endpointPath, method);

  if (!example) {
    return JSON.stringify({
      error: 'Endpoint not found',
      endpoint: `${method} ${endpointPath}`,
      available: api.endpoints.map(e => `${e.method} ${e.path}`),
    }, null, 2);
  }

  return formatExampleAsJson(example);
}