# Browser Extension Capture - Design Document

## Overview

A browser extension that captures HTTP requests made when opening a web page, and displays them in the Flare desktop application's Builder panel as a front-facing list.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Browser Extension (Extension)                          │
│  ┌─────────────┐  ┌─────────────┐                       │
│  │ webRequest  │  │    CDP      │  ← Two interception │
│  │   API      │  │  Protocol   │    modes               │
│  └──────┬──────┘  └──────┬──────┘                       │
│         │                │                              │
│         └───────┬────────┘                              │
│                 ▼                                       │
│         ┌──────────────┐                                │
│         │ WebSocket    │  ws://localhost:7890           │
│         │   Server     │                                │
│         └──────────────┘                                │
└─────────────────┬───────────────────────────────────────┘
                  │ Real-time push of captured requests
                  ▼
┌─────────────────────────────────────────────────────────┐
│  Desktop App (Flare) │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  WebSocket   │→ │  Capture     │→ │ Request      │  │
│  │   Client │  │   Store     │  │   Panel      │  │
│  └──────────────┘  └──────────────┘  └───────────────┘  │
│                                                        │
│  [Captured Requests Panel] ← Standalone panel, left │
└────────────────────────────────────────────────────────┘
```

## Components

| Component | Responsibility |
|-----------|----------------|
| `CaptureService` (extension) | Manage interceptors, format request data |
| `WebSocketServer` (extension) | Port 7890, broadcast captured requests |
| `CapturedRequest` (shared type) | `{ id, method, url, headers, timestamp }` |
| `WebSocketClient` (desktop) | Connect to extension, receive requests |
| `captureStore` (desktop) | In-memory storage for session captures |
| `CapturePanel` (desktop) | Left panel showing/selecting requests |

## Data Flow

1. Page发起 HTTP 请求
2. 扩展拦截 (webRequest 或 CDP)
3. 格式化为 `CapturedRequest`
4. 通过 WebSocket 发送到桌面应用
5. 桌面应用存入 `captureStore`
6. `CapturePanel` 渲染列表
7. 用户点击请求 → 填充到 `RequestBuilder`

## Capture Modes

### Mode B: chrome.webRequest API (Default)
- Standard browser extension API
- Can intercept all HTTP/HTTPS requests
- **Limitation**: Cannot access response body (privacy restriction)
- Suitable for most use cases

### Mode A: Chrome DevTools Protocol (CDP)
- Requires user to enable Chrome debugging port
- More complete information including request/response body
- Activated on-demand when user needs body content

## Port Configuration

- Default port: `7890`
- Configurable: in both extension settings and desktop app settings
- Detection: Desktop app attempts connection on startup, shows prompt if failed

## Data Types

```typescript
interface CapturedRequest {
  id: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  timestamp: number;
  requestBody?: string;
  responseBody?: string; // Only available in CDP mode
}
```

## Panel Location

- Standalone panel on the left side of RequestBuilder
- Collapsible with toggle button
- Shows captured requests in reverse chronological order
- Each item displays: method badge + URL path + timestamp

## Persistence

- Session-only: cleared on app close
- No persistence to storage

## Files to Create/Modify

### Extension Side
- `src/extension/manifest.json` - Extension manifest
- `src/extension/background.ts` - Service worker, WebSocket server
- `src/extension/interceptors/webRequest.ts` - webRequest API interceptor
- `src/extension/interceptors/cdp.ts` - CDP interceptor
- `src/extension/types.ts` - Shared types

### Desktop Side
- `src/desktop/src/store/captureStore.ts` - In-memory capture store
- `src/desktop/src/components/Capture/CapturePanel.tsx` - UI panel
- `src/desktop/src/components/Capture/CaptureItem.tsx` - List item
- `src/desktop/src/hooks/useCaptureWebSocket.ts` - WebSocket client hook
- `src/desktop/src/types/capture.ts` - Type definitions

## Implementation Phases

### Phase 1: Extension Shell
- Create extension with manifest.json
- Basic WebSocket server on port 7890
- Hardcoded test data broadcast

### Phase 2: webRequest Interception
- Implement chrome.webRequest listener
- Format and broadcast captured requests

### Phase 3: Desktop Integration
- WebSocket client in desktop app
- captureStore state management
- CapturePanel UI component

### Phase 4: CDP Mode (Optional Enhancement)
- CDP connection manager
- Toggle between modes based on user needs

## Verification

1. Load unpacked extension in Chrome
2. Open any webpage
3. Verify requests appear in desktop app's CapturePanel
4. Click request to populate RequestBuilder