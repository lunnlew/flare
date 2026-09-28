/**
 * GitPanel - Git Version Control Panel
 *
 * Displays Git status, history, supports commit and branch switching, and diff comparison
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  gitStatus,
  gitLog,
  gitStage,
  gitCommit,
  gitBranchList,
  gitBranchCreate,
  gitCheckout,
  gitReset,
  gitRevert,
  type RepoStatus,
  type GitCommit,
  type Branch,
} from "../../services/api";
import { DiffPanel } from "./DiffViewer";
import { useNotificationStore } from "../../store/notificationStore";
import { useSettingsStore } from "../../store";
import { useTranslation } from "../../utils/i18n";

type TabType = "status" | "history" | "branches" | "diff";

export function GitPanel() {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);
  const [activeTab, setActiveTab] = useState<TabType>("status");
  const [status, setStatus] = useState<RepoStatus | null>(null);
  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commitMessage, setCommitMessage] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const { showToast } = useNotificationStore();

  const loadStatus = useCallback(async () => {
    try {
      setLoading(true);
      const s = await gitStatus();
      setStatus(s);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      const log = await gitLog(undefined, 50);
      setCommits(log);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadBranches = useCallback(async () => {
    try {
      setLoading(true);
      const b = await gitBranchList();
      setBranches(b);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "status") loadStatus();
    else if (activeTab === "history") loadHistory();
    else if (activeTab === "branches") loadBranches();
  }, [activeTab, loadStatus, loadHistory, loadBranches]);

  const handleStage = useCallback(async (files: string[]) => {
    try {
      await gitStage(files);
      setSelectedFiles([]);
      await loadStatus();
    } catch (e) {
      setError(String(e));
    }
  }, [loadStatus]);

  const handleCommit = useCallback(async () => {
    if (!commitMessage.trim()) {
      showToast(t('git.pleaseInputCommitMessage'), "info");
      return;
    }
    try {
      await gitCommit(commitMessage);
      setCommitMessage("");
      await loadStatus();
    } catch (e) {
      setError(String(e));
    }
  }, [commitMessage, loadStatus, showToast]);

  const handleCheckout = useCallback(async (branch: string) => {
    if (!confirm(t('git.confirmSwitchBranch') + `"${branch}"?`)) return;
    try {
      await gitCheckout(branch);
      await loadBranches();
      await loadStatus();
    } catch (e) {
      setError(String(e));
    }
  }, [loadBranches, loadStatus]);

  const handleCreateBranch = useCallback(async (branchName: string) => {
    if (!branchName.trim()) return;
    if (!confirm(t('git.confirmCreateBranch') + `"${branchName}"?`)) return;
    try {
      await gitBranchCreate(branchName);
      await loadBranches();
    } catch (e) {
      setError(String(e));
    }
  }, [loadBranches]);

  const toggleFileSelection = useCallback((file: string) => {
    setSelectedFiles((prev) =>
      prev.includes(file) ? prev.filter((f) => f !== file) : [...prev, file]
    );
  }, [setSelectedFiles]);

  const formatTime = useMemo(() => (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  return (
    <div
      className="h-full flex flex-col"
      style={{ backgroundColor: "var(--bg-primary)", color: "var(--text-primary)" }}
    >
      {/* Header */}
      <div
        className="p-4 border-b flex items-center justify-between"
        style={{ borderColor: "var(--border-color)" }}
      >
        <div>
          <h1 className="text-base font-semibold">{t('git.title')}</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            {status?.clean ? t('git.worktreeClean') : t('git.hasUncommittedChanges')}
          </p>
        </div>
        <button
          onClick={() => {
            if (activeTab === "status") loadStatus();
            else if (activeTab === "history") loadHistory();
            else if (activeTab === "branches") loadBranches();
          }}
          className="px-3 py-1.5 rounded text-xs"
          style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-primary)" }}
        >
          {t('git.refresh')}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b" style={{ borderColor: "var(--border-color)" }}>
        {(["status", "history", "branches", "diff"] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-2 text-xs font-medium transition-colors"
            style={{
              backgroundColor: activeTab === tab ? "var(--bg-secondary)" : "transparent",
              color: activeTab === tab ? "var(--accent)" : "var(--text-muted)",
              borderBottom: activeTab === tab ? "2px solid var(--accent)" : "2px solid transparent",
            }}
          >
            {tab === "status" && t('git.tab.status')}
            {tab === "history" && t('git.tab.history')}
            {tab === "branches" && t('git.tab.branches')}
            {tab === "diff" && t('git.tab.diff')}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {error && (
          <div
            className="mb-4 p-3 rounded text-xs"
            style={{ backgroundColor: "var(--danger)", color: "var(--text-inverse)" }}
          >
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-8 text-xs" style={{ color: "var(--text-muted)" }}>
            {t('git.loading')}
          </div>
        ) : activeTab === "status" ? (
          <StatusTab
            status={status}
            selectedFiles={selectedFiles}
            commitMessage={commitMessage}
            onCommitMessageChange={setCommitMessage}
            onToggleFile={toggleFileSelection}
            onStage={handleStage}
            onCommit={handleCommit}
          />
        ) : activeTab === "history" ? (
          <HistoryTab commits={commits} formatTime={formatTime} onReset={gitReset} onRevert={gitRevert} showToast={showToast} />
        ) : activeTab === "branches" ? (
          <BranchesTab branches={branches} onCheckout={handleCheckout} onCreateBranch={handleCreateBranch} />
        ) : (
          <DiffPanel />
        )}
      </div>
    </div>
  );
}

