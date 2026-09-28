import { useState, useRef, useCallback } from "react";
import MonacoEditor from "@monaco-editor/react";
import { useScriptsState, useScriptsActions, useResponseData, useRequestState, useEnvironmentStore, useSettingsStore } from "../../store";
import { useTranslation, type TranslationKey } from "../../utils/i18n";
import type { Interceptor, InterceptorStage } from "../../store/scriptsStore";
import type { KeyValue } from "../../constants/http";
import type { ResponseData } from "../../types/api";
import { getErrorMessage } from "../../utils/string";
import * as Monaco from "monaco-editor";

// 确保 provider 只注册一次
let pmCompletionProviderRegistered = false;

// 自动触发补全 - 当用户输入 . 后自动显示补全菜单
function setupAutoCompletion(editor: Monaco.editor.IStandaloneCodeEditor) {
  let lastDotTime = 0;
  editor.onDidChangeModelContent(() => {
    const model = editor.getModel();
    if (!model) return;
    const position = editor.getPosition();
    if (!position) return;
    const textBefore = model.getValueInRange({
      startLineNumber: position.lineNumber,
      startColumn: 1,
      endLineNumber: position.lineNumber,
      endColumn: position.column,
    });
    // 如果以 . 结尾，延迟触发补全
    if (textBefore.endsWith('.')) {
      const now = Date.now();
      if (now - lastDotTime > 100) {
        lastDotTime = now;
        setTimeout(() => {
          editor.trigger('auto-complete', 'editor.action.triggerSuggest', null);
        }, 50);
      }
    }
  });
}

// Workaround for Monaco 0.55.1 space key issue - force space insertion via executeEdits
function setupSpaceKeyWorkaround(editor: Monaco.editor.IStandaloneCodeEditor) {
  editor.onKeyDown((e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      e.stopPropagation();
      const selection = editor.getSelection();
      if (selection) {
        editor.executeEdits('space-insert', [{
          range: selection,
          text: ' ',
          forceMoveMarkers: true
        }]);
      }
    }
  });
}

// PM 对象补全树 - 统一的数据结构
// label 和 insertText 只包含当前级别名称，不包含完整路径
interface CompletionNode {
  label: string; // 显示的名称，如 "get"
  insertText: string; // 插入的文本，如 "get" 或 "get(${1:key})"
  detailKey: string; // 翻译键
  kind?: Monaco.languages.CompletionItemKind;
  children?: CompletionNode[];
  insertTextRules?: number;
}

// 顶层 pm.* 补全
const PM_TOP_LEVEL: CompletionNode[] = [
  { label: "environment", insertText: "environment", detailKey: "scripts.completion.environment", kind: 12 },
  { label: "utils", insertText: "utils", detailKey: "scripts.completion.utils", kind: 12 },
  { label: "variables", insertText: "variables", detailKey: "scripts.completion.variables", kind: 12 },
  { label: "_", insertText: "_", detailKey: "scripts.completion.lodash", kind: 12 },
  { label: "console", insertText: "console", detailKey: "scripts.completion.console", kind: 12 },
  { label: "test", insertText: "test", detailKey: "scripts.completion.test", kind: 1 },
  { label: "expect", insertText: "expect", detailKey: "scripts.completion.expect", kind: 1 },
  { label: "request", insertText: "request", detailKey: "scripts.completion.request", kind: 12 },
  { label: "response", insertText: "response", detailKey: "scripts.completion.response", kind: 12 },
  { label: "setTimeout", insertText: "setTimeout", detailKey: "scripts.completion.setTimeout", kind: 1 },
  { label: "info", insertText: "info", detailKey: "scripts.completion.info", kind: 12 },
];

// pm.environment.* 补全
const PM_ENVIRONMENT: CompletionNode[] = [
  { label: "get", insertText: "get(${1:key})", detailKey: "scripts.completion.getEnv", kind: 1, insertTextRules: 4 },
  { label: "set", insertText: "set(${1:key}, ${2:value})", detailKey: "scripts.completion.setEnv", kind: 1, insertTextRules: 4 },
  { label: "unset", insertText: "unset(${1:key})", detailKey: "scripts.completion.deleteEnv", kind: 1, insertTextRules: 4 },
  { label: "toObject", insertText: "toObject()", detailKey: "scripts.completion.toObject", kind: 1, insertTextRules: 4 },
];

