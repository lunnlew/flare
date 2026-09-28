import { useEffect, useCallback, ReactNode, useId } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  width?: string;
  className?: string;
  titleId?: string;
}

/**
 * Base Modal component with common overlay and styling.
 * Provides backdrop, keyboard handling (Escape to close), and click-outside-to-close.
 */
export function Modal({
  isOpen,
  onClose,
  children,
  width = "w-[350px]",
  className = "",
  titleId,
}: ModalProps) {
  const headingId = useId();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") onClose();
    },
    [isOpen, onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId || headingId}
    >
      <div
        className={`rounded-lg shadow-xl ${width} ${className}`}
        style={{ backgroundColor: "var(--bg-primary)", border: "1px solid var(--border-color)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Modal header component with title and optional border.
 */
export function ModalHeader({
  title,
  borderBottom = true,
  id,
}: {
  title: string;
  borderBottom?: boolean;
  id?: string;
}) {
  return (
    <div
      className="p-4"
      id={id}
      style={{
        color: "var(--text-primary)",
        borderBottom: borderBottom ? "1px solid var(--border-color)" : undefined,
      }}
    >
      <h3 className="text-sm font-medium">{title}</h3>
    </div>
  );
}

/**
 * Modal footer component with action buttons.
 */
export function ModalFooter({
  children,
  borderTop = true,
}: {
  children: ReactNode;
  borderTop?: boolean;
}) {
  return (
    <div
      className="p-4 flex justify-end gap-2"
      style={{
        borderTop: borderTop ? "1px solid var(--border-color)" : undefined,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Modal body component.
 */
export function ModalBody({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`p-4 ${className}`}>{children}</div>;
}