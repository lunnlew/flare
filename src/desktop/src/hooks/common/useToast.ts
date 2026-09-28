import { useCallback } from 'react';
import { useNotificationStore } from '../../store';

/**
 * Hook for accessing toast notification function.
 * Reduces boilerplate of importing toast directly in each file.
 *
 * Usage:
 *   const toast = useToast();
 *   toast.show('Saved!');
 *   toast.show('Failed to save', 'error');
 */
export function useToast() {
  const showToast = useNotificationStore((s) => s.showToast);

  const success = useCallback(
    (message: string, duration?: number) => showToast(message, 'success', duration),
    [showToast]
  );

  const error = useCallback(
    (message: string, duration?: number) => showToast(message, 'error', duration),
    [showToast]
  );

  const info = useCallback(
    (message: string, duration?: number) => showToast(message, 'info', duration),
    [showToast]
  );

  return {
    show: showToast,
    success,
    error,
    info,
  };
}