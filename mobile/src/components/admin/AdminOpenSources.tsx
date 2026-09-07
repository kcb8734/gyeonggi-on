import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { METRO_REGIONS } from '../../constants/regions';
import { ActionButton, StatusBadge } from './AdminWidgets';

export type OpenSourceRow = {
  id: string;
  kind: string;
  metro?: string;
  label: string;
  targetApi: string;
  description?: string;
  envHint?: string;
  keyConfigured?: boolean;
  collectable?: boolean;
  count?: number;
  lastSync?: string | null;
  lastStatus?: string;
  syncQuery?: Record<string, string>;
  tourConnected?: boolean;
  muniConnected?: boolean;
  tourLabel?: string;
  muniLabel?: string;
  tourCount?: number;
  muniCount?: number;
};

function formatWhen(value?: string | null) {
  if (!value) return '기록 없음';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 16).replace('T', ' ');
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function toneFor(row: OpenSourceRow): 'ok' | 'warn' | 'info' | 'neutral' {
  if (row.lastStatus === '정상') return 'ok';
  if (row.collectable || row.tourConnected || row.muniConnected) return 'info';
  return 'warn';
}

function statusLabel(row: OpenSourceRow) {
  if (row.lastStatus && row.lastStatus !== '대기') return row.lastStatus;
  if (row.collectable || row.tourConnected || row.muniConnected) return row.keyConfigured ? '수집 가능' : '기본 연동';
  return '키 필요';
}

function isConnected(row: OpenSourceRow) {
  return Boolean(row.collectable || row.keyConfigured || row.tourConnected || row.muniConnected);
}

export function metroApisFromSources(sources?: {
  national?: OpenSourceRow[];
  tourMetros?: OpenSourceRow[];
  muniMetros?: OpenSourceRow[];
  metroApis?: OpenSourceRow[];
}): OpenSourceRow[] {
  if (Array.isArray(sources?.metroApis) && sources.metroApis.length) return sources.metroApis;
  const nationalMuni = Object.fromEntries(
    (sources?.national || []).filter((row) => row.kind === 'muni' && row.metro).map((row) => [row.metro as string, row]),
  );
  const muniBy = Object.fromEntries((sources?.muniMetros || []).map((row) => [row.metro as string, row]));
  const tourBy = Object.fromEntries((sources?.tourMetros || []).map((row) => [row.metro as string, row]));
  return METRO_REGIONS.map((region) => {
    const tour = tourBy[region.id] || {};
    const muni = nationalMuni[region.id] || muniBy[region.id] || {};
    const tourConnected = Boolean(tour.collectable || tour.keyConfigured);
    const muniConnected = Boolean(muni.collectable);
    return {
      id: `region-${region.id}`,
      kind: 'region',
      metro: region.id,
      label: region.label,
      targetApi: [tour.targetApi, muni.targetApi].filter(Boolean).join('+') || `searchFestival2:${region.id}`,
      tourConnected,
      muniConnected,
      tourLabel: 'TourAPI',
      muniLabel: muni.label || `${region.label} 지자체 OpenAPI`,
      tourCount: Number(tour.count || 0),
      muniCount: Number(muni.count || 0),
      count: Number(tour.count || 0) + Number(muni.count || 0),
      lastSync: tour.lastSync || muni.lastSync || null,
      lastStatus: tour.lastStatus === '정상' || muni.lastStatus === '정상' ? '정상' : (tour.lastStatus || muni.lastStatus || (tourConnected || muniConnected ? '대기' : '키없음')),
      collectable: tourConnected || muniConnected,
      keyConfigured: tourConnected,
      description: `${tourConnected ? 'TourAPI 연동' : 'TourAPI 미연동'} · ${muniConnected ? '지자체 API 연동' : '지자체 API 미연동'}`,
      envHint: muni.envHint || tour.envHint,
      syncQuery: { source: 'region', metro: region.id },
    };
  });
}

