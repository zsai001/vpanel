import { cn } from '@/utils/cn';

export interface StatusDotProps {
  status: 'online' | 'offline' | 'warning' | 'error' | 'pending';
  size?: 'sm' | 'md';
  pulse?: boolean;
  className?: string;
}

export function StatusDot({ status, size = 'md', pulse, className }: StatusDotProps) {
  const colors = {
    online: 'bg-green-500',
    offline: 'bg-dark-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
    pending: 'bg-blue-500',
  };

  const sizes = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
  };

  return (
    <span
      className={cn(
        'inline-block rounded-full',
        colors[status],
        sizes[size],
        pulse && status === 'online' && 'animate-pulse',
        className
      )}
    />
  );
}

