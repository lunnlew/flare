import { useState } from "react";
import { METHOD_STYLES } from "../../styles/method-colors";
import type { SavedRequest } from "../../store";
import { ContextMenu } from "../Common/ContextMenu";
import { useSettingsStore } from "../../store";
import { useTranslation } from "../../utils/i18n";

interface SavedRequestItemProps {
  req: SavedRequest;
  colId: string;
  onLoad: (req: SavedRequest) => void;
  onRename: (colId: string, reqId: string, newName: string) => void;
  onDuplicate: (colId: string, reqId: string) => void;
  onDelete: (colId: string, reqId: string) => void;
  onUpdateColor?: (colId: string, reqId: string, color: string | null) => void;
  onUpdateTags?: (colId: string, reqId: string, tags: string[]) => void;
  onMoveToCollection?: (req: SavedRequest, targetColId: string) => void;
  collectionNames?: { id: string; name: string }[];
}

export function SavedRequestItem({
  req,
  colId,
  onLoad,
  onRename,
  onDuplicate,
  onDelete,
  onUpdateColor,
  onUpdateTags,
  onMoveToCollection,
  collectionNames = [],
}: SavedRequestItemProps) {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);

  const colorOptions = [
    { color: "#ef4444", name: t('savedRequest.red') },
    { color: "#f97316", name: t('savedRequest.orange') },
    { color: "#eab308", name: t('savedRequest.yellow') },
    { color: "#22c55e", name: t('savedRequest.green') },
    { color: "#06b6d4", name: t('savedRequest.cyan') },
    { color: "#3b82f6", name: t('savedRequest.blue') },
    { color: "#8b5cf6", name: t('savedRequest.purple') },
    { color: "#ec4899", name: t('savedRequest.pink') },
    { color: null, name: t('savedRequest.none') },
  ];

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(req.name);
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [colorMenuPos, setColorMenuPos] = useState({ x: 0, y: 0 });
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [showMoveDialog, setShowMoveDialog] = useState(false);

  const handleAddTag = () => {
    const newTag = tagInput.trim();
    if (!newTag) return;
    const currentTags = req.tags || [];
    if (currentTags.includes(newTag)) {
      setTagInput("");
      setShowTagDialog(false);
      return;
    }
    onUpdateTags?.(colId, req.id, [...currentTags, newTag]);
    setTagInput("");
    setShowTagDialog(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = req.tags || [];
    onUpdateTags?.(colId, req.id, currentTags.filter(t => t !== tagToRemove));
  };

  return (
    <div
      onClick={() => !isEditing && !showTagDialog && onLoad(req)}
      onDoubleClick={() => setIsEditing(true)}
      onContextMenu={(e) => {
        e.preventDefault();
        setColorMenuPos({ x: e.clientX, y: e.clientY });
        setShowColorMenu(true);
      }}
      className="group px-3 py-1.5 cursor-pointer flex items-center gap-2"
      style={{ borderBottom: "1px solid var(--border-color)", borderLeft: req.color ? `3px solid ${req.color}` : undefined }}
    >
      {req.color && (
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: req.color }}
          title={t('savedRequest.color', { color: req.color })}
        />
      )}
      <span
        className="w-10 text-[10px] font-mono rounded text-center py-0.5"
        style={{
          backgroundColor: METHOD_STYLES[req.method]?.bg,
          color: METHOD_STYLES[req.method]?.color,
        }}
      >
        {req.method}
      </span>
      {isEditing ? (
        <input
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={() => {
            onRename(colId, req.id, editName);
            setIsEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onRename(colId, req.id, editName);
              setIsEditing(false);
            }
          }}
          autoFocus
          className="flex-1 px-1 py-0.5 text-[10px] rounded"
          style={{
            backgroundColor: "var(--bg-tertiary)",
            color: "var(--text-primary)",
            border: "1px solid var(--accent)",
          }}
        />
      ) : (
        <span className="text-[10px] flex-1 truncate" style={{ color: "var(--text-primary)" }}>
          {req.name}
        </span>
      )}
      {req.tags && req.tags.length > 0 && (
        <div className="flex gap-0.5 flex-wrap">
          {req.tags.map((tag: string, ti: number) => (
            <span
              key={ti}
              className="px-1 py-0.5 rounded text-[8px] flex items-center gap-0.5 group/tag"
              style={{ backgroundColor: "var(--accent-muted)", color: "var(--accent)" }}
            >
              {tag}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveTag(tag);
                }}
                className="opacity-0 group-hover/tag:opacity-100 text-[8px]"
                style={{ color: "var(--danger)" }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDuplicate(colId, req.id);
        }}
        className="p-0.5 rounded opacity-0 group-hover:opacity-100"
        style={{ color: "var(--text-muted)" }}
        title={t('common.copy')}
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 0122v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(colId, req.id);
        }}
        className="p-0.5 rounded opacity-0 group-hover:opacity-100"
        style={{ color: "var(--danger)" }}
        title={t('common.delete')}
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
      {showColorMenu && (
        <ContextMenu
          x={colorMenuPos.x}
          y={colorMenuPos.y}
          items={[
            { label: t('savedRequest.setColor'), value: "header" },
            { label: "", value: "sep0" },
            ...colorOptions.map((c) => ({
              label: c.color ? c.name : t('savedRequest.none'),
              value: c.color || "none",
              icon: c.color ? "●" : "○",
            })),
            { label: "", value: "sep1" },
            { label: t('savedRequest.editTags'), value: "tags", icon: "🏷" },
            ...(req.tags && req.tags.length > 0 ? [{ label: t('savedRequest.clearAllTags'), value: "clearTags", icon: "×", danger: true }] : []),
            { label: "", value: "sep2" },
            ...(onMoveToCollection && collectionNames.length > 1 ? [{ label: t('savedRequest.moveTo'), value: "move", icon: "→" }] : []),
          ]}
          onSelect={(value) => {
            if (value === "none") {
              onUpdateColor?.(colId, req.id, null);
            } else if (value === "clearTags") {
              onUpdateTags?.(colId, req.id, []);
            } else if (value === "tags") {
              setShowTagDialog(true);
            } else if (value === "move") {
              setShowMoveDialog(true);
            } else if (value && value.startsWith("#")) {
              onUpdateColor?.(colId, req.id, value);
            } else {
              onUpdateColor?.(colId, req.id, value);
            }
            setShowColorMenu(false);
          }}
          onClose={() => setShowColorMenu(false)}
        />
      )}
      {showTagDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={() => setShowTagDialog(false)}
        >
          <div
            className="rounded-lg shadow-xl w-64"
            style={{ backgroundColor: "var(--bg-primary)", border: "1px solid var(--border-color)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 border-b" style={{ borderColor: "var(--border-color)" }}>
              <h3 className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                {t('savedRequest.editTags')}
              </h3>
            </div>
            <div className="p-3 space-y-2">
              {req.tags && req.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {req.tags.map((tag: string, ti: number) => (
                    <span
                      key={ti}
                      className="px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1"
                      style={{ backgroundColor: "var(--accent-muted)", color: "var(--accent)" }}
                    >
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="text-[10px]"
                        style={{ color: "var(--danger)" }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-1">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder={t('savedRequest.enterTagPlaceholder')}
                  className="flex-1 px-2 py-1 rounded text-[10px]"
                  style={{
                    backgroundColor: "var(--bg-secondary)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border-color)",
                  }}
                  autoFocus
                />
                <button
                  onClick={handleAddTag}
                  className="px-2 py-1 rounded text-[10px]"
                  style={{ backgroundColor: "var(--accent)", color: "var(--text-inverse)" }}
                >
                  {t('common.add')}
                </button>
              </div>
            </div>
             <div className="p-3 flex justify-end border-t" style={{ borderColor: "var(--border-color)" }}>
              <button
                onClick={() => setShowTagDialog(false)}
                className="px-3 py-1 rounded text-[10px]"
                style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-muted)" }}
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}
      {showMoveDialog && onMoveToCollection && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={() => setShowMoveDialog(false)}
        >
          <div
            className="rounded-lg shadow-xl w-64"
            style={{ backgroundColor: "var(--bg-primary)", border: "1px solid var(--border-color)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 border-b" style={{ borderColor: "var(--border-color)" }}>
              <h3 className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                {t('savedRequest.moveToCollection')}
              </h3>
            </div>
            <div className="p-3 space-y-1 max-h-48 overflow-y-auto">
              {collectionNames
                .filter(c => c.id !== colId)
                .map(c => (
                  <button
                    key={c.id}
                    onClick={() => {
                      onMoveToCollection(req, c.id);
                      setShowMoveDialog(false);
                    }}
                    className="w-full px-3 py-2 rounded text-xs text-left"
                    style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)" }}
                  >
                    {c.name}
                  </button>
                ))}
            </div>
            <div className="p-3 flex justify-end border-t" style={{ borderColor: "var(--border-color)" }}>
              <button
                onClick={() => setShowMoveDialog(false)}
                className="px-3 py-1 rounded text-[10px]"
                style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-muted)" }}
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}