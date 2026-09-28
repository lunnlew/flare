import { parse } from 'yaml';
import type { API, EndpointSchema, ParameterSchema, ParamLocation, HttpMethod } from '../ir/index.js';
import type { Parser } from './index.js';

export const asyncApiParser: Parser = {
  name: 'asyncapi',

  detect(source: string): boolean {
    try {
      const json = JSON.parse(source);
      return Boolean(json.asyncapi && json.asyncapi.startsWith('2.'));
    } catch {
      return source.includes('asyncapi:') && source.includes('2.');
    }
  },

  async parse(source: string): Promise<API> {
    const doc = await parseDoc(source);
    const info = doc.info || {};
    const servers = doc.servers || {};

    // Parse channels
    const endpoints: EndpointSchema[] = [];
    const channels = doc.channels || {};

    for (const [channelName, channel] of Object.entries(channels)) {
      const ch = channel as any;

      // Parse channel parameters
      const parameters = parseChannelParameters(ch.parameters, doc);

      // Parse subscribe operation
      if (ch.subscribe) {
        const subscribe = ch.subscribe;
        const messages = parseMessages(subscribe.message);

        endpoints.push({
          path: channelName,
          method: 'SUBSCRIBE' as HttpMethod,
          operationId: subscribe.operationId,
          summary: subscribe.summary,
          description: subscribe.description,
          tags: subscribe.tags,
          parameters: parameters.length > 0 ? parameters : undefined,
          requestBody: messages.requestBody,
          responses: messages.responses,
        });
      }

      // Parse publish operation
      if (ch.publish) {
        const publish = ch.publish;
        const messages = parseMessages(publish.message);

        endpoints.push({
          path: channelName,
          method: 'PUBLISH' as HttpMethod,
          operationId: publish.operationId,
          summary: publish.summary,
          description: publish.description,
          tags: publish.tags,
          parameters: parameters.length > 0 ? parameters : undefined,
          requestBody: messages.requestBody,
          responses: messages.responses,
        });
      }
    }

    // Build servers array
    const serversArray = Object.values(servers).map((s: any) => ({
      url: s.url || '',
      description: s.description,
      variables: s.variables,
    }));

    return {
      name: info.title || 'Untitled AsyncAPI',
      version: info.version || '1.0.0',
      description: info.description,
      baseUrl: serversArray[0]?.url || '',
      servers: serversArray.length > 0 ? serversArray : undefined,
      endpoints,
      tags: doc.tags?.map((t: any) => t.name),
      source: { type: 'asyncapi', version: doc.asyncapi },
    };
  },
};

interface ParsedMessages {
  requestBody?: {
    description?: string;
    required?: boolean;
    contentType?: string;
    schema?: Record<string, unknown>;
  };
  responses?: Record<string, {
    statusCode: number;
    description: string;
    schema?: Record<string, unknown>;
  }>;
}

function parseChannelParameters(params: any, doc: any): ParameterSchema[] {
  if (!params) return [];

  const parameters: ParameterSchema[] = [];

  if (Array.isArray(params)) {
    for (const p of params) {
      parameters.push({
        name: p.name || p,
        location: (p.in || 'path') as ParamLocation,
        required: p.required ?? true,
        description: p.description,
        schema: p.schema || resolveRef(doc, p.$ref),
      });
    }
  } else if (typeof params === 'object') {
    for (const [name, param] of Object.entries(params)) {
      const p = param as any;
      parameters.push({
        name,
        location: (p.in || 'path') as ParamLocation,
        required: p.required ?? true,
        description: p.description,
        schema: p.schema || (p.$ref ? resolveRef(doc, p.$ref) : undefined),
      });
    }
  }

  return parameters;
}

function parseMessages(message: any): ParsedMessages {
  if (!message) return {};

  const result: ParsedMessages = {};

  // Handle single message
  if (message.payload) {
    result.requestBody = {
      description: message.description,
      required: true,
      contentType: 'application/json', // AsyncAPI typically uses JSON
      schema: message.payload,
    };
  }

  // Handle oneOf/anyOf for response schemas
  if (message.headers && typeof message.headers === 'object') {
    result.responses = {
      '200': {
        statusCode: 200,
        description: message.summary || 'Message',
        schema: {
          type: 'object',
          properties: {
            headers: message.headers,
            payload: message.payload,
          },
        },
      },
    };
  }

  return result;
}

function resolveRef(doc: any, ref: string): any {
  if (!ref) return undefined;
  const parts = ref.replace('#/', '').split('/');
  let current = doc;
  for (const part of parts) {
    current = current?.[part];
  }
  return current;
}

async function parseDoc(source: string): Promise<any> {
  try {
    return JSON.parse(source);
  } catch {
    return parse(source, { strict: false });
  }
}