# Browser Extension Capture - Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Browser extension captures HTTP requests from web pages and displays them in Flare's Builder panel via WebSocket.

**Architecture:**
- Desktop app hosts WebSocket server on port 7890 (receives captured requests)
- Browser extension uses webRequest API to intercept requests, forwards via chrome.runtime.sendMessage to content script
- Content script acts as WebSocket client, connects to desktop app's WebSocket server
- Default interception: chrome.webRequest API (no response body access)
- CDP mode available on-demand when user needs full request/response body capture

**Tech Stack:** TypeScript, Chrome Extension APIs, WebSocket (ws library for desktop app), content script relay

---

## Chunk 1: Extension Shell (manifest + background + WebSocket client)

### Files
- Create: `src/extension/manifest.json`
- Create: `src/extension/background.ts` (service worker - orchestrates capture)
- Create: `src/extension/types.ts`
- Create: `src/extension/content.ts` (WebSocket client - connects to desktop app)

### Steps

- [ ] **Step 1: Create extension manifest**

```json
{
  "manifest_version": 3,
  "name": "Flare Capture",
  "version": "1.0.0",
  "description": "Capture HTTP requests from web pages",
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "run_at": "document_start"
    }
  ],
  "permissions": ["webRequest", "tabs", "nativeMessaging"],
  "host_permissions": ["<all_urls>"]
}
```

- [ ] **Step 2: Create shared types**

```typescript
// src/extension/types.ts
export interface CapturedRequest {
  id: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  timestamp: number;
  requestBody?: string;
}

export const CAPTURE_WS_URL = 'ws://localhost:7890';
```

- [ ] **Step 3: Create content script (WebSocket client)**

```typescript
// src/extension/content.ts
// Content script acts as WebSocket client to desktop app
// Runs in page context, can communicate with background via chrome.runtime.sendMessage

let ws: WebSocket | null = null;
let pendingRequests: any[] = [];
let reconnectTimeout: number | null = null;

function connect() {
  ws = new WebSocket('ws://localhost:7890');

  ws.onopen = () => {
    console.log('[Flare Capture] Connected to desktop app');
    // Send any pending requests
    while (pendingRequests.length > 0) {
      const req = pendingRequests.shift();
      ws?.send(JSON.stringify(req));
    }
  };

  ws.onmessage = (event) => {
    // Could receive commands from desktop app
  };

  ws.onclose = () => {
    ws = null;
    // Reconnect after 3 seconds
    reconnectTimeout = window.setTimeout(connect, 3000);
  };

  ws.onerror = (error) => {
    console.error('[Flare Capture] WebSocket error', error);
  };
}

// Initialize connection
connect();

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CAPTURED_REQUEST') {
    const request = message.data;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(request));
    } else {
      // Queue request if not connected
      pendingRequests.push(request);
    }
  }
  sendResponse({ received: true });
  return true;
});
```

- [ ] **Step 4: Create background service worker (interceptor + relay)**

```typescript
// src/extension/background.ts
import { CapturedRequest, CAPTURE_WS_URL } from './types';

// Interceptor sends captured requests to content script via chrome.runtime.sendMessage
function broadcastRequest(request: CapturedRequest) {
  chrome.runtime.sendMessage({ type: 'CAPTURED_REQUEST', data: request });
}

// Setup webRequest interceptor
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (!details.url.startsWith('http')) return;

    const request: CapturedRequest = {
      id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      method: details.method,
      url: details.url,
      headers: {},
      timestamp: Date.now(),
    };

    broadcastRequest(request);
  },
  { urls: ['<all_urls>'] }
);

// Also capture headers on completed
chrome.webRequest.onCompleted.addListener(
  (details) => {
    const headers: Record<string, string> = {};
    details.responseHeaders?.forEach((h) => {
      if (h.name && h.value) headers[h.name] = h.value;
    });
    // Optionally emit headers update
  },
  { urls: ['<all_urls>'] }
);
```

---

## Chunk 2: Desktop WebSocket Server + Capture Store

### Files
- Create: `src/desktop/src/store/captureStore.ts`
- Create: `src/desktop/src/hooks/useCaptureServer.ts` (WebSocket server hook)
- Create: `src/desktop/src/types/capture.ts`

### Steps

- [ ] **Step 1: Create capture types**

```typescript
// src/desktop/src/types/capture.ts
export interface CapturedRequest {
  id: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  timestamp: number;
  requestBody?: string;
}
```

