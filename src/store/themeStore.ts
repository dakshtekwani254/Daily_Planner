import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeName = 'midnight-blue' | 'emerald-green' | 'crimson-red' | 'golden-yellow';

interface ThemeState {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'midnight-blue',
      setTheme: (theme) => {
        set({ theme });
        if (typeof window !== 'undefined') {
          const root = window.document.documentElement;
          root.classList.remove('theme-midnight-blue', 'theme-emerald-green', 'theme-crimson-red', 'theme-golden-yellow');
          root.classList.add(`theme-${theme}`);
        }
      },
    }),
    {
      name: 'theme-storage',
    }
  )
);
