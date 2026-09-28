/**
 * MCP Server Module
 * Implements Model Context Protocol server mode for flare-api-spec
 */

export { MCPServer } from './server.js';
export { createTools, getToolDefinitions } from './tools.js';
export { listAPIsTool, getAPITool, executeRequestTool, searchAPIsTool } from './tools.js';

import { MCPServer } from './server.js';
import { createTools } from './tools.js';

export async function createMCPServer(): Promise<MCPServer> {
  const tools = createTools();
  return new MCPServer({
    name: 'flare-api-spec',
    version: '0.1.0',
    tools,
  });
}

// CLI entry point for MCP mode
export async function runMCPServer(): Promise<void> {
  const server = await createMCPServer();
  await server.run();
}

// Re-export tool definitions for discovery
export const toolDefinitions = createTools().map(t => ({
  name: t.name,
  description: t.description,
  inputSchema: t.inputSchema,
}));