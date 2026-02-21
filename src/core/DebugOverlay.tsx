import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  Dimensions,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import type { DebuggerPlugin, DebuggerTheme } from './types';

interface DebugOverlayProps {
  plugins: DebuggerPlugin[];
  theme: DebuggerTheme;
  onClose: () => void;
}

const SCREEN = Dimensions.get('window');

/**
 * DebugOverlay — Full-screen modal with tab navigation for plugins.
 *
 * - Slide-up animation on open
 * - Scrollable tab bar at the top
 * - Each tab renders a plugin's component
 * - Close button in the header
 */
export const DebugOverlay: React.FC<DebugOverlayProps> = ({ plugins, theme, onClose }) => {
  const [activeTab, setActiveTab] = useState(0);
  const slideAnim = useRef(new Animated.Value(SCREEN.height)).current;

  React.useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      damping: 20,
      stiffness: 120,
    }).start();
  }, [slideAnim]);

  const handleClose = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: SCREEN.height,
      duration: 250,
      useNativeDriver: true,
    }).start(() => onClose());
  }, [slideAnim, onClose]);

  const ActivePlugin = useMemo(() => {
    return plugins[activeTab]?.component;
  }, [plugins, activeTab]);

  if (plugins.length === 0) return null;

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          backgroundColor: theme.overlay,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.headerBackground }]}>
        <StatusBar barStyle="light-content" />

        {/* Header */}
        <View
          style={[
            styles.header,
            { backgroundColor: theme.headerBackground, borderBottomColor: theme.border },
          ]}
        >
          <View style={styles.headerLeft}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Prod Debugger</Text>
          </View>
          <TouchableOpacity
            onPress={handleClose}
            style={[styles.closeButton, { backgroundColor: theme.surfaceAlt }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.closeIcon, { color: theme.textSecondary }]}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Bar */}
        <View
          style={[
            styles.tabBarContainer,
            { backgroundColor: theme.headerBackground, borderBottomColor: theme.border },
          ]}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabBarContent}
          >
            {plugins.map((plugin, index) => (
              <TouchableOpacity
                key={plugin.id}
                style={[
                  styles.tab,
                  {
                    backgroundColor: index === activeTab ? theme.accent : 'transparent',
                    borderColor: index === activeTab ? theme.accent : theme.border,
                  },
                ]}
                onPress={() => setActiveTab(index)}
                activeOpacity={0.7}
              >
                {/* Removed icon to keep the UI strictly minimal */}
                <Text
                  style={[
                    styles.tabLabel,
                    {
                      color: index === activeTab ? '#FFFFFF' : theme.textSecondary,
                      fontWeight: index === activeTab ? '700' : '500',
                    },
                  ]}
                  numberOfLines={1}
                >
                  {plugin.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Active Plugin Content */}
        <View style={[styles.content, { backgroundColor: theme.background }]}>
          {ActivePlugin ? <ActivePlugin theme={theme} /> : null}
        </View>
      </SafeAreaView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999999,
    elevation: 999999,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 16,
    fontWeight: '600',
  },
  tabBarContainer: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabBarContent: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6, // Square borders like GitHub/Claude buttons
    borderWidth: 1,
    // gap removed
  },
  // tabIcon removed
  tabLabel: {
    fontSize: 13,
    maxWidth: 90,
  },
  content: {
    flex: 1,
  },
});
