import { useEffect, useRef } from 'react';
import { useCaptureStore } from '../../store/captureStore';
import { useSettingsStore } from '../../store';
import type { CapturedRequest } from '../../types/capture';
import { CAPTURE_WS_URL } from '@shared/constants';

export function useCaptureServer() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const storeRef = useRef(useCaptureStore.getState);
  const settingsRef = useRef(useSettingsStore.getState);

  // Send capture config to server
  const sendCaptureConfig = (ws: WebSocket) => {
    const captureSettings = settingsRef.current().captureSettings;
    const configMsg = JSON.stringify({
      type: 'CAPTURE_CONFIG',
      data: captureSettings,
    });
    ws.send(configMsg);
  };

  // Note: Empty dependency array is intentional - we use refs to avoid
  // re-subscribing on every store change, and manage reconnection manually
  useEffect(() => {
    // Prevent multiple concurrent connections
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    function connect() {
      const ws = new WebSocket(CAPTURE_WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectAttempts.current = 0;
        storeRef.current().setConnectedClients(1);
        sendCaptureConfig(ws);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'CAPTURED_REQUEST' && msg.data) {
            const request: CapturedRequest = msg.data;
            const existing = storeRef.current().capturedRequests.find(r => r.id === request.id);
            if (!existing) {
              storeRef.current().addCapturedRequest(request);
            }
          }
        } catch (e) {
          console.error('[Capture] Failed to parse message', e);
        }
      };

      ws.onclose = () => {
        storeRef.current().setConnectedClients(0);
        if (reconnectAttempts.current < maxReconnectAttempts) {
          // Clear any existing timeout before setting a new one
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          reconnectAttempts.current++;
          reconnectTimeoutRef.current = window.setTimeout(connect, delay);
        }
      };

      ws.onerror = (error) => {
        console.error('[Capture] WebSocket error', error);
        storeRef.current().setConnectedClients(0);
      };
    }

    connect();

    // Subscribe to captureSettings changes and re-send config when they change
    let prevCaptureSettings = settingsRef.current().captureSettings;
    const unsubscribe = useSettingsStore.subscribe((state) => {
      if (state.captureSettings !== prevCaptureSettings) {
        prevCaptureSettings = state.captureSettings;
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'CAPTURE_CONFIG',
            data: state.captureSettings,
          }));
        }
      }
    });

    return () => {
      unsubscribe();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);
}