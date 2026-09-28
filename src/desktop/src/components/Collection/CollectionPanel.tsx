import type { RequestCollection } from "../../types/api";
export type { RequestCollection } from "../../types/api";
import { useNotificationStore } from "../../store/notificationStore";
import { useSettingsStore } from "../../store";
import { useTranslation } from "../../utils/i18n";

interface CollectionPanelProps {
  collections: RequestCollection[];
  collectionImportText: string;
  onSetCollectionImportText: (text: string) => void;
  onDuplicateCollection?: (id: string) => void;
  onExportPostman?: () => string;
  onExportOpenApi?: () => string;
  onExportHar?: () => string;
  onImportCollection?: (json: string) => boolean;
}

export function CollectionPanel({
  collections,
  collectionImportText,
  onSetCollectionImportText,
  onDuplicateCollection,
  onExportPostman,
  onExportOpenApi,
  onExportHar,
  onImportCollection
}: CollectionPanelProps) {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);
  const { showToast } = useNotificationStore();

  return (
    <div className="space-y-3">
      {/* Collection List with Duplicate */}
      {collections.length > 0 && (
        <div className="p-3 rounded" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
          <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-primary)' }}>{t('collection.operations')}</div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {collections.map(col => (
              <div key={col.id} className="flex items-center justify-between px-2 py-1.5 rounded" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <span className="text-xs" style={{ color: 'var(--text-primary)' }}>{col.name} ({(col.requests || []).length})</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => onDuplicateCollection?.(col.id)}
                    className="px-2 py-0.5 rounded text-[10px]"
                    style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
                  >
                    {t('collection.duplicate')}
                  </button>
                  <button
                    onClick={() => {
                      if (onExportPostman) {
                        const json = onExportPostman();
                        const blob = new Blob([json], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${col.name}.postman_collection.json`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }
                    }}
                    className="px-2 py-0.5 rounded text-[10px]"
                    style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
                  >
                    {t('collection.export')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="p-3 rounded" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
        <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-primary)' }}>{t('collection.exportCollection')}</div>
        <div className="flex gap-2">
          <button
            onClick={() => { if (onExportPostman) { const json = onExportPostman(); navigator.clipboard.writeText(json); showToast(t('collection.copiedToClipboard'), 'success'); } }}
            className="px-3 py-1.5 rounded text-xs"
            style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
          >
            {t('collection.copyPostmanJson')}
          </button>
          <button
            onClick={() => { if (onExportOpenApi) { const json = onExportOpenApi(); navigator.clipboard.writeText(json); showToast(t('collection.copiedToClipboard'), 'success'); } }}
            className="px-3 py-1.5 rounded text-xs"
            style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
          >
            {t('collection.copyOpenApiJson')}
          </button>
          <button
            onClick={() => { if (onExportHar) { const json = onExportHar(); navigator.clipboard.writeText(json); showToast(t('collection.copiedToClipboard'), 'success'); } }}
            className="px-3 py-1.5 rounded text-xs"
            style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
          >
            {t('collection.copyHarJson')}
          </button>
        </div>
      </div>
      <div className="p-3 rounded" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
        <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-primary)' }}>{t('collection.importFromFile')}</div>
        <div className="flex gap-2">
          <input
            type="file"
            id="collection-file-import"
            className="hidden"
            accept=".json"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = ev => {
                  const text = ev.target?.result as string;
                  if (text && onImportCollection) {
                    if (onImportCollection(text)) {
                      showToast(t('collection.importSuccess'), 'success');
                    } else {
                      showToast(t('collection.checkJsonFormat'), 'error');
                    }
                  }
                };
                reader.readAsText(file);
              }
            }}
          />
          <label
            htmlFor="collection-file-import"
            className="px-3 py-1.5 rounded text-xs cursor-pointer"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}
          >
            {t('collection.selectJsonFile')}
          </label>
        </div>
      </div>
      <div className="p-3 rounded" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
        <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-primary)' }}>{t('collection.importFromClipboard')}</div>
        <textarea
          value={collectionImportText}
          onChange={(e) => onSetCollectionImportText(e.target.value)}
          placeholder={t('collection.pasteJson')}
          className="w-full h-24 px-3 py-2 rounded text-xs font-mono resize-none"
          style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
        />
        <button
          onClick={() => {
            if (collectionImportText && onImportCollection) {
              if (onImportCollection(collectionImportText)) {
                onSetCollectionImportText("");
                showToast(t('collection.importSuccess'), 'success');
              } else {
                showToast(t('collection.checkJsonFormat'), 'error');
              }
            }
          }}
          className="mt-2 px-3 py-1.5 rounded text-xs"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}
        >
          {t('collection.import')}
        </button>
      </div>
    </div>
  );
}
