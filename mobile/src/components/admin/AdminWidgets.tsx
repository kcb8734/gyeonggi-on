import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';

export function StatusBadge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'ok' | 'warn' | 'danger' | 'info' | 'neutral';
}) {
  return (
    <View style={[styles.badge, tone === 'ok' && styles.badgeOk, tone === 'warn' && styles.badgeWarn, tone === 'danger' && styles.badgeDanger, tone === 'info' && styles.badgeInfo]}>
      <Text style={[styles.badgeText, tone === 'ok' && { color: '#065F46' }, tone === 'warn' && { color: '#92400E' }, tone === 'danger' && { color: '#991B1B' }, tone === 'info' && { color: '#1E40AF' }]}>
        {label}
      </Text>
    </View>
  );
}

export function KpiCard({
  title,
  value,
  sub,
  trend,
  alert,
  color = 'slate',
}: {
  title: string;
  value: string;
  sub?: string;
  trend?: string;
  alert?: boolean;
  color?: 'blue' | 'green' | 'purple' | 'red' | 'slate';
}) {
  const accent = {
    blue: '#2563EB',
    green: '#059669',
    purple: '#7C3AED',
    red: '#DC2626',
    slate: '#111827',
  }[color];
  return (
    <View style={[styles.kpi, alert && styles.kpiAlert]}>
      <View style={[styles.kpiDot, { backgroundColor: accent }]} />
      <Text style={styles.kpiTitle}>{title}</Text>
      <Text style={[styles.kpiValue, { color: alert ? '#B91C1C' : '#111827' }]}>{value}</Text>
      {trend ? <Text style={styles.kpiTrend}>{trend}</Text> : null}
      {sub ? <Text style={styles.kpiSub}>{sub}</Text> : null}
    </View>
  );
}

export function ProgressBar({ value, color = '#7C3AED' }: { value: number; color?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <View style={styles.bar}>
      <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
    </View>
  );
}

export function QuotaGauge({ used, limit }: { used: number; limit: number }) {
  const pct = limit ? Math.min(100, (used / limit) * 100) : 0;
  const size = 112;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  return (
    <View style={styles.gaugeWrap}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="#E5E7EB" strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="#0F766E"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${dash} ${c}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.gaugeLabel}>
        <Text style={styles.gaugePct}>{pct.toFixed(1)}%</Text>
        <Text style={styles.gaugeCap}>사용 중</Text>
      </View>
    </View>
  );
}

export function WeightSlider({
  label,
  value,
  color,
  onChange,
}: {
  label: string;
  value: number;
  color: string;
  onChange: (next: number) => void;
}) {
  return (
    <View style={styles.sliderRow}>
      <View style={styles.sliderHead}>
        <Text style={styles.sliderLabel}>{label}</Text>
        <Text style={styles.sliderValue}>{value}%</Text>
      </View>
      {Platform.OS === 'web' ? (
        <input
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={(event: any) => onChange(Number(event.target.value))}
          style={{ width: '100%', accentColor: color }}
        />
      ) : (
        <View style={styles.nativeSlider}>
          <TouchableOpacity onPress={() => onChange(Math.max(0, value - 5))} style={styles.stepBtn}>
            <Text style={styles.stepText}>-</Text>
          </TouchableOpacity>
          <View style={[styles.bar, { flex: 1 }]}>
            <View style={[styles.barFill, { width: `${value}%`, backgroundColor: color }]} />
          </View>
          <TouchableOpacity onPress={() => onChange(Math.min(100, value + 5))} style={styles.stepBtn}>
            <Text style={styles.stepText}>+</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export function SparkLine({ values, color = '#7C3AED' }: { values: number[]; color?: string }) {
  const w = 320;
  const h = 128;
  const pad = 16;
  const max = Math.max(...values, 1);
  const pts = values.map((value, index) => {
    const x = pad + (index * (w - pad * 2)) / Math.max(values.length - 1, 1);
    const y = h - pad - (value / max) * (h - pad * 2);
    return `${x},${y}`;
  }).join(' ');
  return (
    <Svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`}>
      <Polyline points={pts} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
    </Svg>
  );
}

export function ActionButton({
  label,
  onPress,
  kind = 'primary',
  disabled,
  active,
}: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
  active?: boolean;
}) {
  const tone = active ? 'primary' : kind;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.btn,
        tone === 'ghost' && styles.btnGhost,
        tone === 'danger' && styles.btnDanger,
        disabled && styles.btnOff,
      ]}
    >
      <Text style={[styles.btnText, tone === 'ghost' && { color: '#111827' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3F4F6',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeOk: { backgroundColor: '#D1FAE5' },
  badgeWarn: { backgroundColor: '#FEF3C7' },
  badgeDanger: { backgroundColor: '#FEE2E2' },
  badgeInfo: { backgroundColor: '#DBEAFE' },
  badgeText: { fontSize: 11, fontWeight: '800', color: '#374151' },
  kpi: {
    flexBasis: '48%',
    flexGrow: 1,
    minWidth: 148,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  kpiAlert: { borderColor: '#FECACA', backgroundColor: '#FEF2F2' },
  kpiDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 8 },
  kpiTitle: { fontSize: 12, fontWeight: '700', color: '#6B7280' },
  kpiValue: { fontSize: 22, fontWeight: '800', marginTop: 4 },
  kpiTrend: { marginTop: 4, fontSize: 12, fontWeight: '800', color: '#059669' },
  kpiSub: { marginTop: 4, fontSize: 11, fontWeight: '600', color: '#6B7280', lineHeight: 16 },
  bar: { height: 8, backgroundColor: '#E5E7EB', borderRadius: 99, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 99 },
  gaugeWrap: { width: 112, height: 112, alignItems: 'center', justifyContent: 'center' },
  gaugeLabel: { position: 'absolute', alignItems: 'center' },
  gaugePct: { fontSize: 18, fontWeight: '800', color: '#0F766E' },
  gaugeCap: { fontSize: 10, fontWeight: '700', color: '#6B7280' },
  sliderRow: { marginBottom: 12 },
  sliderHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  sliderLabel: { fontSize: 13, fontWeight: '700', color: '#111827' },
  sliderValue: { fontSize: 13, fontWeight: '800', color: '#111827' },
  nativeSlider: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center' },
  stepText: { color: '#fff', fontWeight: '800' },
  btn: { backgroundColor: '#111827', borderRadius: 10, paddingVertical: 12, alignItems: 'center', paddingHorizontal: 14 },
  btnGhost: { backgroundColor: '#E5E7EB' },
  btnDanger: { backgroundColor: '#B91C1C' },
  btnOff: { opacity: 0.4 },
  btnText: { color: '#fff', fontWeight: '800' },
});
