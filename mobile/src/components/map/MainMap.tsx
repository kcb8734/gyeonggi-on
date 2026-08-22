import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { issueCoupon } from '../../api/coupons';
import { FESTIVAL_FOCUS_DELTA, GYEONGGI_DEFAULT_REGION } from '../../constants/map';
import { useFestivalMap } from '../../hooks/useFestivalMap';
import type { MapRegion, MerchantPin } from '../../types/map';
import type { TourPlace } from '../../types/tour';
import { TOUR_KIND_META } from '../../types/tour';
import { MapView, Marker, PROVIDER_GOOGLE } from './CompatibleMap';
import CategoryFilterBar from './CategoryFilterBar';
import FestivalChipBar from './FestivalChipBar';
import { MapErrorBanner, MapLegend, MapLoadingOverlay, RecenterButton } from './MapOverlays';
import MerchantCouponSheet from './MerchantCouponSheet';

interface MainMapProps {
  festivalId?: string;
  userId: string;
}

export default function MainMap({ festivalId, userId }: MainMapProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const mapRef = useRef<React.ElementRef<typeof MapView>>(null);
  const {
    festivals,
    selectedFestivalId,
    setSelectedFestivalId,
    selectedFestival,
    merchants,
    allMerchantCount,
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

  const [selectedPlace, setSelectedPlace] = useState<TourPlace | null>(null);
  const [selectedMerchant, setSelectedMerchant] = useState<MerchantPin | null>(null);
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [issuing, setIssuing] = useState(false);
  const [issueError, setIssueError] = useState<string | null>(null);

  const initialRegion = useMemo<MapRegion>(() => {
    if (selectedFestival) {
      return {
        latitude: selectedFestival.latitude,
        longitude: selectedFestival.longitude,
        ...FESTIVAL_FOCUS_DELTA,
      };
    }
    return GYEONGGI_DEFAULT_REGION;
  }, [selectedFestival]);

  useEffect(() => {
    if (!mapRef.current) return;

    if (selectedFestival) {
      mapRef.current.animateToRegion({
        latitude: selectedFestival.latitude,
        longitude: selectedFestival.longitude,
        ...FESTIVAL_FOCUS_DELTA,
      });
      return;
    }

    if (festivals.length > 1) {
      mapRef.current.fitToCoordinates(
        festivals.map((f) => ({ latitude: f.latitude, longitude: f.longitude })),
        { edgePadding: { top: 140, right: 40, bottom: 80, left: 40 }, animated: true },
      );
    }
  }, [selectedFestival, festivals]);

  const handleSelectFestival = (id: string) => {
    setSelectedMerchant(null);
    setSelectedPlace(null);
    setCouponCode(null);
    setIssueError(null);
    setSelectedFestivalId(id);
  };

  const handleSelectMerchant = (merchant: MerchantPin) => {
    setSelectedMerchant(merchant);
    setSelectedPlace(null);
    setCouponCode(null);
    setIssueError(null);
  };

  const handleSelectPlace = (place: TourPlace) => {
    setSelectedPlace(place);
    setSelectedMerchant(null);
    setCouponCode(null);
    setIssueError(null);
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

  const handleRecenter = () => {
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
        {festivals.map((festival) => (
          <Marker
            key={`festival-${festival.id}`}
            coordinate={{ latitude: festival.latitude, longitude: festival.longitude }}
            pinColor="red"
            title={festival.title}
            description={festival.location_name ?? undefined}
            onPress={() => handleSelectFestival(festival.id)}
          />
        ))}

        {tourPlaces.map((place) => {
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

        {merchants.map((merchant) => (
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
        <FestivalChipBar
          festivals={festivals}
          selectedFestivalId={selectedFestivalId}
          onSelect={handleSelectFestival}
        />
        {selectedFestival ? (
          <CategoryFilterBar
            categories={categories}
            selected={category}
            onSelect={setCategory}
          />
        ) : null}
      </View>

      <View style={[styles.bottomOverlay, { paddingBottom: Math.max(insets.bottom, 12) }]} pointerEvents="box-none">
        <View style={styles.bottomRow}>
          <MapLegend />
          <RecenterButton onPress={handleRecenter} />
        </View>
        {selectedPlace ? (
          <View style={styles.festivalCard}>
            <Text style={styles.festivalTitle}>{selectedPlace.title}</Text>
            <Text style={styles.festivalMeta}>
              {TOUR_KIND_META[selectedPlace.kind].label}
              {selectedPlace.address ? ` · ${selectedPlace.address}` : ''}
            </Text>
            <Text
              style={styles.detailLink}
              onPress={() => navigation.navigate('TourDetail', {
                contentId: selectedPlace.contentId,
                contentTypeId: selectedPlace.contentTypeId,
              })}
            >
              상세 보기
            </Text>
          </View>
        ) : selectedFestival ? (
          <View style={styles.festivalCard}>
            <Text style={styles.festivalTitle}>{selectedFestival.title}</Text>
            <Text style={styles.festivalMeta}>
              {selectedFestival.location_name ?? '위치 미정'}
              {allMerchantCount > 0 ? ` · 제휴업소 ${allMerchantCount}곳` : ' · 제휴업소 없음'}
            </Text>
          </View>
        ) : (
          <View style={styles.festivalCard}>
            <Text style={styles.festivalTitle}>경기온 축제 지도</Text>
            <Text style={styles.festivalMeta}>축제·관광지·맛집 핀을 눌러 상세를 확인하세요</Text>
          </View>
        )}
      </View>

      <View style={styles.centerOverlay} pointerEvents="none">
        <MapLoadingOverlay
          visible={loadingFestivals || loadingMerchants || loadingTour}
          label={loadingFestivals ? '주변 축제를 불러오는 중' : loadingTour ? '주변 관광지를 불러오는 중' : '제휴업소를 불러오는 중'}
        />
      </View>

      <MerchantCouponSheet
        merchant={selectedMerchant}
        couponCode={couponCode}
        issuing={issuing}
        error={issueError}
        onIssue={handleIssueCoupon}
        onClose={() => {
          setSelectedMerchant(null);
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
  },
  bottomOverlay: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 0,
    gap: 8,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  centerOverlay: {
    position: 'absolute',
    top: '42%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  festivalCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  festivalTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  festivalMeta: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  detailLink: { marginTop: 8, color: '#2563EB', fontWeight: '800', fontSize: 13 },
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
