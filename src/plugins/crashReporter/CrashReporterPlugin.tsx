import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import type { PluginComponentProps, CrashEntry, DebuggerPlugin } from '../../core/types';
import { generateId, formatTimestamp, copyToClipboard, shareText } from '../../core/utils';

// ─── Crash Store ────────────────────────────────────────────────────────────

type CrashListener = (entries: CrashEntry[]) => void;

class CrashStoreClass {
  private entries: CrashEntry[] = [];
  private listeners: Set<CrashListener> = new Set();
  private isActive = false;
  private maxEntries = 100;
  private originalHandler: ((error: Error, isFatal?: boolean) => void) | null = null;

  start(): void {
    if (this.isActive) return;
    this.isActive = true;

    // Capture unhandled JS errors
    const ErrorUtils = (
      globalThis as unknown as {
        ErrorUtils?: {
          getGlobalHandler: () => (error: Error, isFatal?: boolean) => void;
          setGlobalHandler: (handler: (error: Error, isFatal?: boolean) => void) => void;
        };
      }
    ).ErrorUtils;
    if (ErrorUtils) {
      this.originalHandler = ErrorUtils.getGlobalHandler();
      ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
        this.addEntry({
          id: generateId(),
          timestamp: Date.now(),
          message: error.message,
          stack: error.stack,
          isFatal: isFatal ?? false,
        });
        // Forward to original handler
        if (this.originalHandler) {
          this.originalHandler(error, isFatal);
        }
      });
    }

    // Capture unhandled promise rejections
    const tracking = require('promise/setimmediate/rejection-tracking');
    if (tracking) {
      try {
        tracking.enable({
          allRejections: true,
          onUnhandled: (_id: number, error: Error) => {
            this.addEntry({
              id: generateId(),
              timestamp: Date.now(),
              message: error?.message || 'Unhandled Promise Rejection',
              stack: error?.stack,
              isFatal: false,
            });
          },
        });
      } catch {
        // Rejection tracking may not be available
      }
    }
  }

  stop(): void {
    if (!this.isActive) return;
    this.isActive = false;
    const ErrorUtils = (
      globalThis as unknown as {
        ErrorUtils?: {
          setGlobalHandler: (handler: (error: Error, isFatal?: boolean) => void) => void;
        };
      }
    ).ErrorUtils;
    if (ErrorUtils && this.originalHandler) {
      ErrorUtils.setGlobalHandler(this.originalHandler);
      this.originalHandler = null;
    }
  }

  addEntry(entry: CrashEntry): void {
    this.entries = [entry, ...this.entries].slice(0, this.maxEntries);
    this.notify();
  }

  getAll(): CrashEntry[] {
    return [...this.entries];
  }
  clear(): void {
    this.entries = [];
    this.notify();
  }

  subscribe(listener: CrashListener): () => void {
    this.listeners.add(listener);
    listener(this.entries);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const snapshot = this.entries;
    for (const l of this.listeners) {
      try {
        l(snapshot);
      } catch {
        /* ignore */
      }
    }
  }
}

const crashStore = new CrashStoreClass();

// ─── Crash Reporter Panel ───────────────────────────────────────────────────

