import type { DebuggerTheme } from './types';

/**
 * Default dark theme — designed for optimal readability on top of any app UI.
 * High-contrast text, muted backgrounds with alpha transparency for the overlay.
 */
export const darkTheme: DebuggerTheme = {
  background: '#0d1117', // GitHub canvas
  surface: '#161b22', // GitHub secondary
  surfaceAlt: '#21262d', // GitHub tertiary / hover
  text: '#c9d1d9', // GitHub primary text
  textSecondary: '#8b949e', // GitHub muted text
  textMuted: '#6e7681', // GitHub extremely muted
  accent: '#58a6ff', // GitHub accent blue
  accentLight: '#79c0ff', // GitHub accent light
  success: '#3fb950', // GitHub success green
  warning: '#d29922', // GitHub warning warm
  error: '#f85149', // GitHub danger red
  info: '#a5d6ff', // GitHub info blue
  border: '#30363d', // GitHub border default
  overlay: 'rgba(1, 4, 9, 0.8)', // GitHub overlay
  bubbleBackground: '#161b22',
  bubbleIcon: '#c9d1d9',
  codeBackground: '#010409', // GitHub darker background for code
  codeText: '#e6edf3', // GitHub code text
  headerBackground: '#161b22', // Header background matching surface
  tabActive: '#c9d1d9',
  tabInactive: '#8b949e',
  statusBarOk: '#3fb950',
  statusBarWarn: '#d29922',
  statusBarError: '#f85149',
  shadow: 'rgba(0, 0, 0, 0.8)',
};

/**
 * Merge user theme overrides with the default dark theme.
 */
export function createTheme(overrides?: Partial<DebuggerTheme>): DebuggerTheme {
  if (!overrides) return darkTheme;
  return { ...darkTheme, ...overrides };
}
