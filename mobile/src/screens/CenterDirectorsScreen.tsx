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
import CenterCourseForm from '../components/ui/CenterCourseForm';
import CenterLocalCourseBoard from '../components/ui/CenterLocalCourseBoard';
import { subscribeCenterApplications } from '../stores/centerApplyStore';
import { CENTER_PURPOSE_NOTICE_TITLE, CENTER_PURPOSE_SECTIONS } from '../constants/centerPurposeNotice';

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
  const [regionId, setRegionId] = useState<string | null>(route.params?.region || null);
  const [localities, setLocalities] = useState<CenterLocalityRow[]>([]);
  const [card, setCard] = useState<CenterLocalityRow | null>(null);
  const [applyRow, setApplyRow] = useState<CenterLocalityRow | null>(null);
  const [courseRow, setCourseRow] = useState<CenterLocalityRow | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reload = () => {
    fetchCenterRegions().then(setRegions);
    if (regionId) fetchCenterLocalities(regionId).then(setLocalities);
  };

  useEffect(() => {
    if (route.params?.tab === 'purpose' || route.params?.tab === 'status') {
      setTab(route.params.tab);
    }
    if (route.params?.region) setRegionId(route.params.region);
  }, [route.params?.tab, route.params?.region]);

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
    fetchCenterLocalities(regionId).then((rows) => {
      setLocalities(rows);
      if (route.params?.openCard && route.params?.locality) {
        const match = rows.find((item) => item.id === route.params.locality);
        if (match) setCard(match);
      }
    });
  }, [regionId, route.params?.openCard, route.params?.locality]);

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
            <Text style={styles.kicker}>[공지문]</Text>
            <Text style={styles.title}>{CENTER_PURPOSE_NOTICE_TITLE}</Text>
            <Text style={styles.lead}>
              안녕하십니까, 지자체 축제와 지역 소상공인의 상생을 돕는 O2O 플랫폼 온앤온+입니다.
            </Text>
            <Text style={styles.lead}>
              온앤온+는 전국 229개 기초지자체별로 현장을 발로 뛰며 지역의 매력을 가장 잘 아는 '지역 센터장'을 선정·운영합니다. 이번 229개 지역 센터장 체제는 단순한 상가 쿠폰 연계를 넘어, 우리 동네의 숨겨진 가치를 세상에 알리는 지역 경제·관광의 오피니언 리더를 세우는 과정입니다.
            </Text>
            {CENTER_PURPOSE_SECTIONS.map((section) => (
              <View key={section.heading} style={styles.purposeCard}>
                <Text style={styles.purposeTitle}>{section.heading}</Text>
                {section.bullets.map((bullet) => (
                  <Text key={bullet.slice(0, 24)} style={styles.purposeBody}>• {bullet}</Text>
                ))}
              </View>
            ))}
            <Text style={styles.lead}>
              온앤온+는 229개 지역 센터장과 함께 각 지역의 숨은 매력을 담은 관광 코스를 만들고, 소상공인과 골목상권이 함께 살아나는 진짜 지역 상생 생태계를 완성해 나가겠습니다. 여러분의 많은 관심과 응원을 부탁드립니다.
            </Text>
            <Text style={styles.signoff}>감사합니다.{'\n'}온앤온+ 운영팀 드림</Text>
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
                <CenterLocalCourseBoard flush regionId={localities.find((item) => item.status === 'selected')?.label} metro={regionId || undefined} />
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
                        <View style={{ gap: 8 }}>
                          <TouchableOpacity style={styles.cardBtn} onPress={() => setCard(row)}>
                            <Text style={styles.cardBtnText}>명함</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.courseBtn} onPress={() => setCourseRow(row)}>
                            <Text style={styles.courseBtnText}>코스 등록</Text>
                          </TouchableOpacity>
                        </View>
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
      <CenterCourseForm visible={Boolean(courseRow)} row={courseRow} onClose={() => setCourseRow(null)} />
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
  purposeBody: { fontSize: 13, lineHeight: 20, color: '#4B5563', marginTop: 8, fontWeight: '600' },
  signoff: { fontSize: 14, lineHeight: 22, color: '#111827', fontWeight: '700', marginTop: 4, marginBottom: 12 },
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
  courseBtn: {
    backgroundColor: '#1D4ED8',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  courseBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },
});
