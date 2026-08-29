import React, { useEffect, useState } from 'react';
import {
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import SafeFestivalImage from '../components/ui/SafeFestivalImage';
import CourseGuideModal from '../components/ui/CourseGuideModal';
import { fetchRecommendedCourse, type FestivalCourse } from '../api/courses';
import { findFallbackFestival } from '../constants/regionTour';
import { festivalImageFor } from '../constants/regionMedia';
import { fetchTourDetail, homeFestivalFromDetail } from '../api/tour';
import { MapView, Marker } from '../components/map/CompatibleMap';
import { isFavorite, toggleFavorite, useAppState } from '../stores/appStore';
import type { TourDetail } from '../types/tour';
import { formatTel, telHref } from '../utils/phone';
import { secureMediaUrl } from '../utils/mediaUrl';

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
  fallbackKind,
  fallbackTel,
  fallbackTitle,
  fallbackCity,
  fallbackAddress,
  fallbackLatitude,
  fallbackLongitude,
  fallbackMetro,
  fallbackImageUrl,
}: {
  contentId: string;
  contentTypeId?: string;
  fallbackKind?: string;
  fallbackTel?: string;
  fallbackTitle?: string;
  fallbackCity?: string;
  fallbackAddress?: string;
  fallbackLatitude?: number;
  fallbackLongitude?: number;
  fallbackMetro?: string;
  fallbackImageUrl?: string;
}) {
  useAppState();
  const { width } = useWindowDimensions();
  const known = findFallbackFestival(contentId, fallbackTitle);
  const [detail, setDetail] = useState<TourDetail | null>(null);
  const [course, setCourse] = useState<FestivalCourse | null>(null);
  const [guideFocus, setGuideFocus] = useState<'all' | '역사체험' | '전통시장 먹거리' | '캠핑장/숙박' | null>(null);
  useEffect(() => {
    let cancelled = false;
    const seed = {
      title: fallbackTitle || known?.title,
      city: fallbackCity || known?.municipality_name || undefined,
      address: fallbackAddress || known?.location_name || undefined,
      metro: fallbackMetro,
      latitude: fallbackLatitude ?? known?.latitude,
      longitude: fallbackLongitude ?? known?.longitude,
      contentTypeId,
      kind: fallbackKind,
    };
    fetchRecommendedCourse(seed).then((data) => {
      if (!cancelled && data) setCourse(data);
    });
    fetchTourDetail(contentId, contentTypeId)
      .then((data) => {
        if (!cancelled) {
          const genericTitle = !data.title || data.title === '축제 상세';
          const suwonDefault = data.mapX === 127.013 && data.mapY === 37.287;
          const mapX = (!suwonDefault && data.mapX) || fallbackLongitude || known?.longitude || data.mapX;
          const mapY = (!suwonDefault && data.mapY) || fallbackLatitude || known?.latitude || data.mapY;
          setDetail({
            ...data,
            tel: data.tel || fallbackTel,
            title: genericTitle ? (fallbackTitle || known?.title || data.title) : data.title,
            overview: data.overview && !data.overview.includes('확인되는 대로')
              ? data.overview
              : (known?.description || data.overview),
            address: (data.address && data.address !== '주소 확인 중')
              ? data.address
              : (fallbackAddress || known?.location_name || data.address),
            mapX,
            mapY,
            firstImage: secureMediaUrl(data.firstImage || fallbackImageUrl || known?.image_url || data.firstImage),
            eventStartDate: data.eventStartDate || known?.start_date,
            eventEndDate: data.eventEndDate || known?.end_date,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          const image = secureMediaUrl(fallbackImageUrl || known?.image_url) || festivalImageFor(fallbackTitle, fallbackAddress, fallbackMetro);
          setDetail({
            contentId,
            contentTypeId: contentTypeId ?? (fallbackKind === 'food' ? '39' : '15'),
            tel: fallbackTel,
            title: fallbackTitle || known?.title || (fallbackKind === 'food' ? '맛집 상세' : '축제 상세'),
            overview: known?.description || (fallbackKind === 'food' || contentTypeId === '39'
              ? '한국관광공사 TourAPI에서 수집한 맛집 정보입니다. 상세 소개가 확인되는 대로 자동 반영됩니다.'
              : EMPTY_COPY.overview),
            address: fallbackAddress || known?.location_name || EMPTY_COPY.address,
            fee: EMPTY_COPY.fee,
            mapX: fallbackLongitude || known?.longitude || 0,
            mapY: fallbackLatitude || known?.latitude || 0,
            images: image ? [{ originUrl: image }] : [],
            firstImage: image,
            category: (known?.category as TourDetail['category']) || (fallbackKind === 'food' || contentTypeId === '39' ? '먹거리' : '문화/예술'),
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [contentId, contentTypeId, fallbackKind, fallbackTel, fallbackTitle, fallbackCity, fallbackAddress, fallbackLatitude, fallbackLongitude, fallbackMetro, fallbackImageUrl, known]);

  useEffect(() => {
    if (!detail?.title) return;
    let cancelled = false;
    fetchRecommendedCourse({
      title: detail.title,
      city: fallbackCity || known?.municipality_name || undefined,
      address: detail.address || fallbackAddress,
      metro: fallbackMetro,
      latitude: detail.mapY || fallbackLatitude,
      longitude: detail.mapX || fallbackLongitude,
      contentTypeId: detail.contentTypeId || contentTypeId,
      kind: fallbackKind,
    }).then((data) => {
      if (!cancelled && data) setCourse(data);
    });
    return () => { cancelled = true; };
  }, [detail?.title, detail?.address, detail?.mapX, detail?.mapY, fallbackCity, fallbackAddress, fallbackLatitude, fallbackLongitude, fallbackMetro, fallbackKind, known, contentTypeId]);

  if (!detail) {
    return (
      <View style={styles.center}>
        <Text style={styles.meta}>TourAPI 상세 정보를 불러오는 중...</Text>
      </View>
    );
  }

  const isRestaurant = detail.contentTypeId === '39' || contentTypeId === '39' || fallbackKind === 'food' || detail.category === '먹거리';
  const favorited = isFavorite(`tour-${detail.contentId}`);
  const fallbackHero = festivalImageFor(detail.title || fallbackTitle, detail.address || fallbackAddress, fallbackMetro);
  const hero = secureMediaUrl(detail.images[0]?.originUrl ?? detail.firstImage) || fallbackHero;
  const hasMap = detail.mapX !== 0 && detail.mapY !== 0;
  const resolvedTel = detail.tel || fallbackTel;
  const callUrl = telHref(resolvedTel);
  const telLabel = formatTel(resolvedTel) || resolvedTel || EMPTY_COPY.tel;
  const overview = detail.overview?.trim() || (
    contentTypeId === '39' || fallbackKind === 'food' || detail.contentTypeId === '39'
      ? '한국관광공사 TourAPI에서 수집한 맛집 정보입니다. 상세 소개가 확인되는 대로 자동 반영됩니다.'
      : EMPTY_COPY.overview
  );
  const fee = detail.fee?.trim() || EMPTY_COPY.fee;
  const address = detail.address?.trim() || EMPTY_COPY.address;
  const slides = (detail.images.length ? detail.images : hero ? [{ originUrl: hero }] : [])
    .map((img) => ({ ...img, originUrl: secureMediaUrl(img.originUrl) || fallbackHero }))
    .filter((img) => img.originUrl);
  const heroSlides = slides.length ? slides : [{ originUrl: fallbackHero }];

  const heroUri = heroSlides[0]?.originUrl || fallbackHero;

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 36 }}>
      <View style={[styles.hero, { width }]}>
        <SafeFestivalImage uri={heroUri} title={detail.title || '대표 이미지 준비 중'} style={styles.heroImage} />
      </View>

      <View style={styles.body}>
        <Text style={styles.source}>한국관광공사 TourAPI 4.0</Text>
        {detail.category ? <Text style={styles.tag}>{detail.category}</Text> : null}
        <Text style={styles.title}>{detail.title || '상세 정보'}</Text>
        {isRestaurant ? null : (
          <Text style={styles.meta}>
            {(detail.eventStartDate || '일정 확인 중')} ~ {(detail.eventEndDate || detail.eventStartDate || '')}
          </Text>
        )}
        <TouchableOpacity
          style={[styles.favBtn, favorited && styles.favBtnOn]}
          onPress={() => toggleFavorite(homeFestivalFromDetail(detail))}
        >
          <Text style={[styles.favText, favorited && styles.favTextOn]}>
            {favorited ? '즐겨찾기 됨' : '즐겨찾기'}
          </Text>
        </TouchableOpacity>

        <View style={styles.card}>
          <Text style={styles.label}>상세 개요</Text>
          <Text style={styles.overview}>{overview}</Text>
        </View>

        {course ? (
          <View style={styles.card}>
            <Text style={styles.label}>On&On+ 추천 코스</Text>
            <Text style={styles.value}>{course.course_title}</Text>
            <Text style={styles.overview}>대상 {course.target_audience} · {course.total_distance}</Text>
            {course.itinerary.map((step) => (
              <Text key={step.step} style={styles.overview}>
                {step.step}. [{step.category}] {step.place_name} · {step.estimated_time}{'\n'}{step.description}
              </Text>
            ))}
            <TouchableOpacity style={styles.courseBtn} onPress={() => setGuideFocus('all')}>
              <Text style={styles.courseBtnText}>ON&ON+ 추천코스 살펴보기</Text>
            </TouchableOpacity>
            <View style={styles.courseRow}>
              <TouchableOpacity style={styles.courseGhost} onPress={() => setGuideFocus('전통시장 먹거리')}>
                <Text style={styles.courseGhostText}>전통시장 먹거리 살펴보기</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.courseGhost} onPress={() => setGuideFocus('캠핑장/숙박')}>
                <Text style={styles.courseGhostText}>캠핑장 숙박 살펴보기</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.overview}>{course.local_benefit_tip}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.label}>{isRestaurant ? '주소' : '행사 장소 / 주소'}</Text>
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
              key={`${detail.mapY}-${detail.mapX}`}
              style={styles.map}
              initialRegion={{
                latitude: detail.mapY,
                longitude: detail.mapX,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              }}
              region={{
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
      <CourseGuideModal
        visible={Boolean(guideFocus)}
        course={course}
        focus={guideFocus ?? 'all'}
        onClose={() => setGuideFocus(null)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F4F6' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6' },
  hero: { width: 360, height: 220, backgroundColor: '#93C5FD', overflow: 'hidden' },
  heroImage: { width: '100%', height: '100%' },
  heroFallback: { width: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1E6FEA' },
  heroFallbackText: { color: '#fff', fontWeight: '800', fontSize: 16, paddingHorizontal: 24, textAlign: 'center' },
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
  favBtn: {
    alignSelf: 'flex-start',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  favBtnOn: { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' },
  favText: { fontSize: 14, fontWeight: '700', color: '#111827' },
  favTextOn: { color: '#92400E' },
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
  courseBtn: {
    marginTop: 12,
    backgroundColor: '#0F766E',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  courseBtnText: { color: '#fff', fontWeight: '800' },
  courseRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  courseGhost: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#0F766E',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
  },
  courseGhostText: { color: '#065F46', fontWeight: '800', fontSize: 12, textAlign: 'center' },
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
