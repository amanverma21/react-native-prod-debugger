import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet } from 'react-native';
import type { PluginComponentProps, DebuggerPlugin } from '../../core/types';
import { stateAdapterRegistry, type StateAdapter } from './stateAdapterRegistry';
import { safeStringify, copyToClipboard } from '../../core/utils';

// ─── JSON Tree Viewer ───────────────────────────────────────────────────────

interface JsonNodeProps {
  keyName: string;
  value: unknown;
  depth: number;
  theme: PluginComponentProps['theme'];
  searchQuery: string;
}

const JsonNode: React.FC<JsonNodeProps> = React.memo(
  ({ keyName, value, depth, theme, searchQuery }) => {
    const [expanded, setExpanded] = useState(depth < 2);

    const isObject = typeof value === 'object' && value !== null;
    const isArray = Array.isArray(value);
    const entries = isObject ? Object.entries(value as Record<string, unknown>) : [];
    const typeLabel = isArray ? `Array(${entries.length})` : `Object(${entries.length})`;

    const matchesSearch = searchQuery && keyName.toLowerCase().includes(searchQuery.toLowerCase());

    const valueDisplay = useMemo(() => {
      if (value === null) return 'null';
      if (value === undefined) return 'undefined';
      if (typeof value === 'boolean') return value ? 'true' : 'false';
      if (typeof value === 'number') return String(value);
      if (typeof value === 'string')
        return `"${value.length > 100 ? value.slice(0, 100) + '…' : value}"`;
      return null;
    }, [value]);

    const valueColor = useMemo(() => {
      if (value === null || value === undefined) return theme.textMuted;
      if (typeof value === 'boolean') return theme.accent;
      if (typeof value === 'number') return theme.success;
      if (typeof value === 'string') return theme.warning;
      return theme.text;
    }, [value, theme]);

    if (!isObject) {
      return (
        <TouchableOpacity
          style={[styles.nodeRow, { paddingLeft: depth * 16 }]}
          onLongPress={() => copyToClipboard(safeStringify(value, 0))}
          activeOpacity={0.7}
        >
          <Text style={[styles.nodeKey, { color: matchesSearch ? theme.accent : theme.info }]}>
            {keyName}:{' '}
          </Text>
          <Text style={[styles.nodeValue, { color: valueColor }]}>{valueDisplay}</Text>
        </TouchableOpacity>
      );
    }

    return (
      <View>
        <TouchableOpacity
          style={[styles.nodeRow, { paddingLeft: depth * 16 }]}
          onPress={() => setExpanded(!expanded)}
          onLongPress={() => copyToClipboard(safeStringify(value))}
          activeOpacity={0.7}
        >
          <Text style={[styles.nodeExpander, { color: theme.textMuted }]}>
            {expanded ? '▼' : '▶'}{' '}
          </Text>
          <Text style={[styles.nodeKey, { color: matchesSearch ? theme.accent : theme.info }]}>
            {keyName}
          </Text>
          <Text style={[styles.nodeType, { color: theme.textMuted }]}> {typeLabel}</Text>
        </TouchableOpacity>
        {expanded &&
          entries.map(([key, val]) => (
            <JsonNode
              key={key}
              keyName={key}
              value={val}
              depth={depth + 1}
              theme={theme}
              searchQuery={searchQuery}
            />
          ))}
      </View>
    );
  },
);

// ─── State Inspector Panel ──────────────────────────────────────────────────

