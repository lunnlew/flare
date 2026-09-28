/**
 * AuditLogPanel - 审计日志面板
 *
 * 显示操作审计日志，支持筛选和导出
 */

import { useState, useMemo } from "react";
import { useAuditStore, useAuditCategories, getActionLabel, type AuditAction, type AuditEntry } from "../../store/auditStore";
import { useNotificationStore, useSettingsStore } from "../../store";
import { toast } from "../../store/notificationStore";
import { useTranslation } from "../../utils/i18n";

const ACTION_COLORS: Record<AuditAction, string> = {
  REQUEST_SEND: 'var(--accent)',
  REQUEST_SAVE: 'var(--success)',
  REQUEST_DELETE: 'var(--danger)',
  REQUEST_UPDATE: 'var(--warning)',
  ENV_CREATE: 'var(--success)',
  ENV_UPDATE: 'var(--warning)',
  ENV_DELETE: 'var(--danger)',
  COLLECTION_CREATE: 'var(--success)',
  COLLECTION_DELETE: 'var(--danger)',
  COLLECTION_UPDATE: 'var(--warning)',
  FLOW_SAVE: 'var(--success)',
  FLOW_DELETE: 'var(--danger)',
  FLOW_EXECUTE: 'var(--accent)',
  MOCK_GENERATE: 'var(--accent)',
  SETTINGS_UPDATE: 'var(--warning)',
  OAUTH_CONNECT: 'var(--success)',
  OAUTH_DISCONNECT: 'var(--text-muted)',
};

export function AuditLogPanel() {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);

  const { entries, query, clear, exportLogs } = useAuditStore();
  const categories = useAuditCategories();
  const showDialog = useNotificationStore((s) => s.showDialog);

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchText, setSearchText] = useState('');
  const [showExportDialog, setShowExportDialog] = useState(false);

  //筛选后的日志
  const filteredEntries = useMemo(() => {
    let actions: AuditAction[] | undefined;
    if (selectedCategory !== 'all') {
      actions = categories[selectedCategory];
    }

    return query({
      actions,
      searchText: searchText || undefined,
    });
  }, [entries, selectedCategory, searchText, query]);

  // 按日期分组
  const groupedEntries = useMemo(() => {
    const groups: Record<string, AuditEntry[]> = {};
    filteredEntries.forEach((entry) => {
      const date = entry.timestamp.split('T')[0];
      if (!groups[date]) groups[date] = [];
      groups[date].push(entry);
    });
    return groups;
  }, [filteredEntries]);

  const handleClearLogs = () => {
    showDialog({
      title: t('audit.clearConfirmTitle'),
      message: t('audit.clearConfirmMessage'),
      confirmText: t('audit.confirmClear'),
      destructive: true,
      onConfirm: () => {
        clear();
        toast.success(t('audit.cleared'));
      },
    });
  };

  const handleExport = () => {
    const data = exportLogs();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportDialog(false);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-color)' }}>
        <div>
          <h1 className="text-base font-semibold">{t('audit.operationAuditLog')}</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {t('audit.recordCount', { count: entries.length })}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowExportDialog(true)}
            className="px-3 py-1.5 rounded text-xs"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
          >
            {t('audit.export')}
          </button>
          <button
            onClick={handleClearLogs}
            className="px-3 py-1.5 rounded text-xs"
            style={{ backgroundColor: 'var(--danger)', color: 'var(--text-inverse)' }}
          >
            {t('audit.clear')}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 border-b space-y-3" style={{ borderColor: 'var(--border-color)' }}>
        {/* 分类筛选 */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className="px-2 py-1 rounded text-xs"
            style={selectedCategory === 'all'
              ? { backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }
              : { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }
            }
          >
           {t('audit.all')}
          </button>
          {Object.keys(categories).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className="px-2 py-1 rounded text-xs"
              style={selectedCategory === cat
                ? { backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }
                : { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }
              }
            >
              {cat}
            </button>
          ))}
        </div>

        {/* 搜索框 */}
        <input
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder={t('audit.searchPlaceholder')}
          className="w-full px-3 py-1.5 rounded text-xs"
          style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
        />
      </div>

      {/* Log List */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredEntries.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('audit.noAuditLogs')}</div>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedEntries).map(([date, dayEntries]) => (
              <div key={date}>
                {/* 日期标题 */}
                <div className="text-xs font-medium mb-2 px-2" style={{ color: 'var(--text-muted)' }}>
                  {date}
                </div>

                {/* 当日记录 */}
                <div className="space-y-1">
                  {dayEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-start gap-3 p-2 rounded"
                      style={{ backgroundColor: 'var(--bg-secondary)' }}
                    >
                      {/* 时间 */}
                      <span className="text-xs font-mono shrink-0" style={{ color: 'var(--text-muted)' }}>
                        {formatTime(entry.timestamp)}
                      </span>

                      {/* 操作类型标签 */}
                      <span
                        className="px-1.5 py-0.5 rounded text-[10px] shrink-0"
                        style={{ backgroundColor: ACTION_COLORS[entry.action], color: 'var(--text-inverse)' }}
                      >
                        {getActionLabel(entry.action)}
                      </span>

                      {/* 描述 */}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs truncate">{entry.description}</div>
                        {entry.details && (
                          <div className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                            {Object.entries(entry.details).map(([k, v]) => `${k}: ${v}`).join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Export Dialog */}
      {showExportDialog && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="p-4 rounded-lg max-w-md w-full mx-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
            <h2 className="text-base font-semibold mb-3">{t('audit.exportTitle')}</h2>
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
              {t('audit.exportMessage', { count: entries.length })}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowExportDialog(false)}
                className="px-3 py-1.5 rounded text-xs"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
              >
                {t('audit.cancel')}
              </button>
              <button
                onClick={handleExport}
                className="px-3 py-1.5 rounded text-xs"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}
              >
                {t('audit.export')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}