// pm.utils.* 补全
const PM_UTILS: CompletionNode[] = [
  { label: "sha256", insertText: "sha256(${1:string})", detailKey: "scripts.completion.sha256", kind: 1, insertTextRules: 4 },
  { label: "md5", insertText: "md5(${1:string})", detailKey: "scripts.completion.md5", kind: 1, insertTextRules: 4 },
  { label: "randomUuid", insertText: "randomUuid()", detailKey: "scripts.completion.randomUuid", kind: 1, insertTextRules: 4 },
  { label: "urlEncode", insertText: "urlEncode(${1:string})", detailKey: "scripts.completion.urlEncode", kind: 1, insertTextRules: 4 },
  { label: "urlDecode", insertText: "urlDecode(${1:string})", detailKey: "scripts.completion.urlDecode", kind: 1, insertTextRules: 4 },
  { label: "base64Encode", insertText: "base64Encode(${1:string})", detailKey: "scripts.completion.base64Encode", kind: 1, insertTextRules: 4 },
  { label: "base64Decode", insertText: "base64Decode(${1:string})", detailKey: "scripts.completion.base64Decode", kind: 1, insertTextRules: 4 },
];

// pm.variables.* 补全
const PM_VARIABLES: CompletionNode[] = [
  { label: "get", insertText: "get(${1:key})", detailKey: "scripts.completion.getVar", kind: 1, insertTextRules: 4 },
  { label: "set", insertText: "set(${1:key}, ${2:value})", detailKey: "scripts.completion.setVar", kind: 1, insertTextRules: 4 },
  { label: "has", insertText: "has(${1:key})", detailKey: "scripts.completion.hasVar", kind: 1, insertTextRules: 4 },
  { label: "unset", insertText: "unset(${1:key})", detailKey: "scripts.completion.deleteVar", kind: 1, insertTextRules: 4 },
];

// pm._.* 和 _.* 补全
const PM_LODASH: CompletionNode[] = [
  { label: "get", insertText: "get(${1:obj}, ${2:path}, ${3:defaultValue})", detailKey: "scripts.completion.getNested", kind: 1, insertTextRules: 4 },
  { label: "set", insertText: "set(${1:obj}, ${2:path}, ${3:value})", detailKey: "scripts.completion.setNested", kind: 1, insertTextRules: 4 },
  { label: "has", insertText: "has(${1:obj}, ${2:path})", detailKey: "scripts.completion.hasProp", kind: 1, insertTextRules: 4 },
  { label: "pick", insertText: "pick(${1:obj}, ${2:['a', 'b']})", detailKey: "scripts.completion.pick", kind: 1, insertTextRules: 4 },
  { label: "omit", insertText: "omit(${1:obj}, ${2:['password']})", detailKey: "scripts.completion.omit", kind: 1, insertTextRules: 4 },
  { label: "merge", insertText: "merge(${1:target}, ${2:source})", detailKey: "scripts.completion.merge", kind: 1, insertTextRules: 4 },
  { label: "cloneDeep", insertText: "cloneDeep(${1:obj})", detailKey: "scripts.completion.cloneDeep", kind: 1, insertTextRules: 4 },
  { label: "map", insertText: "map(${1:collection}, ${2:iteratee})", detailKey: "scripts.completion.map", kind: 1, insertTextRules: 4 },
  { label: "filter", insertText: "filter(${1:collection}, ${2:predicate})", detailKey: "scripts.completion.filter", kind: 1, insertTextRules: 4 },
  { label: "find", insertText: "find(${1:collection}, ${2:predicate})", detailKey: "scripts.completion.find", kind: 1, insertTextRules: 4 },
];

// pm.console.* 补全
const PM_CONSOLE: CompletionNode[] = [
  { label: "log", insertText: "log(${1:message})", detailKey: "scripts.completion.log", kind: 1, insertTextRules: 4 },
  { label: "info", insertText: "info(${1:message})", detailKey: "scripts.completion.info", kind: 1, insertTextRules: 4 },
  { label: "warn", insertText: "warn(${1:message})", detailKey: "scripts.completion.warn", kind: 1, insertTextRules: 4 },
  { label: "error", insertText: "error(${1:message})", detailKey: "scripts.completion.error", kind: 1, insertTextRules: 4 },
];

// pm.request.* 补全（动态）
const buildPmRequestChildren = (request: { headers?: KeyValue[]; body?: string; params?: KeyValue[] }): CompletionNode[] => {
  const children: CompletionNode[] = [
    { label: "url", insertText: "url", detailKey: "scripts.completion.url", kind: 1 },
    { label: "method", insertText: "method", detailKey: "scripts.completion.method", kind: 1 },
  ];
  if (request.params && request.params.length > 0) {
    children.push({ label: "params", insertText: "params", detailKey: "scripts.completion.params", kind: 12 });
    request.params.filter(p => p.enabled && p.key.trim()).forEach(p => {
      children.push({ label: p.key, insertText: p.key, detailKey: "scripts.completion.value", kind: 1 });
    });
  }
  if (request.headers && request.headers.length > 0) {
    children.push({ label: "headers", insertText: "headers", detailKey: "scripts.completion.headers", kind: 12 });
    request.headers.filter(h => h.enabled && h.key.trim()).forEach(h => {
      children.push({ label: h.key, insertText: h.key, detailKey: "scripts.completion.value", kind: 1 });
    });
  }
  if (request.body) {
    try {
      JSON.parse(request.body);
      children.push({ label: "body", insertText: "body", detailKey: "scripts.completion.bodyJson", kind: 12 });
    } catch {
      children.push({ label: "body", insertText: "body", detailKey: "scripts.completion.body", kind: 1 });
    }
  }
  return children;
};

