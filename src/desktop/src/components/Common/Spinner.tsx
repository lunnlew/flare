interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  borderColor?: string;
  topColor?: string;
}

/**
 * Reusable loading spinner component.
 * Uses CSS animation for consistent loading indicator.
 */
export function Spinner({ size = 'md', className = '', borderColor, topColor = 'transparent' }: SpinnerProps) {
  const sizeClasses = {
    sm: 'w-3 h-3 border',
    md: 'w-4 h-4 border-2',
    lg: 'w-8 h-8 border-2',
  };

  return (
    <span
      className={`animate-spin inline-block rounded-full border-t-transparent ${sizeClasses[size]} ${className}`}
      style={{
        borderColor: borderColor || 'var(--border-color)',
        borderTopColor: topColor
      }}
    />
  );
}