import { useContext } from 'react';
import { DebuggerContext } from './DebuggerProvider';
import type { DebuggerContextValue } from './types';

/**
 * Hook to access the debugger context.
 *
 * @example
 * ```tsx
 * const { show, hide, toggle, isVisible } = useDebugger();
 *
 * // Programmatically open the debugger
 * show();
 * ```
 */
export function useDebugger(): DebuggerContextValue {
  const context = useContext(DebuggerContext);
  if (!context) {
    throw new Error(
      '[react-native-prod-debugger] useDebugger must be used within a <DebuggerProvider>.',
    );
  }
  return context;
}
