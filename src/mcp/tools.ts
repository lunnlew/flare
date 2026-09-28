/**
 * MCP Tool Definitions
 * Exposes flare-api-spec functionality as MCP tools for AI agents
 */

import { gitStore, indexStore } from '../storage/index.js';
import { executeRequest } from '../cli/commands/run.js';
import { fileAnnotationStore } from '../collaboration/file-store.js';
import { fileVersionStore } from '../collaboration/version-store.js';
import type { API } from '../ir/index.js';
import type { Annotation } from '../collaboration/annotations.js';

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (args: Record<string, unknown>) => Promise<unknown>;
}

export interface ListAPIsResult {
  apis: Array<{
    name: string;
    version: string;
    description?: string;
    baseUrl: string;
    endpointCount: number;
    tags?: string[];
  }>;
  total: number;
}

export interface GetAPIResult {
  name: string;
  version: string;
  description?: string;
  baseUrl: string;
  endpoints: Array<{
    path: string;
    method: string;
    summary?: string;
    description?: string;
    parameters?: Array<{
      name: string;
      location: string;
      required: boolean;
      description?: string;
    }>;
    requestBody?: {
      description?: string;
      required: boolean;
      contentType?: string;
    };
    responses?: Record<string, {
      statusCode: number;
      description?: string;
    }>;
  }>;
  auth?: {
    type: string;
  };
  tags?: string[];
  capabilities?: Array<{
    name: string;
    description?: string;
  }>;
}

export interface ExecuteRequestArgs {
  apiName: string;
  method: string;
  path: string;
  parameters?: Record<string, string>;
  body?: unknown;
}

export interface ExecuteRequestResult {
  status: number;
  body: string;
  headers?: Record<string, string>;
}

export interface SearchAPIsResult {
  matches: Array<{
    name: string;
    version: string;
    baseUrl: string;
    endpointCount: number;
  }>;
  total: number;
}

/**
 * List all available APIs
 */
async function listAPIsHandler(): Promise<ListAPIsResult> {
  await gitStore.init();
  const apis = await gitStore.listAPIs();

  return {
    apis: apis.map(api => ({
      name: api.name,
      version: api.version,
      description: api.description,
      baseUrl: api.baseUrl || '',
      endpointCount: api.endpoints.length,
      tags: api.tags,
    })),
    total: apis.length,
  };
}

/**
 * Get detailed API information by name
 */
async function getAPIHandler(args: Record<string, unknown>): Promise<GetAPIResult> {
  const { name } = args as { name?: string };

  if (!name || typeof name !== 'string') {
    throw new Error('API name is required');
  }

  await gitStore.init();

  const fileName = `${name.toLowerCase().replace(/\s+/g, '-')}.yaml`;
  const api = await gitStore.loadAPI(fileName);

  if (!api) {
    throw new Error(`API not found: ${name}`);
  }

  return {
    name: api.name,
    version: api.version,
    description: api.description,
    baseUrl: api.baseUrl || '',
    endpoints: api.endpoints.map(ep => ({
      path: ep.path,
      method: ep.method,
      summary: ep.summary,
      description: ep.description,
      parameters: ep.parameters?.map(p => ({
        name: p.name,
        location: p.location,
        required: p.required,
        description: p.description,
      })),
      requestBody: ep.requestBody ? {
        description: ep.requestBody.description,
        required: ep.requestBody.required,
        contentType: ep.requestBody.contentType,
      } : undefined,
      responses: ep.responses ? Object.fromEntries(
        Object.entries(ep.responses).map(([key, val]) => [
          key,
          { statusCode: val.statusCode, description: val.description },
        ])
      ) : undefined,
    })),
    auth: api.auth ? { type: api.auth.type } : undefined,
    tags: api.tags,
    capabilities: api.capabilities?.map(c => ({
      name: c.name,
      description: c.description,
    })),
  };
}

/**
 * Execute an API request
 */