- [ ] **Step 2: Create capture store (in-memory, session-only)**

```typescript
// src/desktop/src/store/captureStore.ts
import { create } from 'zustand';
import type { CapturedRequest } from '../types/capture';

interface CaptureStore {
  capturedRequests: CapturedRequest[];
  connectedClients: number;
  addCapturedRequest: (request: CapturedRequest) => void;
  clearCapturedRequests: () => void;
  setConnectedClients: (count: number) => void;
}

export const useCaptureStore = create<CaptureStore>((set) => ({
  capturedRequests: [],
  connectedClients: 0,
  addCapturedRequest: (request) =>
    set((state) => ({
      capturedRequests: [request, ...state.capturedRequests].slice(0, 100)
    })),
  clearCapturedRequests: () => set({ capturedRequests: [] }),
  setConnectedClients: (count) => set({ connectedClients: count }),
}));
```

- [ ] **Step 3: Create WebSocket server hook**

```typescript
// src/desktop/src/hooks/useCaptureServer.ts
import { useEffect, useRef } from 'react';
import { WebSocketServer, WebSocket } from 'ws';
import { useCaptureStore } from '../store/captureStore';
import type { CapturedRequest } from '../types/capture';

const CAPTURE_PORT = 7890;

export function useCaptureServer() {
  const wssRef = useRef<WebSocketServer | null>(null);
  const { addCapturedRequest, setConnectedClients } = useCaptureStore();

  useEffect(() => {
    const wss = new WebSocketServer({ port: CAPTURE_PORT });

    wss.on('connection', (ws) => {
      console.log('[Capture] Extension connected');
      setConnectedClients(wss.clients.size);

      ws.on('message', (data) => {
        try {
          const request: CapturedRequest = JSON.parse(data.toString());
          addCapturedRequest(request);
        } catch (e) {
          console.error('[Capture] Failed to parse message', e);
        }
      });

      ws.on('close', () => {
        setConnectedClients(wss.clients.size);
      });
    });

    wss.on('error', (error) => {
      console.error('[Capture] WebSocket server error', error);
    });

    wssRef.current = wss;

    return () => {
      wss.close();
    };
  }, [addCapturedRequest, setConnectedClients]);
}
```

---

## Chunk 3: CapturePanel UI Component

### Files
- Create: `src/desktop/src/components/Capture/CapturePanel.tsx`
- Create: `src/desktop/src/components/Capture/CaptureItem.tsx`
- Modify: `src/desktop/src/components/Request/RequestBuilder.tsx` (add CapturePanel)

### Steps

- [ ] **Step 1: Create CaptureItem component**

```typescript
// src/desktop/src/components/Capture/CaptureItem.tsx
import React from 'react';
import type { CapturedRequest } from '../../types/capture';

interface Props {
  request: CapturedRequest;
  onClick: (request: CapturedRequest) => void;
}

const methodColors: Record<string, { bg: string; color: string }> = {
  GET: { bg: '#61affe', color: '#fff' },
  POST: { bg: '#49cc90', color: '#fff' },
  PUT: { bg: '#fca130', color: '#fff' },
  DELETE: { bg: '#f93e3e', color: '#fff' },
  PATCH: { bg: '#50e3c2', color: '#fff' },
};

export function CaptureItem({ request, onClick }: Props) {
  const colors = methodColors[request.method.toUpperCase()] || { bg: '#6b7280', color: '#fff' };
  const urlObj = new URL(request.url);
  const path = urlObj.pathname + urlObj.search;

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-opacity-50 hover:bg-gray-700 border-b"
      style={{ borderColor: 'var(--border-color)' }}
      onClick={() => onClick(request)}
    >
      <span
        className="px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0"
        style={{ backgroundColor: colors.bg, color: colors.color }}
      >
        {request.method}
      </span>
      <span className="text-xs truncate" style={{ color: 'var(--text-primary)' }}>
        {path}
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Create CapturePanel component**

```typescript
// src/desktop/src/components/Capture/CapturePanel.tsx
import React, { useState } from 'react';
import { useCaptureStore } from '../../store/captureStore';
import { CaptureItem } from './CaptureItem';
import type { CapturedRequest } from '../../types/capture';

interface Props {
  onSelectRequest: (request: CapturedRequest) => void;
}