const CrashReporterPanel: React.FC<PluginComponentProps> = ({ theme }) => {
  const [entries, setEntries] = useState<CrashEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<CrashEntry | null>(null);

  useEffect(() => {
    const unsub = crashStore.subscribe(setEntries);
    return unsub;
  }, []);

  const handleClear = useCallback(() => {
    crashStore.clear();
    setSelectedEntry(null);
  }, []);

  if (selectedEntry) {
    return (
      <View style={styles.container}>
        <View
          style={[
            styles.header,
            { backgroundColor: theme.surface, borderBottomColor: theme.border },
          ]}
        >
          <TouchableOpacity onPress={() => setSelectedEntry(null)} activeOpacity={0.7}>
            <Text style={[styles.backBtn, { color: theme.accent }]}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() =>
                copyToClipboard(`${selectedEntry.message}\n\n${selectedEntry.stack || ''}`)
              }
              activeOpacity={0.7}
            >
              <Text style={[styles.actionText, { color: theme.accent }]}>Copy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() =>
                shareText(
                  `${selectedEntry.message}\n\n${selectedEntry.stack || ''}`,
                  'Crash Report',
                )
              }
              activeOpacity={0.7}
            >
              <Text style={[styles.actionText, { color: theme.accent }]}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>
        <ScrollView style={styles.detailContent}>
          <View
            style={[
              styles.crashBadge,
              { backgroundColor: selectedEntry.isFatal ? theme.error : theme.warning },
            ]}
          >
            <Text style={styles.crashBadgeText}>
              {selectedEntry.isFatal ? 'FATAL' : 'NON-FATAL'}
            </Text>
          </View>
          <Text style={[styles.crashTime, { color: theme.textMuted }]}>
            {formatTimestamp(selectedEntry.timestamp)}
          </Text>
          <Text style={[styles.crashMessage, { color: theme.text }]}>{selectedEntry.message}</Text>
          {selectedEntry.stack && (
            <View style={[styles.stackBlock, { backgroundColor: theme.codeBackground }]}>
              <Text style={[styles.stackText, { color: theme.codeText }]} selectable>
                {selectedEntry.stack}
              </Text>
            </View>
          )}
          {selectedEntry.componentStack && (
            <View
              style={[styles.stackBlock, { backgroundColor: theme.codeBackground, marginTop: 12 }]}
            >
              <Text style={[styles.stackLabel, { color: theme.textSecondary }]}>
                Component Stack
              </Text>
              <Text style={[styles.stackText, { color: theme.codeText }]} selectable>
                {selectedEntry.componentStack}
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View
        style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}
      >
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {entries.length > 0 ? `${entries.length} crashes` : 'No crashes 🎉'}
        </Text>
        {entries.length > 0 && (
          <TouchableOpacity onPress={handleClear} activeOpacity={0.7}>
            <Text style={[styles.clearBtn, { color: theme.error }]}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.crashRow,
              {
                borderBottomColor: theme.border,
                backgroundColor: item.isFatal ? `${theme.error}10` : theme.surface,
              },
            ]}
            onPress={() => setSelectedEntry(item)}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.fatalDot,
                { backgroundColor: item.isFatal ? theme.error : theme.warning },
              ]}
            />
            <View style={styles.crashInfo}>
              <Text style={[styles.crashMsg, { color: theme.text }]} numberOfLines={2}>
                {item.message}
              </Text>
              <Text style={[styles.crashTimestamp, { color: theme.textMuted }]}>
                {formatTimestamp(item.timestamp)}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>✅</Text>
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>No crashes captured</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 14, fontWeight: '700' },
  clearBtn: { fontSize: 13, fontWeight: '700' },
  backBtn: { fontSize: 14, fontWeight: '600' },
  headerActions: { flexDirection: 'row', gap: 12 },
  actionText: { fontSize: 12, fontWeight: '600' },
  crashRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  fatalDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  crashInfo: { flex: 1 },
  crashMsg: { fontSize: 13, fontWeight: '500' },
  crashTimestamp: { fontSize: 10, marginTop: 2 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 13 },
  detailContent: { flex: 1, padding: 12 },
  crashBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  crashBadgeText: { fontSize: 10, fontWeight: '800', color: '#FFF', letterSpacing: 1 },
  crashTime: { fontSize: 11, marginBottom: 8 },
  crashMessage: { fontSize: 16, fontWeight: '700', marginBottom: 16 },
  stackBlock: { padding: 12, borderRadius: 8 },
  stackLabel: { fontSize: 11, fontWeight: '700', marginBottom: 4, textTransform: 'uppercase' },
  stackText: { fontSize: 11, fontFamily: 'monospace', lineHeight: 18 },
});

export function createCrashReporterPlugin(): DebuggerPlugin {
  return {
    id: 'crash-reporter',
    name: 'Crashes',
    icon: '💥',
    component: CrashReporterPanel,
    order: 100,
  };
}
