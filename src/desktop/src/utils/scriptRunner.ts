/**
 * Script Runner - Executes pre/post request scripts in the pipeline
 *
 * Key patterns:
 * 1. pm object provides sandboxed environment access
 * 2. Scripts can modify request (pre) or process response (post)
 * 3. Errors are caught and logged, don't abort the request
 */

import type { KeyValue } from '../constants/http';
import type { ResponseData } from '../types/api';
import { ScriptLog, ScriptLogLevel, Interceptor, InterceptorStage } from '../store/scriptsStore';
import { getErrorMessage } from './string';

export interface ScriptContext {
  script: string;
  scriptEnabled: boolean;
  method: string;
  url: string;
  headers: KeyValue[];
  body?: string;
  params: KeyValue[];
  response?: ResponseData | null;
  currentEnv: Record<string, string>;
  onUpdateVariable?: (key: string, value: string) => void;
  onAddLog?: (log: Omit<ScriptLog, 'time'>) => void;
}

export interface MutableRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
  params: Record<string, string>;
}

export interface ScriptResult {
  modifiedRequest?: MutableRequest;
  modifiedResponse?: ResponseData;
  logs: ScriptLog[];
  error?: string;
}

interface PmObject {
  environment: {
    get: (key: string) => string | undefined;
    set: (key: string, value: string) => void;
  };
  variables: Record<string, unknown>;
  request: MutableRequest;
  response: ResponseData | null | undefined;
  test: (name: string, fn: () => void) => void;
  expect: (actual: unknown) => ExpectChain;
  console: {
    log: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    info: (...args: unknown[]) => void;
  };
  setOutput: (key: string, value: unknown) => void;
  getOutput: (key: string) => unknown;
  abort: (message?: string) => never;
}

interface ExpectChain {
  to: {
    equal: (expected: unknown) => void;
    eql: (expected: unknown) => void;
    be: {
      above: (n: number) => void;
      below: (n: number) => void;
      within: (start: number, end: number) => void;
    };
    have: {
      property: (prop: string) => void;
      length: (n: number) => void;
      keys: (...keys: string[]) => void;
    };
    include: (value: unknown) => void;
    match: (regex: RegExp) => void;
    status: (code: number) => void;
  };
}

