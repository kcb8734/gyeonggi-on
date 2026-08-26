import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchFestivalMap, fetchNearbyFestivals } from '../api/festivals';
import { fetchHomeFeed } from '../api/home';
import { fetchTourNearby } from '../api/tour';
import { ALL_CATEGORIES, GYEONGGI_DEFAULT_REGION } from '../constants/map';
import { regionById } from '../constants/regionTour';
import { useSelectedRegionPreset } from '../stores/regionStore';
import type { FestivalPin, MerchantPin } from '../types/map';
import type { TourPlace } from '../types/tour';
import { validLatLng } from '../utils/mapCamera';
import { withinKm } from '../utils/mapPins';
import { requestUserLocation, type UserLocationResult } from '../utils/userLocation';

const TOUR_RADIUS_M = 8000;
const NEARBY_KM = 20;

function toMerchantPin(promo: {
  id: string;
  business_name?: string;
  title: string;
  address?: string | null;
  latitude?: number;
  longitude?: number;
  total_discount_rate: number;
  remaining_quantity?: number;
  max_discount_amount?: number | null;
}): MerchantPin | null {
  if (!validLatLng(promo.latitude, promo.longitude)) return null;
  return {
    id: promo.id,
    business_name: promo.business_name || promo.title,
    category: '제휴업소',
    address: promo.address,
    latitude: promo.latitude as number,
    longitude: promo.longitude as number,
    total_discount_rate: promo.total_discount_rate,
    promotion_id: promo.id,
    remaining_quantity: promo.remaining_quantity,
    max_discount_amount: promo.max_discount_amount,
  };
}

export function useFestivalMap(initialFestivalId?: string) {
  const region = useSelectedRegionPreset();
  const [festivals, setFestivals] = useState<FestivalPin[]>([]);
  const [selectedFestivalId, setSelectedFestivalId] = useState<string | null>(initialFestivalId ?? null);
  const [selectedFestival, setSelectedFestival] = useState<FestivalPin | null>(null);
  const [merchants, setMerchants] = useState<MerchantPin[]>([]);
  const [regionMerchants, setRegionMerchants] = useState<MerchantPin[]>([]);
  const [category, setCategory] = useState(ALL_CATEGORIES);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationNote, setLocationNote] = useState<string | null>(null);
  const [loadingFestivals, setLoadingFestivals] = useState(true);
  const [loadingMerchants, setLoadingMerchants] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tourPlaces, setTourPlaces] = useState<TourPlace[]>([]);
  const [loadingTour, setLoadingTour] = useState(false);

  const loadAround = useCallback(async (coords: { latitude: number; longitude: number } | null) => {
    const preset = regionById(region.id);
    const center = coords ?? {
      latitude: preset.latitude || GYEONGGI_DEFAULT_REGION.latitude,
      longitude: preset.longitude || GYEONGGI_DEFAULT_REGION.longitude,
    };
    setLoadingFestivals(true);
    setLoadingTour(true);
    setError(null);
    try {
      const [list, feed, places] = await Promise.all([
        fetchNearbyFestivals({ latitude: center.latitude, longitude: center.longitude, radiusKm: NEARBY_KM }),
        fetchHomeFeed(region.id).catch(() => null),
        fetchTourNearby({ mapX: center.longitude, mapY: center.latitude, radius: TOUR_RADIUS_M }).catch(() => [] as TourPlace[]),
      ]);
      const nearbyFestivals = list.filter((item) =>
        validLatLng(item.latitude, item.longitude) && withinKm(item, center, NEARBY_KM),
      );
      setFestivals(nearbyFestivals.length ? nearbyFestivals : list.filter((item) => validLatLng(item.latitude, item.longitude)));
      const promoPins = (feed?.promotions ?? [])
        .map(toMerchantPin)
        .filter((item): item is MerchantPin => Boolean(item))
        .filter((item) => withinKm(item, center, NEARBY_KM));
      setRegionMerchants(promoPins);
      setTourPlaces(
        (places ?? []).filter((item) => validLatLng(item.mapY, item.mapX)),
      );
      if (initialFestivalId && list.some((item) => item.id === initialFestivalId)) {
        setSelectedFestivalId(initialFestivalId);
      }
    } catch {
      setError('주변 축제·장소를 불러오지 못했습니다.');
    } finally {
      setLoadingFestivals(false);
      setLoadingTour(false);
    }
  }, [initialFestivalId, region.id]);

  const loadFestivals = useCallback(async (forcePrompt = false) => {
    let coords: { latitude: number; longitude: number } | null = userLocation;
    if (forcePrompt || !coords) {
      const result: UserLocationResult = await requestUserLocation();
      if (result.ok) {
        coords = { latitude: result.latitude, longitude: result.longitude };
        setUserLocation(coords);
        setLocationNote(null);
      } else {
        setLocationNote(result.message);
        coords = coords ?? null;
      }
    }
    await loadAround(coords);
  }, [loadAround, userLocation]);

  useEffect(() => {
    void loadFestivals(false);
  }, [region.id]);

  useEffect(() => {
    if (!selectedFestivalId) {
      setSelectedFestival(null);
      setMerchants([]);
      setCategory(ALL_CATEGORIES);
      return;
    }

    let cancelled = false;
    setLoadingMerchants(true);
    setError(null);
    fetchFestivalMap(selectedFestivalId)
      .then((data) => {
        if (cancelled) return;
        setSelectedFestival(data.festival);
        setMerchants((data.merchants ?? []).filter((item) => validLatLng(item.latitude, item.longitude)));
        setCategory(ALL_CATEGORIES);
        setFestivals((prev) => {
          if (prev.some((item) => item.id === data.festival.id)) return prev;
          return validLatLng(data.festival.latitude, data.festival.longitude)
            ? [data.festival, ...prev]
            : prev;
        });
      })
      .catch(() => {
        if (!cancelled) setError('제휴업소 지도 데이터를 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setLoadingMerchants(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedFestivalId]);

  const categories = useMemo(() => {
    const unique = Array.from(new Set(merchants.map((item) => item.category).filter(Boolean)));
    return [ALL_CATEGORIES, ...unique];
  }, [merchants]);

  const visibleMerchants = useMemo(() => {
    const extra = category === ALL_CATEGORIES
      ? merchants
      : merchants.filter((item) => item.category === category);
    const byId = new Map(regionMerchants.map((item) => [item.id, item]));
    extra.forEach((item) => byId.set(item.id, item));
    return [...byId.values()];
  }, [merchants, regionMerchants, category]);

  return {
    festivals,
    selectedFestivalId,
    setSelectedFestivalId,
    selectedFestival,
    merchants: visibleMerchants,
    allMerchantCount: visibleMerchants.length,
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
    reload: () => loadFestivals(true),
  };
}
