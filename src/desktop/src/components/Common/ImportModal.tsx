import { useState, useEffect } from "react";
import { AuthItemsForm, AuthItem, AuthLocation } from "./AuthItemsForm";
import { ConfigList } from "./ConfigList";
import { CollectionPanel, RequestCollection } from "../Collection/CollectionPanel";
import { useCollectionStore, useUIStore, useSettingsStore } from "../../store";
import { toast } from "../../store/notificationStore";
import { Spinner } from "./Spinner";
import { getErrorMessage } from "../../utils/string";
import { useTranslation } from "../../utils/i18n";
import type { ImportConfig as ImportConfigType } from "../../types/api";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
  onExportPostman?: () => string;
  onExportOpenApi?: () => string;
  onExportHar?: () => string;
  onImportCollection?: (json: string) => boolean;
  collections?: RequestCollection[];
  onDuplicateCollection?: (id: string) => void;
}

export function ImportModal({ isOpen, onClose, onImportComplete, onExportPostman, onExportOpenApi, onExportHar, onImportCollection, collections = [], onDuplicateCollection }: ImportModalProps) {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);

  // UI State from store
  const activeTab = useUIStore((s) => s.importModalActiveTab);
  const setActiveTab = useUIStore((s) => s.setImportModalActiveTab);
  const showForm = useUIStore((s) => s.importModalShowForm);
  const setShowForm = useUIStore((s) => s.setImportModalShowForm);
  const url = useUIStore((s) => s.importModalUrl);
  const setUrl = useUIStore((s) => s.setImportModalUrl);
  const configName = useUIStore((s) => s.importModalConfigName);
  const setConfigName = useUIStore((s) => s.setImportModalConfigName);
  const syncInterval = useUIStore((s) => s.importModalSyncInterval);
  const setSyncInterval = useUIStore((s) => s.setImportModalSyncInterval);
  const loading = useUIStore((s) => s.importModalLoading);
  const setLoading = useUIStore((s) => s.setImportModalLoading);
  const error = useUIStore((s) => s.importModalError);
  const setError = useUIStore((s) => s.setImportModalError);
  const progress = useUIStore((s) => s.importModalProgress);
  const setProgress = useUIStore((s) => s.setImportModalProgress);
  const collectionImportText = useUIStore((s) => s.importModalCollectionText);
  const setCollectionImportText = useUIStore((s) => s.setImportModalCollectionText);

  const importConfigs = useCollectionStore((s) => s.importConfigs);
  const syncingConfigId = useCollectionStore((s) => s.syncingConfigId);
  const loadImportConfigs = useCollectionStore((s) => s.loadImportConfigs);
  const saveImportConfigAction = useCollectionStore((s) => s.saveImportConfig);
  const deleteImportConfigAction = useCollectionStore((s) => s.deleteImportConfig);
  const syncImportConfigAction = useCollectionStore((s) => s.syncImportConfig);

  // Local state - auth items are component-specific
  const [authItems, setAuthItems] = useState<AuthItem[]>([]);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (isOpen) {
      loadImportConfigs();
    }
  }, [isOpen, loadImportConfigs]);

  async function handleSaveConfig() {
    if (!url.trim() || !configName.trim()) {
      setError(t('import.configNameUrlRequired'));
      return;
    }

    setLoading(true);
    setError("");
    setSaveStatus('saving');

    try {
      const headers: Record<string, string> = {};
      let finalUrl = url;

      for (const auth of authItems) {
        if (!auth.key && !auth.value) continue;

        switch (auth.location) {
          case "header":
            if (auth.key && auth.value) {
              headers[auth.key] = auth.value;
            }
            break;
          case "cookie":
            headers["Cookie"] = auth.value;
            break;
          case "query":
            const urlObj = new URL(url);
            urlObj.searchParams.append(auth.key || "", auth.value);
            finalUrl = urlObj.toString();
            break;
          case "path":
            if (auth.key) {
              finalUrl = finalUrl.replace(`{${auth.key}}`, auth.value);
            }
            break;
        }
      }

      const newConfig = {
        name: configName,
        url: finalUrl,
        headers,
        auth_items: authItems,
        sync_interval_minutes: syncInterval,
        last_sync: null,
      };

      await saveImportConfigAction(newConfig);
      setShowForm(false);
      resetForm();
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      setError(getErrorMessage(err));
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } finally {
      setLoading(false);
    }
  }

  async function handleSync(config: ImportConfigType) {
    setProgress("");
    setError("");

    try {
      setProgress(t('import.syncing'));
      const imported = await syncImportConfigAction(config.id);
      setProgress(t('import.syncedFrom', { name: config.name, count: imported.length }));
      await loadImportConfigs();
      onImportComplete();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleDelete(config: ImportConfigType) {
    try {
      await deleteImportConfigAction(config.id);
    } catch (e) {
      toast.error(t('import.deleteConfigFailed'));
    }
  }

  function resetForm() {
    setUrl("");
    setConfigName("");
    setAuthItems([]);
    setSyncInterval(0);
    setError("");
    setProgress("");
  }

  function addAuthItem(location: AuthLocation) {
    setAuthItems([...authItems, { location, key: "", value: "" }]);
  }

  function removeAuthItem(index: number) {
    setAuthItems(authItems.filter((_, i) => i !== index));
  }

  function updateAuthItem(index: number, field: "key" | "value", val: string) {
    setAuthItems(authItems.map((item, i) =>
      i === index ? { ...item, [field]: val } : item
    ));
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="rounded-lg p-4 w-[600px] max-h-[80vh] overflow-auto" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('import.title')}</span>
          <button onClick={onClose} className="p-1 rounded" style={{ color: 'var(--text-muted)' }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab("api")}
            className="px-3 py-1.5 rounded text-xs"
            style={activeTab === "api" ? { backgroundColor: 'var(--accent-muted)', color: 'var(--accent)' } : { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
          >
            {t('import.apiConfig')}
          </button>
          <button
            onClick={() => setActiveTab("collection")}
            className="px-3 py-1.5 rounded text-xs"
            style={activeTab === "collection" ? { backgroundColor: 'var(--accent-muted)', color: 'var(--accent)' } : { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
          >
            {t('import.collectionImport')}
          </button>
        </div>

        {/* API Config Tab */}
        {activeTab === "api" && !showForm && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{t('import.savedConfigs')}</span>
              <button
                onClick={() => setShowForm(true)}
                className="px-2 py-1 rounded text-xs"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}
              >
                {t('import.create')}
              </button>
            </div>

            {importConfigs.length === 0 ? (
              <div className="text-center py-6" style={{ color: 'var(--text-muted)' }}>
                <div className="text-xs">{t('import.noConfig')}</div>
                <div className="text-xs mt-1">{t('import.createConfigToEnable')}</div>
              </div>
            ) : (
              <ConfigList
                configs={importConfigs}
                syncing={syncingConfigId}
                onSync={handleSync}
                onDelete={handleDelete}
              />
            )}
          </div>
        )}

        {/* New Config Form */}
        {showForm && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{t('import.newConfig')}</span>
              <button onClick={() => { setShowForm(false); resetForm(); }} className="text-xs" style={{ color: 'var(--accent)' }}>
                {t('import.back')}
              </button>
            </div>

            <div className="mb-3">
              <label className="block text-xs mb-1" style={{ color: 'var(--text-primary)' }}>{t('import.configName')}</label>
              <input
                type="text"
                value={configName}
                onChange={(e) => setConfigName(e.target.value)}
                placeholder="My API Config"
                className="w-full px-3 py-1.5 rounded text-xs"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
              />
            </div>

            <div className="mb-3">
              <label className="block text-xs mb-1" style={{ color: 'var(--text-primary)' }}>Swagger Config URL</label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="http://localhost:81/api/v3/api-docs/swagger-config"
                className="w-full px-3 py-1.5 rounded text-xs"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
              />
            </div>

            <AuthItemsForm
                authItems={authItems}
                onAddItem={addAuthItem}
                onRemoveItem={removeAuthItem}
                onUpdateItem={updateAuthItem}
              />

            <div className="mb-3">
              <label className="block text-xs mb-1" style={{ color: 'var(--text-primary)' }}>{t('import.syncInterval')}</label>
              <select
                value={syncInterval}
                onChange={(e) => setSyncInterval(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded text-xs"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
              >
                <option value={0}>{t('import.manualSync')}</option>
                <option value={5}>{t('import.everyMinutes', { count: 5 })}</option>
                <option value={15}>{t('import.everyMinutes', { count: 15 })}</option>
                <option value={30}>{t('import.everyMinutes', { count: 30 })}</option>
                <option value={60}>{t('import.hourly')}</option>
                <option value={180}>{t('import.everyXHours', { count: 3 })}</option>
                <option value={720}>{t('import.everyXHours', { count: 12 })}</option>
                <option value={1440}>{t('import.daily')}</option>
              </select>
            </div>

            {progress && (
              <div className="mb-3 p-2 rounded text-xs" style={{ backgroundColor: 'var(--accent-muted)', color: 'var(--accent)' }}>{progress}</div>
            )}
            {error && (
              <div className="mb-3 p-2 rounded text-xs" style={{ backgroundColor: 'rgba(248,113,113,0.15)', color: 'var(--danger)' }}>{error}</div>
            )}

            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowForm(false); resetForm(); }} className="px-3 py-1.5 rounded text-xs" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>{t('import.cancel')}</button>
              <button onClick={handleSaveConfig} disabled={loading} className="px-3 py-1.5 rounded text-xs flex items-center justify-center gap-1.5 w-14" style={{
                backgroundColor: saveStatus === 'success' ? 'var(--success)' : saveStatus === 'error' ? 'var(--danger)' : 'var(--accent)',
                color: 'var(--text-inverse)',
              }}>
                {saveStatus === 'saving' && <Spinner size="sm" />}
                {saveStatus === 'success' && '✓'}
                {saveStatus === 'error' && '✕'}
                {saveStatus === 'idle' && t('import.save')}
              </button>
            </div>
          </div>
        )}

        {/* Collection Tab */}
        {activeTab === "collection" && (
          <CollectionPanel
            collections={collections}
            collectionImportText={collectionImportText}
            onSetCollectionImportText={setCollectionImportText}
            onDuplicateCollection={onDuplicateCollection}
            onExportPostman={onExportPostman}
            onExportOpenApi={onExportOpenApi}
            onExportHar={onExportHar}
            onImportCollection={onImportCollection}
          />
        )}
      </div>
    </div>
  );
}
