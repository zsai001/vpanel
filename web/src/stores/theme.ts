import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ThemeAccent = 'cyan' | 'violet' | 'emerald' | 'rose' | 'amber' | 'blue';
export type ThemeStyle = 'default' | 'glassmorphism' | 'neumorphism' | 'brutalist' | 'retro';

export interface ThemeConfig {
  mode: ThemeMode;
  accent: ThemeAccent;
  style: ThemeStyle;
  radius: 'none' | 'sm' | 'md' | 'lg' | 'full';
}

interface ThemeState {
  config: ThemeConfig;
  resolvedMode: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
  setAccent: (accent: ThemeAccent) => void;
  setStyle: (style: ThemeStyle) => void;
  setRadius: (radius: ThemeConfig['radius']) => void;
  setConfig: (config: Partial<ThemeConfig>) => void;
}

// Accent color palettes - Dify style uses blue as default
export const accentColors: Record<ThemeAccent, { primary: string; primaryLight: string; primaryDark: string }> = {
  cyan: { primary: '6 182 212', primaryLight: '34 211 238', primaryDark: '8 145 178' },
  violet: { primary: '139 92 246', primaryLight: '167 139 250', primaryDark: '109 40 217' },
  emerald: { primary: '16 185 129', primaryLight: '52 211 153', primaryDark: '5 150 105' },
  rose: { primary: '244 63 94', primaryLight: '251 113 133', primaryDark: '225 29 72' },
  amber: { primary: '245 158 11', primaryLight: '251 191 36', primaryDark: '217 119 6' },
  blue: { primary: '21 94 239', primaryLight: '59 130 246', primaryDark: '37 99 235' }, // Dify blue
};

// Style presets
export const stylePresets: Record<ThemeStyle, { 
  cardBg: string; 
  cardBorder: string; 
  cardShadow: string;
  inputBg: string;
  blur: boolean;
}> = {
  default: {
    cardBg: 'bg-dark-800/50',
    cardBorder: 'border-dark-700/50',
    cardShadow: 'shadow-lg shadow-black/10',
    inputBg: 'bg-dark-900/50',
    blur: true,
  },
  glassmorphism: {
    cardBg: 'bg-white/5',
    cardBorder: 'border-white/10',
    cardShadow: 'shadow-xl shadow-black/20',
    inputBg: 'bg-white/5',
    blur: true,
  },
  neumorphism: {
    cardBg: 'bg-dark-800',
    cardBorder: 'border-transparent',
    cardShadow: 'shadow-[8px_8px_16px_#0a0a0f,-8px_-8px_16px_#1a1a2e]',
    inputBg: 'bg-dark-800',
    blur: false,
  },
  brutalist: {
    cardBg: 'bg-dark-900',
    cardBorder: 'border-dark-100 border-2',
    cardShadow: 'shadow-[4px_4px_0px_#f1f5f9]',
    inputBg: 'bg-dark-950',
    blur: false,
  },
  retro: {
    cardBg: 'bg-gradient-to-br from-dark-800 to-dark-900',
    cardBorder: 'border-dark-600',
    cardShadow: 'shadow-lg',
    inputBg: 'bg-dark-900',
    blur: false,
  },
};

const getSystemMode = (): 'light' | 'dark' => {
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark';
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      config: {
        mode: 'dark',
        accent: 'blue', // Dify style default
        style: 'default',
        radius: 'md', // Dify uses medium radius
      },
      resolvedMode: 'dark',

      setMode: (mode) => {
        const resolvedMode = mode === 'system' ? getSystemMode() : mode;
        const newConfig = { ...get().config, mode };
        set({ config: newConfig, resolvedMode });
        applyTheme(newConfig, resolvedMode);
      },

      setAccent: (accent) => {
        const newConfig = { ...get().config, accent };
        set({ config: newConfig });
        applyTheme(newConfig, get().resolvedMode);
      },

      setStyle: (style) => {
        const newConfig = { ...get().config, style };
        set({ config: newConfig });
        applyTheme(newConfig, get().resolvedMode);
      },

      setRadius: (radius) => {
        const newConfig = { ...get().config, radius };
        set({ config: newConfig });
        applyTheme(newConfig, get().resolvedMode);
      },

      setConfig: (newConfig) => {
        const config = { ...get().config, ...newConfig };
        const resolvedMode = config.mode === 'system' ? getSystemMode() : config.mode;
        set({ config, resolvedMode });
        applyTheme(config, resolvedMode);
      },
    }),
    {
      name: 'vpanel-theme',
      onRehydrateStorage: () => (state) => {
        if (state) {
          const resolvedMode = state.config.mode === 'system' ? getSystemMode() : state.config.mode;
          state.resolvedMode = resolvedMode;
          applyTheme(state.config, resolvedMode);
        }
      },
    }
  )
);

// Apply theme to document
function applyTheme(config: ThemeConfig, resolvedMode: 'light' | 'dark') {
  const root = document.documentElement;
  
  // Apply mode
  root.classList.remove('light', 'dark');
  root.classList.add(resolvedMode);

  // Apply accent color
  const accent = accentColors[config.accent];
  root.style.setProperty('--color-primary', accent.primary);
  root.style.setProperty('--color-primary-light', accent.primaryLight);
  root.style.setProperty('--color-primary-dark', accent.primaryDark);

  // Apply border radius
  const radiusValues = {
    none: '0',
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    full: '9999px',
  };
  root.style.setProperty('--radius', radiusValues[config.radius]);

  // Apply style class
  root.dataset.style = config.style;
}

// Listen for system theme changes
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const store = useThemeStore.getState();
    if (store.config.mode === 'system') {
      const resolvedMode = e.matches ? 'dark' : 'light';
      useThemeStore.setState({ resolvedMode });
      applyTheme(store.config, resolvedMode);
    }
  });
}

