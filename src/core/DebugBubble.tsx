import React, { useRef, useMemo } from 'react';
import {
  Animated,
  PanResponder,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Text,
  View,
} from 'react-native';
import type { DebuggerTheme } from './types';

interface DebugBubbleProps {
  onPress: () => void;
  theme: DebuggerTheme;
  size?: number;
  initialPosition?: { x: number; y: number };
}

const SCREEN = Dimensions.get('window');

/**
 * DebugBubble — A floating, draggable FAB that opens the debug overlay.
 *
 * - Fully draggable via PanResponder
 * - Snaps to the nearest screen edge on release
 * - Pulses subtly to indicate interactivity
 * - Renders above all other content
 */
export const DebugBubble: React.FC<DebugBubbleProps> = ({
  onPress,
  theme,
  size = 50,
  initialPosition,
}) => {
  const defaultPos = initialPosition ?? { x: SCREEN.width - size - 16, y: SCREEN.height * 0.7 };
  const pan = useRef(new Animated.ValueXY(defaultPos)).current;
  const scale = useRef(new Animated.Value(1)).current;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gesture) => {
          // Only claim the gesture if the user has dragged more than 5px
          return Math.abs(gesture.dx) > 5 || Math.abs(gesture.dy) > 5;
        },
        onPanResponderGrant: () => {
          // Flatten offset into the value so extractOffset works correctly
          pan.extractOffset();
          Animated.spring(scale, {
            toValue: 1.15,
            useNativeDriver: true,
            friction: 5,
          }).start();
        },
        onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
          useNativeDriver: false,
        }),
        onPanResponderRelease: (_, gesture) => {
          pan.flattenOffset();

          Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
            friction: 5,
          }).start();

          // Snap to nearest horizontal edge
          const finalX = gesture.moveX > SCREEN.width / 2 ? SCREEN.width - size - 8 : 8;

          // Clamp vertical position
          const finalY = Math.max(
            50,
            Math.min(gesture.moveY - size / 2, SCREEN.height - size - 50),
          );

          Animated.spring(pan, {
            toValue: { x: finalX, y: finalY },
            useNativeDriver: false,
            friction: 7,
            tension: 40,
          }).start();

          // If the user barely moved, treat it as a tap
          if (Math.abs(gesture.dx) < 10 && Math.abs(gesture.dy) < 10) {
            onPress();
          }
        },
      }),
    [pan, scale, size, onPress],
  );

  return (
    <Animated.View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.bubbleBackground,
          transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale }],
          shadowColor: theme.shadow,
        },
      ]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity
        activeOpacity={0.8}
        style={[
          styles.inner,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}
        onPress={onPress}
      >
        <View style={styles.iconContainer}>
          <Text style={[styles.icon, { fontSize: size * 0.45 }]}>🐛</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 99999,
    elevation: 99999,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    textAlign: 'center',
  },
});
