import React, { useState, useRef } from "react";
import {
  useFlowVariableAutocomplete,
  FlowVariableSuggestions,
  VariableSuggestion,
} from "./useFlowVariableAutocomplete";

interface FlowVariableInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  currentEnv: Record<string, string>;
  multiline?: boolean;
  rows?: number;
  className?: string;
}

/**
 * Input component with Flow variable autocomplete support
 * Automatically triggers variable suggestions when user types {{
 */
export function FlowVariableInput({
  value,
  onChange,
  placeholder = "{{nodeId.field}}",
  currentEnv,
  multiline = false,
  rows = 2,
  className = "",
}: FlowVariableInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  const {
    showSuggestions,
    suggestionList,
    handleInputChange,
    insertVariable,
    setShowSuggestions,
  } = useFlowVariableAutocomplete({ currentEnv });

  const handleChange = (newValue: string) => {
    onChange(newValue);
    handleInputChange(newValue);
  };

  const handleSelectVariable = (suggestion: VariableSuggestion) => {
    if (inputRef.current) {
      handleChange(insertVariable(inputRef.current as HTMLInputElement, suggestion));
    }
  };

  const inputProps = {
    value,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      handleChange(e.target.value),
    onFocus: () => setIsFocused(true),
    onBlur: () => setTimeout(() => setShowSuggestions(false), 150),
    placeholder,
    className,
  };

  return (
    <div className="relative">
      {multiline ? (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          {...inputProps}
          rows={rows}
          className={`w-full px-2 py-1.5 rounded text-xs font-mono ${className}`}
          style={{
            backgroundColor: "var(--bg-primary)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-color)",
            resize: "vertical",
          }}
        />
      ) : (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="text"
          {...inputProps}
          className={`w-full px-2 py-1.5 rounded text-xs font-mono ${className}`}
          style={{
            backgroundColor: "var(--bg-primary)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-color)",
          }}
        />
      )}
      {showSuggestions && isFocused && suggestionList.length > 0 && (
        <FlowVariableSuggestions
          suggestions={suggestionList}
          onSelect={handleSelectVariable}
          onClose={() => setShowSuggestions(false)}
        />
      )}
    </div>
  );
}