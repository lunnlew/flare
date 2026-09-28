import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/Common/ErrorBoundary";
import "./styles/globals.css";

// Theme is initialized in index.html inline script to avoid flash

// ============================================================================
// Global Error Handlers
// ============================================================================

// Helper to check if running in Tauri
const isTauri = () => {
  return typeof window !== 'undefined' && '__TAURI__' in window;
};

// Uncaught JavaScript errors
window.onerror = (message, source, lineno, colno, error) => {
  const errorMessage = error instanceof Error ? error.message : String(message);
  const stack = error instanceof Error ? error.stack : undefined;

  console.error(`[Global Error] ${errorMessage}`, {
    source,
    lineno,
    colno,
    stack,
  });

  // Try to emit to backend logger if available
  if (isTauri()) {
    import("@tauri-apps/api/core")
      .then(({ invoke }) => {
        invoke("emit_log", {
          level: "error",
          message: `Uncaught error: ${errorMessage}`,
          category: "app:crash",
          correlation_id: null,
          data: { source, lineno, colno, stack },
        }).catch((e) => console.error('[Tauri] emit_log failed:', e));
      })
      .catch((e) => console.error('[Tauri] emit_log failed:', e));
  }

  // Return true to prevent the default browser error handling
  return true;
};

// Unhandled promise rejections
window.onunhandledrejection = (event) => {
  const reason = event.reason;
  const errorMessage = reason instanceof Error ? reason.message : String(reason);
  const stack = reason instanceof Error ? reason.stack : undefined;

  console.error(`[Unhandled Rejection] ${errorMessage}`, { stack });

  // Try to emit to backend logger if available
  if (isTauri()) {
    import("@tauri-apps/api/core")
      .then(({ invoke }) => {
        invoke("emit_log", {
          level: "error",
          message: `Unhandled promise rejection: ${errorMessage}`,
          category: "app:crash",
          correlation_id: null,
          data: { stack },
        }).catch((e) => console.error('[Tauri] emit_log failed:', e));
      })
      .catch((e) => console.error('[Tauri] emit_log failed:', e));
  }
};

// Global fetch error handler (for API errors not caught by individual handlers)
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  try {
    const response = await originalFetch(...args);

    // Log non-ok responses as warnings (not all errors are actual errors)
    if (!response.ok && response.status >= 400) {
      console.warn(`[Fetch] HTTP ${response.status} ${response.statusText}`, {
        url: args[0],
        status: response.status,
      });
    }

    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Fetch] Network error: ${errorMessage}`, { url: args[0] });
    throw error;
  }
};

// ============================================================================

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
