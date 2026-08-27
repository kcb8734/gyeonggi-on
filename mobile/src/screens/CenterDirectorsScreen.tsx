import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchCenterLocalities, fetchCenterRegions, submitCenterApplication } from '../api/centers';
import type { CenterLocalityRow, CenterRegionSummary } from '../constants/centerDirectors';
import CenterApplyModal from '../components/ui/CenterApplyModal';
import CenterDirectorCard from '../components/ui/CenterDirectorCard';
import { subscribeCenterApplications } from '../stores/centerApplyStore';

const STATUS_COPY = {
  selected: { badge: '선정 완료', color: '#0F766E', bg: '#CCFBF1' },
  reviewing: { badge: '지원 완료 (선정 심사 중)', color: '#92400E', bg: '#FEF3C7' },
  recruiting: { badge: '지원 접수 중', color: '#9A3412', bg: '#FFEDD5' },
};

type TabKey = 'purpose' | 'status';

export default function CenterDirectorsScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute<any>();
  const initialTab: TabKey = route.params?.tab === 'purpose' ? 'purpose' : 'status';
  const [tab, setTab] = useState<TabKey>(initialTab);
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
    if (route.params?.tab === 'purpose' || route.params?.tab === 'status') {
      setTab(route.params.tab);
    }
  }, [route.params?.tab]);

  useEffect(() => {
    fetchCenterRegions().then(setRegions);
    return subscribeCenterApplications(() => {
      fetchCenterRegions().then(setRegions);
      if (regionId) fetchCenterLocalities(regionId).then(setLocalities);
    });
  }, [regionId]);

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
    setApplyRow(row);
  };

  return (
    <View style={styles.root}>
      <View style={styles.tabs}>
        {([
          ['purpose', '지역센터 운영 취지'],
          ['status', '지역센터장 선정 현황'],
        ] as const).map(([key, label]) => (
          <TouchableOpacity
            key={key}
            style={[styles.tab, tab === key && styles.tabOn]}
            onPress={() => setTab(key)}
          >
            <Text style={[styles.tabText, tab === key && styles.tabTextOn]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 36 + insets.bottom }}>
        {tab === 'purpose' ? (
          <View>
            <Text style={styles.kicker}>온앤온+ 지역센터</Text>
            <Text style={styles.title}>지역센터 운영 취지</Text>
            <Text style={styles.lead}>
              온앤온+(on&on+)은 지자체 축제와 소상공인 상생을 잇는 현장 플랫폼입니다. 시·군·구마다 지역센터장을 두어 축제 현장과 골목 상가를 같은 자리에서 안내합니다.
            </Text>
            <View style={styles.purposeCard}>
              <Text style={styles.purposeTitle}>현장 연결</Text>
              <Text style={styles.purposeBody}>축제 방문객이 인근 시장·상점의 상생 쿠폰을 바로 쓰도록 센터장이 동선을 안내합니다.</Text>
            </View>
            <View style={styles.purposeCard}>
              <Text style={styles.purposeTitle}>지역 전담</Text>
              <Text style={styles.purposeBody}>17개 광역 권역, 시·군·구 전담센터가 해당 지자체 축제 캘린더와 소상공인 할인을 함께 운영합니다.</Text>
            </View>
            <View style={styles.purposeCard}>
              <Text style={styles.purposeTitle}>선정과 명함</Text>
              <Text style={styles.purposeBody}>지원서를 접수하면 관리자가 선정 심사를 진행합니다. 선정 완료 센터장에게는 온앤온+ 공식 디지털 명함(전면·후면, 9.2×5.2cm)을 드립니다.</Text>
            </View>
            <TouchableOpacity style={styles.goStatus} onPress={() => setTab('status')}>
              <Text style={styles.goStatusText}>지역센터장 선정 현황 · 지원하기</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.kicker}>전국 {regions.reduce((sum, row) => sum + row.total, 0) || '시·군·구'}개 지자체</Text>
            <Text style={styles.title}>지역센터장 선정 현황</Text>
            <Text style={styles.lead}>
              17개 광역 권역을 먼저 보고, 시·군·구 박스에서 선정된 센터장 명함을 확인하거나 지원하세요. 지원하기를 누르면 현재 지원 인원이 표시됩니다.
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
                        {row.status !== 'selected' ? (
                          <Text style={styles.count}>현재 {row.applicantCount ?? 0}명 지원 중</Text>
                        ) : null}
                        {row.status === 'selected' && row.director ? (
                          <Text style={styles.boxMeta}>{row.director.name} 센터장 명함 보기</Text>
                        ) : null}
                      </View>
                      {row.status === 'selected' ? (
                        <TouchableOpacity style={styles.cardBtn} onPress={() => setCard(row)}>
                          <Text style={styles.cardBtnText}>명함</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity style={styles.applyBtn} onPress={() => setApplyRow(row)}>
                          <Text style={styles.applyText}>지원하기</Text>
                        </TouchableOpacity>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>
      <CenterDirectorCard visible={Boolean(card)} row={card} onClose={() => setCard(null)} />
      <CenterApplyModal
        visible={Boolean(applyRow)}
        row={applyRow}
        submitting={submitting}
        onClose={() => setApplyRow(null)}
        onSubmit={async (input) => {
          if (!applyRow) return;
          setSubmitting(true);
          try {
            const message = await submitCenterApplication(input, {
              localityLabel: applyRow.label,
              region: applyRow.region,
              regionLabel: applyRow.regionLabel,
            });
            Alert.alert('접수 완료', `${message}\n현재 ${(applyRow.applicantCount ?? 0) + 1}명 지원 중`);
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
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabOn: { borderBottomColor: '#0F766E' },
  tabText: { fontSize: 13, fontWeight: '800', color: '#6B7280' },
  tabTextOn: { color: '#0F766E' },
  kicker: { color: '#0F766E', fontSize: 12, fontWeight: '800' },
  title: { fontSize: 24, fontWeight: '800', color: '#111827', marginTop: 4 },
  lead: { fontSize: 14, lineHeight: 21, color: '#4B5563', marginTop: 8, marginBottom: 16 },
  purposeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 10,
  },
  purposeTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  purposeBody: { fontSize: 13, lineHeight: 20, color: '#4B5563', marginTop: 6, fontWeight: '600' },
  goStatus: {
    marginTop: 8,
    backgroundColor: '#0F766E',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  goStatusText: { color: '#fff', fontWeight: '800' },
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
  count: { fontSize: 12, color: '#EA580C', fontWeight: '800', marginTop: 6 },
  boxMeta: { fontSize: 12, color: '#6B7280', marginTop: 6 },
  applyBtn: {
    backgroundColor: '#EA580C',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  applyText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  cardBtn: {
    backgroundColor: '#0F766E',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  cardBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },
});
