/**
 * MockConfig RulesPanel - 规则管理面板
 */
import { useState } from "react";
import { useMockStore, type FieldRule, type CommonRule } from "../../store/mockStore";
import { useSettingsStore } from "../../store";
import { getAllGenTypes, getGenTypeLabel, type FieldGenType } from "../../utils/mock";
import { RuleRow } from "./MockConfig.RuleRow";
import { useTranslation } from "../../utils/i18n";

interface AddRuleFormProps {
  nameValue: string;
  onNameChange: (v: string) => void;
  typeValue: string;
  onTypeChange: (v: string) => void;
  fieldTypes: string[];
  onSave: () => void;
  onCancel: () => void;
  namePlaceholder?: string;
}

function AddRuleForm({ nameValue, onNameChange, typeValue, onTypeChange, fieldTypes, onSave, onCancel, namePlaceholder }: AddRuleFormProps) {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);

  return (
    <div className="flex items-center gap-2 p-2 rounded" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
      <input
        type="text"
        value={nameValue}
        onChange={e => onNameChange(e.target.value)}
        placeholder={namePlaceholder || t('mock.ruleNamePlaceholder')}
        className="flex-1 px-2 py-1 rounded text-xs"
        style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
      />
      <select
        value={typeValue}
        onChange={e => onTypeChange(e.target.value)}
        className="px-2 py-1 rounded text-xs"
        style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
      >
        {fieldTypes.map(t => <option key={t} value={t}>{getGenTypeLabel(t as FieldGenType, 'zh-CN')}</option>)}
      </select>
      <button onClick={onSave} className="px-1.5 py-1 rounded text-xs" style={{ backgroundColor: 'var(--success)', color: 'var(--text-inverse)' }}>✓</button>
      <button onClick={onCancel} className="px-1.5 py-1 rounded text-xs" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>✕</button>
    </div>
  );
}

