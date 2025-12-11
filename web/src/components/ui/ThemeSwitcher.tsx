import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sun, 
  Moon, 
  Monitor, 
  Palette, 
  Check,
  Sparkles,
} from 'lucide-react';
import { 
  useThemeStore, 
  ThemeAccent, 
  ThemeStyle, 
  ThemeMode,
} from '@/stores/theme';
import { cn } from '@/utils/cn';

const modeOptions: { value: ThemeMode; icon: React.ElementType; label: string }[] = [
  { value: 'light', icon: Sun, label: 'Light' },
  { value: 'dark', icon: Moon, label: 'Dark' },
  { value: 'system', icon: Monitor, label: 'System' },
];

const accentOptions: { value: ThemeAccent; label: string; color: string }[] = [
  { value: 'blue', label: 'Dify Blue', color: 'bg-gradient-to-r from-blue-600 to-purple-600' },
  { value: 'cyan', label: 'Cyan', color: 'bg-cyan-500' },
  { value: 'violet', label: 'Violet', color: 'bg-violet-500' },
  { value: 'emerald', label: 'Emerald', color: 'bg-emerald-500' },
  { value: 'rose', label: 'Rose', color: 'bg-rose-500' },
  { value: 'amber', label: 'Amber', color: 'bg-amber-500' },
];

const styleOptions: { value: ThemeStyle; label: string; description: string }[] = [
  { value: 'default', label: 'Default', description: 'Clean and modern' },
  { value: 'glassmorphism', label: 'Glass', description: 'Frosted glass effect' },
  { value: 'neumorphism', label: 'Soft', description: 'Soft shadows' },
  { value: 'brutalist', label: 'Brutalist', description: 'Bold and stark' },
  { value: 'retro', label: 'Retro', description: 'Gradient vibes' },
];

const radiusOptions: { value: 'none' | 'sm' | 'md' | 'lg' | 'full'; label: string }[] = [
  { value: 'none', label: 'Sharp' },
  { value: 'sm', label: 'Small' },
  { value: 'md', label: 'Medium' },
  { value: 'lg', label: 'Large' },
  { value: 'full', label: 'Round' },
];

export function ThemeSwitcher() {
  const { config, setMode, setAccent, setStyle, setRadius } = useThemeStore();
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [panelPosition, setPanelPosition] = useState({ top: 0, right: 0 });

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPanelPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, [isOpen]);

  const panel = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9998]"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed w-80 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-[9999] overflow-hidden"
            style={{ top: panelPosition.top, right: panelPosition.right }}
          >
              <div className="p-4 border-b border-gray-700 bg-gray-800">
              <h3 className="font-semibold text-gray-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400" />
                Theme Settings
              </h3>
            </div>

            <div className="p-4 space-y-5 max-h-[70vh] overflow-y-auto bg-gray-800">
              {/* Mode */}
              <div>
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 block">
                  Mode
                </label>
                <div className="flex gap-2">
                  {modeOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setMode(option.value)}
                      className={cn(
                        'flex-1 flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all',
                        config.mode === option.value
                          ? 'bg-blue-500/10 border-blue-500/50 text-blue-400'
                          : 'border-gray-700 text-gray-400 hover:bg-gray-700/50'
                      )}
                    >
                      <option.icon className="w-5 h-5" />
                      <span className="text-xs">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Accent Color */}
              <div>
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 block">
                  Accent Color
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {accentOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setAccent(option.value)}
                      className={cn(
                        'w-full aspect-square rounded-lg flex items-center justify-center transition-all',
                        option.color,
                        config.accent === option.value
                          ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-800'
                          : 'hover:scale-110'
                      )}
                      title={option.label}
                    >
                      {config.accent === option.value && (
                        <Check className="w-4 h-4 text-white" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Style */}
              <div>
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 block">
                  Style
                </label>
                <div className="space-y-2">
                  {styleOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setStyle(option.value)}
                      className={cn(
                        'w-full flex items-center justify-between p-3 rounded-lg border transition-all text-left',
                        config.style === option.value
                          ? 'bg-blue-500/10 border-blue-500/50'
                          : 'border-gray-700 hover:bg-gray-700/50'
                      )}
                    >
                      <div>
                        <p className={cn(
                          'font-medium text-sm',
                          config.style === option.value ? 'text-blue-400' : 'text-gray-200'
                        )}>
                          {option.label}
                        </p>
                        <p className="text-xs text-gray-500">{option.description}</p>
                      </div>
                      {config.style === option.value && (
                        <Check className="w-4 h-4 text-blue-400" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Border Radius */}
              <div>
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 block">
                  Border Radius
                </label>
                <div className="flex gap-2">
                  {radiusOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setRadius(option.value)}
                      className={cn(
                        'flex-1 py-2 px-1 text-xs rounded-lg border transition-all',
                        config.radius === option.value
                          ? 'bg-blue-500/10 border-blue-500/50 text-blue-400'
                          : 'border-gray-700 text-gray-400 hover:bg-gray-700/50'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div>
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 block">
                  Preview
                </label>
                <div className="p-4 rounded-lg border border-gray-700 bg-gray-900/50">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg dify-gradient shadow-lg shadow-blue-500/20" />
                    <div>
                      <div className="h-3 w-24 rounded bg-gray-600 mb-1.5" />
                      <div className="h-2 w-16 rounded bg-gray-700" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-3 py-1.5 rounded-lg dify-gradient text-white text-xs font-medium shadow-md shadow-blue-500/20">
                      Primary
                    </button>
                    <button className="px-3 py-1.5 rounded-lg bg-gray-700 text-gray-300 text-xs font-medium">
                      Secondary
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-400 hover:text-gray-100 hover:bg-gray-800 rounded-lg transition-all"
        title="Theme Settings"
      >
        <Palette className="w-5 h-5" />
      </button>
      {createPortal(panel, document.body)}
    </div>
  );
}

// Compact theme toggle for quick mode switching
export function ThemeToggle() {
  const { config, setMode, resolvedMode } = useThemeStore();

  const toggleMode = () => {
    if (config.mode === 'dark') {
      setMode('light');
    } else if (config.mode === 'light') {
      setMode('system');
    } else {
      setMode('dark');
    }
  };

  return (
    <button
      onClick={toggleMode}
      className="p-2 text-gray-400 hover:text-gray-100 hover:bg-gray-800 rounded-lg transition-all"
      title={`Theme: ${config.mode}`}
    >
      {config.mode === 'system' ? (
        <Monitor className="w-5 h-5" />
      ) : resolvedMode === 'dark' ? (
        <Moon className="w-5 h-5" />
      ) : (
        <Sun className="w-5 h-5" />
      )}
    </button>
  );
}
