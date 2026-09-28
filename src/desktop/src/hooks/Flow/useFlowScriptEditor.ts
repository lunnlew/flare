import { useState, useCallback, useRef } from "react";
import * as Monaco from "monaco-editor";
import { t } from "../../utils/i18n";
import { useSettingsStore } from "../../store";

export interface ScriptLog {
  level: "info" | "warn" | "error";
  message: string;
  time: Date;
  stack?: string;
}

export interface MockPmExtensions {
  environment?: {
    get: (key: string) => unknown;
    set: (key: string, value: unknown) => void;
  };
  utils?: Record<string, (...args: unknown[]) => unknown>;
  lodash?: Record<string, (...args: unknown[]) => unknown>;
  test?: (name: string, fn: () => void) => void;
  expect?: (actual: unknown) => ExpectChain;
  request?: {
    method?: string;
    url?: string;
    headers?: Record<string, string>;
    body?: string;
    params?: Record<string, string>;
  };
  response?: {
    status?: number;
    statusText?: string;
    body?: string;
    headers?: Record<string, string>;
    time?: number;
  } | null;
}

export interface ExpectChain {
  to: {
    equal: (expected: unknown) => void;
    be: { below: (n: number) => void };
    have: { property: (p: string) => void };
    include: (s: string) => void;
  };
}

interface UseFlowScriptEditorOptions {
  onValidate?: (script: string) => void;
  onSetOutput?: (key: string, value: unknown) => void;
  mockPmExtensions?: MockPmExtensions;
}

/**
 * Hook for FlowCanvas script editing with validation and test execution
 */
export function useFlowScriptEditor(options: UseFlowScriptEditorOptions = {}) {
  const { onValidate, onSetOutput, mockPmExtensions } = options;

  const [scriptLogs, setScriptLogs] = useState<ScriptLog[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const editorRef = useRef<{ monaco: typeof Monaco | null; editor: Monaco.editor.IStandaloneCodeEditor | null }>({
    monaco: null,
    editor: null,
  });

  /**
   * Validate script syntax and set Monaco markers
   */
  const validateScript = useCallback(
    (script: string, monacoRef?: React.MutableRefObject<{ monaco: typeof Monaco | null; editor: Monaco.editor.IStandaloneCodeEditor | null }>) => {
      if (!script.trim()) {
        setValidationError(null);
        const ref = monacoRef || editorRef;
        if (ref.current?.editor) {
          const model = ref.current.editor.getModel();
          if (model) Monaco.editor.setModelMarkers(model, "flow-script-validation", []);
        }
        onValidate?.(script);
        return { isValid: true };
      }

      try {
        new Function(script);
        setValidationError(null);
        const ref = monacoRef || editorRef;
        if (ref.current?.editor) {
          const model = ref.current.editor.getModel();
          if (model) Monaco.editor.setModelMarkers(model, "flow-script-validation", []);
        }
        onValidate?.(script);
        return { isValid: true };
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        setValidationError(errorMsg);

        const lineMatch = errorMsg.match(/line (\d+)/i);
        const line = lineMatch ? parseInt(lineMatch[1]) : 1;

        const ref = monacoRef || editorRef;
        if (ref.current?.editor) {
          const model = ref.current.editor.getModel();
          if (model) {
            Monaco.editor.setModelMarkers(model, "flow-script-validation", [{
              severity: Monaco.MarkerSeverity.Error,
              message: errorMsg,
              startLineNumber: line,
              startColumn: 1,
              endLineNumber: line,
              endColumn: model.getLineLength(line) + 1,
            }]);
          }
        }
        onValidate?.(script);
        return { isValid: false, error: errorMsg, line };
      }
    },
    [onValidate]
  );

  /**
   * Clear the script console
   */
  const clearScriptLogs = useCallback(() => {
    setScriptLogs([]);
  }, []);

  /**
   * Add a log entry
   */
  const addScriptLog = useCallback((log: Omit<ScriptLog, "time">) => {
    setScriptLogs((prev) => [...prev, { ...log, time: new Date() }]);
  }, []);

  /**
   * Run a test execution of the script with mock pm object
   */
  const runScriptTest = useCallback(
    (script: string, inputs: Record<string, unknown> = {}) => {
      clearScriptLogs();
      if (!script.trim()) {
        addScriptLog({ level: "warn", message: t('script.error.empty', useSettingsStore.getState().language) });
        return;
      }

      setIsRunning(true);

      try {
        const outputs: Record<string, unknown> = {};

        // Build mockPm with base features plus extensions
        const mockPm: Record<string, unknown> = {
          inputs,
          setOutput: (key: string, value: unknown) => {
            outputs[key] = value;
            addScriptLog({ level: "info", message: `setOutput('${key}', ${JSON.stringify(value)})` });
            onSetOutput?.(key, value);
          },
          console: {
            log: (...args: unknown[]) =>
              addScriptLog({
                level: "info",
                message: args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" "),
              }),
            info: (...args: unknown[]) =>
              addScriptLog({
                level: "info",
                message: args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" "),
              }),
            warn: (...args: unknown[]) =>
              addScriptLog({
                level: "warn",
                message: args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" "),
              }),
            error: (...args: unknown[]) =>
              addScriptLog({
                level: "error",
                message: args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" "),
              }),
          },
        };

        // Add extensions if provided
        if (mockPmExtensions) {
          if (mockPmExtensions.environment) {
            mockPm.environment = mockPmExtensions.environment;
          }
          if (mockPmExtensions.utils) {
            mockPm.utils = mockPmExtensions.utils;
          }
          if (mockPmExtensions.lodash) {
            mockPm._ = mockPmExtensions.lodash;
          }
          if (mockPmExtensions.test) {
            mockPm.test = mockPmExtensions.test;
          }
          if (mockPmExtensions.expect) {
            mockPm.expect = mockPmExtensions.expect;
          }
          if (mockPmExtensions.request) {
            mockPm.request = mockPmExtensions.request;
          }
          if (mockPmExtensions.response) {
            mockPm.response = mockPmExtensions.response;
          }
        }

        const fn = new Function("pm", script);
        fn(mockPm);

        if (Object.keys(outputs).length > 0) {
          addScriptLog({ level: "info", message: `脚本执行完成，输出: ${JSON.stringify(outputs)}` });
        } else {
          addScriptLog({ level: "info", message: t('script.error.executionComplete', useSettingsStore.getState().language) });
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        const stack = e instanceof Error ? e.stack : undefined;
        addScriptLog({ level: "error", message: `执行错误: ${message}`, stack });
      } finally {
        setIsRunning(false);
      }
    },
    [addScriptLog, clearScriptLogs, onSetOutput, mockPmExtensions]
  );

  return {
    scriptLogs,
    validationError,
    isRunning,
    editorRef,
    validateScript,
    runScriptTest,
    clearScriptLogs,
    addScriptLog,
  };
}