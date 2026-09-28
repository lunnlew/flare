/**
 * MockConfig RuleRow - 规则行组件
 */
import { useTranslation } from "../../utils/i18n";
import { useSettingsStore } from "../../store";
import { getGenTypeLabel, type FieldGenType } from "../../utils/mock";

interface RuleRowProps {
  rule: { id: string; name: string; targetType: string; enabled: boolean };
  fieldTypes: string[];
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onUpdate: (updates: { name?: string; targetType?: string }) => void;
  editingValue: { name?: string; pattern?: string; targetType: string } | null;
  isPattern?: boolean;
}

export function RuleRow({ rule, fieldTypes, isEditing, onEdit, onSave, onCancel, onDelete, onUpdate, editingValue, isPattern }: RuleRowProps) {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);

  return (
    <div className="flex items-center gap-2 p-2 rounded" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      {isEditing && editingValue ? (
        <>
          <input
            type="text"
            value={editingValue.name || ''}
            onChange={e => onUpdate({ name: e.target.value })}
            className="flex-1 px-2 py-1 rounded text-xs"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
          />
          <select
            value={editingValue.targetType}
            onChange={e => onUpdate({ targetType: e.target.value })}
            className="px-2 py-1 rounded text-xs"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
          >
            {fieldTypes.map(t => <option key={t} value={t}>{getGenTypeLabel(t as FieldGenType, 'zh-CN')}</option>)}
          </select>
          <button onClick={onSave} className="px-1.5 py-1 rounded text-xs" style={{ backgroundColor: 'var(--success)', color: 'var(--text-inverse)' }}>✓</button>
          <button onClick={onCancel} className="px-1.5 py-1 rounded text-xs" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>✕</button>
        </>
      ) : (
        <>
          <span className="px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: 'var(--accent-muted)', color: 'var(--accent)' }}>
            {isPattern ? `/${rule.name}/` : rule.name}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>→</span>
          <span className="text-xs" style={{ color: 'var(--text-primary)' }}>
            {getGenTypeLabel(rule.targetType as FieldGenType, 'zh-CN')}
          </span>
          <div className="flex gap-1 ml-auto">
            <button onClick={onEdit} className="p-1 rounded" style={{ color: 'var(--text-muted)' }} title={t('mock.edit')}>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.2325.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
            </button>
            <button onClick={onDelete} className="p-1 rounded" style={{ color: 'var(--danger)' }} title={t('common.delete')}>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
