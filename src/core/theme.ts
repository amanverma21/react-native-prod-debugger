import type { DebuggerTheme } from './types';

/**
 * Default dark theme — designed for optimal readability on top of any app UI.
 * High-contrast text, muted backgrounds with alpha transparency for the overlay.
 */
export const darkTheme: DebuggerTheme = {
  background: '#0D0D0D',
  surface: '#1A1A2E',
  surfaceAlt: '#16213E',
  text: '#EAEAEA',
  textSecondary: '#A0A0B0',
  textMuted: '#6B6B80',
  accent: '#7C3AED',
  accentLight: '#A78BFA',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  border: '#2A2A3E',
  overlay: 'rgba(0, 0, 0, 0.85)',
  bubbleBackground: '#7C3AED',
  bubbleIcon: '#FFFFFF',
  codeBackground: '#111122',
  codeText: '#A5D6FF',
  headerBackground: '#0F0F23',
  tabActive: '#7C3AED',
  tabInactive: '#4A4A5E',
  statusBarOk: '#10B981',
  statusBarWarn: '#F59E0B',
  statusBarError: '#EF4444',
  shadow: 'rgba(0, 0, 0, 0.5)',
};

/**
 * Merge user theme overrides with the default dark theme.
 */
export function createTheme(overrides?: Partial<DebuggerTheme>): DebuggerTheme {
  if (!overrides) return darkTheme;
  return { ...darkTheme, ...overrides };
}
