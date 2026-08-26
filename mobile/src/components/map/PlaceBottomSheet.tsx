import React from 'react';
import { Image, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export type SheetKind = 'festival' | 'merchant' | 'place';

export interface SheetPlace {
  id: string;
  kind: SheetKind;
  title: string;
  subtitle?: string;
  address?: string | null;
  imageUrl?: string | null;
  latitude: number;
  longitude: number;
  discountRate?: number;
  canIssueCoupon?: boolean;
  canOpenDetail?: boolean;
  contentId?: string;
  contentTypeId?: string;
}

interface Props {
  place: SheetPlace | null;
  issuing?: boolean;
  onIssue?: () => void;
  onDetail?: () => void;
  onDirections?: () => void;
}

export default function PlaceBottomSheet({ place, issuing, onIssue, onDetail, onDirections }: Props) {
  if (!place) return null;

  const openDirections = () => {
    onDirections?.();
    const url = `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}&travelmode=walking`;
    Linking.openURL(url).catch(() => undefined);
  };

  return (
    <View style={styles.sheet}>
      <View style={styles.handle} />
      <View style={styles.row}>
        {place.imageUrl ? (
          <Image source={{ uri: place.imageUrl }} style={styles.thumb} />
        ) : (
          <View style={[styles.thumb, styles.fallback]}>
            <Text style={styles.fallbackText}>
              {place.kind === 'merchant' ? '%' : place.subtitle?.slice(0, 1) || '축'}
            </Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>
            {place.kind === 'merchant' ? '할인 상가' : place.kind === 'festival' ? '축제' : (place.subtitle || '주변 장소')}
          </Text>
          <Text style={styles.title} numberOfLines={1}>{place.title}</Text>
          <Text style={styles.addr} numberOfLines={2}>{place.address ?? place.subtitle ?? '주소 정보 없음'}</Text>
          {place.discountRate ? (
            <Text style={styles.deal}>상생 할인 {place.discountRate}%</Text>
          ) : null}
        </View>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.ghost} onPress={openDirections}>
          <Text style={styles.ghostText}>길찾기</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primary} onPress={onDetail}>
          <Text style={styles.primaryText}>상세보기</Text>
        </TouchableOpacity>
      </View>
      {place.canIssueCoupon ? (
        <TouchableOpacity style={styles.issue} onPress={onIssue} disabled={issuing}>
          <Text style={styles.issueText}>{issuing ? '발급 중...' : '할인 쿠폰 발급'}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    marginBottom: 10,
  },
  row: { flexDirection: 'row', gap: 12 },
  thumb: { width: 72, height: 72, borderRadius: 14, backgroundColor: '#E5E7EB' },
  fallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827' },
  fallbackText: { color: '#fff', fontWeight: '800' },
  kicker: { fontSize: 11, fontWeight: '800', color: '#E0392A' },
  title: { fontSize: 16, fontWeight: '800', color: '#111827', marginTop: 2 },
  addr: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  deal: { fontSize: 12, color: '#B4530A', fontWeight: '800', marginTop: 4 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  ghost: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  ghostText: { fontWeight: '800', color: '#374151' },
  primary: {
    flex: 1.3,
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryText: { fontWeight: '800', color: '#fff' },
  issue: {
    marginTop: 8,
    backgroundColor: '#E0392A',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  issueText: { fontWeight: '800', color: '#fff' },
});
