import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { fetchTourFestivals, homeFestivalFromTour } from '../api/tour';
import type { HomeFestival } from '../types/home';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function ymd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function overlapsDay(festival: HomeFestival, day: string): boolean {
  const start = (festival.start_date ?? '').slice(0, 10);
  const end = (festival.end_date ?? festival.start_date ?? '').slice(0, 10);
  if (!start) return false;
  return start <= day && end >= day;
}

function monthCells(year: number, month: number): Array<Date | null> {
  const first = new Date(year, month - 1, 1);
  const lastDate = new Date(year, month, 0).getDate();
  const cells: Array<Date | null> = Array.from({ length: first.getDay() }, () => null);
  for (let day = 1; day <= lastDate; day += 1) {
    cells.push(new Date(year, month - 1, day));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function CalendarScreen() {
  const navigation = useNavigation<any>();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState(ymd(today));
  const [festivals, setFestivals] = useState<HomeFestival[]>([]);

  useEffect(() => {
    fetchTourFestivals({ areaCode: '31', month, year }).then((items) => {
      setFestivals(items.map(homeFestivalFromTour));
    });
  }, [month, year]);

  const cells = useMemo(() => monthCells(year, month), [year, month]);
  const eventDays = useMemo(() => {
    const set = new Set<string>();
    for (const festival of festivals) {
      const start = new Date(festival.start_date ?? '');
      const end = new Date(festival.end_date ?? festival.start_date ?? '');
      if (Number.isNaN(start.getTime())) continue;
      const cursor = new Date(start);
      const last = Number.isNaN(end.getTime()) ? start : end;
      while (cursor <= last) {
        if (cursor.getFullYear() === year && cursor.getMonth() + 1 === month) {
          set.add(ymd(cursor));
        }
        cursor.setDate(cursor.getDate() + 1);
      }
    }
    return set;
  }, [festivals, month, year]);

  const dayFestivals = festivals.filter((item) => overlapsDay(item, selectedDay));
  const monthFestivals = festivals;

  const shiftMonth = (delta: number) => {
    const next = new Date(year, month - 1 + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth() + 1);
    setSelectedDay(ymd(next));
  };

  const openFestival = (festival: HomeFestival) => {
    if (festival.contentId) {
      navigation.navigate('TourDetail', {
        contentId: festival.contentId,
        contentTypeId: festival.contentTypeId,
      });
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => shiftMonth(-1)} style={styles.navBtn}>
          <Text style={styles.navText}>이전</Text>
        </TouchableOpacity>
        <Text style={styles.header}>{year}년 {month}월 축제 일정</Text>
        <TouchableOpacity onPress={() => shiftMonth(1)} style={styles.navBtn}>
          <Text style={styles.navText}>다음</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAYS.map((day) => (
          <Text key={day} style={styles.weekLabel}>{day}</Text>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((cell, index) => {
          if (!cell) return <View key={`empty-${index}`} style={styles.cell} />;
          const key = ymd(cell);
          const selected = key === selectedDay;
          const hasEvent = eventDays.has(key);
          return (
            <TouchableOpacity
              key={key}
              style={[styles.cell, selected && styles.cellSelected]}
              onPress={() => setSelectedDay(key)}
            >
              <Text style={[styles.cellText, selected && styles.cellTextSelected]}>{cell.getDate()}</Text>
              {hasEvent ? <View style={styles.dot} /> : null}
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.section}>{selectedDay} 일정</Text>
      {dayFestivals.length === 0 ? (
        <Text style={styles.empty}>선택한 날짜에 진행 중인 축제가 없습니다</Text>
      ) : (
        dayFestivals.map((festival) => (
          <TouchableOpacity key={`day-${festival.id}`} style={styles.card} onPress={() => openFestival(festival)}>
            <Text style={styles.title}>{festival.title}</Text>
            <Text style={styles.meta}>{festival.start_date} ~ {festival.end_date}</Text>
            <Text style={styles.meta}>{festival.location_name}</Text>
            <Text style={styles.tag}>{festival.category}</Text>
          </TouchableOpacity>
        ))
      )}

      <Text style={styles.section}>{month}월 전체 축제</Text>
      {monthFestivals.map((festival) => (
        <TouchableOpacity key={festival.id} style={styles.card} onPress={() => openFestival(festival)}>
          <Text style={styles.title}>{festival.title}</Text>
          <Text style={styles.meta}>{festival.start_date} ~ {festival.end_date}</Text>
          <Text style={styles.meta}>{festival.location_name}</Text>
          <Text style={styles.tag}>{festival.category}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  header: { fontSize: 18, fontWeight: '800', color: '#111827' },
  navBtn: { backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#E5E7EB' },
  navText: { fontSize: 13, fontWeight: '700', color: '#374151' },
  weekRow: { flexDirection: 'row' },
  weekLabel: { flexGrow: 1, flexBasis: 0, textAlign: 'center', fontSize: 12, fontWeight: '700', color: '#6B7280', marginBottom: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', paddingVertical: 8 },
  cell: { flexGrow: 1, flexBasis: '14.28%', minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  cellSelected: { backgroundColor: '#111827', borderRadius: 12 },
  cellText: { fontSize: 13, fontWeight: '700', color: '#111827' },
  cellTextSelected: { color: '#fff' },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#E0392A', marginTop: 3 },
  section: { fontSize: 16, fontWeight: '800', marginTop: 18, marginBottom: 8, color: '#111827' },
  empty: { color: '#6B7280', fontSize: 13, marginBottom: 8 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  title: { fontSize: 16, fontWeight: '800' },
  meta: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  tag: { marginTop: 8, alignSelf: 'flex-start', backgroundColor: '#EEF2FF', color: '#3730A3', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, fontSize: 11, fontWeight: '700', overflow: 'hidden' },
});
