import { BUILD_INFO } from '@/utils/version';
import { cn } from '@/utils/cn';
import { useThemeStore } from '@/stores/theme';
import { GitBranch, GitCommit } from 'lucide-react';

export default function Footer() {
  const resolvedMode = useThemeStore((state) => state.resolvedMode);
  const isLight = resolvedMode === 'light';

  return (
    <footer
      className={cn(
        'border-t transition-colors',
        isLight
          ? 'border-gray-200 bg-white'
          : 'border-gray-800 bg-gray-950'
      )}
    >
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm">
          <div className={cn(isLight ? 'text-gray-600' : 'text-gray-400')}>
            <span>© {new Date().getFullYear()} VPanel. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-4">
            {BUILD_INFO.version !== 'dev' && (
              <div className="flex items-center gap-1.5">
                <span className={cn(isLight ? 'text-gray-500' : 'text-gray-500')}>v{BUILD_INFO.version}</span>
              </div>
            )}
            {BUILD_INFO.branch !== 'unknown' && (
              <div className="flex items-center gap-1.5">
                <GitBranch className={cn('w-3.5 h-3.5', isLight ? 'text-gray-500' : 'text-gray-500')} />
                <span className={cn('font-mono', isLight ? 'text-gray-600' : 'text-gray-400')}>
                  {BUILD_INFO.branch}
                </span>
              </div>
            )}
            {BUILD_INFO.commit !== 'unknown' && (
              <div className="flex items-center gap-1.5">
                <GitCommit className={cn('w-3.5 h-3.5', isLight ? 'text-gray-500' : 'text-gray-500')} />
                <span className={cn('font-mono', isLight ? 'text-gray-600' : 'text-gray-400')}>
                  {BUILD_INFO.commit.substring(0, 8)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}

