import { useState, useEffect, useRef } from "react";
import { useSettingsStore } from "../../store";
import { useNotificationStore } from "../../store/notificationStore";
import { CaptureSettings } from "./CaptureSettings";
import { useTranslation } from "../../utils/i18n";
import { exportBackup } from "../../services/api";
import { importAllData } from "../../utils/fullExport";
import JSZip from "jszip";

type SettingsTab = 'general' | 'appearance' | 'request' | 'proxy' | 'ssl' | 'capture' | 'shortcuts';

interface TabConfig {
  id: SettingsTab;
  labelKey: string;
  icon: string;
}

const TABS: TabConfig[] = [
  { id: 'general', labelKey: 'settings.general', icon: '⚙' },
  { id: 'appearance', labelKey: 'settings.appearance', icon: '🎨' },
  { id: 'request', labelKey: 'settings.request', icon: '🌐' },
  { id: 'proxy', labelKey: 'settings.proxy', icon: '🔀' },
  { id: 'ssl', labelKey: 'settings.ssl', icon: '🔐' },
  { id: 'capture', labelKey: 'settings.capture', icon: '📡' },
  { id: 'shortcuts', labelKey: 'settings.shortcuts', icon: '⌨' },
];

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="sr-only peer"
      />
      <div className="w-10 h-5 bg-[var(--bg-tertiary)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--text-muted)] after:border after:border-[var(--border-color)] after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:bg-[var(--accent)] peer-checked:after:border-white"></div>
      {label && <span className="ml-2 text-xs" style={{ color: 'var(--text-secondary)' }}>{label}</span>}
    </label>
  );
}

function Select({ value, options, onChange, className = '' }: {
  value: number | string;
  options: { value: string | number; label: string }[];
  onChange: (v: any) => void;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`px-3 py-1.5 rounded-lg text-xs ${className}`}
      style={{
        backgroundColor: 'var(--bg-tertiary)',
        color: 'var(--text-primary)',
        border: '1px solid var(--border-color)',
      }}
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

function TextInput({ value, onChange, placeholder, type = 'text' }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-1.5 rounded-lg text-xs"
      style={{
        backgroundColor: 'var(--bg-tertiary)',
        color: 'var(--text-primary)',
        border: '1px solid var(--border-color)',
      }}
    />
  );
}

function SettingRow({ label, description, children }: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</div>
        {description && (
          <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{description}</div>
        )}
      </div>
      <div className="ml-4 flex-shrink-0">{children}</div>
    </div>
  );
}

function Divider() {
  return <div className="my-2" style={{ borderTop: '1px solid var(--border-color)' }} />;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 py-2 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
      {children}
    </div>
  );
}

