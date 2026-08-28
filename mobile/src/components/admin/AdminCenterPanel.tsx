import React, { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ActionButton, StatusBadge } from './AdminWidgets';
import { METRO_REGIONS } from '../../constants/regions';
import { directorTitleFor, listCenterLocalities, websiteForLocality, type CenterApplicationRecord, type CenterLocalityRow } from '../../constants/centerDirectors';
import {
  applyCenterBusinessCard,
  fetchCenterApplications,
  fetchReviewCenterCourses,
  resetCenterCoursePassword,
  reviewCenterApplication,
  saveCenterCourseReview,
} from '../../api/centers';
import { subscribeCenterApplications } from '../../stores/centerApplyStore';
import { subscribeCenterCourses, type CenterCourseStatus, type CenterLocalCourse } from '../../constants/centerCourses';
import { CenterCardFaces } from '../ui/CenterDirectorCard';
import CenterCourseForm from '../ui/CenterCourseForm';
import { buildCenterCardModel } from '../../utils/centerCardDocument';

type PanelTab = 'apps' | 'courses';

const COURSE_STATUS: Array<{ id: CenterCourseStatus; label: string }> = [
  { id: 'approved', label: '등재(업로드)' },
  { id: 'revision', label: '재검토(수정)' },
  { id: 'rejected', label: '반려' },
];

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

function courseStatusLabel(status: CenterCourseStatus) {
  if (status === 'approved') return '등재(업로드)';
  if (status === 'revision') return '재검토(수정)';
  if (status === 'rejected') return '반려';
  return '검토 대기';
}

function courseStatusTone(status: CenterCourseStatus): 'ok' | 'warn' | 'danger' | 'info' {
  if (status === 'approved') return 'ok';
  if (status === 'revision') return 'warn';
  if (status === 'rejected') return 'danger';
  return 'info';
}

function formatCourseDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return String(iso || '').slice(0, 10) || '-';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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

function directorRowForCourse(course: CenterLocalCourse, applications: CenterApplicationRecord[]): CenterLocalityRow | null {
  const matched = applications.find((row) => row.localityKey === course.centerId && row.reviewStatus === 'selected')
    || applications.find((row) => row.localityKey === course.centerId)
    || applications.find((row) => row.localityLabel === course.regionId && row.reviewStatus === 'selected')
    || applications.find((row) => row.localityLabel === course.regionId);
  if (matched) return rowFromApplication(matched);
  const locality = listCenterLocalities(course.metro).find((row) => row.id === course.centerId || row.label === course.regionId);
  return locality?.director ? locality : null;
}

