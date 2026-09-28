/**
 * MockServerPanel - Mock Server 控制面板
 *
 * 提供本地 HTTP Mock Server 的启动/停止控制和规则配置
 */

import { useState, useEffect, useCallback } from "react";
import {
  getMockServerStatus,
  startMockServer,
  stopMockServer,
  getMockRules,
  addMockRule,
  updateMockRule,
  deleteMockRule,
  getMockRequestLogs,
  clearMockRequestLogs,
  type MockServerStatus,
  type MockRule,
  type MockRequestLog,
} from "../../services/api";
import { useNotificationStore, toast } from "../../store/notificationStore";
import { useEnvironmentStore, useSettingsStore } from "../../store";
import { useTranslation } from "../../utils/i18n";

export function MockServerPanel() {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);

  const [status, setStatus] = useState<MockServerStatus | null>(null);
  const [rules, setRules] = useState<MockRule[]>([]);
  const [requestLogs, setRequestLogs] = useState<MockRequestLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [port, setPort] = useState(9999);
  const { showToast } = useNotificationStore();

  // Load status and rules on mount
  const loadStatus = useCallback(async () => {
    try {
      const s = await getMockServerStatus();
      setStatus(s);
    } catch (e) {
      toast.error(t('mock.loadStatusFailed'));
    }
  }, []);

  const loadRules = useCallback(async () => {
    try {
      const r = await getMockRules();
      setRules(r);
    } catch (e) {
      toast.error(t('mock.loadRulesFailed'));
    }
  }, []);

  const loadRequestLogs = useCallback(async () => {
    try {
      const logs = await getMockRequestLogs();
      setRequestLogs(logs);
    } catch (e) {
      console.warn('[MockServer] Failed to load request logs:', e);
    }
  }, []);

  useEffect(() => {
    loadStatus();
    loadRules();
    loadRequestLogs();
  }, [loadStatus, loadRules, loadRequestLogs]);

  // Poll for request logs when server is running
  useEffect(() => {
    if (!status?.running) return;
    const interval = setInterval(loadRequestLogs, 2000);
    return () => clearInterval(interval);
  }, [status?.running, loadRequestLogs]);

  const handleStartServer = useCallback(async () => {
    if (port < 1024 || port > 65535) {
      showToast(t('mock.portRangeError'), "error");
      return;
    }
    setLoading(true);
    try {
      const s = await startMockServer(port);
      setStatus(s);
      // Reload environment config to sync Mock environment
      useEnvironmentStore.getState().loadEnvironments();
      showToast(t('mock.startedOnPort', { port }), "success");
    } catch (e) {
      showToast(t('mock.startFailed', { error: String(e) }), "error");
    } finally {
      setLoading(false);
    }
  }, [port, showToast]);

  const handleStopServer = useCallback(async () => {
    setLoading(true);
    try {
      await stopMockServer();
      setStatus((s) => s ? { ...s, running: false, port: 0 } : null);
      // Reload environment config to remove Mock environment
      useEnvironmentStore.getState().loadEnvironments();
      showToast(t('mock.stopped'), "success");
    } catch (e) {
      showToast(t('mock.stopFailed', { error: String(e) }), "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const handleAddRule = useCallback(async () => {
    const newRule: MockRule = {
      id: `mock_${Date.now()}`,
      name: t('mock.newRule'),
      enabled: true,
      trigger: {
        pathPattern: "",
        method: [],
      },
      response: {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        bodyTemplate: '{"message": "Hello from mock"}',
        delayMs: 0,
      },
      locale: 'zh-CN', // Default to Chinese locale for template processing
    };
    try {
      await addMockRule(newRule);
      await loadRules();
      showToast(t('mock.ruleAdded'), "success");
    } catch (e) {
      showToast(t('mock.ruleAddFailed', { error: String(e) }), "error");
    }
  }, [loadRules, showToast]);

  const handleDeleteRule = useCallback(async (id: string) => {
    try {
      await deleteMockRule(id);
      await loadRules();
      showToast(t('mock.ruleDeleted'), "success");
    } catch (e) {
      showToast(t('mock.ruleDeleteFailed', { error: String(e) }), "error");
    }
  }, [loadRules, showToast]);

  const handleToggleRule = useCallback(async (rule: MockRule) => {
    const updated = { ...rule, enabled: !rule.enabled };
    try {
      await updateMockRule(updated);
      await loadRules();
    } catch (e) {
      showToast(t('mock.ruleUpdateFailed', { error: String(e) }), "error");
    }
  }, [loadRules, showToast]);

  const handleClearLogs = useCallback(async () => {
    try {
      await clearMockRequestLogs();
      setRequestLogs([]);
      showToast(t('mock.requestLogCleared'), "success");
    } catch (e) {
      showToast(t('mock.requestLogClearFailed', { error: String(e) }), "error");
    }
  }, [showToast]);

  return (
    <div className="space-y-4">
      {/* Server Status Section */}
      <div className="p-4 rounded border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-medium flex items-center gap-2">
              <span>🚀</span>
              <span>Mock Server</span>
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {t('mock.serverDescription')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: status?.running ? 'var(--success)' : 'var(--text-muted)' }}
            />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {status?.running ? t('mock.runningOnPort', { port: status.port }) : t('mock.stopped')}
            </span>
          </div>
        </div>

        {/* Port Configuration */}
        <div className="flex items-center gap-2 mb-3">
          <label className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('mock.port')}</label>
          <input
            type="number"
            value={port}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val) && val >= 1024 && val <= 65535) {
                setPort(val);
              }
            }}
            disabled={status?.running}
            className="px-2 py-1 rounded text-xs w-20"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
            min={1024}
            max={65535}
          />
          {status?.running ? (
            <button
              onClick={handleStopServer}
              disabled={loading}
              className="px-3 py-1 rounded text-xs"
              style={{ backgroundColor: 'var(--danger)', color: 'var(--text-inverse)' }}
            >
              {loading ? t('mock.stopping') : t('mock.stop')}
            </button>
          ) : (
            <button
              onClick={handleStartServer}
              disabled={loading}
              className="px-3 py-1 rounded text-xs"
              style={{ backgroundColor: 'var(--success)', color: 'var(--text-inverse)' }}
            >
              {loading ? t('mock.starting') : t('mock.start')}
            </button>
          )}
        </div>

        {/* Stats */}
        {status && (
          <div className="flex gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span>{t('mock.rules')} {status.rulesCount}</span>
            <span>{t('mock.requests')} {status.requestCount}</span>
          </div>
        )}
      </div>

      {/* Rules Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <span>📋</span>
            <span>{t('mock.mockRules')}</span>
            <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
              {rules.length}
            </span>
          </h3>
          <button
            onClick={handleAddRule}
            disabled={!status?.running}
            className="px-3 py-1 rounded text-xs"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)', opacity: status?.running ? 1 : 0.5 }}
          >
            {t('mock.addRule')}
          </button>
        </div>

        {!status?.running && (
          <div className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>
            {t('mock.addRuleHint')}
          </div>
        )}

        {rules.length === 0 && status?.running && (
          <div className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>
            {t('mock.noRules')}
          </div>
        )}

        <div className="space-y-2">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="p-3 rounded border"
              style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleRule(rule)}
                    className="w-4 h-4 rounded flex items-center justify-center text-xs"
                    style={{
                      backgroundColor: rule.enabled ? 'var(--success)' : 'var(--bg-tertiary)',
                      color: rule.enabled ? 'var(--text-inverse)' : 'var(--text-muted)',
                    }}
                  >
                    {rule.enabled ? '✓' : '✕'}
                  </button>
                  <span className="text-sm font-medium">{rule.name}</span>
                </div>
                <button
                  onClick={() => handleDeleteRule(rule.id)}
                  className="px-2 py-0.5 rounded text-xs"
                  style={{ backgroundColor: 'var(--danger)', color: 'var(--text-inverse)' }}
                >
                  {t('mock.delete')}
                </button>
              </div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {rule.trigger.method?.join(' | ') || t('mock.allMethods')} {rule.trigger.pathPattern || t('mock.anyPath')}
              </div>
              <div className="text-xs mt-1" style={{ color: 'var(--accent)' }}>
                → {rule.response.statusCode} {rule.response.delayMs > 0 ? `(+${rule.response.delayMs}ms)` : ''}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Request Logs Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <span>📥</span>
            <span>{t('mock.requestLog')}</span>
            <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
              {requestLogs.length}
            </span>
          </h3>
          {requestLogs.length > 0 && (
            <button
              onClick={handleClearLogs}
              className="px-3 py-1 rounded text-xs"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
            >
              {t('mock.clearLog')}
            </button>
          )}
        </div>

        {!status?.running && (
          <div className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>
            {t('mock.viewLogHint')}
          </div>
        )}

        {status?.running && requestLogs.length === 0 && (
          <div className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>
            {t('mock.noRequestLog')}
          </div>
        )}

        <div className="space-y-1 max-h-64 overflow-y-auto">
          {requestLogs.slice().reverse().map((log, idx) => (
            <div
              key={`${log.timestamp}-${idx}`}
              className="p-2 rounded text-xs flex items-center gap-3"
              style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
            >
              <span className="font-mono px-1.5 py-0.5 rounded" style={{
                backgroundColor: log.response_status >= 200 && log.response_status < 300 ? 'var(--success)' : 'var(--danger)',
                color: 'var(--text-inverse)',
              }}>
                {log.response_status}
              </span>
              <span className="font-mono" style={{ color: 'var(--accent)' }}>{log.method}</span>
              <span className="font-mono truncate flex-1" style={{ color: 'var(--text-primary)' }}>{log.path}</span>
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{log.response_time_ms}ms</span>
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Usage Instructions */}
      <div className="p-3 rounded border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
        <h4 className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>{t('mock.usageInstructions')}</h4>
        <ol className="text-xs space-y-1" style={{ color: 'var(--text-muted)', listStyle: 'decimal', paddingLeft: '1rem' }}>
          <li>{t('mock.startServerAndNotePort')}</li>
          <li>{t('mock.useLocalhostPrefix', { port })}</li>
          <li>{t('mock.addMatchingRules')}</li>
          <li>{t('mock.mockServerIntercepts')}</li>
        </ol>
      </div>
    </div>
  );
}