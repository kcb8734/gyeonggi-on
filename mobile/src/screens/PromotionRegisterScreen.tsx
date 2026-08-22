import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator, Switch,
} from 'react-native';
import ImeTextInput from '../components/ui/ImeTextInput';
import { KOREAN_FONT_FAMILY } from '../utils/koreanFont';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import { fetchNearbyFestivals } from '../api/festivals';
import { verifyMerchant, type MerchantVerifyResult } from '../api/merchants';
import { API_BASE_URL } from '../config';
import type { FestivalPin } from '../types/map';

interface PromotionResponse {
  success: boolean;
  message: string;
  data?: {
    merchant_discount_rate: number;
    gov_matching_rate: number;
    total_discount_rate: number;
    funding_type?: string;
    matching_status?: string;
  };
}

const GOV_MATCH_CAP = 10;

export default function PromotionRegisterScreen({ merchantId }: { merchantId?: string }) {
  const [festivals, setFestivals] = useState<FestivalPin[]>([]);
  const [selectedFestivalId, setSelectedFestivalId] = useState<string>('');
  const businessNameRef = useRef('');
  const [businessNumber, setBusinessNumber] = useState('');
  const [discountRate, setDiscountRate] = useState<string>('10');
  const [quantity, setQuantity] = useState<string>('100');
  const [maxDiscountAmount, setMaxDiscountAmount] = useState<string>('5000');
  const [requestMatching, setRequestMatching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ntsResult, setNtsResult] = useState<MerchantVerifyResult | null>(null);
  const [resultBadge, setResultBadge] = useState<PromotionResponse | null>(null);

  useEffect(() => {
    fetchNearbyFestivals(merchantId ? { merchantId } : undefined)
      .then(setFestivals)
      .catch(() => Alert.alert('오류', '주변 축제 목록을 불러오지 못했습니다.'));
  }, [merchantId]);

  const preview = useMemo(() => {
    const rate = parseFloat(discountRate) || 0;
    if (!requestMatching) return { merchant: rate, gov: 0, total: rate };
    const gov = Math.min(rate, GOV_MATCH_CAP);
    return { merchant: rate, gov, total: rate + gov };
  }, [discountRate, requestMatching]);

  const handleVerify = async () => {
    const businessName = businessNameRef.current.trim();
    if (businessName.length < 1 || businessNumber.replace(/\D/g, '').length !== 10) {
      Alert.alert('알림', '상호명과 사업자등록번호 10자리를 입력해주세요.');
      return;
    }
    try {
      const verified = await verifyMerchant({
        merchantId,
        businessNumber,
        businessName,
      });
      setNtsResult(verified);
      if (!verified.success) Alert.alert('사업자 확인 실패', verified.message);
    } catch (err: any) {
      const data = err?.response?.data;
      if (data) setNtsResult(data);
      Alert.alert('사업자 확인 실패', data?.message ?? '국세청 상태조회에 실패했습니다.');
    }
  };

  const handleSubmit = async () => {
    if (!ntsResult?.data?.verified || ntsResult.data.b_stt_cd !== '01') {
      Alert.alert('알림', '국세청 계속사업자 확인 후에 등록할 수 있습니다.');
      return;
    }
    if (!selectedFestivalId) {
      Alert.alert('알림', '연계할 축제를 선택해주세요.');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post<PromotionResponse>(`${API_BASE_URL}/api/promotions`, {
        merchant_id: merchantId,
        business_name: businessNameRef.current.trim(),
        business_number: businessNumber,
        festival_id: selectedFestivalId,
        title: `${festivals.find((f) => f.id === selectedFestivalId)?.title ?? ''} 제휴 할인`,
        merchant_discount_rate: parseFloat(discountRate),
        max_discount_amount: parseFloat(maxDiscountAmount),
        total_quantity: parseInt(quantity, 10),
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        request_matching: requestMatching,
        funding_type: requestMatching ? 'MATCHED' : 'MERCHANT_ONLY',
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
      <Text style={styles.header}>사장님 자율 할인 등록</Text>
      <Text style={styles.note}>국세청 계속사업자 확인 후 상가 자체 할인은 즉시 발행됩니다. 지자체 1:1 매칭은 선택 신청입니다.</Text>

      <Text style={styles.label}>상호명</Text>
      <ImeTextInput
        style={styles.input}
        onChangeText={(text) => {
          businessNameRef.current = text;
        }}
        placeholder="예: 화성행궁 한정식"
      />

      <Text style={styles.label}>사업자등록번호 (10자리)</Text>
      <TextInput
        style={styles.input}
        keyboardType="number-pad"
        value={businessNumber}
        onChangeText={setBusinessNumber}
        placeholder="1234567890"
        maxLength={12}
      />
      <TouchableOpacity style={styles.verifyBtn} onPress={handleVerify}>
        <Text style={styles.verifyText}>국세청 사업자 상태 확인</Text>
      </TouchableOpacity>

      {ntsResult?.data && (
        <View style={[styles.badge, ntsResult.data.verified ? styles.confirmedBadge : styles.rejectBadge]}>
          <Text style={styles.badgeText}>
            {ntsResult.data.verified
              ? `계속사업자 확인 완료 (${ntsResult.data.b_stt_cd})`
              : `확인 실패: ${ntsResult.message}`}
          </Text>
        </View>
      )}

      <Text style={styles.label}>연계 축제 선택</Text>
      <View style={styles.pickerWrap}>
        <Picker selectedValue={selectedFestivalId} onValueChange={setSelectedFestivalId}>
          <Picker.Item label="축제를 선택하세요" value="" />
          {festivals.map((f) => (
            <Picker.Item key={f.id} label={`${f.title} (${f.location_name})`} value={f.id} />
          ))}
        </Picker>
      </View>

      <Text style={styles.label}>점주 할인율 (%) — 자체 할인 최대 100%</Text>
      <TextInput style={styles.input} keyboardType="numeric" value={discountRate} onChangeText={setDiscountRate} />

      <Text style={styles.label}>발급 수량</Text>
      <TextInput style={styles.input} keyboardType="numeric" value={quantity} onChangeText={setQuantity} />

      <Text style={styles.label}>건당 최대 할인 한도(원)</Text>
      <TextInput style={styles.input} keyboardType="numeric" value={maxDiscountAmount} onChangeText={setMaxDiscountAmount} />

      <View style={styles.switchRow}>
        <Text style={styles.label}>지자체 1:1 매칭 신청</Text>
        <Switch value={requestMatching} onValueChange={setRequestMatching} />
      </View>
      <Text style={styles.note}>
        끄면 상가가 할인 전액을 부담하고 즉시 쿠폰을 발행합니다. 켜면 관리자 승인 후 매칭률이 붙습니다.
      </Text>

      <View style={styles.badge}>
        <Text style={styles.badgeText}>
          {requestMatching
            ? `예상: 점주 ${preview.merchant}% + 지자체 ${preview.gov}% = 총 ${preview.total}%`
            : `상가 자체 할인 ${preview.merchant}% (지자체 매칭 없음)`}
        </Text>
      </View>

      {resultBadge?.data && (
        <View style={[styles.badge, styles.confirmedBadge]}>
          <Text style={styles.badgeText}>{resultBadge.message}</Text>
        </View>
      )}

      <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading || !ntsResult?.data?.verified}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>할인 쿠폰 등록하기</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#F7F8FA' },
  header: { fontSize: 22, fontWeight: '700', marginBottom: 8, fontFamily: KOREAN_FONT_FAMILY },
  note: { fontSize: 12, color: '#6B7280', lineHeight: 18, marginBottom: 8, fontFamily: KOREAN_FONT_FAMILY },
  label: { fontSize: 14, fontWeight: '600', marginTop: 12, marginBottom: 6, color: '#333', fontFamily: KOREAN_FONT_FAMILY },
  pickerWrap: { backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#DDD' },
  input: { backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#DDD', padding: 12, fontSize: 16, fontFamily: KOREAN_FONT_FAMILY },
  verifyBtn: { backgroundColor: '#111827', borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 10 },
  verifyText: { color: '#fff', fontWeight: '700' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  badge: { backgroundColor: '#FFF4E5', borderRadius: 12, padding: 16, marginTop: 16, borderWidth: 1, borderColor: '#FFD08A' },
  confirmedBadge: { backgroundColor: '#E7F7EC', borderColor: '#8BE0A6' },
  rejectBadge: { backgroundColor: '#FEE2E2', borderColor: '#FECACA' },
  badgeText: { fontSize: 14, fontWeight: '700', color: '#B4530A', lineHeight: 22 },
  submitBtn: { backgroundColor: '#2D6CDF', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 24, marginBottom: 40 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
