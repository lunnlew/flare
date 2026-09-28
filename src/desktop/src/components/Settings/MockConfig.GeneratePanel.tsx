/**
 * MockConfig GeneratePanel - 字段模拟配置
 */
import { useMockStore, LOCALE_PRESETS } from "../../store/mockStore";
import { useSettingsStore } from "../../store";
import { useTranslation } from "../../utils/i18n";

export function GeneratePanel() {
  const currentLocale = useMockStore((s) => s.currentLocale);
  const smartDetectionEnabled = useMockStore((s) => s.smartDetectionEnabled);
  const sequencePrefix = useMockStore((s) => s.sequencePrefix);
  const sequenceStart = useMockStore((s) => s.sequenceStart);
  const sequencePadding = useMockStore((s) => s.sequencePadding);
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);

  const setLocale = useMockStore((s) => s.setLocale);
  const setSmartDetection = useMockStore((s) => s.setSmartDetection);
  const setSequencePrefix = useMockStore((s) => s.setSequencePrefix);
  const setSequenceStart = useMockStore((s) => s.setSequenceStart);
  const setSequencePadding = useMockStore((s) => s.setSequencePadding);

  return (
    <div className="p-4 space-y-6">
      {/* Language */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium flex items-center gap-2">
          <span>🌐</span>
          <span>{t('mock.languageDataPool')}</span>
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setLocale('zh-CN')}
            className="px-3 py-1.5 rounded text-xs font-medium"
            style={currentLocale === 'zh-CN' ? { backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' } : { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
          >
            {t('mock.chinese')}
          </button>
          <button
            onClick={() => setLocale('en-US')}
            className="px-3 py-1.5 rounded text-xs font-medium"
            style={currentLocale === 'en-US' ? { backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' } : { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
          >
            {t('mock.english')}
          </button>
        </div>
        <div className="p-2 rounded text-xs" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
          {t('mock.current')}: {currentLocale === 'zh-CN' ? t('mock.chinese') : t('mock.english')} • {LOCALE_PRESETS[currentLocale].firstName.length} {t('mock.names')}, {LOCALE_PRESETS[currentLocale].city.length} {t('mock.cities')}
        </div>
      </section>

      {/* Smart Detection */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium flex items-center gap-2">
          <span>🔍</span>
          <span>{t('mock.smartDetection')}</span>
        </h2>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={smartDetectionEnabled}
            onChange={e => setSmartDetection(e.target.checked)}
            className="sr-only"
          />
          <div className="relative inline-flex items-center cursor-pointer">
            <div className="w-9 h-5 rounded-full transition-colors" style={{ backgroundColor: smartDetectionEnabled ? 'var(--accent)' : 'var(--bg-tertiary)' }} />
            <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-all" style={{ transform: smartDetectionEnabled ? 'translateX(16px)' : 'translateX(0)' }} />
          </div>
          <span className="text-xs">{t('mock.autoDetectType')}</span>
        </label>
        <div className="p-2 rounded text-xs" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
          {t('mock.smartDetection.description')}
        </div>
      </section>

      {/* Sequence */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium flex items-center gap-2">
          <span>🔢</span>
          <span>{t('mock.sequenceGeneration')}</span>
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>{t('mock.prefix')}</label>
            <input
              type="text"
              value={sequencePrefix}
              onChange={e => setSequencePrefix(e.target.value)}
              placeholder={t('mock.example') + ': item_'}
              className="w-full px-2 py-1.5 rounded text-xs"
              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
            />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>{t('mock.startValue')}</label>
            <input
              type="number"
              value={sequenceStart}
              onChange={e => setSequenceStart(parseInt(e.target.value) || 1)}
              min="0"
              className="w-full px-2 py-1.5 rounded text-xs"
              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
            />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>{t('mock.zeroPadding')}</label>
            <input
              type="number"
              value={sequencePadding}
              onChange={e => setSequencePadding(parseInt(e.target.value) || 3)}
              min="1"
              max="10"
              className="w-full px-2 py-1.5 rounded text-xs"
              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
            />
          </div>
        </div>
        <div className="p-2 rounded text-xs font-mono" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--accent)' }}>
          {t('mock.example')}: {sequencePrefix || 'field'}_001, {sequencePrefix || 'field'}_002
        </div>
      </section>

      {/* Quick Generate */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium flex items-center gap-2">
          <span>⚡</span>
          <span>{t('mock.quickGenerate')}</span>
        </h2>
        <div className="p-3 rounded border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
          <div className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
            {t('mock.quickGenerate.description')}
          </div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {t('mock.quickGenerate.description2')}
          </div>
        </div>
      </section>
    </div>
  );
}
