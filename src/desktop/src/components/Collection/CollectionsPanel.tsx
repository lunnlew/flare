import { useMemo, useState } from "react";
import { useUIStore, useSettingsStore } from "../../store";
import { useNotificationStore } from "../../store/notificationStore";
import { useCollections } from "../../hooks/Collection/useCollections";
import { useTranslation } from "../../utils/i18n";
import { SavedRequestItem } from "../History/SavedRequestItem";
import type { Collection } from "../../store";
import type { SavedRequest } from "../../store/collectionStore";

interface CollectionsPanelProps {
  collections: Collection[];
  selectedCollection: string | null;
  onSelectCollection: (id: string | null) => void;
}

export function CollectionsPanel({
  collections,
  selectedCollection,
  onSelectCollection,
}: CollectionsPanelProps) {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);

  // Collection dialog state from uiStore
  const showCollectionModal = useUIStore((s) => s.showCollectionModal);
  const setShowCollectionModal = useUIStore((s) => s.setShowCollectionModal);
  const newCollectionName = useUIStore((s) => s.newCollectionName);
  const setNewCollectionName = useUIStore((s) => s.setNewCollectionName);
  const editingCollection = useUIStore((s) => s.editingCollection);
  const setEditingCollection = useUIStore((s) => s.setEditingCollection);
  const { showToast } = useNotificationStore();

  const {
    updateCollections,
    deleteCollection,
    duplicateCollection,
    renameCollection,
    loadFromCollection,
    renameRequest,
    duplicateRequest,
    deleteFromCollection,
    updateRequestColor,
    updateRequestTags,
    moveRequestToCollection,
    exportCollection,
  } = useCollections();

  // Drag sorting state for requests
  const [dragSortIndex, setDragSortIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);

  const handleSortDragStart = (e: React.DragEvent, index: number) => {
    setDragSortIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleSortDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTargetIndex(index);
  };

  const handleSortDragEnd = (colId: string) => {
    if (dragSortIndex !== null && dropTargetIndex !== null && dragSortIndex !== dropTargetIndex) {
      const col = collections.find(c => c.id === colId);
      if (!col || !col.requests) return;
      const item = col.requests[dragSortIndex];
      const reordered = [
        ...col.requests.slice(0, dragSortIndex),
        ...col.requests.slice(dragSortIndex + 1).slice(0, dropTargetIndex),
        item,
        ...col.requests.slice(dragSortIndex + 1).slice(dropTargetIndex),
      ];
      updateCollections(prev => prev.map(c =>
        c.id === colId ? { ...c, requests: reordered } : c
      ));
    }
    setDragSortIndex(null);
    setDropTargetIndex(null);
  };

  const handleUpdateRequestColor = (colId: string, reqId: string, color: string | null) => {
    updateRequestColor(colId, reqId, color);
  };

  const handleUpdateRequestTags = (colId: string, reqId: string, tags: string[]) => {
    updateRequestTags(colId, reqId, tags);
  };

  const handleMoveToCollection = (req: SavedRequest, targetColId: string) => {
    moveRequestToCollection(req, targetColId);
  };

  const collectionNames = useMemo(() =>
    collections.map(c => ({ id: c.id, name: c.name })),
    [collections]
  );

  const handleExportAll = () => {
    if (collections.length === 0) return;
    const data = JSON.stringify(collections, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "collections.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const imported = JSON.parse(ev.target?.result as string);
          if (Array.isArray(imported)) {
            imported.forEach((c) => {
              c.id = `col-${Date.now()}-${Math.random()}`;
            });
            updateCollections((prev) => [...prev, ...imported]);
          }
        } catch {
          showToast(t('collection.importFailed'), "error");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const selectedCol = useMemo(
    () => collections.find((c) => c.id === selectedCollection),
    [collections, selectedCollection]
  );

  return (
    <div className="px-2 py-2" style={{ borderBottom: "1px solid var(--border-color)" }}>
      <div className="text-[10px] font-medium mb-1.5 flex items-center justify-between">
        <span style={{ color: "var(--text-muted)" }}>{t('collection.title')}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleExportAll}
            className="p-0.5 rounded"
            style={{ color: "var(--text-muted)" }}
            title={t('collection.exportAll')}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
          </button>
          <button
            onClick={handleImport}
            className="p-0.5 rounded"
            style={{ color: "var(--text-muted)" }}
            title={t('collection.importCollection')}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
          </button>
          <button
            onClick={() => setShowCollectionModal(true)}
            className="p-0.5 rounded"
            style={{ color: "var(--accent)" }}
            title={t('collection.newCollection')}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>
        </div>
      </div>
      <div className="space-y-1 max-h-32 overflow-y-auto">
        {collections.map((col) => (
          <div
            key={col.id}
            className="group flex items-center justify-between px-2 py-1 rounded text-[10px] cursor-pointer"
            style={{
              backgroundColor:
                selectedCollection === col.id ? "var(--accent-muted)" : "var(--bg-tertiary)",
              color:
                selectedCollection === col.id ? "var(--accent)" : "var(--text-primary)",
            }}
            onClick={() => {
              if (editingCollection) return;
              onSelectCollection(selectedCollection === col.id ? null : col.id);
            }}
            onDoubleClick={() => setEditingCollection({ id: col.id, name: col.name })}
          >
            {editingCollection?.id === col.id ? (
              <input
                type="text"
                value={editingCollection.name}
                onChange={(e) =>
                  setEditingCollection({ ...editingCollection, name: e.target.value })
                }
                onBlur={() => {
                  renameCollection(col.id, editingCollection.name);
                  setEditingCollection(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    renameCollection(col.id, editingCollection.name);
                    setEditingCollection(null);
                  }
                  if (e.key === "Escape") setEditingCollection(null);
                }}
                onClick={(e) => e.stopPropagation()}
                autoFocus
                className="flex-1 px-1 py-0.5 text-[10px] rounded"
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--accent)",
                }}
              />
            ) : (
              <span className="flex-1 truncate">{col.name}</span>
            )}
            <div className="flex items-center gap-1">
              <span style={{ color: "var(--text-muted)" }}>{col.requests?.length || 0}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  duplicateCollection(col.id);
                }}
                className="p-0.5 rounded opacity-0 group-hover:opacity-100"
                style={{ color: "var(--text-muted)" }}
                title={t('collection.duplicateCollection')}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  exportCollection(col.id);
                }}
                className="p-0.5 rounded opacity-0 group-hover:opacity-100"
                style={{ color: "var(--text-muted)" }}
                title={t('collection.exportCollection')}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteCollection(col.id);
                }}
                className="p-0.5 rounded opacity-0 group-hover:opacity-100"
                style={{ color: "var(--danger)" }}
                title={t('collection.deleteCollection')}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {selectedCollection && selectedCol && (selectedCol.requests || []).length > 0 && (
        <div className="mt-2">
          <div
            className="px-3 py-1 text-[10px] font-medium flex items-center justify-between"
            style={{ color: "var(--text-muted)", backgroundColor: "var(--bg-tertiary)" }}
          >
            <span>{t('collection.savedRequests')}</span>
            <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>{t('collection.dragToSort')}</span>
          </div>
          <div className="space-y-0.5">
            {(selectedCol.requests || []).map((req, i) => (
              <div
                key={req.id}
                draggable
                onDragStart={(e) => handleSortDragStart(e, i)}
                onDragOver={(e) => handleSortDragOver(e, i)}
                onDragEnd={() => handleSortDragEnd(selectedCol.id)}
                style={{
                  opacity: dragSortIndex === i ? 0.5 : 1,
                  backgroundColor: dropTargetIndex === i ? "var(--accent-muted)" : "transparent",
                  borderRadius: "4px",
                  cursor: "grab",
                }}
              >
                <SavedRequestItem
                  req={req}
                  colId={selectedCol.id}
                  onLoad={loadFromCollection}
                  onRename={renameRequest}
                  onDuplicate={duplicateRequest}
                  onDelete={deleteFromCollection}
                  onUpdateColor={handleUpdateRequestColor}
                  onUpdateTags={handleUpdateRequestTags}
                  onMoveToCollection={handleMoveToCollection}
                  collectionNames={collectionNames}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {showCollectionModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div
            className="rounded-lg p-4 w-80"
            style={{
              backgroundColor: "var(--bg-secondary)",
              border: "1px solid var(--border-color)",
            }}
          >
            <h3 className="text-sm font-medium mb-3" style={{ color: "var(--text-primary)" }}>
              {t('collection.newCollection')}
            </h3>
            <input
              type="text"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              placeholder={t('collection.collectionName')}
              className="w-full px-2 py-1.5 rounded text-xs mb-3"
              style={{
                backgroundColor: "var(--bg-tertiary)",
                color: "var(--text-primary)",
                border: "1px solid var(--border-color)",
              }}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowCollectionModal(false);
                  setNewCollectionName("");
                }}
                className="px-3 py-1 rounded text-xs"
                style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
              >
                {t('collection.cancel')}
              </button>
              <button
                onClick={() => {
                  if (newCollectionName.trim()) {
                    updateCollections((prev) => [
                      ...prev,
                      { id: `col-${Date.now()}`, name: newCollectionName.trim(), requests: [] },
                    ]);
                    setNewCollectionName("");
                    setShowCollectionModal(false);
                  }
                }}
                className="px-3 py-1 rounded text-xs"
                style={{ backgroundColor: "var(--accent)", color: "var(--text-inverse)" }}
              >
                {t('collection.create')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}