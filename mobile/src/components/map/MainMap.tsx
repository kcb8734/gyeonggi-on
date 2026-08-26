import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { issueCoupon } from '../../api/coupons';
import { FESTIVAL_FOCUS_DELTA, GYEONGGI_DEFAULT_REGION } from '../../constants/map';
import { useSelectedRegionPreset } from '../../stores/regionStore';
import { useFestivalMap } from '../../hooks/useFestivalMap';
import type { FestivalPin, MapRegion, MerchantPin } from '../../types/map';
import type { TourPlace, TourPlaceKind } from '../../types/tour';
import { TOUR_KIND_META } from '../../types/tour';
import { regionFromPoints, validLatLng } from '../../utils/mapCamera';
import { spreadOverlappingPins } from '../../utils/mapPins';
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

type LayerFilter = 'all' | 'festivals' | 'merchants' | 'food' | 'attraction' | 'culture';

const LAYERS: Array<{ id: LayerFilter; label: string }> = [
  { id: 'all', label: '전체' },
  { id: 'festivals', label: '축제' },
  { id: 'merchants', label: '제휴업소' },
  { id: 'food', label: '맛집' },
  { id: 'attraction', label: '관광지' },
  { id: 'culture', label: '문화' },
];

function toSheetFromFestival(festival: FestivalPin): SheetPlace {
  return {
    id: festival.id,
    kind: 'festival',
    title: festival.title,
    subtitle: '축제',
    address: festival.location_name,
    imageUrl: festival.image_url,
    latitude: festival.latitude,
    longitude: festival.longitude,
    contentId: festival.contentId,
    contentTypeId: festival.contentTypeId,
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
  const meta = TOUR_KIND_META[place.kind] ?? TOUR_KIND_META.other;
  return {
    id: place.contentId,
    kind: 'place',
    title: place.title,
    subtitle: meta.label,
    address: place.address,
    imageUrl: place.firstImage,
    latitude: place.mapY,
    longitude: place.mapX,
    contentId: place.contentId,
    contentTypeId: place.contentTypeId,
    canOpenDetail: true,
  };
}

function clampRegion(region: MapRegion): MapRegion {
  return {
    ...region,
    latitudeDelta: Math.min(Math.max(region.latitudeDelta, 0.025), 0.09),
    longitudeDelta: Math.min(Math.max(region.longitudeDelta, 0.025), 0.09),
  };
}

export default function MainMap({ festivalId, userId }: MainMapProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const mapRef = useRef<React.ElementRef<typeof MapView>>(null);
  const fitOnce = useRef(true);
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
    locationNote,
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

  const visibleFestivals = layer === 'all' || layer === 'festivals' ? festivals : [];
  const visibleMerchants = layer === 'all' || layer === 'merchants' ? merchants : [];
  const visiblePlaces = useMemo(() => {
    if (layer === 'festivals' || layer === 'merchants') return [];
    if (layer === 'all') return tourPlaces;
    return tourPlaces.filter((item) => item.kind === (layer as TourPlaceKind));
  }, [layer, tourPlaces]);

  const festivalPins = useMemo(
    () => spreadOverlappingPins(visibleFestivals.filter((item) => validLatLng(item.latitude, item.longitude))),
    [visibleFestivals],
  );
  const merchantPins = useMemo(
    () => spreadOverlappingPins(visibleMerchants.filter((item) => validLatLng(item.latitude, item.longitude))),
    [visibleMerchants],
  );
  const placePins = useMemo(
    () => spreadOverlappingPins(
      visiblePlaces
        .filter((item) => validLatLng(item.mapY, item.mapX))
        .map((item) => ({ ...item, latitude: item.mapY, longitude: item.mapX })),
    ),
    [visiblePlaces],
  );

  const initialRegion = useMemo<MapRegion>(() => {
    if (userLocation) {
      return { ...userLocation, latitudeDelta: 0.05, longitudeDelta: 0.05 };
    }
    return {
      latitude: regionPreset.latitude || GYEONGGI_DEFAULT_REGION.latitude,
      longitude: regionPreset.longitude || GYEONGGI_DEFAULT_REGION.longitude,
      latitudeDelta: 0.06,
      longitudeDelta: 0.06,
    };
  }, [userLocation, regionPreset]);

  const loading = loadingFestivals || loadingMerchants || loadingTour;

  useEffect(() => {
    if (loading) {
      fitOnce.current = true;
      return;
    }
    if (!fitOnce.current || !mapRef.current) return;
    fitOnce.current = false;
    const points = [
      userLocation,
      ...festivalPins,
      ...merchantPins,
      ...placePins,
    ].filter((item): item is { latitude: number; longitude: number } => Boolean(item && validLatLng(item.latitude, item.longitude)));
    const fitted = regionFromPoints(points, 0.03);
    if (fitted) {
      mapRef.current.animateToRegion(clampRegion(fitted));
      return;
    }
    mapRef.current.animateToRegion(initialRegion);
  }, [loading, festivalPins, merchantPins, placePins, userLocation, initialRegion]);

  const handleSelectFestival = (id: string) => {
    const found = festivals.find((item) => item.id === id);
    setSelectedMerchant(null);
    setCouponCode(null);
    setIssueError(null);
    setSelectedFestivalId(id);
    if (found) {
      setSheet(toSheetFromFestival(found));
      mapRef.current?.animateToRegion({
        latitude: found.latitude,
        longitude: found.longitude,
        ...FESTIVAL_FOCUS_DELTA,
      });
    }
  };

  const handleSelectMerchant = (merchant: MerchantPin) => {
    setSelectedFestivalId(null);
    setSelectedMerchant(merchant);
    setCouponCode(null);
    setIssueError(null);
    setSheet(toSheetFromMerchant(merchant));
  };

  const handleSelectPlace = (place: TourPlace) => {
    setSelectedFestivalId(null);
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
    fitOnce.current = true;
    setSelectedFestivalId(null);
    setSheet(null);
    void reload();
  };

  const openDetail = (place: SheetPlace) => {
    if (place.kind === 'place' || place.kind === 'festival') {
      const festival = festivals.find((item) => item.id === place.id);
      navigation.navigate('TourDetail', {
        contentId: place.contentId ?? festival?.contentId ?? place.id,
        contentTypeId: place.contentTypeId ?? festival?.contentTypeId,
        tel: festival?.tel,
        title: festival?.title ?? place.title,
        city: festival?.municipality_name ?? undefined,
        address: festival?.location_name ?? place.address,
        latitude: festival?.latitude ?? place.latitude,
        longitude: festival?.longitude ?? place.longitude,
        metro: regionPreset.id,
        imageUrl: festival?.image_url ?? place.imageUrl ?? undefined,
      });
      return;
    }
    if (place.kind === 'merchant' && selectedMerchant) {
      handleIssueCoupon();
    }
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
      >
        {festivalPins.map((festival) => (
          <Marker
            key={`festival-${festival.id}`}
            coordinate={{ latitude: festival.latitude, longitude: festival.longitude }}
            pinColor="red"
            badgeLabel="축"
            title={festival.title}
            description={festival.location_name ?? undefined}
            zIndex={40}
            onPress={() => handleSelectFestival(festival.id)}
          />
        ))}

        {placePins.map((place) => {
          const meta = TOUR_KIND_META[place.kind] ?? TOUR_KIND_META.other;
          return (
            <Marker
              key={`tour-${place.contentId}`}
              coordinate={{ latitude: place.latitude, longitude: place.longitude }}
              pinColor={meta.pinColor}
              badgeLabel={meta.badge}
              title={place.title}
              description={place.address}
              zIndex={20}
              onPress={() => handleSelectPlace(place)}
            />
          );
        })}

        {merchantPins.map((merchant) => (
          <Marker
            key={`merchant-${merchant.id}`}
            coordinate={{ latitude: merchant.latitude, longitude: merchant.longitude }}
            pinColor="green"
            badgeLabel={`${Math.round(merchant.total_discount_rate)}%`}
            title={merchant.business_name}
            description={merchant.address ?? undefined}
            zIndex={30}
            onPress={() => handleSelectMerchant(merchant)}
            tracksViewChanges={false}
          />
        ))}
      </MapView>

      <View style={[styles.topOverlay, { paddingTop: Math.max(insets.top, 8) }]} pointerEvents="box-none">
        {error ? <MapErrorBanner message={error} onRetry={handleResearch} /> : null}
        {locationNote ? (
          <View style={styles.locationBanner}>
            <Text style={styles.locationText}>{locationNote}</Text>
          </View>
        ) : null}
        <View style={styles.filterRow}>
          {LAYERS.map((item) => {
            const on = layer === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.filterChip, on && styles.filterChipOn]}
                onPress={() => setLayer(item.id)}
              >
                <Text style={[styles.filterText, on && styles.filterTextOn]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
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
            if (selectedMerchant) handleIssueCoupon();
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
            if (sheet) openDetail(sheet);
          }}
        />
      </View>

      <View style={styles.centerOverlay} pointerEvents="none">
        <MapLoadingOverlay
          visible={loading}
          label={loadingFestivals ? '주변 축제를 불러오는 중' : loadingTour ? '주변 장소를 불러오는 중' : '제휴업소를 불러오는 중'}
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
  locationBanner: {
    marginHorizontal: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  locationText: { color: '#1E40AF', fontSize: 13, fontWeight: '700', lineHeight: 18 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 12 },
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
});