function StatusTab({
  status,
  selectedFiles,
  commitMessage,
  onCommitMessageChange,
  onToggleFile,
  onStage,
  onCommit,
}: {
  status: RepoStatus | null;
  selectedFiles: string[];
  commitMessage: string;
  onCommitMessageChange: (msg: string) => void;
  onToggleFile: (file: string) => void;
  onStage: (files: string[]) => void;
  onCommit: () => void;
}) {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);

  if (!status) {
    return (
      <div className="text-center py-8 text-xs" style={{ color: "var(--text-muted)" }}>
        {t('git.noStatusData')}
      </div>
    );
  }

  const allFiles = [...status.staged, ...status.unstaged, ...status.untracked];

  return (
    <div className="space-y-4">
      {/* Staged files */}
      {status.staged.length > 0 && (
        <div>
          <div className="text-xs font-medium mb-2" style={{ color: "var(--success)" }}>
            {t('git.staged')} ({status.staged.length})
          </div>
          <div className="space-y-1">
            {status.staged.map((file) => (
              <div
                key={file}
                className="flex items-center gap-2 p-2 rounded text-xs"
                style={{ backgroundColor: "var(--bg-secondary)" }}
              >
                <span style={{ color: "var(--success)" }}>M</span>
                <span className="flex-1 truncate">{file}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unstaged files */}
      {status.unstaged.length > 0 && (
        <div>
          <div className="text-xs font-medium mb-2" style={{ color: "var(--warning)" }}>
            {t('git.unstaged')} ({status.unstaged.length})
          </div>
          <div className="space-y-1">
            {status.unstaged.map((file) => (
              <div
                key={file}
                className="flex items-center gap-2 p-2 rounded text-xs cursor-pointer"
                style={{ backgroundColor: "var(--bg-secondary)" }}
                onClick={() => onToggleFile(file)}
              >
                <input
                  type="checkbox"
                  checked={selectedFiles.includes(file)}
                  onChange={() => {}}
                  className="accent"
                />
                <span style={{ color: "var(--warning)" }}>M</span>
                <span className="flex-1 truncate">{file}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Untracked files */}
      {status.untracked.length > 0 && (
        <div>
          <div className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>
            {t('git.untracked')} ({status.untracked.length})
          </div>
          <div className="space-y-1">
            {status.untracked.map((file) => (
              <div
                key={file}
                className="flex items-center gap-2 p-2 rounded text-xs cursor-pointer"
                style={{ backgroundColor: "var(--bg-secondary)" }}
                onClick={() => onToggleFile(file)}
              >
                <input
                  type="checkbox"
                  checked={selectedFiles.includes(file)}
                  onChange={() => {}}
                  className="accent"
                />
                <span style={{ color: "var(--text-muted)" }}>?</span>
                <span className="flex-1 truncate">{file}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stage selected button */}
      {selectedFiles.length > 0 && (
        <button
          onClick={() => onStage(selectedFiles)}
          className="w-full py-2 rounded text-xs"
          style={{ backgroundColor: "var(--accent)", color: "var(--text-inverse)" }}
        >
          {t('git.stageSelectedFiles')} ({selectedFiles.length})
        </button>
      )}

      {/* Commit form */}
      {status.staged.length > 0 && (
        <div className="pt-4 border-t" style={{ borderColor: "var(--border-color)" }}>
          <textarea
            value={commitMessage}
            onChange={(e) => onCommitMessageChange(e.target.value)}
            placeholder={t('git.commitMessagePlaceholder')}
            className="w-full p-2 rounded text-xs resize-none"
            style={{
              backgroundColor: "var(--bg-secondary)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-color)",
              minHeight: "80px",
            }}
          />
          <button
            onClick={onCommit}
            className="w-full mt-2 py-2 rounded text-xs"
            style={{ backgroundColor: "var(--success)", color: "var(--text-inverse)" }}
          >
            {t('git.commitFiles')} ({status.staged.length})
          </button>
        </div>
      )}

      {allFiles.length === 0 && (
        <div className="text-center py-8 text-xs" style={{ color: "var(--text-muted)" }}>
          {t('git.worktreeCleanNoChanges')}
        </div>
      )}
    </div>
  );
}

function HistoryTab({
  commits,
  formatTime,
  onReset,
  onRevert,
  showToast,
}: {
  commits: GitCommit[];
  formatTime: (ts: number) => string;
  onReset: (commitHash: string, mode?: "hard" | "mixed") => Promise<void>;
  onRevert: (commitHash: string) => Promise<void>;
  showToast: (message: string, type?: "info" | "success" | "error") => void;
}) {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);

  if (commits.length === 0) {
    return (
      <div className="text-center py-8 text-xs" style={{ color: "var(--text-muted)" }}>
        {t('git.noCommitHistory')}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {commits.map((commit) => (
        <div
          key={commit.hash}
          className="p-3 rounded"
          style={{ backgroundColor: "var(--bg-secondary)" }}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>
                {commit.message}
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                <span className="font-mono">{commit.short_hash}</span>
                <span>{commit.author}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (confirm(t('git.confirmRollback') + `"${commit.short_hash}"?`)) {
                    // Show mode selection
                    const mode = confirm(t('git.useHardRollback')) ? "hard" : "mixed";
                    onReset(commit.hash, mode)
                      .then(() => {
                        showToast(t('git.rollbackSuccess'), "success");
                        // Reload history
                        window.location.reload();
                      })
                      .catch((e) => {
                        showToast(`${t('git.rollbackFailed')}: ${e}`, "error");
                      });
                  }
                }}
                className="px-2 py-1 text-[10px] rounded"
                style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-muted)" }}
                title={t('git.rollbackToThisCommit')}
              >
                {t('git.rollback')}
              </button>
              <button
                onClick={() => {
                  if (confirm(t('git.confirmRevert') + `"${commit.short_hash}"?\n\n${t('git.revertThisCommit')}`)) {
                    onRevert(commit.hash)
                      .then(() => {
                        showToast(t('git.revertSuccess'), "success");
                        window.location.reload();
                      })
                      .catch((e) => {
                        showToast(`${t('git.revertFailed')}: ${e}`, "error");
                      });
                  }
                }}
                className="px-2 py-1 text-[10px] rounded"
                style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-muted)" }}
                title={t('git.revertThisCommit')}
              >
                {t('git.revert')}
              </button>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                {formatTime(commit.timestamp)}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function BranchesTab({
  branches,
  onCheckout,
  onCreateBranch,
}: {
  branches: Branch[];
  onCheckout: (branch: string) => void;
  onCreateBranch: (branchName: string) => void;
}) {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);

  const [newBranchName, setNewBranchName] = useState("");

  const handleCreate = () => {
    if (newBranchName.trim()) {
      onCreateBranch(newBranchName.trim());
      setNewBranchName("");
    }
  };

  return (
    <div className="space-y-4">
      {/* Create branch input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newBranchName}
          onChange={(e) => setNewBranchName(e.target.value)}
          placeholder={t('git.newBranchNamePlaceholder')}
          className="flex-1 px-2 py-1.5 rounded text-xs"
          style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        />
        <button
          onClick={handleCreate}
          disabled={!newBranchName.trim()}
          className="px-3 py-1.5 rounded text-xs"
          style={{ backgroundColor: "var(--accent)", color: "var(--text-inverse)", opacity: newBranchName.trim() ? 1 : 0.5 }}
        >
          {t('git.createBranch')}
        </button>
      </div>

      {/* Branch list */}
      {branches.length === 0 ? (
        <div className="text-center py-4 text-xs" style={{ color: "var(--text-muted)" }}>
          {t('git.noBranches')}
        </div>
      ) : (
        <div className="space-y-1">
          {branches.map((branch) => (
            <div
              key={branch.name}
              className="flex items-center justify-between p-2 rounded text-xs cursor-pointer"
              style={{
                backgroundColor: branch.current ? "var(--accent-muted)" : "var(--bg-secondary)",
                color: "var(--text-primary)",
              }}
              onClick={() => !branch.current && onCheckout(branch.name)}
            >
              <div className="flex items-center gap-2">
                <span style={{ color: "var(--text-muted)" }}>
                  {branch.remote ? "🌐" : "📌"}
                </span>
                <span>{branch.name}</span>
                {branch.current && (
                  <span
                    className="px-1.5 py-0.5 rounded text-xs"
                    style={{ backgroundColor: "var(--accent)", color: "var(--text-inverse)" }}
                  >
                    {t('git.current')}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}