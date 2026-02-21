import type { DebuggerTheme } from './types';

/**
 * Default dark theme — designed for optimal readability on top of any app UI.
 * High-contrast text, muted backgrounds with alpha transparency for the overlay.
 */
export const darkTheme: DebuggerTheme = {
  background: '#000000',
  surface: '#121212',
  surfaceAlt: '#1C1C1E',
  text: '#F5F5F7',
  textSecondary: '#8E8E93',
  textMuted: '#48484A',
  accent: '#0A84FF',
  accentLight: '#5E5CE6',
  success: '#30D158',
  warning: '#FF9F0A',
  error: '#FF453A',
  info: '#64D2FF',
  border: '#2C2C2E',
  overlay: 'rgba(0, 0, 0, 0.75)',
  bubbleBackground: '#1C1C1E',
  bubbleIcon: '#F5F5F7',
  codeBackground: '#09090B',
  codeText: '#E5E5EA',
  headerBackground: '#121212',
  tabActive: '#F5F5F7',
  tabInactive: '#636366',
  statusBarOk: '#30D158',
  statusBarWarn: '#FF9F0A',
  statusBarError: '#FF453A',
  shadow: 'rgba(0, 0, 0, 0.5)',
};

/**
 * Merge user theme overrides with the default dark theme.
 */
export function createTheme(overrides?: Partial<DebuggerTheme>): DebuggerTheme {
  if (!overrides) return darkTheme;
  return { ...darkTheme, ...overrides };
}
