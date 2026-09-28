import type { AuthLocation, AuthItem } from "../../types/api";
export type { AuthLocation } from "../../types/api";
export type { AuthItem } from "../../types/api";
import { useSettingsStore } from "../../store";
import { useTranslation } from "../../utils/i18n";

interface AuthItemsFormProps {
  authItems: AuthItem[];
  onAddItem: (location: AuthLocation) => void;
  onRemoveItem: (index: number) => void;
  onUpdateItem: (index: number, field: "key" | "value", val: string) => void;
}

export function AuthItemsForm({ authItems, onAddItem, onRemoveItem, onUpdateItem }: AuthItemsFormProps) {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);
  const headerItems = authItems.filter(a => a.location === "header");
  const cookieItems = authItems.filter(a => a.location === "cookie");
  const queryItems = authItems.filter(a => a.location === "query");
  const pathItems = authItems.filter(a => a.location === "path");

  const renderAuthRows = (items: AuthItem[], showKey: boolean = true, keyPlaceholder: string = "", valuePlaceholder: string = "") => {
    return items.map((item) => {
      const realIdx = authItems.findIndex(a => a === item);
      return (
        <div key={realIdx} className="flex gap-1.5 mb-1.5">
          {showKey && (
            <input
              type="text"
              value={item.key}
              onChange={(e) => onUpdateItem(realIdx, "key", e.target.value)}
              placeholder={keyPlaceholder}
              className="flex-1 px-2 py-1 rounded text-[10px]"
              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
            />
          )}
          <input
            type="text"
            value={item.value}
            onChange={(e) => onUpdateItem(realIdx, "value", e.target.value)}
            placeholder={valuePlaceholder}
            className="flex-1 px-2 py-1 rounded text-[10px]"
            style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
          />
          <button onClick={() => onRemoveItem(realIdx)} className="p-1" style={{ color: 'var(--danger)' }}>×</button>
        </div>
      );
    });
  };

  return (
    <div className="mb-2 p-3 rounded" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
      <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-primary)' }}>{t('auth.itemsForm')}</div>

      {/* Header */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Header</span>
          <button onClick={() => onAddItem("header")} className="text-[10px]" style={{ color: 'var(--accent)' }}>+ {t('auth.addHeader')}</button>
        </div>
        {renderAuthRows(headerItems, true, t('auth.headerName'), t('auth.headerValue'))}
      </div>

      {/* Cookie */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Cookie</span>
          <button onClick={() => onAddItem("cookie")} className="text-[10px]" style={{ color: 'var(--accent)' }}>+ {t('auth.addCookie')}</button>
        </div>
        {renderAuthRows(cookieItems, false, "", t('auth.cookieString'))}
      </div>

      {/* Query */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Query</span>
          <button onClick={() => onAddItem("query")} className="text-[10px]" style={{ color: 'var(--accent)' }}>+ {t('auth.addQuery')}</button>
        </div>
        {renderAuthRows(queryItems, true, t('auth.paramName'), t('auth.paramValue'))}
      </div>

      {/* Path */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>{t('auth.pathReplace')}</span>
          <button onClick={() => onAddItem("path")} className="text-[10px]" style={{ color: 'var(--accent)' }}>+ {t('auth.addPath')}</button>
        </div>
        {renderAuthRows(pathItems, true, t('auth.pathPlaceholder'), t('auth.pathReplaceValue'))}
        <div className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>{t('auth.pathReplaceDescription')}</div>
      </div>
    </div>
  );
}