// pm.response.* 补全（动态）
const buildPmResponseChildren = (response: ResponseData | null): CompletionNode[] => {
  const children: CompletionNode[] = [
    { label: "body", insertText: "body", detailKey: "scripts.completion.resBody", kind: 1 },
    { label: "status", insertText: "status", detailKey: "scripts.completion.statusCode", kind: 1 },
    { label: "statusText", insertText: "statusText", detailKey: "scripts.completion.statusText", kind: 1 },
    { label: "headers", insertText: "headers", detailKey: "scripts.completion.resHeaders", kind: 1 },
    { label: "time", insertText: "time", detailKey: "scripts.completion.resTime", kind: 1 },
    { label: "json", insertText: "json()", detailKey: "scripts.completion.parseJson", kind: 1, insertTextRules: 4 },
    { label: "text", insertText: "text()", detailKey: "scripts.completion.getText", kind: 1, insertTextRules: 4 },
  ];
  if (response?.body) {
    try {
      JSON.parse(response.body);
      children.push({ label: "bodyFields", insertText: "body", detailKey: "scripts.completion.resBodyFields", kind: 12 });
    } catch {
      // Response body not valid JSON - non-critical for completion suggestions
    }
  }
  return children;
};

// pm.info.* 补全
const PM_INFO: CompletionNode[] = [
  { label: "requestId", insertText: "requestId", detailKey: "scripts.completion.requestId", kind: 1 },
  { label: "iteration", insertText: "iteration", detailKey: "scripts.completion.iteration", kind: 1 },
  { label: "iterationCount", insertText: "iterationCount", detailKey: "scripts.completion.iterationCount", kind: 1 },
];

// 统一的 completion provider - 简化版
function registerPmCompletionProvider(
  monaco: typeof Monaco,
  t: (key: keyof TranslationKey, params?: Record<string, string | number>) => string,
  context: {
    request?: { method?: string; url?: string; headers?: KeyValue[]; body?: string; params?: KeyValue[] };
    response?: ResponseData | null;
  }
) {
  // 防止重复注册
  if (pmCompletionProviderRegistered) {
    return;
  }
  pmCompletionProviderRegistered = true;

  monaco.languages.registerCompletionItemProvider("javascript", {
    triggerCharacters: ['.'],
    provideCompletionItems: (model, position) => {
      const textUntilPosition = model.getValueInRange({
        startLineNumber: position.lineNumber,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      });

      const createRange = (startCol: number, endCol: number) => ({
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: startCol,
        endColumn: endCol,
      });

      // 替换当前输入的部分（从 word 开始到光标位置）
      const replaceRange = createRange(position.column - (textUntilPosition.length > 0 ? textUntilPosition.split('.').pop()?.length || 0 : 0), position.column);

      // 根据前缀确定补全列表
      const getSuggestions = (): Monaco.languages.CompletionItem[] => {
        // pm 或 pm. - 顶层补全
        if (textUntilPosition === 'pm' || textUntilPosition === 'pm.') {
          return PM_TOP_LEVEL.map(n => ({
            label: n.label,
            kind: n.kind || 12,
            insertText: n.insertText,
            insertTextRules: n.insertTextRules,
            detail: t(n.detailKey as any),
            range: replaceRange,
          }));
        }

        // pm.environment. 或 pm.environment - 环境变量方法
        if (textUntilPosition.startsWith('pm.environment')) {
          return PM_ENVIRONMENT.map(n => ({
            label: n.label,
            kind: n.kind || 1,
            insertText: n.insertText,
            insertTextRules: n.insertTextRules,
            detail: t(n.detailKey as any),
            range: replaceRange,
          }));
        }

        // pm.utils. 或 pm.utils - 工具函数
        if (textUntilPosition.startsWith('pm.utils')) {
          return PM_UTILS.map(n => ({
            label: n.label,
            kind: n.kind || 1,
            insertText: n.insertText,
            insertTextRules: n.insertTextRules,
            detail: t(n.detailKey as any),
            range: replaceRange,
          }));
        }

        // pm.variables. 或 pm.variables
        if (textUntilPosition === 'pm.variables' || textUntilPosition === 'pm.variables.') {
          return PM_VARIABLES.map(n => ({
            label: n.label,
            kind: n.kind || 1,
            insertText: n.insertText,
            insertTextRules: n.insertTextRules,
            detail: t(n.detailKey as any),
            range: replaceRange,
          }));
        }

        // pm._. 或 pm._
        if (textUntilPosition === 'pm._' || textUntilPosition === 'pm._.') {
          return PM_LODASH.map(n => ({
            label: n.label,
            kind: n.kind || 1,
            insertText: n.insertText,
            insertTextRules: n.insertTextRules,
            detail: t(n.detailKey as any),
            range: replaceRange,
          }));
        }

        // pm.console. 或 pm.console
        if (textUntilPosition === 'pm.console' || textUntilPosition === 'pm.console.') {
          return PM_CONSOLE.map(n => ({
            label: n.label,
            kind: n.kind || 1,
            insertText: n.insertText,
            insertTextRules: n.insertTextRules,
            detail: t(n.detailKey as any),
            range: replaceRange,
          }));
        }

        // pm.request. 或 pm.request - 动态构建
        if (textUntilPosition === 'pm.request' || textUntilPosition === 'pm.request.') {
          return buildPmRequestChildren(context.request || {}).map(n => ({
            label: n.label,
            kind: n.kind || 1,
            insertText: n.insertText,
            insertTextRules: n.insertTextRules,
            detail: t(n.detailKey as any),
            range: replaceRange,
          }));
        }

        // pm.response. 或 pm.response - 动态构建
        if (textUntilPosition === 'pm.response' || textUntilPosition === 'pm.response.') {
          return buildPmResponseChildren(context.response || null).map(n => ({
            label: n.label,
            kind: n.kind || 1,
            insertText: n.insertText,
            insertTextRules: n.insertTextRules,
            detail: t(n.detailKey as any),
            range: replaceRange,
          }));
        }

        // pm.info. 或 pm.info
        if (textUntilPosition === 'pm.info' || textUntilPosition === 'pm.info.') {
          return PM_INFO.map(n => ({
            label: n.label,
            kind: n.kind || 1,
            insertText: n.insertText,
            insertTextRules: n.insertTextRules,
            detail: t(n.detailKey as any),
            range: replaceRange,
          }));
        }

        // _. 或 _ - Lodash 顶层
        if (textUntilPosition === '_' || textUntilPosition === '_.') {
          return PM_LODASH.map(n => ({
            label: n.label,
            kind: n.kind || 1,
            insertText: n.insertText,
            insertTextRules: n.insertTextRules,
            detail: t(n.detailKey as any),
            range: replaceRange,
          }));
        }

        return [];
      };

      const suggestions = getSuggestions();
      if (suggestions.length > 0) {
        return { suggestions };
      }

      return { suggestions: [] };
    },
  });
}

