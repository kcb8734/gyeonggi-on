import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator, Switch, Image, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import IsolatedImeField from '../components/ui/IsolatedImeField';
import { readLiveImeValue } from '../utils/nativeImeHost';
import { KOREAN_FONT_FAMILY } from '../utils/koreanFont';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import * as Location from 'expo-location';
import { fetchNearbyFestivals } from '../api/festivals';
import { verifyMerchant, type MerchantVerifyResult } from '../api/merchants';
import { API_BASE_URL } from '../config';
import type { FestivalPin } from '../types/map';
import { addLocalPromotion, incrementPromotionQr, useAppState } from '../stores/appStore';
import { pickFromCamera, pickPhotoFromGallery } from '../utils/pickImage';
import { matchingAmountWon, openSettlementMail } from '../utils/settlementMail';

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

function ShopPhotoSlot({
  label,
  uri,
  onChange,
}: {
  label: string;
  uri: string;
  onChange: (next: string) => void;
}) {
  return (
    <View style={styles.photoCol}>
      {uri ? <Image source={{ uri }} style={styles.shopPhoto} /> : <View style={styles.shopPhoto} />}
      <Text style={styles.photoCaption}>{label}</Text>
      <View style={styles.photoActions}>
        <TouchableOpacity
          style={styles.photoBtn}
          onPress={async () => {
            const next = await pickFromCamera();
            if (next) onChange(next);
          }}
        >
          <Text style={styles.photoBtnText}>사진 촬영</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.photoBtnGhost}
          onPress={async () => {
            const next = await pickPhotoFromGallery();
            if (next) onChange(next);
          }}
        >
          <Text style={styles.photoBtnGhostText}>갤러리 선택</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function PromotionRegisterScreen({ merchantId }: { merchantId?: string }) {
  const navigation = useNavigation<any>();
  const app = useAppState();
  const [festivals, setFestivals] = useState<FestivalPin[]>([]);
  const [selectedFestivalId, setSelectedFestivalId] = useState<string>('');
  const businessNameRef = useRef('');
  const businessNumberRef = useRef('');
  const mainMenuRef = useRef('');
  const featuresRef = useRef('');
  const addressRef = useRef('');
  const [discountRate, setDiscountRate] = useState<string>('10');
  const [quantity, setQuantity] = useState<string>('100');
  const [maxDiscountAmount, setMaxDiscountAmount] = useState<string>('5000');
  const [requestMatching, setRequestMatching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [ntsResult, setNtsResult] = useState<MerchantVerifyResult | null>(null);
  const [resultBadge, setResultBadge] = useState<PromotionResponse | null>(null);
  const [exteriorUrl, setExteriorUrl] = useState('');
  const [interiorUrl, setInteriorUrl] = useState('');
  const [gps, setGps] = useState<{ latitude: number; longitude: number } | null>(null);
  const [gpsConfirmed, setGpsConfirmed] = useState(false);
  const [gpsLabel, setGpsLabel] = useState('위치 확인 중...');
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankHolder, setBankHolder] = useState('');
  const [settlementEmail, setSettlementEmail] = useState('');
  const [qrCount, setQrCount] = useState(0);
  const [lastQrNote, setLastQrNote] = useState('');
  const [savedPromoId, setSavedPromoId] = useState('');

  useEffect(() => {
    fetchNearbyFestivals(merchantId ? { merchantId } : undefined)
      .then((pins) => {
        const locals = app.localFestivals.map((item) => ({
          id: item.id,
          title: item.title,
          location_name: item.location_name,
          latitude: item.latitude,
          longitude: item.longitude,
          municipality_name: item.municipality_name,
          managerEmail: item.managerEmail,
          tel: item.inquiryTel || item.tel,
        }));
        const extra = locals.filter((item) => !pins.some((pin) => pin.id === item.id));
        setFestivals([...extra, ...pins]);
      })
      .catch(() => Alert.alert('오류', '주변 축제 목록을 불러오지 못했습니다.'));
  }, [merchantId, app.localFestivals]);

  useEffect(() => {
    const selected = festivals.find((item) => item.id === selectedFestivalId);
    if (selected?.managerEmail) setSettlementEmail(selected.managerEmail);
  }, [selectedFestivalId, festivals]);

  useEffect(() => {
    const apply = (latitude: number, longitude: number) => {
      setGps({ latitude, longitude });
      setGpsLabel(`GPS ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
    };
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => apply(pos.coords.latitude, pos.coords.longitude),
        () => setGpsLabel('위치 권한을 허용하면 GPS를 확인할 수 있습니다'),
        { enableHighAccuracy: true, timeout: 8000 },
      );
      return;
    }
    Location.requestForegroundPermissionsAsync()
      .then((permission) => (permission.granted ? Location.getCurrentPositionAsync({}) : null))
      .then((pos) => {
        if (!pos) {
          setGpsLabel('위치 권한을 허용하면 GPS를 확인할 수 있습니다');
          return;
        }
        apply(pos.coords.latitude, pos.coords.longitude);
      })
      .catch(() => setGpsLabel('위치 권한을 허용하면 GPS를 확인할 수 있습니다'));
  }, []);

  const preview = useMemo(() => {
    const rate = parseFloat(discountRate) || 0;
    if (!requestMatching) return { merchant: rate, gov: 0, total: rate };
    const gov = Math.min(rate, GOV_MATCH_CAP);
    return { merchant: rate, gov, total: rate + gov };
  }, [discountRate, requestMatching]);

  const matchPreview = useMemo(
    () => matchingAmountWon({
      maxDiscountAmount: parseFloat(maxDiscountAmount) || 0,
      govRate: preview.gov,
      qrCount,
    }),
    [maxDiscountAmount, preview.gov, qrCount],
  );

  const handleVerify = async () => {
    if (typeof document !== 'undefined') {
      const active = document.activeElement as HTMLElement | null;
      active?.blur?.();
      document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[data-onandon-ime-field]').forEach((el) => {
        el.dispatchEvent(new Event('change', { bubbles: true }));
      });
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
    const businessName = (readLiveImeValue('businessName') || businessNameRef.current).trim();
    const businessNumber = (readLiveImeValue('businessNumber') || businessNumberRef.current).replace(/\D/g, '');
    if (businessName.length < 1 || businessNumber.length !== 10) {
      setNtsResult({ success: false, message: '상호명과 사업자등록번호 10자리를 입력해주세요.' });
      return;
    }
    setVerifying(true);
    try {
      const verified = await verifyMerchant({
        merchantId,
        businessNumber,
        businessName,
      });
      setNtsResult(verified);
    } catch (err: any) {
      const data = err?.response?.data;
      setNtsResult(data ?? { success: false, message: data?.message ?? '국세청 상태조회에 실패했습니다.' });
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async () => {
    if (!ntsResult?.data?.verified || ntsResult.data.b_stt_cd !== '01') {
      Alert.alert('알림', '국세청 계속사업자 확인 후에 등록할 수 있습니다.');
      return;
    }
    const businessName = (readLiveImeValue('businessName') || businessNameRef.current).trim();
    const businessNumber = (readLiveImeValue('businessNumber') || businessNumberRef.current).replace(/\D/g, '');
    const mainMenu = (readLiveImeValue('mainMenu') || mainMenuRef.current).trim();
    const features = (readLiveImeValue('features') || featuresRef.current).trim();
    const address = (readLiveImeValue('address') || addressRef.current).trim();
    if (!mainMenu || !features) {
      Alert.alert('알림', '주요 메뉴와 특징을 입력한 뒤 쿠폰을 등록해주세요.');
      return;
    }
    if (!exteriorUrl || !interiorUrl) {
      Alert.alert('알림', '가게 외부·내부 사진을 각각 1장씩 올려주세요.');
      return;
    }
    if (!address) {
      Alert.alert('알림', '위치 등록 주소를 입력해주세요.');
      return;
    }
    if (!gpsConfirmed || !gps) {
      Alert.alert('알림', 'GPS 좌표를 확인한 뒤 체크해주세요.');
      return;
    }
    if (!selectedFestivalId) {
      Alert.alert('알림', '연계할 축제를 선택해주세요.');
      return;
    }
    if (requestMatching) {
      if (!bankName.trim() || !bankAccount.replace(/\D/g, '') || !bankHolder.trim()) {
        Alert.alert('알림', '지자체 매칭 시 사업자 통장 은행·계좌·예금주를 입력해주세요.');
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settlementEmail.trim())) {
        Alert.alert('알림', '정산을 받을 지자체 담당자 메일을 입력해주세요.');
        return;
      }
    }
    setLoading(true);
    try {
      const res = await axios.post<PromotionResponse>(`${API_BASE_URL}/api/promotions`, {
        merchant_id: merchantId,
        business_name: businessName,
        business_number: businessNumber,
        festival_id: selectedFestivalId,
        main_menu: mainMenu,
        features,
        title: `${festivals.find((f) => f.id === selectedFestivalId)?.title ?? ''} 제휴 할인`,
        merchant_discount_rate: parseFloat(discountRate),
        max_discount_amount: parseFloat(maxDiscountAmount),
        total_quantity: parseInt(quantity, 10),
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        request_matching: requestMatching,
        funding_type: requestMatching ? 'MATCHED' : 'MERCHANT_ONLY',
        address,
        latitude: gps.latitude,
        longitude: gps.longitude,
        gps_confirmed: gpsConfirmed,
        exterior_image_url: exteriorUrl,
        interior_image_url: interiorUrl,
        bank_name: bankName.trim(),
        bank_account: bankAccount.trim(),
        bank_holder: bankHolder.trim(),
        manager_email: settlementEmail.trim(),
        qr_confirm_count: qrCount,
      });
      const festival = festivals.find((f) => f.id === selectedFestivalId);
      const promoId = `local-${Date.now()}`;
      addLocalPromotion({
        id: promoId,
        title: `${festival?.title ?? ''} 제휴 할인`,
        festival_id: selectedFestivalId,
        festival_title: festival?.title,
        business_name: businessName,
        merchant_discount_rate: parseFloat(discountRate) || 0,
        gov_matching_rate: requestMatching ? Math.min(parseFloat(discountRate) || 0, 10) : 0,
        total_discount_rate: requestMatching
          ? (parseFloat(discountRate) || 0) + Math.min(parseFloat(discountRate) || 0, 10)
          : (parseFloat(discountRate) || 0),
        remaining_quantity: parseInt(quantity, 10) || 0,
        funding_type: requestMatching ? 'MATCHED' : 'MERCHANT_ONLY',
        metro: 'GYEONGGI',
        municipality_name: festival?.municipality_name,
        main_menu: mainMenu,
        features,
        exterior_image_url: exteriorUrl,
        interior_image_url: interiorUrl,
        address,
        latitude: gps.latitude,
        longitude: gps.longitude,
        gps_confirmed: true,
        bankName: bankName.trim(),
        bankAccount: bankAccount.trim(),
        bankHolder: bankHolder.trim(),
        managerEmail: settlementEmail.trim(),
        qrConfirmCount: qrCount,
        maxDiscountAmount: parseFloat(maxDiscountAmount) || 0,
      });
      setSavedPromoId(promoId);
      setResultBadge(res.data);
      Alert.alert('등록 완료', res.data.message);
    } catch (err: any) {
      const festival = festivals.find((f) => f.id === selectedFestivalId);
      const promoId = `local-${Date.now()}`;
      addLocalPromotion({
        id: promoId,
        title: `${festival?.title ?? businessName} 제휴 할인`,
        festival_id: selectedFestivalId,
        festival_title: festival?.title,
        business_name: businessName,
        merchant_discount_rate: parseFloat(discountRate) || 0,
        gov_matching_rate: requestMatching ? Math.min(parseFloat(discountRate) || 0, 10) : 0,
        total_discount_rate: requestMatching
          ? (parseFloat(discountRate) || 0) + Math.min(parseFloat(discountRate) || 0, 10)
          : (parseFloat(discountRate) || 0),
        remaining_quantity: parseInt(quantity, 10) || 0,
        funding_type: requestMatching ? 'MATCHED' : 'MERCHANT_ONLY',
        metro: 'GYEONGGI',
        municipality_name: festival?.municipality_name,
        main_menu: mainMenu,
        features,
        exterior_image_url: exteriorUrl,
        interior_image_url: interiorUrl,
        address,
        latitude: gps?.latitude,
        longitude: gps?.longitude,
        gps_confirmed: gpsConfirmed,
        bankName: bankName.trim(),
        bankAccount: bankAccount.trim(),
        bankHolder: bankHolder.trim(),
        managerEmail: settlementEmail.trim(),
        qrConfirmCount: qrCount,
        maxDiscountAmount: parseFloat(maxDiscountAmount) || 0,
      });
      setSavedPromoId(promoId);
      Alert.alert('미리보기 등록', err?.response?.data?.message ?? '서버 미연결 시에도 홈 할인쿠폰에 미리보기로 올렸습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled" keyboardDismissMode="none">
      <TouchableOpacity onPress={() => navigation.goBack()} style={{ alignSelf: 'flex-start', backgroundColor: '#111827', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12 }}>
        <Text style={{ color: '#fff', fontWeight: '800' }}>‹ 나가기</Text>
      </TouchableOpacity>
      <Text style={styles.header}>할인 쿠폰 등록</Text>
      <Text style={styles.note}>국세청 계속사업자 확인 후 상가 자체 할인은 즉시 발행됩니다. 지자체 1:1 매칭은 선택 신청입니다.</Text>

      <Text style={styles.label}>상호명</Text>
      <IsolatedImeField
        fieldKey="businessName"
        valueRef={businessNameRef}
        placeholder="예: 화성행궁 한정식"
        inputMode="text"
      />

      <Text style={styles.label}>사업자등록번호 (10자리)</Text>
      <IsolatedImeField
        fieldKey="businessNumber"
        valueRef={businessNumberRef}
        placeholder="1234567890"
        inputMode="numeric"
        maxLength={12}
      />
      <TouchableOpacity style={styles.verifyBtn} onPress={handleVerify} disabled={verifying}>
        {verifying ? <ActivityIndicator color="#fff" /> : <Text style={styles.verifyText}>국세청 사업자 상태 확인</Text>}
      </TouchableOpacity>

      {ntsResult && (
        <View style={[styles.badge, ntsResult.data?.verified ? styles.confirmedBadge : styles.rejectBadge]}>
          <Text style={styles.badgeText}>
            {ntsResult.data?.verified
              ? `계속사업자 확인 완료 (${ntsResult.data.b_stt_cd})`
              : `확인 실패: ${ntsResult.message}`}
          </Text>
        </View>
      )}

      {ntsResult?.data?.verified ? (
        <View style={styles.introBox}>
          <Text style={styles.note}>사업자 확인이 끝났습니다. 쿠폰 등록 전에 상가를 소개해 주세요.</Text>
          <Text style={styles.label}>주요 메뉴</Text>
          <IsolatedImeField
            fieldKey="mainMenu"
            valueRef={mainMenuRef}
            placeholder="예: 궁중갈비탕, 수원왕갈비, 김치찌개"
            multiline
          />
          <Text style={styles.label}>특징</Text>
          <IsolatedImeField
            fieldKey="features"
            valueRef={featuresRef}
            placeholder="예: 행궁 앞 30년 노포, 당일 손질 고기"
            multiline
          />
          <Text style={styles.label}>가게 사진 (외부 · 내부 각 1장)</Text>
          <Text style={styles.note}>촬영은 카메라, 갤러리 선택은 앨범에서 고를 수 있습니다.</Text>
          <View style={styles.photoRow}>
            <ShopPhotoSlot label="외부 사진" uri={exteriorUrl} onChange={setExteriorUrl} />
            <ShopPhotoSlot label="내부 사진" uri={interiorUrl} onChange={setInteriorUrl} />
          </View>
          <Text style={styles.label}>위치 등록 주소</Text>
          <IsolatedImeField
            fieldKey="address"
            valueRef={addressRef}
            placeholder="예: 경기도 수원시 팔달구 정조로 825"
          />
          <Text style={styles.label}>GPS 확인</Text>
          <Text style={styles.gps}>{gpsLabel}</Text>
          <View style={styles.switchRow}>
            <Text style={styles.label}>위 좌표가 가게 위치와 일치합니다</Text>
            <Switch value={gpsConfirmed} onValueChange={setGpsConfirmed} />
          </View>
        </View>
      ) : null}

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

      {requestMatching ? (
        <View style={styles.matchBox}>
          <Text style={styles.matchTitle}>사업자 통장 · 매칭 정산</Text>
          <Text style={styles.note}>QR 확인 건수만큼 지자체 담당자 메일로 정산 입금 요청을 보냅니다.</Text>
          <Text style={styles.label}>은행명</Text>
          <TextInput style={styles.input} value={bankName} onChangeText={setBankName} placeholder="예: 농협" />
          <Text style={styles.label}>계좌번호</Text>
          <TextInput
            style={styles.input}
            value={bankAccount}
            onChangeText={setBankAccount}
            placeholder="숫자만 입력"
            keyboardType="number-pad"
          />
          <Text style={styles.label}>예금주</Text>
          <TextInput style={styles.input} value={bankHolder} onChangeText={setBankHolder} placeholder="사업자 통장 예금주" />
          <Text style={styles.label}>지자체 담당자 메일</Text>
          <TextInput
            style={styles.input}
            value={settlementEmail}
            onChangeText={setSettlementEmail}
            placeholder="축제 등록 시 확인한 담당자 메일"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <View style={styles.qrBox}>
            <Text style={styles.matchTitle}>쿠폰 확인 QR 촬영</Text>
            <Text style={styles.qrCount}>{qrCount.toLocaleString('ko-KR')}건</Text>
            <Text style={styles.note}>카운터에서 손님 QR을 촬영하면 확인 건수가 올라갑니다.</Text>
            <View style={styles.photoActions}>
              <TouchableOpacity style={styles.photoBtn} onPress={async () => {
                const uri = await pickFromCamera();
                if (!uri) return;
                setQrCount((prev) => prev + 1);
                setLastQrNote(`카메라 확인 ${new Date().toLocaleTimeString('ko-KR')}`);
                if (savedPromoId) incrementPromotionQr(savedPromoId);
              }}>
                <Text style={styles.photoBtnText}>QR 촬영</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoBtnGhost} onPress={async () => {
                const uri = await pickPhotoFromGallery();
                if (!uri) return;
                setQrCount((prev) => prev + 1);
                setLastQrNote(`갤러리 QR ${new Date().toLocaleTimeString('ko-KR')}`);
                if (savedPromoId) incrementPromotionQr(savedPromoId);
              }}>
                <Text style={styles.photoBtnGhostText}>갤러리 QR</Text>
              </TouchableOpacity>
            </View>
            {lastQrNote ? <Text style={styles.verifyHint}>{lastQrNote}</Text> : null}
            <View style={styles.settleRow}>
              <Text style={styles.settleLabel}>건당 매칭</Text>
              <Text style={styles.settleValue}>{matchPreview.perUse.toLocaleString('ko-KR')}원</Text>
            </View>
            <View style={styles.settleRow}>
              <Text style={styles.settleLabel}>정산 요청액</Text>
              <Text style={styles.settleValue}>{matchPreview.total.toLocaleString('ko-KR')}원</Text>
            </View>
            <TouchableOpacity
              style={styles.mailBtn}
              onPress={() => {
                const festival = festivals.find((item) => item.id === selectedFestivalId);
                const businessName = (readLiveImeValue('businessName') || businessNameRef.current).trim() || '제휴상가';
                openSettlementMail({
                  to: settlementEmail,
                  businessName,
                  festivalTitle: festival?.title,
                  bankName,
                  bankAccount,
                  bankHolder,
                  qrCount,
                  amountWon: matchPreview.total,
                }).catch(() => Alert.alert('알림', '메일 앱을 열 수 없습니다. 담당자 메일을 확인해주세요.'));
              }}
            >
              <Text style={styles.mailBtnText}>담당자 메일로 정산 입금 요청</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

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
  introBox: {
    marginTop: 16,
    backgroundColor: '#EEF2FF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  photoRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  photoCol: { flex: 1, alignItems: 'center' },
  shopPhoto: { width: '100%', height: 110, borderRadius: 12, backgroundColor: '#E5E7EB' },
  photoBtn: {
    marginTop: 8,
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingVertical: 10,
    width: '100%',
    alignItems: 'center',
  },
  photoBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  photoBtnGhost: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 10,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  photoBtnGhostText: { color: '#111827', fontWeight: '800', fontSize: 12 },
  photoCaption: { marginTop: 8, fontWeight: '800', color: '#111827', fontSize: 12 },
  photoActions: { width: '100%' },
  gps: { fontSize: 13, color: '#2563EB', fontWeight: '700', marginBottom: 4 },
  matchBox: {
    marginTop: 16,
    backgroundColor: '#ECFDF5',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  matchTitle: { fontSize: 15, fontWeight: '800', color: '#065F46' },
  qrBox: {
    marginTop: 14,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  qrCount: { fontSize: 28, fontWeight: '900', color: '#111827', marginTop: 4 },
  verifyHint: { marginTop: 8, fontSize: 12, fontWeight: '700', color: '#047857' },
  settleRow: { marginTop: 8, flexDirection: 'row', justifyContent: 'space-between' },
  settleLabel: { fontSize: 13, fontWeight: '700', color: '#6B7280' },
  settleValue: { fontSize: 14, fontWeight: '800', color: '#111827' },
  mailBtn: {
    marginTop: 12,
    backgroundColor: '#047857',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  mailBtnText: { color: '#fff', fontWeight: '800' },
});
