import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { HomeFestival } from '../../types/home';
import { festivalImageFor } from '../../constants/regionMedia';
import { ddayLabel } from '../../utils/date';

interface Props {
  festival: HomeFestival;
  discountRate?: number;
  onPress: () => void;
}

export default function FestivalGridCard({ festival, discountRate, onPress }: Props) {
  const dday = ddayLabel(festival.start_date, festival.end_date);
  const imageUrl = festival.image_url || festivalImageFor(festival.title, festival.location_name);
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={onPress}>
      <View>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.fallback]} />
        )}
        {dday ? (
          <View style={[styles.dday, dday === '진행중' && styles.ddayLive, dday === '종료' && styles.ddayDone]}>
            <Text style={styles.ddayText}>{dday}</Text>
          </View>
        ) : null}
        {discountRate ? (
          <View style={styles.deal}>
            <Text style={styles.dealText}>최대 {discountRate}%</Text>
          </View>
        ) : null}
        <View style={styles.tour}>
          <Text style={styles.tourText}>TourAPI 4.0</Text>
        </View>
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>{festival.title}</Text>
        <Text style={styles.place} numberOfLines={1}>{festival.location_name ?? '장소 미정'}</Text>
        <Text style={styles.cat}>{festival.category ?? '축제'}{festival.tel ? ` · ${festival.tel}` : ''}</Text>
        {festival.fee ? <Text style={styles.fee} numberOfLines={1}>{festival.fee}</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexBasis: '48%',
    flexGrow: 1,
    maxWidth: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  image: { width: '100%', height: 110, backgroundColor: '#E5E7EB' },
  fallback: { backgroundColor: '#CBD5E1' },
  dday: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  ddayLive: { backgroundColor: '#059669' },
  ddayDone: { backgroundColor: '#6B7280' },
  ddayText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  deal: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#E0392A',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  dealText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  tour: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#1D4ED8',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  tourText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  body: { padding: 10 },
  title: { fontSize: 13, fontWeight: '800', color: '#111827', minHeight: 34 },
  place: { fontSize: 11, color: '#6B7280', marginTop: 4 },
  cat: { fontSize: 10, color: '#2563EB', fontWeight: '700', marginTop: 4 },
  fee: { fontSize: 10, color: '#B4530A', fontWeight: '700', marginTop: 4 },
});
