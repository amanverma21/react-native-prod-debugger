import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import type { PluginComponentProps, StorageAdapter, DebuggerPlugin } from '../../core/types';
import { storageAdapterRegistry } from './storageAdapterRegistry';
import { copyToClipboard, safeStringify, safeParse } from '../../core/utils';

const StorageBrowserPanel: React.FC<PluginComponentProps> = ({ theme }) => {
  const [adapters, setAdapters] = useState<Map<string, StorageAdapter>>(new Map());
  const [activeAdapterId, setActiveAdapterId] = useState<string | null>(null);
  const [keys, setKeys] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [selectedValue, setSelectedValue] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = storageAdapterRegistry.subscribe(() => {
      const all = storageAdapterRegistry.getAll();
      setAdapters(all);
      if (!activeAdapterId && all.size > 0) {
        setActiveAdapterId(Array.from(all.keys())[0]);
      }
    });
    const all = storageAdapterRegistry.getAll();
    setAdapters(all);
    if (all.size > 0) setActiveAdapterId(Array.from(all.keys())[0]);
    return unsubscribe;
  }, []);

  const activeAdapter = activeAdapterId ? adapters.get(activeAdapterId) : null;

  const loadKeys = useCallback(async () => {
    if (!activeAdapter) return;
    setLoading(true);
    try {
      const allKeys = await activeAdapter.getAllKeys();
      setKeys(allKeys.sort());
    } catch {
      setKeys([]);
    }
    setLoading(false);
  }, [activeAdapter]);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  const handleSelectKey = useCallback(
    async (key: string) => {
      if (!activeAdapter) return;
      setSelectedKey(key);
      try {
        const value = await activeAdapter.getItem(key);
        setSelectedValue(value ?? '');
      } catch {
        setSelectedValue('[Error reading value]');
      }
    },
    [activeAdapter],
  );

  const handleSave = useCallback(async () => {
    if (!activeAdapter || !selectedKey) return;
    try {
      await activeAdapter.setItem(selectedKey, editValue);
      setSelectedValue(editValue);
      setIsEditing(false);
    } catch {
      /* ignore */
    }
  }, [activeAdapter, selectedKey, editValue]);

  const handleDelete = useCallback(
    async (key: string) => {
      if (!activeAdapter) return;
      Alert.alert('Delete', `Delete "${key}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await activeAdapter.removeItem(key);
              if (selectedKey === key) {
                setSelectedKey(null);
                setSelectedValue('');
              }
              loadKeys();
            } catch {
              /* ignore */
            }
          },
        },
      ]);
    },
    [activeAdapter, selectedKey, loadKeys],
  );

  const handleExportAll = useCallback(async () => {
    if (!activeAdapter) return;
    const data: Record<string, string | null> = {};
    for (const key of keys) {
      try {
        data[key] = await activeAdapter.getItem(key);
      } catch {
        data[key] = null;
      }
    }
    copyToClipboard(safeStringify(data));
  }, [activeAdapter, keys]);

  const filteredKeys = useMemo(() => {
    if (!searchQuery) return keys;
    const q = searchQuery.toLowerCase();
    return keys.filter((k) => k.toLowerCase().includes(q));
  }, [keys, searchQuery]);

  const formattedValue = useMemo(() => {
    const parsed = safeParse(selectedValue);
    if (parsed !== null && typeof parsed === 'object') return safeStringify(parsed);
    return selectedValue;
  }, [selectedValue]);

  if (adapters.size === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>💾</Text>
        <Text style={[styles.emptyTitle, { color: theme.text }]}>No Storage Adapters</Text>
        <Text style={[styles.emptyDesc, { color: theme.textMuted }]}>
          Register an adapter:{'\n\n'}
          <Text style={{ fontFamily: 'monospace', color: theme.codeText }}>
            {
              'setStorageAdapter("async", {\n  name: "AsyncStorage",\n  getAllKeys: () => AsyncStorage.getAllKeys(),\n  getItem: (k) => AsyncStorage.getItem(k),\n  setItem: (k,v) => AsyncStorage.setItem(k,v),\n  removeItem: (k) => AsyncStorage.removeItem(k),\n})'
            }
          </Text>
        </Text>
      </View>
    );
  }

  if (selectedKey) {
    return (
      <View style={styles.container}>
        <View
          style={[
            styles.detailHeader,
            { backgroundColor: theme.surface, borderBottomColor: theme.border },
          ]}
        >
          <TouchableOpacity
            onPress={() => {
              setSelectedKey(null);
              setIsEditing(false);
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.backBtn, { color: theme.accent }]}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.detailActions}>
            {!isEditing && (
              <TouchableOpacity
                onPress={() => {
                  setEditValue(selectedValue);
                  setIsEditing(true);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.actionText, { color: theme.accent }]}>Edit</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => copyToClipboard(selectedValue)} activeOpacity={0.7}>
              <Text style={[styles.actionText, { color: theme.accent }]}>Copy</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(selectedKey)} activeOpacity={0.7}>
              <Text style={[styles.actionText, { color: theme.error }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={[styles.keyDisplay, { backgroundColor: theme.codeBackground }]}>
          <Text style={[styles.keyText, { color: theme.codeText }]} selectable>
            {selectedKey}
          </Text>
        </View>
        {isEditing ? (
          <View style={styles.editSection}>
            <TextInput
              style={[
                styles.editArea,
                { color: theme.text, backgroundColor: theme.surfaceAlt, borderColor: theme.border },
              ]}
              value={editValue}
              onChangeText={setEditValue}
              multiline
              textAlignVertical="top"
            />
            <View style={styles.editBtns}>
              <TouchableOpacity
                onPress={handleSave}
                style={[styles.saveBtn, { backgroundColor: theme.success }]}
                activeOpacity={0.7}
              >
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setIsEditing(false)} activeOpacity={0.7}>
                <Text style={[styles.cancelBtnText, { color: theme.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <ScrollView style={styles.valueScrollView}>
            <View style={[styles.valueBlock, { backgroundColor: theme.codeBackground }]}>
              <Text style={[styles.valueCode, { color: theme.codeText }]} selectable>
                {formattedValue}
              </Text>
            </View>
          </ScrollView>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Adapter Selector */}
      {Array.from(adapters.keys()).length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.adapterBar, { backgroundColor: theme.surface }]}
          contentContainerStyle={styles.adapterBarContent}
        >
          {Array.from(adapters.entries()).map(([id, adapter]) => (
            <TouchableOpacity
              key={id}
              style={[
                styles.adapterChip,
                {
                  backgroundColor: id === activeAdapterId ? theme.accent : theme.surfaceAlt,
                  borderColor: theme.border,
                },
              ]}
              onPress={() => setActiveAdapterId(id)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.adapterChipText,
                  { color: id === activeAdapterId ? '#FFF' : theme.textSecondary },
                ]}
              >
                {adapter.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <View
        style={[
          styles.actionBar,
          { backgroundColor: theme.surface, borderBottomColor: theme.border },
        ]}
      >
        <Text style={[styles.keyCount, { color: theme.text }]}>{keys.length} keys</Text>
        <View style={styles.actionBarBtns}>
          <TouchableOpacity onPress={loadKeys} activeOpacity={0.7}>
            <Text style={[styles.actionText, { color: theme.accent }]}>↻ Refresh</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleExportAll} activeOpacity={0.7}>
            <Text style={[styles.actionText, { color: theme.accent }]}>Export</Text>
          </TouchableOpacity>
        </View>
      </View>

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

      <FlatList
        data={filteredKeys}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.keyRow, { borderBottomColor: theme.border }]}
            onPress={() => handleSelectKey(item)}
            onLongPress={() => handleDelete(item)}
            activeOpacity={0.7}
          >
            <Text style={[styles.keyName, { color: theme.text }]}>{item}</Text>
            <Text style={[styles.keyArrow, { color: theme.textMuted }]}>›</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyListContainer}>
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              {loading ? 'Loading...' : 'No storage keys'}
            </Text>
          </View>
        }
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
  adapterBar: { maxHeight: 44 },
  adapterBarContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 6 },
  adapterChip: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  adapterChipText: { fontSize: 12, fontWeight: '600' },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  keyCount: { fontSize: 13, fontWeight: '600' },
  actionBarBtns: { flexDirection: 'row', gap: 12 },
  actionText: { fontSize: 12, fontWeight: '600' },
  searchContainer: { paddingHorizontal: 12, paddingVertical: 8 },
  searchInput: { height: 36, borderRadius: 8, paddingHorizontal: 12, fontSize: 13, borderWidth: 1 },
  keyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  keyName: { fontSize: 13, fontFamily: 'monospace', flex: 1 },
  keyArrow: { fontSize: 18 },
  emptyListContainer: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 13 },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { fontSize: 14, fontWeight: '600' },
  detailActions: { flexDirection: 'row', gap: 12 },
  keyDisplay: { padding: 12 },
  keyText: { fontSize: 12, fontFamily: 'monospace' },
  valueScrollView: { flex: 1 },
  valueBlock: { padding: 12, margin: 12, borderRadius: 8 },
  valueCode: { fontSize: 12, fontFamily: 'monospace', lineHeight: 18 },
  editSection: { flex: 1, padding: 12 },
  editArea: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 12,
    fontFamily: 'monospace',
  },
  editBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    justifyContent: 'flex-end',
  },
  saveBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8 },
  saveBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  cancelBtnText: { fontSize: 13 },
});

export function createStorageBrowserPlugin(): DebuggerPlugin {
  return {
    id: 'storage-browser',
    name: 'Storage',
    icon: '💾',
    component: StorageBrowserPanel,
    order: 60,
  };
}