const StateInspectorPanel: React.FC<PluginComponentProps> = ({ theme }) => {
  const [adapters, setAdapters] = useState<Map<string, StateAdapter>>(new Map());
  const [states, setStates] = useState<Map<string, unknown>>(new Map());
  const [activeStore, setActiveStore] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [, forceUpdate] = useState(0);

  // Listen for adapter registry changes
  useEffect(() => {
    const unsubscribe = stateAdapterRegistry.subscribe(() => {
      setAdapters(stateAdapterRegistry.getAll());
    });
    setAdapters(stateAdapterRegistry.getAll());
    return unsubscribe;
  }, []);

  // Subscribe to state changes from all adapters
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    const refreshStates = () => {
      const newStates = new Map<string, unknown>();
      for (const [id, adapter] of adapters) {
        try {
          newStates.set(id, adapter.getState());
        } catch {
          newStates.set(id, { error: 'Failed to read state' });
        }
      }
      setStates(newStates);
    };

    refreshStates();

    for (const [id, adapter] of adapters) {
      if (adapter.subscribe) {
        const unsub = adapter.subscribe(() => {
          try {
            setStates((prev) => {
              const next = new Map(prev);
              next.set(id, adapter.getState());
              return next;
            });
          } catch {
            // ignore
          }
        });
        unsubscribers.push(unsub);
      }
    }

    return () => unsubscribers.forEach((u) => u());
  }, [adapters]);

  const handleRefresh = useCallback(() => {
    const newStates = new Map<string, unknown>();
    for (const [id, adapter] of adapters) {
      try {
        newStates.set(id, adapter.getState());
      } catch {
        newStates.set(id, { error: 'Failed to read state' });
      }
    }
    setStates(newStates);
    forceUpdate((n) => n + 1);
  }, [adapters]);

  const handleCopyState = useCallback(
    (storeId: string) => {
      const state = states.get(storeId);
      if (state) copyToClipboard(safeStringify(state));
    },
    [states],
  );

  const storeIds = useMemo(() => Array.from(adapters.keys()), [adapters]);
  const activeStoreId = activeStore || storeIds[0] || null;
  const activeState = activeStoreId ? states.get(activeStoreId) : null;
  const activeAdapter = activeStoreId ? adapters.get(activeStoreId) : null;

  if (storeIds.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyIcon]}>🔍</Text>
        <Text style={[styles.emptyTitle, { color: theme.text }]}>No State Stores Registered</Text>
        <Text style={[styles.emptyDesc, { color: theme.textMuted }]}>
          Register your stores using:{'\n\n'}
          <Text style={{ fontFamily: 'monospace', color: theme.codeText }}>
            {
              'setStateAdapter("redux", {\n  name: "Redux Store",\n  getState: () => store.getState(),\n  subscribe: (cb) => store.subscribe(cb)\n})'
            }
          </Text>
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Store Selector */}
      {storeIds.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.storeBar, { backgroundColor: theme.surface }]}
          contentContainerStyle={styles.storeBarContent}
        >
          {storeIds.map((id) => {
            const adapter = adapters.get(id);
            return (
              <TouchableOpacity
                key={id}
                style={[
                  styles.storeChip,
                  {
                    backgroundColor: id === activeStoreId ? theme.accent : theme.surfaceAlt,
                    borderColor: theme.border,
                  },
                ]}
                onPress={() => setActiveStore(id)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.storeChipText,
                    { color: id === activeStoreId ? '#FFF' : theme.textSecondary },
                  ]}
                >
                  {adapter?.name || id}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Actions */}
      <View
        style={[
          styles.actionBar,
          { backgroundColor: theme.surface, borderBottomColor: theme.border },
        ]}
      >
        <Text style={[styles.storeName, { color: theme.text }]}>
          {activeAdapter?.name || activeStoreId}
        </Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity onPress={handleRefresh} activeOpacity={0.7} style={styles.actionBtn}>
            <Text style={[styles.actionBtnText, { color: theme.accent }]}>↻ Refresh</Text>
          </TouchableOpacity>
          {activeStoreId && (
            <TouchableOpacity
              onPress={() => handleCopyState(activeStoreId)}
              activeOpacity={0.7}
              style={styles.actionBtn}
            >
              <Text style={[styles.actionBtnText, { color: theme.accent }]}>Copy</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: theme.surface }]}>
        <TextInput
          style={[
            styles.searchInput,
            { color: theme.text, backgroundColor: theme.surfaceAlt, borderColor: theme.border },
          ]}
          placeholder="Search keys..."
          placeholderTextColor={theme.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
        />
      </View>

      {/* State Tree */}
      <ScrollView style={styles.treeContainer}>
        {activeState && typeof activeState === 'object' ? (
          Object.entries(activeState as Record<string, unknown>).map(([key, val]) => (
            <JsonNode
              key={key}
              keyName={key}
              value={val}
              depth={0}
              theme={theme}
              searchQuery={searchQuery}
            />
          ))
        ) : (
          <View style={{ padding: 12 }}>
            <Text style={[styles.nodeValue, { color: theme.text }]}>
              {safeStringify(activeState)}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
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
  storeBar: { maxHeight: 44 },
  storeBarContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 6 },
  storeChip: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  storeChipText: { fontSize: 12, fontWeight: '600' },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  storeName: { fontSize: 14, fontWeight: '700' },
  actionButtons: { flexDirection: 'row', gap: 12 },
  actionBtn: {},
  actionBtnText: { fontSize: 12, fontWeight: '600' },
  searchContainer: { paddingHorizontal: 12, paddingVertical: 8 },
  searchInput: { height: 36, borderRadius: 8, paddingHorizontal: 12, fontSize: 13, borderWidth: 1 },
  treeContainer: { flex: 1 },
  nodeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingRight: 12 },
  nodeExpander: { fontSize: 10 },
  nodeKey: { fontSize: 12, fontWeight: '600' },
  nodeType: { fontSize: 10, fontStyle: 'italic' },
  nodeValue: { fontSize: 12, flex: 1 },
});

export function createStateInspectorPlugin(): DebuggerPlugin {
  return {
    id: 'state-inspector',
    name: 'State',
    icon: '🔍',
    component: StateInspectorPanel,
    order: 30,
  };
}
