import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchListedFestivals } from '../api/festivals';
import { fetchHomeFeed } from '../api/home';
import { fetchTourFestivals, homeFestivalFromTour } from '../api/tour';
import { issueCoupon } from '../api/coupons';
import {
  COMING_SOON_MESSAGE,
  FESTIVAL_CATEGORIES,
  METRO_REGIONS,
  getLocalities,
  localityMatches,
} from '../constants/regions';
import { regionById, withFestivalImage } from '../constants/regionTour';
import { setRegion, useSelectedRegionPreset } from '../stores/regionStore';
import type { HomeFestival, HomePromotion } from '../types/home';
import { festivalHasSampleCoupon } from '../utils/festivalCoupon';
import { MapView, Marker } from '../components/map/CompatibleMap';
import BannerCarousel from '../components/ui/BannerCarousel';
import FestivalGridCard from '../components/ui/FestivalGridCard';
import FestivalDetailPopup from '../components/ui/FestivalDetailPopup';
import { TicketCouponCard, ticketFromPromotion } from '../components/ui/TicketCouponCard';
import IsolatedImeField from '../components/ui/IsolatedImeField';
import FeedRail from '../components/ui/FeedRail';
import LocalityFilter from '../components/ui/LocalityFilter';
import CenterLocalCourseBoard from '../components/ui/CenterLocalCourseBoard';
import MerchantDetailModal from '../components/ui/MerchantDetailModal';
import {
  addSchedule,
  addWalletCoupon,
  promotionToWallet,
  rememberFestival,
  toggleFavorite,
  useAppState,
} from '../stores/appStore';
import { getFeedPosts, getMyFeedPosts } from '../stores/feedStore';
import { validLatLng } from '../utils/mapCamera';
import { ddayLabel } from '../utils/date';

