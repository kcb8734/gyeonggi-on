import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { issueCoupon } from '../../api/coupons';
import { FESTIVAL_FOCUS_DELTA, GYEONGGI_DEFAULT_REGION } from '../../constants/map';
import { useSelectedRegionPreset } from '../../stores/regionStore';
import { useFestivalMap } from '../../hooks/useFestivalMap';
import type { MapRegion, MerchantPin } from '../../types/map';
import type { FestivalPin } from '../../types/map';
import type { TourPlace } from '../../types/tour';
import { TOUR_KIND_META } from '../../types/tour';
import { MapView, Marker, PROVIDER_GOOGLE } from './CompatibleMap';
import CategoryFilterBar from './CategoryFilterBar';
import FestivalChipBar from './FestivalChipBar';
import { MapErrorBanner, MapLegend, MapLoadingOverlay } from './MapOverlays';
import MerchantCouponSheet from './MerchantCouponSheet';
import PlaceBottomSheet, { type SheetPlace } from './PlaceBottomSheet';

interface MainMapProps {
  festivalId?: string;
  userId: string;
}

type LayerFilter = 'all' | 'festivals' | 'merchants';

function toSheetFromFestival(festival: FestivalPin): SheetPlace {
  return {
    id: festival.id,
    kind: 'festival',
    title: festival.title,
    address: festival.location_name,
    imageUrl: festival.image_url,
    latitude: festival.latitude,
    longitude: festival.longitude,
    canOpenDetail: true,
  };
}

function toSheetFromMerchant(merchant: MerchantPin): SheetPlace {
  return {
    id: merchant.id,
    kind: 'merchant',
    title: merchant.business_name,
    subtitle: merchant.category,
    address: merchant.address,
    latitude: merchant.latitude,
    longitude: merchant.longitude,
    discountRate: merchant.total_discount_rate,
    canIssueCoupon: true,
  };
}

function toSheetFromPlace(place: TourPlace): SheetPlace {
  return {
    id: place.contentId,
    kind: 'place',
    title: place.title,
    subtitle: TOUR_KIND_META[place.kind].label,
    address: place.address,
    imageUrl: place.firstImage,
    latitude: place.mapY,
    longitude: place.mapX,
    canOpenDetail: true,
  };
}

function distance2(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const dy = a.latitude - b.latitude;
  const dx = a.longitude - b.longitude;
  return dy * dy + dx * dx;
}

