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
import type { PluginComponentProps, NetworkRequest } from '../../core/types';
import type { DebuggerPlugin } from '../../core/types';
import { NetworkInterceptor } from './NetworkInterceptor';
import {
  formatDuration,
  formatBytes,
  formatTimestamp,
  getStatusColor,
  getMethodColor,
  truncate,
  toCurl,
  copyToClipboard,
  safeStringify,
  shareText,
} from '../../core/utils';

// ─── Network Inspector Plugin Component ─────────────────────────────────────

const NetworkInspectorPanel: React.FC<PluginComponentProps> = ({ theme }) => {
  const [requests, setRequests] = useState<NetworkRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  const selectedRequest = useMemo(
    () => requests.find((r) => r.id === selectedRequestId) || null,
    [requests, selectedRequestId],
  );
  const [activeDetailTab, setActiveDetailTab] = useState<
    'headers' | 'request' | 'response' | 'timing'
  >('headers');
  const [methodFilter, setMethodFilter] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = NetworkInterceptor.subscribe(setRequests);
    return unsubscribe;
  }, []);

  const filteredRequests = useMemo(() => {
    let filtered = requests;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.url.toLowerCase().includes(q) ||
          r.method.toLowerCase().includes(q) ||
          r.gqlOperation?.toLowerCase().includes(q) ||
          String(r.status).includes(q),
      );
    }
    if (methodFilter) {
      filtered = filtered.filter((r) => r.method === methodFilter);
    }
    return filtered;
  }, [requests, searchQuery, methodFilter]);

  const stats = useMemo(() => {
    const total = requests.length;
    const errors = requests.filter((r) => r.isError).length;
    const pending = requests.filter((r) => !r.endTime).length;
    return { total, errors, pending };
  }, [requests]);

  const handleClear = useCallback(() => {
    NetworkInterceptor.clear();
    setSelectedRequestId(null);
  }, []);

  const handleCopyCurl = useCallback((req: NetworkRequest) => {
    copyToClipboard(toCurl(req));
  }, []);

  const handleShareRequest = useCallback((req: NetworkRequest) => {
    const data = safeStringify({
      url: req.url,
      method: req.method,
      status: req.status,
      duration: req.duration,
      requestHeaders: req.requestHeaders,
      responseHeaders: req.responseHeaders,
      requestBody: req.requestBody,
      responseBody: req.responseBody,
    });
    shareText(data, `${req.method} ${req.url}`);
  }, []);

  if (selectedRequest) {
    return (
      <RequestDetail
        request={selectedRequest}
        theme={theme}
        activeTab={activeDetailTab}
        onTabChange={setActiveDetailTab}
        onBack={() => setSelectedRequestId(null)}
        onCopyCurl={handleCopyCurl}
        onShare={handleShareRequest}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Stats Bar */}
      <View style={[styles.statsBar, { backgroundColor: theme.surface }]}>
        <View style={styles.statsRow}>
          <Text style={[styles.statText, { color: theme.text }]}>{stats.total} requests</Text>
          {stats.errors > 0 && (
            <Text style={[styles.statText, { color: theme.error }]}>{stats.errors} errors</Text>
          )}
          {stats.pending > 0 && (
            <Text style={[styles.statText, { color: theme.warning }]}>{stats.pending} pending</Text>
          )}
        </View>
        <TouchableOpacity onPress={handleClear} activeOpacity={0.7}>
          <Text style={[styles.clearButton, { color: theme.error }]}>Clear</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: theme.surface }]}>
        <TextInput
          style={[
            styles.searchInput,
            { color: theme.text, backgroundColor: theme.surfaceAlt, borderColor: theme.border },
          ]}
          placeholder="Search URL, method, status..."
          placeholderTextColor={theme.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* Method Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.filterContainer, { backgroundColor: theme.surface }]}
        contentContainerStyle={styles.filterContent}
      >
        {['ALL', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((method) => (
          <TouchableOpacity
            key={method}
            style={[
              styles.filterChip,
              {
                backgroundColor:
                  (method === 'ALL' && !methodFilter) || methodFilter === method
                    ? theme.accent
                    : theme.surfaceAlt,
                borderColor: theme.border,
              },
            ]}
            onPress={() => setMethodFilter(method === 'ALL' ? null : method)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterChipText,
                {
                  color:
                    (method === 'ALL' && !methodFilter) || methodFilter === method
                      ? '#FFFFFF'
                      : theme.textSecondary,
                },
              ]}
            >
              {method}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Request List */}
      <FlatList
        data={filteredRequests}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <RequestRow request={item} theme={theme} onPress={() => setSelectedRequestId(item.id)} />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              {searchQuery ? 'No matching requests' : 'No network requests captured yet'}
            </Text>
          </View>
        }
        initialNumToRender={20}
        maxToRenderPerBatch={10}
        windowSize={10}
      />
    </View>
  );
};