function FullBackupPanel() {
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importError, setImportError] = useState('');
  const [exporting, setExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = useTranslation(useSettingsStore.getState().language);

  const handleExportAll = async () => {
    if (exporting) return;
    try {
      setExporting(true);
      await exportBackup(`flare-backup-${Date.now()}.zip`);
      useNotificationStore.getState().showToast(t('backup.exportSuccess'), 'success');
    } catch (e) {
      useNotificationStore.getState().showToast(t('backup.exportFailed'), 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      useNotificationStore.getState().showToast(t('backup.fileSizeExceeded'), 'error');
      e.target.value = '';
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);

      // Extract collections from apis/ folder
      const collections: unknown[] = [];
      const skippedFiles: string[] = [];
      const apisFolder = zip.folder('apis');
      if (apisFolder) {
        const apisFiles = apisFolder.filter((_, file) => !file.dir);
        for (const file of apisFiles) {
          const content = await file.async('string');
          try {
            collections.push(JSON.parse(content));
          } catch {
            skippedFiles.push(`apis/${file.name}`);
          }
        }
      }

      // Extract environments
      let environments: unknown = null;
      const envFile = zip.file('environments.json');
      if (envFile) {
        const content = await envFile.async('string');
        try {
          environments = JSON.parse(content);
        } catch {
          skippedFiles.push('environments.json');
        }
      }

      // Extract flows from flows/ folder (take first one)
      let flows: unknown = null;
      const flowsFolder = zip.folder('flows');
      if (flowsFolder) {
        const flowsFiles = flowsFolder.filter((_, file) => !file.dir);
        for (const file of flowsFiles) {
          const content = await file.async('string');
          try {
            const flowData = JSON.parse(content);
            flows = {
              currentFlowId: flowData.id || '',
              currentFlowName: flowData.name || '',
              nodes: flowData.nodes || [],
              edges: flowData.edges || [],
              variables: flowData.variables || {},
            };
            break; // Only take first flow
          } catch {
            skippedFiles.push(`flows/${file.name}`);
          }
        }
      }

      // Warn about skipped files
      if (skippedFiles.length > 0) {
        useNotificationStore.getState().showToast(
          t('backup.skippedFiles').replace('{count}', String(skippedFiles.length)),
          'info'
        );
      }

      // Reconstruct full export JSON
      const exportData = {
        version: '1.0',
        type: 'flare-full-export',
        exportedAt: new Date().toISOString(),
        data: {
          collections,
          environments,
          flows: flows || {
            currentFlowId: '',
            currentFlowName: '',
            nodes: [],
            edges: [],
            variables: {},
          },
          settings: null,
        },
      };

      const result = importAllData(JSON.stringify(exportData), { merge: importMode === 'merge' });
      if (result.success) {
        setShowImportModal(false);
        useNotificationStore.getState().showToast(t('backup.importSuccess'), 'success');
        setTimeout(() => window.location.reload(), 500);
      } else {
        setImportError(result.error || t('backup.importFailed'));
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : t('backup.importFailed'));
    }
    e.target.value = '';
  };

  return (
    <>
      <div className="flex gap-2 mb-3">
        <button
          onClick={handleExportAll}
          disabled={exporting}
          className="px-3 py-1.5 rounded text-xs flex items-center gap-1.5"
          style={{ backgroundColor: exporting ? 'var(--bg-tertiary)' : 'var(--accent)', color: 'var(--text-inverse)' }}
        >
          {exporting ? '⏳' : '📤'} {exporting ? t('backup.exporting') : t('backup.exportAll')}
        </button>
        <button
          onClick={() => setShowImportModal(true)}
          className="px-3 py-1.5 rounded text-xs"
          style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
        >
          📥 {t('backup.importAll')}
        </button>
      </div>

      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-lg p-4 w-[28rem]" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>{t('backup.importAll')}</h3>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>{t('backup.selectFile')}</p>

            <div className="mb-3">
              <div className="flex gap-4 mb-3">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    checked={importMode === 'replace'}
                    onChange={() => setImportMode('replace')}
                  />
                  <span className="text-xs" style={{ color: 'var(--text-primary)' }}>{t('backup.replace')}</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    checked={importMode === 'merge'}
                    onChange={() => setImportMode('merge')}
                  />
                  <span className="text-xs" style={{ color: 'var(--text-primary)' }}>{t('backup.merge')}</span>
                </label>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".zip"
              onChange={handleFileImport}
              className="hidden"
            />

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setShowImportModal(false); setImportError(''); }}
                className="px-3 py-1.5 rounded text-xs"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
              >
                {t('env.cancel')}
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded text-xs"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}
              >
                {t('common.import')}
              </button>
            </div>

            {importError && <p className="text-xs mt-2" style={{ color: 'var(--danger)' }}>{importError}</p>}
          </div>
        </div>
      )}
    </>
  );
}