async function executeRequestHandler(args: Record<string, unknown>): Promise<ExecuteRequestResult> {
  const apiName = args.apiName as string | undefined;
  const method = args.method as string | undefined;
  const path = args.path as string | undefined;
  const parameters = args.parameters as Record<string, string> | undefined;
  const body = args.body;

  if (!apiName || typeof apiName !== 'string') {
    throw new Error('apiName is required');
  }

  if (!method || typeof method !== 'string') {
    throw new Error('method is required');
  }

  if (!path || typeof path !== 'string') {
    throw new Error('path is required');
  }

  await gitStore.init();

  const fileName = `${apiName.toLowerCase().replace(/\s+/g, '-')}.yaml`;
  const api = await gitStore.loadAPI(fileName);

  if (!api) {
    throw new Error(`API not found: ${apiName}`);
  }

  // Build URL with parameters
  let url = api.baseUrl + path;

  if (parameters) {
    const urlObj = new URL(url);
    for (const [key, value] of Object.entries(parameters)) {
      urlObj.searchParams.append(key, value);
    }
    url = urlObj.toString();
  }

  // Replace path parameters
  for (const param of api.endpoints.find(e => e.path === path)?.parameters || []) {
    if (param.location === 'path' && parameters?.[param.name]) {
      url = url.replace(`{${param.name}}`, parameters[param.name]);
    }
  }

  try {
    const result = await executeRequest({
      method: method.toUpperCase(),
      url,
      headers: {},
      body,
    });

    return {
      status: result.status,
      body: result.body,
    };
  } catch (error) {
    throw new Error(`Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Search APIs by query
 */
async function searchAPIsHandler(args: Record<string, unknown>): Promise<SearchAPIsResult> {
  const { query } = args as { query?: string };

  if (!query || typeof query !== 'string') {
    throw new Error('Search query is required');
  }

  await gitStore.init();
  const matched = await indexStore.search(query);

  if (matched.length === 0) {
    return { matches: [], total: 0 };
  }

  const matches = [];
  for (const name of matched) {
    const api = await gitStore.loadAPI(`${name.toLowerCase().replace(/\s+/g, '-')}.yaml`);
    if (api) {
      matches.push({
        name: api.name,
        version: api.version,
        baseUrl: api.baseUrl || '',
        endpointCount: api.endpoints.length,
      });
    }
  }

  return {
    matches,
    total: matches.length,
  };
}

/**
 * List all annotations for an endpoint
 */
async function listAnnotationsHandler(args: Record<string, unknown>): Promise<{ annotations: Annotation[] }> {
  const { endpointId } = args as { endpointId?: string };

  if (endpointId) {
    const annotations = await fileAnnotationStore.findByEndpoint(endpointId);
    return { annotations };
  }

  const annotations = await fileAnnotationStore.list();
  return { annotations };
}

/**
 * Get annotation by ID
 */
async function getAnnotationHandler(args: Record<string, unknown>): Promise<{ annotation: Annotation | null }> {
  const { id } = args as { id: string };

  if (!id || typeof id !== 'string') {
    throw new Error('Annotation ID is required');
  }

  const annotation = await fileAnnotationStore.findById(id);
  return { annotation };
}

/**
 * Create or update annotation
 */
async function saveAnnotationHandler(args: Record<string, unknown>): Promise<{ success: boolean; id: string }> {
  const { endpointId, content, author } = args as { endpointId: string; content: string; author?: string };

  if (!endpointId || !content) {
    throw new Error('endpointId and content are required');
  }

  const annotation: Annotation = {
    id: `ann_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    endpointId,
    content,
    author,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await fileAnnotationStore.save(annotation);
  return { success: true, id: annotation.id };
}

/**
 * Delete annotation by ID
 */
async function deleteAnnotationHandler(args: Record<string, unknown>): Promise<{ success: boolean }> {
  const { id } = args as { id: string };

  if (!id || typeof id !== 'string') {
    throw new Error('Annotation ID is required');
  }

  await fileAnnotationStore.delete(id);
  return { success: true };
}

/**
 * List version snapshots for an API
 */
async function listVersionsHandler(args: Record<string, unknown>): Promise<{ versions: Array<{ id: string; version: string; createdAt: string; notes?: string }> }> {
  const { apiName } = args as { apiName: string };

  if (!apiName || typeof apiName !== 'string') {
    throw new Error('API name is required');
  }

  const snapshots = await fileVersionStore.listVersions(apiName);
  return {
    versions: snapshots.map(s => ({
      id: s.id,
      version: s.version,
      createdAt: s.createdAt,
      notes: s.notes,
    })),
  };
}

/**
 * Get specific version snapshot
 */
async function getVersionHandler(args: Record<string, unknown>): Promise<{ snapshot: any }> {
  const { apiName, versionId } = args as { apiName: string; versionId: string };

  if (!apiName || !versionId) {
    throw new Error('apiName and versionId are required');
  }

  const snapshot = await fileVersionStore.getSnapshot(apiName, versionId);
  return { snapshot };
}

// ============================================================
// Git Tools
// ============================================================

interface GitCommitInfo {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  email: string;
  timestamp: number;
}

interface DiffInfo {
  files: Array<{
    path: string;
    hunks: Array<{
      lines: Array<{ type: 'add' | 'remove' | 'context'; content: string }>;
      oldStart: number;
      newStart: number;
    }>;
  }>;
  summary: { added: number; removed: number };
}

/**
 * List git commit history
 */
async function gitLogHandler(args: Record<string, unknown>): Promise<{ commits: GitCommitInfo[] }> {
  const { apiName, limit = 10 } = args as { apiName?: string; limit?: number };

  await gitStore.init();
  const commits = await gitStore.getHistory(apiName, limit);

  return {
    commits: commits.map(c => ({
      hash: c.hash,
      shortHash: c.shortHash,
      message: c.message,
      author: c.author,
      email: c.email,
      timestamp: c.timestamp,
    })),
  };
}

/**
 * Get diff between commits
 */
async function gitDiffHandler(args: Record<string, unknown>): Promise<DiffInfo> {
  const { apiName, commitA, commitB } = args as { apiName: string; commitA: string; commitB?: string };

  if (!apiName || !commitA) {
    throw new Error('apiName and commitA are required');
  }

  await gitStore.init();
  return gitStore.diff(apiName, commitA, commitB);
}

/**
 * Get git repository status
 */
async function gitStatusHandler(args: Record<string, unknown>): Promise<{
  clean: boolean;
  staged: string[];
  unstaged: string[];
  untracked: string[];
}> {
  await gitStore.init();
  const status = await gitStore.status();
  return {
    clean: status.clean,
    staged: status.staged,
    unstaged: status.unstaged,
    untracked: status.untracked,
  };
}

/**
 * Stage files for commit
 */
async function gitStageHandler(args: Record<string, unknown>): Promise<{ success: boolean }> {
  const { files } = args as { files: string[] };

  if (!files || !Array.isArray(files)) {
    throw new Error('files array is required');
  }

  await gitStore.init();
  await gitStore.stage(files);
  return { success: true };
}

/**
 * Create a git commit
 */
async function gitCommitHandler(args: Record<string, unknown>): Promise<{ success: boolean }> {
  const { message } = args as { message: string };

  if (!message) {
    throw new Error('commit message is required');
  }

  await gitStore.init();
  await gitStore.commit(message);
  return { success: true };
}

/**
 * List git branches
 */
async function gitBranchListHandler(args: Record<string, unknown>): Promise<{
  branches: Array<{ name: string; current: boolean; remote: boolean }>;
}> {
  await gitStore.init();
  const branches = await gitStore.listBranches();
  return { branches };
}

/**
 * Checkout a branch
 */
async function gitCheckoutHandler(args: Record<string, unknown>): Promise<{ success: boolean }> {
  const { branch } = args as { branch: string };

  if (!branch) {
    throw new Error('branch name is required');
  }

  await gitStore.init();
  await gitStore.checkout(branch);
  return { success: true };
}

/**
 * Tool definitions for MCP protocol
 */
export const listAPIsTool: MCPTool = {
  name: 'list_apis',
  description: 'List all available APIs. Returns API names, versions, base URLs, and endpoint counts.',
  inputSchema: {
    type: 'object',
    properties: {},
    required: [],
  },
  handler: listAPIsHandler,
};

export const getAPITool: MCPTool = {
  name: 'get_api',
  description: 'Get detailed information about a specific API including all its endpoints and parameters.',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'The name of the API to retrieve',
      },
    },
    required: ['name'],
  },
  handler: getAPIHandler,
};

