import { HTMLAttributes, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';

export interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'success' | 'warning' | 'danger';
  showLabel?: boolean;
  animate?: boolean;
}

export const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value, max = 100, size = 'md', color = 'primary', showLabel, animate = true, ...props }, ref) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));

    const sizes = {
      sm: 'h-1.5',
      md: 'h-2',
      lg: 'h-3',
    };

    const colors = {
      primary: 'bg-primary-500',
      success: 'bg-green-500',
      warning: 'bg-yellow-500',
      danger: 'bg-red-500',
    };

    // Auto color based on percentage
    const autoColor = percentage > 80 ? 'bg-red-500' : percentage > 60 ? 'bg-yellow-500' : 'bg-primary-500';

    return (
      <div ref={ref} className={cn('w-full', className)} {...props}>
        <div className={cn('w-full bg-dark-800 rounded-full overflow-hidden', sizes[size])}>
          {animate ? (
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className={cn('h-full rounded-full', color === 'primary' ? autoColor : colors[color])}
            />
          ) : (
            <div
              className={cn('h-full rounded-full transition-all duration-300', color === 'primary' ? autoColor : colors[color])}
              style={{ width: `${percentage}%` }}
            />
          )}
        </div>
        {showLabel && (
          <div className="mt-1 text-right text-sm font-medium text-dark-400">
            {percentage.toFixed(0)}%
          </div>
        )}
      </div>
    );
  }
);

Progress.displayName = 'Progress';

