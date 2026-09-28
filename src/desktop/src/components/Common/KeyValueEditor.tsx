import { useState, useRef, useCallback } from "react";
import { useVariableAutocomplete, VariableSuggestions } from "./useVariableAutocomplete";
import { KeyValue } from "../../constants/http";
import { useDescriptionExpansion } from "../../hooks/common/useDescriptionExpansion";
import { useSettingsStore } from "../../store";
import { useTranslation } from "../../utils/i18n";

export interface KeyValueEditorRow {
  key: string;
  value: string;
  enabled: boolean;
  locked?: boolean;
  isFile?: boolean;
  file?: File;
}

export interface KeyValueEditorProps {
  items: KeyValue[];
  onChange: (items: KeyValue[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  currentEnv?: Record<string, string>;
  addButtonText?: string;
  lockable?: boolean;
  actions?: React.ReactNode;
  keyInputClassName?: string;
  valueInputClassName?: string;
  showDescription?: boolean; // 新增：是否显示描述列
  showTypeIndicator?: boolean; // 显示类型指示器 (如 ParamsPanel 中的 emoji)
  getTypeInfo?: (key: string) => { label: string; emoji: string } | null; // 获取类型信息
  onSmartGenerate?: () => void; //智能生成回调
  smartGenerateLabel?: string; // 智能生成按钮文字
}

export function KeyValueEditor({
  items,
  onChange,
  keyPlaceholder = "Key",
  valuePlaceholder = "Value",
  currentEnv = {},
  addButtonText = "+ Add",
  lockable = true,
  actions,
  keyInputClassName = "",
  valueInputClassName = "",
  showDescription = false, // 默认不显示描述
  showTypeIndicator = false,
  getTypeInfo,
  onSmartGenerate,
  smartGenerateLabel = "Generate",
}: KeyValueEditorProps) {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);

  const [focusedInput, setFocusedInput] = useState<number | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { expandedDescriptions, toggleDescription } = useDescriptionExpansion();

  const { containerRef, showSuggestions, suggestionList, handleInputChange, insertVariable, setShowSuggestions } =
    useVariableAutocomplete({ currentEnv });

  const addItem = useCallback(() => {
    onChange([...items, { key: "", value: "", enabled: true }]);
  }, [items, onChange]);

  const removeItem = useCallback(
    (i: number) => {
      onChange(items.filter((_, idx) => idx !== i));
    },
    [items, onChange]
  );

  const updateItem = useCallback(
    (i: number, field: keyof KeyValue, v: string | boolean) => {
      const n = [...items];
      n[i] = { ...n[i], [field]: v };
      onChange(n);
    },
    [items, onChange]
  );

  return (
    <div ref={containerRef} className="relative">
      {items.map((item, i) => (
        <div key={i} className="flex flex-col">
          <div className="flex items-center gap-1.5 py-1">
            {lockable && (
              <button
                onClick={() => updateItem(i, "locked", !item.locked)}
                className={`w-5 h-5 flex items-center justify-center rounded text-xs ${
                  item.locked ? "bg-amber-500" : "bg-var(--bg-tertiary)"
                }`}
                style={{ color: item.locked ? 'var(--text-inverse)' : 'var(--text-muted)' }}
                title={item.locked ? t('common.unlock') : t('common.lock')}
              >
                {item.locked ? "🔒" : "🔓"}
              </button>
            )}
            <input
              type="checkbox"
              checked={item.enabled}
              onChange={(e) => updateItem(i, "enabled", e.target.checked)}
              className="w-3.5 h-3.5 rounded"
            />
            <div className="flex-1 relative">
              <input
                type="text"
                value={item.key}
                onChange={(e) => {
                  updateItem(i, "key", e.target.value);
                  handleInputChange(e.target.value);
                }}
                onFocus={() => {
                  setFocusedInput(i);
                  handleInputChange(item.key);
                }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder={keyPlaceholder}
                className={`w-full px-2 py-1 rounded text-xs ${keyInputClassName}`}
                style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }}
                ref={(el) => {
                  inputRefs.current[i] = el;
                }}
              />
              {showSuggestions && focusedInput === i && suggestionList.length > 0 && (
                <VariableSuggestions
                  suggestions={suggestionList}
                  onSelect={(v) => {
                    updateItem(i, "key", insertVariable(inputRefs.current[i]!, v));
                  }}
                  onClose={() => setShowSuggestions(false)}
                />
              )}
              {showTypeIndicator && item.key && getTypeInfo?.(item.key) && (
                <span className="text-xs ml-1" title={`${item.key} → ${getTypeInfo(item.key)?.label}`}>
                  {getTypeInfo(item.key)?.emoji}
                </span>
              )}
            </div>
            <div className="flex-1 relative">
              <input
                type="text"
                value={item.value}
                onChange={(e) => {
                  updateItem(i, "value", e.target.value);
                  handleInputChange(e.target.value);
                }}
                onFocus={() => {
                  setFocusedInput(i + 1000);
                  handleInputChange(item.value);
                }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder={valuePlaceholder}
                className={`w-full px-2 py-1 rounded text-xs ${valueInputClassName}`}
                style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }}
                ref={(el) => {
                  inputRefs.current[i + 1000] = el;
                }}
              />
              {showSuggestions && focusedInput === i + 1000 && suggestionList.length > 0 && (
                <VariableSuggestions
                  suggestions={suggestionList}
                  onSelect={(v) => {
                    updateItem(i, "value", insertVariable(inputRefs.current[i + 1000]!, v));
                  }}
                  onClose={() => setShowSuggestions(false)}
                />
              )}
            </div>
            {showDescription && (
              <button
                onClick={() => toggleDescription(i)}
                className="w-5 h-5 flex items-center justify-center rounded text-xs"
                style={{
                  backgroundColor: expandedDescriptions.has(i) || item.description ? "var(--accent)" : "var(--bg-tertiary)",
                  color: expandedDescriptions.has(i) || item.description ? "var(--text-inverse)" : "var(--text-muted)"
                }}
                title={item.description ? t('common.description') : t('common.addDescription')}
              >
                📝
              </button>
            )}
            <button
              onClick={() => removeItem(i)}
              className="p-1 text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              ✕
            </button>
          </div>
          {showDescription && expandedDescriptions.has(i) && (
            <div className="flex items-center gap-1.5 py-1 pl-6">
              <span className="text-xs" style={{ color: "var(--text-muted)", minWidth: "50px" }}>{t('common.description')}:</span>
              <input
                type="text"
                value={item.description || ""}
                onChange={(e) => updateItem(i, "description", e.target.value)}
                placeholder={t('common.description')}
                className="flex-1 px-2 py-0.5 rounded text-xs"
                style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }}
              />
            </div>
          )}
        </div>
      ))}
      <div className="flex items-center gap-2 mt-1">
        <button onClick={addItem} className="text-xs" style={{ color: "var(--accent)" }}>
          {addButtonText}
        </button>
        {onSmartGenerate && (
          <button
            onClick={onSmartGenerate}
            className="px-2 py-0.5 text-[10px] rounded"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}
          >
            {smartGenerateLabel}
          </button>
        )}
        {actions}
      </div>
    </div>
  );
}