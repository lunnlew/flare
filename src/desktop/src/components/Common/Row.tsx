import { ReactNode } from "react";

interface RowProps {
  children: ReactNode;
  className?: string;
}

/**
 * Reusable row layout component.
 * Encapsulates the common "flex items-center justify-between" pattern.
 * Appears 60+ times across the codebase.
 */
export function Row({ children, className = "" }: RowProps) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      {children}
    </div>
  );
}

/**
 * Reusable vertical stack component.
 * Encapsulates the common "flex flex-col gap-X" pattern.
 */
export function Stack({
  children,
  className = "",
  gap = 2,
}: {
  children: ReactNode;
  className?: string;
  gap?: number;
}) {
  return (
    <div className={`flex flex-col gap-${gap} ${className}`}>
      {children}
    </div>
  );
}