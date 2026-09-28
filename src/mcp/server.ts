/**
 * MCP Server Implementation
 * Handles JSON-RPC protocol over stdio for AI agent communication
 */

import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import {
  JSONRPCMessageSchema,
  JSONRPCMessage,
} from '@modelcontextprotocol/sdk/types.js';

export interface MCPServerOptions {
  name: string;
  version: string;
  tools: MCPTool[];
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (args: Record<string, unknown>) => Promise<unknown>;
}

/**
 * JSON-RPC2.0 Error Codes
 * @see https://www.jsonrpc.org/specification#error_object
 */
const JSONRPC_CODES = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
} as const;

interface JSONRPCRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: {
    name?: string;
    arguments?: Record<string, unknown>;
  };
}

interface JSONRPCResponse {
  jsonrpc: '2.0';
  id: number | string;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

interface JSONRPCNotification {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown>;
}

type OutgoingMessage = JSONRPCResponse | JSONRPCNotification;

export class MCPServer {
  private name: string;
  private version: string;
  private tools: MCPTool[];
  private requestId = 1;
  private initialized = false;

  constructor(options: MCPServerOptions) {
    this.name = options.name;
    this.version = options.version;
    this.tools = options.tools;
  }

  /**
   * Run the MCP server - read JSON-RPC messages from stdin and write responses to stdout
   */
  async run(): Promise<void> {
    const stdin = process.stdin;
    const stdout = process.stdout;

    stdin.resume();
    stdin.setEncoding('utf-8');

    let buffer = '';

    stdin.on('data', async (chunk: string) => {
      buffer += chunk;

      // Process complete JSON messages (newline-delimited JSON)
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        try {
          const message = JSON.parse(trimmed) as JSONRPCMessage;
          const response = await this.handleMessage(message);
          if (response) {
            stdout.write(JSON.stringify(response) + '\n');
          }
        } catch (error) {
          const errorResponse: JSONRPCResponse = {
            jsonrpc: '2.0',
            id: 0,
            error: {
              code: JSONRPC_CODES.PARSE_ERROR,
              message: error instanceof Error ? error.message : 'Parse error',
            },
          };
          stdout.write(JSON.stringify(errorResponse) + '\n');
        }
      }
    });

    stdin.on('end', () => {
      process.exit(0);
    });

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      console.error('Uncaught exception:', error);
      const response: JSONRPCResponse = {
        jsonrpc: '2.0',
        id: 0,
        error: {
          code: JSONRPC_CODES.INTERNAL_ERROR,
          message: 'Internal error',
          data: error instanceof Error ? error.message : undefined,
        },
      };
      stdout.write(JSON.stringify(response) + '\n');
      process.exit(1);
    });
  }

  /**
   * Handle incoming JSON-RPC message
   */
  private async handleMessage(message: JSONRPCMessage): Promise<OutgoingMessage | null> {
    const id = (message as JSONRPCRequest).id;

    if (!id && (message as JSONRPCRequest).method !== 'notifications/initialized') {
      // Notification without id - no response needed
      return null;
    }

    const request = message as JSONRPCRequest;

    switch (request.method) {
      case 'initialize':
        return this.handleInitialize(request);

      case 'tools/list':
        return this.handleToolsList(request);

      case 'tools/call':
        return this.handleToolsCall(request);

      case 'notifications/initialized':
        this.initialized = true;
        return null;

      default:
        return {
          jsonrpc: '2.0',
          id,
          error: {
            code: JSONRPC_CODES.METHOD_NOT_FOUND,
            message: `Unknown method: ${request.method}`,
          },
        };
    }
  }

  /**
   * Handle initialize request
   */
  private handleInitialize(request: JSONRPCRequest): JSONRPCResponse {
    const result = {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {},
      },
      serverInfo: {
        name: this.name,
        version: this.version,
      },
    };

    return {
      jsonrpc: '2.0',
      id: request.id,
      result,
    };
  }

  /**
   * Handle tools/list request - return all available tools
   */
  private handleToolsList(request: JSONRPCRequest): JSONRPCResponse {
    const tools = this.tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }));

    return {
      jsonrpc: '2.0',
      id: request.id,
      result: { tools },
    };
  }

  /**
   * Handle tools/call request - execute a tool
   */
  private async handleToolsCall(request: JSONRPCRequest): Promise<JSONRPCResponse> {
    const { name, arguments: args } = request.params || {};

    if (!name) {
      return {
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: JSONRPC_CODES.INVALID_PARAMS,
          message: 'Missing tool name',
        },
      };
    }

    const tool = this.tools.find(t => t.name === name);
    if (!tool) {
      return {
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: JSONRPC_CODES.INVALID_PARAMS,
          message: `Unknown tool: ${name}`,
        },
      };
    }

    try {
      const result = await tool.handler(args || {});
      return {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        },
      };
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: JSONRPC_CODES.INTERNAL_ERROR,
          message: error instanceof Error ? error.message : 'Tool execution failed',
          data: error instanceof Error ? error.stack : undefined,
        },
      };
    }
  }
}

export default MCPServer;