import { CapturedRequest, CAPTURE_WS_URL } from './types';

let ws: WebSocket | null = null;
let pendingRequests: CapturedRequest[] = [];
let reconnectAttempts = 0;
let reconnectTimeoutId: number | null = null;
const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_RECONNECT_DELAY = 1000;
const MAX_QUEUE_SIZE = 100;

// Config message type
interface CaptureConfig {
  enabled: boolean;
  allowedDomains: string[];
  excludePatterns: string[];
}

function getReconnectDelay(attempt: number): number {
  return Math.min(BASE_RECONNECT_DELAY * Math.pow(2, attempt), 30000);
}

function connect() {
  // Prevent duplicate connections
  if (ws?.readyState === WebSocket.OPEN) {
    return;
  }
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error('[Flare Capture] Max reconnection attempts reached');
    return;
  }

  ws = new WebSocket(CAPTURE_WS_URL);

  ws.onopen = () => {
    reconnectAttempts = 0;
    // Request config from desktop when connected
    ws?.send(JSON.stringify({ type: 'GET_CONFIG' }));
    // Flush pending requests
    while (pendingRequests.length > 0) {
      const req = pendingRequests.shift();
      if (req) {
        ws?.send(JSON.stringify({ type: 'CAPTURED_REQUEST', data: req }));
      }
    }
    // Also request latest config from background
    requestConfigFromBackground();
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === 'CAPTURE_CONFIG' && msg.data) {
        // Received config from desktop, forward to background script to save
        const config: CaptureConfig = msg.data;
        sendConfigToBackground(config);
      }
    } catch (e) {
      console.error('[Flare Capture] Failed to parse message', e);
    }
  };

  ws.onerror = (error) => {
    console.error('[Flare Capture] WebSocket error:', error);
  };

  ws.onclose = () => {
    ws = null;
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      const delay = getReconnectDelay(reconnectAttempts);
      reconnectAttempts++;
      reconnectTimeoutId = window.setTimeout(connect, delay);
    }
  };
}

// Send config to background with retry
function sendConfigToBackground(config: CaptureConfig) {
  chrome.runtime.sendMessage({ type: 'UPDATE_CAPTURE_CONFIG', data: config }, (response) => {
    if (chrome.runtime.lastError) {
      console.warn('[Flare Capture] Background unavailable:', chrome.runtime.lastError.message);
    }
  });
}

// Request config from background (for initial load)
function requestConfigFromBackground() {
  chrome.runtime.sendMessage({ type: 'GET_CAPTURE_CONFIG' }, (response) => {
    if (chrome.runtime.lastError) {
      console.warn('[Flare Capture] Background unavailable:', chrome.runtime.lastError.message);
    } else if (response?.config) {
      console.debug('[Flare Capture] Config received from background');
    }
  });
}

// Initial connection
connect();

// Cleanup on page unload
window.addEventListener('unload', () => {
  if (ws) {
    ws.close();
    ws = null;
  }
  if (reconnectTimeoutId !== null) {
    clearTimeout(reconnectTimeoutId);
    reconnectTimeoutId = null;
  }
  reconnectAttempts = 0;
  pendingRequests = [];
});

// Listen for messages from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CAPTURED_REQUEST') {
    const request: CapturedRequest = message.data;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'CAPTURED_REQUEST', data: request }));
    } else {
      // Immutable update: keep last MAX_QUEUE_SIZE items
      pendingRequests = [...pendingRequests, request].slice(-MAX_QUEUE_SIZE);
    }
  }
  sendResponse({ received: true });
  return true;
});