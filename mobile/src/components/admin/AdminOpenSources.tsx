import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
};

function formatWhen(value?: string | null) {
  if (!value) return '기록 없음';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 16).replace('T', ' ');
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function toneFor(row: OpenSourceRow): 'ok' | 'warn' | 'info' | 'neutral' {
  if (row.lastStatus === '정상') return 'ok';
  if (row.collectable) return 'info';
  return 'warn';
}

function statusLabel(row: OpenSourceRow) {
  if (row.lastStatus && row.lastStatus !== '대기') return row.lastStatus;
  if (row.collectable) return row.keyConfigured ? '수집 가능' : '기본 연동';
  return '키 필요';
}

export function OpenSourceList({
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
      {rows.map((row) => (
        <View key={row.id} style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{row.label}</Text>
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
            <Text style={styles.btnText}>{busyId === row.id ? '수집 중' : row.collectable ? '수집' : '안내'}</Text>
          </TouchableOpacity>
        </View>
      ))}
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
      <ActionButton label={busy ? '서울·경기 수집 중...' : '서울·경기 문화행사 즉시 동기화'} onPress={onAllCulture} disabled={busy} />
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
  name: { fontSize: 13, fontWeight: '800', color: '#111827' },
  meta: { fontSize: 11, fontWeight: '600', color: '#4B5563', marginTop: 2 },
  env: { fontSize: 11, fontWeight: '600', color: '#6B7280', marginTop: 2, lineHeight: 16 },
  btn: { backgroundColor: '#111827', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, minWidth: 64, alignItems: 'center' },
  btnOff: { opacity: 0.45 },
  btnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
});
