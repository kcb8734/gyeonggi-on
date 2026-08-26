import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchCenterLocalities, fetchCenterRegions, submitCenterApplication } from '../api/centers';
import type { CenterLocalityRow, CenterRegionSummary } from '../constants/centerDirectors';
import CenterApplyModal from '../components/ui/CenterApplyModal';
import CenterDirectorCard from '../components/ui/CenterDirectorCard';

const STATUS_COPY = {
  selected: { badge: '선정 완료', color: '#0F766E', bg: '#CCFBF1' },
  reviewing: { badge: '지원 완료 (선정 심사 중)', color: '#92400E', bg: '#FEF3C7' },
  recruiting: { badge: '지원 접수 중', color: '#9A3412', bg: '#FFEDD5' },
};

export default function CenterDirectorsScreen() {
  const insets = useSafeAreaInsets();
  const [regions, setRegions] = useState<CenterRegionSummary[]>([]);
  const [regionId, setRegionId] = useState<string | null>(null);
  const [localities, setLocalities] = useState<CenterLocalityRow[]>([]);
  const [card, setCard] = useState<CenterLocalityRow | null>(null);
  const [applyRow, setApplyRow] = useState<CenterLocalityRow | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reload = () => {
    fetchCenterRegions().then(setRegions);
    if (regionId) fetchCenterLocalities(regionId).then(setLocalities);
  };

  useEffect(() => {
    fetchCenterRegions().then(setRegions);
  }, []);

  useEffect(() => {
    if (!regionId) {
      setLocalities([]);
      return;
    }
    fetchCenterLocalities(regionId).then(setLocalities);
  }, [regionId]);

  const openLocality = (row: CenterLocalityRow) => {
    if (row.status === 'selected') {
      setCard(row);
      return;
    }
    if (row.status === 'reviewing') {
      Alert.alert('선정 심사 중', `${row.label}은 지원이 마감되고 심사가 진행 중입니다.`);
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 36 + insets.bottom }}>
        <Text style={styles.kicker}>전국 {regions.reduce((sum, row) => sum + row.total, 0) || '시·군·구'}개 지자체</Text>
        <Text style={styles.title}>지역 센터장 선정 현황</Text>
        <Text style={styles.lead}>
          17개 광역 권역을 먼저 보고, 시·군·구 박스를 눌러 선정된 센터장 명함을 확인하거나 간편 지원하세요.
        </Text>
        {regionId ? (
          <TouchableOpacity style={styles.back} onPress={() => setRegionId(null)}>
            <Text style={styles.backText}>‹ 17개 권역으로</Text>
          </TouchableOpacity>
        ) : null}

        {!regionId ? (
          <View style={styles.grid}>
            {regions.map((region) => (
              <TouchableOpacity key={region.id} style={styles.regionCard} onPress={() => setRegionId(region.id)}>
                <Text style={styles.regionLabel}>{region.label}</Text>
                <Text style={styles.regionCount}>
                  {region.total}개 지역 중 {region.selected}개 지역 선정 완료
                </Text>
                <Text style={styles.regionMeta}>심사 중 {region.reviewing} · 모집 중 {region.recruiting}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.list}>
            {localities.map((row) => {
              const copy = STATUS_COPY[row.status];
              return (
                <TouchableOpacity key={row.id} style={styles.box} onPress={() => openLocality(row)} activeOpacity={0.9}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.city}>{row.label}</Text>
                    <View style={[styles.badge, { backgroundColor: copy.bg }]}>
                      <Text style={[styles.badgeText, { color: copy.color }]}>{copy.badge}</Text>
                    </View>
                    {row.status === 'selected' && row.director ? (
                      <Text style={styles.boxMeta}>{row.director.name} 센터장 명함 보기</Text>
                    ) : null}
                    {row.status === 'reviewing' ? (
                      <Text style={styles.boxMeta}>현재 지원자를 대상으로 심사가 진행 중입니다.</Text>
                    ) : null}
                  </View>
                  {row.status === 'recruiting' ? (
                    <TouchableOpacity style={styles.applyBtn} onPress={() => setApplyRow(row)}>
                      <Text style={styles.applyText}>지원하기</Text>
                    </TouchableOpacity>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
      <CenterDirectorCard visible={Boolean(card)} row={card} onClose={() => setCard(null)} />
      <CenterApplyModal
        visible={Boolean(applyRow)}
        row={applyRow}
        submitting={submitting}
        onClose={() => setApplyRow(null)}
        onSubmit={async (input) => {
          setSubmitting(true);
          try {
            const message = await submitCenterApplication(input);
            Alert.alert('접수 완료', message);
            setApplyRow(null);
            reload();
          } catch (err) {
            Alert.alert('접수 실패', err instanceof Error ? err.message : '다시 시도해 주세요.');
          } finally {
            setSubmitting(false);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F4F6' },
  kicker: { color: '#0F766E', fontSize: 12, fontWeight: '800' },
  title: { fontSize: 24, fontWeight: '800', color: '#111827', marginTop: 4 },
  lead: { fontSize: 14, lineHeight: 21, color: '#4B5563', marginTop: 8, marginBottom: 16 },
  back: { alignSelf: 'flex-start', marginBottom: 12 },
  backText: { color: '#111827', fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  regionCard: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  regionLabel: { fontSize: 18, fontWeight: '800', color: '#111827' },
  regionCount: { fontSize: 12, color: '#0F766E', fontWeight: '800', marginTop: 8 },
  regionMeta: { fontSize: 11, color: '#6B7280', marginTop: 4 },
  list: { gap: 10 },
  box: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  city: { fontSize: 16, fontWeight: '800', color: '#111827' },
  badge: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, marginTop: 8 },
  badgeText: { fontSize: 11, fontWeight: '800' },
  boxMeta: { fontSize: 12, color: '#6B7280', marginTop: 6 },
  applyBtn: {
    backgroundColor: '#EA580C',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  applyText: { color: '#fff', fontWeight: '800', fontSize: 12 },
});