export default function MainMap({ festivalId, userId }: MainMapProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const mapRef = useRef<React.ElementRef<typeof MapView>>(null);
  const regionPreset = useSelectedRegionPreset();
  const {
    festivals,
    selectedFestivalId,
    setSelectedFestivalId,
    selectedFestival,
    merchants,
    category,
    setCategory,
    categories,
    userLocation,
    tourPlaces,
    loadingFestivals,
    loadingMerchants,
    loadingTour,
    error,
    reload,
  } = useFestivalMap(festivalId);

  const [layer, setLayer] = useState<LayerFilter>('all');
  const [sheet, setSheet] = useState<SheetPlace | null>(null);
  const [selectedMerchant, setSelectedMerchant] = useState<MerchantPin | null>(null);
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [issuing, setIssuing] = useState(false);
  const [issueError, setIssueError] = useState<string | null>(null);

  const visibleFestivals = layer === 'merchants' ? [] : festivals;
  const visibleMerchants = layer === 'festivals' ? [] : merchants;
  const visiblePlaces = layer === 'all' ? tourPlaces : [];

  const initialRegion = useMemo<MapRegion>(() => {
    if (selectedFestival) {
      return {
        latitude: selectedFestival.latitude,
        longitude: selectedFestival.longitude,
        ...FESTIVAL_FOCUS_DELTA,
      };
    }
    return {
      latitude: regionPreset.latitude,
      longitude: regionPreset.longitude,
      latitudeDelta: regionPreset.latitudeDelta,
      longitudeDelta: regionPreset.longitudeDelta,
    };
  }, [selectedFestival, regionPreset]);

  useEffect(() => {
    if (!mapRef.current) return;
    if (selectedFestival) {
      mapRef.current.animateToRegion({
        latitude: selectedFestival.latitude,
        longitude: selectedFestival.longitude,
        ...FESTIVAL_FOCUS_DELTA,
      });
      setSheet(toSheetFromFestival(selectedFestival));
      return;
    }
    if (festivals.length > 1) {
      mapRef.current.fitToCoordinates(
        festivals.map((f) => ({ latitude: f.latitude, longitude: f.longitude })),
        { edgePadding: { top: 160, right: 40, bottom: 140, left: 40 }, animated: true },
      );
    }
  }, [selectedFestival, festivals]);

  const handleSelectFestival = (id: string) => {
    const found = festivals.find((item) => item.id === id);
    setSelectedMerchant(null);
    setCouponCode(null);
    setIssueError(null);
    setSelectedFestivalId(id);
    if (found) setSheet(toSheetFromFestival(found));
  };

  const handleSelectMerchant = (merchant: MerchantPin) => {
    setSelectedMerchant(merchant);
    setCouponCode(null);
    setIssueError(null);
    setSheet(toSheetFromMerchant(merchant));
  };

  const handleSelectPlace = (place: TourPlace) => {
    setSelectedMerchant(null);
    setCouponCode(null);
    setIssueError(null);
    setSheet(toSheetFromPlace(place));
  };

  const handleIssueCoupon = async () => {
    if (!selectedMerchant) return;
    setIssuing(true);
    setIssueError(null);
    try {
      const code = await issueCoupon(userId, selectedMerchant.promotion_id);
      setCouponCode(code);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? '쿠폰을 발급하지 못했습니다.';
      setIssueError(message);
    } finally {
      setIssuing(false);
    }
  };

  const handleResearch = () => {
    reload();
    if (userLocation) {
      mapRef.current?.animateToRegion({
        ...userLocation,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
      });
      return;
    }
    mapRef.current?.animateToRegion(GYEONGGI_DEFAULT_REGION);
  };

  const handleRegionChange = (region: MapRegion) => {
    const center = { latitude: region.latitude, longitude: region.longitude };
    const candidates: Array<{ place: SheetPlace; coordinate: { latitude: number; longitude: number } }> = [
      ...visibleFestivals.map((item) => ({ place: toSheetFromFestival(item), coordinate: item })),
      ...visibleMerchants.map((item) => ({ place: toSheetFromMerchant(item), coordinate: item })),
      ...visiblePlaces.map((item) => ({
        place: toSheetFromPlace(item),
        coordinate: { latitude: item.mapY, longitude: item.mapX },
      })),
    ];
    if (!candidates.length) return;
    let best = candidates[0];
    let bestD = distance2(center, best.coordinate);
    for (const item of candidates.slice(1)) {
      const d = distance2(center, item.coordinate);
      if (d < bestD) {
        best = item;
        bestD = d;
      }
    }
    setSheet(best.place);
    const merchant = visibleMerchants.find((item) => item.id === best.place.id);
    setSelectedMerchant(merchant ?? null);
  };

  return (
    <View style={styles.root}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass
        onRegionChangeComplete={handleRegionChange}
      >
        {visibleFestivals.map((festival) => (
          <Marker
            key={`festival-${festival.id}`}
            coordinate={{ latitude: festival.latitude, longitude: festival.longitude }}
            pinColor="red"
            title={festival.title}
            description={festival.location_name ?? undefined}
            onPress={() => handleSelectFestival(festival.id)}
          />
        ))}

        {visiblePlaces.map((place) => {
          const meta = TOUR_KIND_META[place.kind] ?? TOUR_KIND_META.other;
          return (
            <Marker
              key={`tour-${place.contentId}`}
              coordinate={{ latitude: place.mapY, longitude: place.mapX }}
              pinColor={meta.pinColor}
              badgeLabel={meta.badge}
              title={place.title}
              description={place.address}
              onPress={() => handleSelectPlace(place)}
            />
          );
        })}

        {visibleMerchants.map((merchant) => (
          <Marker
            key={`merchant-${merchant.id}`}
            coordinate={{ latitude: merchant.latitude, longitude: merchant.longitude }}
            pinColor="green"
            badgeLabel={`${Math.round(merchant.total_discount_rate)}%`}
            onPress={() => handleSelectMerchant(merchant)}
            tracksViewChanges={false}
          >
            <View style={[
              styles.discountPin,
              selectedMerchant?.id === merchant.id && styles.discountPinSelected,
            ]}>
              <Text style={styles.discountPinText}>{Math.round(merchant.total_discount_rate)}%</Text>
            </View>
          </Marker>
        ))}
      </MapView>

      <View style={[styles.topOverlay, { paddingTop: Math.max(insets.top, 8) }]} pointerEvents="box-none">
        {error ? <MapErrorBanner message={error} onRetry={reload} /> : null}
        <View style={styles.filterRow}>
          {([
            { id: 'all', label: '전체' },
            { id: 'festivals', label: '축제만 보기' },
            { id: 'merchants', label: '할인 상가만 보기' },
          ] as const).map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.filterChip, layer === item.id && styles.filterChipOn]}
              onPress={() => setLayer(item.id)}
            >
              <Text style={[styles.filterText, layer === item.id && styles.filterTextOn]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.research} onPress={handleResearch}>
          <Text style={styles.researchText}>현 위치 재검색</Text>
        </TouchableOpacity>
        <FestivalChipBar
          festivals={visibleFestivals}
          selectedFestivalId={selectedFestivalId}
          onSelect={handleSelectFestival}
        />
        {selectedFestival && layer !== 'festivals' ? (
          <CategoryFilterBar
            categories={categories}
            selected={category}
            onSelect={setCategory}
          />
        ) : null}
      </View>

      <View style={[styles.bottomOverlay, { paddingBottom: Math.max(insets.bottom, 8) }]} pointerEvents="box-none">
        <View style={styles.bottomRow}>
          <MapLegend />
        </View>
        <PlaceBottomSheet
          place={sheet}
          issuing={issuing}
          onIssue={() => {
            if (selectedMerchant) {
              handleIssueCoupon();
            }
          }}
          onDirections={() => {
            if (!sheet) return;
            mapRef.current?.animateToRegion({
              latitude: sheet.latitude,
              longitude: sheet.longitude,
              ...FESTIVAL_FOCUS_DELTA,
            });
          }}
          onDetail={() => {
            if (!sheet) return;
            if (sheet.kind === 'place') {
              navigation.navigate('TourDetail', { contentId: sheet.id, title: sheet.title });
              return;
            }
            if (sheet.kind === 'festival') {
              const festival = festivals.find((item) => item.id === sheet.id) ?? selectedFestival;
              navigation.navigate('TourDetail', {
                contentId: festival?.contentId ?? sheet.id,
                contentTypeId: festival?.contentTypeId,
                tel: festival?.tel,
                title: festival?.title ?? sheet.title,
              });
              return;
            }
            if (sheet.kind === 'merchant' && selectedMerchant) {
              handleIssueCoupon();
            }
          }}
        />
      </View>

      <View style={styles.centerOverlay} pointerEvents="none">
        <MapLoadingOverlay
          visible={loadingFestivals || loadingMerchants || loadingTour}
          label={loadingFestivals ? '주변 축제를 불러오는 중' : loadingTour ? '주변 관광지를 불러오는 중' : '제휴업소를 불러오는 중'}
        />
      </View>

      <MerchantCouponSheet
        merchant={couponCode ? selectedMerchant : null}
        couponCode={couponCode}
        issuing={issuing}
        error={issueError}
        onIssue={handleIssueCoupon}
        onClose={() => {
          setCouponCode(null);
          setIssueError(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F4F6' },
  map: { flex: 1 },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    gap: 8,
  },
  filterRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 12 },
  filterChip: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipOn: { backgroundColor: '#111827', borderColor: '#111827' },
  filterText: { fontSize: 12, fontWeight: '800', color: '#374151' },
  filterTextOn: { color: '#fff' },
  research: {
    alignSelf: 'flex-start',
    marginLeft: 12,
    backgroundColor: '#2D6CDF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  researchText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  bottomOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: 8,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: 12,
  },
  centerOverlay: {
    position: 'absolute',
    top: '42%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  discountPin: {
    backgroundColor: '#16A34A',
    borderRadius: 14,
    minWidth: 40,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  discountPinSelected: {
    backgroundColor: '#15803D',
    transform: [{ scale: 1.08 }],
  },
  discountPinText: { color: '#fff', fontSize: 12, fontWeight: '800' },
});