export function AppSettings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);

  const requestTimeout = useSettingsStore((s) => s.requestTimeout);
  const setRequestTimeout = useSettingsStore((s) => s.setRequestTimeout);
  const followRedirects = useSettingsStore((s) => s.followRedirects);
  const setFollowRedirects = useSettingsStore((s) => s.setFollowRedirects);
  const proxyEnabled = useSettingsStore((s) => s.proxyEnabled);
  const setProxyEnabled = useSettingsStore((s) => s.setProxyEnabled);
  const proxyConfig = useSettingsStore((s) => s.proxyConfig);
  const setProxyConfig = useSettingsStore((s) => s.setProxyConfig);
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const fontSize = useSettingsStore((s) => s.fontSize);
  const setFontSize = useSettingsStore((s) => s.setFontSize);
  const tabSize = useSettingsStore((s) => s.tabSize);
  const setTabSize = useSettingsStore((s) => s.setTabSize);
  const lineHeight = useSettingsStore((s) => s.lineHeight);
  const setLineHeight = useSettingsStore((s) => s.setLineHeight);
  const autoSave = useSettingsStore((s) => s.autoSave);
  const setAutoSave = useSettingsStore((s) => s.setAutoSave);
  const autoSaveInterval = useSettingsStore((s) => s.autoSaveInterval);
  const setAutoSaveInterval = useSettingsStore((s) => s.setAutoSaveInterval);
  const sensitiveMaskEnabled = useSettingsStore((s) => s.sensitiveMaskEnabled);
  const setSensitiveMaskEnabled = useSettingsStore((s) => s.setSensitiveMaskEnabled);
  const sslCertConfig = useSettingsStore((s) => s.sslCertConfig);
  const setSslCertConfig = useSettingsStore((s) => s.setSslCertConfig);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const keyboardShortcuts = useSettingsStore((s) => s.keyboardShortcuts);
  const setKeyboardShortcuts = useSettingsStore((s) => s.setKeyboardShortcuts);
  const resetKeyboardShortcuts = useSettingsStore((s) => s.resetKeyboardShortcuts);

  useEffect(() => {
    document.documentElement.style.setProperty("--font-size", `${fontSize}px`);
  }, [fontSize]);

  const renderContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="space-y-1">
            <SectionTitle>{t('settings.save')}</SectionTitle>
            <SettingRow label={t('general.autoSave')} description={t('general.autoSave.description')}>
              <Toggle
                checked={autoSave}
                onChange={setAutoSave}
                label={autoSave ? t('common.on') : t('common.off')}
              />
            </SettingRow>
            {autoSave && (
              <div className="px-4 py-2 pl-12 bg-[var(--bg-secondary)]">
                <div className="flex items-center gap-3">
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t('general.autoSaveInterval')}</span>
                  <Select
                    value={autoSaveInterval}
                    options={[
                      { value: 30, label: `30${t('settings.seconds')}` },
                      { value: 60, label: t('settings.oneMinute') },
                      { value: 120, label: t('settings.twoMinutes') },
                      { value: 300, label: t('settings.fiveMinutes') },
                    ]}
                    onChange={v => setAutoSaveInterval(Number(v))}
                  />
                </div>
              </div>
            )}
            <Divider />

            <SectionTitle>{t('settings.privacy')}</SectionTitle>
            <SettingRow label={t('general.sensitiveMask')} description={t('general.sensitiveMask.description')}>
              <Toggle
                checked={sensitiveMaskEnabled}
                onChange={setSensitiveMaskEnabled}
                label={sensitiveMaskEnabled ? t('common.on') : t('common.off')}
              />
            </SettingRow>
            <Divider />

            <SectionTitle>{t('settings.region')}</SectionTitle>
            <SettingRow label={t('general.language')} description={t('general.language.description')}>
              <Select
                value={language}
                options={[
                  { value: 'zh-CN', label: t('general.languageChinese') },
                  { value: 'en-US', label: t('general.languageEnglish') },
                ]}
                onChange={v => setLanguage(v as 'zh-CN' | 'en-US')}
              />
            </SettingRow>
            <Divider />

            <SectionTitle>{t('settings.backup')}</SectionTitle>
            <SettingRow label={t('backup.fullBackup')} description={t('backup.fullBackupDescription')}>
              <FullBackupPanel />
            </SettingRow>
          </div>
        );

      case 'appearance':
        return (
          <div className="space-y-1">
            <SectionTitle>{t('appearance.theme')}</SectionTitle>
            <SettingRow label={t('appearance.theme')} description={t('appearance.theme.description')}>
              <Select
                value={theme}
                options={[
                  { value: 'dark', label: t('appearance.theme.dark') },
                  { value: 'light', label: t('appearance.theme.light') },
                  { value: 'system', label: t('appearance.theme.system') },
                  { value: 'blue', label: t('appearance.theme.blue') },
                  { value: 'notion', label: t('appearance.theme.notion') },
                  { value: 'vermont', label: t('appearance.theme.vermont') },
                ]}
                onChange={setTheme}
              />
            </SettingRow>
            <Divider />

            <SectionTitle>{t('settings.font')}</SectionTitle>
            <SettingRow label={t('appearance.fontSize')} description={t('appearance.fontSize.description')}>
              <Select
                value={fontSize}
                options={[
                  { value: 10, label: '10px' },
                  { value: 12, label: '12px' },
                  { value: 14, label: '14px' },
                  { value: 16, label: '16px' },
                ]}
                onChange={v => setFontSize(Number(v))}
              />
            </SettingRow>
            <SettingRow label={t('appearance.tabSize')} description={t('appearance.tabSize.description')}>
              <Select
                value={tabSize}
                options={[
                  { value: 2, label: t('settings.twoSpaces') },
                  { value: 4, label: t('settings.fourSpaces') },
                ]}
                onChange={v => setTabSize(Number(v))}
              />
            </SettingRow>
            <SettingRow label={t('appearance.lineHeight')} description={t('appearance.lineHeight.description')}>
              <Select
                value={lineHeight}
                options={[
                  { value: 'compact', label: t('appearance.fontSize.compact') },
                  { value: 'normal', label: t('appearance.fontSize.normal') },
                  { value: 'relaxed', label: t('appearance.fontSize.relaxed') },
                ]}
                onChange={v => setLineHeight(v as 'compact' | 'normal' | 'relaxed')}
              />
            </SettingRow>
          </div>
        );

      case 'request':
        return (
          <div className="space-y-1">
            <SectionTitle>{t('settings.timeout')}</SectionTitle>
            <SettingRow label={t('request.timeout')} description={t('request.timeout.description')}>
              <Select
                value={requestTimeout}
                options={[
                  { value: 5000, label: t('settings.timeout5s') },
                  { value: 10000, label: t('settings.timeout10s') },
                  { value: 15000, label: t('settings.timeout15s') },
                  { value: 30000, label: t('settings.timeout30s') },
                  { value: 60000, label: t('settings.timeout60s') },
                  { value: 120000, label: t('settings.timeout120s') },
                ]}
                onChange={v => setRequestTimeout(Number(v))}
              />
            </SettingRow>
            <Divider />

            <SectionTitle>{t('settings.redirect')}</SectionTitle>
            <SettingRow label={t('request.followRedirects')} description={t('request.followRedirects.description')}>
              <Toggle
                checked={followRedirects}
                onChange={setFollowRedirects}
                label={followRedirects ? t('common.yes') : t('common.no')}
              />
            </SettingRow>
          </div>
        );

      case 'proxy':
        return (
          <div className="space-y-1">
            <SectionTitle>{t('settings.proxy')}</SectionTitle>
            <SettingRow label={t('proxy.enable')} description={t('proxy.enable.description')}>
              <Toggle
                checked={proxyEnabled}
                onChange={setProxyEnabled}
                label={proxyEnabled ? t('common.enabled') : t('common.disabled')}
              />
            </SettingRow>
            {proxyEnabled && (
              <div className="px-4 py-3 space-y-3 bg-[var(--bg-secondary)] rounded-lg mx-4">
                <div className="grid grid-cols-3 gap-2">
                  <Select
                    value={proxyConfig.protocol}
                    options={[
                      { value: 'http', label: 'HTTP' },
                      { value: 'https', label: 'HTTPS' },
                      { value: 'socks5', label: 'SOCKS5' },
                    ]}
                    onChange={v => setProxyConfig({ ...proxyConfig, protocol: v })}
                  />
                  <TextInput
                    value={proxyConfig.host}
                    onChange={v => setProxyConfig({ ...proxyConfig, host: v })}
                    placeholder={t('proxy.host')}
                  />
                  <TextInput
                    value={proxyConfig.port}
                    onChange={v => setProxyConfig({ ...proxyConfig, port: v })}
                    placeholder={t('proxy.port')}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <TextInput
                    value={proxyConfig.username}
                    onChange={v => setProxyConfig({ ...proxyConfig, username: v })}
                    placeholder={t('proxy.username')}
                  />
                  <TextInput
                    value={proxyConfig.password}
                    onChange={v => setProxyConfig({ ...proxyConfig, password: v })}
                    placeholder={t('proxy.password')}
                    type="password"
                  />
                </div>
                {proxyConfig.host && proxyConfig.port && (
                  <div className="text-xs font-mono pt-1" style={{ color: 'var(--text-muted)' }}>
                    {proxyConfig.protocol}://{proxyConfig.host}:{proxyConfig.port}
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 'ssl':
        return (
          <div className="space-y-1">
            <SectionTitle>{t('settings.clientCertificate')}</SectionTitle>
            <SettingRow label={t('ssl.enableMtls')} description={t('ssl.enableMtls.description')}>
              <Toggle
                checked={sslCertConfig.clientCertEnabled}
                onChange={v => setSslCertConfig({ ...sslCertConfig, clientCertEnabled: v })}
                label={sslCertConfig.clientCertEnabled ? t('common.enabled') : t('common.disabled')}
              />
            </SettingRow>
            {sslCertConfig.clientCertEnabled && (
              <div className="px-4 py-3 space-y-3 bg-[var(--bg-secondary)] rounded-lg mx-4">
                <div>
                  <div className="text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t('ssl.clientCert')}</div>
                  <TextInput
                    value={sslCertConfig.clientCertFile}
                    onChange={v => setSslCertConfig({ ...sslCertConfig, clientCertFile: v })}
                    placeholder={t('settings.certFile')}
                  />
                </div>
                <div>
                  <div className="text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t('ssl.privateKey')}</div>
                  <TextInput
                    value={sslCertConfig.clientKeyFile}
                    onChange={v => setSslCertConfig({ ...sslCertConfig, clientKeyFile: v })}
                    placeholder={t('settings.keyFile')}
                  />
                </div>
                <div>
                  <div className="text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t('ssl.caCert')}</div>
                  <TextInput
                    value={sslCertConfig.caCertFile}
                    onChange={v => setSslCertConfig({ ...sslCertConfig, caCertFile: v })}
                    placeholder={t('settings.caCertFile')}
                  />
                </div>
              </div>
            )}
          </div>
        );

      case 'capture':
        return (
          <div className="p-4">
            <CaptureSettings />
          </div>
        );

      case 'shortcuts':
        return (
          <div className="space-y-1">
            <div className="flex items-center justify-between px-4 py-2">
              <SectionTitle>{t('shortcuts.title')}</SectionTitle>
              <button
                onClick={resetKeyboardShortcuts}
                className="px-3 py-1 text-xs rounded-lg transition-colors hover:opacity-80"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)',
                }}
              >
                {t('common.resetAll')}
              </button>
            </div>
            <div className="px-4 space-y-1">
              {keyboardShortcuts.map((shortcut, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Toggle
                      checked={shortcut.enabled}
                      onChange={v => {
                        const updated = [...keyboardShortcuts];
                        updated[i] = { ...updated[i], enabled: v };
                        setKeyboardShortcuts(updated);
                      }}
                    />
                    <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                      {shortcut.description}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {shortcut.modifiers.map((mod, j) => (
                      <span
                        key={j}
                        className="px-1.5 py-0.5 text-[10px] rounded font-mono"
                        style={{
                          backgroundColor: 'var(--bg-tertiary)',
                          color: 'var(--text-muted)',
                          border: '1px solid var(--border-color)',
                        }}
                      >
                        {mod}
                      </span>
                    ))}
                    <span
                      className="px-1.5 py-0.5 text-[10px] rounded font-mono"
                      style={{
                        backgroundColor: 'var(--accent)',
                        color: 'var(--text-inverse)',
                      }}
                    >
                      {shortcut.key}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-full flex" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Sidebar */}
      <div
        className="w-48 flex-shrink-0 border-r overflow-y-auto"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderColor: 'var(--border-color)',
        }}
      >
        <div className="py-4">
          <div className="px-4 mb-4">
            <h1 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{t('settings.title')}</h1>
          </div>
          <nav className="space-y-0.5 px-2">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all"
                style={{
                  backgroundColor: activeTab === tab.id ? 'var(--accent)' : 'transparent',
                  color: activeTab === tab.id ? 'var(--text-inverse)' : 'var(--text-secondary)',
                }}
              >
                <span>{tab.icon}</span>
                <span>{t(tab.labelKey as any)}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto py-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}