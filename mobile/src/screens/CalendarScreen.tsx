import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { fetchHomeFeed } from '../api/home';
import type { HomeFestival } from '../types/home';

export default function CalendarScreen() {
  const [festivals, setFestivals] = useState<HomeFestival[]>([]);

  useEffect(() => {
    fetchHomeFeed('GYEONGGI').then((feed) => setFestivals(feed.festivals));
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.header}>축제 일정</Text>
      {festivals.map((festival) => (
        <View key={festival.id} style={styles.card}>
          <Text style={styles.title}>{festival.title}</Text>
          <Text style={styles.meta}>{festival.start_date} ~ {festival.end_date}</Text>
          <Text style={styles.meta}>{festival.location_name}</Text>
          <Text style={styles.tag}>{festival.category}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },
  header: { fontSize: 22, fontWeight: '800', marginBottom: 12 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  title: { fontSize: 16, fontWeight: '800' },
  meta: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  tag: { marginTop: 8, alignSelf: 'flex-start', backgroundColor: '#EEF2FF', color: '#3730A3', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, fontSize: 11, fontWeight: '700', overflow: 'hidden' },
});