export const executeRequestTool: MCPTool = {
  name: 'execute_request',
  description: 'Execute an API request. Provide the API name, HTTP method, path, and optional parameters/body.',
  inputSchema: {
    type: 'object',
    properties: {
      apiName: {
        type: 'string',
        description: 'Name of the API to call',
      },
      method: {
        type: 'string',
        description: 'HTTP method (GET, POST, PUT, DELETE, PATCH)',
        enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      },
      path: {
        type: 'string',
        description: 'API endpoint path (e.g., /users)',
      },
      parameters: {
        type: 'object',
        description: 'Query parameters as key-value pairs',
        additionalProperties: {
          type: 'string',
        },
      },
      body: {
        type: 'any',
        description: 'Request body for POST/PUT/PATCH requests',
      },
    },
    required: ['apiName', 'method', 'path'],
  },
  handler: executeRequestHandler,
};

export const searchAPIsTool: MCPTool = {
  name: 'search_apis',
  description: 'Search APIs by keyword. Searches across API names, tags, endpoints, and descriptions.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query string',
      },
    },
    required: ['query'],
  },
  handler: searchAPIsHandler,
};

export const listAnnotationsTool: MCPTool = {
  name: 'list_annotations',
  description: 'List annotations. Pass endpointId to filter by endpoint, or list all annotations.',
  inputSchema: {
    type: 'object',
    properties: {
      endpointId: {
        type: 'string',
        description: 'Optional endpoint ID to filter annotations',
      },
    },
    required: [],
  },
  handler: listAnnotationsHandler,
};

