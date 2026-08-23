import React, { useState } from 'react';
import { Image, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { AttendanceProofKind, WalletCoupon } from '../../stores/appStore';
import ModalExitButton from './ModalExitButton';

interface Props {
  visible: boolean;
  imageUrl?: string;
  festivalTitle?: string;
  capturedAt?: string;
  kind?: AttendanceProofKind;
  coupons: WalletCoupon[];
  onClose: () => void;
  onUse: (coupon: WalletCoupon) => void;
}

const KIND_LABEL: Record<AttendanceProofKind, string> = {
  qr: '행사장 참석 QR',
  venue: '행사장 배경 촬영',
  upload: '업로드 사진',
};

export default function ProofPhotoModal({
  visible,
  imageUrl,
  festivalTitle,
  capturedAt,
  kind,
  coupons,
  onClose,
  onUse,
}: Props) {
  const [picking, setPicking] = useState(false);
  const issued = coupons.filter((item) => item.status === 'ISSUED');

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.card}>
          <ModalExitButton onPress={onClose} />
          <Text style={styles.kicker}>행사 참석 확인</Text>
          <Text style={styles.title}>{festivalTitle ?? '행사 참석 이미지'}</Text>
          {kind ? <Text style={styles.kind}>{KIND_LABEL[kind]}</Text> : null}
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.photo} resizeMode="contain" />
          ) : (
            <View style={[styles.photo, styles.fallback]}>
              <Text style={styles.fallbackText}>참석 이미지가 없습니다</Text>
            </View>
          )}
          {capturedAt ? <Text style={styles.meta}>{new Date(capturedAt).toLocaleString('ko-KR')}</Text> : null}
          <Text style={styles.hint}>상가 관계자가 이 사진을 확인한 뒤 쿠폰을 결제하세요.</Text>
          {picking ? (
            <View style={styles.pickBox}>
              <Text style={styles.pickLead}>결제할 쿠폰을 선택하세요</Text>
              {issued.length === 0 ? (
                <Text style={styles.fallbackText}>사용 가능한 쿠폰이 없습니다</Text>
              ) : (
                issued.map((coupon) => (
                  <TouchableOpacity key={coupon.id} style={styles.pickItem} onPress={() => onUse(coupon)}>
                    <Text style={styles.pickShop}>{coupon.business_name}</Text>
                    <Text style={styles.pickRate}>{coupon.total_discount_rate}% · {coupon.coupon_code}</Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          ) : (
            <TouchableOpacity
              style={styles.use}
              onPress={() => {
                if (issued.length === 1) {
                  onUse(issued[0]);
                  return;
                }
                setPicking(true);
              }}
              disabled={!imageUrl}
            >
              <Text style={styles.useText}>확인 후 쿠폰 결제</Text>
            </TouchableOpacity>
          )}
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
  kind: { color: '#FDE68A', fontSize: 12, fontWeight: '800', marginTop: 4 },
  photo: {
    width: '100%',
    height: 240,
    borderRadius: 14,
    backgroundColor: '#1F2937',
    marginTop: 12,
  },
  fallback: { alignItems: 'center', justifyContent: 'center' },
  fallbackText: { color: '#9CA3AF', fontWeight: '700' },
  meta: { color: '#D1D5DB', fontSize: 12, fontWeight: '700', marginTop: 8 },
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
  pickBox: { width: '100%', marginTop: 12, gap: 8 },
  pickLead: { color: '#E5E7EB', fontWeight: '800', marginBottom: 4 },
  pickItem: {
    backgroundColor: '#1F2937',
    borderRadius: 10,
    padding: 12,
  },
  pickShop: { color: '#fff', fontWeight: '800' },
  pickRate: { color: '#FCA5A5', fontSize: 12, fontWeight: '700', marginTop: 4 },
  close: { marginTop: 10, paddingVertical: 8 },
  closeText: { color: '#9CA3AF', fontWeight: '800' },
});
