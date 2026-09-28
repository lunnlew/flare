export const METHOD_STYLES: Record<string, { bg: string; color: string }> = {
  GET:    { bg: 'rgba(34, 197, 94, 0.15)', color: 'var(--method-get)' },
  POST:   { bg: 'rgba(59, 130, 246, 0.15)', color: 'var(--method-post)' },
  PUT:    { bg: 'rgba(234, 179, 8, 0.15)', color: 'var(--method-put)' },
  DELETE: { bg: 'rgba(239, 68, 68, 0.15)', color: 'var(--method-delete)' },
  PATCH:  { bg: 'rgba(168, 85, 247, 0.15)', color: 'var(--method-patch)' },
  HEAD:   { bg: 'rgba(113, 113, 122, 0.15)', color: 'var(--text-muted)' },
  OPTIONS:{ bg: 'rgba(113, 113, 122, 0.15)', color: 'var(--text-muted)' },
};
