import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme as useSystemColorScheme } from 'react-native';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
  isDark: boolean;
  colors: ThemeColors;
}

interface ThemeColors {
  background: string;
  surface: string;
  surfaceContainer: string;
  surfaceContainerLow: string;
  surfaceContainerHigh: string;
  surfaceContainerHighest: string;
  surfaceContainerLowest: string;
  primary: string;
  primaryContainer: string;
  onPrimary: string;
  onPrimaryContainer: string;
  secondary: string;
  secondaryContainer: string;
  onSecondary: string;
  tertiary: string;
  tertiaryContainer: string;
  error: string;
  errorContainer: string;
  onError: string;
  onBackground: string;
  onSurface: string;
  onSurfaceVariant: string;
  outline: string;
  outlineVariant: string;
  inverseSurface: string;
  inverseOnSurface: string;
  inversePrimary: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  cardBackground: string;
  inputBackground: string;
  inputBorder: string;
  tabBarBackground: string;
  tabBarActive: string;
  tabBarInactive: string;
  modalOverlay: string;
  modalBackground: string;
  buttonPrimary: string;
  buttonPrimaryText: string;
  accentPink: string;
  accentPinkDim: string;
  separator: string;
  placeholder: string;
  calendarBg: string;
  calendarText: string;
  calendarDisabled: string;
  calendarArrow: string;
  calendarToday: string;
  calendarSectionTitle: string;
  iconDefault: string;
  starColor: string;
  dangerText: string;
  statusBarStyle: 'light' | 'dark';
  blurTint: 'light' | 'dark' | 'default';
}

// ── Dark Theme (Midnight Rose Glass - từ Stitch) ──
const darkColors: ThemeColors = {
  // Backgrounds
  background: '#1a0d14',
  surface: '#1a0d14',
  surfaceContainer: 'rgba(249, 180, 210, 0.1)',
  surfaceContainerLow: 'rgba(249, 180, 210, 0.05)',
  surfaceContainerHigh: '#2a1620',
  surfaceContainerHighest: '#393335',
  surfaceContainerLowest: '#120d0f',

  // Primary
  primary: '#f9b4d2',
  primaryContainer: '#f9b4d2',
  onPrimary: '#1a0d14',
  onPrimaryContainer: '#77425c',

  // Secondary
  secondary: '#e0bdca',
  secondaryContainer: '#5b424d',
  onSecondary: '#412a34',

  // Tertiary (success/green)
  tertiary: '#c7eeb5',
  tertiaryContainer: '#acd29b',

  // Error
  error: '#ffb4ab',
  errorContainer: '#93000a',
  onError: '#690005',

  // Text / On-colors
  onBackground: '#ebe0e2',
  onSurface: '#ebe0e2',
  onSurfaceVariant: '#d4c2c8',

  // Outline
  outline: '#9d8d92',
  outlineVariant: 'rgba(249, 180, 210, 0.2)',

  // Inverse
  inverseSurface: '#ebe0e2',
  inverseOnSurface: '#352f31',
  inversePrimary: '#844d67',

  // Specific UI colors
  text: '#ebe0e2',
  textSecondary: '#d4c2c8',
  textMuted: '#9d8d92',
  cardBackground: '#2a1620',
  inputBackground: '#2a1620',
  inputBorder: '#5b424d',
  tabBarBackground: '#1C1C1E',
  tabBarActive: '#F9B3D1',
  tabBarInactive: '#8E8E93',
  modalOverlay: 'rgba(0,0,0,0.8)',
  modalBackground: '#2a1620',
  buttonPrimary: '#EC4899',
  buttonPrimaryText: '#000',
  accentPink: '#F9B3D1',
  accentPinkDim: '#EC489930',
  separator: 'rgba(249, 180, 210, 0.1)',
  placeholder: '#52525B',
  calendarBg: '#18181B',
  calendarText: '#FAFAFA',
  calendarDisabled: '#3F3F46',
  calendarArrow: '#EC4899',
  calendarToday: '#EC4899',
  calendarSectionTitle: '#71717A',
  iconDefault: '#71717A',
  starColor: '#FBBF24',
  dangerText: '#EF4444',
  statusBarStyle: 'light' as const,
  blurTint: 'dark' as const,
};

// ── Light Theme (Roseate Muse - từ Stitch) ──
const lightColors: ThemeColors = {
  // Backgrounds
  background: '#fff8f9',
  surface: '#fff8f9',
  surfaceContainer: '#f3eced',
  surfaceContainerLow: '#f9f2f3',
  surfaceContainerHigh: '#ede7e8',
  surfaceContainerHighest: '#e7e1e2',
  surfaceContainerLowest: '#ffffff',

  // Primary
  primary: '#9e365c',
  primaryContainer: '#bd4e74',
  onPrimary: '#ffffff',
  onPrimaryContainer: '#fffbff',

  // Secondary
  secondary: '#755660',
  secondaryContainer: '#fed5e0',
  onSecondary: '#ffffff',

  // Tertiary (success/green)
  tertiary: '#78515a',
  tertiaryContainer: '#936973',

  // Error
  error: '#ba1a1a',
  errorContainer: '#ffdad6',
  onError: '#ffffff',

  // Text / On-colors
  onBackground: '#1d1b1c',
  onSurface: '#1d1b1c',
  onSurfaceVariant: '#554246',

  // Outline
  outline: '#887176',
  outlineVariant: '#dbc0c5',

  // Inverse
  inverseSurface: '#323031',
  inverseOnSurface: '#f6eff0',
  inversePrimary: '#ffb1c6',

  // Specific UI colors
  text: '#1d1b1c',
  textSecondary: '#554246',
  textMuted: '#887176',
  cardBackground: '#ffffff',
  inputBackground: '#f9f2f3',
  inputBorder: '#dbc0c5',
  tabBarBackground: '#ffffff',
  tabBarActive: '#9e365c',
  tabBarInactive: '#887176',
  modalOverlay: 'rgba(0,0,0,0.4)',
  modalBackground: '#ffffff',
  buttonPrimary: '#9e365c',
  buttonPrimaryText: '#ffffff',
  accentPink: '#9e365c',
  accentPinkDim: '#9e365c30',
  separator: '#ede7e8',
  placeholder: '#887176',
  calendarBg: '#ffffff',
  calendarText: '#1d1b1c',
  calendarDisabled: '#dbc0c5',
  calendarArrow: '#9e365c',
  calendarToday: '#9e365c',
  calendarSectionTitle: '#887176',
  iconDefault: '#887176',
  starColor: '#FBBF24',
  dangerText: '#ba1a1a',
  statusBarStyle: 'dark' as const,
  blurTint: 'light' as const,
};

const THEME_STORAGE_KEY = '@tinacamera_theme';

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
  setTheme: () => {},
  isDark: false,
  colors: lightColors,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [theme, setThemeState] = useState<ThemeMode>('light');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Load saved theme preference
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark') {
        setThemeState(stored);
      }
      setLoaded(true);
    });
  }, []);

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  };

  const isDark = theme === 'dark';
  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, isDark, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export { darkColors, lightColors };
