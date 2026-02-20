import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
} from 'react-native';
import type { PluginComponentProps, DebuggerPlugin } from '../../core/types';
import { copyToClipboard } from '../../core/utils';

const SCREEN = Dimensions.get('window');

const DeviceInfoPanel: React.FC<PluginComponentProps> = ({ theme }) => {
  const info = useMemo(() => {
    const items: { label: string; value: string; group: string }[] = [];

    // Platform
    items.push({ label: 'Platform', value: Platform.OS, group: 'Platform' });
    items.push({ label: 'OS Version', value: String(Platform.Version), group: 'Platform' });
    items.push({
      label: 'Hermes',
      value: typeof HermesInternal !== 'undefined' ? '✅ Enabled' : '❌ Disabled',
      group: 'Platform',
    });
    items.push({
      label: '__DEV__',
      value: typeof __DEV__ !== 'undefined' && __DEV__ ? 'true' : 'false',
      group: 'Platform',
    });

    // Screen
    items.push({
      label: 'Screen',
      value: `${SCREEN.width} × ${SCREEN.height}`,
      group: 'Display',
    });
    items.push({
      label: 'Scale',
      value: String(Dimensions.get('window').scale ?? 'N/A'),
      group: 'Display',
    });
    items.push({
      label: 'Font Scale',
      value: String(Dimensions.get('window').fontScale ?? 'N/A'),
      group: 'Display',
    });

    // Runtime
    items.push({
      label: 'Locale',
      value:
        Platform.OS === 'ios'
          ? (Platform as unknown as { locale?: string }).locale || 'Unknown'
          : 'Check via library',
      group: 'Runtime',
    });

    return items;
  }, []);

  const handleCopyAll = useCallback(() => {
    const text = info.map((i) => `${i.label}: ${i.value}`).join('\n');
    copyToClipboard(text);
  }, [info]);

  const groups = useMemo(() => {
    const groupMap = new Map<string, typeof info>();
    for (const item of info) {
      const group = groupMap.get(item.group) || [];
      group.push(item);
      groupMap.set(item.group, group);
    }
    return groupMap;
  }, [info]);

  return (
    <ScrollView style={styles.container}>
      {/* Copy All */}
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>📱 Device Info</Text>
        <TouchableOpacity onPress={handleCopyAll} activeOpacity={0.7}>
          <Text style={[styles.copyAllBtn, { color: theme.accent }]}>Copy All</Text>
        </TouchableOpacity>
      </View>

      {/* Info Groups */}
      {Array.from(groups.entries()).map(([groupName, items]) => (
        <View key={groupName} style={[styles.group, { backgroundColor: theme.surface }]}>
          <Text style={[styles.groupTitle, { color: theme.textSecondary }]}>{groupName}</Text>
          {items.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.infoRow, { borderBottomColor: theme.border }]}
              onLongPress={() => copyToClipboard(item.value)}
              activeOpacity={0.7}
            >
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>{item.label}</Text>
              <Text style={[styles.infoValue, { color: theme.text }]} selectable>
                {item.value}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  copyAllBtn: { fontSize: 13, fontWeight: '600' },
  group: { marginHorizontal: 12, marginBottom: 12, borderRadius: 12, overflow: 'hidden' },
  groupTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  infoLabel: { fontSize: 13, flex: 1 },
  infoValue: { fontSize: 13, fontWeight: '600', flex: 1, textAlign: 'right' },
});

export function createDeviceInfoPlugin(): DebuggerPlugin {
  return {
    id: 'device-info',
    name: 'Device',
    icon: '📱',
    component: DeviceInfoPanel,
    order: 80,
  };
}
