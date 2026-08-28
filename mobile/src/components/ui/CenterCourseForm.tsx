import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { CenterLocalityRow } from '../../constants/centerDirectors';
import {
  listCenterCourses,
  upsertCenterCourse,
  type CenterCourseStop,
} from '../../constants/centerCourses';
import { saveCenterCourse } from '../../api/centers';
import IsolatedImeField from './IsolatedImeField';
import ModalExitButton from './ModalExitButton';

const STOP_FIELDS = [
  { label: '1. 역사 체험 코스', placeholder: '예: 수원화성 · 화성행궁' },
  { label: '2. 전통시장 및 먹거리 코스', placeholder: '예: 수원 영동시장' },
  { label: '3. 메인 축 / 핵심 동선', placeholder: '예: 수원화성문화제 행궁광장' },
  { label: '4. 캠핑장 및 숙박 코스', placeholder: '예: 광교호수공원 가족캠핑장' },
] as const;

function makeStopRefs(): Array<{
  name: React.MutableRefObject<string>;
  desc: React.MutableRefObject<string>;
  lat: React.MutableRefObject<string>;
  lng: React.MutableRefObject<string>;
}> {
  return [0, 1, 2, 3].map(() => ({
    name: { current: '' },
    desc: { current: '' },
    lat: { current: '' },
    lng: { current: '' },
  }));
}

