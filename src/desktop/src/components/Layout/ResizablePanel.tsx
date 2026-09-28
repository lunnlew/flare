/**
 * Resizable Side Panel
 * Drag to resize the side configuration panel
 */

import React, { useState, useRef, useCallback, useEffect } from "react";

interface ResizablePanelProps {
  children: React.ReactNode;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  position?: "left" | "right";
  className?: string;
  style?: React.CSSProperties;
}

export function ResizablePanel({
  children,
  defaultWidth = 400,
  minWidth = 300,
  maxWidth = 800,
  position = "right",
  className = "",
  style = {},
}: ResizablePanelProps) {
  const [width, setWidth] = useState(defaultWidth);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;

      if (position === "right") {
        const newWidth = window.innerWidth - e.clientX;
        setWidth(Math.min(Math.max(newWidth, minWidth), maxWidth));
      } else {
        const newWidth = e.clientX;
        setWidth(Math.min(Math.max(newWidth, minWidth), maxWidth));
      }
    },
    [isResizing, position, minWidth, maxWidth]
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "ew-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={panelRef}
      className={`flex h-full ${className}`}
      style={{
        width: `${width}px`,
        minWidth: `${width}px`,
        maxWidth: `${width}px`,
        ...style,
      }}
    >
      {/* Panel Content */}
      <div
        className="flex-1 h-full overflow-y-auto overflow-x-hidden"
        style={{ backgroundColor: "var(--bg-secondary)" }}
      >
        {children}
      </div>

      {/* Resize Handle */}
      <div
        onMouseDown={handleMouseDown}
        className="w-1 cursor-ew-resize flex-shrink-0 hover:bg-blue-500 transition-colors"
        style={{
          backgroundColor: isResizing ? "var(--accent)" : "var(--border-color)",
        }}
      />

      {/* Width Indicator (while resizing) */}
      {isResizing && (
        <div
          className="fixed top-2 px-2 py-1 rounded text-xs font-mono z-50"
          style={{
            right: position === "right" ? "16px" : "auto",
            left: position === "left" ? "16px" : "auto",
            backgroundColor: "var(--accent)",
            color: "var(--text-inverse)",
          }}
        >
          {width}px
        </div>
      )}
    </div>
  );
}

/**
 * Collapsible Panel with Toggle Button
 */
interface CollapsiblePanelProps {
  children: React.ReactNode;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  isCollapsed: boolean;
  onToggle: () => void;
  collapsedWidth?: number;
  position?: "left" | "right";
  title?: string;
}

export function CollapsiblePanel({
  children,
  defaultWidth = 400,
  minWidth = 300,
  maxWidth = 800,
  isCollapsed,
  onToggle,
  collapsedWidth = 40,
  position = "right",
  title = "Configure",
}: CollapsiblePanelProps) {
  const [width, setWidth] = useState(defaultWidth);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;

      if (position === "right") {
        const newWidth = window.innerWidth - e.clientX;
        setWidth(Math.min(Math.max(newWidth, minWidth), maxWidth));
      } else {
        const newWidth = e.clientX;
        setWidth(Math.min(Math.max(newWidth, minWidth), maxWidth));
      }
    },
    [isResizing, position, minWidth, maxWidth]
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "ew-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  const currentWidth = isCollapsed ? collapsedWidth : width;

  return (
    <div
      ref={panelRef}
      className="flex h-full relative"
      style={{
        width: `${currentWidth}px`,
        minWidth: `${currentWidth}px`,
        maxWidth: `${currentWidth}px`,
        transition: isResizing ? "none" : "width 0.2s ease",
      }}
    >
      {isCollapsed ? (
        // Collapsed State
        <div
          className="h-full flex flex-col items-center py-2 cursor-pointer"
          style={{ backgroundColor: "var(--bg-secondary)" }}
          onClick={onToggle}
        >
          <div
            className="px-1 py-8 text-xs writing-mode-vertical"
            style={{
              writingMode: "vertical-rl",
              color: "var(--text-muted)",
            }}
          >
            {title}
          </div>
          <button
            className="mt-2 p-1 rounded transition-colors"
            style={{ color: "var(--text-muted)" }}
          >
            ◀
          </button>
        </div>
      ) : (
        // Expanded State
        <>
          <div
            className="flex-1 h-full overflow-hidden flex flex-col"
            style={{ backgroundColor: "var(--bg-secondary)" }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-3 py-2 border-b"
              style={{ borderColor: "var(--border-color)" }}
            >
              <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                {title}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={onToggle}
                  className="p-1 rounded transition-colors text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  ▶
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">{children}</div>
          </div>

          {/* Resize Handle */}
          <div
            onMouseDown={handleMouseDown}
            className="w-1 cursor-ew-resize flex-shrink-0 hover:bg-blue-500 transition-colors"
            style={{
              backgroundColor: isResizing ? "var(--accent)" : "var(--border-color)",
            }}
          />
        </>
      )}

      {/* Width Indicator */}
      {isResizing && (
        <div
          className="fixed top-2 px-2 py-1 rounded text-xs font-mono z-50"
          style={{
            right: position === "right" ? "16px" : "auto",
            left: position === "left" ? "16px" : "auto",
            backgroundColor: "var(--accent)",
            color: "var(--text-inverse)",
          }}
        >
          {width}px
        </div>
      )}
    </div>
  );
}
