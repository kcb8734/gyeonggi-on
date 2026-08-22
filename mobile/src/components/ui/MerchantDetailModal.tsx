import React from 'react';
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { HomePromotion } from '../../types/home';
import { couponRateColor } from '../../utils/couponColors';
import { setImeModalLock } from '../../utils/nativeImeHost';

interface Props {
  promotion: HomePromotion | null;
  issuing?: boolean;
  onClose: () => void;
  onDownload: (promo: HomePromotion) => void;
}

export default function MerchantDetailModal({ promotion, issuing, onClose, onDownload }: Props) {
  React.useEffect(() => {
    setImeModalLock(Boolean(promotion));
    return () => setImeModalLock(false);
  }, [promotion]);
  if (!promotion) return null;
  const rateColor = couponRateColor(
    `${promotion.municipality_name ?? ''} ${promotion.festival_title ?? ''} ${promotion.business_name ?? ''}`,
    promotion.metro,
  );
  const exterior = promotion.exterior_image_url;
  const interior = promotion.interior_image_url;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={[styles.rateBanner, { backgroundColor: rateColor }]}>
              <Text style={styles.rateKicker}>{promotion.municipality_name ?? '제휴 상가'}</Text>
              <Text style={styles.rate}>{promotion.total_discount_rate}% OFF</Text>
              <Text style={styles.rateShop}>{promotion.business_name ?? '제휴업소'}</Text>
            </View>
            <View style={styles.body}>
              <Text style={styles.title}>{promotion.title}</Text>
              {promotion.festival_title ? (
                <Text style={styles.fest}>{promotion.festival_title} 연계 할인</Text>
              ) : null}

              <Text style={styles.label}>가게 사진 (외부 · 내부)</Text>
              <View style={styles.photoRow}>
                <View style={styles.photoBox}>
                  {exterior ? <Image source={{ uri: exterior }} style={styles.photo} /> : <View style={styles.photoFallback} />}
                  <Text style={styles.photoCap}>외부</Text>
                </View>
                <View style={styles.photoBox}>
                  {interior ? <Image source={{ uri: interior }} style={styles.photo} /> : <View style={styles.photoFallback} />}
                  <Text style={styles.photoCap}>내부</Text>
                </View>
              </View>

              {promotion.main_menu ? (
                <>
                  <Text style={styles.label}>주요 메뉴</Text>
                  <Text style={styles.value}>{promotion.main_menu}</Text>
                </>
              ) : null}
              {promotion.features ? (
                <>
                  <Text style={styles.label}>가게 특징</Text>
                  <Text style={styles.value}>{promotion.features}</Text>
                </>
              ) : null}

              <Text style={styles.label}>위치</Text>
              <Text style={styles.value}>{promotion.address ?? '주소 확인 중'}</Text>
              {promotion.latitude != null && promotion.longitude != null ? (
                <Text style={styles.gps}>
                  GPS {promotion.gps_confirmed ? '확인됨' : '좌표'} {promotion.latitude.toFixed(5)}, {promotion.longitude.toFixed(5)}
                </Text>
              ) : (
                <Text style={styles.gps}>GPS 좌표 미등록</Text>
              )}

              <Text style={styles.hint}>상가 정보와 위치를 확인한 뒤 쿠폰을 다운로드하세요.</Text>
              <TouchableOpacity
                style={styles.download}
                onPress={() => onDownload(promotion)}
                disabled={issuing}
              >
                <Text style={styles.downloadText}>{issuing ? '발급 중...' : '확인 후 쿠폰 다운로드'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.close} onPress={onClose}>
                <Text style={styles.closeText}>닫기</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    maxHeight: '90%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: 'hidden',
  },
  rateBanner: { padding: 18, paddingTop: 22 },
  rateKicker: { color: '#FECACA', fontSize: 11, fontWeight: '800' },
  rate: { color: '#fff', fontSize: 32, fontWeight: '900', marginTop: 4 },
  rateShop: { color: '#fff', fontSize: 16, fontWeight: '800', marginTop: 4 },
  body: { padding: 16, paddingBottom: 28 },
  title: { fontSize: 16, fontWeight: '800', color: '#111827' },
  fest: { fontSize: 13, color: '#2563EB', fontWeight: '700', marginTop: 4 },
  label: { fontSize: 12, fontWeight: '800', color: '#6B7280', marginTop: 16, marginBottom: 6 },
  value: { fontSize: 14, color: '#111827', lineHeight: 21, fontWeight: '600' },
  gps: { fontSize: 12, color: '#2563EB', fontWeight: '700', marginTop: 6 },
  photoRow: { flexDirection: 'row', gap: 8 },
  photoBox: { flex: 1 },
  photo: { width: '100%', height: 110, borderRadius: 12, backgroundColor: '#E5E7EB' },
  photoFallback: { width: '100%', height: 110, borderRadius: 12, backgroundColor: '#E5E7EB' },
  photoCap: { fontSize: 11, color: '#6B7280', fontWeight: '700', marginTop: 4, textAlign: 'center' },
  hint: { fontSize: 12, color: '#6B7280', marginTop: 16, lineHeight: 18 },
  download: {
    marginTop: 12,
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  downloadText: { color: '#fff', fontWeight: '800' },
  close: { marginTop: 8, paddingVertical: 10, alignItems: 'center' },
  closeText: { fontWeight: '800', color: '#6B7280' },
});