// ─── Request Row ────────────────────────────────────────────────────────────

interface RequestRowProps {
  request: NetworkRequest;
  theme: PluginComponentProps['theme'];
  onPress: () => void;
}

const RequestRow: React.FC<RequestRowProps> = React.memo(({ request, theme, onPress }) => {
  const urlPath = useMemo(() => {
    try {
      const parsed = new URL(request.url);
      return parsed.pathname + parsed.search;
    } catch {
      return request.url;
    }
  }, [request.url]);

  return (
    <TouchableOpacity
      style={[
        styles.requestRow,
        {
          backgroundColor: request.isError ? `${theme.error}10` : theme.surface,
          borderBottomColor: theme.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.requestRowLeft}>
        <View style={styles.requestMethodContainer}>
          <Text style={[styles.requestMethod, { color: getMethodColor(request.method) }]}>
            {request.method}
          </Text>
          <Text style={[styles.requestStatus, { color: getStatusColor(request.status) }]}>
            {request.status ?? '...'}
          </Text>
        </View>
        <Text style={[styles.requestUrl, { color: theme.text }]} numberOfLines={1}>
          {request.gqlOperation
            ? `[${request.gqlType}] ${request.gqlOperation}`
            : truncate(urlPath, 60)}
        </Text>
      </View>
      <View style={styles.requestRowRight}>
        <Text style={[styles.requestDuration, { color: theme.textSecondary }]}>
          {formatDuration(request.duration)}
        </Text>
        <Text style={[styles.requestSize, { color: theme.textMuted }]}>
          {formatBytes(request.responseSize)}
        </Text>
        <Text style={[styles.requestTime, { color: theme.textMuted }]}>
          {formatTimestamp(request.startTime)}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

// ─── Request Detail ─────────────────────────────────────────────────────────

interface RequestDetailProps {
  request: NetworkRequest;
  theme: PluginComponentProps['theme'];
  activeTab: 'headers' | 'request' | 'response' | 'timing';
  onTabChange: (tab: 'headers' | 'request' | 'response' | 'timing') => void;
  onBack: () => void;
  onCopyCurl: (req: NetworkRequest) => void;
  onShare: (req: NetworkRequest) => void;
}

const RequestDetail: React.FC<RequestDetailProps> = ({
  request,
  theme,
  activeTab,
  onTabChange,
  onBack,
  onCopyCurl,
  onShare,
}) => {
  const tabs = ['headers', 'request', 'response', 'timing'] as const;

  return (
    <View style={styles.container}>
      {/* Detail Header */}
      <View
        style={[
          styles.detailHeader,
          { backgroundColor: theme.surface, borderBottomColor: theme.border },
        ]}
      >
        <TouchableOpacity onPress={onBack} activeOpacity={0.7}>
          <Text style={[styles.backButton, { color: theme.accent }]}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.detailActions}>
          <TouchableOpacity
            onPress={() => onCopyCurl(request)}
            style={[styles.actionButton, { backgroundColor: theme.surfaceAlt }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionButtonText, { color: theme.textSecondary }]}>cURL</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onShare(request)}
            style={[styles.actionButton, { backgroundColor: theme.surfaceAlt }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionButtonText, { color: theme.textSecondary }]}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* URL Display */}
      <View style={[styles.urlDisplay, { backgroundColor: theme.codeBackground }]}>
        <Text style={[styles.urlMethod, { color: getMethodColor(request.method) }]}>
          {request.method}
        </Text>
        <Text style={[styles.urlText, { color: theme.codeText }]} selectable>
          {request.url}
        </Text>
      </View>

      {/* Detail Tabs */}
      <View style={[styles.detailTabBar, { backgroundColor: theme.surface }]}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.detailTab,
              {
                borderBottomColor: activeTab === tab ? theme.accent : 'transparent',
              },
            ]}
            onPress={() => onTabChange(tab)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.detailTabText,
                { color: activeTab === tab ? theme.accent : theme.textSecondary },
              ]}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      <ScrollView style={styles.detailContent}>
        {activeTab === 'headers' && <HeadersView request={request} theme={theme} />}
        {activeTab === 'request' && (
          <BodyView body={request.requestBody} theme={theme} label="Request Body" />
        )}
        {activeTab === 'response' && (
          <BodyView
            body={request.responseBody}
            theme={theme}
            label="Response Body"
            isPending={!request.endTime}
          />
        )}
        {activeTab === 'timing' && <TimingView request={request} theme={theme} />}
      </ScrollView>
    </View>
  );
};

