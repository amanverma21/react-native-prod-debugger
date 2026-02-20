import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import type { PluginComponentProps, CustomAction, DebuggerPlugin } from '../../core/types';
import { actionStore } from './actionStore';

const CustomActionsPanel: React.FC<PluginComponentProps> = ({ theme }) => {
  const [actions, setActions] = useState<CustomAction[]>([]);
  const [runningAction, setRunningAction] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{
    id: string;
    success: boolean;
    message?: string;
  } | null>(null);

  useEffect(() => {
    const unsub = actionStore.subscribe(setActions);
    return unsub;
  }, []);

  const handleRun = useCallback(async (action: CustomAction) => {
    const execute = async () => {
      setRunningAction(action.id);
      setLastResult(null);
      try {
        await action.handler();
        setLastResult({ id: action.id, success: true, message: 'Completed' });
      } catch (err) {
        setLastResult({
          id: action.id,
          success: false,
          message: err instanceof Error ? err.message : 'Failed',
        });
      }
      setRunningAction(null);
    };

    if (action.destructive) {
      Alert.alert('⚠️ Confirm', `Run "${action.name}"? This action is marked as destructive.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Run', style: 'destructive', onPress: execute },
      ]);
    } else {
      execute();
    }
  }, []);

  const groups = React.useMemo(() => {
    const groupMap = new Map<string, CustomAction[]>();
    for (const action of actions) {
      const group = action.group || 'General';
      const list = groupMap.get(group) || [];
      list.push(action);
      groupMap.set(group, list);
    }
    return groupMap;
  }, [actions]);

  if (actions.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🎯</Text>
        <Text style={[styles.emptyTitle, { color: theme.text }]}>No Custom Actions</Text>
        <Text style={[styles.emptyDesc, { color: theme.textMuted }]}>
          Register actions:{'\n\n'}
          <Text style={{ fontFamily: 'monospace', color: theme.codeText }}>
            {
              'registerAction({\n  id: "clear-cache",\n  name: "Clear Cache",\n  icon: "🗑️",\n  handler: () => clearCache(),\n})'
            }
          </Text>
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Result Banner */}
      {lastResult && (
        <View
          style={[
            styles.resultBanner,
            { backgroundColor: lastResult.success ? `${theme.success}20` : `${theme.error}20` },
          ]}
        >
          <Text
            style={[styles.resultText, { color: lastResult.success ? theme.success : theme.error }]}
          >
            {lastResult.success ? '✅' : '❌'} {lastResult.message}
          </Text>
        </View>
      )}

      {/* Action Groups */}
      {Array.from(groups.entries()).map(([groupName, groupActions]) => (
        <View key={groupName} style={styles.group}>
          <Text style={[styles.groupTitle, { color: theme.textSecondary }]}>{groupName}</Text>
          <View style={styles.grid}>
            {groupActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={[
                  styles.actionCard,
                  {
                    backgroundColor: theme.surface,
                    borderColor: action.destructive ? theme.error : theme.border,
                  },
                ]}
                onPress={() => handleRun(action)}
                activeOpacity={0.7}
                disabled={!!runningAction}
              >
                {runningAction === action.id ? (
                  <ActivityIndicator color={theme.accent} size="small" />
                ) : (
                  <>
                    <Text style={styles.actionIcon}>{action.icon || '⚡'}</Text>
                    <Text
                      style={[
                        styles.actionName,
                        { color: action.destructive ? theme.error : theme.text },
                      ]}
                      numberOfLines={1}
                    >
                      {action.name}
                    </Text>
                    {action.description && (
                      <Text
                        style={[styles.actionDesc, { color: theme.textMuted }]}
                        numberOfLines={2}
                      >
                        {action.description}
                      </Text>
                    )}
                  </>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}
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
  resultBanner: { padding: 10, marginHorizontal: 12, marginVertical: 8, borderRadius: 8 },
  resultText: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  group: { paddingHorizontal: 12, marginBottom: 16 },
  groupTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 12,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionCard: {
    width: '47%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 90,
  },
  actionIcon: { fontSize: 24, marginBottom: 8 },
  actionName: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  actionDesc: { fontSize: 10, textAlign: 'center', marginTop: 4 },
});

export function createCustomActionsPlugin(): DebuggerPlugin {
  return {
    id: 'custom-actions',
    name: 'Actions',
    icon: '🎯',
    component: CustomActionsPanel,
    order: 110,
  };
}