const DEV_USER_ID = '11111111-1111-4111-8111-111111111111';
const ALL = '전체';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const selectedPreset = useSelectedRegionPreset();
  const metro = selectedPreset.id;
  const mapRef = useRef<React.ElementRef<typeof MapView>>(null);
  const [localityId, setLocalityId] = useState<string | null>(null);
  const [category, setCategory] = useState<string>(ALL);
  const [query, setQuery] = useState('');
  const queryRef = React.useRef('');
  const [toast, setToast] = useState<string | null>(null);
  const [festivals, setFestivals] = useState<HomeFestival[]>([]);
  const [promotions, setPromotions] = useState<HomePromotion[]>([]);
  const [issuingId, setIssuingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<HomeFestival | null>(null);
  const [popupFocus, setPopupFocus] = useState<'info' | 'coupon'>('info');
  const [merchant, setMerchant] = useState<HomePromotion | null>(null);
  const [hideEnded, setHideEnded] = useState(false);
  const app = useAppState();

  const openFestival = (festival: HomeFestival, focus: 'info' | 'coupon' = 'info') => {
    rememberFestival(festival);
    setPopupFocus(focus);
    setSelected(festival);
  };

  useEffect(() => {
    const now = new Date();
    Promise.all([
      fetchHomeFeed(metro),
      metro === 'GYEONGGI' ? fetchListedFestivals() : Promise.resolve([]),
      fetchTourFestivals({ areaCode: selectedPreset.code, month: now.getMonth() + 1, year: now.getFullYear() }),
    ]).then(([feed, listed, tourFestivals]) => {
      const extra = app.localPromotions.filter((item) =>
        (!item.metro || item.metro === metro)
        && !feed.promotions.some((promo) => promo.id === item.id),
      );
      setPromotions([...extra, ...feed.promotions.map((item) => ({
        ...item,
        metro: item.metro ?? metro,
        coupon_type: item.coupon_type ?? (item.funding_type === 'MERCHANT_ONLY' ? 'SELF' : 'OFFICIAL'),
        total_discount_rate: item.total_discount_rate
          ?? ((item.merchant_discount_rate ?? 0) + (item.gov_matching_rate ?? 0)),
      }))]);
      const incoming = listed.length
        ? listed
        : (tourFestivals.length ? tourFestivals.map(homeFestivalFromTour) : feed.festivals);
      const extras = app.localFestivals.filter((item) => !incoming.some((festival) => festival.id === item.id));
      setFestivals([...extras, ...incoming].map((item) => withFestivalImage(item, metro)));
      if (!feed.available) setToast(feed.message ?? COMING_SOON_MESSAGE);
    });
  }, [metro, selectedPreset.code, app.localPromotions, app.localFestivals]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(timer);
  }, [toast]);

  const metroInfo = METRO_REGIONS.find((item) => item.id === metro) ?? METRO_REGIONS[0];
  const locality = getLocalities(metro).find((item) => item.id === localityId) ?? null;

  const locatedFestivals = useMemo(
    () => festivals.filter((item) =>
      localityMatches(`${item.title} ${item.location_name ?? ''} ${item.municipality_name ?? ''}`, locality),
    ),
    [festivals, locality],
  );

  const filteredPromotions = useMemo(() => {
    const q = query.trim();
    return promotions.filter((item) => {
      const hay = `${item.festival_title ?? ''} ${item.business_name ?? ''} ${item.title}`;
      return (!q || hay.includes(q)) && localityMatches(hay, locality);
    });
  }, [promotions, query, locality]);

  const banner = useMemo(
    () => locatedFestivals.filter((item) => item.image_url).slice(0, 6),
    [locatedFestivals],
  );

  const popular = useMemo(() => {
    const q = query.trim();
    return locatedFestivals.filter((item) => {
      const matchCategory = category === ALL || item.category === category;
      const matchQuery = !q || `${item.title} ${item.location_name}`.includes(q);
      const matchEnded = !hideEnded || ddayLabel(item.start_date, item.end_date) !== '종료';
      return matchCategory && matchQuery && matchEnded;
    });
  }, [locatedFestivals, category, query, hideEnded]);

  const mapPins = useMemo(
    () => locatedFestivals.filter((item) => validLatLng(item.latitude, item.longitude)),
    [locatedFestivals],
  );

  const homeRegion = useMemo(() => ({
    latitude: selectedPreset.latitude,
    longitude: selectedPreset.longitude,
    latitudeDelta: selectedPreset.latitudeDelta,
    longitudeDelta: selectedPreset.longitudeDelta,
  }), [selectedPreset.latitude, selectedPreset.longitude, selectedPreset.latitudeDelta, selectedPreset.longitudeDelta]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapPins.length > 1) {
        mapRef.current?.fitToCoordinates(
          mapPins.map((item) => ({ latitude: item.latitude, longitude: item.longitude })),
          { edgePadding: { top: 28, right: 28, bottom: 28, left: 28 } },
        );
        return;
      }
      if (mapPins.length === 1) {
        mapRef.current?.animateToRegion({
          latitude: mapPins[0].latitude,
          longitude: mapPins[0].longitude,
          latitudeDelta: 0.25,
          longitudeDelta: 0.25,
        });
        return;
      }
      mapRef.current?.animateToRegion(homeRegion);
    }, 80);
    return () => clearTimeout(timer);
  }, [metro, localityId, mapPins, homeRegion]);

  const discountByFestival = useMemo(() => {
    const map = new Map<string, number>();
    for (const promo of promotions) {
      const key = promo.festival_id ?? promo.festival_title ?? '';
      const current = map.get(key) ?? 0;
      if (promo.total_discount_rate > current) map.set(key, promo.total_discount_rate);
    }
    return map;
  }, [promotions]);

  const relatedPromos = useMemo(() => {
    if (!selected) return [];
    return promotions.filter((promo) => festivalHasSampleCoupon(selected, [promo]));
  }, [promotions, selected]);

  const handleRegion = (id: string) => {
    const preset = regionById(id);
    setRegion({ code: preset.code, name: preset.name, id: preset.id, label: preset.label });
    setLocalityId(null);
  };

  const handleIssue = async (promotion: HomePromotion) => {
    setIssuingId(promotion.id);
    try {
      const code = await issueCoupon(DEV_USER_ID, promotion.id);
      addWalletCoupon(promotionToWallet(promotion, code, proofForPromotion(promotion)));
      Alert.alert('쿠폰 발급', `쿠폰함에 담겼습니다.\n${code}`);
    } catch (err: any) {
      const previewCode = `GGON-${promotion.id.slice(-4).toUpperCase()}`;
      addWalletCoupon(promotionToWallet(promotion, previewCode, proofForPromotion(promotion)));
      Alert.alert('미리보기 발급', `백엔드 연결 전 미리보기 쿠폰을 담았습니다.\n${previewCode}`);
    } finally {
      setIssuingId(null);
      setMerchant(null);
    }
  };

  const openMerchant = (promo: HomePromotion) => setMerchant(promo);

  const cardDiscount = (festival: HomeFestival) =>
    discountByFestival.get(festival.id)
    ?? [...discountByFestival.entries()].find(([key]) => key && festival.title.includes(key))?.[1];

  function proofForPromotion(promo: HomePromotion): string | undefined {
    const feeds = [...getMyFeedPosts(), ...getFeedPosts()];
    const match = feeds.find((item) =>
      (promo.festival_title && item.festival && item.festival.includes(promo.festival_title.slice(0, 4)))
      || (promo.festival_id && item.festivalId === promo.festival_id),
    );
    return match?.imageUrl ?? promo.exterior_image_url ?? undefined;
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: 28 + insets.bottom }}>
        <View style={styles.brandBar}>
          <Text style={styles.brandLead}>지자체 축제와 소상공인 상생을 잇는 온앤온+</Text>
          <TouchableOpacity style={styles.centerCta} onPress={() => navigation.navigate('CenterDirectors', { tab: 'status' })}>
            <Text style={styles.centerCtaText}>지역 센터장 선정 현황 · 지원하기</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.regionRow}>
          {METRO_REGIONS.map((region) => {
            const active = metro === region.id;
            return (
              <TouchableOpacity
                key={region.id}
                style={[styles.regionTab, active && styles.regionTabActive]}
                onPress={() => handleRegion(region.id)}
              >
                <Text style={[styles.regionText, active && styles.regionTextActive]}>{region.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <LocalityFilter metro={metroInfo} value={localityId} onChange={setLocalityId} />
        <CenterLocalCourseBoard regionId={locality?.label} metro={metro} />

        <View style={styles.searchWrap}>
          <IsolatedImeField
            valueRef={queryRef}
            placeholder="축제 / 장소 / 제휴상가를 검색하세요"
            onLiveChange={setQuery}
          />
        </View>

        <BannerCarousel items={banner} onPress={openFestival} />

        <TouchableOpacity activeOpacity={0.95} onPress={() => navigation.navigate('Nearby')} style={styles.mapCard}>
          <MapView
            key={metro}
            ref={mapRef}
            style={styles.map}
            initialRegion={homeRegion}
            region={homeRegion}
            pointerEvents={Platform.OS === 'web' ? 'auto' : 'none'}
          >
            {mapPins.map((festival) => (
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
          {filteredPromotions.length === 0 ? (
            <Text style={styles.empty}>선택하신 권역에 등록된 쿠폰이 없습니다.</Text>
          ) : filteredPromotions.map((promo) => (
            <View key={promo.id} style={{ width: 280 }}>
              <TicketCouponCard
                compact
                {...ticketFromPromotion(promo, issuingId === promo.id ? '발급 중...' : '상가 보기')}
                onPress={() => openMerchant(promo)}
              />
            </View>
          ))}
        </ScrollView>

        <Text style={styles.section}>축제 현장 피드 올리고 지역화폐 받기</Text>
        <FeedRail metro={metro} onPress={(postId) => navigation.navigate('FeedView', { postId })} />

        <View style={styles.sectionRow}>
          <Text style={[styles.section, styles.sectionInRow]}>지역별 축제 리스트</Text>
          <TouchableOpacity
            style={[styles.hideEnded, hideEnded && styles.hideEndedOn]}
            onPress={() => setHideEnded((value) => !value)}
          >
            <Text style={[styles.hideEndedText, hideEnded && styles.hideEndedTextOn]}>
              {hideEnded ? '종료 축제 표시' : '종료 축제 숨기기'}
            </Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catBar}
        >
          {[{ id: ALL, label: ALL }, ...FESTIVAL_CATEGORIES].map((item) => {
            const active = category === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.catTab, active && styles.catTabActive]}
                onPress={() => setCategory(item.id)}
              >
                <Text style={[styles.catText, active && styles.catTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {popular.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.empty}>
              {locatedFestivals.length === 0
                ? '선택하신 권역에 등록된 축제가 없습니다. 다른 권역을 선택해보세요'
                : hideEnded
                  ? '진행 중이거나 예정된 축제가 없습니다. 종료 축제를 다시 표시해 보세요'
                  : '이 달의 해당 카테고리 축제가 없습니다'}
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {popular.map((festival) => {
              const sampleCoupon = festivalHasSampleCoupon(festival, promotions);
              return (
              <FestivalGridCard
                key={festival.id}
                festival={festival}
                discountRate={sampleCoupon ? cardDiscount(festival) : undefined}
                hasCoupon={sampleCoupon}
                onPress={() => openFestival(festival)}
                onCouponPress={() => openFestival(festival, 'coupon')}
              />
              );
            })}
          </View>
        )}
      </ScrollView>

      <FestivalDetailPopup
        festival={selected}
        promotions={relatedPromos}
        issuingId={issuingId}
        initialFocus={popupFocus}
        onClose={() => setSelected(null)}
        onFavorite={() => { if (selected) toggleFavorite(selected); setToast('즐겨찾기를 업데이트했습니다'); }}
        onSchedule={() => { if (selected) addSchedule(selected); setToast('시작일 하루 전 알림을 받도록 일정을 담았습니다'); }}
        onIssue={openMerchant}
        onOpenDetail={() => {
          if (!selected) return;
          const festival = selected;
          setSelected(null);
          if (festival.contentId) {
            navigation.navigate('TourDetail', {
              contentId: festival.contentId,
              contentTypeId: festival.contentTypeId,
              tel: festival.tel,
              title: festival.title,
              city: festival.municipality_name ?? undefined,
              address: festival.location_name ?? undefined,
              latitude: festival.latitude,
              longitude: festival.longitude,
              metro,
              imageUrl: festival.image_url ?? undefined,
            });
          } else {
            navigation.navigate('Nearby', { festivalId: festival.id });
          }
        }}
      />

      <MerchantDetailModal
        promotion={merchant}
        issuing={issuingId === merchant?.id}
        onClose={() => setMerchant(null)}
        onDownload={handleIssue}
      />

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
  brandBar: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 2 },
  brandLead: { fontSize: 13, color: '#374151', fontWeight: '600' },
  centerCta: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: '#0F766E',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  centerCtaText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  regionRow: { paddingHorizontal: 12, paddingTop: 8, gap: 8 },
  regionTab: {
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    paddingHorizontal: 13,
    height: 36,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  regionTabActive: { backgroundColor: '#111827', borderColor: '#111827' },
  regionText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  regionTextActive: { color: '#fff', fontWeight: '700' },
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
  empty: { marginHorizontal: 16, marginTop: 12, color: '#6B7280', fontSize: 13, lineHeight: 20, fontWeight: '600' },
  emptyBox: { marginHorizontal: 16, marginTop: 8, backgroundColor: '#F3F4F6', borderRadius: 12, paddingVertical: 8 },
  mapCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    overflow: 'hidden',
    height: 160,
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
  sectionRow: {
    marginTop: 20,
    marginHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  sectionInRow: { marginTop: 0, marginHorizontal: 0, flex: 1 },
  hideEnded: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  hideEndedOn: { backgroundColor: '#111827', borderColor: '#111827' },
  hideEndedText: { fontSize: 11, fontWeight: '800', color: '#374151' },
  hideEndedTextOn: { color: '#fff' },
  carousel: { paddingHorizontal: 16, paddingTop: 10, gap: 10 },
  catBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingRight: 20,
    paddingVertical: 6,
    marginTop: 8,
    gap: 8,
    alignItems: 'center',
  },
  catTab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
  },
  catTabActive: { backgroundColor: '#111827' },
  catText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  catTextActive: { fontWeight: '700', color: '#fff' },
  grid: {
    paddingHorizontal: 16,
    paddingTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
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
