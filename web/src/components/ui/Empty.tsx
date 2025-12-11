import { ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { Inbox } from 'lucide-react';

export interface EmptyProps {
  icon?: ReactNode;
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function Empty({
  icon,
  title = 'No data',
  description,
  action,
  className,
}: EmptyProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
      <div className="w-16 h-16 mb-4 rounded-full bg-dark-800 flex items-center justify-center">
        {icon || <Inbox className="w-8 h-8 text-dark-500" />}
      </div>
      <h3 className="text-lg font-medium text-dark-300 mb-1">{title}</h3>
      {description && <p className="text-dark-500 mb-4 max-w-sm">{description}</p>}
      {action}
    </div>
  );
}

