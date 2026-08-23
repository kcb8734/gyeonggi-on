import React from 'react';
import { Image, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { WalletCoupon } from '../../stores/appStore';
import ModalExitButton from './ModalExitButton';

interface Props {
  coupon: WalletCoupon | null;
  onClose: () => void;
  onUse: (coupon: WalletCoupon) => void;
}

export default function ProofPhotoModal({ coupon, onClose, onUse }: Props) {
  if (!coupon) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.card}>
          <ModalExitButton onPress={onClose} />
          <Text style={styles.kicker}>행사 참여 인증사진</Text>
          <Text style={styles.title}>{coupon.festival_title ?? coupon.title}</Text>
          {coupon.proofImageUrl ? (
            <Image source={{ uri: coupon.proofImageUrl }} style={styles.photo} resizeMode="contain" />
          ) : (
            <View style={[styles.photo, styles.fallback]}>
              <Text style={styles.fallbackText}>인증사진이 없습니다</Text>
            </View>
          )}
          <Text style={styles.shop}>{coupon.business_name}</Text>
          <Text style={styles.hint}>사진을 확인한 뒤 해당 행사 상가에서 쿠폰을 사용하세요.</Text>
          <TouchableOpacity style={styles.use} onPress={() => onUse(coupon)}>
            <Text style={styles.useText}>확인 후 이 상가에서 쿠폰 사용</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={styles.close}>
            <Text style={styles.closeText}>닫기</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', padding: 16 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.72)' },
  card: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
  },
  kicker: { color: '#FCA5A5', fontSize: 11, fontWeight: '800' },
  title: { color: '#fff', fontSize: 16, fontWeight: '800', marginTop: 6, textAlign: 'center' },
  photo: {
    width: '100%',
    height: 280,
    borderRadius: 14,
    backgroundColor: '#1F2937',
    marginTop: 12,
  },
  fallback: { alignItems: 'center', justifyContent: 'center' },
  fallbackText: { color: '#9CA3AF', fontWeight: '700' },
  shop: { color: '#E5E7EB', fontWeight: '800', marginTop: 12 },
  hint: { color: '#9CA3AF', fontSize: 12, marginTop: 6, textAlign: 'center', lineHeight: 18 },
  use: {
    marginTop: 14,
    backgroundColor: '#E0392A',
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
    width: '100%',
    alignItems: 'center',
  },
  useText: { color: '#fff', fontWeight: '800' },
  close: { marginTop: 10, paddingVertical: 8 },
  closeText: { color: '#9CA3AF', fontWeight: '800' },
});
