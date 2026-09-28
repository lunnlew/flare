import { useState, useCallback, useEffect } from "react";

export type ToastType = "success" | "error" | "info";

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

export interface ToastOptions {
  duration?: number;
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info", options: ToastOptions = {}) => {
    const duration = options.duration ?? 3000;
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }

    return id;
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return {
    toasts,
    showToast,
    hideToast,
    clearToasts,
    success: (message: string, options?: ToastOptions) => showToast(message, "success", options),
    error: (message: string, options?: ToastOptions) => showToast(message, "error", options),
    info: (message: string, options?: ToastOptions) => showToast(message, "info", options),
  };
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onHide: (id: string) => void;
}

export function ToastContainer({ toasts, onHide }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2"
      role="status"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="px-4 py-2 rounded-lg shadow-lg text-sm cursor-pointer"
          role="alert"
          style={{
            backgroundColor:
              toast.type === "error"
                ? "var(--color-red)"
                : toast.type === "success"
                ? "var(--color-green)"
                : "var(--accent)",
            color: "var(--text-inverse)",
          }}
          onClick={() => onHide(toast.id)}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}

interface ToastProps {
  message: string;
  type?: ToastType;
  onClose?: () => void;
}

export function Toast({ message, type = "info", onClose }: ToastProps) {
  useEffect(() => {
    if (onClose) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [onClose]);

  return (
    <div
      className="px-4 py-2 rounded-lg shadow-lg text-sm"
      style={{
        backgroundColor:
          type === "error" ? "var(--color-red)" : type === "success" ? "var(--color-green)" : "var(--accent)",
        color: "var(--text-inverse)",
      }}
    >
      {message}
    </div>
  );
}