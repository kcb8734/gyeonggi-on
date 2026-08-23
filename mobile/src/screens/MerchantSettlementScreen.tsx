import React, { useEffect, useState } from 'react';
import { Alert, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { fetchMerchantSettlement, type MerchantSettlement } from '../api/merchants';
import { fetchOfficialPreview, sendOfficialSettlement, type OfficialPreview } from '../api/settlementOfficial';
import QrCouponScanner from '../components/ui/QrCouponScanner';
import ModalExitButton from '../components/ui/ModalExitButton';
import { addLocalPromotion, settlePromotion, useAppState } from '../stores/appStore';
import type { ScannedCoupon } from '../api/couponScan';
import type { HomePromotion } from '../types/home';
import { formatKoDateTime, isScheduleEnded } from '../utils/festivalSchedule';
import { downloadSettlementPdf, sendSettlementDocumentMail } from '../utils/settlementDocument';
import { settlementFromScans } from '../utils/settlementAmounts';

const DEV_MERCHANT_ID = '22222222-2222-4222-8222-222222222222';
const SETTLE_PROMO_ID = 'local-settlement-scans';

function promoFromOfficial(official: OfficialPreview | null, extra?: HomePromotion): HomePromotion | null {
  const scans = extra?.qrScans?.length
    ? extra.qrScans
    : (official?.items ?? []).map((item) => ({
      at: item.usedAt ?? new Date().toISOString(),
      amountWon: item.discountAmount,
      title: item.title,
      code: item.code,
    }));
  if (!scans.length && !extra) return null;
  return {
    id: extra?.id ?? SETTLE_PROMO_ID,
    title: extra?.title ?? '스캔 쿠폰 일괄 정산',
    business_name: extra?.business_name ?? official?.merchant.name ?? '온앤온 가맹점',
    merchant_discount_rate: extra?.merchant_discount_rate ?? 10,
    gov_matching_rate: extra?.gov_matching_rate ?? 10,
    total_discount_rate: extra?.total_discount_rate ?? 20,
    remaining_quantity: extra?.remaining_quantity ?? 0,
    funding_type: extra?.funding_type ?? 'MATCHED',
    managerEmail: extra?.managerEmail ?? official?.municipality.settlementEmail,
    municipality_name: extra?.municipality_name ?? official?.municipality.name,
    qrScans: scans,
    qrConfirmCount: scans.length,
    lastQrAt: scans[scans.length - 1]?.at,
    settlementAmount: settlementFromScans(scans).total,
    bankName: extra?.bankName ?? '기업은행',
    bankAccount: extra?.bankAccount ?? '123-456789-01-011',
    bankHolder: extra?.bankHolder ?? official?.merchant.name,
  };
}

function resolveEndDate(promo: HomePromotion, festivals: { id: string; end_date?: string }[]): string | undefined {
  return promo.festivalEndDate
    ?? festivals.find((item) => item.id === promo.festival_id)?.end_date
    ?? undefined;
}

function OfficialPreviewFrame({ html }: { html: string }) {
  if (Platform.OS === 'web') {
    return React.createElement('iframe', {
      srcDoc: html,
      title: '공문 미리보기',
      style: { width: '100%', height: 420, border: 0, background: '#fff' },
    });
  }
  return <Text selectable style={styles.previewFallback}>{html.replace(/<[^>]+>/g, ' ').slice(0, 900)}</Text>;
}

export default function MerchantSettlementScreen() {
  const [data, setData] = useState<MerchantSettlement | null>(null);
  const [official, setOfficial] = useState<OfficialPreview | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState('');
  const app = useAppState();
  const localTargets = app.localPromotions.filter((item) => (
    (item.qrScans?.length ?? 0) > 0 || (item.qrConfirmCount ?? 0) > 0 || item.funding_type === 'MATCHED'
  ));
  const officialTarget = promoFromOfficial(official, localTargets.find((item) => item.id === SETTLE_PROMO_ID));
  const settleTargets = officialTarget && !localTargets.some((item) => item.id === officialTarget.id)
    ? [officialTarget, ...localTargets]
    : localTargets;

  const loadOfficial = () => {
    fetchOfficialPreview(DEV_MERCHANT_ID).then(setOfficial);
  };

  useEffect(() => {
    fetchMerchantSettlement(DEV_MERCHANT_ID).then(setData);
    loadOfficial();
  }, []);

  const rows = data?.rows ?? [];

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <Text style={styles.kicker}>사장님 정산</Text>
      <Text style={styles.title}>지자체 제출용 공문 정산</Text>
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.num}>{official?.week.count ?? 0}</Text>
          <Text style={styles.label}>이번 주 미정산</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.num}>{(official?.week.amount ?? 0).toLocaleString('ko-KR')}</Text>
          <Text style={styles.label}>주간 청구액</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.num}>{(official?.month.amount ?? 0).toLocaleString('ko-KR')}</Text>
          <Text style={styles.label}>이번 달 청구액</Text>
        </View>
      </View>
      <Text style={styles.section}>스캔된 쿠폰 내역</Text>
      {(official?.items ?? []).map((item) => (
        <View key={item.id} style={styles.card}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.meta}>{item.usedAt ? formatKoDateTime(item.usedAt) : '-'}</Text>
          <Text style={styles.meta}>할인 {item.discountAmount.toLocaleString('ko-KR')}원 · QR ID {item.code}</Text>
        </View>
      ))}
      {sendStatus ? <Text style={styles.settled}>{sendStatus}</Text> : null}
      <TouchableOpacity style={styles.pdfBtn} onPress={() => official?.html && setPreviewOpen(true)}>
        <Text style={styles.pdfBtnText}>공문 미리보기</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.mailBtn}
        disabled={sending}
        onPress={async () => {
          setSending(true);
          try {
            const result = await sendOfficialSettlement({ merchantId: DEV_MERCHANT_ID });
            if (result.success) {
              setSendStatus('정산 신청 완료');
              setSuccessOpen(true);
              loadOfficial();
            } else {
              Alert.alert('알림', result.message);
            }
          } catch (err) {
            Alert.alert('알림', err instanceof Error ? err.message : '공문 발송에 실패했습니다.');
          } finally {
            setSending(false);
          }
        }}
      >
        <Text style={styles.mailBtnText}>{sending ? '발송 중...' : '지자체 정산 공문 발송하기'}</Text>
      </TouchableOpacity>
      <QrCouponScanner
        merchantId={DEV_MERCHANT_ID}
        readerId="merchant-settle-qr"
        onUsed={(coupon: ScannedCoupon) => {
          const existing = app.localPromotions.find((item) => item.id === SETTLE_PROMO_ID);
          const scan = {
            at: new Date().toISOString(),
            amountWon: coupon.discountAmount,
            title: coupon.title,
            code: coupon.code,
          };
          const qrScans = [...(existing?.qrScans ?? []), scan];
          addLocalPromotion({
            id: SETTLE_PROMO_ID,
            title: '스캔 쿠폰 일괄 정산',
            business_name: official?.merchant.name ?? '온앤온 가맹점',
            merchant_discount_rate: 10,
            gov_matching_rate: 10,
            total_discount_rate: 20,
            remaining_quantity: 0,
            funding_type: 'MATCHED',
            managerEmail: official?.municipality.settlementEmail,
            municipality_name: official?.municipality.name,
            qrScans,
            qrConfirmCount: qrScans.length,
            lastQrAt: scan.at,
            settlementAmount: settlementFromScans(qrScans).total,
            bankName: '기업은행',
            bankAccount: '123-456789-01-011',
            bankHolder: official?.merchant.name,
          });
          loadOfficial();
        }}
      />

      <Modal visible={previewOpen} transparent animationType="fade" onRequestClose={() => setPreviewOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <ModalExitButton onPress={() => setPreviewOpen(false)} />
            <Text style={styles.cardTitle}>공문서 미리보기 {official?.docNumber}</Text>
            {official?.html ? <OfficialPreviewFrame html={official.html} /> : null}
          </View>
        </View>
      </Modal>
      <Modal visible={successOpen} transparent animationType="fade" onRequestClose={() => setSuccessOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <ModalExitButton onPress={() => setSuccessOpen(false)} />
            <Text style={styles.cardTitle}>정상적으로 공문서가 접수되었습니다.</Text>
            <Text style={styles.meta}>상태 · 정산 신청 완료</Text>
          </View>
        </View>
      </Modal>

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

      <Text style={styles.section}>행사 종료 후 일괄 정산</Text>
      <Text style={styles.lead}>
        QR 쿠폰 스캔으로 확인한 일시와 정산금액을 기록한 뒤, 일괄 정산으로 담당자에게 정산서를 보내고 사장님도 내려받습니다.
      </Text>
      {settleTargets.length === 0 ? (
        <Text style={styles.empty}>스캔된 쿠폰이 없습니다. 할인 쿠폰 등록에서 QR 쿠폰을 스캔해 주세요.</Text>
      ) : (
        settleTargets.map((promo) => {
          const scans = promo.qrScans ?? [];
          const money = settlementFromScans(scans);
          const qrCount = money.count || (promo.qrConfirmCount ?? 0);
          const endDate = resolveEndDate(promo, app.localFestivals);
          const ended = isScheduleEnded(endDate);
          return (
            <View key={promo.id} style={styles.qrCard}>
              <Text style={styles.cardTitle}>{promo.business_name ?? promo.title}</Text>
              <Text style={styles.meta}>{promo.festival_title ?? '연계 축제'}</Text>
              <Text style={styles.meta}>
                행사 기간 {promo.festivalStartDate ?? '-'} ~ {endDate ?? '-'}
                {ended ? ' · 종료' : ' · 진행 중'}
              </Text>
              <Text style={styles.qrCount}>{qrCount.toLocaleString('ko-KR')}건 확인</Text>
              <Text style={styles.meta}>
                건당 {(money.perUse || 0).toLocaleString('ko-KR')}원 · 정산 요청액 {(money.total || promo.settlementAmount || 0).toLocaleString('ko-KR')}원
              </Text>
              <Text style={styles.meta}>계좌 {promo.bankName ?? '-'} {promo.bankAccount ?? ''}</Text>
              {scans.length ? (
                <View style={styles.scanBox}>
                  {scans.slice(-4).map((scan, index) => (
                    <Text key={`${scan.at}-${index}`} style={styles.scanRow}>
                      {formatKoDateTime(scan.at)} · {scan.amountWon.toLocaleString('ko-KR')}원
                    </Text>
                  ))}
                  {scans.length > 4 ? <Text style={styles.scanRow}>외 {scans.length - 4}건</Text> : null}
                </View>
              ) : null}
              {promo.settledAt ? (
                <Text style={styles.settled}>일괄 정산 완료 · {formatKoDateTime(promo.settledAt)}</Text>
              ) : (
                <Text style={styles.meta}>
                  {ended
                    ? '행사 종료. 일괄 정산과 정산서 내려받기를 할 수 있습니다.'
                    : '위 QR 쿠폰 스캔으로 확인한 뒤 일괄 정산과 정산서 내려받기를 할 수 있습니다.'}
                </Text>
              )}
              <TouchableOpacity
                style={styles.mailBtn}
                onPress={() => {
                  if (!promo.managerEmail) {
                    Alert.alert('알림', '담당자 메일이 없습니다. 쿠폰 등록 화면에서 메일을 입력해주세요.');
                    return;
                  }
                  const amount = money.total || promo.settlementAmount || 0;
                  if (!promo.settledAt) settlePromotion(promo.id, amount);
                  const latest = {
                    ...promo,
                    settledAt: promo.settledAt ?? new Date().toISOString(),
                    settlementAmount: amount,
                    qrScans: scans,
                    qrConfirmCount: qrCount,
                  };
                  sendSettlementDocumentMail(latest).catch(() => Alert.alert('알림', '메일 앱을 열 수 없습니다. PDF는 내려받을 수 있습니다.'));
                }}
              >
                <Text style={styles.mailBtnText}>
                  {promo.settledAt ? '담당자 정산서 다시 보내기' : '일괄 정산.담당자 정산서 발송'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.pdfBtn}
                onPress={() => {
                  if (!downloadSettlementPdf({
                    ...promo,
                    qrScans: scans,
                    qrConfirmCount: qrCount,
                    settlementAmount: money.total || promo.settlementAmount,
                  })) {
                    Alert.alert('알림', '웹에서 공문서 PDF를 내려받을 수 있습니다.');
                  }
                }}
              >
                <Text style={styles.pdfBtnText}>상가 사장님 정산서 내려받기</Text>
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
  scanBox: {
    marginTop: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  scanRow: { fontSize: 12, fontWeight: '700', color: '#065F46', marginTop: 2 },
  qrBtn: {
    marginTop: 12,
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  qrBtnText: { color: '#fff', fontWeight: '800' },
  settled: { marginTop: 10, fontSize: 12, fontWeight: '800', color: '#047857' },
  mailBtn: {
    marginTop: 10,
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
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 16 },
  sheet: { backgroundColor: '#fff', borderRadius: 16, padding: 16, paddingTop: 44, maxHeight: '88%' as unknown as number },
  previewFallback: { fontSize: 12, color: '#374151', marginTop: 10, lineHeight: 18 },
});
