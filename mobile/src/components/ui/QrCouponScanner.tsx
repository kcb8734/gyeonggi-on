import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useCouponCode, verifyCouponCode, type ScannedCoupon } from '../../api/couponScan';
import { normalizeCouponCode } from '../../utils/couponToken';
import ModalExitButton from './ModalExitButton';

const HTML5_QR_SRC = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';

function loadHtml5Qrcode(): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();
  const w = window as unknown as { Html5Qrcode?: unknown };
  if (w.Html5Qrcode) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${HTML5_QR_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      return;
    }
    const script = document.createElement('script');
    script.src = HTML5_QR_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('html5-qrcode 로드 실패'));
    document.body.appendChild(script);
  });
}

export default function QrCouponScanner({
  merchantId,
  readerId = 'onandon-qr-reader',
  onUsed,
}: {
  merchantId?: string;
  readerId?: string;
  onUsed?: (coupon: ScannedCoupon) => void;
}) {
  const [manual, setManual] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [coupon, setCoupon] = useState<ScannedCoupon | null>(null);
  const [cameraReady, setCameraReady] = useState(Platform.OS !== 'web');
  const handled = useRef('');

  const handleCode = async (code: string) => {
    const token = normalizeCouponCode(code);
    if (!token || handled.current === token || busy) return;
    handled.current = token;
    setBusy(true);
    setError('');
    const result = await verifyCouponCode(token);
    setBusy(false);
    if (!result.success || !result.data) {
      handled.current = '';
      setError(result.message);
      return;
    }
    setCoupon(result.data);
  };

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return undefined;
    let scanner: { start: Function; stop: Function } | null = null;
    let cancelled = false;
    loadHtml5Qrcode()
      .then(async () => {
        if (cancelled) return;
        const Html5Qrcode = (window as unknown as { Html5Qrcode: new (id: string) => { start: Function; stop: Function } }).Html5Qrcode;
        const host = document.getElementById(readerId);
        if (!Html5Qrcode || !host) return;
        scanner = new Html5Qrcode(readerId);
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 8, qrbox: 220 },
          (text: string) => { void handleCode(text); },
        );
        if (!cancelled) setCameraReady(true);
      })
      .catch(() => {
        if (!cancelled) setCameraReady(true);
      });
    return () => {
      cancelled = true;
      scanner?.stop?.().catch(() => undefined);
    };
  }, [readerId]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>QR 쿠폰 스캔</Text>
      <Text style={styles.lead}>손님 쿠폰함 QR만 인식합니다. 일반 사물 사진은 집계되지 않습니다.</Text>
      {Platform.OS === 'web'
        ? React.createElement('div', { id: readerId, style: { height: 240, background: '#111827', borderRadius: 12, overflow: 'hidden', marginBottom: 10 } })
        : <Text style={styles.note}>앱에서는 코드 입력으로 확인할 수 있습니다.</Text>}
      {!cameraReady ? <ActivityIndicator /> : null}
      <TextInput
        style={styles.input}
        value={manual}
        onChangeText={setManual}
        autoCapitalize="none"
        placeholder="GGON-SW-1042"
      />
      <TouchableOpacity style={styles.btn} onPress={() => handleCode(manual)}>
        <Text style={styles.btnText}>코드 확인</Text>
      </TouchableOpacity>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal visible={Boolean(coupon)} transparent animationType="fade" onRequestClose={() => setCoupon(null)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <ModalExitButton onPress={() => { setCoupon(null); handled.current = ''; }} />
            <Text style={styles.kicker}>쿠폰 확인</Text>
            <Text style={styles.couponTitle}>{coupon?.title}</Text>
            <Text style={styles.meta}>할인 {coupon?.discountAmount?.toLocaleString('ko-KR')}원</Text>
            <Text style={styles.meta}>QR ID {coupon?.code}</Text>
            <TouchableOpacity
              style={styles.btn}
              onPress={async () => {
                if (!coupon) return;
                setBusy(true);
                const used = await useCouponCode(coupon.code, merchantId);
                setBusy(false);
                if (!used.success) {
                  setError(used.message);
                  return;
                }
                setCoupon(null);
                handled.current = '';
                onUsed?.(used.data ?? coupon);
              }}
            >
              <Text style={styles.btnText}>{busy ? '처리 중...' : '사용하기'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 14 },
  title: { fontSize: 16, fontWeight: '800', color: '#111827' },
  lead: { fontSize: 12, color: '#4B5563', marginTop: 4, marginBottom: 10, fontWeight: '600' },
  note: { fontSize: 12, color: '#6B7280', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, padding: 12, fontSize: 15, backgroundColor: '#F9FAFB' },
  btn: { marginTop: 10, backgroundColor: '#111827', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '800' },
  error: { marginTop: 8, color: '#B91C1C', fontWeight: '700', fontSize: 12 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 20 },
  sheet: { backgroundColor: '#fff', borderRadius: 16, padding: 18, paddingTop: 44 },
  kicker: { fontSize: 12, fontWeight: '800', color: '#0F766E' },
  couponTitle: { fontSize: 20, fontWeight: '800', marginTop: 4 },
  meta: { fontSize: 13, color: '#4B5563', marginTop: 6, fontWeight: '600' },
});
