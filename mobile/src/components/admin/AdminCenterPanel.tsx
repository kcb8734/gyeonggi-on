import React, { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ActionButton, StatusBadge } from './AdminWidgets';
import { METRO_REGIONS } from '../../constants/regions';
import type { CenterApplicationRecord, CenterLocalityRow } from '../../constants/centerDirectors';
import { applyCenterBusinessCard, fetchCenterApplications, reviewCenterApplication } from '../../api/centers';
import { subscribeCenterApplications } from '../../stores/centerApplyStore';
import { CenterCardFaces } from '../ui/CenterDirectorCard';
import { buildCenterCardModel } from '../../utils/centerCardDocument';
import { directorTitleFor, websiteForLocality } from '../../constants/centerDirectors';

function statusTone(status: string): 'ok' | 'warn' | 'info' | 'neutral' {
  if (status === 'selected') return 'ok';
  if (status === 'reviewing') return 'warn';
  return 'info';
}

function statusLabel(status: string) {
  if (status === 'selected') return '선정 완료';
  if (status === 'reviewing') return '지원완료 (선정 심사 중)';
  return '지원서 접수';
}

function rowFromApplication(row: CenterApplicationRecord): CenterLocalityRow {
  return {
    id: row.localityKey,
    localityId: row.localityKey.split(':').slice(1).join(':'),
    label: row.localityLabel || '',
    region: row.region || row.localityKey.split(':')[0],
    regionLabel: row.regionLabel || '',
    status: 'selected',
    applicantCount: 1,
    director: {
      name: row.name,
      title: directorTitleFor(row.regionLabel || '', row.localityLabel || ''),
      phone: row.phone,
      email: row.email || '',
      intro: row.intro,
      photoUrl: row.photoUrl,
      address: row.address,
      website: websiteForLocality(row.localityLabel || ''),
      age: row.age,
    },
  };
}

export default function AdminCenterPanel() {
  const [rows, setRows] = useState<CenterApplicationRecord[]>([]);
  const [region, setRegion] = useState('ALL');
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const load = () => {
    fetchCenterApplications().then(setRows);
  };

  useEffect(() => {
    load();
    return subscribeCenterApplications(load);
  }, []);

  const filtered = useMemo(
    () => rows.filter((row) => region === 'ALL' || row.region === region),
    [rows, region],
  );
  const preview = filtered.find((row) => row.id === previewId) || filtered[0];
  const previewModel = preview ? buildCenterCardModel(rowFromApplication(preview)) : null;

  return (
    <>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>지역센터장 지원 현황</Text>
        <Text style={styles.hint}>
          지원서를 확인하고 지원완료(선정 심사 중) 또는 선정 완료를 체크하세요. 선정된 센터장은 명함에 적용하면 사진·이름·연락처·이메일·활동주소·링크·후면 QR이 자동 입력됩니다.
        </Text>
        <View style={styles.kpiRow}>
          <Text style={styles.kpi}>전체 {rows.length}건</Text>
          <Text style={styles.kpi}>심사 중 {rows.filter((row) => row.reviewStatus === 'reviewing').length}건</Text>
          <Text style={styles.kpi}>선정 {rows.filter((row) => row.reviewStatus === 'selected').length}건</Text>
        </View>
        <View style={styles.filterRow}>
          <TouchableOpacity style={[styles.chip, region === 'ALL' && styles.chipOn]} onPress={() => setRegion('ALL')}>
            <Text style={[styles.chipText, region === 'ALL' && styles.chipTextOn]}>전체</Text>
          </TouchableOpacity>
          {METRO_REGIONS.map((item) => (
            <TouchableOpacity key={item.id} style={[styles.chip, region === item.id && styles.chipOn]} onPress={() => setRegion(item.id)}>
              <Text style={[styles.chipText, region === item.id && styles.chipTextOn]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      {filtered.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.hint}>아직 접수된 지원서가 없습니다. 앱에서 지원하기를 제출하면 이곳에 모입니다.</Text>
        </View>
      ) : filtered.map((row) => (
        <View key={row.id} style={styles.card}>
          <View style={styles.head}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{row.name}{row.age ? ` · ${row.age}세` : ''}</Text>
              <Text style={styles.meta}>{row.regionLabel} {row.localityLabel}</Text>
            </View>
            <StatusBadge label={statusLabel(row.reviewStatus)} tone={statusTone(row.reviewStatus)} />
          </View>
          {row.photoUrl ? <Image source={{ uri: row.photoUrl }} style={styles.photo} /> : null}
          <Text style={styles.line}><Text style={styles.key}>연락처 </Text>{row.phone}</Text>
          <Text style={styles.line}><Text style={styles.key}>이메일 </Text>{row.email || '-'}</Text>
          <Text style={styles.line}><Text style={styles.key}>활동 주소 </Text>{row.address || '-'}</Text>
          <Text style={styles.line}><Text style={styles.key}>경력 </Text>{row.career}</Text>
          <Text style={styles.intro}>{row.intro}</Text>
          <View style={styles.actions}>
            <ActionButton
              label="지원완료(선정 심사 중)"
              onPress={async () => {
                await reviewCenterApplication(row.id, 'reviewing');
                setMessage(`${row.name} 지원서를 선정 심사 중으로 표시했습니다.`);
                load();
              }}
            />
            <ActionButton
              label="선정 완료"
              onPress={async () => {
                await reviewCenterApplication(row.id, 'selected');
                setPreviewId(row.id);
                setMessage(`${row.name} 센터장으로 선정했습니다.`);
                load();
              }}
            />
            <ActionButton
              label="명함에 적용"
              onPress={async () => {
                await applyCenterBusinessCard(row.id);
                setPreviewId(row.id);
                setMessage(`${row.name} 지원서 정보를 온앤온+ 공식 디지털 명함에 적용했습니다.`);
                load();
              }}
            />
          </View>
        </View>
      ))}
      {previewModel ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>명함 미리보기 · 적용 결과</Text>
          <Text style={styles.hint}>전면 사진·이름·M·E·A·W와 후면 지자체 QR이 지원서 기준으로 채워집니다. 센터장은 선정 완료 카드에서 다운로드할 수 있습니다.</Text>
          <CenterCardFaces model={previewModel} />
        </View>
      ) : null}
      {message ? <Text style={styles.ok}>{message}</Text> : null}
    </>
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
  hint: { fontSize: 12, fontWeight: '600', color: '#6B7280', lineHeight: 18 },
  kpiRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
  kpi: { fontSize: 12, fontWeight: '800', color: '#0F766E' },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  chip: { backgroundColor: '#F3F4F6', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  chipOn: { backgroundColor: '#111827' },
  chipText: { fontSize: 11, fontWeight: '800', color: '#374151' },
  chipTextOn: { color: '#fff' },
  head: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start', marginBottom: 8 },
  name: { fontSize: 16, fontWeight: '800', color: '#111827' },
  meta: { fontSize: 12, color: '#6B7280', marginTop: 2, fontWeight: '700' },
  photo: { width: 64, height: 80, borderRadius: 10, marginBottom: 8, backgroundColor: '#E5E7EB' },
  line: { fontSize: 13, color: '#374151', marginTop: 4, fontWeight: '600' },
  key: { fontWeight: '800', color: '#111827' },
  intro: { fontSize: 13, color: '#4B5563', marginTop: 8, lineHeight: 20 },
  actions: { marginTop: 12, gap: 8 },
  ok: { marginTop: 4, marginBottom: 12, fontSize: 12, fontWeight: '700', color: '#047857' },
});
