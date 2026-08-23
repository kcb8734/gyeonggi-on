import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import type { WalletCoupon } from '../../stores/appStore';
import ModalExitButton from './ModalExitButton';

interface Props {
  coupon: WalletCoupon | null;
  onClose: () => void;
}

export default function CouponQrModal({ coupon, onClose }: Props) {
  if (!coupon) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.card}>
          <ModalExitButton onPress={onClose} />
          <Text style={styles.kicker}>현장 제시용</Text>
          <Text style={styles.shop}>{coupon.business_name}</Text>
          <Text style={styles.rate}>{coupon.total_discount_rate}% 상생 할인</Text>
          <View style={styles.qr}>
            <QRCode value={coupon.coupon_code} size={168} />
          </View>
          <View style={styles.barcode}>
            {Array.from({ length: 28 }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.bar,
                  { width: i % 4 === 0 ? 3 : 1.4, opacity: i % 5 === 0 ? 0.4 : 1 },
                ]}
              />
            ))}
          </View>
          <Text style={styles.code}>{coupon.coupon_code}</Text>
          <Text style={styles.hint}>매장 직원이 이 QR/바코드를 스캔합니다</Text>
          {coupon.expires_at ? <Text style={styles.expire}>사용 기한 {coupon.expires_at}</Text> : null}
          <TouchableOpacity style={styles.close} onPress={onClose}>
            <Text style={styles.closeText}>닫기</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', padding: 20 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 22,
    alignItems: 'center',
  },
  kicker: { fontSize: 11, fontWeight: '800', color: '#E0392A', letterSpacing: 1 },
  shop: { fontSize: 18, fontWeight: '800', marginTop: 6 },
  rate: { fontSize: 14, color: '#B4530A', fontWeight: '800', marginTop: 4 },
  qr: { marginTop: 16, padding: 12, backgroundColor: '#F9FAFB', borderRadius: 16 },
  barcode: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 36,
    gap: 2,
    marginTop: 14,
  },
  bar: { height: 36, backgroundColor: '#111827' },
  code: { marginTop: 10, letterSpacing: 1.4, fontWeight: '800', color: '#374151' },
  hint: { marginTop: 6, fontSize: 12, color: '#6B7280' },
  expire: { marginTop: 4, fontSize: 12, color: '#9CA3AF' },
  close: { marginTop: 16, paddingVertical: 10, paddingHorizontal: 24 },
  closeText: { fontWeight: '800', color: '#6B7280' },
});
