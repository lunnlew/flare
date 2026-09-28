import type { ImportConfig } from "../../types/api";
import { formatDate } from "../../utils/text";
import { useSettingsStore } from "../../store";
import { useTranslation } from "../../utils/i18n";
export type { ImportConfig } from "../../types/api";

interface ConfigListProps {
  configs: ImportConfig[];
  syncing: string | null;
  onSync: (config: ImportConfig) => void;
  onDelete: (config: ImportConfig) => void;
}

export function ConfigList({ configs, syncing, onSync, onDelete }: ConfigListProps) {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);

  if (configs.length === 0) {
    return (
      <div className="text-center py-6" style={{ color: 'var(--text-muted)' }}>
        <div className="text-xs">{t('import.noConfig')}</div>
        <div className="text-xs mt-1">{t('import.createConfigToEnable')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {configs.map((config) => (
        <div key={config.id} className="p-3 rounded" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{config.name}</div>
              <div className="text-[10px] truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>{config.url}</div>
              <div className="flex items-center gap-3 mt-1.5 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                {config.sync_interval_minutes > 0 ? (
                  <span>{t('import.everyMinutes').replace('{count}', String(config.sync_interval_minutes))}</span>
                ) : (
                  <span>{t('import.manualSync')}</span>
                )}
                {config.last_sync && (
                  <span>{t('import.lastSync').replace('{date}', formatDate(config.last_sync))}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 ml-2">
              <button
                onClick={() => onSync(config)}
                disabled={syncing === config.id}
                className="px-2 py-1 rounded text-[10px]"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}
              >
                {syncing === config.id ? t('import.syncing') : t('import.sync')}
              </button>
              <button
                onClick={() => onDelete(config)}
                className="px-2 py-1 rounded text-[10px]"
                style={{ backgroundColor: 'rgba(248,113,113,0.15)', color: 'var(--danger)' }}
              >
                {t('import.delete')}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
