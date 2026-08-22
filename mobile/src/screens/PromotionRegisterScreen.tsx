// PromotionRegisterScreen.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import { API_BASE_URL } from '../config';

interface Festival {
  id: string;
  title: string;
  location_name: string;
}

interface PromotionResponse {
  success: boolean;
  message: string;
  data?: {
    merchant_discount_rate: number;
    gov_matching_rate: number;
    total_discount_rate: number;
  };
}

const GOV_MATCH_CAP = 10; // 프론트 미리보기용 정책 캡(%) - 실제 확정치는 서버 응답 기준

export default function PromotionRegisterScreen({ merchantId }: { merchantId: string }) {
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [selectedFestivalId, setSelectedFestivalId] = useState<string>('');
  const [discountRate, setDiscountRate] = useState<string>('5');
  const [quantity, setQuantity] = useState<string>('100');
  const [maxDiscountAmount, setMaxDiscountAmount] = useState<string>('5000');
  const [loading, setLoading] = useState(false);
  const [resultBadge, setResultBadge] = useState<PromotionResponse | null>(null);

  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/festivals/nearby?merchant_id=${merchantId}`)
      .then((res) => setFestivals(res.data.data ?? []))
      .catch(() => Alert.alert('오류', '주변 축제 목록을 불러오지 못했습니다.'));
  }, [merchantId]);

  // 실시간 예상 매칭 배지 (실제 확정값은 서버 응답으로 갱신됨)
  const previewTotalRate = useMemo(() => {
    const rate = parseFloat(discountRate) || 0;
    const gov = Math.min(rate, GOV_MATCH_CAP);
    return { merchant: rate, gov, total: rate + gov };
  }, [discountRate]);

  const handleSubmit = async () => {
    if (!selectedFestivalId) {
      Alert.alert('알림', '연계할 축제를 선택해주세요.');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post<PromotionResponse>(`${API_BASE_URL}/api/promotions`, {
        merchant_id: merchantId,
        festival_id: selectedFestivalId,
        title: `${festivals.find(f => f.id === selectedFestivalId)?.title ?? ''} 제휴 할인`,
        merchant_discount_rate: parseFloat(discountRate),
        max_discount_amount: parseFloat(maxDiscountAmount),
        total_quantity: parseInt(quantity, 10),
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
      setResultBadge(res.data);
      Alert.alert('등록 완료', res.data.message);
    } catch (err: any) {
      Alert.alert('등록 실패', err?.response?.data?.message ?? '서버 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>🏪 자율 할인 등록</Text>

      <Text style={styles.label}>연계 축제 선택</Text>
      <View style={styles.pickerWrap}>
        <Picker selectedValue={selectedFestivalId} onValueChange={setSelectedFestivalId}>
          <Picker.Item label="축제를 선택하세요" value="" />
          {festivals.map((f) => (
            <Picker.Item key={f.id} label={`${f.title} (${f.location_name})`} value={f.id} />
          ))}
        </Picker>
      </View>

      <Text style={styles.label}>점주 자율 할인율 (%)</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={discountRate}
        onChangeText={setDiscountRate}
        placeholder="예: 5"
      />

      <Text style={styles.label}>발급 수량</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={quantity}
        onChangeText={setQuantity}
      />

      <Text style={styles.label}>건당 최대 할인 한도(원)</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={maxDiscountAmount}
        onChangeText={setMaxDiscountAmount}
      />

      {/* 실시간 매칭 미리보기 배지 */}
      <View style={styles.badge}>
        <Text style={styles.badgeText}>
          🎉 지자체 지원금 1:1 매칭 예상 적용!{'\n'}
          점주 {previewTotalRate.merchant}% + 지자체 {previewTotalRate.gov}% = 고객 최종 혜택 {previewTotalRate.total}%
        </Text>
        <Text style={styles.badgeNote}>* 실제 지자체 지원 매칭률은 등록 시 예산 잔액에 따라 서버에서 최종 확정됩니다.</Text>
      </View>

      {resultBadge?.data && (
        <View style={[styles.badge, styles.confirmedBadge]}>
          <Text style={styles.badgeText}>
            ✅ 확정: 점주 {resultBadge.data.merchant_discount_rate}% + 지자체 매칭 {resultBadge.data.gov_matching_rate}%
            {'\n'}= 총 {resultBadge.data.total_discount_rate}% 할인
          </Text>
        </View>
      )}

      <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>할인 프로모션 등록하기</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#F7F8FA' },
  header: { fontSize: 22, fontWeight: '700', marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 12, marginBottom: 6, color: '#333' },
  pickerWrap: { backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#DDD' },
  input: { backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#DDD', padding: 12, fontSize: 16 },
  badge: { backgroundColor: '#FFF4E5', borderRadius: 12, padding: 16, marginTop: 20, borderWidth: 1, borderColor: '#FFD08A' },
  confirmedBadge: { backgroundColor: '#E7F7EC', borderColor: '#8BE0A6' },
  badgeText: { fontSize: 15, fontWeight: '700', color: '#B4530A', lineHeight: 22 },
  badgeNote: { fontSize: 12, color: '#8A6D3B', marginTop: 6 },
  submitBtn: { backgroundColor: '#2D6CDF', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 24, marginBottom: 40 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