function createPmObject(context: {
  request: MutableRequest;
  response: ResponseData | null | undefined;
  currentEnv: Record<string, string>;
  onUpdateVariable?: (key: string, value: string) => void;
  onAddLog?: (log: Omit<ScriptLog, 'time'>) => void;
  variables: Record<string, unknown>;
}): PmObject {
  const { request, response, currentEnv, onUpdateVariable, onAddLog, variables } = context;

  const addLog = (level: ScriptLogLevel, ...args: unknown[]) => {
    const message = args.map(a => {
      if (typeof a === 'object') return JSON.stringify(a);
      return String(a);
    }).join(' ');
    onAddLog?.({ level, message });
  };

  return {
    environment: {
      get: (key: string) => currentEnv[key],
      set: (key: string, value: string) => {
        onUpdateVariable?.(key, value);
      },
    },
    variables,
    request,
    response,
    test: (name: string, fn: () => void) => {
      try {
        fn();
        addLog('info', `✓ ${name}`);
      } catch (e) {
        addLog('error', `✗ ${name}: ${e}`);
      }
    },
    expect: (actual: unknown): ExpectChain => ({
      to: {
        equal: (expected: unknown) => {
          if (actual !== expected) {
            throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
          }
        },
        eql: (expected: unknown) => {
          if (JSON.stringify(actual) !== JSON.stringify(expected)) {
            throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
          }
        },
        be: {
          above: (n: number) => {
            if (!(Number(actual) > n)) {
              throw new Error(`Expected > ${n}, got ${actual}`);
            }
          },
          below: (n: number) => {
            if (!(Number(actual) < n)) {
              throw new Error(`Expected < ${n}, got ${actual}`);
            }
          },
          within: (start: number, end: number) => {
            const num = Number(actual);
            if (!(num >= start && num <= end)) {
              throw new Error(`Expected ${start}-${end}, got ${actual}`);
            }
          },
        },
        have: {
          property: (prop: string) => {
            if (!actual || typeof actual !== 'object' || !(prop in (actual as object))) {
              throw new Error(`Missing property ${prop}`);
            }
          },
          length: (n: number) => {
            const len = Array.isArray(actual) ? actual.length : String(actual).length;
            if (len !== n) {
              throw new Error(`Expected length ${n}, got ${len}`);
            }
          },
          keys: (...keys: string[]) => {
            if (!actual || typeof actual !== 'object') {
              throw new Error(`Expected object, got ${typeof actual}`);
            }
            const objKeys = Object.keys(actual as object);
            const missing = keys.filter(k => !objKeys.includes(k));
            if (missing.length > 0) {
              throw new Error(`Missing keys: ${missing.join(', ')}`);
            }
          },
        },
        include: (value: unknown) => {
          const str = String(actual);
          const val = String(value);
          if (!str.includes(val)) {
            throw new Error(`Expected to include "${val}"`);
          }
        },
        match: (regex: RegExp) => {
          const str = String(actual);
          if (!regex.test(str)) {
            throw new Error(`Expected to match ${regex}`);
          }
        },
        status: (code: number) => {
          if (!response || response.status !== code) {
            throw new Error(`Expected status ${code}, got ${response?.status}`);
          }
        },
      },
    }),
    console: {
      log: (...args: unknown[]) => addLog('info', ...args),
      error: (...args: unknown[]) => addLog('error', ...args),
      warn: (...args: unknown[]) => addLog('warn', ...args),
      info: (...args: unknown[]) => addLog('info', ...args),
    },
    setOutput: (key: string, value: unknown) => {
      variables[key] = value;
    },
    getOutput: (key: string) => variables[key],
    abort: (message?: string) => {
      throw new Error(message || 'Script aborted');
    },
  };
}

function buildHeadersObject(headers: KeyValue[]): Record<string, string> {
  const result: Record<string, string> = {};
  headers.filter(h => h.enabled && h.key.trim()).forEach(h => {
    result[h.key] = h.value;
  });
  return result;
}

function buildQueryParams(params: KeyValue[]): Record<string, string> {
  const result: Record<string, string> = {};
  params.filter(p => p.enabled && p.key.trim()).forEach(p => {
    result[p.key] = p.value;
  });
  return result;
}

export function runPreRequestScript(context: ScriptContext): ScriptResult {
  const { script, scriptEnabled, method, url, headers, body, params, currentEnv, onUpdateVariable, onAddLog } = context;

  if (!scriptEnabled || !script.trim()) {
    return { logs: [] };
  }

  const logs: ScriptLog[] = [];
  const variables: Record<string, unknown> = {};

  const addLog = (log: Omit<ScriptLog, 'time'>) => {
    logs.push({ ...log, time: new Date() });
    onAddLog?.(log);
  };

  const mutableRequest: MutableRequest = {
    method,
    url,
    headers: buildHeadersObject(headers),
    body,
    params: buildQueryParams(params),
  };

  const pm = createPmObject({
    request: mutableRequest,
    response: null,
    currentEnv,
    onUpdateVariable,
    onAddLog: addLog,
    variables,
  });

  try {
    const fn = new Function('pm', script);
    fn(pm);
    addLog({ level: 'info', message: 'Pre-request script executed' });
  } catch (e) {
    const error = getErrorMessage(e);
    addLog({ level: 'error', message: `Script error: ${error}` });
    return { logs, error };
  }

  return {
    modifiedRequest: mutableRequest,
    logs,
  };
}

