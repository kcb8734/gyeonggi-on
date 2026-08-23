import React, { useEffect, useMemo, useState } from 'react';
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
import { GYEONGGI_DEFAULT_REGION } from '../constants/map';
import type { HomeFestival, HomePromotion } from '../types/home';
import { MapView, Marker } from '../components/map/CompatibleMap';
import BannerCarousel from '../components/ui/BannerCarousel';
import FestivalGridCard from '../components/ui/FestivalGridCard';
import FestivalDetailPopup from '../components/ui/FestivalDetailPopup';
import { TicketCouponCard, ticketFromPromotion } from '../components/ui/TicketCouponCard';
import IsolatedImeField from '../components/ui/IsolatedImeField';
import FeedRail from '../components/ui/FeedRail';
import LocalityFilter from '../components/ui/LocalityFilter';
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

const DEV_USER_ID = '11111111-1111-4111-8111-111111111111';
const ALL = '전체';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [metro, setMetro] = useState('GYEONGGI');
  const [localityId, setLocalityId] = useState<string | null>(null);
  const [category, setCategory] = useState<string>(ALL);
  const [query, setQuery] = useState('');
  const queryRef = React.useRef('');
  const [toast, setToast] = useState<string | null>(null);
  const [festivals, setFestivals] = useState<HomeFestival[]>([]);
  const [promotions, setPromotions] = useState<HomePromotion[]>([]);
  const [issuingId, setIssuingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<HomeFestival | null>(null);
  const [merchant, setMerchant] = useState<HomePromotion | null>(null);
  const app = useAppState();

  const openFestival = (festival: HomeFestival) => {
    rememberFestival(festival);
    setSelected(festival);
  };

  useEffect(() => {
    const now = new Date();
    Promise.all([
      fetchHomeFeed(metro),
      metro === 'GYEONGGI'
        ? fetchTourFestivals({ areaCode: '31', month: now.getMonth() + 1, year: now.getFullYear() })
        : Promise.resolve([]),
    ]).then(([feed, tourFestivals]) => {
      const extra = app.localPromotions.filter((item) => !feed.promotions.some((promo) => promo.id === item.id));
      setPromotions([...extra, ...feed.promotions.map((item) => ({ ...item, metro }))]);
      if (tourFestivals.length) {
        setFestivals(tourFestivals.map(homeFestivalFromTour));
      } else {
        setFestivals(feed.festivals);
      }
      if (!feed.available) setToast(feed.message ?? COMING_SOON_MESSAGE);
    });
  }, [metro, app.localPromotions]);

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
      return matchCategory && matchQuery;
    });
  }, [locatedFestivals, category, query]);

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
    return promotions.filter((promo) =>
      promo.festival_id === selected.id
      || (promo.festival_title && selected.title.includes(promo.festival_title))
      || (promo.festival_title && promo.festival_title.includes(selected.title.slice(0, 4))),
    );
  }, [promotions, selected]);

  const handleRegion = (id: string, ready: boolean) => {
    setMetro(id);
    setLocalityId(null);
    if (!ready) setToast(COMING_SOON_MESSAGE);
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
          <Text style={styles.brandLead}>지자체 축제와 소상공인 할인을 잇는 온앤온</Text>
        </View>
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
        <LocalityFilter metro={metroInfo} value={localityId} onChange={setLocalityId} />

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
            <View key={promo.id} style={{ width: 260 }}>
              <TicketCouponCard
                compact
                {...ticketFromPromotion(promo, issuingId === promo.id ? '발급 중...' : '상가 보기')}
                onPress={() => openMerchant(promo)}
              />
            </View>
          ))}
        </ScrollView>

        <Text style={styles.section}>축제 현장 피드 올리고 지역화폐 받기</Text>
        <FeedRail onPress={(postId) => navigation.navigate('FeedView', { postId })} />

        <Text style={styles.section}>지역별 축제 리스트</Text>
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
          <Text style={styles.empty}>이 달의 해당 카테고리 축제가 없습니다</Text>
        ) : (
          <View style={styles.grid}>
            {popular.map((festival) => (
              <FestivalGridCard
                key={festival.id}
                festival={festival}
                discountRate={cardDiscount(festival)}
                onPress={() => openFestival(festival)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <FestivalDetailPopup
        festival={selected}
        promotions={relatedPromos.length ? relatedPromos : promotions.slice(0, 2)}
        issuingId={issuingId}
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
  regionRow: { paddingHorizontal: 12, paddingTop: 8, gap: 8 },
  regionTab: {
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingVertical: 8,
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
  empty: { marginHorizontal: 16, marginTop: 12, color: '#6B7280', fontSize: 13 },
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