// ─── Sub-views ──────────────────────────────────────────────────────────────

const HeadersView: React.FC<{ request: NetworkRequest; theme: PluginComponentProps['theme'] }> = ({
  request,
  theme,
}) => (
  <View style={styles.sectionContainer}>
    <Text style={[styles.sectionTitle, { color: theme.text }]}>Request Headers</Text>
    {request.requestHeaders && Object.keys(request.requestHeaders).length > 0 ? (
      Object.entries(request.requestHeaders).map(([key, value]) => (
        <View key={key} style={[styles.headerRow, { borderBottomColor: theme.border }]}>
          <Text style={[styles.headerKey, { color: theme.accent }]}>{key}</Text>
          <Text style={[styles.headerValue, { color: theme.text }]} selectable>
            {value}
          </Text>
        </View>
      ))
    ) : (
      <Text style={[styles.emptyText, { color: theme.textMuted }]}>No headers</Text>
    )}

    <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 16 }]}>
      Response Headers
    </Text>
    {request.responseHeaders && Object.keys(request.responseHeaders).length > 0 ? (
      Object.entries(request.responseHeaders).map(([key, value]) => (
        <View key={key} style={[styles.headerRow, { borderBottomColor: theme.border }]}>
          <Text style={[styles.headerKey, { color: theme.accent }]}>{key}</Text>
          <Text style={[styles.headerValue, { color: theme.text }]} selectable>
            {value}
          </Text>
        </View>
      ))
    ) : (
      <Text style={[styles.emptyText, { color: theme.textMuted }]}>
        {request.endTime ? 'No headers' : 'Pending...'}
      </Text>
    )}
  </View>
);

const BodyView: React.FC<{
  body: string | undefined;
  theme: PluginComponentProps['theme'];
  label: string;
  isPending?: boolean;
}> = ({ body, theme, label, isPending }) => {
  const formatted = useMemo(() => {
    if (!body) return null;
    try {
      const parsed = JSON.parse(body);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return body;
    }
  }, [body]);

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{label}</Text>
        {formatted && (
          <TouchableOpacity onPress={() => copyToClipboard(formatted)} activeOpacity={0.7}>
            <Text style={[styles.copyButton, { color: theme.accent }]}>Copy</Text>
          </TouchableOpacity>
        )}
      </View>
      {formatted ? (
        <View style={[styles.codeBlock, { backgroundColor: theme.codeBackground }]}>
          <Text style={[styles.codeText, { color: theme.codeText }]} selectable>
            {formatted}
          </Text>
        </View>
      ) : (
        <Text style={[styles.emptyText, { color: theme.textMuted }]}>
          {isPending ? 'Pending...' : 'No body'}
        </Text>
      )}
    </View>
  );
};