export function runPostResponseScript(context: ScriptContext): ScriptResult {
  const { script, scriptEnabled, method, url, headers, body, params, response, currentEnv, onUpdateVariable, onAddLog } = context;

  if (!scriptEnabled || !script.trim()) {
    return { logs: [] };
  }

  const logs: ScriptLog[] = [];
  const variables: Record<string, unknown> = {};

  const addLog = (log: Omit<ScriptLog, 'time'>) => {
    logs.push({ ...log, time: new Date() });
    onAddLog?.(log);
  };

  const mutableRequest: MutableRequest = {
    method,
    url,
    headers: buildHeadersObject(headers),
    body,
    params: buildQueryParams(params),
  };

  const pm = createPmObject({
    request: mutableRequest,
    response: response || undefined,
    currentEnv,
    onUpdateVariable,
    onAddLog: addLog,
    variables,
  });

  try {
    const fn = new Function('pm', script);
    fn(pm);
    addLog({ level: 'info', message: 'Post-response script executed' });
  } catch (e) {
    const error = getErrorMessage(e);
    addLog({ level: 'error', message: `Script error: ${error}` });
    return { logs, error };
  }

  return {
    modifiedRequest: mutableRequest,
    modifiedResponse: response || undefined,
    logs,
  };
}

// ============================================================================
// Multi-Interceptor Pipeline Runner
// ============================================================================

export interface InterceptorContext {
  interceptors: Interceptor[];
  stage: InterceptorStage;
  method: string;
  url: string;
  headers: KeyValue[];
  body?: string;
  params: KeyValue[];
  response?: ResponseData | null;
  currentEnv: Record<string, string>;
  onUpdateVariable?: (key: string, value: string) => void;
  onAddLog?: (log: Omit<ScriptLog, 'time'>) => void;
}

export interface InterceptorResult {
  modifiedRequest?: MutableRequest;
  modifiedResponse?: ResponseData;
  logs: ScriptLog[];
  errors: string[];
  aborted?: boolean;
}

/**
 * Run all interceptors for a specific stage
 */
export function runInterceptors(context: InterceptorContext): InterceptorResult {
  const { interceptors, stage, method, url, headers, body, params, response, currentEnv, onUpdateVariable, onAddLog } = context;

  const stageInterceptors = interceptors
    .filter(i => i.stage === stage && i.enabled && i.script.trim())
    .sort((a, b) => a.order - b.order);

  if (stageInterceptors.length === 0) {
    return { logs: [], errors: [] };
  }

  const logs: ScriptLog[] = [];
  const errors: string[] = [];
  let modifiedRequest: MutableRequest | undefined;
  let modifiedResponse: ResponseData | undefined;
  let aborted = false;

  const addLog = (log: Omit<ScriptLog, 'time'>) => {
    const fullLog = { ...log, time: new Date() };
    logs.push(fullLog);
    onAddLog?.(log);
  };

  const mutableRequest: MutableRequest = {
    method,
    url,
    headers: buildHeadersObject(headers),
    body,
    params: buildQueryParams(params),
  };

  for (const interceptor of stageInterceptors) {
    if (aborted) break;

    addLog({ level: 'info', message: `[${stage}] Running: ${interceptor.name}` });

    const pm = createPmObject({
      request: mutableRequest,
      response: stage === 'postResponse' || stage === 'postError' ? (response || undefined) : undefined,
      currentEnv,
      onUpdateVariable,
      onAddLog: addLog,
      variables: {},
    });

    try {
      const fn = new Function('pm', interceptor.script);
      fn(pm);
      addLog({ level: 'info', message: `[${stage}] Completed: ${interceptor.name}` });
    } catch (e) {
      const errorMsg = getErrorMessage(e);
      if (errorMsg.includes('aborted')) {
        aborted = true;
        addLog({ level: 'error', message: `[${stage}] Aborted by: ${interceptor.name}` });
        errors.push(`Interceptor "${interceptor.name}" aborted the request`);
      } else {
        addLog({ level: 'error', message: `[${stage}] Error in ${interceptor.name}: ${errorMsg}` });
        errors.push(`${interceptor.name}: ${errorMsg}`);
      }
    }
  }

  return { modifiedRequest, modifiedResponse, logs, errors, aborted };
}