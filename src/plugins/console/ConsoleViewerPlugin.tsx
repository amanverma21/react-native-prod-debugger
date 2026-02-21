import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
} from 'react-native';
import type {
  PluginComponentProps,
  ConsoleEntry,
  ConsoleLevel,
  DebuggerPlugin,
} from '../../core/types';
import { ConsoleInterceptor } from './ConsoleInterceptor';
import { formatTimestamp, getLevelColor, copyToClipboard } from '../../core/utils';

const ConsoleViewerPanel: React.FC<PluginComponentProps> = ({ theme }) => {
  const [entries, setEntries] = useState<ConsoleEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<ConsoleLevel | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = ConsoleInterceptor.subscribe(setEntries);
    return unsubscribe;
  }, []);

  const filteredEntries = useMemo(() => {
    let filtered = entries;
    if (levelFilter) {
      filtered = filtered.filter((e) => e.level === levelFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((e) => e.message.toLowerCase().includes(q));
    }
    return filtered;
  }, [entries, searchQuery, levelFilter]);

  const levelCounts = useMemo(() => {
    const counts = { log: 0, info: 0, warn: 0, error: 0, debug: 0 };
    for (const entry of entries) {
      counts[entry.level]++;
    }
    return counts;
  }, [entries]);

  const handleClear = useCallback(() => {
    ConsoleInterceptor.clear();
    setExpandedId(null);
  }, []);

  return (
    <View style={styles.container}>
      {/* Level Filter Bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.filterBar, { backgroundColor: theme.surface }]}
        contentContainerStyle={styles.filterContent}
      >
        <TouchableOpacity
          style={[
            styles.filterChip,
            {
              backgroundColor: !levelFilter ? theme.accent : theme.surfaceAlt,
              borderColor: theme.border,
            },
          ]}
          onPress={() => setLevelFilter(null)}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterText, { color: !levelFilter ? '#FFF' : theme.textSecondary }]}>
            All ({entries.length})
          </Text>
        </TouchableOpacity>
        {(['error', 'warn', 'info', 'log', 'debug'] as ConsoleLevel[]).map((level) => (
          <TouchableOpacity
            key={level}
            style={[
              styles.filterChip,
              {
                backgroundColor: levelFilter === level ? getLevelColor(level) : theme.surfaceAlt,
                borderColor: theme.border,
              },
            ]}
            onPress={() => setLevelFilter(levelFilter === level ? null : level)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterText,
                { color: levelFilter === level ? '#FFF' : getLevelColor(level) },
              ]}
            >
              {level} ({levelCounts[level]})
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          onPress={handleClear}
          style={[
            styles.filterChip,
            { backgroundColor: theme.surfaceAlt, borderColor: theme.error },
          ]}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterText, { color: theme.error }]}>Clear</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: theme.surface }]}>
        <TextInput
          style={[
            styles.searchInput,
            { color: theme.text, backgroundColor: theme.surfaceAlt, borderColor: theme.border },
          ]}
          placeholder="Search logs..."
          placeholderTextColor={theme.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
        />
      </View>

      {/* Log List */}
      <FlatList
        data={filteredEntries}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ConsoleRow
            entry={item}
            theme={theme}
            isExpanded={expandedId === item.id}
            onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>No console output</Text>
          </View>
        }
        initialNumToRender={30}
        maxToRenderPerBatch={15}
      />
    </View>
  );
};

interface ConsoleRowProps {
  entry: ConsoleEntry;
  theme: PluginComponentProps['theme'];
  isExpanded: boolean;
  onToggle: () => void;
}

const ConsoleRow: React.FC<ConsoleRowProps> = React.memo(
  ({ entry, theme, isExpanded, onToggle }) => {
    const levelColor = getLevelColor(entry.level);
    const levelBg = `${levelColor}15`;

    return (
      <TouchableOpacity
        style={[styles.logRow, { backgroundColor: levelBg, borderBottomColor: theme.border }]}
        onPress={onToggle}
        onLongPress={() => copyToClipboard(entry.message)}
        activeOpacity={0.7}
      >
        <View style={styles.logHeader}>
          <View style={[styles.levelBadge, { backgroundColor: levelColor }]}>
            <Text style={styles.levelText}>{entry.level.toUpperCase()}</Text>
          </View>
          <Text style={[styles.logTimestamp, { color: theme.textMuted }]}>
            {formatTimestamp(entry.timestamp)}
          </Text>
        </View>
        <Text
          style={[styles.logMessage, { color: theme.text }]}
          numberOfLines={isExpanded ? undefined : 3}
        >
          {entry.message}
        </Text>
        {isExpanded && entry.message.length > 100 && (
          <TouchableOpacity
            onPress={() => copyToClipboard(entry.message)}
            style={[styles.copyLogButton, { backgroundColor: theme.surfaceAlt }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.copyLogText, { color: theme.accent }]}>Copy</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  },
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterBar: {
    flexGrow: 0,
    flexShrink: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#30363d',
    marginBottom: 8,
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: 14,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterText: { fontSize: 13, fontWeight: '500' },
  searchContainer: { paddingHorizontal: 16, paddingBottom: 12 },
  searchInput: {
    height: 36,
    borderRadius: 6,
    paddingHorizontal: 12,
    fontSize: 13,
    borderWidth: 1,
  },
  logRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  logHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  levelBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  levelText: { fontSize: 9, fontWeight: '800', color: '#FFF', letterSpacing: 0.5 },
  logTimestamp: { fontSize: 10 },
  logMessage: { fontSize: 12, fontFamily: 'monospace', lineHeight: 18 },
  copyLogButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  copyLogText: { fontSize: 12, fontWeight: '500' },
  emptyContainer: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 13 },
});

export function createConsoleViewerPlugin(): DebuggerPlugin {
  return {
    id: 'console-viewer',
    name: 'Console',
    icon: '📋',
    component: ConsoleViewerPanel,
    order: 20,
    onInit: () => ConsoleInterceptor.start(),
    onDestroy: () => ConsoleInterceptor.stop(),
  };
}
