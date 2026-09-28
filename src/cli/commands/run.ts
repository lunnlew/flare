import { gitStore } from '../../storage/index.js';
import { fetchWithTimeout } from '../../utils/http.js';

export async function executeRequest(request: {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: any;
  timeout?: number;
}): Promise<{ status: number; statusText: string; body: string; headers: Record<string, string> }> {
  const response = await fetchWithTimeout(request.url, {
    method: request.method,
    headers: {
      'Content-Type': 'application/json',
      ...request.headers,
    },
    body: request.body ? JSON.stringify(request.body) : undefined,
    timeout: request.timeout,
  });

  const body = await response.text();
  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => { responseHeaders[key] = value; });

  return {
    status: response.status,
    statusText: response.statusText,
    body,
    headers: responseHeaders,
  };
}

function generateCurl(method: string, url: string, headers: Record<string, string>, body?: string): string {
  let cmd = `curl -X ${method} '${url}'`;
  Object.entries(headers).forEach(([k, v]) => { cmd += ` \\\n  -H '${k}: ${v}'`; });
  if (body) cmd += ` \\\n  -d '${body}'`;
  return cmd;
}

export async function runCommand(args: string[]) {
  const parsedArgs = parseArgs(args);
  const { apiName, method, pathParts, options } = parsedArgs;

  if (!apiName) {
    console.error(`Usage: flare-api run <api> [method] [path] [options]
Options:
  -t, --timeout <ms>    请求超时时间 (默认 30000ms)
  -H, --header <header> 添加请求头 (格式: Key: Value)
  -d, --data <body>      请求体
  --curl                 仅生成 curl 命令并退出`);
    process.exit(1);
  }

  // Handle --curl flag
  if (options.curlOnly) {
    await gitStore.init();
    const fileName = `${apiName.toLowerCase().replace(/\s+/g, '-')}.yaml`;
    const api = await gitStore.loadAPI(fileName);
    if (!api) {
      console.error(`API not found: ${apiName}`);
      process.exit(1);
    }

    const path = pathParts.length > 0 ? '/' + pathParts.join('/') : '';
    let endpoint = api.endpoints.find(e =>
      e.method.toUpperCase() === (method || 'GET').toUpperCase() &&
      (e.path === path || (path && e.path.endsWith(path)))
    );

    // If no path specified, use first endpoint or fail
    if (!endpoint && api.endpoints.length > 0) {
      endpoint = api.endpoints[0];
    }

    if (!endpoint) {
      console.error('Endpoint not found');
      process.exit(1);
    }

    const url = api.baseUrl + endpoint.path;
    const curlCmd = generateCurl(endpoint.method, url, options.headers, options.body);
    console.log(curlCmd);
    return;
  }

  await gitStore.init();

  const fileName = `${apiName.toLowerCase().replace(/\s+/g, '-')}.yaml`;
  const api = await gitStore.loadAPI(fileName);

  if (!api) {
    console.error(`API not found: ${apiName}`);
    process.exit(1);
  }

  // 如果没有提供 method，默认列出端点
  if (!method) {
    console.log(`\n${api.name} (${api.baseUrl}) endpoints:\n`);
    for (const endpoint of api.endpoints) {
      console.log(`  ${endpoint.method.padEnd(10)} ${endpoint.path}`);
    }
    console.log(`\nUsage: flare-api run ${apiName} <method> <path>`);
    return;
  }

  // 查找匹配的端点
  const path = '/' + pathParts.join('/');
  const endpoint = api.endpoints.find(e =>
    e.method.toUpperCase() === method.toUpperCase() &&
    (e.path === path || (path && e.path.endsWith(path)))
  );

  if (!endpoint) {
    console.error(`Endpoint not found: ${method} ${path || '[path]'}`);
    console.log(`\nAvailable endpoints:`);
    for (const ep of api.endpoints) {
      console.log(`  ${ep.method.padEnd(10)} ${ep.path}`);
    }
    process.exit(1);
  }

  const url = api.baseUrl + endpoint.path;
  console.log(`Sending ${endpoint.method} ${url}...`);

  if (options.headers && Object.keys(options.headers).length > 0) {
    console.log('Headers:', JSON.stringify(options.headers));
  }
  if (options.body) {
    console.log('Body:', options.body);
  }
  console.log('');

  try {
    const result = await executeRequest({
      method: endpoint.method as any,
      url,
      headers: { ...options.headers },
      body: options.body || endpoint.requestBody,
      timeout: options.timeout,
    });

    console.log(`Response: ${result.status} ${result.statusText}`);
    console.log('---');
    console.log(result.body);
  } catch (error) {
    console.error('Request failed:', error);
    process.exit(1);
  }
}

interface RunOptions {
  timeout?: number;
  headers?: Record<string, string>;
  body?: string;
  curlOnly?: boolean;
}

function parseArgs(args: string[]): { apiName?: string; method?: string; pathParts: string[]; options: RunOptions } {
  const result: { apiName?: string; method?: string; pathParts: string[]; options: RunOptions } = { pathParts: [], options: {} };
  let i = 0;

  while (i < args.length) {
    const arg = args[i];

    if (arg === '-t' || arg === '--timeout') {
      result.options.timeout = parseInt(args[++i], 10);
    } else if (arg === '-H' || arg === '--header') {
      const header = args[++i];
      const colonIdx = header.indexOf(':');
      if (colonIdx > 0) {
        const key = header.slice(0, colonIdx).trim();
        const value = header.slice(colonIdx + 1).trim();
        result.options.headers = result.options.headers || {};
        result.options.headers[key] = value;
      }
    } else if (arg === '-d' || arg === '--data') {
      result.options.body = args[++i];
    } else if (arg === '--curl') {
      result.options.curlOnly = true;
    } else if (!result.apiName) {
      result.apiName = arg;
    } else if (!result.method) {
      result.method = arg;
    } else {
      result.pathParts.push(arg);
    }
    i++;
  }

  return result;
}