import { useState, useRef, useEffect, useCallback } from "react";
import { useClickOutside } from "../../hooks/common/useClickOutside";
import { useSettingsStore } from "../../store";
import { useTranslation } from "../../utils/i18n";

interface UseVariableAutocompleteProps {
  currentEnv: Record<string, string>;
}

export function useVariableAutocomplete({ currentEnv }: UseVariableAutocompleteProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionList, setSuggestionList] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear blur timeout on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  // Clear blur timeout when suggestions are shown
  const clearBlurTimeout = useCallback(() => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
  }, []);

  // Hide suggestions after a delay (for blur event)
  const hideSuggestionsDelayed = useCallback(() => {
    clearBlurTimeout();
    blurTimeoutRef.current = setTimeout(() => {
      setShowSuggestions(false);
      blurTimeoutRef.current = null;
    }, 150);
  }, [clearBlurTimeout]);

  const envKeys = Object.keys(currentEnv);

  const getSuggestions = (text: string): string[] => {
    if (!text) return envKeys;
    const lastBrace = text.lastIndexOf('{{');
    const lastBraceClose = text.lastIndexOf('}}');
    if (lastBrace > lastBraceClose) {
      const partial = text.slice(lastBrace + 2).toLowerCase();
      return envKeys.filter(k => k.toLowerCase().startsWith(partial));
    }
    return [];
  };

  const insertVariable = (inputEl: HTMLInputElement | HTMLTextAreaElement, variable: string) => {
    const text = inputEl.value;
    const cursorPos = inputEl.selectionStart || 0;
    const lastBrace = text.lastIndexOf('{{', cursorPos);
    const lastBraceClose = text.lastIndexOf('}}', cursorPos);

    let newText: string;
    let newCursorPos: number;

    if (lastBrace > lastBraceClose) {
      // Inside an unclosed brace, replace partial
      newText = text.slice(0, lastBrace) + `{{${variable}}}` + text.slice(cursorPos);
      newCursorPos = lastBrace + variable.length + 4;
    } else {
      // Not inside braces, insert at cursor
      newText = text.slice(0, cursorPos) + `{{${variable}}}` + text.slice(cursorPos);
      newCursorPos = cursorPos + variable.length + 4;
    }

    inputEl.value = newText;
    inputEl.setSelectionRange(newCursorPos, newCursorPos);
    inputEl.focus();
    setShowSuggestions(false);
    return newText;
  };

  useClickOutside(containerRef, () => setShowSuggestions(false));

  const handleInputChange = (text: string) => {
    const suggestions = getSuggestions(text);
    setSuggestionList(suggestions);
    setShowSuggestions(suggestions.length > 0);
  };

  return {
    containerRef,
    showSuggestions,
    suggestionList,
    getSuggestions,
    insertVariable,
    handleInputChange,
    setShowSuggestions,
    clearBlurTimeout,
    hideSuggestionsDelayed,
  };
}

interface VariableSuggestionsProps {
  suggestions: string[];
  onSelect: (variable: string) => void;
  onClose: () => void;
}

export function VariableSuggestions({ suggestions, onSelect, onClose }: VariableSuggestionsProps) {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);

  if (suggestions.length === 0) return null;

  return (
    <div className="absolute left-0 top-full mt-1 p-1 rounded shadow-lg z-50 w-48 max-h-40 overflow-y-auto" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
      <div className="text-[10px] px-2 py-1" style={{ color: 'var(--text-muted)' }}>{t('env.environmentVariables')}</div>
      {suggestions.map(k => (
        <button
          key={k}
          onMouseDown={(e) => { e.preventDefault(); onSelect(k); }}
          className="w-full text-left px-2 py-1 text-xs rounded hover:opacity-80"
          style={{ backgroundColor: 'transparent', color: 'var(--accent)' }}
        >
          {`{{${k}}}`}
        </button>
      ))}
      <button onMouseDown={(e) => { e.preventDefault(); onClose(); }} className="w-full text-left px-2 py-1 text-[10px] rounded" style={{ color: 'var(--text-muted)' }}>
        {t('common.close')}
      </button>
    </div>
  );
}