interface TestContext {
  method?: string;
  url?: string;
  headers?: KeyValue[];
  body?: string;
  params?: KeyValue[];
  response?: ResponseData | null;
  currentEnv?: Record<string, string>;
  onUpdateVariable?: (key: string, value: string) => void;
}

interface ScriptsPanelProps {
  testContext?: TestContext;
}

const STAGE_LABELS = {
  preBuild: 'scripts.preBuild',
  preSend: 'scripts.preSend',
  postResponse: 'scripts.postResponse',
  postError: 'scripts.postError',
} as const satisfies Record<InterceptorStage, keyof TranslationKey>;

const STAGE_ORDER: InterceptorStage[] = ['preBuild', 'preSend', 'postResponse', 'postError'];

export function ScriptsPanel({ testContext }: ScriptsPanelProps = {}) {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);
  const {
    preRequestScript,
    postResponseScript,
    scriptEnabled,
    scriptConsole,
    interceptors,
  } = useScriptsState();

  const {
    setPreRequestScript,
    setPostResponseScript,
    setScriptEnabled,
    addInterceptor,
    updateInterceptor,
    removeInterceptor,
    addScriptLog,
    clearScriptConsole,
  } = useScriptsActions();

  const [scriptError, setScriptError] = useState<string | null>(null);
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [selectedInterceptorId, setSelectedInterceptorId] = useState<string | null>(null);
  const [showLegacyMode, setShowLegacyMode] = useState(true); // Toggle between modes

  // Monaco editor refs for error markers
  const preRequestEditorRef = useRef<{ monaco: typeof Monaco | null; editor: Monaco.editor.IStandaloneCodeEditor | null }>({ monaco: null, editor: null });
  const postResponseEditorRef = useRef<{ monaco: typeof Monaco | null; editor: Monaco.editor.IStandaloneCodeEditor | null }>({ monaco: null, editor: null });
  const interceptorEditorRef = useRef<{ monaco: typeof Monaco | null; editor: Monaco.editor.IStandaloneCodeEditor | null }>({ monaco: null, editor: null });

  // Response data from store
  const { response: storeResponse } = useResponseData();

  // Request data from store
  const requestState = useRequestState();

  // Environment store for pm.environment.set - use getState() for stable access
  const environmentStore = useEnvironmentStore();

  // Helper to set environment variable (pm.environment.set(key, value))
  const setEnvVariable = useCallback((key: string, value: string) => {
    const getCurrentEnv = environmentStore.getCurrentEnv;
    const updateVariable = environmentStore.updateVariable;
    const currentEnv = getCurrentEnv();
    if (!currentEnv) {
      addScriptLog({ level: 'warn', message: 'pm.environment.set failed: No environment selected' });
      return;
    }
    if (!currentEnv.groups || currentEnv.groups.length === 0) {
      addScriptLog({ level: 'warn', message: 'pm.environment.set failed: Environment has no groups' });
      return;
    }
    const firstGroup = currentEnv.groups[0];
    updateVariable(currentEnv.name, firstGroup.name, key, String(value));
    addScriptLog({ level: 'info', message: `pm.environment.set('${key}', '${value}') in ${currentEnv.name}/${firstGroup.name}` });
  }, [environmentStore]);

  // Get environment variables map for pm.environment.get
  const currentEnvVariables = environmentStore.getVariablesMap();

  // Test context values (prefer store data, fallback to testContext)
  const method = requestState.method || testContext?.method || 'GET';
  const url = requestState.url || testContext?.url || '';
  const headers = requestState.headers || testContext?.headers || [];
  const body = requestState.reqBody || testContext?.body || '';
  const params = requestState.params || testContext?.params || [];
  const response = storeResponse || testContext?.response || null;

  const buildHeaders = () => {
    const result: Record<string, string> = {};
    headers.filter(h => h.enabled && h.key.trim()).forEach(h => { result[h.key] = h.value; });
    return result;
  };

  const buildQueryParams = () => {
    const result: Record<string, string> = {};
    params.filter(p => p.enabled && p.key.trim()).forEach(p => { result[p.key] = p.value; });
    return result;
  };

  // Lodash-style helper functions
  const lodashGet = (obj: any, path: string, defaultValue?: any): any => {
    const keys = path.split('.');
    let result = obj;
    for (const key of keys) {
      if (result == null || result === undefined) return defaultValue;
      result = result[key];
    }
    return result !== undefined ? result : defaultValue;
  };

  const lodashSet = (obj: any, path: string, value: any): any => {
    const keys = path.split('.');
    const result = Array.isArray(obj) ? [...obj] : { ...obj };
    let current = result;
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (current[key] == null || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current[key] = Array.isArray(current[key]) ? [...current[key]] : { ...current[key] };
      current = current[key];
    }
    current[keys[keys.length - 1]] = value;
    return result;
  };

  const lodashHas = (obj: any, path: string): boolean => {
    const keys = path.split('.');
    let result = obj;
    for (const key of keys) {
      if (result == null || result === undefined) return false;
      result = result[key];
    }
    return result !== undefined;
  };

  const lodashPick = (obj: any, keys: string[]): any => {
    const result: Record<string, any> = {};
    keys.forEach(k => { if (k in obj) result[k] = obj[k]; });
    return result;
  };

  const lodashOmit = (obj: any, keys: string[]): any => {
    const result: Record<string, any> = {};
    Object.keys(obj).forEach(k => { if (!keys.includes(k)) result[k] = obj[k]; });
    return result;
  };

  const validateScript = (script: string, monacoRef?: React.MutableRefObject<{ monaco: typeof Monaco | null; editor: Monaco.editor.IStandaloneCodeEditor | null }>) => {
    if (!script.trim()) {
      setScriptError(null);
      if (monacoRef?.current?.editor) {
        const model = monacoRef.current.editor.getModel();
        if (model) Monaco.editor.setModelMarkers(model, 'script-validation', []);
      }
      return;
    }
    try {
      new Function(script);
      setScriptError(null);
      if (monacoRef?.current?.editor) {
        const model = monacoRef.current.editor.getModel();
        if (model) Monaco.editor.setModelMarkers(model, 'script-validation', []);
      }
    } catch (e) {
      const errorMsg = getErrorMessage(e);
      setScriptError(errorMsg);
      if (monacoRef?.current?.editor) {
        const model = monacoRef.current.editor.getModel();
        if (model) {
          // Try to extract line number from error message
          const lineMatch = errorMsg.match(/line (\d+)/i);
          const line = lineMatch ? parseInt(lineMatch[1]) : 1;
          Monaco.editor.setModelMarkers(model, 'script-validation', [{
            severity: Monaco.MarkerSeverity.Error,
            message: errorMsg,
            startLineNumber: line,
            startColumn: 1,
            endLineNumber: line,
            endColumn: model.getLineLength(line) + 1,
          }]);
        }
      }
    }
  };

  // Helper to extract error info with stack trace
  const getErrorInfo = (e: unknown): { message: string; stack?: string } => {
    if (e instanceof Error) {
      return { message: e.message, stack: e.stack };
    }
    return { message: String(e) };
  };

  const runScriptTest = (script: string, type: string) => {
    clearScriptConsole();
    if (!script.trim()) {
      addScriptLog({ level: 'warn', message: t('scripts.emptyScript') });
      return;
    }
    try {
      const mockPm = {
        environment: { get: (k: string) => currentEnvVariables[k], set: (k: string, v: string) => setEnvVariable(k, v) },
        utils: { sha256: (s: string) => s, randomUuid: () => crypto.randomUUID?.() || Date.now().toString(36) },
        _: {
          get: lodashGet,
          set: lodashSet,
          has: lodashHas,
          pick: lodashPick,
          omit: lodashOmit,
        },
        console: {
          log: (...args: any[]) => addScriptLog({ level: 'info', message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') }),
          error: (...args: any[]) => addScriptLog({ level: 'error', message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') }),
          warn: (...args: any[]) => addScriptLog({ level: 'warn', message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') }),
        },
        test: (name: string, fn: () => void) => {
          try { fn(); addScriptLog({ level: 'info', message: `✓ ${name}` }); }
          catch (e) {
            const { message, stack } = getErrorInfo(e);
            addScriptLog({ level: 'error', message: `✗ ${name}: ${message}`, stack });
          }
        },
        expect: (actual: any) => ({
          to: {
            equal: (expected: any) => { if (actual !== expected) throw new Error(`Expected ${expected}, got ${actual}`); },
            be: { below: (n: number) => { if (!(actual < n)) throw new Error(`Expected < ${n}, got ${actual}`); } },
            have: { property: (p: string) => { if (!actual?.[p]) throw new Error(`Missing property ${p}`); } },
            include: (s: string) => { if (!String(actual).includes(s)) throw new Error(`Expected to include "${s}"`); }
          }
        }),
        setTimeout: (fn: () => void, delay: number) => {
          addScriptLog({ level: 'warn', message: t('scripts.setTimeoutSimulated', { delay }) });
          fn();
        },
        request: { method, url, headers: buildHeaders(), body, params: buildQueryParams() },
        response: response ? { status: response.status, statusText: response.statusText, body: response.body, headers: response.headers, time: response.time } : null,
      };
      const fn = new Function('pm', script);
      fn(mockPm);
      addScriptLog({ level: 'info', message: t('scripts.scriptCompleted', { type }) });
    } catch (e) {
      const { message, stack } = getErrorInfo(e);
      addScriptLog({ level: 'error', message: t('scripts.executionError', { message }), stack });
    }
  };

  const handleAddInterceptor = (stage: InterceptorStage) => {
    const newInterceptor: Omit<Interceptor, 'id'> = {
      name: `New ${t(STAGE_LABELS[stage])}`,
      stage,
      script: '',
      enabled: true,
      order: interceptors.filter(i => i.stage === stage).length,
    };
    addInterceptor(newInterceptor);
  };

  const selectedInterceptor = interceptors.find(i => i.id === selectedInterceptorId);

  const filteredLogs = filterLevel === 'all' ? scriptConsole : scriptConsole.filter(l => l.level === filterLevel);

  const handleExportLogs = () => {
    const content = filteredLogs.map(log =>
      `[${log.time.toLocaleString()}] [${log.level.toUpperCase()}] ${log.message}${log.stack ? `\n${log.stack}` : ''}`
    ).join('\n\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `script-logs-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Group interceptors by stage
  const interceptorsByStage = STAGE_ORDER.reduce((acc, stage) => {
    acc[stage] = interceptors.filter(i => i.stage === stage).sort((a, b) => a.order - b.order);
    return acc;
  }, {} as Record<InterceptorStage, Interceptor[]>);

  return (
    <div className="space-y-4">
      {/* Mode Toggle */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{t('scripts.mode')}:</span>
        <button
          onClick={() => setShowLegacyMode(true)}
          className="px-2 py-1 text-[10px] rounded"
          style={showLegacyMode ? { backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' } : { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
        >
          {t('scripts.simpleMode')}
        </button>
        <button
          onClick={() => setShowLegacyMode(false)}
          className="px-2 py-1 text-[10px] rounded"
          style={!showLegacyMode ? { backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' } : { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
        >
          {t('scripts.interceptorMode')}
        </button>
      </div>

      {showLegacyMode ? (
        /* Legacy Single Script Mode */
        <LegacyScriptsView
          preRequestScript={preRequestScript}
          postResponseScript={postResponseScript}
          scriptEnabled={scriptEnabled}
          scriptError={scriptError}
          onSetPreRequestScript={setPreRequestScript}
          onSetPostResponseScript={setPostResponseScript}
          onSetScriptEnabled={setScriptEnabled}
          onValidateScript={validateScript}
          onRunScriptTest={runScriptTest}
          preRequestEditorRef={preRequestEditorRef}
          postResponseEditorRef={postResponseEditorRef}
        />
      ) : (
        /* Interceptor Mode */
        <div className="space-y-4">
          {/* Interceptor List by Stage */}
          {STAGE_ORDER.map(stage => (
            <div key={stage} className="rounded-lg p-3" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{t(STAGE_LABELS[stage])}</span>
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>({interceptorsByStage[stage].length})</span>
                </div>
                <button
                  onClick={() => handleAddInterceptor(stage)}
                  className="px-2 py-0.5 text-[10px] rounded"
                  style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}
                >
                  + {t('scripts.add')}
                </button>
              </div>

              {/* Stage Interceptors */}
              <div className="space-y-2">
                {interceptorsByStage[stage].map(interceptor => (
                  <div
                    key={interceptor.id}
                    className="p-2 rounded cursor-pointer"
                    style={{
                      backgroundColor: selectedInterceptorId === interceptor.id ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
                      border: `1px solid ${selectedInterceptorId === interceptor.id ? 'var(--accent)' : 'var(--border-color)'}`,
                    }}
                    onClick={() => setSelectedInterceptorId(interceptor.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={interceptor.enabled}
                          onChange={e => {
                            e.stopPropagation();
                            updateInterceptor(interceptor.id, { enabled: e.target.checked });
                          }}
                          className="w-3 h-3 rounded"
                        />
                        <span className="text-xs" style={{ color: 'var(--text-primary)' }}>{interceptor.name}</span>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); removeInterceptor(interceptor.id); if (selectedInterceptorId === interceptor.id) setSelectedInterceptorId(null); }}
                        className="px-1 py-0.5 text-[10px] rounded"
                        style={{ backgroundColor: 'var(--danger)', color: 'var(--text-inverse)' }}
                      >
                        {t('scripts.delete')}
                      </button>
                    </div>
                  </div>
                ))}
                {interceptorsByStage[stage].length === 0 && (
                  <div className="text-xs text-center py-2" style={{ color: 'var(--text-muted)' }}>{t('scripts.noInterceptors')}</div>
                )}
              </div>
            </div>
          ))}

          {/* Selected Interceptor Editor */}
          {selectedInterceptor && (
            <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
              <div className="flex items-center justify-between mb-2">
                <input
                  type="text"
                  value={selectedInterceptor.name}
                  onChange={e => updateInterceptor(selectedInterceptor.id, { name: e.target.value })}
                  className="px-2 py-1 rounded text-xs"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                />
                <button
                  onClick={() => runScriptTest(selectedInterceptor.script, selectedInterceptor.name)}
                  className="px-2 py-1 text-[10px] rounded"
                  style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}
                >
                  {t('scripts.runTests')}
                </button>
              </div>
              <MonacoEditor
                height="128px"
                language="javascript"
                value={selectedInterceptor.script}
                onChange={v => updateInterceptor(selectedInterceptor.id, { script: v || '' })}
                onMount={(editor, monaco) => {
                  interceptorEditorRef.current = { monaco, editor };
                  setupSpaceKeyWorkaround(editor);
                  setupAutoCompletion(editor);
                  registerPmCompletionProvider(monaco, t, {
                    request: { method, url, headers, body, params },
                    response: response || null,
                  });
                }}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  lineNumbers: 'on',
                  fontSize: 11,
                  tabSize: 2,
                  automaticLayout: true,
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  folding: true,
                  glyphMargin: true,
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Console Output */}
      <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{t('scripts.console')}</span>
          <div className="flex items-center gap-2">
            <select
              value={filterLevel}
              onChange={e => setFilterLevel(e.target.value)}
              className="px-1 py-0.5 text-[10px] rounded"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
            >
              <option value="all">{t('scripts.all')}</option>
              <option value="info">{t('scripts.info')}</option>
              <option value="warn">{t('scripts.warn')}</option>
              <option value="error">{t('scripts.error')}</option>
            </select>
            <button
              onClick={clearScriptConsole}
              className="px-1.5 py-0.5 text-[10px] rounded"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
            >
              {t('scripts.clear')}
            </button>
            {filteredLogs.length > 0 && (
              <button
                onClick={handleExportLogs}
                className="px-1.5 py-0.5 text-[10px] rounded"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}
              >
                {t('scripts.export')}
              </button>
            )}
          </div>
        </div>
        <div className="h-24 overflow-y-auto rounded px-2 py-1.5" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
          {filteredLogs.length === 0 && (
            <div className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>{t('scripts.consoleOutput')}</div>
          )}
          {filteredLogs.map((log, i) => (
            <div key={i} className="text-xs font-mono py-0.5">
              <div style={{ color: log.level === 'error' ? 'var(--danger)' : log.level === 'warn' ? 'var(--warning)' : 'var(--text-primary)' }}>
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>[{log.time.toLocaleTimeString()}]</span>
                {' '}{log.message}
              </div>
              {log.stack && log.level === 'error' && (
                <div className="text-[10px] mt-1 pl-4" style={{ color: 'var(--text-muted)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {log.stack}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Legacy single script view for backward compatibility
interface LegacyScriptsViewProps {
  preRequestScript: string;
  postResponseScript: string;
  scriptEnabled: boolean;
  scriptError: string | null;
  onSetPreRequestScript: (s: string) => void;
  onSetPostResponseScript: (s: string) => void;
  onSetScriptEnabled: (e: boolean) => void;
  onValidateScript: (s: string, ref?: React.MutableRefObject<{ monaco: typeof Monaco | null; editor: Monaco.editor.IStandaloneCodeEditor | null }>) => void;
  onRunScriptTest: (s: string, t: string) => void;
  preRequestEditorRef: React.MutableRefObject<{ monaco: typeof Monaco | null; editor: Monaco.editor.IStandaloneCodeEditor | null }>;
  postResponseEditorRef: React.MutableRefObject<{ monaco: typeof Monaco | null; editor: Monaco.editor.IStandaloneCodeEditor | null }>;
}

function LegacyScriptsView({
  preRequestScript,
  postResponseScript,
  scriptEnabled,
  scriptError,
  onSetPreRequestScript,
  onSetPostResponseScript,
  onSetScriptEnabled,
  onValidateScript,
  onRunScriptTest,
  preRequestEditorRef,
  postResponseEditorRef,
}: LegacyScriptsViewProps) {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);

  // Debounced validation ref
  const validateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Get request/response data from stores directly
  const { response: storeResponse } = useResponseData();
  const requestState = useRequestState();

  const debouncedValidate = useCallback((script: string, ref: React.MutableRefObject<{ monaco: typeof Monaco | null; editor: Monaco.editor.IStandaloneCodeEditor | null }>) => {
    if (validateTimeoutRef.current) {
      clearTimeout(validateTimeoutRef.current);
    }
    validateTimeoutRef.current = setTimeout(() => {
      onValidateScript(script, ref);
    }, 300);
  }, [onValidateScript]);

  return (
    <>
      {/* Error Display */}
      {scriptError && (
        <div className="rounded p-2 text-xs" style={{ backgroundColor: 'var(--bg-danger)', color: 'var(--danger)', border: '1px solid var(--danger)' }}>
          <span className="font-medium">{t('scripts.syntaxError')}:</span> {scriptError}
        </div>
      )}

      {/* Pre-request Script */}
      <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>Pre-request Script</span>
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{t('scripts.beforeRequest')}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onRunScriptTest(preRequestScript, 'Pre-request')}
              className="px-2 py-0.5 text-[10px] rounded"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}
            >
              {t('scripts.runTests')}
            </button>
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" checked={scriptEnabled} onChange={e => onSetScriptEnabled(e.target.checked)} className="w-3.5 h-3.5 rounded" />
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{t('scripts.enable')}</span>
            </label>
          </div>
        </div>
        <div className="relative">
          <MonacoEditor
            height="128px"
            language="javascript"
            value={preRequestScript}
            onChange={v => {
              onSetPreRequestScript(v || '');
              debouncedValidate(v || '', preRequestEditorRef);
            }}
            onMount={(editor, monaco) => {
              preRequestEditorRef.current = { monaco, editor };
              setupSpaceKeyWorkaround(editor);
              setupAutoCompletion(editor);
              registerPmCompletionProvider(monaco, t, {
                request: { method: requestState.method, url: requestState.url, headers: requestState.headers, body: requestState.reqBody, params: requestState.params },
                response: storeResponse || null,
              });
            }}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              lineNumbers: 'on',
              fontSize: 11,
              tabSize: 2,
              automaticLayout: true,
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              folding: false,
              glyphMargin: true,
            }}
          />
        </div>
        <div className="mt-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
          {t('scripts.hint')}: pm.environment, pm.utils, pm.test, pm.expect
        </div>
      </div>

      {/* Post-response Script */}
      <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>Post-response Script</span>
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{t('scripts.afterResponse')}</span>
          </div>
          <button
            onClick={() => onRunScriptTest(postResponseScript, 'Post-response')}
            className="px-2 py-0.5 text-[10px] rounded"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}
          >
            {t('scripts.runTests')}
          </button>
        </div>
        <div className="relative">
          <MonacoEditor
            height="128px"
            language="javascript"
            value={postResponseScript}
            onChange={v => { onSetPostResponseScript(v || ''); debouncedValidate(v || '', postResponseEditorRef); }}
            onMount={(editor, monaco) => {
              postResponseEditorRef.current = { monaco, editor };
              setupSpaceKeyWorkaround(editor);
              setupAutoCompletion(editor);
              registerPmCompletionProvider(monaco, t, {
                request: { method: requestState.method, url: requestState.url, headers: requestState.headers, body: requestState.reqBody, params: requestState.params },
                response: storeResponse || null,
              });
            }}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              lineNumbers: 'on',
              fontSize: 11,
              tabSize: 2,
              automaticLayout: true,
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              folding: false,
              glyphMargin: true,
            }}
          />
        </div>
      </div>
    </>
  );
}
