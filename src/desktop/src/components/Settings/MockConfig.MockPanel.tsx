/**
 * MockConfig MockPanel - 响应模拟配置面板
 */
import { useState } from "react";
import { useDynamicMockStore, type DynamicMockRule, type ResponseCustomRule } from "../../store/dynamicMockStore";
import { useSettingsStore, useNotificationStore } from "../../store";
import { toast } from "../../store/notificationStore";
import { getAllGenTypes, getGenTypeLabel, type FieldGenType } from "../../utils/mock";
import { Spinner } from "../Common/Spinner";
import { useTranslation } from "../../utils/i18n";

export function MockPanel() {
  const rules = useDynamicMockStore((s) => s.rules);
  const isEnabled = useDynamicMockStore((s) => s.isEnabled);
  const customRules = useDynamicMockStore((s) => s.customRules);
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);

  const setEnabled = useDynamicMockStore((s) => s.setEnabled);
  const addRule = useDynamicMockStore((s) => s.addRule);
  const updateRule = useDynamicMockStore((s) => s.updateRule);
  const deleteRule = useDynamicMockStore((s) => s.deleteRule);
  const addCustomRule = useDynamicMockStore((s) => s.addCustomRule);
  const updateCustomRule = useDynamicMockStore((s) => s.updateCustomRule);
  const removeCustomRule = useDynamicMockStore((s) => s.removeCustomRule);

  const showDialog = useNotificationStore((s) => s.showDialog);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [showCustomRules, setShowCustomRules] = useState(true);

  const [formName, setFormName] = useState("");
  const [formPathPattern, setFormPathPattern] = useState("");
  const [formMethod, setFormMethod] = useState<string[]>([]);
  const [formBodyTemplate, setFormBodyTemplate] = useState('{"message": "Hello {{name}}"}');
  const [formStatusCode, setFormStatusCode] = useState(200);
  const [formDelay, setFormDelay] = useState(0);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  const [showAddCustomRule, setShowAddCustomRule] = useState(false);
  const [editingCustomRule, setEditingCustomRule] = useState<ResponseCustomRule | null>(null);
  const [newCustomRuleVar, setNewCustomRuleVar] = useState("");
  const [newCustomRuleType, setNewCustomRuleType] = useState("email");

  const allGenTypes = getAllGenTypes();
  const fieldTypes = allGenTypes.filter(t => t !== 'auto' && t !== 'sequence' && t !== 'random' && t !== 'nullify');

  const toggleMethod = (m: string) => {
    setFormMethod(prev =>
      prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]
    );
  };

  const handleToggleEnabled = () => setEnabled(!isEnabled);

  const handleAddRule = () => {
    if (!formName.trim()) return;
    setSaveStatus('saving');
    addRule({
      name: formName.trim(),
      enabled: true,
      trigger: {
        pathPattern: formPathPattern || undefined,
        method: formMethod.length > 0 ? formMethod as any : undefined,
      },
      response: {
        statusCode: formStatusCode,
        bodyTemplate: formBodyTemplate,
        delay: formDelay,
      },
      variables: [],
    });
    resetForm();
    setShowAddForm(false);
    setSaveStatus('success');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const handleUpdateRule = (id: string) => {
    setSaveStatus('saving');
    updateRule(id, {
      name: formName,
      trigger: {
        pathPattern: formPathPattern || undefined,
        method: formMethod.length > 0 ? formMethod as any : undefined,
      },
      response: {
        statusCode: formStatusCode,
        bodyTemplate: formBodyTemplate,
        delay: formDelay,
      },
    });
    setEditingRuleId(null);
    resetForm();
    setSaveStatus('success');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const handleDeleteRule = (id: string) => {
    showDialog({
      title: t('mock.deleteRule'),
      message: t('mock.confirmDeleteRule'),
      confirmText: t('common.delete'),
      destructive: true,
      onConfirm: () => {
        deleteRule(id);
        toast.success(t('mock.ruleDeleted'));
      },
    });
  };

  const startEdit = (rule: DynamicMockRule) => {
    setFormName(rule.name);
    setFormPathPattern(rule.trigger.pathPattern || "");
    setFormMethod(rule.trigger.method || []);
    setFormBodyTemplate(rule.response.bodyTemplate);
    setFormStatusCode(rule.response.statusCode);
    setFormDelay(rule.response.delay || 0);
    setEditingRuleId(rule.id);
    setShowAddForm(true);
  };

  const resetForm = () => {
    setFormName("");
    setFormPathPattern("");
    setFormMethod([]);
    setFormBodyTemplate('{"message": "Hello {{name}}"}');
    setFormStatusCode(200);
    setFormDelay(0);
  };

  const handleAddCustomRule = () => {
    if (!newCustomRuleVar.trim()) return;
    addCustomRule({
      id: `resp_custom_${Date.now()}`,
      variable: newCustomRuleVar.trim(),
      targetType: newCustomRuleType as FieldGenType,
      enabled: true,
    });
    setNewCustomRuleVar("");
    setNewCustomRuleType("email");
    setShowAddCustomRule(false);
  };

  const handleSaveCustomRule = () => {
    if (!editingCustomRule) return;
    updateCustomRule(editingCustomRule.id, {
      variable: editingCustomRule.variable,
      targetType: editingCustomRule.targetType,
    });
    setEditingCustomRule(null);
  };

  return (
    <div className="p-4 space-y-4">
      {/* Enable Toggle */}
      <div className="flex items-center justify-between p-3 rounded border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
        <div>
          <div className="text-sm font-medium">{t('mock.responseMock')}</div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {t('mock.responseMock.description')}
          </div>
        </div>
        <button
          onClick={handleToggleEnabled}
          className="px-3 py-1.5 rounded text-xs font-medium"
          style={isEnabled ? { backgroundColor: 'var(--success)', color: 'var(--text-inverse)' } : { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
        >
          {isEnabled ? t('common.enabled') : t('common.disabled')}
        </button>
      </div>

      {/* Response Custom Rules */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium flex items-center gap-2">
            <span>📝</span>
            <span>{t('mock.templateVariableRules')}</span>
            <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
              {customRules.length}
            </span>
          </h2>
          <button
            onClick={() => setShowCustomRules(!showCustomRules)}
            className="text-xs px-2 py-1 rounded"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
          >
            {showCustomRules ? t('mock.hide') : t('mock.show')}
          </button>
        </div>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {t('mock.templateVariableRules.description')}
        </p>

        {showCustomRules && (
          <>
            <div className="space-y-2">
              {customRules.map(rule => (
                <div
                  key={rule.id}
                  className="flex items-center gap-2 p-2 rounded"
                  style={{ backgroundColor: 'var(--bg-secondary)' }}
                >
                  {editingCustomRule?.id === rule.id ? (
                    <>
                      <input
                        type="text"
                        value={editingCustomRule.variable}
                        onChange={e => setEditingCustomRule({ ...editingCustomRule, variable: e.target.value })}
                        className="flex-1 px-2 py-1 rounded text-xs"
                        style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                      />
                      <select
                        value={editingCustomRule.targetType}
                        onChange={e => setEditingCustomRule({ ...editingCustomRule, targetType: e.target.value as FieldGenType })}
                        className="px-2 py-1 rounded text-xs"
                        style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                      >
                        {fieldTypes.map(t => <option key={t} value={t}>{getGenTypeLabel(t as FieldGenType, 'zh-CN')}</option>)}
                      </select>
                      <button onClick={handleSaveCustomRule} className="px-1.5 py-1 rounded text-xs" style={{ backgroundColor: 'var(--success)', color: 'var(--text-inverse)' }}>✓</button>
                      <button onClick={() => setEditingCustomRule(null)} className="px-1.5 py-1 rounded text-xs" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>✕</button>
                    </>
                  ) : (
                    <>
                      <span className="px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: 'var(--accent-muted)', color: 'var(--accent)' }}>
                        {`{{${rule.variable}}}`}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>→</span>
                      <span className="text-xs" style={{ color: 'var(--text-primary)' }}>
                        {getGenTypeLabel(rule.targetType as FieldGenType, 'zh-CN')}
                      </span>
                      <div className="flex gap-1 ml-auto">
                        <button onClick={() => setEditingCustomRule(rule)} className="p-1 rounded" style={{ color: 'var(--text-muted)' }} title={t('mock.edit')}>
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                        <button onClick={() => removeCustomRule(rule.id)} className="p-1 rounded" style={{ color: 'var(--danger)' }} title={t('common.delete')}>
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {customRules.length === 0 && (
                <div className="text-xs text-center py-3" style={{ color: 'var(--text-muted)' }}>
                  {t('mock.noTemplateVariableRules')}
                </div>
              )}
            </div>

            {showAddCustomRule ? (
              <div className="flex items-center gap-2 p-2 rounded" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                <input type="text" value={newCustomRuleVar} onChange={e => setNewCustomRuleVar(e.target.value)} placeholder={t('mock.variableName')} className="flex-1 px-2 py-1 rounded text-xs" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} />
                <select value={newCustomRuleType} onChange={e => setNewCustomRuleType(e.target.value)} className="px-2 py-1 rounded text-xs" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
                  {fieldTypes.map(t => <option key={t} value={t}>{getGenTypeLabel(t as FieldGenType, 'zh-CN')}</option>)}
                </select>
                <button onClick={handleAddCustomRule} className="px-1.5 py-1 rounded text-xs" style={{ backgroundColor: 'var(--success)', color: 'var(--text-inverse)' }}>✓</button>
                <button onClick={() => { setShowAddCustomRule(false); setNewCustomRuleVar(""); }} className="px-1.5 py-1 rounded text-xs" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>✕</button>
              </div>
            ) : (
              <button onClick={() => setShowAddCustomRule(true)} className="px-3 py-1.5 text-xs rounded" style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}>
                + {t('mock.addTemplateVariableRule')}
              </button>
            )}
          </>
        )}
      </section>

      {/* Dynamic Mock Rules */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium flex items-center gap-2">
            <span>📋</span>
            <span>{t('mock.responseRules')} ({rules.length})</span>
          </h2>
          <button onClick={() => { resetForm(); setShowAddForm(true); }} className="px-2 py-1 rounded text-xs" style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}>
            + {t('mock.newRule')}
          </button>
        </div>

        {rules.length === 0 ? (
          <div className="text-center py-8 text-xs" style={{ color: 'var(--text-muted)' }}>
            {t('mock.noResponseRules')}
          </div>
        ) : (
          <div className="space-y-2">
            {rules.map(rule => (
              <div key={rule.id} className="p-3 rounded border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{rule.name}</span>
                    {!rule.enabled && <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>{t('mock.disabled')}</span>}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(rule)} className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>{t('mock.edit')}</button>
                    <button onClick={() => handleDeleteRule(rule.id)} className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: 'var(--danger)', color: 'var(--text-inverse)' }}>{t('common.delete')}</button>
                  </div>
                </div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {rule.trigger.method?.join(' | ') || 'ALL'} {rule.trigger.pathPattern || '(any path)'}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Add/Edit Form */}
      {showAddForm && (
        <section className="p-4 rounded border space-y-4" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
          <h3 className="text-sm font-medium">{editingRuleId ? t('mock.editRule') : t('mock.newRule')}</h3>

          <div className="space-y-1">
            <label className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('mock.ruleNameLabel')}</label>
            <input type="text" value={formName} onChange={e => setFormName(e.target.value)} placeholder={t('mock.ruleNamePlaceholder2')} className="w-full px-2 py-1.5 rounded text-xs" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} />
          </div>

          <div className="space-y-1">
            <label className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('mock.requestMethod')}</label>
            <div className="flex gap-1 flex-wrap">
              {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map(m => (
                <button key={m} onClick={() => toggleMethod(m)} className="px-2 py-1 rounded text-xs" style={formMethod.includes(m) ? { backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' } : { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>{m}</button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('mock.pathMatch')}</label>
            <input type="text" value={formPathPattern} onChange={e => setFormPathPattern(e.target.value)} placeholder={t('mock.pathMatchPlaceholder')} className="w-full px-2 py-1.5 rounded text-xs" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('mock.statusCode')}</label>
              <input type="number" value={formStatusCode} onChange={e => setFormStatusCode(parseInt(e.target.value) || 200)} className="w-full px-2 py-1.5 rounded text-xs" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} />
            </div>
            <div className="space-y-1">
              <label className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('mock.delay')}</label>
              <input type="number" value={formDelay} onChange={e => setFormDelay(parseInt(e.target.value) || 0)} className="w-full px-2 py-1.5 rounded text-xs" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('mock.responseTemplate')}</label>
            <textarea value={formBodyTemplate} onChange={e => setFormBodyTemplate(e.target.value)} rows={4} className="w-full px-2 py-1.5 rounded text-xs font-mono" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} />
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {t('mock.responseTemplate.description')}
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button onClick={() => { setShowAddForm(false); setEditingRuleId(null); resetForm(); }} className="px-3 py-1.5 rounded text-xs" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>{t('common.cancel')}</button>
            <button onClick={() => editingRuleId ? handleUpdateRule(editingRuleId) : handleAddRule()} disabled={saveStatus === 'saving'} className="px-3 py-1.5 rounded text-xs flex items-center justify-center gap-1.5 w-14" style={{
              backgroundColor: saveStatus === 'success' ? 'var(--success)' : saveStatus === 'error' ? 'var(--danger)' : 'var(--accent)',
              color: saveStatus === 'success' || saveStatus === 'error' ? 'var(--text-inverse)' : 'var(--text-inverse)',
            }}>
              {saveStatus === 'saving' && <Spinner size="sm" />}
              {saveStatus === 'success' && '✓'}
              {saveStatus === 'error' && '✕'}
              {(saveStatus === 'idle') && (editingRuleId ? t('common.save') : t('mock.add'))}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
