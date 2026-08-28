import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import {
  listCenterCourses,
  subscribeCenterCourses,
  type CenterLocalCourse,
} from '../../constants/centerCourses';
import { fetchCenterCourses } from '../../api/centers';

const LABELS = [
  ['historyCourse', '역사 체험'] as const,
  ['marketFoodCourse', '전통시장 먹거리'] as const,
  ['mainAxis', '메인 축'] as const,
  ['campingAccommodation', '캠핑·숙박'] as const,
];

export default function CenterLocalCourseBoard({
  regionId,
  metro,
  flush,
}: {
  regionId?: string | null;
  metro?: string;
  flush?: boolean;
}) {
  const [, setTick] = useState(0);

  useEffect(() => subscribeCenterCourses(() => setTick((value) => value + 1)), []);
  useEffect(() => {
    if (!regionId && !metro) return;
    fetchCenterCourses({ regionId: regionId || undefined, metro }).catch(() => undefined);
  }, [regionId, metro]);

  const course: CenterLocalCourse | undefined = regionId
    ? listCenterCourses(regionId, metro)[0]
    : undefined;
  if (!course) return null;

  return (
    <View style={[styles.wrap, flush && styles.flush]}>
      <Text style={styles.kicker}>지역 센터장 추천 코스</Text>
      <Text style={styles.title}>{course.title}</Text>
      {course.description ? <Text style={styles.lead}>{course.description}</Text> : null}
      <View style={styles.grid}>
        {LABELS.map(([key, label]) => {
          const stop = course[key];
          return (
            <View key={key} style={styles.card}>
              <Text style={styles.cat}>{label}</Text>
              <Text style={styles.name}>{stop.name || '준비 중'}</Text>
              {stop.description ? <Text style={styles.body}>{stop.description}</Text> : null}
            </View>
          );
        })}
      </View>
      {course.images[0] ? <Image source={{ uri: course.images[0] }} style={styles.photo} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: 16, marginTop: 12, marginBottom: 4 },
  flush: { marginHorizontal: 0, marginTop: 0, marginBottom: 10 },
  kicker: { color: '#1D4ED8', fontSize: 11, fontWeight: '800' },
  title: { fontSize: 16, fontWeight: '800', color: '#111827', marginTop: 4 },
  lead: { fontSize: 13, color: '#4B5563', marginTop: 4, lineHeight: 19 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  card: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cat: { fontSize: 11, fontWeight: '800', color: '#1D4ED8' },
  name: { fontSize: 14, fontWeight: '800', color: '#111827', marginTop: 4 },
  body: { fontSize: 12, color: '#4B5563', marginTop: 6, lineHeight: 18 },
  photo: { width: '100%', height: 140, borderRadius: 14, marginTop: 10, backgroundColor: '#E5E7EB' },
});
