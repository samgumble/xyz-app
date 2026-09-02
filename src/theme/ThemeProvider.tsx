import React, { createContext, useCallback, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { useAppStore } from '@/store/useAppStore';

import { themes, type Theme, type ThemeName } from './themes';
import { LARGE_TEXT_SCALE, scaleType } from './typography';

export interface ThemeContextValue {
  theme: Theme;
  name: ThemeName;
  /** Flips between daylight and night and pins the choice in settings. */
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export interface ThemeProviderProps {
  children: React.ReactNode;
  /** Forces a theme; used by tests and by screens that are always dark. */
  forceName?: ThemeName;
}

export function ThemeProvider({ children, forceName }: ThemeProviderProps): React.JSX.Element {
  const preference = useAppStore((s) => s.settings.theme);
  const largeText = useAppStore((s) => s.settings.largeText);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const systemScheme = useColorScheme();

  const name: ThemeName =
    forceName ?? (preference === 'system' ? (systemScheme === 'dark' ? 'night' : 'daylight') : preference);

  const theme = useMemo<Theme>(() => {
    const base = themes[name];
    if (!largeText) return base;
    return { ...base, type: scaleType(base.type, LARGE_TEXT_SCALE) };
  }, [name, largeText]);

  const toggle = useCallback(() => {
    updateSettings({ theme: name === 'daylight' ? 'night' : 'daylight' });
  }, [name, updateSettings]);

  const value = useMemo<ThemeContextValue>(() => ({ theme, name, toggle }), [theme, name, toggle]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme() must be used inside <ThemeProvider>.');
  }
  return ctx;
}
