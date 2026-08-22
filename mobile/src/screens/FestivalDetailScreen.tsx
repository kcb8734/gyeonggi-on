import React, { useEffect, useState } from 'react';
import {
  Image,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { fetchTourDetail } from '../api/tour';
import { MapView, Marker } from '../components/map/CompatibleMap';
import type { TourDetail } from '../types/tour';
import { formatTel, telHref } from '../utils/phone';

const EMPTY_COPY = {
  overview: '한국관광공사 TourAPI에서 수집한 행사 정보입니다. 상세 개요가 확인되는 대로 자동 반영됩니다.',
  address: '주소 확인 중',
  fee: '현장 문의',
  tel: '전화번호 정보 없음',
};

function directionsUrl(lat: number, lng: number, title: string) {
  const query = encodeURIComponent(`${lat},${lng}(${title})`);
  if (Platform.OS === 'ios') return `maps://?daddr=${lat},${lng}&q=${encodeURIComponent(title)}`;
  if (Platform.OS === 'android') return `geo:${lat},${lng}?q=${query}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

export default function FestivalDetailScreen({
  contentId,
  contentTypeId,
  fallbackTel,
  fallbackTitle,
}: {
  contentId: string;
  contentTypeId?: string;
  fallbackTel?: string;
  fallbackTitle?: string;
}) {
  const [detail, setDetail] = useState<TourDetail | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchTourDetail(contentId, contentTypeId)
      .then((data) => {
        if (!cancelled) {
          setDetail({
            ...data,
            tel: data.tel || fallbackTel,
            title: data.title || fallbackTitle || data.title,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDetail({
            contentId,
            contentTypeId: contentTypeId ?? '15',
            tel: fallbackTel,
            title: fallbackTitle || '축제 상세',
            overview: EMPTY_COPY.overview,
            address: EMPTY_COPY.address,
            fee: EMPTY_COPY.fee,
            mapX: 127.013,
            mapY: 37.287,
            images: [],
            category: '문화/예술',
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [contentId, contentTypeId, fallbackTel, fallbackTitle]);

  if (!detail) {
    return (
      <View style={styles.center}>
        <Text style={styles.meta}>TourAPI 상세 정보를 불러오는 중...</Text>
      </View>
    );
  }

  const hero = detail.images[0]?.originUrl ?? detail.firstImage;
  const hasMap = detail.mapX !== 0 && detail.mapY !== 0;
  const resolvedTel = detail.tel || fallbackTel;
  const callUrl = telHref(resolvedTel);
  const telLabel = formatTel(resolvedTel) || resolvedTel || EMPTY_COPY.tel;
  const overview = detail.overview?.trim() || EMPTY_COPY.overview;
  const fee = detail.fee?.trim() || EMPTY_COPY.fee;
  const address = detail.address?.trim() || EMPTY_COPY.address;
  const slides = detail.images.length ? detail.images : hero ? [{ originUrl: hero }] : [];

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 36 }}>
      {slides.length ? (
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
          {slides.map((img) => (
            <Image key={img.originUrl} source={{ uri: img.originUrl }} style={styles.hero} />
          ))}
        </ScrollView>
      ) : (
        <View style={[styles.hero, styles.heroFallback]}>
          <Text style={styles.heroFallbackText}>대표 이미지 준비 중</Text>
        </View>
      )}

      <View style={styles.body}>
        <Text style={styles.source}>한국관광공사 TourAPI 4.0</Text>
        {detail.category ? <Text style={styles.tag}>{detail.category}</Text> : null}
        <Text style={styles.title}>{detail.title || '축제 상세'}</Text>
        <Text style={styles.meta}>
          {(detail.eventStartDate || '일정 확인 중')} ~ {(detail.eventEndDate || detail.eventStartDate || '')}
        </Text>

        <View style={styles.card}>
          <Text style={styles.label}>상세 개요</Text>
          <Text style={styles.overview}>{overview}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>행사 장소 / 주소</Text>
          <Text style={styles.value}>{address}</Text>
          {detail.eventPlace ? <Text style={styles.value}>장소 {detail.eventPlace}</Text> : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>이용요금</Text>
          <Text style={styles.value}>{fee}</Text>
          {detail.playtime ? (
            <>
              <Text style={[styles.label, { marginTop: 10 }]}>운영시간</Text>
              <Text style={styles.value}>{detail.playtime}</Text>
            </>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>전화번호</Text>
          <Text style={styles.value}>{telLabel}</Text>
          {callUrl ? (
            <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL(callUrl)}>
              <Text style={styles.callText}>전화 걸기 {telLabel}</Text>
            </TouchableOpacity>
          ) : (
            <Text style={[styles.value, { marginTop: 8, color: '#6B7280' }]}>연결 가능한 번호가 없습니다</Text>
          )}
        </View>

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
            <TouchableOpacity
              style={styles.dirBtn}
              onPress={() => Linking.openURL(directionsUrl(detail.mapY, detail.mapX, detail.title))}
            >
              <Text style={styles.dirText}>길찾기</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F4F6' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6' },
  hero: { width: 390, height: 220, backgroundColor: '#E5E7EB' },
  heroFallback: { width: '100%', alignItems: 'center', justifyContent: 'center' },
  heroFallbackText: { color: '#6B7280', fontWeight: '700' },
  body: { padding: 16, gap: 10 },
  source: { fontSize: 11, fontWeight: '800', color: '#2563EB' },
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
  overview: { fontSize: 14, lineHeight: 22, color: '#374151' },
  callBtn: {
    marginTop: 12,
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  callText: { color: '#fff', fontWeight: '800' },
  mapCard: {
    height: 240,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  map: { flex: 1 },
  dirBtn: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dirText: { color: '#fff', fontWeight: '800' },
});
