/**
 * ExecutionLogPanel - Displays workflow execution logs with expandable sections
 */
import { memo, useState } from 'react';
import { useFlowStore, useSettingsStore } from '../../../store';
import { LOG_LEVEL_COLORS, TEXT_MUTED_STYLE, BG_TERTIARY_STYLE, EXECUTION_STATUS_COLORS } from '../FlowCanvas.constants';
import { useTranslation } from '../../../utils/i18n';
import type { ExecutionLog } from '../FlowExecutionEngine';

type SectionKey = 'info' | 'logs' | 'results';

interface ExecutionLogPanelProps {
  executionOrderPreview?: string[];
  nodeStatuses?: Record<string, string>;
}

export const ExecutionLogPanel = memo(function ExecutionLogPanel({
  executionOrderPreview = [],
  nodeStatuses = {},
}: ExecutionLogPanelProps) {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);

  const executionLog = useFlowStore((s) => s.executionLog);
  const setExecutionLog = useFlowStore((s) => s.setExecutionLog);
  const executionStatus = useFlowStore((s) => s.executionStatus);
  const workflowResult = useFlowStore((s) => s.workflowResult);

  const [collapsed, setCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<SectionKey>>(new Set(['info']));

  const toggleSection = (section: SectionKey) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const hasInfo = executionOrderPreview.length > 0;
  const hasLogs = executionLog.length > 0;
  const hasResults = workflowResult !== null;

  if (!hasInfo && !hasLogs && !hasResults) return null;

  // Collapsed state - show minimal bar
  if (collapsed) {
    return (
      <button
        type="button"
        className="rounded-lg px-2 py-1 cursor-pointer"
        style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
        onClick={() => setCollapsed(false)}
        title="Click to expand"
        aria-label="Expand execution logs"
      >
        <span className="text-xs" style={TEXT_MUTED_STYLE}>
          ▼ Logs {executionLog.length > 0 && `(${executionLog.length})`}
        </span>
      </button>
    );
  }

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-2 py-1.5"
        style={{ backgroundColor: 'var(--bg-tertiary)' }}
      >
        <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
          {t('flow.executionInfo')}
        </span>
        <div className="flex items-center gap-2">
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{ backgroundColor: EXECUTION_STATUS_COLORS[executionStatus as keyof typeof EXECUTION_STATUS_COLORS] || 'var(--bg-tertiary)', color: 'var(--text-inverse)' }}
          >
            {executionStatus}
          </span>
          <button
            onClick={() => setCollapsed(true)}
            className="text-xs px-1 rounded"
            style={TEXT_MUTED_STYLE}
            title={t('flow.collapse')}
          >
            ▲
          </button>
        </div>
      </div>

      {/* Expandable Sections */}
      <div className="text-xs">
        {/* Info Section */}
        {hasInfo && (
          <div>
            <button
              onClick={() => toggleSection('info')}
              className="w-full flex items-center justify-between px-2 py-1.5 hover:opacity-80"
              style={{ backgroundColor: expandedSections.has('info') ? 'var(--bg-primary)' : 'transparent', color: 'var(--text-primary)' }}
            >
              <span>📋 {t('flow.executionOrder')} ({executionOrderPreview.length})</span>
              <span style={{ transform: expandedSections.has('info') ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>▼</span>
            </button>
            {expandedSections.has('info') && (
              <div className="px-2 pb-2">
                <div className="flex flex-wrap gap-1">
                  {executionOrderPreview.map((nodeId, index) => (
                    <span
                      key={nodeId}
                      className="px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: nodeStatuses[nodeId] ? 'var(--success)' : 'var(--bg-tertiary)',
                        color: "var(--text-inverse)",
                      }}
                      title={nodeId}
                    >
                      {index + 1}. {nodeId.split('_')[0]}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Logs Section */}
        {hasLogs && (
          <div>
            <button
              onClick={() => toggleSection('logs')}
              className="w-full flex items-center justify-between px-2 py-1.5 hover:opacity-80"
              style={{ backgroundColor: expandedSections.has('logs') ? 'var(--bg-primary)' : 'transparent', color: 'var(--text-primary)' }}
            >
              <span>📝 {t('flow.logs')} ({executionLog.length})</span>
              <span style={{ transform: expandedSections.has('logs') ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>▼</span>
            </button>
            {expandedSections.has('logs') && (
              <div className="px-2 pb-2 max-h-32 overflow-y-auto">
                <div className="flex flex-wrap gap-1 mb-1">
                  <button
                    onClick={() => setExecutionLog([])}
                    className="text-xs px-1.5 py-0.5 rounded"
                    style={BG_TERTIARY_STYLE}
                  >
                    {t('flow.clear')}
                  </button>
                </div>
                <div className="space-y-0.5 font-mono">
                  {executionLog.map((log: ExecutionLog, i: number) => (
                    <div
                      key={i}
                      className="truncate"
                      style={{
                        color: LOG_LEVEL_COLORS[log.level as keyof typeof LOG_LEVEL_COLORS] || LOG_LEVEL_COLORS.info,
                      }}
                      title={`${log.nodeName}: ${log.message}`}
                    >
                      [{new Date(log.timestamp).toLocaleTimeString()}] {log.nodeName}: {log.message}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Results Section */}
        {hasResults && (
          <div>
            <button
              onClick={() => toggleSection('results')}
              className="w-full flex items-center justify-between px-2 py-1.5 hover:opacity-80"
              style={{ backgroundColor: expandedSections.has('results') ? 'var(--bg-primary)' : 'transparent', color: 'var(--text-primary)' }}
            >
              <span>📊 {t('flow.results')}</span>
              <span style={{ transform: expandedSections.has('results') ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>▼</span>
            </button>
            {expandedSections.has('results') && (
              <div className="px-2 pb-2">
                {workflowResult ? (
                  <div>
                    <div
                      className="mb-1"
                      style={{ color: workflowResult.success ? 'var(--success)' : 'var(--danger)' }}
                    >
                      {workflowResult.success ? `✓ ${t('flow.success')}` : `✗ ${t('flow.failure')}`}
                    </div>
                    <div style={TEXT_MUTED_STYLE}>
                      {workflowResult.results ? Object.keys(workflowResult.results).length : 0} {t('flow.resultCount')}
                    </div>
                  </div>
                ) : (
                  <div style={TEXT_MUTED_STYLE}>{t('flow.noResults')}</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});