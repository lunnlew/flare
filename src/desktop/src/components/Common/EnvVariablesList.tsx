import { useState, useCallback } from "react";
import { InputModal } from "./InputModal";
import { useSettingsStore } from "../../store";
import { useTranslation } from "../../utils/i18n";
import type { EnvVariable } from "../../types/api";

interface EnvVariableWithGroup extends EnvVariable {
  group?: string;
}

interface EnvVariablesListProps {
  variables: EnvVariable[];
  onUpdateVariable: (key: string, value: string) => void;
  onDeleteVariable: (key: string) => void;
  onToggleEnabled?: (key: string, enabled: boolean) => void;
  readOnly?: boolean;
  showGroup?: boolean;
  inheritedKeys?: Set<string>;
}

// Check if a variable key suggests it's a sensitive value
function isSensitiveKey(key: string): boolean {
  const sensitivePatterns = [
    'password', 'passwd', 'pwd', 'secret', 'token', 'api_key', 'apikey',
    'auth', 'credential', 'private', 'access', 'bearer', 'jwt'
  ];
  const lowerKey = key.toLowerCase();
  return sensitivePatterns.some(p => lowerKey.includes(p));
}

export function EnvVariablesList({
  variables,
  onUpdateVariable,
  onDeleteVariable,
  onToggleEnabled,
  readOnly = false,
  showGroup = false,
  inheritedKeys = new Set()
}: EnvVariablesListProps) {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);

  // Track which sensitive values are hidden
  const [hiddenValues, setHiddenValues] = useState<Set<string>>(new Set());

  // Toggle visibility of a specific variable's value
  const toggleHidden = useCallback((key: string) => {
    setHiddenValues(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

   // Check if value should be hidden (sensitive key + user toggled to hide)
  const isValueHidden = useCallback((key: string): boolean => {
    if (!hiddenValues.has(key) && !isSensitiveKey(key)) return false;
    return hiddenValues.has(key);
  }, [hiddenValues]);

  // Detect duplicate keys
  const duplicateKeys = useCallback(() => {
    const keys = variables.map(v => v.key.toLowerCase());
    const seen = new Set<string>();
    const duplicates = new Set<string>();
    for (const key of keys) {
      if (seen.has(key)) {
        duplicates.add(key);
      }
      seen.add(key);
    }
    return duplicates;
  }, [variables]);

  const duplicates = duplicateKeys();

   return (
    <div className="space-y-1">
      {duplicates.size > 0 && (
        <div className="flex items-center gap-2 px-2 py-1.5 rounded text-xs" style={{ backgroundColor: 'rgba(248, 113, 113, 0.1)', color: 'var(--danger)' }}>
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          <span>{t('env.duplicateVarName')}: {Array.from(duplicates).join(', ')}</span>
        </div>
      )}
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{t('env.variablesLabel')}</span>
        {variables.some(v => isSensitiveKey(v.key)) && (
          <button
            onClick={() => {
              // Toggle all sensitive values visibility
              const allSensitive = variables.filter(v => isSensitiveKey(v.key));
              const allHidden = allSensitive.every(v => hiddenValues.has(v.key));
              setHiddenValues(prev => {
                const next = new Set(prev);
                allSensitive.forEach(v => {
                  if (allHidden) {
                    next.delete(v.key);
                  } else {
                    next.add(v.key);
                  }
                });
                return next;
              });
            }}
            className="px-1.5 py-0.5 text-[10px] rounded"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
            title={t('env.toggleSensitive')}
          >
            {variables.some(v => hiddenValues.has(v.key)) ? t('env.showAll') : t('env.hideAll')}
          </button>
        )}
      </div>
      {variables.map((v) => {
        const variable = v as EnvVariableWithGroup;
        const isInherited = inheritedKeys.has(variable.key);
        const isEnabled = variable.enabled !== false;
        const sensitive = isSensitiveKey(variable.key);
        const hidden = isValueHidden(variable.key);
        return (
          <div key={variable.key} className="flex items-center gap-2 py-1" style={{ opacity: isEnabled ? 1 : 0.5 }}>
            {!readOnly && onToggleEnabled && (
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={e => onToggleEnabled(variable.key, e.target.checked)}
                className="w-3 h-3"
              />
            )}
            {isInherited && (
              <span className="text-[10px] px-1 rounded" style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }} title={t('env.inherited')}>{t('env.inherited')}</span>
            )}
            {showGroup && variable.group && (
              <span className="px-1 py-0.5 rounded text-[10px]" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
                {variable.group}
              </span>
            )}
            <span
              className="w-24 text-xs font-mono truncate"
              style={{ color: duplicates.has(variable.key.toLowerCase()) ? 'var(--danger)' : 'var(--accent)' }}
              title={duplicates.has(variable.key.toLowerCase()) ? t('env.duplicateVarName') : undefined}
            >{variable.key}</span>
            <div className="flex-1 relative">
              <input
                type={hidden ? 'password' : 'text'}
                value={hidden ? '••••••••' : variable.value}
                onChange={e => !hidden && onUpdateVariable(variable.key, e.target.value)}
                className="w-full px-2 py-1 rounded text-xs"
                style={{ backgroundColor: 'var(--bg-secondary)', color: hidden ? 'var(--text-muted)' : 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                disabled={readOnly}
              />
            </div>
            {sensitive && (
              <button
                onClick={() => toggleHidden(variable.key)}
                className="px-1.5 py-0.5 text-[10px] rounded"
                style={{ backgroundColor: hidden ? 'var(--warning)' : 'var(--bg-tertiary)', color: hidden ? 'var(--text-inverse)' : 'var(--text-muted)' }}
                title={hidden ? t('env.showAll') : t('env.hideAll')}
              >
                {hidden ? '🙈' : '👁'}
              </button>
            )}
            {!readOnly && !isInherited && (
              <button onClick={() => onDeleteVariable(variable.key)} className="px-1 py-0.5 text-xs" style={{ color: 'var(--danger)' }}>{t('env.delete')}</button>
            )}
                   </div>
        );
      })}
      {variables.length === 0 && (
        <div className="text-xs py-4 text-center" style={{ color: 'var(--text-muted)' }}>
          {t('env.noVariables')}
        </div>
      )}
    </div>
  );
}

interface AddVariableModalProps {
  isOpen: boolean;
  onConfirm: (key: string) => void;
  onCancel: () => void;
  existingKeys?: string[];
}

export function AddVariableModal({ isOpen, onConfirm, onCancel, existingKeys = [] }: AddVariableModalProps) {
  const [error, setError] = useState<string>("");
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);

  const handleConfirm = (key: string) => {
    const trimmedKey = key.trim();
    if (!trimmedKey) {
      setError(t('env.emptyKeyName'));
      return;
    }
    if (existingKeys.some(k => k.toLowerCase() === trimmedKey.toLowerCase())) {
      setError(t('env.keyExists'));
      return;
    }
    if (!/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(trimmedKey)) {
      setError(t('env.invalidKeyName'));
      return;
    }
    setError("");
    onConfirm(trimmedKey);
  };

  return (
    <>
      <InputModal
        isOpen={isOpen}
        title={t('env.addVariableTitle')}
        placeholder={t('env.variableName')}
        confirmText={t('env.addVariable')}
        onConfirm={handleConfirm}
        onCancel={() => { setError(""); onCancel(); }}
      />
      {error && (
        <div className="text-xs text-center mt-2" style={{ color: 'var(--danger)' }}>
          {error}
        </div>
      )}
    </>
  );
}