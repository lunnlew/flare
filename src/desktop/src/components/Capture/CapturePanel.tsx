import { useState } from 'react';
import { useCaptureStore } from '../../store/captureStore';
import { useSettingsStore } from '../../store';
import { useTranslation } from '../../utils/i18n';
import { CaptureItem } from './CaptureItem';
import type { CapturedRequest } from '../../types/capture';

interface Props {
  onSelectRequest: (request: CapturedRequest) => void;
  /** 默认 false - 在 Workspace 中使用时传入 true */
  compact?: boolean;
}

export function CapturePanel({ onSelectRequest, compact = false }: Props) {
  const { capturedRequests, connectedClients, clearCapturedRequests } = useCaptureStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);

  // 无数据时不显示（仅在非紧凑模式生效）
  if (!compact && capturedRequests.length === 0) {
    return null;
  }

  // 紧凑模式下折叠显示
  if (compact && isCollapsed) {
    return (
      <button
        className="w-full px-3 py-2 text-xs text-left flex items-center gap-2"
        style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
        onClick={() => setIsCollapsed(false)}
      >
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: connectedClients > 0 ? '#49cc90' : '#6b7280' }} />
       <span>{t('capture.capturedRequests')} ({capturedRequests.length})</span>
        <span className="ml-auto text-[10px]">{t('capture.clickToExpand')}</span>
      </button>
    );
  }

  if (compact) {
    return (
      <div className="border-b" style={{ borderColor: 'var(--border-color)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: connectedClients > 0 ? '#49cc90' : '#6b7280' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{t('capture.capturedRequests')}</span>
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{capturedRequests.length}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              className="px-1.5 py-0.5 text-[10px] rounded"
              style={{ color: 'var(--text-muted)' }}
              onClick={clearCapturedRequests}
              title={t('capture.clear')}
            >
              {t('capture.clear')}
            </button>
            <button
              className="px-1.5 py-0.5 text-[10px] rounded"
              style={{ color: 'var(--text-muted)' }}
              onClick={() => setIsCollapsed(true)}
              title={t('capture.collapse')}
            >
              ×
            </button>
          </div>
        </div>
        {/* Request List */}
        <div className="overflow-y-auto" style={{ maxHeight: '200px' }}>
          {capturedRequests.slice(0, 30).map((request) => (
            <CaptureItem key={request.id} request={request} onClick={onSelectRequest} compact />
          ))}
          {capturedRequests.length > 30 && (
            <div className="px-3 py-1 text-[10px] text-center" style={{ color: 'var(--text-muted)' }}>
              {t('capture.moreRequests').replace('{count}', String(capturedRequests.length - 30))}
            </div>
          )}
        </div>
      </div>
    );
  }

  //完整模式（默认）
  return (
    <div
      className="h-full flex flex-col shrink-0 border-r"
      style={{ width: '280px', borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{t('capture.capturedRequests')}</span>
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: connectedClients > 0 ? '#49cc90' : '#6b7280' }}
            title={connectedClients > 0 ? `${t('capture.connected')} (${connectedClients})` : t('capture.disconnected')}
          />
        </div>
        <div className="flex items-center gap-1">
          <button
            className="px-2 py-1 text-xs rounded hover:bg-opacity-20 hover:bg-gray-500"
            style={{ color: 'var(--text-muted)' }}
            onClick={clearCapturedRequests}
            title={t('capture.clear')}
          >
            {t('capture.clear')}
          </button>
          <button
            className="px-2 py-1 text-xs rounded hover:bg-opacity-20 hover:bg-gray-500"
            style={{ color: 'var(--text-muted)' }}
            onClick={() => setIsCollapsed(true)}
            title={t('capture.collapse')}
          >
            ×
          </button>
        </div>
      </div>

      {/* Request List */}
      <div className="flex-1 overflow-y-auto">
        {capturedRequests.length === 0 ? (
          <div className="p-4 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
            {t('capture.noCapturedRequests')}
          </div>
        ) : (
          capturedRequests.map((request) => (
            <CaptureItem key={request.id} request={request} onClick={onSelectRequest} />
          ))
        )}
      </div>
    </div>
  );
}