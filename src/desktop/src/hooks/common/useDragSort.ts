import { useState, useCallback } from "react";

interface DragSortResult<T> {
  dragIndex: number | null;
  dropIndex: number | null;
  dragProps: {
    onDragStart: (e: React.DragEvent, index: number) => void;
    onDragOver: (e: React.DragEvent, index: number) => void;
    onDragEnd: () => void;
  };
  getItemStyle: (index: number) => React.CSSProperties;
  items: T[];
}

/**
 * Hook for drag-to-reorder functionality.
 * Common pattern used in ParamsPanel, BodyPanel (form-data), and other list-based editors.
 */
export function useDragSort<T>(
  items: T[],
  onReorder: (newItems: T[]) => void
): DragSortResult<T> {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropIndex(index);
  }, []);

  const handleDragEnd = useCallback(() => {
    if (dragIndex !== null && dropIndex !== null && dragIndex !== dropIndex) {
      const item = items[dragIndex];
      const filtered = items.filter((_, i) => i !== dragIndex);
      const reordered = [
        ...filtered.slice(0, dropIndex),
        item,
        ...filtered.slice(dropIndex),
      ];
      onReorder(reordered);
    }
    setDragIndex(null);
    setDropIndex(null);
  }, [dragIndex, dropIndex, items, onReorder]);

  const getItemStyle = useCallback(
    (index: number) => ({
      opacity: dragIndex === index ? 0.5 : 1,
      backgroundColor:
        dropIndex === index ? "var(--accent-muted)" : "transparent",
      borderRadius: "4px",
      cursor: "grab",
    }),
    [dragIndex, dropIndex]
  );

  return {
    dragIndex,
    dropIndex,
    dragProps: {
      onDragStart: handleDragStart,
      onDragOver: handleDragOver,
      onDragEnd: handleDragEnd,
    },
    getItemStyle,
    items,
  };
}