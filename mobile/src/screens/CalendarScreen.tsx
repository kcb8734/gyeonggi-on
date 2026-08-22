import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { fetchTourFestivals, homeFestivalFromTour } from '../api/tour';
import type { HomeFestival } from '../types/home';
import { addSchedule, rememberFestival, useAppState } from '../stores/appStore';
import { eventColor, overlapsDay, ymd } from '../utils/date';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

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
  const app = useAppState();

  useEffect(() => {
    fetchTourFestivals({ areaCode: '31', month, year }).then((items) => {
      setFestivals(items.map(homeFestivalFromTour));
    });
  }, [month, year]);

  const cells = useMemo(() => monthCells(year, month), [year, month]);
  const colored = useMemo(
    () => festivals.map((item, index) => ({ ...item, color: eventColor(index) })),
    [festivals],
  );

  const dayFestivals = colored.filter((item) => overlapsDay(item.start_date, item.end_date, selectedDay));

  const shiftMonth = (delta: number) => {
    const next = new Date(year, month - 1 + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth() + 1);
    setSelectedDay(ymd(next));
  };

  const openFestival = (festival: HomeFestival) => {
    rememberFestival(festival);
    if (festival.contentId) {
      navigation.navigate('TourDetail', {
        contentId: festival.contentId,
        contentTypeId: festival.contentTypeId,
        tel: festival.tel,
        title: festival.title,
      });
    }
  };

  const saveSchedule = (festival: HomeFestival) => {
    addSchedule(festival);
    Alert.alert('내 일정에 추가', `${festival.title}\n시작일 하루 전 알림을 받도록 담았습니다.`);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => shiftMonth(-1)} style={styles.navBtn}>
          <Text style={styles.navText}>이전</Text>
        </TouchableOpacity>
        <Text style={styles.header}>{year}년 {month}월</Text>
        <TouchableOpacity onPress={() => shiftMonth(1)} style={styles.navBtn}>
          <Text style={styles.navText}>다음</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.legendHint}>시작일~종료일이 색 막대로 이어집니다</Text>

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
          const bars = colored.filter((item) => overlapsDay(item.start_date, item.end_date, key)).slice(0, 3);
          return (
            <TouchableOpacity
              key={key}
              style={[styles.cell, selected && styles.cellSelected]}
              onPress={() => setSelectedDay(key)}
            >
              <Text style={[styles.cellText, selected && styles.cellTextSelected]}>{cell.getDate()}</Text>
              <View style={styles.bars}>
                {bars.map((item) => (
                  <View key={`${key}-${item.id}`} style={[styles.bar, { backgroundColor: item.color }]} />
                ))}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.swatches}>
        {colored.slice(0, 6).map((item) => (
          <View key={item.id} style={styles.swatch}>
            <View style={[styles.swatchDot, { backgroundColor: item.color }]} />
            <Text style={styles.swatchText} numberOfLines={1}>{item.title}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.section}>{selectedDay} 진행 축제</Text>
      {dayFestivals.length === 0 ? (
        <Text style={styles.empty}>선택한 날짜에 진행 중인 축제가 없습니다</Text>
      ) : (
        dayFestivals.map((festival) => (
          <TouchableOpacity key={`day-${festival.id}`} style={styles.card} onPress={() => openFestival(festival)}>
            <View style={[styles.accent, { backgroundColor: festival.color }]} />
            {festival.image_url ? (
              <Image source={{ uri: festival.image_url }} style={styles.thumb} />
            ) : (
              <View style={[styles.thumb, styles.fallback]} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{festival.title}</Text>
              <Text style={styles.meta}>{festival.start_date} ~ {festival.end_date}</Text>
              <Text style={styles.meta}>{festival.location_name}</Text>
              <View style={styles.cardActions}>
                <Text style={styles.tag}>{festival.category}</Text>
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={() => saveSchedule(festival)}
                >
                  <Text style={styles.addText}>
                    {app.schedule.some((item) => item.id === festival.id) ? '일정 담김' : '내 일정에 추가 · 알림 받기'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  header: { fontSize: 20, fontWeight: '800', color: '#111827' },
  legendHint: { fontSize: 12, color: '#6B7280', marginBottom: 10 },
  navBtn: { backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#E5E7EB' },
  navText: { fontSize: 13, fontWeight: '700', color: '#374151' },
  weekRow: { flexDirection: 'row' },
  weekLabel: { flexGrow: 1, flexBasis: 0, textAlign: 'center', fontSize: 12, fontWeight: '700', color: '#6B7280', marginBottom: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', paddingVertical: 6 },
  cell: { flexGrow: 1, flexBasis: '14.28%', minHeight: 52, alignItems: 'center', paddingTop: 6 },
  cellSelected: { backgroundColor: '#111827', borderRadius: 12 },
  cellText: { fontSize: 13, fontWeight: '700', color: '#111827' },
  cellTextSelected: { color: '#fff' },
  bars: { width: '78%', marginTop: 6, gap: 2 },
  bar: { height: 3, borderRadius: 2, width: '100%' },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  swatch: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '48%' },
  swatchDot: { width: 8, height: 8, borderRadius: 4 },
  swatchText: { fontSize: 11, color: '#4B5563', flexShrink: 1 },
  section: { fontSize: 16, fontWeight: '800', marginTop: 18, marginBottom: 8, color: '#111827' },
  empty: { color: '#6B7280', fontSize: 13, marginBottom: 8 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    gap: 10,
    overflow: 'hidden',
  },
  accent: { width: 5, borderRadius: 4 },
  thumb: { width: 64, height: 64, borderRadius: 10, backgroundColor: '#E5E7EB' },
  fallback: { backgroundColor: '#CBD5E1' },
  title: { fontSize: 15, fontWeight: '800' },
  meta: { fontSize: 12, color: '#6B7280', marginTop: 3 },
  tag: { alignSelf: 'flex-start', backgroundColor: '#EEF2FF', color: '#3730A3', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, fontSize: 11, fontWeight: '700', overflow: 'hidden' },
  cardActions: { marginTop: 8, gap: 8 },
  addBtn: { backgroundColor: '#111827', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10, alignSelf: 'flex-start' },
  addText: { color: '#fff', fontSize: 11, fontWeight: '800' },
});