function PatternRuleRow({ rule, fieldTypes, isEditing, onEdit, onSave, onCancel, onDelete, onUpdate, editingValue }: {
  rule: FieldRule;
  fieldTypes: string[];
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onUpdate: (updates: Partial<FieldRule>) => void;
  editingValue: FieldRule | null;
}) {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);

  return (
    <div className="flex items-center gap-2 p-2 rounded" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      {isEditing && editingValue ? (
        <>
          <input
            type="text"
            value={editingValue.pattern || ''}
            onChange={e => onUpdate({ pattern: e.target.value })}
            className="flex-1 px-2 py-1 rounded text-xs"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
          />
          <select
            value={editingValue.fieldType}
            onChange={e => onUpdate({ fieldType: e.target.value as FieldGenType })}
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
            /{rule.pattern}/
          </span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>→</span>
          <span className="text-xs" style={{ color: 'var(--text-primary)' }}>
            {getGenTypeLabel(rule.fieldType as FieldGenType, 'zh-CN')}
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

export function RulesPanel() {
  const builtinRules = useMockStore((s) => s.builtinRules);
  const commonRules = useMockStore((s) => s.commonRules);
  const fieldRules = useMockStore((s) => s.fieldRules);
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);

  const setBuiltinRuleEnabled = useMockStore((s) => s.setBuiltinRuleEnabled);
  const resetBuiltinRules = useMockStore((s) => s.resetBuiltinRules);
  const addCommonRule = useMockStore((s) => s.addCommonRule);
  const updateCommonRule = useMockStore((s) => s.updateCommonRule);
  const removeCommonRule = useMockStore((s) => s.removeCommonRule);
  const addFieldRule = useMockStore((s) => s.addFieldRule);
  const updateFieldRule = useMockStore((s) => s.updateFieldRule);
  const removeFieldRule = useMockStore((s) => s.removeFieldRule);

  const [showAddCommon, setShowAddCommon] = useState(false);
  const [showAddField, setShowAddField] = useState(false);
  const [editingCommon, setEditingCommon] = useState<CommonRule | null>(null);
  const [editingField, setEditingField] = useState<FieldRule | null>(null);
  const [newCommonName, setNewCommonName] = useState("");
  const [newCommonType, setNewCommonType] = useState("name");
  const [newFieldPattern, setNewFieldPattern] = useState("");
  const [newFieldType, setNewFieldType] = useState("name");
  const [showBuiltinRules, setShowBuiltinRules] = useState(true);

  const allGenTypes = getAllGenTypes();
  const fieldTypes = allGenTypes.filter(t => t !== 'auto' && t !== 'sequence' && t !== 'random' && t !== 'nullify');

  const handleToggleBuiltinRule = (type: FieldGenType) => {
    setBuiltinRuleEnabled(type, !builtinRules[type]);
  };

  const handleAddCommon = () => {
    if (!newCommonName.trim()) return;
    addCommonRule({
      id: `common_${Date.now()}`,
      name: newCommonName.trim(),
      targetType: newCommonType,
      enabled: true,
    });
    setNewCommonName("");
    setNewCommonType("name");
    setShowAddCommon(false);
  };

  const handleSaveCommon = () => {
    if (!editingCommon) return;
    updateCommonRule(editingCommon.id, {
      name: editingCommon.name,
      targetType: editingCommon.targetType,
    });
    setEditingCommon(null);
  };

  const handleAddField = () => {
    if (!newFieldPattern.trim()) return;
    addFieldRule({
      id: `field_${Date.now()}`,
      pattern: newFieldPattern.trim(),
      fieldType: newFieldType as FieldGenType,
      enabled: true,
    });
    setNewFieldPattern("");
    setNewFieldType("name");
    setShowAddField(false);
  };

  const handleSaveField = () => {
    if (!editingField) return;
    updateFieldRule(editingField.id, {
      pattern: editingField.pattern,
      fieldType: editingField.fieldType,
    });
    setEditingField(null);
  };

  return (
    <div className="p-4 space-y-6">
      {/* Builtin Rules */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium flex items-center gap-2">
            <span>📋</span>
            <span>{t('mock.builtinRules')}</span>
            <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
              {Object.values(builtinRules).filter(Boolean).length}/{Object.keys(builtinRules).length}
            </span>
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowBuiltinRules(!showBuiltinRules)}
              className="text-xs px-2 py-1 rounded"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
            >
              {showBuiltinRules ? t('mock.hide') : t('mock.show')}
            </button>
            <button
              onClick={resetBuiltinRules}
              className="text-xs px-2 py-1 rounded"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
              title={t('mock.resetToDefault')}
            >
              ↺
            </button>
          </div>
        </div>

        {showBuiltinRules && (
          <div className="grid grid-cols-3 gap-1 p-2 rounded" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            {allGenTypes.map(type => (
              <label
                key={type}
                className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-[var(--bg-tertiary)]"
              >
                <input
                  type="checkbox"
                  checked={builtinRules[type] ?? true}
                  onChange={() => handleToggleBuiltinRule(type)}
                  className="sr-only"
                />
                <div
                  className="w-4 h-4 rounded flex items-center justify-center text-xs"
                  style={{
                    backgroundColor: builtinRules[type] ? 'var(--accent)' : 'var(--bg-tertiary)',
                    color: builtinRules[type] ? 'var(--text-inverse)' : 'var(--text-muted)'
                  }}
                >
                  {builtinRules[type] ? '✓' : '✕'}
                </div>
                <span className="text-xs" style={{ color: builtinRules[type] ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                  {getGenTypeLabel(type, 'zh-CN')}
                </span>
              </label>
            ))}
          </div>
        )}
      </section>

      {/* Custom Rules */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium flex items-center gap-2">
          <span>📝</span>
          <span>{t('mock.customRules')}</span>
          <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
            {commonRules.length}
          </span>
        </h2>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {t('mock.customRules.description')}
        </p>

        <div className="space-y-2">
          {commonRules.map(rule => (
            <RuleRow
              key={rule.id}
              rule={rule}
              fieldTypes={fieldTypes}
              isEditing={editingCommon?.id === rule.id}
              onEdit={() => setEditingCommon(rule)}
              onSave={handleSaveCommon}
              onCancel={() => setEditingCommon(null)}
              onDelete={() => removeCommonRule(rule.id)}
              onUpdate={(updates) => setEditingCommon({ ...editingCommon, ...updates } as CommonRule)}
              editingValue={editingCommon}
            />
          ))}
          {commonRules.length === 0 && (
            <div className="text-xs text-center py-3" style={{ color: 'var(--text-muted)' }}>
              {t('mock.noCustomRules')}
            </div>
          )}
        </div>

        {showAddCommon ? (
          <AddRuleForm
            nameValue={newCommonName}
            onNameChange={setNewCommonName}
            typeValue={newCommonType}
            onTypeChange={setNewCommonType}
            fieldTypes={fieldTypes}
            onSave={handleAddCommon}
            onCancel={() => { setShowAddCommon(false); setNewCommonName(""); }}
            namePlaceholder={t('mock.ruleNamePlaceholder')}
          />
        ) : (
          <button
            onClick={() => setShowAddCommon(true)}
            className="px-3 py-1.5 text-xs rounded"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}
          >
            + {t('mock.addCustomRule')}
          </button>
        )}
      </section>

      {/* Field Match Rules */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium flex items-center gap-2">
          <span>🔍</span>
          <span>{t('mock.fieldMatchRules')}</span>
          <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
            {fieldRules.length}
          </span>
        </h2>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {t('mock.fieldMatchRules.description')}
        </p>

        <div className="space-y-2">
          {fieldRules.map(rule => (
            <PatternRuleRow
              key={rule.id}
              rule={rule}
              fieldTypes={fieldTypes}
              isEditing={editingField?.id === rule.id}
              onEdit={() => setEditingField(rule)}
              onSave={handleSaveField}
              onCancel={() => setEditingField(null)}
              onDelete={() => removeFieldRule(rule.id)}
              onUpdate={(updates) => setEditingField({ ...editingField, ...updates } as FieldRule)}
              editingValue={editingField}
            />
          ))}
          {fieldRules.length === 0 && (
            <div className="text-xs text-center py-3" style={{ color: 'var(--text-muted)' }}>
              {t('mock.noFieldMatchRules')}
            </div>
          )}
        </div>

        {showAddField ? (
          <AddRuleForm
            nameValue={newFieldPattern}
            onNameChange={setNewFieldPattern}
            typeValue={newFieldType}
            onTypeChange={setNewFieldType}
            fieldTypes={fieldTypes}
            onSave={handleAddField}
            onCancel={() => { setShowAddField(false); setNewFieldPattern(""); }}
            namePlaceholder={t('mock.patternPlaceholder')}
          />
        ) : (
          <button
            onClick={() => setShowAddField(true)}
            className="px-3 py-1.5 text-xs rounded"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}
          >
            + {t('mock.addFieldMatchRule')}
          </button>
        )}
      </section>
    </div>
  );
}
