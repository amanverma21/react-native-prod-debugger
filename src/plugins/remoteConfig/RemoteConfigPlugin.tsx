import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import type { PluginComponentProps, RemoteConfigValue, DebuggerPlugin } from '../../core/types';
import { remoteConfigStore } from './remoteConfigStore';
import { copyToClipboard, safeStringify, formatTimeAgo } from '../../core/utils';

const RemoteConfigPanel: React.FC<PluginComponentProps> = ({ theme }) => {
  const [values, setValues] = useState<RemoteConfigValue[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastFetch, setLastFetch] = useState<number | null>(null);
  const [hasProvider, setHasProvider] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchValues = useCallback(async () => {
    const provider = remoteConfigStore.get();
    if (!provider) return;
    setLoading(true);
    setError(null);
    try {
      const result = await provider.getAll();
      setValues(result);
      if (provider.getLastFetchTime) {
        const time = await provider.getLastFetchTime();
        setLastFetch(time);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const unsubscribe = remoteConfigStore.subscribe(() => {
      setHasProvider(!!remoteConfigStore.get());
      fetchValues();
    });
    setHasProvider(!!remoteConfigStore.get());
    fetchValues();
    return unsubscribe;
  }, [fetchValues]);

  const filteredValues = searchQuery
    ? values.filter(
        (v) =>
          v.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
          String(v.value).toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : values;

  if (!hasProvider) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>⚙️</Text>
        <Text style={[styles.emptyTitle, { color: theme.text }]}>No Config Provider</Text>
        <Text style={[styles.emptyDesc, { color: theme.textMuted }]}>
          Register a provider:{'\n\n'}
          <Text style={{ fontFamily: 'monospace', color: theme.codeText }}>
            {'setRemoteConfigProvider({\n  name: "Firebase",\n  getAll: () => [...],\n})'}
          </Text>
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View
        style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}
      >
        <View>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            {remoteConfigStore.get()?.name || 'Remote Config'}
          </Text>
          {lastFetch && (
            <Text style={[styles.lastFetch, { color: theme.textMuted }]}>
              Last fetched: {formatTimeAgo(lastFetch)}
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={fetchValues} activeOpacity={0.7}>
          <Text style={[styles.refreshBtn, { color: theme.accent }]}>
            {loading ? '...' : '↻ Refresh'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: theme.surface }]}>
        <TextInput
          style={[
            styles.searchInput,
            { color: theme.text, backgroundColor: theme.surfaceAlt, borderColor: theme.border },
          ]}
          placeholder="Search config..."
          placeholderTextColor={theme.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
        />
      </View>

      {error && (
        <View style={[styles.errorBanner, { backgroundColor: `${theme.error}20` }]}>
          <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
        </View>
      )}

      {loading && !values.length ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={theme.accent} />
        </View>
      ) : (
        <FlatList
          data={filteredValues}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.configRow, { borderBottomColor: theme.border }]}
              onLongPress={() => copyToClipboard(safeStringify(item.value, 0))}
              activeOpacity={0.7}
            >
              <View style={styles.configInfo}>
                <Text style={[styles.configKey, { color: theme.text }]}>{item.key}</Text>
                <Text style={[styles.configSource, { color: theme.textMuted }]}>{item.source}</Text>
              </View>
              <Text style={[styles.configValue, { color: theme.accent }]} numberOfLines={2}>
                {typeof item.value === 'object' ? JSON.stringify(item.value) : String(item.value)}
              </Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyListContainer}>
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                {searchQuery ? 'No matching config' : 'No config values'}
              </Text>
            </View>
          }
        />
      )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 14, fontWeight: '700' },
  lastFetch: { fontSize: 10, marginTop: 2 },
  refreshBtn: { fontSize: 13, fontWeight: '600' },
  searchContainer: { paddingHorizontal: 12, paddingVertical: 8 },
  searchInput: { height: 36, borderRadius: 8, paddingHorizontal: 12, fontSize: 13, borderWidth: 1 },
  errorBanner: { padding: 12, marginHorizontal: 12, borderRadius: 8, marginBottom: 8 },
  errorText: { fontSize: 12, fontWeight: '600' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  configRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  configInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  configKey: { fontSize: 13, fontWeight: '600', flex: 1 },
  configSource: { fontSize: 10, fontWeight: '500', textTransform: 'uppercase' },
  configValue: { fontSize: 12, fontFamily: 'monospace' },
  emptyListContainer: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 13 },
});

export function createRemoteConfigPlugin(): DebuggerPlugin {
  return {
    id: 'remote-config',
    name: 'Config',
    icon: '⚙️',
    component: RemoteConfigPanel,
    order: 50,
  };
}
