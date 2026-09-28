/**
 * DiffViewer - 显示文件变更差异
 *
 * 支持查看两个提交之间的差异，带语法高亮
 */

import { memo, useState, useCallback } from "react";
import {
  gitDiff,
  gitLog,
  type DiffResult,
  type DiffFile,
  type DiffHunk,
  type DiffLine,
  type GitCommit,
} from "../../services/api";
import { useSettingsStore } from "../../store";
import { useTranslation } from "../../utils/i18n";

interface DiffViewerProps {
  diff: DiffResult | null;
  loading?: boolean;
}

export const DiffViewer = memo(function DiffViewer({
  diff,
  loading,
}: DiffViewerProps) {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);

  if (loading) {
    return (
      <div className="text-center py-8 text-xs" style={{ color: "var(--text-muted)" }}>
        {t('diff.loading')}
      </div>
    );
  }

  if (!diff || diff.files.length === 0) {
    return (
      <div className="text-center py-8 text-xs" style={{ color: "var(--text-muted)" }}>
        {t('diff.noDiff')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center gap-4 text-xs" style={{ color: "var(--text-muted)" }}>
        <span style={{ color: "var(--success)" }}>{t('diff.linesAdded', { count: diff.summary.added })}</span>
        <span style={{ color: "var(--danger)" }}>{t('diff.linesRemoved', { count: diff.summary.removed })}</span>
      </div>

      {/* Files */}
      {diff.files.map((file, fileIndex) => (
        <DiffFileView key={fileIndex} file={file} />
      ))}
    </div>
  );
});

function DiffFileView({ file }: { file: DiffFile }) {
  return (
    <div
      className="rounded overflow-hidden"
      style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-color)" }}
    >
      {/* File header */}
      <div
        className="px-3 py-2 text-xs font-medium"
        style={{
          backgroundColor: "var(--bg-tertiary)",
          color: "var(--text-primary)",
          borderBottom: "1px solid var(--border-color)",
        }}
      >
        {file.path}
      </div>

      {/* Hunks */}
      <div className="font-mono text-xs">
        {file.hunks.map((hunk, hunkIndex) => (
          <DiffHunkView key={hunkIndex} hunk={hunk} />
        ))}
      </div>
    </div>
  );
}

function DiffHunkView({ hunk }: { hunk: DiffHunk }) {
  return (
    <div className="border-b last:border-b-0" style={{ borderColor: "var(--border-color)" }}>
      {/* Hunk header */}
      <div
        className="px-3 py-1 text-xs"
        style={{ backgroundColor: "rgba(100, 100, 100, 0.2)", color: "var(--text-muted)" }}
      >
        @@ -{hunk.old_start},{hunk.old_lines} +{hunk.new_start},{hunk.new_lines} @@
      </div>

      {/* Lines */}
      <div>
        {hunk.lines.map((line, lineIndex) => (
          <DiffLineView key={lineIndex} line={line} />
        ))}
      </div>
    </div>
  );
}

function DiffLineView({ line }: { line: DiffLine }) {
  const bgColor =
    line.type === "add"
      ? "rgba(72, 199, 116, 0.2)"
      : line.type === "delete"
      ? "rgba(220, 71, 71, 0.2)"
      : line.type === "context"
      ? "transparent"
      : "rgba(255, 206, 51, 0.15)";

  const textColor =
    line.type === "add"
      ? "var(--success)"
      : line.type === "delete"
      ? "var(--danger)"
      : line.type === "context"
      ? "var(--text-primary)"
      : "var(--warning)";

  const prefix = line.type === "add" ? "+" : line.type === "delete" ? "-" : " ";

  return (
    <div
      className="flex px-3 py-0.5"
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      <span className="w-6 text-center flex-shrink-0 select-none" style={{ color: "var(--text-muted)" }}>
        {prefix}
      </span>
      <span className="flex-1 whitespace-pre-wrap break-all">{line.content}</span>
    </div>
  );
}

/**
 * DiffPanel - 差异比较面板
 *
 * 用于选择两个提交并查看它们之间的差异
 */
interface DiffPanelProps {
  apiName?: string;
}

export function DiffPanel({ apiName }: DiffPanelProps) {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);

  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [loading, setLoading] = useState(false);
  const [diff, setDiff] = useState<DiffResult | null>(null);
  const [commitA, setCommitA] = useState<string>("");
  const [commitB, setCommitB] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const loadCommits = useCallback(async () => {
    try {
      setLoading(true);
      const log = await gitLog(apiName, 20);
      setCommits(log);
      if (log.length >= 2) {
        setCommitA(log[0].hash);
        setCommitB(log[1].hash);
      }
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [apiName]);

  const loadDiff = useCallback(async () => {
    if (!commitA) return;
    try {
      setLoading(true);
      const result = await gitDiff(apiName || "", commitA, commitB || undefined);
      setDiff(result);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [apiName, commitA, commitB]);

  return (
    <div className="space-y-4">
      {/* Commit selector */}
      <div className="flex items-center gap-2">
        <select
          value={commitA}
          onChange={(e) => setCommitA(e.target.value)}
          onFocus={loadCommits}
          className="flex-1 px-2 py-1.5 rounded text-xs"
          style={{
            backgroundColor: "var(--bg-secondary)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-color)",
          }}
        >
          <option value="">{t('diff.selectCommitA')}</option>
          {commits.map((c) => (
            <option key={c.hash} value={c.hash}>
              {c.short_hash} - {c.message.substring(0, 50)}
            </option>
          ))}
        </select>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          vs
        </span>
        <select
          value={commitB}
          onChange={(e) => setCommitB(e.target.value)}
          className="flex-1 px-2 py-1.5 rounded text-xs"
          style={{
            backgroundColor: "var(--bg-secondary)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-color)",
          }}
        >
          <option value="">{t('diff.selectCommitB')}</option>
          {commits.map((c) => (
            <option key={c.hash} value={c.hash}>
              {c.short_hash} - {c.message.substring(0, 50)}
            </option>
          ))}
        </select>
        <button
          onClick={loadDiff}
          disabled={!commitA || loading}
          className="px-3 py-1.5 rounded text-xs"
          style={{
            backgroundColor: commitA && !loading ? "var(--accent)" : "var(--bg-tertiary)",
            color: commitA && !loading ? "var(--text-inverse)" : "var(--text-muted)",
          }}
        >
          {t('diff.compare')}
        </button>
      </div>

      {error && (
        <div
          className="p-3 rounded text-xs"
          style={{ backgroundColor: "var(--danger)", color: "var(--text-inverse)" }}
        >
          {error}
        </div>
      )}

      {/* Diff viewer */}
      <DiffViewer diff={diff} loading={loading} />
    </div>
  );
}