import React, { useRef, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import type { GestureType, ChildrenProp } from './types';

interface GestureDetectorProps extends ChildrenProp {
  gesture: GestureType;
  numberOfFingers: number;
  longPressDuration: number;
  onActivate: () => void;
}

/**
 * GestureDetector — Invisible wrapper that detects multi-touch gestures.
 *
 * Supported gestures:
 * - `threeFingerLongPress`: N fingers held down for duration ms
 * - `twoFingerTripleTap`: 2 fingers tapped 3 times quickly
 * - `shake`: (detected elsewhere — React Native DevMenu shim)
 * - `custom`: (no built-in behavior — consumers control programmatically)
 */
export const GestureDetector: React.FC<GestureDetectorProps> = ({
  children,
  gesture,
  numberOfFingers,
  longPressDuration,
  onActivate,
}) => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleTouchStart = useCallback(
    (event: { nativeEvent: { touches: unknown[] } }) => {
      const touchCount = event.nativeEvent.touches?.length ?? 0;

      if (gesture === 'threeFingerLongPress') {
        if (touchCount >= numberOfFingers) {
          clearTimer();
          timerRef.current = setTimeout(() => {
            onActivate();
          }, longPressDuration);
        }
      }

      if (gesture === 'twoFingerTripleTap') {
        if (touchCount >= 2) {
          tapCountRef.current += 1;

          if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
          tapTimerRef.current = setTimeout(() => {
            tapCountRef.current = 0;
          }, 600); // Reset tap count after 600ms idle

          if (tapCountRef.current >= 3) {
            tapCountRef.current = 0;
            onActivate();
          }
        }
      }
    },
    [gesture, numberOfFingers, longPressDuration, onActivate, clearTimer],
  );

  const handleTouchEnd = useCallback(() => {
    if (gesture === 'threeFingerLongPress') {
      clearTimer();
    }
  }, [gesture, clearTimer]);

  if (gesture === 'custom' || gesture === 'shake') {
    return <View style={styles.flex}>{children}</View>;
  }

  return (
    <View
      style={styles.flex}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
