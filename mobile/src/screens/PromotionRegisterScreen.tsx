import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator, Switch, Image, Platform,
} from 'react-native';
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
import { addLocalPromotion, settlePromotion, useAppState } from '../stores/appStore';
import { logoutMerchant, useMerchantState } from '../stores/merchantStore';
import MerchantAuthPanel from '../components/ui/MerchantAuthPanel';
import QrCouponScanner from '../components/ui/QrCouponScanner';
import type { HomePromotion, QrScanRecord } from '../types/home';
import { pickFromCamera, pickPhotoFromGallery } from '../utils/pickImage';
import { downloadSettlementPdf, sendSettlementDocumentMail } from '../utils/settlementDocument';
import { matchingAmountWon, settlementFromScans } from '../utils/settlementAmounts';

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
  const app = useAppState();
  const merchants = useMerchantState();
  const session = merchants.accounts.find((item) => item.businessName === merchants.sessionName) ?? null;
  const [festivals, setFestivals] = useState<FestivalPin[]>([]);
  const [selectedFestivalId, setSelectedFestivalId] = useState<string>('');
  const businessNameRef = useRef('');
  const businessNumberRef = useRef('');
  const mainMenuRef = useRef('');
  const featuresRef = useRef('');
  const addressRef = useRef('');
  if (session) {
    if (!businessNameRef.current) businessNameRef.current = session.businessName;
    if (!businessNumberRef.current) businessNumberRef.current = session.businessNumber;
  }
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
  const [shopTel, setShopTel] = useState('');
  const [qrCount, setQrCount] = useState(0);
  const [qrScans, setQrScans] = useState<QrScanRecord[]>([]);
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
          start_date: item.start_date,
          end_date: item.end_date,
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
    if (!session) return;
    businessNameRef.current = session.businessName;
    businessNumberRef.current = session.businessNumber;
    if (savedPromoId) return;
    const existing = app.localPromotions.find((item) => item.business_name === session.businessName);
    if (existing) setSavedPromoId(existing.id);
  }, [session?.businessName, app.localPromotions, savedPromoId]);

  useEffect(() => {
    if (!savedPromoId) return;
    const promo = app.localPromotions.find((item) => item.id === savedPromoId);
    if (!promo) return;
    setQrCount(promo.qrConfirmCount ?? 0);
    setQrScans(promo.qrScans ?? []);
    if (promo.lastQrAt) setLastQrNote(`카메라 확인 ${new Date(promo.lastQrAt).toLocaleString('ko-KR')}`);
  }, [savedPromoId, app.localPromotions]);

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

  const scanTotals = useMemo(() => settlementFromScans(qrScans), [qrScans]);
  const matchPreview = scanTotals.count
    ? scanTotals
    : matchingAmountWon({
      maxDiscountAmount: parseFloat(maxDiscountAmount) || 3000,
      govRate: preview.total || preview.merchant || 10,
      qrCount,
    });

  const makeLocalPromo = (promoId: string, scans = qrScans, count = qrCount): HomePromotion => {
    const festival = festivals.find((f) => f.id === selectedFestivalId);
    const businessName = businessNameRef.current || session?.businessName || '온앤온 가맹점';
    return {
      id: promoId,
      title: `${festival?.title ?? businessName} 제휴 할인`,
      festival_id: selectedFestivalId || undefined,
      festival_title: festival?.title,
      festivalStartDate: festival?.start_date,
      festivalEndDate: festival?.end_date,
      business_name: businessName,
      businessNumber: businessNumberRef.current || session?.businessNumber,
      merchant_discount_rate: parseFloat(discountRate) || 0,
      gov_matching_rate: requestMatching ? Math.min(parseFloat(discountRate) || 0, 10) : 0,
      total_discount_rate: requestMatching
        ? (parseFloat(discountRate) || 0) + Math.min(parseFloat(discountRate) || 0, 10)
        : (parseFloat(discountRate) || 0),
      remaining_quantity: parseInt(quantity, 10) || 0,
      funding_type: requestMatching ? 'MATCHED' : 'MERCHANT_ONLY',
      metro: 'GYEONGGI',
      municipality_name: festival?.municipality_name,
      main_menu: mainMenuRef.current,
      features: featuresRef.current,
      exterior_image_url: exteriorUrl,
      interior_image_url: interiorUrl,
      address: addressRef.current,
      latitude: gps?.latitude,
      longitude: gps?.longitude,
      gps_confirmed: gpsConfirmed,
      tel: shopTel.trim(),
      bankName: bankName.trim(),
      bankAccount: bankAccount.trim(),
      bankHolder: bankHolder.trim(),
      managerEmail: settlementEmail.trim(),
      qrConfirmCount: count,
      qrScans: scans,
      lastQrAt: scans[scans.length - 1]?.at,
      maxDiscountAmount: parseFloat(maxDiscountAmount) || 0,
      settlementAmount: settlementFromScans(scans).total,
    };
  };

  const recordVerifiedQr = (coupon?: { discountAmount?: number; title?: string; code?: string }) => {
    const at = new Date().toISOString();
    const amountWon = Number(coupon?.discountAmount || 0) > 0 ? Number(coupon?.discountAmount) : 3000;
    const scan = { at, amountWon, title: coupon?.title, code: coupon?.code };
    const nextScans = [...qrScans, scan];
    const nextCount = nextScans.length;
    setQrScans(nextScans);
    setQrCount(nextCount);
    setLastQrNote(`QR 확인 ${amountWon.toLocaleString('ko-KR')}원 · ${new Date(at).toLocaleString('ko-KR')}`);
    const promoId = savedPromoId || `local-${Date.now()}`;
    addLocalPromotion(makeLocalPromo(promoId, nextScans, nextCount));
    if (!savedPromoId) setSavedPromoId(promoId);
  };

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
    if (!session && (!ntsResult?.data?.verified || ntsResult.data.b_stt_cd !== '01')) {
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
    const buildLocalPromo = (promoId: string) => makeLocalPromo(promoId);
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
        latitude: gps?.latitude,
        longitude: gps?.longitude,
        gps_confirmed: gpsConfirmed,
        exterior_image_url: exteriorUrl,
        interior_image_url: interiorUrl,
        bank_name: bankName.trim(),
        bank_account: bankAccount.trim(),
        bank_holder: bankHolder.trim(),
        manager_email: settlementEmail.trim(),
        qr_confirm_count: qrCount,
      });
      const promoId = `local-${Date.now()}`;
      addLocalPromotion(buildLocalPromo(promoId));
      setSavedPromoId(promoId);
      setResultBadge(res.data);
      Alert.alert('등록 완료', res.data.message);
    } catch (err: any) {
      const promoId = `local-${Date.now()}`;
      addLocalPromotion(buildLocalPromo(promoId));
      setSavedPromoId(promoId);
      Alert.alert('미리보기 등록', err?.response?.data?.message ?? '서버 미연결 시에도 홈 할인쿠폰에 미리보기로 올렸습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return (
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled" keyboardDismissMode="none">
        <MerchantAuthPanel />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled" keyboardDismissMode="none">
      <View style={styles.sessionBox}>
        <Text style={styles.matchTitle}>{session.businessName} 로그인됨</Text>
        <Text style={styles.note}>국세청 확인이 끝난 상호입니다. 아래 QR 쿠폰 스캔으로 손님 쿠폰만 확인하세요.</Text>
        <TouchableOpacity style={styles.photoBtnGhost} onPress={logoutMerchant}>
          <Text style={styles.photoBtnGhostText}>사장님 로그아웃</Text>
        </TouchableOpacity>
      </View>

      <QrCouponScanner merchantId={merchantId} readerId="merchant-register-qr" onUsed={recordVerifiedQr} />

      <Text style={styles.note}>상가 자체 할인은 즉시 발행됩니다. 지자체 1:1 매칭은 선택 신청입니다.</Text>

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

      {ntsResult?.data?.verified || session ? (
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
          <Text style={styles.label}>상가 연락처</Text>
          <TextInput
            style={styles.input}
            value={shopTel}
            onChangeText={setShopTel}
            placeholder="예: 031-228-0000"
            keyboardType="phone-pad"
          />
          <Text style={styles.label}>지자체 담당자 메일</Text>
          <TextInput
            style={styles.input}
            value={settlementEmail}
            onChangeText={setSettlementEmail}
            placeholder="축제 등록 시 확인한 담당자 메일"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
      ) : null}

      <View style={styles.qrBox}>
        <Text style={styles.matchTitle}>스캔 집계 · 일괄 정산</Text>
        <Text style={styles.qrCount}>{qrCount.toLocaleString('ko-KR')}건</Text>
        <Text style={styles.note}>QR 쿠폰 스캔 할인액과 정산 요청액이 같은 금액으로 집계됩니다.</Text>
        {lastQrNote ? <Text style={styles.verifyHint}>{lastQrNote}</Text> : null}
        <View style={styles.settleRow}>
          <Text style={styles.settleLabel}>건당 할인·정산</Text>
          <Text style={styles.settleValue}>{matchPreview.perUse.toLocaleString('ko-KR')}원</Text>
        </View>
        <View style={styles.settleRow}>
          <Text style={styles.settleLabel}>정산 요청액</Text>
          <Text style={styles.settleValue}>{matchPreview.total.toLocaleString('ko-KR')}원</Text>
        </View>
        {(() => {
          const saved = app.localPromotions.find((item) => item.id === savedPromoId)
            ?? (qrCount > 0 ? makeLocalPromo(savedPromoId || `local-${Date.now()}`, qrScans, qrCount) : null);
          const canSettle = qrCount > 0;
          const alreadySettled = Boolean(saved?.settledAt);
          return (
            <>
              <Text style={styles.note}>
                {canSettle
                  ? '스캔 집계가 있어 일괄 정산과 정산서 PDF 내려받기를 할 수 있습니다.'
                  : '손님 쿠폰 QR을 스캔하면 정산 버튼이 켜집니다.'}
              </Text>
              <TouchableOpacity
                style={[styles.mailBtn, !canSettle && styles.mailBtnOff]}
                disabled={!canSettle}
                onPress={() => {
                  if (!canSettle) return;
                  const promo = saved ?? makeLocalPromo(`local-${Date.now()}`, qrScans, qrCount);
                  addLocalPromotion(promo);
                  if (!savedPromoId) setSavedPromoId(promo.id);
                  if (!promo.managerEmail) {
                    Alert.alert('알림', '담당자 메일이 없으면 PDF만 내려받습니다. 지자체 담당자 메일을 입력하면 메일도 열립니다.');
                  }
                  settlePromotion(promo.id, matchPreview.total);
                  const latest = {
                    ...promo,
                    qrScans,
                    qrConfirmCount: qrCount,
                    settledAt: promo.settledAt ?? new Date().toISOString(),
                    settlementAmount: matchPreview.total,
                    managerEmail: promo.managerEmail || settlementEmail.trim(),
                  };
                  sendSettlementDocumentMail(latest).catch(() => Alert.alert('알림', '메일 앱을 열 수 없습니다. 정산서 PDF는 내려받았습니다.'));
                }}
              >
                <Text style={styles.mailBtnText}>
                  {alreadySettled ? '담당자 정산서 다시 보내기' : '일괄 정산.담당자 정산서 발송'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pdfBtn, !canSettle && styles.mailBtnOff]}
                disabled={!canSettle}
                onPress={() => {
                  if (!canSettle) return;
                  const promo = saved ?? makeLocalPromo(`local-${Date.now()}`, qrScans, qrCount);
                  addLocalPromotion(promo);
                  if (!savedPromoId) setSavedPromoId(promo.id);
                  const latest = {
                    ...promo,
                    qrScans,
                    qrConfirmCount: qrCount,
                    settlementAmount: matchPreview.total,
                  };
                  if (!downloadSettlementPdf(latest)) {
                    Alert.alert('알림', '웹에서 공문서 PDF를 내려받을 수 있습니다.');
                  }
                }}
              >
                <Text style={styles.pdfBtnText}>상가 사장님 정산서 내려받기</Text>
              </TouchableOpacity>
            </>
          );
        })()}
      </View>

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

      <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>할인 쿠폰 등록하기</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sessionBox: {
    backgroundColor: '#ECFDF5',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: 12,
  },
  quickQr: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  qrHeroBtn: {
    marginTop: 10,
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  qrHeroText: { color: '#111827', fontWeight: '900', fontSize: 16 },
  container: { flex: 1, padding: 20, backgroundColor: '#F7F8FA' },
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
  mailBtnOff: { backgroundColor: '#9CA3AF' },
  mailBtnText: { color: '#fff', fontWeight: '800' },
  pdfBtn: {
    marginTop: 8,
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  pdfBtnText: { color: '#fff', fontWeight: '800' },
});
