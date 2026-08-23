import React, { useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { FestivalCourse } from '../../api/courses';
import { MapView, Marker } from '../map/CompatibleMap';
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
  const [stepIndex, setStepIndex] = useState(0);
  const steps = useMemo(() => {
    const rows = course?.itinerary ?? [];
    return focus === 'all' ? rows : rows.filter((item) => item.category === focus);
  }, [course, focus]);
  const current = steps[Math.min(stepIndex, Math.max(steps.length - 1, 0))];
  const region = current
    ? { latitude: current.latitude || 37.28, longitude: current.longitude || 127.01, latitudeDelta: 0.08, longitudeDelta: 0.08 }
    : { latitude: 37.28, longitude: 127.01, latitudeDelta: 0.2, longitudeDelta: 0.2 };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <ModalExitButton onPress={onClose} />
          <Text style={styles.kicker}>ON&ON 추천코스 살펴보기</Text>
          <Text style={styles.title}>{FOCUS_LABEL[focus]}</Text>
          <Text style={styles.lead}>{course?.course_title}</Text>
          <View style={styles.mapCard}>
            <MapView style={styles.map} region={region}>
              {steps.map((step) => (
                <Marker
                  key={`${step.step}-${step.place_name}`}
                  coordinate={{ latitude: step.latitude || region.latitude, longitude: step.longitude || region.longitude }}
                  title={`${step.step}. ${step.place_name}`}
                  pinColor={current?.step === step.step ? 'red' : 'blue'}
                />
              ))}
            </MapView>
          </View>
          <ScrollView style={styles.list}>
            {steps.map((step, index) => (
              <TouchableOpacity
                key={`${step.step}-${step.place_name}`}
                style={[styles.card, current?.step === step.step && styles.cardOn]}
                onPress={() => setStepIndex(index)}
              >
                <Text style={styles.step}>{step.step}. [{step.category}] {step.place_name}</Text>
                <Text style={styles.meta}>{step.estimated_time} · {step.description}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={styles.row}>
            <TouchableOpacity
              style={styles.nav}
              onPress={() => setStepIndex((value) => Math.max(0, value - 1))}
            >
              <Text style={styles.navText}>이전 코스</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.nav}
              onPress={() => setStepIndex((value) => Math.min(steps.length - 1, value + 1))}
            >
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
  sheet: { backgroundColor: '#fff', borderRadius: 18, padding: 16, paddingTop: 44, maxHeight: '92%' as unknown as number },
  kicker: { fontSize: 11, fontWeight: '800', color: '#0F766E' },
  title: { fontSize: 20, fontWeight: '900', color: '#111827', marginTop: 4 },
  lead: { fontSize: 13, color: '#4B5563', marginTop: 4, marginBottom: 10, fontWeight: '600' },
  mapCard: { height: 220, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB' },
  map: { flex: 1 },
  list: { maxHeight: 180, marginTop: 10 },
  card: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  cardOn: { borderColor: '#0F766E', backgroundColor: '#ECFDF5' },
  step: { fontSize: 14, fontWeight: '800', color: '#111827' },
  meta: { fontSize: 12, color: '#4B5563', marginTop: 4, lineHeight: 18 },
  row: { flexDirection: 'row', gap: 8, marginTop: 8 },
  nav: { flex: 1, backgroundColor: '#111827', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  navText: { color: '#fff', fontWeight: '800' },
});
