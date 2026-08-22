import React, { useEffect, useState } from 'react';
import {
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { fetchTourDetail } from '../api/tour';
import { MapView, Marker } from '../components/map/CompatibleMap';
import type { TourDetail } from '../types/tour';

export default function TourDetailScreen({
  contentId,
  contentTypeId,
}: {
  contentId: string;
  contentTypeId?: string;
}) {
  const [detail, setDetail] = useState<TourDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchTourDetail(contentId, contentTypeId)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch(() => {
        if (!cancelled) setError('상세 정보를 불러오지 못했습니다.');
      });
    return () => {
      cancelled = true;
    };
  }, [contentId, contentTypeId]);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  if (!detail) {
    return (
      <View style={styles.center}>
        <Text style={styles.meta}>관광 정보를 불러오는 중...</Text>
      </View>
    );
  }

  const hero = detail.images[0]?.originUrl ?? detail.firstImage;
  const hasMap = detail.mapX !== 0 && detail.mapY !== 0;

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 32 }}>
      {hero ? (
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
          {(detail.images.length ? detail.images : [{ originUrl: hero }]).map((img) => (
            <Image key={img.originUrl} source={{ uri: img.originUrl }} style={styles.hero} />
          ))}
        </ScrollView>
      ) : (
        <View style={[styles.hero, styles.heroFallback]} />
      )}

      <View style={styles.body}>
        {detail.category ? <Text style={styles.tag}>{detail.category}</Text> : null}
        <Text style={styles.title}>{detail.title}</Text>
        {detail.eventStartDate ? (
          <Text style={styles.meta}>
            {detail.eventStartDate} ~ {detail.eventEndDate ?? detail.eventStartDate}
          </Text>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.label}>주소</Text>
          <Text style={styles.value}>{detail.address || '주소 정보 없음'}</Text>
          {detail.eventPlace ? <Text style={styles.value}>장소 {detail.eventPlace}</Text> : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>이용요금</Text>
          <Text style={styles.value}>{detail.fee || '문의'}</Text>
          {detail.playtime ? (
            <>
              <Text style={[styles.label, { marginTop: 10 }]}>운영시간</Text>
              <Text style={styles.value}>{detail.playtime}</Text>
            </>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>전화번호</Text>
          {detail.tel ? (
            <TouchableOpacity onPress={() => Linking.openURL(`tel:${detail.tel}`)}>
              <Text style={styles.link}>{detail.tel}</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.value}>전화번호 정보 없음</Text>
          )}
        </View>

        {detail.overview ? (
          <View style={styles.card}>
            <Text style={styles.label}>개요</Text>
            <Text style={styles.overview}>{detail.overview}</Text>
          </View>
        ) : null}

        {hasMap ? (
          <View style={styles.mapCard}>
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: detail.mapY,
                longitude: detail.mapX,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              }}
            >
              <Marker
                coordinate={{ latitude: detail.mapY, longitude: detail.mapX }}
                title={detail.title}
                pinColor="red"
              />
            </MapView>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F4F6' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6' },
  error: { color: '#991B1B', fontWeight: '700' },
  hero: { width: 390, height: 220, backgroundColor: '#E5E7EB' },
  heroFallback: { width: '100%' },
  body: { padding: 16, gap: 10 },
  tag: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    color: '#3730A3',
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  title: { fontSize: 22, fontWeight: '800', color: '#111827' },
  meta: { fontSize: 13, color: '#6B7280' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  label: { fontSize: 12, fontWeight: '800', color: '#6B7280', marginBottom: 4 },
  value: { fontSize: 15, color: '#111827', fontWeight: '600' },
  link: { fontSize: 15, color: '#2563EB', fontWeight: '700' },
  overview: { fontSize: 14, lineHeight: 22, color: '#374151' },
  mapCard: {
    height: 200,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  map: { flex: 1 },
});
