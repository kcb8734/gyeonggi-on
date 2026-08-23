import React from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import type { MerchantPin } from '../../types/map';
import ModalExitButton from '../ui/ModalExitButton';

interface Props {
  merchant: MerchantPin | null;
  couponCode: string | null;
  issuing: boolean;
  error: string | null;
  onIssue: () => void;
  onClose: () => void;
}

export default function MerchantCouponSheet({
  merchant,
  couponCode,
  issuing,
  error,
  onIssue,
  onClose,
}: Props) {
  return (
    <Modal visible={!!merchant} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.card}>
          {merchant && (
            <>
              <View style={styles.handle} />
              <ModalExitButton onPress={onClose} />
              <Text style={styles.shopName}>{merchant.business_name}</Text>
              <Text style={styles.category}>{merchant.category}</Text>
              {merchant.address ? <Text style={styles.address}>{merchant.address}</Text> : null}

              <View style={styles.tag}>
                <Text style={styles.tagText}>
                  [온앤온 특가] {merchant.total_discount_rate}% 상생 할인쿠폰
                </Text>
              </View>

              {merchant.max_discount_amount != null ? (
                <Text style={styles.meta}>건당 최대 {merchant.max_discount_amount.toLocaleString()}원 할인</Text>
              ) : null}
              {merchant.remaining_quantity != null ? (
                <Text style={styles.meta}>남은 수량 {merchant.remaining_quantity.toLocaleString()}장</Text>
              ) : null}

              {couponCode ? (
                <View style={styles.qrWrap}>
                  <QRCode value={couponCode} size={180} />
                  <Text style={styles.couponCodeText}>{couponCode}</Text>
                  <Text style={styles.qrHint}>매장에서 이 QR을 보여주세요</Text>
                </View>
              ) : (
                <TouchableOpacity style={styles.downloadBtn} onPress={onIssue} disabled={issuing}>
                  {issuing ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.downloadText}>쿠폰 다운로드 (QR 생성)</Text>
                  )}
                </TouchableOpacity>
              )}

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <Text style={styles.closeText}>닫기</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  card: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#D1D5DB', marginBottom: 16 },
  shopName: { fontSize: 20, fontWeight: '700' },
  category: { fontSize: 14, color: '#888', marginTop: 4 },
  address: { fontSize: 12, color: '#6B7280', marginTop: 6, textAlign: 'center' },
  tag: {
    backgroundColor: '#FFEAEA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 12,
  },
  tagText: { color: '#E0392A', fontWeight: '700', fontSize: 13 },
  meta: { fontSize: 12, color: '#6B7280', marginTop: 6 },
  qrWrap: { alignItems: 'center', marginTop: 20 },
  couponCodeText: { marginTop: 8, fontSize: 12, color: '#666', letterSpacing: 1 },
  qrHint: { marginTop: 4, fontSize: 12, color: '#9CA3AF' },
  downloadBtn: {
    backgroundColor: '#2D6CDF',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 20,
    minWidth: 220,
    alignItems: 'center',
  },
  downloadText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  errorText: { color: '#DC2626', marginTop: 12, fontSize: 13, textAlign: 'center' },
  closeBtn: { marginTop: 16, padding: 10 },
  closeText: { color: '#999' },
});
