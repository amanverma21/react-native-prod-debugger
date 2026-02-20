import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  Linking,
  Alert,
} from 'react-native';
import type { PluginComponentProps, DebuggerPlugin } from '../../core/types';

const DeepLinkTesterPanel: React.FC<PluginComponentProps> = ({ theme }) => {
  const [url, setUrl] = useState('');
  const [history, setHistory] = useState<{ url: string; timestamp: number; success: boolean }[]>(
    [],
  );
  const [presets, setPresets] = useState<string[]>([]);

  const handleOpen = useCallback(async () => {
    if (!url.trim()) return;
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        setHistory((prev) => [{ url, timestamp: Date.now(), success: true }, ...prev].slice(0, 20));
      } else {
        Alert.alert('Error', `Cannot open URL: ${url}`);
        setHistory((prev) =>
          [{ url, timestamp: Date.now(), success: false }, ...prev].slice(0, 20),
        );
      }
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed');
      setHistory((prev) => [{ url, timestamp: Date.now(), success: false }, ...prev].slice(0, 20));
    }
  }, [url]);

  const handleSavePreset = useCallback(() => {
    if (!url.trim() || presets.includes(url)) return;
    setPresets((prev) => [url, ...prev]);
  }, [url, presets]);

  return (
    <ScrollView style={styles.container}>
      {/* URL Input */}
      <View style={[styles.inputSection, { backgroundColor: theme.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>DEEP LINK URL</Text>
        <TextInput
          style={[
            styles.urlInput,
            { color: theme.text, backgroundColor: theme.surfaceAlt, borderColor: theme.border },
          ]}
          value={url}
          onChangeText={setUrl}
          placeholder="myapp://path/to/screen?param=value"
          placeholderTextColor={theme.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: theme.accent }]}
            onPress={handleOpen}
            activeOpacity={0.7}
          >
            <Text style={styles.primaryBtnText}>🔗 Open Link</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: theme.border }]}
            onPress={handleSavePreset}
            activeOpacity={0.7}
          >
            <Text style={[styles.secondaryBtnText, { color: theme.textSecondary }]}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Common Schemes */}
      <View style={[styles.section, { backgroundColor: theme.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>COMMON SCHEMES</Text>
        <View style={styles.schemeGrid}>
          {[
            'tel:+1234567890',
            'mailto:test@example.com',
            'sms:+1234567890',
            'https://example.com',
            'geo:37.7749,-122.4194',
          ].map((scheme) => (
            <TouchableOpacity
              key={scheme}
              style={[
                styles.schemeChip,
                { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
              ]}
              onPress={() => setUrl(scheme)}
              activeOpacity={0.7}
            >
              <Text style={[styles.schemeText, { color: theme.text }]} numberOfLines={1}>
                {scheme.length > 25 ? scheme.slice(0, 25) + '…' : scheme}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Saved Presets */}
      {presets.length > 0 && (
        <View style={[styles.section, { backgroundColor: theme.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>SAVED PRESETS</Text>
          {presets.map((preset, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.presetRow, { borderBottomColor: theme.border }]}
              onPress={() => setUrl(preset)}
              activeOpacity={0.7}
            >
              <Text style={[styles.presetText, { color: theme.accent }]} numberOfLines={1}>
                {preset}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* History */}
      {history.length > 0 && (
        <View style={[styles.section, { backgroundColor: theme.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>HISTORY</Text>
          {history.map((entry, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.historyRow, { borderBottomColor: theme.border }]}
              onPress={() => setUrl(entry.url)}
              activeOpacity={0.7}
            >
              <Text style={[styles.historyStatus]}>{entry.success ? '✅' : '❌'}</Text>
              <Text style={[styles.historyUrl, { color: theme.text }]} numberOfLines={1}>
                {entry.url}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  inputSection: { margin: 12, padding: 12, borderRadius: 12 },
  section: { margin: 12, marginTop: 0, padding: 12, borderRadius: 12 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  urlInput: {
    height: 44,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    borderWidth: 1,
    fontFamily: 'monospace',
  },
  buttonRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  primaryBtn: {
    flex: 1,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  secondaryBtn: {
    paddingHorizontal: 16,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  secondaryBtnText: { fontSize: 13, fontWeight: '600' },
  schemeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  schemeChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  schemeText: { fontSize: 11, fontFamily: 'monospace' },
  presetRow: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  presetText: { fontSize: 13, fontFamily: 'monospace' },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  historyStatus: { fontSize: 12 },
  historyUrl: { fontSize: 12, fontFamily: 'monospace', flex: 1 },
});

export function createDeepLinkTesterPlugin(): DebuggerPlugin {
  return {
    id: 'deep-link-tester',
    name: 'Links',
    icon: '🔗',
    component: DeepLinkTesterPanel,
    order: 120,
  };
}
