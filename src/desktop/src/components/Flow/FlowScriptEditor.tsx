import { useCallback, useRef, useState } from "react";
import MonacoEditor from "@monaco-editor/react";
import * as Monaco from "monaco-editor";
import { useFlowScriptEditor } from "../../hooks/Flow/useFlowScriptEditor";
import { ConfigSection } from "./nodes/NodeConfigBase";
import { useSettingsStore } from "../../store";
import { useTranslation } from "../../utils/i18n";

interface FlowScriptEditorProps {
  value: string;
  onChange: (value: string) => void;
  inputs?: Record<string, unknown>;
  onSetOutput?: (key: string, value: unknown) => void;
  onValidate?: (script: string) => void;
  height?: number;
  showConsole?: boolean;
}

export function FlowScriptEditor({
  value,
  onChange,
  inputs = {},
  onSetOutput,
  onValidate,
  height = 200,
  showConsole = true,
}: FlowScriptEditorProps) {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);

  const [filterLevel, setFilterLevel] = useState<string>("all");

  const { scriptLogs, validationError, isRunning, editorRef, validateScript, runScriptTest, clearScriptLogs } =
    useFlowScriptEditor({ onValidate, onSetOutput });

  const editorMountedRef = useRef(false);

  const handleEditorMount = useCallback(
    (editor: Monaco.editor.IStandaloneCodeEditor, monaco: typeof Monaco) => {
      editorRef.current = { monaco, editor };

      // Setup space key workaround for Monaco
      editor.onKeyDown((e) => {
        if (e.code === "Space") {
          e.preventDefault();
          e.stopPropagation();
          const selection = editor.getSelection();
          if (selection) {
            editor.executeEdits("space-insert", [
              {
                range: selection,
                text: " ",
                forceMoveMarkers: true,
              },
            ]);
          }
        }
      });

      // Auto-trigger completion on dot
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
        if (textBefore.endsWith(".")) {
          const now = Date.now();
          if (now - lastDotTime > 100) {
            lastDotTime = now;
            setTimeout(() => {
              editor.trigger("auto-complete", "editor.action.triggerSuggest", null);
            }, 50);
          }
        }
      });

      editorMountedRef.current = true;
    },
    [editorRef]
  );

  const handleEditorChange = useCallback(
    (v: string | undefined) => {
      const script = v || "";
      onChange(script);

      // Debounced validation
      setTimeout(() => {
        if (editorMountedRef.current) {
          validateScript(script);
        }
      }, 300);
    },
    [onChange, validateScript]
  );

  const handleRunTest = useCallback(() => {
    runScriptTest(value, inputs);
  }, [runScriptTest, value, inputs]);

  const filteredLogs = filterLevel === "all" ? scriptLogs : scriptLogs.filter((l) => l.level === filterLevel);

  return (
    <div className="space-y-3">
      {/* Error Display */}
      {validationError && (
        <div
          className="rounded p-2 text-xs"
          style={{
            backgroundColor: "var(--bg-danger)",
            color: "var(--danger)",
            border: "1px solid var(--danger)",
          }}
        >
          <span className="font-medium">{t('flow.syntaxError')}</span> {validationError}
        </div>
      )}

      {/* Monaco Editor */}
      <div className="relative rounded" style={{ border: "1px solid var(--border-color)" }}>
        <MonacoEditor
          height={height}
          language="javascript"
          value={value}
          onChange={handleEditorChange}
          onMount={handleEditorMount}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            lineNumbers: "on",
            fontSize: 12,
            tabSize: 2,
            automaticLayout: true,
            scrollBeyondLastLine: false,
            wordWrap: "on",
            folding: true,
            glyphMargin: true,
            lineDecorationsWidth: 5,
            lineNumbersMinChars: 3,
          }}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleRunTest}
          disabled={isRunning}
          className="px-3 py-1.5 text-xs rounded font-medium"
          style={{
            backgroundColor: isRunning ? "var(--bg-tertiary)" : "var(--accent)",
            color: "var(--text-inverse)",
            cursor: isRunning ? "not-allowed" : "pointer",
          }}
        >
          {isRunning ? t('flow.running') : t('flow.runTest')}
        </button>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {t('flow.availableInputs')}
        </span>
      </div>

      {/* Console Output */}
      {showConsole && (
        <ConfigSection title={`📋 ${t('flow.console')}`}>
          <div className="space-y-2">
            {/* Console Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <select
                  value={filterLevel}
                  onChange={(e) => setFilterLevel(e.target.value)}
                  className="px-1.5 py-0.5 text-xs rounded"
                  style={{
                    backgroundColor: "var(--bg-tertiary)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border-color)",
                  }}
                >
                  <option value="all">{t('flow.all')}</option>
                  <option value="info">{t('flow.info')}</option>
                  <option value="warn">{t('flow.warn')}</option>
                  <option value="error">{t('flow.error')}</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={clearScriptLogs}
                  className="px-2 py-0.5 text-xs rounded"
                  style={{
                    backgroundColor: "var(--bg-tertiary)",
                    color: "var(--text-muted)",
                  }}
                >
                  {t('flow.clearLogs')}
                </button>
              </div>
            </div>

            {/* Console Output */}
            <div
              className="h-24 overflow-y-auto rounded px-2 py-1.5"
              style={{ backgroundColor: "var(--bg-tertiary)" }}
            >
              {filteredLogs.length === 0 && (
                <div className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
                  {t('flow.consoleOutputHint')}
                </div>
              )}
              {filteredLogs.map((log, i) => (
                <div key={i} className="text-xs font-mono py-0.5">
                  <div
                    style={{
                      color:
                        log.level === "error"
                          ? "var(--danger)"
                          : log.level === "warn"
                            ? "var(--warning)"
                            : "var(--text-primary)",
                    }}
                  >
                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                      [{log.time.toLocaleTimeString()}]
                    </span>
                    {" "}
                    {log.message}
                  </div>
                  {log.stack && log.level === "error" && (
                    <div
                      className="text-[10px] mt-1 pl-4"
                      style={{
                        color: "var(--text-muted)",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-all",
                      }}
                    >
                      {log.stack}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </ConfigSection>
      )}
    </div>
  );
}