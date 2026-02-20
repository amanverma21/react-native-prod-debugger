import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import type { PluginComponentProps, DebuggerPlugin } from '../../core/types';
import { navigationStore } from './navigationStore';
import { safeStringify, copyToClipboard, formatTimestamp } from '../../core/utils';

const NavigationInspectorPanel: React.FC<PluginComponentProps> = ({ theme }) => {
  const [state, setState] = useState<Record<string, unknown> | null>(null);
  const [currentRoute, setCurrentRoute] = useState<{
    name: string;
    params?: Record<string, unknown>;
  } | null>(null);
  const [history, setHistory] = useState<
    { name: string; params?: Record<string, unknown>; timestamp: number }[]
  >([]);
  const [, forceUpdate] = useState(0);

  const refresh = useCallback(() => {
    setState(navigationStore.getState() as Record<string, unknown> | null);
    setCurrentRoute(navigationStore.getCurrentRoute());
    setHistory(navigationStore.getHistory());
    forceUpdate((n) => n + 1);
  }, []);

  useEffect(() => {
    const unsub = navigationStore.subscribe(refresh);
    refresh();
    const interval = setInterval(refresh, 2000);
    return () => {
      unsub();
      clearInterval(interval);
    };
  }, [refresh]);

  const hasRef = !!navigationStore.getRef();

  if (!hasRef) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🧭</Text>
        <Text style={[styles.emptyTitle, { color: theme.text }]}>No Navigation Ref</Text>
        <Text style={[styles.emptyDesc, { color: theme.textMuted }]}>
          Pass your navigation ref:{'\n\n'}
          <Text style={{ fontFamily: 'monospace', color: theme.codeText }}>
            {'setNavigationRef(navigationRef)'}
          </Text>
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Current Route */}
      {currentRoute && (
        <View style={[styles.section, { backgroundColor: theme.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>CURRENT ROUTE</Text>
          <View style={[styles.routeCard, { backgroundColor: theme.accent }]}>
            <Text style={styles.routeName}>{currentRoute.name}</Text>
          </View>
          {currentRoute.params && Object.keys(currentRoute.params).length > 0 && (
            <TouchableOpacity
              style={[styles.paramsBlock, { backgroundColor: theme.codeBackground }]}
              onLongPress={() => copyToClipboard(safeStringify(currentRoute.params))}
              activeOpacity={0.7}
            >
              <Text style={[styles.paramsTitle, { color: theme.textSecondary }]}>Params</Text>
              <Text style={[styles.paramsText, { color: theme.codeText }]} selectable>
                {safeStringify(currentRoute.params)}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Navigation State */}
      {state && (
        <View style={[styles.section, { backgroundColor: theme.surface }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>STATE TREE</Text>
            <TouchableOpacity
              onPress={() => copyToClipboard(safeStringify(state))}
              activeOpacity={0.7}
            >
              <Text style={[styles.copyBtn, { color: theme.accent }]}>Copy</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.codeBlock, { backgroundColor: theme.codeBackground }]}>
            <Text style={[styles.codeText, { color: theme.codeText }]} selectable>
              {String(safeStringify(state))}
            </Text>
          </View>
        </View>
      )}

      {/* History */}
      {history.length > 0 && (
        <View style={[styles.section, { backgroundColor: theme.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>ROUTE HISTORY</Text>
          {history.map((entry, i) => (
            <View key={i} style={[styles.historyRow, { borderBottomColor: theme.border }]}>
              <View style={styles.historyInfo}>
                <Text style={[styles.historyRoute, { color: theme.text }]}>{entry.name}</Text>
                <Text style={[styles.historyTime, { color: theme.textMuted }]}>
                  {formatTimestamp(entry.timestamp)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  emptyDesc: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  section: { margin: 12, borderRadius: 12, padding: 12 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  copyBtn: { fontSize: 12, fontWeight: '600' },
  routeCard: { padding: 12, borderRadius: 8, alignItems: 'center' },
  routeName: { fontSize: 18, fontWeight: '800', color: '#FFF' },
  paramsBlock: { padding: 12, borderRadius: 8, marginTop: 8 },
  paramsTitle: { fontSize: 10, fontWeight: '700', marginBottom: 4, textTransform: 'uppercase' },
  paramsText: { fontSize: 11, fontFamily: 'monospace', lineHeight: 16 },
  codeBlock: { padding: 12, borderRadius: 8 },
  codeText: { fontSize: 11, fontFamily: 'monospace', lineHeight: 16 },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  historyInfo: { flex: 1, flexDirection: 'row', justifyContent: 'space-between' },
  historyRoute: { fontSize: 13, fontWeight: '600' },
  historyTime: { fontSize: 10 },
});

export function createNavigationInspectorPlugin(): DebuggerPlugin {
  return {
    id: 'navigation-inspector',
    name: 'Nav',
    icon: '🧭',
    component: NavigationInspectorPanel,
    order: 90,
  };
}
