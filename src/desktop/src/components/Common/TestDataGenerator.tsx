import { GeneratorType } from "../../constants/http";
import { useSettingsStore } from "../../store";
import { useTranslation } from "../../utils/i18n";

interface TestDataGeneratorProps {
  onApply: () => void;
  onClose: () => void;
  getPreview: () => string;
  genType: GeneratorType;
  setGenType: (t: GeneratorType) => void;
  genPrefix: string;
  setGenPrefix: (v: string) => void;
  seqStart: number;
  setSeqStart: (v: number) => void;
  fillEmptyOnly: boolean;
  setFillEmptyOnly: (v: boolean) => void;
}

export function TestDataGenerator({
  onApply,
  onClose,
  getPreview,
  genType,
  setGenType,
  genPrefix,
  setGenPrefix,
  seqStart,
  setSeqStart,
  fillEmptyOnly,
  setFillEmptyOnly,
}: TestDataGeneratorProps) {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);

  const genLabels: Record<GeneratorType, string> = {
    sequence: t('generator.sequence'),
    random: t('generator.random'),
    date: t('generator.date'),
    uuid: t('generator.uuid'),
    nullify: t('generator.nullify')
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-1">
        {(Object.keys(genLabels) as GeneratorType[]).map(key => (
          <button
            key={key}
            onClick={() => setGenType(key)}
            className="px-2 py-1 text-[10px] rounded text-left"
            style={genType === key ? { backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' } : { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
          >
            {genLabels[key]}
          </button>
        ))}
      </div>
      {genType === 'sequence' && (
        <div className="flex gap-1">
          <input
            type="text"
            value={genPrefix}
            onChange={e => setGenPrefix(e.target.value)}
            placeholder={t('generator.prefix')}
            className="flex-1 px-2 py-1 rounded text-[10px]"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
          />
          <input
            type="number"
            value={seqStart}
            onChange={e => setSeqStart(parseInt(e.target.value) || 1)}
            className="w-16 px-2 py-1 rounded text-[10px]"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
          />
        </div>
      )}
      {genType === 'random' && (
        <input
          type="text"
          value={genPrefix}
          onChange={e => setGenPrefix(e.target.value)}
          placeholder={t('generator.optionalPrefix')}
          className="w-full px-2 py-1 rounded text-[10px]"
          style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
        />
      )}
      <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
        {t('generator.preview').replace('{preview}', getPreview())}
      </div>
      <label className="flex items-center gap-1 cursor-pointer">
        <input
          type="checkbox"
          checked={fillEmptyOnly}
          onChange={e => setFillEmptyOnly(e.target.checked)}
          className="w-3 h-3 rounded"
        />
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{t('generator.fillEmptyOnly')}</span>
      </label>
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onApply()}
          className="flex-1 px-2 py-1 rounded text-[10px]"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}
        >
          {t('generator.apply')}
        </button>
        <button
          onClick={onClose}
          className="px-2 py-1 rounded text-[10px]"
          style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
        >
          {t('generator.close')}
        </button>
      </div>
    </div>
  );
}