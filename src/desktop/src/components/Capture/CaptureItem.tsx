import type { CapturedRequest } from '../../types/capture';
import { METHOD_STYLES } from '../../styles/method-colors';

interface Props {
  request: CapturedRequest;
  onClick: (request: CapturedRequest) => void;
  compact?: boolean;
}

export function CaptureItem({ request, onClick, compact = false }: Props) {
  const colors = METHOD_STYLES[request.method.toUpperCase()] || { bg: '#6b7280', color: '#fff' };

  if (compact) {
    return (
      <div
        className="flex items-center gap-2 px-3 py-1.5 cursor-pointer"
        style={{ borderBottom: '1px solid var(--border-color)' }}
        onClick={() => onClick(request)}
      >
        <span
          className="px-1 py-0.5 rounded text-[9px] font-medium shrink-0"
          style={{ backgroundColor: colors.bg, color: colors.color }}
        >
          {request.method}
        </span>
        <span className="text-[10px] truncate" style={{ color: 'var(--text-primary)' }} title={request.url}>
          {request.url}
        </span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-opacity-50 hover:bg-gray-700 border-b"
      style={{ borderColor: 'var(--border-color)' }}
      onClick={() => onClick(request)}
    >
      <span
        className="px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0"
        style={{ backgroundColor: colors.bg, color: colors.color }}
      >
        {request.method}
      </span>
      <span className="text-xs truncate" style={{ color: 'var(--text-primary)' }} title={request.url}>
        {request.url}
      </span>
    </div>
  );
}