/**
 * Notification Store - Toast notifications and dialogs
 *
 * Key Patterns:
 * 1. Separate store for global notifications
 * 2. Actions for showing/hiding toasts and dialogs
 * 3. NOT persisted - temporary UI state
 */

import { create } from 'zustand';
import { logger } from '../utils/logger';

const uiLogger = logger.child('ui');

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

export interface DialogState {
  isOpen: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface NotificationState {
  toasts: Toast[];
  dialog: DialogState;
}

interface NotificationActions {
  showToast: (message: string, type?: ToastType, duration?: number) => string;
  hideToast: (id: string) => void;
  clearToasts: () => void;
  showDialog: (options: Omit<DialogState, 'isOpen'>) => void;
  hideDialog: () => void;
  confirm: () => void;
  cancel: () => void;
}

type NotificationStore = NotificationState & NotificationActions;

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  toasts: [],
  dialog: { isOpen: false },

  showToast: (message, type = 'info', duration = 3000) => {
    // Log errors to unified logging system
    if (type === 'error') {
      uiLogger.error(message);
    }

    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const toast: Toast = { id, message, type, duration };

    set((state) => ({ toasts: [...state.toasts, toast] }));

    if (duration > 0) {
      setTimeout(() => {
        get().hideToast(id);
      }, duration);
    }

    return id;
  },

  hideToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  clearToasts: () => set({ toasts: [] }),

  showDialog: (options) => {
    set({ dialog: { ...options, isOpen: true } });
  },

  hideDialog: () => {
    set({ dialog: { isOpen: false } });
  },

  confirm: () => {
    const { dialog } = get();
    if (dialog.onConfirm) {
      dialog.onConfirm();
    }
    set({ dialog: { isOpen: false } });
  },

  cancel: () => {
    const { dialog } = get();
    if (dialog.onCancel) {
      dialog.onCancel();
    }
    set({ dialog: { isOpen: false } });
  },
}));

// Convenience selectors
export const useToasts = () => useNotificationStore((s) => s.toasts);
export const useDialog = () => useNotificationStore((s) => s.dialog);

// Convenience actions
export const toast = {
  success: (message: string, duration?: number) => useNotificationStore.getState().showToast(message, 'success', duration),
  error: (message: string, duration?: number) => useNotificationStore.getState().showToast(message, 'error', duration),
  info: (message: string, duration?: number) => useNotificationStore.getState().showToast(message, 'info', duration),
};