export const getAnnotationTool: MCPTool = {
  name: 'get_annotation',
  description: 'Get a specific annotation by its ID.',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'Annotation ID',
      },
    },
    required: ['id'],
  },
  handler: getAnnotationHandler,
};

export const saveAnnotationTool: MCPTool = {
  name: 'save_annotation',
  description: 'Create or update an annotation for an API endpoint.',
  inputSchema: {
    type: 'object',
    properties: {
      endpointId: {
        type: 'string',
        description: 'Endpoint ID this annotation belongs to',
      },
      content: {
        type: 'string',
        description: 'Annotation content/markdown',
      },
      author: {
        type: 'string',
        description: 'Optional author name',
      },
    },
    required: ['endpointId', 'content'],
  },
  handler: saveAnnotationHandler,
};

export const deleteAnnotationTool: MCPTool = {
  name: 'delete_annotation',
  description: 'Delete an annotation by its ID.',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'Annotation ID to delete',
      },
    },
    required: ['id'],
  },
  handler: deleteAnnotationHandler,
};

export const listVersionsTool: MCPTool = {
  name: 'list_api_versions',
  description: 'List all version snapshots for an API.',
  inputSchema: {
    type: 'object',
    properties: {
      apiName: {
        type: 'string',
        description: 'Name of the API',
      },
    },
    required: ['apiName'],
  },
  handler: listVersionsHandler,
};

export const getVersionTool: MCPTool = {
  name: 'get_api_version',
  description: 'Get a specific version snapshot of an API.',
  inputSchema: {
    type: 'object',
    properties: {
      apiName: {
        type: 'string',
        description: 'Name of the API',
      },
      versionId: {
        type: 'string',
        description: 'Version snapshot ID',
      },
    },
    required: ['apiName', 'versionId'],
  },
  handler: getVersionHandler,
};

// Git Tool Definitions
export const gitLogTool: MCPTool = {
  name: 'git_log',
  description: 'List git commit history. Pass apiName to filter commits for a specific API.',
  inputSchema: {
    type: 'object',
    properties: {
      apiName: {
        type: 'string',
        description: 'Optional API name to filter commits',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of commits to return (default: 10)',
      },
    },
  },
  handler: gitLogHandler,
};

export const gitDiffTool: MCPTool = {
  name: 'git_diff',
  description: 'Get the diff between two commits for an API.',
  inputSchema: {
    type: 'object',
    properties: {
      apiName: {
        type: 'string',
        description: 'Name of the API',
      },
      commitA: {
        type: 'string',
        description: 'First commit hash (or range start)',
      },
      commitB: {
        type: 'string',
        description: 'Optional second commit hash (for range diff)',
      },
    },
    required: ['apiName', 'commitA'],
  },
  handler: gitDiffHandler,
};

export const gitStatusTool: MCPTool = {
  name: 'git_status',
  description: 'Get the current git repository status.',
  inputSchema: {
    type: 'object',
    properties: {},
  },
  handler: gitStatusHandler,
};

export const gitStageTool: MCPTool = {
  name: 'git_stage',
  description: 'Stage files for commit.',
  inputSchema: {
    type: 'object',
    properties: {
      files: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of file paths to stage',
      },
    },
    required: ['files'],
  },
  handler: gitStageHandler,
};

export const gitCommitTool: MCPTool = {
  name: 'git_commit',
  description: 'Create a git commit with the staged changes.',
  inputSchema: {
    type: 'object',
    properties: {
      message: {
        type: 'string',
        description: 'Commit message',
      },
    },
    required: ['message'],
  },
  handler: gitCommitHandler,
};

export const gitBranchListTool: MCPTool = {
  name: 'git_branch_list',
  description: 'List all git branches.',
  inputSchema: {
    type: 'object',
    properties: {},
  },
  handler: gitBranchListHandler,
};

export const gitCheckoutTool: MCPTool = {
  name: 'git_checkout',
  description: 'Checkout a git branch.',
  inputSchema: {
    type: 'object',
    properties: {
      branch: {
        type: 'string',
        description: 'Branch name to checkout',
      },
    },
    required: ['branch'],
  },
  handler: gitCheckoutHandler,
};

/**
 * Create all MCP tools
 */
export function createTools(): MCPTool[] {
  return [
    listAPIsTool,
    getAPITool,
    executeRequestTool,
    searchAPIsTool,
    listAnnotationsTool,
    getAnnotationTool,
    saveAnnotationTool,
    deleteAnnotationTool,
    listVersionsTool,
    getVersionTool,
    gitLogTool,
    gitDiffTool,
    gitStatusTool,
    gitStageTool,
    gitCommitTool,
    gitBranchListTool,
    gitCheckoutTool,
  ];
}

/**
 * Get tool definitions for discovery
 */
export function getToolDefinitions() {
  return createTools().map(tool => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
  }));
}