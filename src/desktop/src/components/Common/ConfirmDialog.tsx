import { Modal, ModalHeader, ModalFooter, ModalBody } from "./Modal";
import { useTranslation } from "../../utils/i18n";
import { useSettingsStore } from "../../store";

export interface ConfirmDialogProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  destructive = false,
}: ConfirmDialogProps) {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);

  return (
    <Modal isOpen={isOpen} onClose={onCancel} width="w-[350px]">
      <ModalHeader title={title || t('common.confirm')} />
      <ModalBody>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {message}
        </p>
      </ModalBody>
      <ModalFooter>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded text-xs"
          style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-muted)" }}
        >
          {cancelText || t('common.cancel')}
        </button>
        <button
          onClick={onConfirm}
          className="px-3 py-1.5 rounded text-xs"
          style={{
            backgroundColor: destructive ? "var(--danger)" : "var(--accent)",
            color: "var(--text-inverse)",
          }}
        >
          {confirmText || t('common.confirm')}
        </button>
      </ModalFooter>
    </Modal>
  );
}