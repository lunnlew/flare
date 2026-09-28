import { useState } from "react";
import { useTranslation } from "../../utils/i18n";
import { useSettingsStore } from "../../store";

interface InputModalProps {
  isOpen: boolean;
  title: string;
  placeholder?: string;
  defaultValue?: string;
  confirmText?: string;
  showInput?: boolean;
  onConfirm: (value: string) => void;
  onCancel: () => void;
  children?: React.ReactNode;
}

export function InputModal({
  isOpen,
  title,
  placeholder = "",
  defaultValue = "",
  confirmText = "Confirm",
  showInput = true,
  onConfirm,
  onCancel,
  children
}: InputModalProps) {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);
  const [value, setValue] = useState(defaultValue);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (showInput && !value.trim()) return;
    onConfirm(value.trim());
    if (showInput) setValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleConfirm();
    if (e.key === "Escape") onCancel();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onCancel}
      />
      {/* Modal */}
      <div
        className="relative p-4 rounded-lg shadow-xl w-80"
        style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
        onKeyDown={handleKeyDown}
      >
        <div className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
          {title}
        </div>
        {showInput && (
          <input
            type="text"
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder={placeholder}
            autoFocus
            className="w-full px-3 py-2 rounded text-xs mb-3"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
          />
        )}
        {children}
        {showInput && (
          <div className="flex justify-end gap-2">
            <button
              onClick={onCancel}
              className="px-3 py-1.5 rounded text-xs"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleConfirm}
              className="px-3 py-1.5 rounded text-xs"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}
            >
              {confirmText}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}