export default function CenterCourseForm({
  visible,
  row,
  onClose,
}: {
  visible: boolean;
  row: CenterLocalityRow | null;
  onClose: () => void;
}) {
  const titleRef = useRef('');
  const descRef = useRef('');
  const imagesRef = useRef('');
  const stopsRef = useRef(makeStopRefs());
  const [tick, setTick] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible || !row) return;
    const existing = listCenterCourses(row.label, row.region)[0];
    titleRef.current = existing?.title || `${row.label} 로컬 추천 코스`;
    descRef.current = existing?.description || '';
    imagesRef.current = (existing?.images || []).join('\n');
    const stops = [existing?.historyCourse, existing?.marketFoodCourse, existing?.mainAxis, existing?.campingAccommodation];
    stopsRef.current = makeStopRefs();
    stops.forEach((stop, index) => {
      stopsRef.current[index].name.current = stop?.name || '';
      stopsRef.current[index].desc.current = stop?.description || '';
      stopsRef.current[index].lat.current = stop?.latitude != null ? String(stop.latitude) : '';
      stopsRef.current[index].lng.current = stop?.longitude != null ? String(stop.longitude) : '';
    });
    setTick((value) => value + 1);
  }, [visible, row?.id]);

  const submit = async () => {
    if (!row) return;
    const title = titleRef.current.trim();
    if (!title) {
      Alert.alert('알림', '코스 제목을 입력해 주세요.');
      return;
    }
    const stopAt = (index: number): CenterCourseStop => ({
      name: stopsRef.current[index].name.current.trim(),
      description: stopsRef.current[index].desc.current.trim(),
      latitude: Number(stopsRef.current[index].lat.current) || undefined,
      longitude: Number(stopsRef.current[index].lng.current) || undefined,
    });
    setSaving(true);
    try {
      const saved = await saveCenterCourse({
        regionId: row.label,
        metro: row.region,
        centerId: row.id,
        title,
        description: descRef.current.trim(),
        images: imagesRef.current.split(/[\n,]/).map((item) => item.trim()).filter(Boolean),
        historyCourse: stopAt(0),
        marketFoodCourse: stopAt(1),
        mainAxis: stopAt(2),
        campingAccommodation: stopAt(3),
      });
      upsertCenterCourse(saved);
      Alert.alert('등록 완료', `${row.label} 추천 코스가 플랫폼에 반영되었습니다.`);
      onClose();
    } catch (err) {
      Alert.alert('등록 실패', err instanceof Error ? err.message : '다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  };

  if (!visible || !row) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <ModalExitButton onPress={onClose} />
          <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 28 }} keyboardShouldPersistTaps="handled">
            <Text style={styles.kicker}>센터장 추천 코스</Text>
            <Text style={styles.title}>{row.regionLabel} {row.label}</Text>
            <Text style={styles.lead}>
              역사·시장·메인 동선·숙박 4가지 양식으로 입력하면 해당 지역 축제 상세와 홈 화면에 바로 반영됩니다.
            </Text>
            <Text style={styles.label}>코스 제목</Text>
            <IsolatedImeField key={`title-${tick}`} valueRef={titleRef} placeholder={`${row.label} 하루 코스`} fieldKey={`course-title-${tick}`} ignoreModalLock />
            <Text style={styles.label}>상세 설명</Text>
            <IsolatedImeField key={`desc-${tick}`} valueRef={descRef} placeholder="현장에서 발굴한 코스 소개" multiline fieldKey={`course-desc-${tick}`} ignoreModalLock />
            <Text style={styles.label}>현장 사진 URL (줄바꿈 또는 쉼표)</Text>
            <IsolatedImeField key={`img-${tick}`} valueRef={imagesRef} placeholder="https://..." multiline fieldKey={`course-img-${tick}`} ignoreModalLock />
            {STOP_FIELDS.map((field, index) => (
              <View key={field.label} style={styles.stop}>
                <Text style={styles.stopTitle}>{field.label}</Text>
                <IsolatedImeField
                  key={`${index}-name-${tick}`}
                  valueRef={stopsRef.current[index].name}
                  placeholder={field.placeholder}
                  fieldKey={`${index}-name-${tick}`}
                  ignoreModalLock
                />
                <View style={{ height: 8 }} />
                <IsolatedImeField
                  key={`${index}-desc-${tick}`}
                  valueRef={stopsRef.current[index].desc}
                  placeholder="이 스팟을 고른 이유"
                  multiline
                  fieldKey={`${index}-desc-${tick}`}
                  ignoreModalLock
                />
                <View style={styles.gpsRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.gpsLabel}>위도</Text>
                    <IsolatedImeField
                      key={`${index}-lat-${tick}`}
                      valueRef={stopsRef.current[index].lat}
                      placeholder="37.28"
                      fieldKey={`${index}-lat-${tick}`}
                      ignoreModalLock
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.gpsLabel}>경도</Text>
                    <IsolatedImeField
                      key={`${index}-lng-${tick}`}
                      valueRef={stopsRef.current[index].lng}
                      placeholder="127.01"
                      fieldKey={`${index}-lng-${tick}`}
                      ignoreModalLock
                    />
                  </View>
                </View>
              </View>
            ))}
            <TouchableOpacity style={styles.submit} onPress={submit} disabled={saving}>
              <Text style={styles.submitText}>{saving ? '등록 중...' : '코스 등록 · 즉시 반영'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', padding: 10 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.55)' },
  sheet: {
    maxHeight: '94%',
    backgroundColor: '#F9FAFB',
    borderRadius: 18,
    overflow: 'hidden',
    alignSelf: 'center',
    width: '100%',
    maxWidth: 520,
  },
  kicker: { color: '#1D4ED8', fontSize: 11, fontWeight: '800' },
  title: { fontSize: 20, fontWeight: '800', color: '#111827', marginTop: 4 },
  lead: { fontSize: 13, lineHeight: 20, color: '#4B5563', marginTop: 8, marginBottom: 8 },
  label: { fontSize: 12, fontWeight: '800', color: '#6B7280', marginBottom: 6, marginTop: 10 },
  stop: {
    marginTop: 12,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  stopTitle: { fontSize: 14, fontWeight: '800', color: '#111827', marginBottom: 8 },
  gpsRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  gpsLabel: { fontSize: 11, fontWeight: '800', color: '#6B7280', marginBottom: 4 },
  submit: {
    marginTop: 16,
    backgroundColor: '#1D4ED8',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
