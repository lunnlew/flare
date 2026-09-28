import { useState } from "react";
import { useSettingsStore } from "../../store";
import { isUnsafeRegex } from '@shared/constants';
import { useTranslation } from "../../utils/i18n";

export function CaptureSettings() {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);
  const captureSettings = useSettingsStore((s) => s.captureSettings);
  const setCaptureSettings = useSettingsStore((s) => s.setCaptureSettings);

  const [newDomain, setNewDomain] = useState("");
  const [newPattern, setNewPattern] = useState("");

  const updateCaptureSettings = (updates: Partial<typeof captureSettings>) => {
    setCaptureSettings({ ...captureSettings, ...updates });
  };

  const addDomain = () => {
    if (!newDomain.trim()) return;
    const domain = newDomain.trim();
    if (!captureSettings.allowedDomains.includes(domain)) {
      updateCaptureSettings({
        allowedDomains: [...captureSettings.allowedDomains, domain],
      });
    }
    setNewDomain("");
  };

  const removeDomain = (domain: string) => {
    updateCaptureSettings({
      allowedDomains: captureSettings.allowedDomains.filter(d => d !== domain),
    });
  };

  const addPattern = () => {
    if (!newPattern.trim()) return;
    const pattern = newPattern.trim();

    try {
      new RegExp(pattern);
    } catch {
      console.warn('[CaptureSettings] Invalid regex pattern:', pattern);
      return;
    }

    if (isUnsafeRegex(pattern)) {
      console.warn('[CaptureSettings] Potentially unsafe pattern skipped:', pattern);
      return;
    }

    if (!captureSettings.excludePatterns.includes(pattern)) {
      updateCaptureSettings({
        excludePatterns: [...captureSettings.excludePatterns, pattern],
      });
    }
    setNewPattern("");
  };

  const removePattern = (pattern: string) => {
    updateCaptureSettings({
      excludePatterns: captureSettings.excludePatterns.filter(p => p !== pattern),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{t('capture.enable')}</span>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={captureSettings.enabled}
            onChange={e => updateCaptureSettings({ enabled: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-10 h-5 bg-[var(--bg-tertiary)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--text-muted)] after:border after:border-[var(--border-color)] after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:bg-[var(--accent)] peer-checked:after:border-white"></div>
        </label>
      </div>

      {/* Allowed Domains */}
      <div>
        <div className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
          {t('capture.allowedDomains')}
        </div>
        <div className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
          {t('capture.allowedDomains.description')}
        </div>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={newDomain}
            onChange={e => setNewDomain(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addDomain()}
            placeholder={t('capture.placeholder.domain')}
            className="flex-1 px-3 py-1.5 rounded-lg text-xs"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
            }}
          />
          <button
            onClick={addDomain}
            className="px-3 py-1.5 rounded-lg text-xs transition-opacity hover:opacity-80"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'var(--text-inverse)',
            }}
          >
            {t('capture.addDomain')}
          </button>
        </div>
        <div className="flex flex-wrap gap-1">
          {captureSettings.allowedDomains.map(domain => (
            <span
              key={domain}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
            >
              {domain}
              <button
                onClick={() => removeDomain(domain)}
                className="hover:text-red-500 transition-colors"
              >
                ×
              </button>
            </span>
          ))}
          {captureSettings.allowedDomains.length === 0 && (
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {t('capture.noRestrictions')}
            </span>
          )}
        </div>
      </div>

      {/* Exclude Patterns */}
      <div>
        <div className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
          {t('capture.excludePatterns')}
        </div>
        <div className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
          {t('capture.excludePatterns.description')}
        </div>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={newPattern}
            onChange={e => setNewPattern(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addPattern()}
            placeholder={t('capture.placeholder.pattern')}
            className="flex-1 px-3 py-1.5 rounded-lg text-xs"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
            }}
          />
          <button
            onClick={addPattern}
            className="px-3 py-1.5 rounded-lg text-xs transition-opacity hover:opacity-80"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'var(--text-inverse)',
            }}
          >
            {t('capture.addPattern')}
          </button>
        </div>
        <div className="max-h-40 overflow-y-auto space-y-1">
          {captureSettings.excludePatterns.map(pattern => (
            <div
              key={pattern}
              className="flex items-center justify-between px-3 py-1.5 rounded-lg text-xs"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
            >
              <code className="font-mono">{pattern}</code>
              <button
                onClick={() => removePattern(pattern)}
                className="hover:text-red-500 transition-colors"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}