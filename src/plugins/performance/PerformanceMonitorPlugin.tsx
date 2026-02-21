import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { PluginComponentProps, DebuggerPlugin } from '../../core/types';

// React Native may or may not expose the Performance API depending on engine
const _global = globalThis as Record<string, unknown>;
const perf: { now: () => number } =
  typeof _global.performance !== 'undefined'
    ? (_global.performance as { now: () => number })
    : { now: () => Date.now() };

const PerformanceMonitorPanel: React.FC<PluginComponentProps> = ({ theme }) => {
  const [fps, setFps] = useState(0);
  const [avgFps, setAvgFps] = useState(0);
  const [minFps, setMinFps] = useState(Infinity);
  const [maxFps, setMaxFps] = useState(0);
  const [frameCount, setFrameCount] = useState(0);
  const [jsDuration, setJsDuration] = useState(0);
  const [memoryUsage, setMemoryUsage] = useState<number | null>(null);
  const [uptime, setUptime] = useState(0);

  const frameRef = useRef(0);
  const lastTimeRef = useRef(perf.now());
  const fpsHistoryRef = useRef<number[]>([]);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef(Date.now());
  const totalFramesRef = useRef(0);

  useEffect(() => {
    let active = true;

    const measureFrame = () => {
      if (!active) return;

      const now = perf.now();
      const delta = now - lastTimeRef.current;

      frameRef.current++;
      totalFramesRef.current++;

      if (delta >= 1000) {
        const currentFps = Math.round((frameRef.current / delta) * 1000);
        frameRef.current = 0;
        lastTimeRef.current = now;

        fpsHistoryRef.current.push(currentFps);
        if (fpsHistoryRef.current.length > 60) fpsHistoryRef.current.shift();

        const avg = Math.round(
          fpsHistoryRef.current.reduce((a, b) => a + b, 0) / fpsHistoryRef.current.length,
        );

        setFps(currentFps);
        setAvgFps(avg);
        setMinFps((prev) => Math.min(prev, currentFps));
        setMaxFps((prev) => Math.max(prev, currentFps));
        setFrameCount(totalFramesRef.current);
        setUptime(Math.floor((Date.now() - startTimeRef.current) / 1000));

        // JS thread timing estimate
        const jsStart = perf.now();
        setTimeout(() => {
          const jsEnd = perf.now();
          const delay = jsEnd - jsStart;
          setJsDuration(Math.round(delay));
        }, 0);

        // Memory (where available)
        try {
          const perfMemory = (
            _global.performance as { memory?: { usedJSHeapSize?: number } } | undefined
          )?.memory;
          if (perfMemory?.usedJSHeapSize) {
            setMemoryUsage(perfMemory.usedJSHeapSize);
          }
        } catch {
          // Not available in all environments
        }
      }

      rafRef.current = requestAnimationFrame(measureFrame);
    };

    rafRef.current = requestAnimationFrame(measureFrame);
    return () => {
      active = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const fpsColor = fps >= 50 ? theme.success : fps >= 30 ? theme.warning : theme.error;
  const jsDurationColor =
    jsDuration <= 16 ? theme.success : jsDuration <= 32 ? theme.warning : theme.error;

  return (
    <View style={styles.container}>
      {/* FPS Hero */}
      <View style={[styles.heroSection, { backgroundColor: theme.surface }]}>
        <Text style={[styles.heroValue, { color: fpsColor }]}>{fps}</Text>
        <Text style={[styles.heroLabel, { color: theme.textSecondary }]}>FPS</Text>
      </View>

      {/* Metrics Grid */}
      <View style={styles.metricsGrid}>
        <MetricCard label="Avg FPS" value={String(avgFps)} color={theme.info} theme={theme} />
        <MetricCard
          label="Min FPS"
          value={minFps === Infinity ? '-' : String(minFps)}
          color={theme.error}
          theme={theme}
        />
        <MetricCard label="Max FPS" value={String(maxFps)} color={theme.success} theme={theme} />
        <MetricCard
          label="JS Thread"
          value={`${jsDuration}ms`}
          color={jsDurationColor}
          theme={theme}
        />
        <MetricCard
          label="Memory"
          value={memoryUsage ? `${(memoryUsage / 1024 / 1024).toFixed(1)}MB` : 'N/A'}
          color={theme.accent}
          theme={theme}
        />
        <MetricCard
          label="Frames"
          value={String(frameCount)}
          color={theme.textSecondary}
          theme={theme}
        />
      </View>

      {/* FPS Bar Chart */}
      <View style={[styles.chartSection, { backgroundColor: theme.surface }]}>
        <Text style={[styles.chartTitle, { color: theme.text }]}>FPS History (last 60s)</Text>
        <View style={styles.chartContainer}>
          {fpsHistoryRef.current.slice(-30).map((val, i) => {
            const height = Math.max(4, (val / 60) * 80);
            const barColor = val >= 50 ? theme.success : val >= 30 ? theme.warning : theme.error;
            return (
              <View key={i} style={[styles.chartBar, { height, backgroundColor: barColor }]} />
            );
          })}
        </View>
      </View>

      {/* Info */}
      <View style={[styles.infoSection, { backgroundColor: theme.surface }]}>
        <Text style={[styles.infoText, { color: theme.textMuted }]}>
          Uptime: {Math.floor(uptime / 60)}m {uptime % 60}s
        </Text>
        <Text style={[styles.infoText, { color: theme.textMuted }]}>
          Target: 60 FPS (16.67ms per frame)
        </Text>
      </View>
    </View>
  );
};

interface MetricCardProps {
  label: string;
  value: string;
  color: string;
  theme: PluginComponentProps['theme'];
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, color, theme }) => (
  <View style={[styles.metricCard, { backgroundColor: theme.surfaceAlt }]}>
    <Text style={[styles.metricValue, { color }]}>{value}</Text>
    <Text style={[styles.metricLabel, { color: theme.textMuted }]}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroSection: { alignItems: 'center', paddingVertical: 24 },
  heroValue: { fontSize: 64, fontWeight: '900', letterSpacing: -2 },
  heroLabel: { fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 2 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 8 },
  metricCard: { width: '30%', margin: '1.5%', padding: 12, borderRadius: 12, alignItems: 'center' },
  metricValue: { fontSize: 18, fontWeight: '800' },
  metricLabel: { fontSize: 10, fontWeight: '600', marginTop: 4, textTransform: 'uppercase' },
  chartSection: { margin: 12, padding: 12, borderRadius: 12 },
  chartTitle: { fontSize: 12, fontWeight: '700', marginBottom: 8 },
  chartContainer: { flexDirection: 'row', alignItems: 'flex-end', height: 80, gap: 2 },
  chartBar: { flex: 1, borderRadius: 2, minWidth: 3 },
  infoSection: { margin: 12, padding: 12, borderRadius: 12 },
  infoText: { fontSize: 11, lineHeight: 18 },
});

export function createPerformanceMonitorPlugin(): DebuggerPlugin {
  return {
    id: 'performance-monitor',
    name: 'Perf',
    icon: '⚡',
    component: PerformanceMonitorPanel,
    order: 70,
  };
}