export default function AdminCenterPanel() {
  const [tab, setTab] = useState<PanelTab>('apps');
  const [rows, setRows] = useState<CenterApplicationRecord[]>([]);
  const [region, setRegion] = useState('ALL');
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [courseRow, setCourseRow] = useState<CenterLocalityRow | null>(null);
  const [courses, setCourses] = useState<CenterLocalCourse[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<CenterCourseStatus>('pending');

  const load = () => {
    fetchCenterApplications().then(setRows);
    fetchReviewCenterCourses().then((list) => {
      setCourses(list);
      setSelectedCourseId((current) => current || list[0]?.id || null);
    });
  };

  useEffect(() => {
    load();
    const offApps = subscribeCenterApplications(load);
    const offCourses = subscribeCenterCourses(() => {
      fetchReviewCenterCourses().then(setCourses);
    });
    return () => {
      offApps();
      offCourses();
    };
  }, []);

  const filtered = useMemo(
    () => rows.filter((row) => region === 'ALL' || row.region === region),
    [rows, region],
  );
  const preview = filtered.find((row) => row.id === previewId) || filtered.find((row) => row.reviewStatus === 'selected') || null;
  const previewModel = preview && preview.reviewStatus === 'selected' ? buildCenterCardModel(rowFromApplication(preview)) : null;
  const selectedCourse = courses.find((item) => item.id === selectedCourseId) || courses[0] || null;
  const selectedDirector = selectedCourse ? directorRowForCourse(selectedCourse, rows) : null;
  const selectedCard = selectedDirector ? buildCenterCardModel(selectedDirector) : null;

  useEffect(() => {
    if (selectedCourse) setDraftStatus(selectedCourse.status === 'pending' ? 'approved' : selectedCourse.status);
  }, [selectedCourse?.id, selectedCourse?.status]);

  return (
    <>
      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tab, tab === 'apps' && styles.tabOn]} onPress={() => setTab('apps')}>
          <Text style={[styles.tabText, tab === 'apps' && styles.tabTextOn]}>지원 현황</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'courses' && styles.tabOn]} onPress={() => setTab('courses')}>
          <Text style={[styles.tabText, tab === 'courses' && styles.tabTextOn]}>추천 코스 리스트</Text>
        </TouchableOpacity>
      </View>

      {tab === 'apps' ? (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>지역센터장 지원 현황</Text>
            <Text style={styles.hint}>
              지원하기·지원완료(선정 심사 중)·선정 완료를 누르면 지역센터장 페이지 표시가 바로 바뀝니다. 선정 이후 결격 사유가 있으면 지원하기로 되돌려 다시 모집할 수 있고, 그때 기존 명함 자료는 초기화됩니다.
            </Text>
            <View style={styles.kpiRow}>
              <Text style={styles.kpi}>전체 {rows.length}건</Text>
              <Text style={styles.kpi}>접수 {rows.filter((row) => row.reviewStatus === 'submitted').length}건</Text>
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
                  label="지원하기"
                  kind="ghost"
                  active={row.reviewStatus === 'submitted'}
                  onPress={async () => {
                    await reviewCenterApplication(row.id, 'submitted');
                    if (previewId === row.id) setPreviewId(null);
                    setMessage(`${row.localityLabel}을(를) 다시 지원하기 상태로 되돌렸습니다. 기존 명함 자료는 초기화되었습니다.`);
                    load();
                  }}
                />
                <ActionButton
                  label="지원완료(선정 심사 중)"
                  kind="ghost"
                  active={row.reviewStatus === 'reviewing'}
                  onPress={async () => {
                    await reviewCenterApplication(row.id, 'reviewing');
                    if (previewId === row.id) setPreviewId(null);
                    setMessage(`${row.name} 지원서를 선정 심사 중으로 표시했습니다.`);
                    load();
                  }}
                />
                <ActionButton
                  label="선정 완료"
                  kind="ghost"
                  active={row.reviewStatus === 'selected'}
                  onPress={async () => {
                    await reviewCenterApplication(row.id, 'selected');
                    setPreviewId(row.id);
                    setMessage(`${row.name} 센터장으로 선정했습니다.`);
                    load();
                  }}
                />
                <ActionButton
                  label="명함에 적용"
                  kind="ghost"
                  active={Boolean(row.cardApplied)}
                  onPress={async () => {
                    await applyCenterBusinessCard(row.id);
                    setPreviewId(row.id);
                    setMessage(`${row.name} 지원서 정보를 온앤온+ 공식 디지털 명함에 적용했습니다.`);
                    load();
                  }}
                />
                {row.reviewStatus === 'selected' ? (
                  <>
                    <ActionButton
                      label="추천 코스 등록"
                      onPress={() => setCourseRow(rowFromApplication(row))}
                    />
                    <ActionButton
                      kind="ghost"
                      label="코스 비밀번호 초기화"
                      onPress={async () => {
                        await resetCenterCoursePassword(row.localityKey);
                        setMessage(`${row.localityLabel} 코스 등록 비밀번호를 초기화했습니다. 센터장이 다시 등록해야 입장할 수 있습니다.`);
                      }}
                    />
                  </>
                ) : null}
              </View>
            </View>
          ))}
          {previewModel ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>명함 미리보기 · 적용 결과</Text>
              <Text style={styles.hint}>전면 사진·이름·M·E·A·W와 후면 지자체 QR이 지원서 기준으로 채워집니다. 지원하기로 되돌리면 명함 자료가 지워집니다.</Text>
              <CenterCardFaces model={previewModel} />
            </View>
          ) : null}
        </>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>추천 코스 리스트</Text>
            <Text style={styles.hint}>
              신규 생성 코스는 해당 지역 센터장 명함과 함께 표시됩니다. 등재(업로드)·재검토(수정)·반려를 체크한 뒤 저장하세요. 목록을 누르면 상세보기로 불러옵니다.
            </Text>
            <View style={styles.kpiRow}>
              <Text style={styles.kpi}>전체 {courses.length}건</Text>
              <Text style={styles.kpi}>등재 {courses.filter((item) => item.status === 'approved').length}건</Text>
              <Text style={styles.kpi}>재검토 {courses.filter((item) => item.status === 'revision').length}건</Text>
              <Text style={styles.kpi}>반려 {courses.filter((item) => item.status === 'rejected').length}건</Text>
            </View>
          </View>
          <View style={styles.card}>
            <View style={styles.tableHead}>
              <Text style={[styles.th, { flex: 1.2 }]}>센터명</Text>
              <Text style={[styles.th, { flex: 0.9 }]}>일자</Text>
              <Text style={[styles.th, { flex: 1 }]}>등재 현황</Text>
            </View>
            {courses.length === 0 ? (
              <Text style={styles.hint}>등록된 추천 코스가 없습니다. 센터장이 코스를 제출하면 이곳에 모입니다.</Text>
            ) : courses.map((course) => {
              const on = selectedCourse?.id === course.id;
              return (
                <TouchableOpacity
                  key={course.id}
                  style={[styles.tableRow, on && styles.tableRowOn]}
                  onPress={() => {
                    setSelectedCourseId(course.id);
                    setDraftStatus(course.status === 'pending' ? 'approved' : course.status);
                  }}
                >
                  <Text style={[styles.td, { flex: 1.2 }]} numberOfLines={2}>{course.regionId}</Text>
                  <Text style={[styles.td, { flex: 0.9 }]}>{formatCourseDate(course.updatedAt)}</Text>
                  <View style={{ flex: 1 }}>
                    <StatusBadge label={courseStatusLabel(course.status)} tone={courseStatusTone(course.status)} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
          {selectedCourse ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>상세보기 · {selectedCourse.regionId}</Text>
              <Text style={styles.name}>{selectedCourse.title}</Text>
              <Text style={styles.meta}>{selectedCourse.metro || '-'} · {formatCourseDate(selectedCourse.updatedAt)}</Text>
              {selectedCourse.description ? <Text style={styles.intro}>{selectedCourse.description}</Text> : null}
              {selectedCard ? (
                <View style={{ marginTop: 12 }}>
                  <Text style={styles.key}>센터장 명함</Text>
                  <CenterCardFaces model={selectedCard} />
                </View>
              ) : (
                <Text style={styles.hint}>이 지역에 선정된 센터장 명함이 아직 없습니다. 지원 현황에서 선정·명함 적용 후 다시 불러오세요.</Text>
              )}
              <Text style={[styles.line, { marginTop: 12 }]}><Text style={styles.key}>역사 </Text>{selectedCourse.historyCourse.name || '-'}</Text>
              {selectedCourse.historyCourse.description ? <Text style={styles.meta}>{selectedCourse.historyCourse.description}</Text> : null}
              <Text style={styles.line}><Text style={styles.key}>시장 </Text>{selectedCourse.marketFoodCourse.name || '-'}</Text>
              {selectedCourse.marketFoodCourse.description ? <Text style={styles.meta}>{selectedCourse.marketFoodCourse.description}</Text> : null}
              <Text style={styles.line}><Text style={styles.key}>메인 </Text>{selectedCourse.mainAxis.name || '-'}</Text>
              {selectedCourse.mainAxis.description ? <Text style={styles.meta}>{selectedCourse.mainAxis.description}</Text> : null}
              <Text style={styles.line}><Text style={styles.key}>숙박 </Text>{selectedCourse.campingAccommodation.name || '-'}</Text>
              {selectedCourse.campingAccommodation.description ? <Text style={styles.meta}>{selectedCourse.campingAccommodation.description}</Text> : null}
              <Text style={[styles.key, { marginTop: 14 }]}>등재 현황</Text>
              <View style={styles.radioRow}>
                {COURSE_STATUS.map((item) => {
                  const on = draftStatus === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.radio, on && styles.radioOn]}
                      onPress={() => setDraftStatus(item.id)}
                    >
                      <Text style={[styles.radioText, on && styles.radioTextOn]}>{item.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.actions}>
                <ActionButton
                  label="저장"
                  onPress={async () => {
                    const saved = await saveCenterCourseReview(selectedCourse.id, draftStatus);
                    setMessage(`${selectedCourse.regionId} 코스를 ${courseStatusLabel(saved?.status || draftStatus)}로 저장했습니다.`);
                    load();
                  }}
                />
              </View>
            </View>
          ) : null}
        </>
      )}
      {message ? <Text style={styles.ok}>{message}</Text> : null}
      <CenterCourseForm visible={Boolean(courseRow)} row={courseRow} onClose={() => setCourseRow(null)} />
    </>
  );
}

const styles = StyleSheet.create({
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  tab: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  tabOn: { backgroundColor: '#111827' },
  tabText: { fontSize: 13, fontWeight: '800', color: '#374151' },
  tabTextOn: { color: '#fff' },
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
  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 },
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
  tableHead: { flexDirection: 'row', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', marginBottom: 4 },
  th: { fontSize: 11, fontWeight: '800', color: '#6B7280' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 6 },
  tableRowOn: { backgroundColor: '#F0FDFA', marginHorizontal: -6, paddingHorizontal: 6, borderRadius: 8 },
  td: { fontSize: 12, fontWeight: '700', color: '#111827' },
  radioRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  radio: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#fff' },
  radioOn: { backgroundColor: '#111827', borderColor: '#111827' },
  radioText: { fontSize: 12, fontWeight: '800', color: '#374151' },
  radioTextOn: { color: '#fff' },
  ok: { marginTop: 4, marginBottom: 12, fontSize: 12, fontWeight: '700', color: '#047857' },
});
