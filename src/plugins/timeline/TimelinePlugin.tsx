import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
} from 'react-native';
import type { PluginComponentProps, TimelineEvent, DebuggerPlugin } from '../../core/types';
import { timelineStore } from './timelineStore';
import { formatTimestamp, safeStringify, copyToClipboard } from '../../core/utils';

const CATEGORY_COLORS: Record<string, string> = {
  navigation: '#5B8DEF',
  network: '#FF9500',
  state: '#AF52DE',
  user: '#34C759',
  lifecycle: '#FF3B30',
  custom: '#8E8E93',
};

const TimelinePanel: React.FC<PluginComponentProps> = ({ theme }) => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = timelineStore.subscribe(setEvents);
    return unsub;
  }, []);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    for (const e of events) cats.add(e.category);
    return Array.from(cats);
  }, [events]);

  const filteredEvents = useMemo(() => {
    let filtered = events;
    if (categoryFilter) {
      filtered = filtered.filter((e) => e.category === categoryFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (e) => e.title.toLowerCase().includes(q) || e.category.toLowerCase().includes(q),
      );
    }
    return filtered;
  }, [events, categoryFilter, searchQuery]);

  const handleClear = useCallback(() => {
    timelineStore.clear();
    setExpandedId(null);
  }, []);

  return (
    <View style={styles.container}>
      {/* Category Filter */}
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
              backgroundColor: !categoryFilter ? theme.accent : theme.surfaceAlt,
              borderColor: theme.border,
            },
          ]}
          onPress={() => setCategoryFilter(null)}
          activeOpacity={0.7}
        >
          <Text
            style={[styles.filterText, { color: !categoryFilter ? '#FFF' : theme.textSecondary }]}
          >
            All ({events.length})
          </Text>
        </TouchableOpacity>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.filterChip,
              {
                backgroundColor:
                  categoryFilter === cat ? CATEGORY_COLORS[cat] || theme.accent : theme.surfaceAlt,
                borderColor: theme.border,
              },
            ]}
            onPress={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterText,
                {
                  color:
                    categoryFilter === cat ? '#FFF' : CATEGORY_COLORS[cat] || theme.textSecondary,
                },
              ]}
            >
              {cat}
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
          placeholder="Search events..."
          placeholderTextColor={theme.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
        />
      </View>

      {/* Event List */}
      <FlatList
        data={filteredEvents}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => {
          const catColor = CATEGORY_COLORS[item.category] || theme.textMuted;
          const timeDiff =
            index < filteredEvents.length - 1
              ? item.timestamp - filteredEvents[index + 1].timestamp
              : 0;

          return (
            <TouchableOpacity
              style={[styles.eventRow, { borderBottomColor: theme.border }]}
              onPress={() => setExpandedId(expandedId === item.id ? null : item.id)}
              activeOpacity={0.7}
            >
              <View style={styles.timelineTrack}>
                <View style={[styles.timelineDot, { backgroundColor: catColor }]} />
                {index < filteredEvents.length - 1 && (
                  <View style={[styles.timelineLine, { backgroundColor: theme.border }]} />
                )}
              </View>
              <View style={styles.eventContent}>
                <View style={styles.eventHeader}>
                  <View style={[styles.catBadge, { backgroundColor: `${catColor}20` }]}>
                    <Text style={[styles.catText, { color: catColor }]}>{item.category}</Text>
                  </View>
                  <Text style={[styles.eventTime, { color: theme.textMuted }]}>
                    {formatTimestamp(item.timestamp)}
                  </Text>
                </View>
                <Text style={[styles.eventTitle, { color: theme.text }]}>{item.title}</Text>
                {timeDiff > 0 && (
                  <Text style={[styles.timeDiff, { color: theme.textMuted }]}>
                    +{timeDiff >= 1000 ? `${(timeDiff / 1000).toFixed(1)}s` : `${timeDiff}ms`}
                  </Text>
                )}
                {expandedId === item.id && item.data !== undefined && item.data !== null && (
                  <TouchableOpacity
                    style={[styles.dataBlock, { backgroundColor: theme.codeBackground }]}
                    onLongPress={() => copyToClipboard(safeStringify(item.data))}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.dataText, { color: theme.codeText }]} selectable>
                      {String(safeStringify(item.data))}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>No events logged</Text>
          </View>
        }
        initialNumToRender={30}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterBar: { maxHeight: 44 },
  filterContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 6 },
  filterChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  filterText: { fontSize: 11, fontWeight: '600' },
  searchContainer: { paddingHorizontal: 12, paddingBottom: 8 },
  searchInput: { height: 36, borderRadius: 8, paddingHorizontal: 12, fontSize: 13, borderWidth: 1 },
  eventRow: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  timelineTrack: { width: 30, alignItems: 'center', paddingTop: 14 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, zIndex: 1 },
  timelineLine: { width: 2, flex: 1, marginTop: -2 },
  eventContent: { flex: 1, paddingVertical: 10, paddingRight: 12 },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  catBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  catText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  eventTime: { fontSize: 10 },
  eventTitle: { fontSize: 13, fontWeight: '500' },
  timeDiff: { fontSize: 10, marginTop: 2 },
  dataBlock: { padding: 8, borderRadius: 6, marginTop: 8 },
  dataText: { fontSize: 11, fontFamily: 'monospace', lineHeight: 16 },
  emptyContainer: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 13 },
});

export function createTimelinePlugin(): DebuggerPlugin {
  return {
    id: 'timeline',
    name: 'Timeline',
    icon: '📊',
    component: TimelinePanel,
    order: 130,
  };
}
