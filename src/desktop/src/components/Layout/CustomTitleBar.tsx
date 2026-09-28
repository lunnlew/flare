import { useState, useEffect, useCallback } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

interface CustomTitleBarProps {
  children?: React.ReactNode;
}

export function CustomTitleBar({ children }: CustomTitleBarProps) {
  const [isMaximized, setIsMaximized] = useState(false);

  const checkMaximized = useCallback(async () => {
    try {
      const win = getCurrentWindow();
      const maximized = await win.isMaximized();
      setIsMaximized(maximized);
    } catch (e) {
      // Ignore errors - might not be in Tauri environment
    }
  }, []);

  useEffect(() => {
    checkMaximized();

    // Listen for resize events to update maximized state
    let unlisten: (() => void) | undefined;

    try {
      const setupListener = async () => {
        try {
          const win = getCurrentWindow();
          const unlistenFn = await win.onResized(async () => {
            await checkMaximized();
          });
          unlisten = unlistenFn;
        } catch (e) {
          // Event listener not available - permissions issue
          console.warn("Window resize listener not available:", e);
        }
      };
      setupListener();
    } catch (e) {
      // Ignore - might not be in Tauri environment
    }

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, [checkMaximized]);

  const handleMinimize = async () => {
    try {
      const win = getCurrentWindow();
      await win.minimize();
    } catch (e) {
      console.error("Failed to minimize:", e);
    }
  };

  const handleMaximize = async () => {
    try {
      const win = getCurrentWindow();
      await win.toggleMaximize();
      await checkMaximized();
    } catch (e) {
      console.error("Failed to toggle maximize:", e);
    }
  };

  const handleClose = async () => {
    try {
      const win = getCurrentWindow();
      await win.close();
    } catch (e) {
      console.error("Failed to close:", e);
    }
  };

  return (
    <header
      className="h-9 flex items-center select-none"
      style={{
        backgroundColor: "var(--bg-secondary)",
        borderBottom: "1px solid var(--border-color)",
      }}
      data-tauri-drag-region
    >
      {/* Left: Logo */}
      <div
        className="h-full flex items-center px-3 gap-2"
        data-tauri-drag-region
      >
        <div
          className="w-5 h-5 rounded flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)",
          }}
        >
          <span className="text-[9px] font-bold" style={{ color: "var(--text-inverse)" }}>
            F
          </span>
        </div>
        <span
          className="text-sm font-medium"
          style={{ color: "var(--text-primary)" }}
          data-tauri-drag-region
        >
          flare
        </span>
      </div>

      {/* Center: Additional nav items */}
      <div className="flex-1 flex items-center h-full" data-tauri-drag-region>
        {children}
      </div>

      {/* Right: Window controls */}
      <div className="flex items-center h-full">
        {/* Minimize */}
        <button
          onClick={handleMinimize}
          className="h-full px-4 flex items-center justify-center hover:opacity-80 transition-opacity"
          style={{ color: "var(--text-secondary)" }}
          title="最小化"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
          </svg>
        </button>

        {/* Maximize/Restore */}
        <button
          onClick={handleMaximize}
          className="h-full px-4 flex items-center justify-center hover:opacity-80 transition-opacity"
          style={{ color: "var(--text-secondary)" }}
          title={isMaximized ? "还原" : "最大化"}
        >
          {isMaximized ? (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <rect x="5" y="9" width="10" height="10" rx="1" />
              <path d="M9 9V5a1 1 0 011-1h9a1 1 0 011 1v9a1 1 0 01-1 1h-4" strokeLinecap="round" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <rect x="4" y="4" width="16" height="16" rx="1" />
            </svg>
          )}
        </button>

        {/* Close */}
        <button
          onClick={handleClose}
          className="h-full px-4 flex items-center justify-center hover:opacity-80 transition-opacity"
          style={{ color: "var(--text-secondary)" }}
          title="关闭"
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(220, 38, 38, 0.9)";
            e.currentTarget.style.color = "white";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = "var(--text-secondary)";
          }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </header>
  );
}
