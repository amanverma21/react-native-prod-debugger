import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Switch,
  TextInput,
  StyleSheet,
  ScrollView,
} from 'react-native';
import type { PluginComponentProps, FeatureFlag, DebuggerPlugin } from '../../core/types';
import { flagStore } from './flagStore';

const FeatureFlagsPanel: React.FC<PluginComponentProps> = ({ theme }) => {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState<string | null>(null);
  const [editingFlag, setEditingFlag] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    const unsubscribe = flagStore.subscribe(setFlags);
    return unsubscribe;
  }, []);

  const groups = useMemo(() => {
    const groupSet = new Set<string>();
    for (const flag of flags) {
      if (flag.group) groupSet.add(flag.group);
    }
    return Array.from(groupSet).sort();
  }, [flags]);

  const filteredFlags = useMemo(() => {
    let filtered = flags;
    if (groupFilter) {
      filtered = filtered.filter((f) => f.group === groupFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (f) =>
          f.key.toLowerCase().includes(q) ||
          f.label?.toLowerCase().includes(q) ||
          f.description?.toLowerCase().includes(q),
      );
    }
    return filtered;
  }, [flags, searchQuery, groupFilter]);

  const handleToggle = useCallback((key: string, currentValue: boolean) => {
    flagStore.override(key, !currentValue);
  }, []);

  const handleSaveEdit = useCallback(
    (flag: FeatureFlag) => {
      let parsed: FeatureFlag['currentValue'] = editValue;
      if (flag.type === 'number') {
        parsed = Number(editValue);
        if (isNaN(parsed as number)) return;
      } else if (flag.type === 'json') {
        try {
          parsed = JSON.parse(editValue);
        } catch {
          return;
        }
      }
      flagStore.override(flag.key, parsed);
      setEditingFlag(null);
    },
    [editValue],
  );

  const handleResetAll = useCallback(() => {
    flagStore.resetAll();
  }, []);

  const isOverridden = useCallback((flag: FeatureFlag) => {
    return JSON.stringify(flag.currentValue) !== JSON.stringify(flag.defaultValue);
  }, []);

  if (flags.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🚩</Text>
        <Text style={[styles.emptyTitle, { color: theme.text }]}>No Feature Flags</Text>
        <Text style={[styles.emptyDesc, { color: theme.textMuted }]}>
          Register flags using:{'\n\n'}
          <Text style={{ fontFamily: 'monospace', color: theme.codeText }}>
            {'registerFlag({\n  key: "dark_mode",\n  type: "boolean",\n  defaultValue: false\n})'}
          </Text>
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View
        style={[
          styles.headerBar,
          { backgroundColor: theme.surface, borderBottomColor: theme.border },
        ]}
      >
        <Text style={[styles.headerText, { color: theme.text }]}>{flags.length} flags</Text>
        <TouchableOpacity onPress={handleResetAll} activeOpacity={0.7}>
          <Text style={[styles.resetText, { color: theme.warning }]}>Reset All</Text>
        </TouchableOpacity>
      </View>

      {/* Groups */}
      {groups.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.groupBar, { backgroundColor: theme.surface }]}
          contentContainerStyle={styles.groupBarContent}
        >
          <TouchableOpacity
            style={[
              styles.groupChip,
              {
                backgroundColor: !groupFilter ? theme.accent : theme.surfaceAlt,
                borderColor: theme.border,
              },
            ]}
            onPress={() => setGroupFilter(null)}
            activeOpacity={0.7}
          >
            <Text
              style={[styles.groupChipText, { color: !groupFilter ? '#FFF' : theme.textSecondary }]}
            >
              All
            </Text>
          </TouchableOpacity>
          {groups.map((group) => (
            <TouchableOpacity
              key={group}
              style={[
                styles.groupChip,
                {
                  backgroundColor: groupFilter === group ? theme.accent : theme.surfaceAlt,
                  borderColor: theme.border,
                },
              ]}
              onPress={() => setGroupFilter(groupFilter === group ? null : group)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.groupChipText,
                  { color: groupFilter === group ? '#FFF' : theme.textSecondary },
                ]}
              >
                {group}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: theme.surface }]}>
        <TextInput
          style={[
            styles.searchInput,
            { color: theme.text, backgroundColor: theme.surfaceAlt, borderColor: theme.border },
          ]}
          placeholder="Search flags..."
          placeholderTextColor={theme.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
        />
      </View>

      {/* Flags List */}
      <FlatList
        data={filteredFlags}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => (
          <View
            style={[
              styles.flagRow,
              {
                backgroundColor: isOverridden(item) ? `${theme.warning}10` : theme.surface,
                borderBottomColor: theme.border,
              },
            ]}
          >
            <View style={styles.flagInfo}>
              <View style={styles.flagNameRow}>
                <Text style={[styles.flagKey, { color: theme.text }]}>
                  {item.label || item.key}
                </Text>
                {isOverridden(item) && (
                  <TouchableOpacity onPress={() => flagStore.reset(item.key)} activeOpacity={0.7}>
                    <Text style={[styles.resetFlag, { color: theme.warning }]}>Reset</Text>
                  </TouchableOpacity>
                )}
              </View>
              {item.description && (
                <Text style={[styles.flagDesc, { color: theme.textMuted }]}>
                  {item.description}
                </Text>
              )}
              <Text style={[styles.flagMeta, { color: theme.textMuted }]}>
                {item.key} • {item.type}
                {item.group ? ` • ${item.group}` : ''}
              </Text>
            </View>
            <View style={styles.flagControl}>
              {item.type === 'boolean' ? (
                <Switch
                  value={item.currentValue as boolean}
                  onValueChange={() => handleToggle(item.key, item.currentValue as boolean)}
                  trackColor={{ false: theme.border, true: theme.accent }}
                  thumbColor="#FFFFFF"
                />
              ) : editingFlag === item.key ? (
                <View style={styles.editContainer}>
                  <TextInput
                    style={[
                      styles.editInput,
                      {
                        color: theme.text,
                        borderColor: theme.accent,
                        backgroundColor: theme.surfaceAlt,
                      },
                    ]}
                    value={editValue}
                    onChangeText={setEditValue}
                    autoFocus
                    autoCapitalize="none"
                  />
                  <View style={styles.editButtons}>
                    <TouchableOpacity onPress={() => handleSaveEdit(item)} activeOpacity={0.7}>
                      <Text style={[styles.editSave, { color: theme.success }]}>Save</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setEditingFlag(null)} activeOpacity={0.7}>
                      <Text style={[styles.editCancel, { color: theme.textMuted }]}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => {
                    setEditingFlag(item.key);
                    setEditValue(
                      typeof item.currentValue === 'object'
                        ? JSON.stringify(item.currentValue, null, 2)
                        : String(item.currentValue),
                    );
                  }}
                  style={[styles.valueButton, { backgroundColor: theme.surfaceAlt }]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.valueText, { color: theme.text }]} numberOfLines={1}>
                    {typeof item.currentValue === 'object'
                      ? JSON.stringify(item.currentValue)
                      : String(item.currentValue)}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      />
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
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerText: { fontSize: 13, fontWeight: '600' },
  resetText: { fontSize: 12, fontWeight: '700' },
  groupBar: { maxHeight: 44 },
  groupBarContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 6 },
  groupChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  groupChipText: { fontSize: 11, fontWeight: '600' },
  searchContainer: { paddingHorizontal: 12, paddingBottom: 8 },
  searchInput: { height: 36, borderRadius: 8, paddingHorizontal: 12, fontSize: 13, borderWidth: 1 },
  flagRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  flagInfo: { marginBottom: 8 },
  flagNameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  flagKey: { fontSize: 14, fontWeight: '600' },
  resetFlag: { fontSize: 11, fontWeight: '600' },
  flagDesc: { fontSize: 12, marginTop: 2 },
  flagMeta: { fontSize: 10, marginTop: 2, fontFamily: 'monospace' },
  flagControl: { alignItems: 'flex-end' },
  editContainer: { width: '100%' },
  editInput: {
    height: 36,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 13,
    borderWidth: 1,
    marginBottom: 8,
  },
  editButtons: { flexDirection: 'row', gap: 12, justifyContent: 'flex-end' },
  editSave: { fontSize: 13, fontWeight: '700' },
  editCancel: { fontSize: 13 },
  valueButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, maxWidth: 200 },
  valueText: { fontSize: 12, fontFamily: 'monospace' },
});

export function createFeatureFlagsPlugin(): DebuggerPlugin {
  return {
    id: 'feature-flags',
    name: 'Flags',
    icon: '🚩',
    component: FeatureFlagsPanel,
    order: 40,
  };
}
