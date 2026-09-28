import { useState, useMemo, useEffect } from "react";
import type { ResponseData, HistoryItem } from "../../types/api";
import { getStatusColor, isSuccess } from "../../utils/RequestUtils";
import { useResponseStore, useRequestStore, useNotificationStore, useSettingsStore } from "../../store";
import { ContextMenu } from "../Common/ContextMenu";
import { highlightText, formatDate } from "../../utils/text";
import { useTranslation } from "../../utils/i18n";

export function HistoryPanel() {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);
  const setCompareResponse = useResponseStore((s) => s.setCompareResponse);
  const setResponse = useResponseStore((s) => s.setResponse);
  const setResponseHistory = useResponseStore((s) => s.setResponseHistory);
  const focusedId = useResponseStore((s) => s.historyFocusedId);
  const setHistoryFocusedId = useResponseStore((s) => s.setHistoryFocusedId);
  const favoritesOnly = useResponseStore((s) => s.favoritesOnly);
  const setFavoritesOnly = useResponseStore((s) => s.setFavoritesOnly);
   const backendHistory = useRequestStore((s) => s.backendHistory);
  const loadBackendHistory = useRequestStore((s) => s.loadBackendHistory);
  const deleteBackendHistory = useRequestStore((s) => s.deleteBackendHistory);
  const clearBackendHistory = useRequestStore((s) => s.clearBackendHistory);
  const responseHistory = useResponseStore((s) => s.responseHistory);
  const isLoadingHistory = useRequestStore((s) => s.isLoadingHistory);
  const currentEndpointId = useRequestStore((s) => s.currentEndpointId);

  // Load history when endpoint changes
  useEffect(() => {
    if (currentEndpointId) {
      loadBackendHistory(currentEndpointId);
    }
  }, [currentEndpointId, loadBackendHistory]);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  // Sort state
  const [sortOrder, setSortOrder] = useState<'time' | 'status' | 'duration'>('time');
  // Selection state for batch delete
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: HistoryItem | ResponseData } | null>(null);

  // Dialog
  const showDialog = useNotificationStore((s) => s.showDialog);

  // Toggle favorite
  const toggleFavorite = useResponseStore((s) => s.toggleFavorite);

  // Convert HistoryItem to ResponseData
  const convertToResponseData = (item: HistoryItem): ResponseData => ({
    id: item.id,
    status: item.status,
    statusText: item.status_text,
    body: item.body,
    headers: item.headers,
    time: item.time,
    endpointId: item.endpointId,
  });

  const handleLoadHistory = (item: HistoryItem | ResponseData) => {
    if ('statusText' in item) {
      setResponse(item);
    } else {
      setResponse(convertToResponseData(item));
    }
    setCompareResponse(null);
    setHistoryFocusedId(item.id);
  };

  // Selection handlers
  const toggleSelect = (id: string, e: React.MouseEvent | React.ChangeEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredHistory.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredHistory.map(item => item.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;

    showDialog({
      title: t('history.deleteHistory'),
      message: `${t('history.deleteSelected')} ${selectedIds.size} ${t('history.confirmDelete')}`,
      confirmText: t('history.delete'),
      destructive: true,
      onConfirm: async () => {
        await deleteBackendHistory(Array.from(selectedIds));
        // Also remove from responseHistory
        setResponseHistory(history => history.filter(r => !selectedIds.has(r.id)));
        setSelectedIds(new Set());
      },
    });
  };

  const handleClearAll = async () => {
    if (backendHistory.length === 0) return;

    showDialog({
      title: t('history.clearHistory'),
      message: `${t('history.confirmClear')} ${backendHistory.length} ${t('history.confirmDelete')}${t('history.confirmDelete')}`,
      confirmText: t('history.clear'),
      destructive: true,
      onConfirm: async () => {
        await clearBackendHistory();
        setResponseHistory([]);
        setSelectedIds(new Set());
      },
    });
  };

  // Filter and sort history
  const filteredHistory = useMemo(() => {
    // When favoritesOnly, use responseHistory which has isFavorite
    // Otherwise use backendHistory
    const sourceData = favoritesOnly ? responseHistory : backendHistory;

    let result = favoritesOnly
      ? (sourceData as ResponseData[]).filter(item => item.isFavorite)
      : [...sourceData] as (HistoryItem | ResponseData)[];

    // Apply search filter if needed
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item => {
        const bodyMatch = item.body?.toLowerCase().includes(query);
        const statusMatch = item.status.toString().includes(query);
        const statusTextMatch = 'statusText' in item ? item.statusText?.toLowerCase().includes(query) : ('status_text' in item ? (item as HistoryItem).status_text?.toLowerCase().includes(query) : false);
        const headersMatch = Object.keys(item.headers || {}).some(
          k => k.toLowerCase().includes(query) || String(item.headers[k]).toLowerCase().includes(query)
        );
        return bodyMatch || statusMatch || statusTextMatch || headersMatch;
      });
    }

    // Sort based on sortOrder
    const sorted = [...result].sort((a, b) => {
      if (sortOrder === 'status') {
        return b.status - a.status;
      } else if (sortOrder === 'duration') {
        return b.time - a.time;
      }
      return 0; // Keep original order (newest first)
    });

    return sorted;
  }, [backendHistory, responseHistory, searchQuery, sortOrder, favoritesOnly]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{t('history.title')}</span>
        <div className="flex items-center gap-2">
           <button
            onClick={() => loadBackendHistory(currentEndpointId || undefined)}
            className="text-[10px] px-2 py-1 rounded"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
            disabled={isLoadingHistory}
          >
            {isLoadingHistory ? t('history.loading') : `${t('history.refresh')} (${backendHistory.length})`}
          </button>
          <button
            onClick={() => setFavoritesOnly(!favoritesOnly)}
            className="text-[10px] px-2 py-1 rounded"
            style={{ backgroundColor: favoritesOnly ? 'var(--warning)' : 'var(--bg-tertiary)', color: favoritesOnly ? 'var(--text-inverse)' : 'var(--text-muted)' }}
            title={favoritesOnly ? t('history.showAll') : t('history.favoritesOnly')}
          >
            {favoritesOnly ? t('history.favoritesOnly') : t('history.favorite')}
          </button>
          {selectedIds.size > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="text-[10px] px-2 py-1 rounded"
              style={{ backgroundColor: 'var(--danger)', color: 'var(--text-inverse)' }}
            >
              {`${t('history.delete')} (${selectedIds.size})`}
            </button>
          )}
          {backendHistory.length > 0 && (
            <button
              onClick={handleClearAll}
              className="text-[10px] px-2 py-1 rounded"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--danger)' }}
            >
              {t('history.clear')}
            </button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder={t('history.searchPlaceholder')}
          className="w-full px-3 py-1.5 rounded text-xs"
          style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] px-1"
            style={{ color: 'var(--text-muted)' }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Sort Dropdown */}
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1 cursor-pointer">
          <input
            type="checkbox"
            checked={filteredHistory.length > 0 && selectedIds.size === filteredHistory.length}
            onChange={toggleSelectAll}
            className="w-3 h-3"
          />
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{t('history.selectAll')}</span>
        </label>
        <span className="text-[10px]" style={{ color: 'var(--border-color)' }}>|</span>
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{t('history.sort')}</span>
        <select
          value={sortOrder}
          onChange={e => setSortOrder(e.target.value as 'time' | 'status' | 'duration')}
          className="px-2 py-1 rounded text-[10px]"
          style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
        >
          <option value="time">{t('history.time')}</option>
          <option value="status">{t('history.status')}</option>
          <option value="duration">{t('history.duration')}</option>
        </select>
      </div>

      {filteredHistory.length === 0 ? (
        <div className="text-center py-8">
          {searchQuery ? (
            <>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('history.noMatch')}</div>
              <div className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>{t('history.tryOtherKeywords')}</div>
            </>
          ) : (
            <>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('history.noHistory')}</div>
              <div className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>{t('history.autoSave')}</div>
            </>
          )}
        </div>
      ) : (
        <div className="flex-1 space-y-2 overflow-y-auto" style={{ overflowX: 'hidden' }}>
          {filteredHistory.map((item) => (
            <div
              key={item.id}
              className="rounded-lg p-3 cursor-pointer transition-all"
              style={{
                backgroundColor: item.id === focusedId ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                border: item.id === focusedId ? '1px solid var(--accent)' : '1px solid var(--border-color)',
              }}
              onClick={() => handleLoadHistory(item)}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({ x: e.clientX, y: e.clientY, item });
              }}
            >
               <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(item.id)}
                    onChange={(e) => toggleSelect(item.id, e)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-3 h-3"
                  />
                  <span
                    className="w-12 text-center text-[10px] font-mono rounded py-0.5"
                    style={{
                      backgroundColor: isSuccess(item.status) ? 'var(--success)' : 'var(--danger)',
                      color: 'var(--text-inverse)'
                    }}
                  >
                    {isSuccess(item.status) ? t('history.success') : t('history.failed')}
                  </span>
                  <span className="text-xs font-mono" style={{ color: getStatusColor(item.status) }}>
                    {item.status} {highlightText('status_text' in item ? item.status_text : item.statusText, searchQuery)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{item.time}ms</span>
                  {'size' in item && (
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{(item.size / 1024).toFixed(1)}KB</span>
                  )}
                </div>
              </div>
              <div className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
                {highlightText(item.body.substring(0, 80), searchQuery)}...
              </div>
              {'created_at' in item && (
                 <div className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                  {formatDate(item.created_at)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={[
            { label: t('history.open'), value: 'open', icon: '📂' },
            { label: t('history.copyStatus'), value: 'copyStatus', icon: '📊' },
            { label: '', value: 'sep1', icon: '' },
            'isFavorite' in contextMenu.item ? (
              contextMenu.item.isFavorite ? (
                { label: t('history.unfavorite'), value: 'unfavorite', icon: '⭐' }
              ) : (
                { label: t('history.favorite'), value: 'favorite', icon: '☆' }
              )
            ) : null,
            { label: t('history.delete'), value: 'delete', icon: '🗑', danger: true },
            { label: t('history.deleteOthers'), value: 'deleteOthers', icon: '🗑', danger: true },
          ].filter(Boolean) as any}
          onSelect={(value) => {
            switch (value) {
              case 'open':
                handleLoadHistory(contextMenu.item);
                break;
              case 'favorite':
                if ('isFavorite' in contextMenu.item) {
                  toggleFavorite(contextMenu.item.id);
                }
                break;
              case 'unfavorite':
                if ('isFavorite' in contextMenu.item) {
                  toggleFavorite(contextMenu.item.id);
                }
                break;
              case 'delete':
                deleteBackendHistory([contextMenu.item.id]);
                // Also remove from responseHistory
                setResponseHistory(history => history.filter(r => r.id !== contextMenu.item.id));
                break;
              case 'deleteOthers':
                const otherIds = filteredHistory
                  .filter(h => h.id !== contextMenu.item.id)
                  .map(h => h.id);
                if (otherIds.length > 0) {
                  showDialog({
                    title: t('history.deleteHistory'),
                    message: `${t('history.confirmDeleteOthers')} ${otherIds.length} ${t('history.confirmDelete')}`,
                    confirmText: t('history.delete'),
                    destructive: true,
                    onConfirm: () => {
                      deleteBackendHistory(otherIds);
                      setResponseHistory(history => history.filter(r => !otherIds.includes(r.id)));
                    },
                  });
                }
                break;
              case 'copyStatus':
                if ('status' in contextMenu.item) {
                  navigator.clipboard.writeText(String(contextMenu.item.status));
                }
                break;
            }
            setContextMenu(null);
          }}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}