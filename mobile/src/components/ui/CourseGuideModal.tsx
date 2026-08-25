import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { FestivalCourse } from '../../api/courses';
import { MapView, Marker, Polyline } from '../map/CompatibleMap';
import { categoryPinColor, regionFromPoints, validLatLng } from '../../utils/mapCamera';
import ModalExitButton from './ModalExitButton';

type Focus = 'all' | '역사체험' | '전통시장 먹거리' | '캠핑장/숙박';

const FOCUS_LABEL: Record<Focus, string> = {
  all: '전체 코스',
  역사체험: '역사 명소',
  '전통시장 먹거리': '전통시장 먹거리',
  '캠핑장/숙박': '캠핑장 · 숙박',
};

export default function CourseGuideModal({
  visible,
  course,
  focus = 'all',
  onClose,
}: {
  visible: boolean;
  course: FestivalCourse | null;
  focus?: Focus;
  onClose: () => void;
}) {
  const mapRef = useRef<React.ElementRef<typeof MapView>>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const steps = useMemo(() => {
    const rows = course?.itinerary ?? [];
    return focus === 'all' ? rows : rows.filter((item) => item.category === focus);
  }, [course, focus]);
  const points = useMemo(
    () => steps
      .filter((step) => validLatLng(step.latitude, step.longitude))
      .map((step) => ({ latitude: Number(step.latitude), longitude: Number(step.longitude) })),
    [steps],
  );
  const overview = useMemo(() => regionFromPoints(points, 0.05), [points]);
  const current = steps[Math.min(stepIndex, Math.max(steps.length - 1, 0))];

  useEffect(() => {
    if (visible) setStepIndex(0);
  }, [visible, course?.course_title, focus]);

  useEffect(() => {
    if (!visible || !points.length) return;
    const timer = setTimeout(() => {
      mapRef.current?.fitToCoordinates(points, { edgePadding: { top: 36, right: 36, bottom: 36, left: 36 } });
    }, 180);
    return () => clearTimeout(timer);
  }, [visible, course?.course_title, focus, points]);

  const focusStep = (index: number) => {
    const next = Math.max(0, Math.min(steps.length - 1, index));
    setStepIndex(next);
    const step = steps[next];
    if (!validLatLng(step?.latitude, step?.longitude)) return;
    mapRef.current?.animateToRegion({
      latitude: Number(step.latitude),
      longitude: Number(step.longitude),
      latitudeDelta: 0.04,
      longitudeDelta: 0.04,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <ModalExitButton onPress={onClose} />
          <Text style={styles.kicker}>ON&ON+ 추천코스 살펴보기</Text>
          <Text style={styles.title}>{FOCUS_LABEL[focus]}</Text>
          <Text style={styles.lead}>{course?.course_title}</Text>
          <View style={styles.mapCard}>
            {overview ? (
              <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={overview}
                region={overview}
              >
                {points.length > 1 ? (
                  <Polyline
                    coordinates={points}
                    strokeColor="#0047FF"
                    strokeWidth={4}
                    lineDashPattern={[6, 8]}
                  />
                ) : null}
                {steps.map((step, index) => (
                  validLatLng(step.latitude, step.longitude) ? (
                    <Marker
                      key={`${step.step}-${step.place_name}`}
                      coordinate={{ latitude: Number(step.latitude), longitude: Number(step.longitude) }}
                      title={`${step.step}. ${step.place_name}`}
                      description={step.category}
                      pinColor={categoryPinColor(step.category)}
                      badgeLabel={String(step.step || index + 1)}
                      emphasized={String(step.category).includes('축제') || current?.step === step.step}
                      onPress={() => focusStep(index)}
                    />
                  ) : null
                ))}
              </MapView>
            ) : (
              <View style={[styles.map, styles.mapEmpty]}>
                <Text style={styles.emptyText}>코스 좌표를 준비 중입니다.</Text>
              </View>
            )}
          </View>
          <ScrollView style={styles.list}>
            {steps.map((step, index) => (
              <TouchableOpacity
                key={`${step.step}-${step.place_name}`}
                style={[styles.card, current?.step === step.step && styles.cardOn]}
                onPress={() => focusStep(index)}
              >
                <Text style={styles.step}>{step.step}. [{step.category}] {step.place_name}</Text>
                <Text style={styles.meta}>{step.estimated_time} · {step.description}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={styles.row}>
            <TouchableOpacity style={styles.nav} onPress={() => focusStep(stepIndex - 1)}>
              <Text style={styles.navText}>이전 코스</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.nav} onPress={() => focusStep(stepIndex + 1)}>
              <Text style={styles.navText}>다음 코스</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 14 },
  sheet: { backgroundColor: '#fff', borderRadius: 18, padding: 16, paddingTop: 52, paddingRight: 16, maxHeight: '92%' as unknown as number },
  kicker: { fontSize: 11, fontWeight: '800', color: '#0F766E', paddingRight: 88 },
  title: { fontSize: 20, fontWeight: '900', color: '#111827', marginTop: 4 },
  lead: { fontSize: 13, color: '#4B5563', marginTop: 4, marginBottom: 10, fontWeight: '600' },
  mapCard: { height: 220, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB' },
  map: { flex: 1 },
  mapEmpty: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6' },
  emptyText: { fontSize: 13, fontWeight: '700', color: '#6B7280' },
  list: { maxHeight: 180, marginTop: 10 },
  card: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  cardOn: { borderColor: '#0F766E', backgroundColor: '#ECFDF5' },
  step: { fontSize: 14, fontWeight: '800', color: '#111827' },
  meta: { fontSize: 12, color: '#4B5563', marginTop: 4, lineHeight: 18 },
  row: { flexDirection: 'row', gap: 8, marginTop: 8 },
  nav: { flex: 1, backgroundColor: '#111827', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  navText: { color: '#fff', fontWeight: '800' },
});
