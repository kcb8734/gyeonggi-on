// FestivalMerchantMapScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import QRCode from 'react-native-qrcode-svg';
import axios from 'axios';
import { API_BASE_URL } from '../config';

interface FestivalPin { id: string; title: string; latitude: number; longitude: number; }
interface MerchantPin {
  id: string; business_name: string; category: string;
  latitude: number; longitude: number;
  total_discount_rate: number; promotion_id: string;
}

export default function FestivalMerchantMapScreen({ festivalId, userId }: { festivalId: string; userId: string; }) {
  const [festival, setFestival] = useState<FestivalPin | null>(null);
  const [merchants, setMerchants] = useState<MerchantPin[]>([]);
  const [selectedMerchant, setSelectedMerchant] = useState<MerchantPin | null>(null);
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [issuing, setIssuing] = useState(false);

  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/festivals/${festivalId}/map`)
      .then((res) => {
        setFestival(res.data.festival);
        setMerchants(res.data.merchants ?? []);
      });
  }, [festivalId]);

  const handleIssueCoupon = async () => {
    if (!selectedMerchant) return;
    setIssuing(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/coupons/issue`, {
        user_id: userId,
        promotion_id: selectedMerchant.promotion_id,
      });
      setCouponCode(res.data.data.coupon_code);
    } catch {
      setCouponCode(null);
    } finally {
      setIssuing(false);
    }
  };

  if (!festival) return null;

  return (
    <View style={{ flex: 1 }}>
      <MapView
        style={{ flex: 1 }}
        initialRegion={{
          latitude: festival.latitude,
          longitude: festival.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
      >
        {/* 축제 위치 - 빨간 핀 */}
        <Marker
          coordinate={{ latitude: festival.latitude, longitude: festival.longitude }}
          pinColor="red"
          title={festival.title}
        />

        {/* 제휴 업소 - 초록 핀 */}
        {merchants.map((m) => (
          <Marker
            key={m.id}
            coordinate={{ latitude: m.latitude, longitude: m.longitude }}
            pinColor="green"
            onPress={() => { setSelectedMerchant(m); setCouponCode(null); }}
          >
            <Callout>
              <Text>{m.business_name}</Text>
            </Callout>
          </Marker>
        ))}
      </MapView>

      <Modal visible={!!selectedMerchant} transparent animationType="slide" onRequestClose={() => setSelectedMerchant(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {selectedMerchant && (
              <>
                <Text style={styles.shopName}>{selectedMerchant.business_name}</Text>
                <Text style={styles.category}>{selectedMerchant.category}</Text>
                <View style={styles.tag}>
                  <Text style={styles.tagText}>
                    [경기온 특가] {selectedMerchant.total_discount_rate}% 상생 할인쿠폰
                  </Text>
                </View>

                {couponCode ? (
                  <View style={styles.qrWrap}>
                    <QRCode value={couponCode} size={180} />
                    <Text style={styles.couponCodeText}>{couponCode}</Text>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.downloadBtn} onPress={handleIssueCoupon} disabled={issuing}>
                    <Text style={styles.downloadText}>{issuing ? '발급 중...' : '쿠폰 다운로드 (QR 생성)'}</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedMerchant(null)}>
                  <Text style={styles.closeText}>닫기</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, alignItems: 'center' },
  shopName: { fontSize: 20, fontWeight: '700' },
  category: { fontSize: 14, color: '#888', marginTop: 4 },
  tag: { backgroundColor: '#FFEAEA', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginTop: 12 },
  tagText: { color: '#E0392A', fontWeight: '700', fontSize: 13 },
  qrWrap: { alignItems: 'center', marginTop: 20 },
  couponCodeText: { marginTop: 8, fontSize: 12, color: '#666', letterSpacing: 1 },
  downloadBtn: { backgroundColor: '#2D6CDF', borderRadius: 10, paddingVertical: 14, paddingHorizontal: 32, marginTop: 20 },
  downloadText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  closeBtn: { marginTop: 16, padding: 10 },
  closeText: { color: '#999' },
});
