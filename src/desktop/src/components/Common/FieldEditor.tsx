import { useState, useEffect, useCallback } from 'react';
import { generateFieldPreview, getGenTypeLabel, getAllGenTypes, type FieldGenType } from '../../utils/mock';
import { useMockStore } from '../../store/mockStore';
import { useSettingsStore } from '../../store';
import { useTranslation } from '../../utils/i18n';

export type { FieldGenType };
export { getGenTypeLabel, getAllGenTypes };

export type SuffixType = 'none' | 'seq' | 'custom';

interface FieldEditorProps {
  fieldKey: string;
  currentValue: string;
  index: number;
  onApply: (key: string, value: string) => void;
  onClose: () => void;
  genType: FieldGenType;
  suffixType: SuffixType;
  customSuffix: string;
}

export function FieldEditor({
  fieldKey,
  currentValue: _currentValue,
  index,
  onApply,
  onClose,
  genType,
  suffixType,
  customSuffix,
}: FieldEditorProps) {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);

  const currentLocale = useMockStore((s) => s.currentLocale);
  const builtinRules = useMockStore((s) => s.builtinRules);
  const getEnabledBuiltinRules = useMockStore((s) => s.getEnabledBuiltinRules);
  const fieldRules = useMockStore((s) => s.fieldRules);

  const [localGenType, setLocalGenType] = useState<FieldGenType>(genType);
  const [localSuffixType, setLocalSuffixType] = useState<SuffixType>(suffixType);
  const [localCustomSuffix, setLocalCustomSuffix] = useState(customSuffix);
  const [basePreview, setBasePreview] = useState<string>('');
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Get enabled rules for filtering dropdown
  const enabledRules = getEnabledBuiltinRules();
  const allGenTypes = getAllGenTypes();

  // Filter gen types to only show enabled ones
  const availableGenTypes = allGenTypes.filter(t => {
    // 'auto' is always available (it's a mode, not a rule)
    if (t === 'auto') return true;
    // Other rules require builtinRules[t] to be true
    return builtinRules[t] !== false;
  });

  // Generate preview when type, field, or index changes
  useEffect(() => {
    let cancelled = false;
    setIsLoadingPreview(true);

    (async () => {
      const preview = await generateFieldPreview(fieldKey, localGenType, index, {
        locale: currentLocale,
        enabledRules,
        fieldRules: fieldRules.map(r => ({ pattern: r.pattern, fieldType: r.fieldType as FieldGenType, enabled: r.enabled }))
      });
      if (!cancelled) {
        setBasePreview(preview);
        setIsLoadingPreview(false);
      }
    })();

    return () => { cancelled = true; };
  }, [fieldKey, localGenType, index, currentLocale, enabledRules, fieldRules]);

  // Apply suffix to preview
  const getPreviewWithSuffix = useCallback(() => {
    if (isLoadingPreview) return t('field.loading');
    if (!basePreview) return t('field.empty');
    switch (localSuffixType) {
      case 'seq':
        return `${basePreview}_${String(index + 1).padStart(3, '0')}`;
      case 'custom':
        return `${basePreview}${localCustomSuffix}`;
      default:
        return basePreview;
    }
  }, [basePreview, localSuffixType, localCustomSuffix, index, isLoadingPreview]);

  const handleApply = useCallback(() => {
    let finalValue = basePreview;

    // Apply suffix
    switch (localSuffixType) {
      case 'seq':
        finalValue = `${finalValue}_${String(index + 1).padStart(3, '0')}`;
        break;
      case 'custom':
        finalValue = `${finalValue}${localCustomSuffix}`;
        break;
    }

    onApply(fieldKey, finalValue);
  }, [basePreview, localSuffixType, localCustomSuffix, index, fieldKey, onApply]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="rounded-lg p-4 w-80 shadow-xl" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('field.title')}</span>
          <button onClick={onClose} className="text-xs" style={{ color: 'var(--text-muted)' }}>✕</button>
        </div>

        <div className="space-y-3">
          <div>
            <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{t('field.field')}</div>
            <div className="text-sm font-mono px-2 py-1 rounded" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>{fieldKey}</div>
          </div>

          <div>
            <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{t('field.genType')}</div>
            <select
              value={localGenType}
              onChange={e => setLocalGenType(e.target.value as FieldGenType)}
              className="w-full px-2 py-1.5 rounded text-xs"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
            >
              {availableGenTypes.map(type => (
                <option key={type} value={type}>{getGenTypeLabel(type, currentLocale)}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{t('field.suffix')}</div>
            <select
              value={localSuffixType}
              onChange={e => setLocalSuffixType(e.target.value as SuffixType)}
              className="w-full px-2 py-1.5 rounded text-xs"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
            >
              <option value="none">{t('field.suffixNone')}</option>
              <option value="seq">{t('field.suffixSeq')}</option>
              <option value="custom">{t('field.suffixCustom')}</option>
            </select>
          </div>

          {localSuffixType === 'custom' && (
            <div>
              <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{t('field.customSuffix')}</div>
              <input
                type="text"
                value={localCustomSuffix}
                onChange={e => setLocalCustomSuffix(e.target.value)}
                placeholder="@company.com"
                className="w-full px-2 py-1.5 rounded text-xs"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
              />
            </div>
          )}

          <div>
            <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{t('field.preview')}</div>
            <div className="text-xs px-2 py-1.5 rounded font-mono" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--accent)' }}>
              {getPreviewWithSuffix()}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleApply}
              className="flex-1 px-3 py-1.5 rounded text-xs font-medium"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}
            >
              {t('field.apply')}
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded text-xs"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
            >
              {t('field.cancel')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}