export function CapturePanel({ onSelectRequest }: Props) {
  const { capturedRequests, connectedClients, clearCapturedRequests } = useCaptureStore();
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (isCollapsed) {
    return (
      <button
        className="px-2 py-1 text-xs rounded"
        style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
        onClick={() => setIsCollapsed(false)}
      >
        抓取 ({capturedRequests.length})
      </button>
    );
  }

  return (
    <div
      className="h-full flex flex-col shrink-0 border-r"
      style={{ width: '280px', borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>抓取的请求</span>
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: connectedClients > 0 ? '#49cc90' : '#6b7280' }}
            title={connectedClients > 0 ? `已连接 (${connectedClients})` : '未连接'}
          />
        </div>
        <div className="flex items-center gap-1">
          <button
            className="px-2 py-1 text-xs rounded hover:bg-opacity-20 hover:bg-gray-500"
            style={{ color: 'var(--text-muted)' }}
            onClick={clearCapturedRequests}
            title="清除"
          >
            清
          </button>
          <button
            className="px-2 py-1 text-xs rounded hover:bg-opacity-20 hover:bg-gray-500"
            style={{ color: 'var(--text-muted)' }}
            onClick={() => setIsCollapsed(true)}
            title="收起"
          >
            ×
          </button>
        </div>
      </div>

      {/* Request List */}
      <div className="flex-1 overflow-y-auto">
        {capturedRequests.length === 0 ? (
          <div className="p-4 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
            暂无抓取的请求
          </div>
        ) : (
          capturedRequests.map((request) => (
            <CaptureItem key={request.id} request={request} onClick={onSelectRequest} />
          ))
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add CapturePanel to RequestBuilder**

In `RequestBuilder.tsx`, add CapturePanel to the left of the main content:

```typescript
// In RequestBuilder.tsx - add import
import { CapturePanel } from '../Capture/CapturePanel';

// Add state for captured requests
const [showCapturePanel, setShowCapturePanel] = useState(true);

// In the JSX, add before the main div:
{showCapturePanel && (
  <CapturePanel
    onSelectRequest={(request) => {
      // Fill request into builder
      setRequestState({
        method: request.method,
        url: request.url,
        headers: Object.entries(request.headers).map(([key, value]) => ({
          key,
          value,
          enabled: true,
        })),
      });
    }}
  />
)}
```

**Note:** Need to also add `setRequestState` to the component props or access via store.

---

## Chunk 4: CDP Mode (Optional Enhancement)

### Files
- Create: `src/extension/cdp.ts` (CDP interceptor)
- Modify: `src/extension/background.ts` (toggle between modes)

### Steps

- [ ] **Step 1: Create CDP interceptor**

```typescript
// src/extension/cdp.ts
import { CapturedRequest } from './types';

export async function enableCDP(targetId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.debugger.attach(targetId, '1.3', () => {
      chrome.debugger.sendCommand(targetId, 'Network.enable', {}, () => {
        chrome.debugger.onEvent.addListener((source, method, params) => {
          if (method === 'Network.requestWillBeSent') {
            // Handle request
          }
        });
        resolve();
      });
    });
  });
}
```

---

## Verification

1. Load unpacked extension in Chrome (`chrome://extensions` → Developer mode → Load unpacked)
2. Open any webpage (e.g., https://jsonplaceholder.typicode.com/users)
3. Verify WebSocket connection is established (check extension popup)
4. Verify requests appear in desktop app's CapturePanel
5. Click request to populate RequestBuilder
6. Verify multiple requests accumulate in the panel
7. Verify clearing works
8. Verify collapse/expand works

---

## Files Summary

### Create (Extension)
- `src/extension/manifest.json`
- `src/extension/background.ts`
- `src/extension/types.ts`
- `src/extension/content.ts`

### Create (Desktop)
- `src/desktop/src/types/capture.ts`
- `src/desktop/src/store/captureStore.ts`
- `src/desktop/src/hooks/useCaptureServer.ts`
- `src/desktop/src/components/Capture/CapturePanel.tsx`
- `src/desktop/src/components/Capture/CaptureItem.tsx`

### Modify (Desktop)
- `src/desktop/src/components/Request/RequestBuilder.tsx`

---

## Dependencies

### Desktop
- `ws` package for WebSocket server: `npm install ws @types/ws`

### Extension
- Standard Chrome Extension APIs only (no external dependencies)