import { useCallback, useEffect, useMemo, useState } from 'react';
import * as Location from 'expo-location';
import { fetchFestivalMap, fetchNearbyFestivals } from '../api/festivals';
import { ALL_CATEGORIES } from '../constants/map';
import type { FestivalPin, MerchantPin } from '../types/map';

export function useFestivalMap(initialFestivalId?: string) {
  const [festivals, setFestivals] = useState<FestivalPin[]>([]);
  const [selectedFestivalId, setSelectedFestivalId] = useState<string | null>(initialFestivalId ?? null);
  const [selectedFestival, setSelectedFestival] = useState<FestivalPin | null>(null);
  const [merchants, setMerchants] = useState<MerchantPin[]>([]);
  const [category, setCategory] = useState(ALL_CATEGORIES);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loadingFestivals, setLoadingFestivals] = useState(true);
  const [loadingMerchants, setLoadingMerchants] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFestivals = useCallback(async () => {
    setLoadingFestivals(true);
    setError(null);
    try {
      let coords: { latitude: number; longitude: number } | null = null;
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status === 'granted') {
          const current = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          coords = {
            latitude: current.coords.latitude,
            longitude: current.coords.longitude,
          };
          setUserLocation(coords);
        }
      } catch {
        // 위치 권한/수신 실패 시 전체 축제 목록으로 폴백
      }

      const list = await fetchNearbyFestivals(
        coords
          ? { latitude: coords.latitude, longitude: coords.longitude, radiusKm: 80 }
          : undefined,
      );
      setFestivals(list);

      if (initialFestivalId && list.some((f) => f.id === initialFestivalId)) {
        setSelectedFestivalId(initialFestivalId);
      } else if (initialFestivalId && !list.some((f) => f.id === initialFestivalId)) {
        // 주변 목록에 없어도 지정된 축제는 지도 API로 로드
        setSelectedFestivalId(initialFestivalId);
      }
    } catch {
      setError('주변 축제 목록을 불러오지 못했습니다.');
    } finally {
      setLoadingFestivals(false);
    }
  }, [initialFestivalId]);

  useEffect(() => {
    loadFestivals();
  }, [loadFestivals]);

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
        setMerchants(data.merchants ?? []);
        setCategory(ALL_CATEGORIES);
        setFestivals((prev) => {
          if (prev.some((f) => f.id === data.festival.id)) return prev;
          return [data.festival, ...prev];
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
    const unique = Array.from(new Set(merchants.map((m) => m.category).filter(Boolean)));
    return [ALL_CATEGORIES, ...unique];
  }, [merchants]);

  const visibleMerchants = useMemo(() => {
    if (category === ALL_CATEGORIES) return merchants;
    return merchants.filter((m) => m.category === category);
  }, [merchants, category]);

  return {
    festivals,
    selectedFestivalId,
    setSelectedFestivalId,
    selectedFestival,
    merchants: visibleMerchants,
    allMerchantCount: merchants.length,
    category,
    setCategory,
    categories,
    userLocation,
    loadingFestivals,
    loadingMerchants,
    error,
    reload: loadFestivals,
  };
}
