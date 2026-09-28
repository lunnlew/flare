import { useState, useEffect, useCallback } from "react";
import { Modal, ModalHeader, ModalFooter, ModalBody } from "./Modal";
import { Spinner } from "./Spinner";
import { useSettingsStore } from "../../store";
import { useTranslation } from "../../utils/i18n";
import type { RequestState } from "../../store";

export interface SaveDialogProps {
  isOpen: boolean;
  requestState: RequestState;
  savedRequestId: string | null;
  onSave: (name: string) => void;
  onDelete: () => void;
  onClose: () => void;
  isSaving?: boolean;
}

export function SaveDialog({
  isOpen,
  requestState,
  savedRequestId,
  onSave,
  onDelete,
  onClose,
  isSaving = false,
}: SaveDialogProps) {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);

  const [name, setName] = useState("");

  useEffect(() => {
    if (isOpen) {
      setName(
        requestState.url
          .split("?")[0]
          .split("/")
          .pop() || ""
      );
    }
  }, [isOpen, requestState.url]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") onClose();
      if (e.key === "Enter" && name.trim()) onSave(name.trim());
    },
    [isOpen, onClose, onSave, name]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} width="w-[400px]">
      <ModalHeader title={savedRequestId ? t('request.updateRequest') : t('request.saveRequest')} />
      <ModalBody className="space-y-3">
        <div>
          <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>
            {t('request.requestName')}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('request.inputRequestName')}
            className="w-full px-3 py-1.5 rounded text-sm"
            style={{
              backgroundColor: "var(--bg-secondary)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-color)",
            }}
            autoFocus
          />
        </div>
        <div className="text-xs" style={{ color: "var(--text-muted)" }}>
          <div>
            {t('request.method')} <span style={{ color: "var(--accent)" }}>{requestState.method}</span>
          </div>
          <div className="truncate">URL: {requestState.url || t('request.urlNone')}</div>
        </div>
      </ModalBody>
      <ModalFooter>
        {savedRequestId && (
          <button
            onClick={() => {
              onClose();
              onDelete();
            }}
            className="px-3 py-1.5 rounded text-xs mr-auto"
            style={{ backgroundColor: "var(--color-red)", color: "var(--text-inverse)" }}
          >
            {t('common.delete')}
          </button>
        )}
        <button
          onClick={onClose}
          className="px-3 py-1.5 rounded text-xs"
          style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-muted)" }}
          disabled={isSaving}
        >
          {t('common.cancel')}
        </button>
        <button
          onClick={() => {
            if (name.trim()) onSave(name.trim());
          }}
          className="px-3 py-1.5 rounded text-xs flex items-center gap-1.5"
          style={{ backgroundColor: "var(--accent)", color: "var(--text-inverse)" }}
          disabled={isSaving}
        >
          {isSaving &&<Spinner size="sm" />}
          {isSaving ? t('request.saving') : (savedRequestId ? t('request.update') : t('request.save'))}
        </button>
      </ModalFooter>
    </Modal>
  );
}