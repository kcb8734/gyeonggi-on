import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { fetchMerchantSettlement, type MerchantSettlement } from '../api/merchants';
import { incrementPromotionQr, useAppState } from '../stores/appStore';
import { pickFromCamera, pickPhotoFromGallery } from '../utils/pickImage';
import { matchingAmountWon, openSettlementMail } from '../utils/settlementMail';

const DEV_MERCHANT_ID = '22222222-2222-4222-8222-222222222222';

export default function MerchantSettlementScreen() {
  const [data, setData] = useState<MerchantSettlement | null>(null);
  const app = useAppState();
  const matched = app.localPromotions.filter((item) => item.funding_type === 'MATCHED');

  useEffect(() => {
    fetchMerchantSettlement(DEV_MERCHANT_ID).then(setData);
  }, []);

  const rows = data?.rows ?? [];

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <Text style={styles.kicker}>사장님 정산</Text>
      <Text style={styles.title}>내 가맹점 쿠폰 사용 · 정산 현황</Text>
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.num}>{data?.issued_count ?? 0}</Text>
          <Text style={styles.label}>발급</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.num}>{data?.used_count ?? 0}</Text>
          <Text style={styles.label}>사용</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.num}>{(data?.pending_amount ?? 0).toLocaleString()}</Text>
          <Text style={styles.label}>정산 대기(원)</Text>
        </View>
      </View>
      {rows.map((row) => (
        <View key={row.id} style={styles.card}>
          <Text style={styles.cardTitle}>{row.title}</Text>
          <Text style={styles.meta}>사용 {row.used_count} / 발급 {row.issued_count}</Text>
          <Text style={styles.meta}>점주 부담 {row.merchant_discount_total.toLocaleString()}원 · 지자체 {row.gov_support_total.toLocaleString()}원</Text>
          <Text style={styles.status}>{row.status}</Text>
        </View>
      ))}

      <Text style={styles.section}>지자체 매칭 QR 카운터</Text>
      <Text style={styles.lead}>QR을 촬영하면 확인 건수가 올라가고, 담당자 메일로 매칭 금액을 입금 요청할 수 있습니다.</Text>
      {matched.length === 0 ? (
        <Text style={styles.empty}>매칭 신청한 쿠폰이 없습니다. 할인 쿠폰 등록에서 지자체 1:1 매칭을 켜 주세요.</Text>
      ) : (
        matched.map((promo) => {
          const qrCount = promo.qrConfirmCount ?? 0;
          const money = matchingAmountWon({
            maxDiscountAmount: promo.maxDiscountAmount ?? 5000,
            govRate: promo.gov_matching_rate,
            qrCount,
          });
          return (
            <View key={promo.id} style={styles.qrCard}>
              <Text style={styles.cardTitle}>{promo.business_name ?? promo.title}</Text>
              <Text style={styles.meta}>{promo.festival_title ?? '연계 축제'}</Text>
              <Text style={styles.qrCount}>{qrCount.toLocaleString('ko-KR')}건 확인</Text>
              <Text style={styles.meta}>
                정산 요청액 {money.total.toLocaleString('ko-KR')}원 · 계좌 {promo.bankName ?? '-'} {promo.bankAccount ?? ''}
              </Text>
              <View style={styles.row}>
                <TouchableOpacity
                  style={styles.qrBtn}
                  onPress={async () => {
                    const uri = await pickFromCamera();
                    if (uri) incrementPromotionQr(promo.id);
                  }}
                >
                  <Text style={styles.qrBtnText}>QR 촬영</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.qrGhost}
                  onPress={async () => {
                    const uri = await pickPhotoFromGallery();
                    if (uri) incrementPromotionQr(promo.id);
                  }}
                >
                  <Text style={styles.qrGhostText}>갤러리 QR</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.mailBtn}
                onPress={() => {
                  if (!promo.managerEmail) {
                    Alert.alert('알림', '담당자 메일이 없습니다. 쿠폰 등록 화면에서 메일을 입력해주세요.');
                    return;
                  }
                  openSettlementMail({
                    to: promo.managerEmail,
                    businessName: promo.business_name ?? promo.title,
                    festivalTitle: promo.festival_title ?? undefined,
                    bankName: promo.bankName ?? '',
                    bankAccount: promo.bankAccount ?? '',
                    bankHolder: promo.bankHolder ?? '',
                    qrCount,
                    amountWon: money.total,
                  }).catch(() => Alert.alert('알림', '메일 앱을 열 수 없습니다.'));
                }}
              >
                <Text style={styles.mailBtnText}>담당자 메일로 정산 입금 요청</Text>
              </TouchableOpacity>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F7F8FA' },
  kicker: { fontSize: 12, fontWeight: '800', color: '#C2410C' },
  title: { fontSize: 22, fontWeight: '800', marginTop: 4, marginBottom: 16 },
  stats: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  stat: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  num: { fontSize: 18, fontWeight: '900' },
  label: { fontSize: 11, color: '#6B7280', marginTop: 4, fontWeight: '700' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  cardTitle: { fontSize: 15, fontWeight: '800' },
  meta: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  status: { marginTop: 8, fontSize: 12, fontWeight: '800', color: '#059669' },
  section: { fontSize: 17, fontWeight: '800', marginTop: 18, color: '#111827' },
  lead: { fontSize: 13, color: '#4B5563', marginTop: 6, marginBottom: 10, fontWeight: '600', lineHeight: 20 },
  empty: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  qrCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  qrCount: { fontSize: 24, fontWeight: '900', color: '#111827', marginTop: 8 },
  row: { flexDirection: 'row', gap: 8, marginTop: 12 },
  qrBtn: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  qrBtnText: { color: '#fff', fontWeight: '800' },
  qrGhost: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  qrGhostText: { color: '#111827', fontWeight: '800' },
  mailBtn: {
    marginTop: 10,
    backgroundColor: '#047857',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  mailBtnText: { color: '#fff', fontWeight: '800' },
});