const TimingView: React.FC<{ request: NetworkRequest; theme: PluginComponentProps['theme'] }> = ({
  request,
  theme,
}) => (
  <View style={styles.sectionContainer}>
    <View style={[styles.timingRow, { borderBottomColor: theme.border }]}>
      <Text style={[styles.timingLabel, { color: theme.textSecondary }]}>Started</Text>
      <Text style={[styles.timingValue, { color: theme.text }]}>
        {formatTimestamp(request.startTime)}
      </Text>
    </View>
    {request.endTime && (
      <View style={[styles.timingRow, { borderBottomColor: theme.border }]}>
        <Text style={[styles.timingLabel, { color: theme.textSecondary }]}>Completed</Text>
        <Text style={[styles.timingValue, { color: theme.text }]}>
          {formatTimestamp(request.endTime)}
        </Text>
      </View>
    )}
    <View style={[styles.timingRow, { borderBottomColor: theme.border }]}>
      <Text style={[styles.timingLabel, { color: theme.textSecondary }]}>Duration</Text>
      <Text
        style={[
          styles.timingValue,
          { color: request.duration && request.duration > 3000 ? theme.warning : theme.success },
        ]}
      >
        {formatDuration(request.duration)}
      </Text>
    </View>
    <View style={[styles.timingRow, { borderBottomColor: theme.border }]}>
      <Text style={[styles.timingLabel, { color: theme.textSecondary }]}>Request Size</Text>
      <Text style={[styles.timingValue, { color: theme.text }]}>
        {formatBytes(request.requestSize)}
      </Text>
    </View>
    <View style={[styles.timingRow, { borderBottomColor: theme.border }]}>
      <Text style={[styles.timingLabel, { color: theme.textSecondary }]}>Response Size</Text>
      <Text style={[styles.timingValue, { color: theme.text }]}>
        {formatBytes(request.responseSize)}
      </Text>
    </View>
  </View>
);

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  statsRow: { flexDirection: 'row', gap: 12 },
  statText: { fontSize: 12, fontWeight: '600' },
  clearButton: { fontSize: 13, fontWeight: '700' },
  searchContainer: { paddingHorizontal: 16, paddingBottom: 12 },
  searchInput: {
    height: 36,
    borderRadius: 6, // GitHub style
    paddingHorizontal: 12,
    fontSize: 13,
    borderWidth: 1,
  },
  filterContainer: {
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
    borderRadius: 6, // GitHub style
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterChipText: { fontSize: 13, fontWeight: '500' }, // Removed massive letter spacing and adjusted weight
  requestRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  requestRowLeft: { flex: 1, marginRight: 8 },
  requestRowRight: { alignItems: 'flex-end' },
  requestMethodContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  requestMethod: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  requestStatus: { fontSize: 11, fontWeight: '700' },
  requestUrl: { fontSize: 12 },
  requestDuration: { fontSize: 11, fontWeight: '600' },
  requestSize: { fontSize: 10, marginTop: 1 },
  requestTime: { fontSize: 10, marginTop: 1 },
  emptyContainer: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 13 },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: { fontSize: 14, fontWeight: '600' },
  detailActions: { flexDirection: 'row', gap: 8 },
  actionButton: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  actionButtonText: { fontSize: 12, fontWeight: '500' },
  urlDisplay: { padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  urlMethod: { fontSize: 12, fontWeight: '800' },
  urlText: { fontSize: 11, flex: 1 },
  detailTabBar: { flexDirection: 'row' },
  detailTab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderBottomWidth: 2 },
  detailTabText: { fontSize: 12, fontWeight: '600' },
  detailContent: { flex: 1 },
  sectionContainer: { padding: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  copyButton: { fontSize: 12, fontWeight: '600' },
  headerRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerKey: { fontSize: 11, fontWeight: '600', width: 120, marginRight: 8 },
  headerValue: { fontSize: 11, flex: 1 },
  codeBlock: { padding: 12, borderRadius: 6 },
  codeText: { fontSize: 11, fontFamily: 'monospace', lineHeight: 18 },
  timingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  timingLabel: { fontSize: 13 },
  timingValue: { fontSize: 13, fontWeight: '600' },
});

// ─── Plugin Factory ─────────────────────────────────────────────────────────

export function createNetworkInspectorPlugin(): DebuggerPlugin {
  return {
    id: 'network-inspector',
    name: 'Network',
    icon: '🌐',
    component: NetworkInspectorPanel,
    order: 10,
    onInit: () => NetworkInterceptor.start(),
    onDestroy: () => NetworkInterceptor.stop(),
  };
}