function ApiCheck({ on, label }: { on: boolean; label: string }) {
  return (
    <View style={styles.check}>
      <View style={[styles.box, on ? styles.boxOn : styles.boxOff]}>
        <Text style={[styles.tick, on ? styles.tickOn : styles.tickOff]}>{on ? '✓' : ''}</Text>
      </View>
      <Text style={[styles.checkLabel, on ? styles.checkOn : styles.checkOff]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

export function OpenSourceList({
  title,
  hint,
  rows,
  busyId,
  onCollect,
  showChecks = false,
}: {
  title: string;
  hint?: string;
  rows: OpenSourceRow[];
  busyId?: string;
  onCollect: (row: OpenSourceRow) => void;
  showChecks?: boolean;
}) {
  if (!rows.length) return null;
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {rows.map((row) => (
        <View key={row.id} style={styles.row}>
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              {showChecks ? <ApiCheck on={isConnected(row)} label={row.label} /> : <Text style={styles.name}>{row.label}</Text>}
            </View>
            <Text style={styles.meta}>{row.targetApi} · {row.count ?? 0}건 · {formatWhen(row.lastSync)}</Text>
            <Text style={styles.env}>{row.description || row.envHint}</Text>
            <View style={{ marginTop: 6 }}>
              <StatusBadge label={statusLabel(row)} tone={toneFor(row)} />
            </View>
          </View>
          <TouchableOpacity
            onPress={() => onCollect(row)}
            disabled={busyId === row.id}
            style={[styles.btn, busyId === row.id && styles.btnOff]}
          >
            <Text style={styles.btnText}>{busyId === row.id ? '수집 중' : '수집'}</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

export function MetroApiList({
  title,
  hint,
  rows,
  busyId,
  onCollect,
}: {
  title: string;
  hint?: string;
  rows: OpenSourceRow[];
  busyId?: string;
  onCollect: (row: OpenSourceRow) => void;
}) {
  if (!rows.length) return null;
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {rows.map((row) => {
        const tourOn = Boolean(row.tourConnected);
        const muniOn = Boolean(row.muniConnected);
        return (
          <View key={row.id} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{row.label}</Text>
              <View style={styles.checkRow}>
                <ApiCheck on={tourOn} label={`TourAPI ${row.tourCount ?? 0}건`} />
                <ApiCheck on={muniOn} label={`${String(row.muniLabel || '지자체 API').replace(/ OpenAPI$/, '')} ${row.muniCount ?? 0}건`} />
              </View>
              <Text style={styles.meta}>{formatWhen(row.lastSync)} · {statusLabel(row)}</Text>
            </View>
            <TouchableOpacity
              onPress={() => onCollect(row)}
              disabled={busyId === row.id}
              accessibilityRole="button"
              accessibilityLabel={`${row.label} 즉시 수집`}
              style={[styles.btn, busyId === row.id && styles.btnOff]}
            >
              <Text style={styles.btnText}>{busyId === row.id ? '수집 중' : '수집'}</Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

export function OpenSourceActions({
  onAllCulture,
  busy,
}: {
  onAllCulture: () => void;
  busy?: boolean;
}) {
  return (
    <View style={{ marginTop: 4 }}>
      <ActionButton label={busy ? '서울·경기·인천 수집 중...' : '서울·경기·인천 문화행사 즉시 동기화'} onPress={onAllCulture} disabled={busy} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 14,
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#111827', marginBottom: 8 },
  hint: { fontSize: 12, fontWeight: '600', color: '#6B7280', marginBottom: 8, lineHeight: 18 },
  row: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    alignItems: 'center',
  },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: 13, fontWeight: '800', color: '#111827' },
  meta: { fontSize: 11, fontWeight: '600', color: '#4B5563', marginTop: 4 },
  env: { fontSize: 11, fontWeight: '600', color: '#6B7280', marginTop: 2, lineHeight: 16 },
  checkRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  check: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '100%' },
  box: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: '#059669', borderColor: '#047857' },
  boxOff: { backgroundColor: '#fff', borderColor: '#D1D5DB' },
  tick: { fontSize: 11, fontWeight: '900', lineHeight: 12 },
  tickOn: { color: '#fff' },
  tickOff: { color: 'transparent' },
  checkLabel: { fontSize: 11, fontWeight: '700', flexShrink: 1 },
  checkOn: { color: '#065F46' },
  checkOff: { color: '#9CA3AF' },
  btn: { backgroundColor: '#111827', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, minWidth: 64, alignItems: 'center' },
  btnOff: { opacity: 0.45 },
  btnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
});
