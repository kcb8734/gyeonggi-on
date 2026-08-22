import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchHomeFeed } from '../api/home';
import { fetchTourFestivals, homeFestivalFromTour } from '../api/tour';
import { issueCoupon } from '../api/coupons';
import { COMING_SOON_MESSAGE, FESTIVAL_CATEGORIES, METRO_REGIONS } from '../constants/regions';
import { GYEONGGI_DEFAULT_REGION } from '../constants/map';
import type { HomeFestival, HomePromotion } from '../types/home';
import { MapView, Marker } from '../components/map/CompatibleMap';

const DEV_USER_ID = '11111111-1111-4111-8111-111111111111';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [metro, setMetro] = useState('GYEONGGI');
  const [category, setCategory] = useState<string>(FESTIVAL_CATEGORIES[0].id);
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [festivals, setFestivals] = useState<HomeFestival[]>([]);
  const [promotions, setPromotions] = useState<HomePromotion[]>([]);
  const [issuingId, setIssuingId] = useState<string | null>(null);

  const openFestival = (festival: HomeFestival) => {
    if (festival.contentId) {
      navigation.navigate('TourDetail', {
        contentId: festival.contentId,
        contentTypeId: festival.contentTypeId,
      });
      return;
    }
    navigation.navigate('Nearby', { festivalId: festival.id });
  };

  useEffect(() => {
    const now = new Date();
    Promise.all([
      fetchHomeFeed(metro),
      metro === 'GYEONGGI'
        ? fetchTourFestivals({ areaCode: '31', month: now.getMonth() + 1, year: now.getFullYear() })
        : Promise.resolve([]),
    ]).then(([feed, tourFestivals]) => {
      setPromotions(feed.promotions);
      if (tourFestivals.length) {
        setFestivals(tourFestivals.map(homeFestivalFromTour));
      } else {
        setFestivals(feed.festivals);
      }
      if (!feed.available) setToast(feed.message ?? COMING_SOON_MESSAGE);
    });
  }, [metro]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(timer);
  }, [toast]);

  const filteredPromotions = useMemo(() => {
    const q = query.trim();
    if (!q) return promotions;
    return promotions.filter((item) =>
      `${item.festival_title} ${item.business_name} ${item.title}`.includes(q),
    );
  }, [promotions, query]);

  const banner = useMemo(
    () => festivals.filter((item) => item.image_url).slice(0, 5),
    [festivals],
  );

  const popular = useMemo(() => {
    const q = query.trim();
    return festivals.filter((item) => {
      const matchCategory = item.category === category;
      const matchQuery = !q || `${item.title} ${item.location_name}`.includes(q);
      return matchCategory && matchQuery;
    });
  }, [festivals, category, query]);

  const handleRegion = (id: string, ready: boolean) => {
    if (!ready) {
      setToast(COMING_SOON_MESSAGE);
      return;
    }
    setMetro(id);
  };

  const handleIssue = async (promotion: HomePromotion) => {
    setIssuingId(promotion.id);
    try {
      const code = await issueCoupon(DEV_USER_ID, promotion.id);
      Alert.alert('쿠폰 발급', `QR 코드가 발급되었습니다.\n${code}`);
    } catch (err: any) {
      Alert.alert('발급 실패', err?.response?.data?.message ?? '쿠폰을 발급하지 못했습니다.');
    } finally {
      setIssuingId(null);
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 + insets.bottom }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.regionRow}>
          {METRO_REGIONS.map((region) => {
            const active = metro === region.id;
            return (
              <TouchableOpacity
                key={region.id}
                style={[styles.regionTab, active && styles.regionTabActive]}
                onPress={() => handleRegion(region.id, region.ready)}
              >
                <Text style={[styles.regionText, active && styles.regionTextActive]}>{region.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.searchWrap}>
          <TextInput
            style={styles.search}
            placeholder="축제 / 장소 / 제휴상가를 검색하세요"
            value={query}
            onChangeText={setQuery}
          />
        </View>

        {banner.length ? (
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.bannerRow}>
            {banner.map((festival) => (
              <TouchableOpacity key={`banner-${festival.id}`} activeOpacity={0.92} onPress={() => openFestival(festival)}>
                <Image source={{ uri: festival.image_url ?? undefined }} style={styles.banner} />
                <View style={styles.bannerCaption}>
                  <Text style={styles.bannerTitle}>{festival.title}</Text>
                  <Text style={styles.bannerMeta}>
                    {festival.start_date} ~ {festival.end_date}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : null}

        <TouchableOpacity activeOpacity={0.95} onPress={() => navigation.navigate('Nearby')} style={styles.mapCard}>
          <MapView
            style={styles.map}
            initialRegion={GYEONGGI_DEFAULT_REGION}
            pointerEvents={Platform.OS === 'web' ? 'auto' : 'none'}
          >
            {festivals.map((festival) => (
              <Marker
                key={festival.id}
                coordinate={{ latitude: festival.latitude, longitude: festival.longitude }}
                pinColor="red"
                title={festival.title}
              />
            ))}
          </MapView>
          <View style={styles.mapHint}>
            <Text style={styles.mapHintText}>내 주변 축제 지도 · 탭하면 크게 보기</Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.section}>선택 지역 할인쿠폰</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel}>
          {filteredPromotions.map((promo) => (
            <View key={promo.id} style={styles.couponCard}>
              <Text style={styles.couponFestival}>{promo.festival_title ?? '상가 자체 쿠폰'}</Text>
              <Text style={styles.couponShop}>{promo.business_name}</Text>
              <Text style={styles.couponRate}>
                점주 {promo.merchant_discount_rate}% + 지자체 {promo.gov_matching_rate}% = 총 {promo.total_discount_rate}%
              </Text>
              <Text style={styles.couponMeta}>잔여 {promo.remaining_quantity.toLocaleString()}장</Text>
              {promo.funding_type === 'MERCHANT_ONLY' ? (
                <Text style={styles.selfTag}>상가 자체 할인</Text>
              ) : null}
              <TouchableOpacity style={styles.issueBtn} onPress={() => handleIssue(promo)} disabled={issuingId === promo.id}>
                <Text style={styles.issueText}>{issuingId === promo.id ? '발급 중...' : '쿠폰 발급'}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>

        <Text style={styles.section}>현재 인기 축제</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
          {FESTIVAL_CATEGORIES.map((item) => {
            const active = category === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.catTab, active && styles.catTabActive]}
                onPress={() => setCategory(item.id)}
              >
                <Text style={styles.catIcon}>{item.icon}</Text>
                <Text style={[styles.catText, active && styles.catTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {popular.length === 0 ? (
          <Text style={styles.empty}>이 달의 해당 카테고리 축제가 없습니다</Text>
        ) : null}
        {popular.map((festival) => (
          <TouchableOpacity
            key={festival.id}
            style={styles.festCard}
            onPress={() => openFestival(festival)}
          >
            {festival.image_url ? (
              <Image source={{ uri: festival.image_url }} style={styles.festImage} />
            ) : (
              <View style={[styles.festImage, styles.festImageFallback]} />
            )}
            <View style={styles.festBody}>
              <View style={styles.festTitleRow}>
                <Text style={styles.festTitle}>{festival.title}</Text>
                {festival.is_trending ? <Text style={styles.trend}>Trending</Text> : null}
              </View>
              <Text style={styles.festMeta}>
                {festival.start_date} ~ {festival.end_date}
              </Text>
              <Text style={styles.festMeta}>{festival.location_name}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {toast ? (
        <View style={[styles.toast, { top: insets.top + 56 }]}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F4F6' },
  regionRow: { paddingHorizontal: 12, paddingTop: 12, gap: 8 },
  regionTab: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  regionTabActive: { backgroundColor: '#111827', borderColor: '#111827' },
  regionText: { fontSize: 13, fontWeight: '700', color: '#374151' },
  regionTextActive: { color: '#fff' },
  searchWrap: { paddingHorizontal: 16, marginTop: 12 },
  search: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    fontSize: 14,
  },
  bannerRow: { marginTop: 12 },
  banner: { width: 390, height: 180, backgroundColor: '#E5E7EB' },
  bannerCaption: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 12,
    backgroundColor: 'rgba(17,24,39,0.7)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bannerTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  bannerMeta: { color: '#E5E7EB', fontSize: 12, marginTop: 2 },
  empty: { marginHorizontal: 16, marginTop: 12, color: '#6B7280', fontSize: 13 },
  mapCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    overflow: 'hidden',
    height: 180,
    backgroundColor: '#D1D5DB',
  },
  map: { flex: 1 },
  mapHint: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(17,24,39,0.75)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  mapHintText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  section: { fontSize: 17, fontWeight: '800', marginTop: 20, marginHorizontal: 16, color: '#111827' },
  carousel: { paddingHorizontal: 16, paddingTop: 10, gap: 10 },
  couponCard: {
    width: 240,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  couponFestival: { fontSize: 13, fontWeight: '700', color: '#2D6CDF' },
  couponShop: { fontSize: 16, fontWeight: '800', marginTop: 4 },
  couponRate: { fontSize: 12, color: '#B4530A', fontWeight: '700', marginTop: 8 },
  couponMeta: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  selfTag: { marginTop: 6, fontSize: 11, fontWeight: '700', color: '#047857' },
  issueBtn: { backgroundColor: '#2D6CDF', borderRadius: 10, paddingVertical: 10, marginTop: 12, alignItems: 'center' },
  issueText: { color: '#fff', fontWeight: '700' },
  catRow: { paddingHorizontal: 16, paddingTop: 10, gap: 8 },
  catTab: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minWidth: 72,
  },
  catTabActive: { backgroundColor: '#111827', borderColor: '#111827' },
  catIcon: { fontSize: 16 },
  catText: { fontSize: 11, fontWeight: '700', color: '#374151', marginTop: 2 },
  catTextActive: { color: '#fff' },
  festCard: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  festImage: { width: '100%', height: 140, backgroundColor: '#E5E7EB' },
  festImageFallback: { backgroundColor: '#CBD5E1' },
  festBody: { padding: 12 },
  festTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  festTitle: { fontSize: 16, fontWeight: '800', flex: 1 },
  trend: {
    backgroundColor: '#FEE2E2',
    color: '#B91C1C',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
  },
  festMeta: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  toastText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
