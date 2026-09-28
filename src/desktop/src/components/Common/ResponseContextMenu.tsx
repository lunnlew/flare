export interface ContextMenuItem {
  label: string;
  value: string;
  icon?: string;
  danger?: boolean;
  disabled?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onSelect: (value: string) => void;
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onSelect, onClose }: ContextMenuProps) {
  return (
    <>
      <div
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }}
        onClick={onClose}
        onContextMenu={(e) => { e.preventDefault(); onClose(); }}
      />
      <div
        style={{
          position: 'fixed',
          top: y,
          left: x,
          zIndex: 1000,
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '6px',
          padding: '4px 0',
          minWidth: '160px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}
      >
        {items.map((item, index) => (
          item.value === 'separator' ? (
            <div
              key={index}
              style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '4px 0' }}
            />
          ) : (
            <button
              key={item.value}
              onClick={() => { if (!item.disabled) { onSelect(item.value); onClose(); } }}
              disabled={item.disabled}
              style={{
                display: 'block', width: '100%', padding: '8px 12px', textAlign: 'left',
                background: 'none', border: 'none',
                color: item.danger ? 'var(--danger)' : (item.disabled ? 'var(--text-muted)' : 'var(--text-primary)'),
                fontSize: '12px', cursor: item.disabled ? 'not-allowed' : 'pointer',
                opacity: item.disabled ? 0.5 : 1,
              }}
              onMouseEnter={(e) => { if (!item.disabled) e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'none'; }}
            >
              {item.icon &&<span style={{ marginRight: '8px' }}>{item.icon}</span>}
              {item.label}
            </button>
          )
        ))}
      </div>
    </>
  );
}
