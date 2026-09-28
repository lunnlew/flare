import { useState } from "react";

interface JsonTreeViewProps {
  data: any;
  path?: string;
  onContextMenuPath?: (path: string, e: React.MouseEvent) => void;
  onContextMenuValue?: (path: string, value: any, e: React.MouseEvent) => void;
  searchQuery?: string;
  level?: number;
}

export function JsonTreeView({ data, path = '$', onContextMenuPath, onContextMenuValue, searchQuery, level = 0 }: JsonTreeViewProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (data === null) return <span style={{ color: 'var(--text-muted)' }}>null</span>;
  if (data === undefined) return <span style={{ color: 'var(--text-muted)' }}>undefined</span>;

  if (typeof data === 'boolean') return <span style={{ color: '#f97316' }}>{data.toString()}</span>;
  if (typeof data === 'number') return <span style={{ color: '#22c55e' }}>{data}</span>;
  if (typeof data === 'string') {
    const highlighted = searchQuery && data.toLowerCase().includes(searchQuery.toLowerCase());
    return <span style={{ color: '#a5f3fc', wordBreak: 'break-all' }}>"{data}"{highlighted && <mark style={{ backgroundColor: 'var(--warning)', color: 'var(--bg-primary)', borderRadius: '2px', padding: '0 2px' }}>{data}</mark>}</span>;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) return <span style={{ color: 'var(--text-muted)' }}>[]</span>;
    return (
      <div style={{ marginLeft: level > 0 ? 16 : 0 }}>
        <span
          onClick={() => setCollapsed(!collapsed)}
          style={{ cursor: 'pointer', color: 'var(--text-muted)' }}
        >
          {collapsed ? '▶' : '▼'} [{data.length}]
        </span>
        {!collapsed && data.map((item: any, index: number) => (
          <div key={index}>
            <JsonTreeView
              data={item}
              path={`${path}[${index}]`}
              onContextMenuPath={onContextMenuPath}
              onContextMenuValue={onContextMenuValue}
              searchQuery={searchQuery}
              level={level + 1}
            />
          </div>
        ))}
      </div>
    );
  }

  if (typeof data === 'object') {
    const entries = Object.entries(data);
    if (entries.length === 0) return <span style={{ color: 'var(--text-muted)' }}>{'{}'}</span>;
    return (
      <div style={{ marginLeft: level > 0 ? 16 : 0 }}>
        <span
          onClick={() => setCollapsed(!collapsed)}
          style={{ cursor: 'pointer', color: 'var(--text-muted)' }}
        >
          {collapsed ? '▶' : '▼'} {'{'}{entries.length}{'}'}
        </span>
        {!collapsed && entries.map(([key, value]: [string, any]) => (
          <div key={key}>
            <span
              className="json-key"
              onContextMenu={(e) => {
                e.preventDefault();
                onContextMenuPath?.(`${path}.${key}`, e);
              }}
              onDoubleClick={(e) => {
                e.preventDefault();
                onContextMenuValue?.(`${path}.${key}`, value, e);
              }}
              style={{ color: '#818cf8', cursor: 'context-menu' }}
            >
              "{key}"
            </span>
            <span style={{ color: 'var(--text-muted)' }}>: </span>
            <JsonTreeView
              data={value}
              path={`${path}.${key}`}
              onContextMenuPath={onContextMenuPath}
              onContextMenuValue={onContextMenuValue}
              searchQuery={searchQuery}
              level={level + 1}
            />
          </div>
        ))}
      </div>
    );
  }

  return <span>{String(data)}</span>;
}
