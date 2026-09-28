/**
 * MockConfig PreviewSection - 始终显示的预览面板
 */
import { useMemo } from "react";
import { useMockStore, LOCALE_PRESETS } from "../../store/mockStore";
import { useSettingsStore } from "../../store";
import { useMockPreview } from "../../hooks/Mock/useMockPreview";
import { useTranslation } from "../../utils/i18n";

export function PreviewSection() {
  const currentLocale = useMockStore((s) => s.currentLocale);
  const builtinRules = useMockStore((s) => s.builtinRules);
  const sequencePrefix = useMockStore((s) => s.sequencePrefix);
  const sequenceStart = useMockStore((s) => s.sequenceStart);
  const sequencePadding = useMockStore((s) => s.sequencePadding);
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);

  const enabledRules = useMemo(() =>
    Object.entries(builtinRules)
      .filter(([, enabled]) => enabled)
      .map(([type]) => type),
    [builtinRules]
  );

  const { previewItems, loading } = useMockPreview({
    enabledRules,
    sequencePrefix,
    sequenceStart,
    sequencePadding,
    locale: currentLocale,
  });

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-medium flex items-center gap-2">
          <span>👁️</span>
          <span>{t('mock.preview')}</span>
          {loading && <span style={{ color: 'var(--text-muted)' }}>({t('mock.loading')})</span>}
        </h3>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {LOCALE_PRESETS[currentLocale].firstName.length} {t('mock.names')}, {LOCALE_PRESETS[currentLocale].city.length} {t('mock.cities')}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {previewItems.map(item => (
          <div
            key={item.label}
            className="px-2 py-1.5 rounded text-xs"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              opacity: item.enabled ? 1 : 0.5,
            }}
          >
            <span style={{ color: 'var(--text-muted)' }}>{item.label}:</span>
            <span style={{ color: 'var(--accent)' }}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
