import React, { useEffect, useState } from 'react';
import { Alert, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { fetchHomeFeed } from '../api/home';
import { fetchMyCoupons, issueCoupon } from '../api/coupons';
import type { HomePromotion } from '../types/home';
import { TicketCouponCard, ticketFromPromotion, ticketFromWallet } from '../components/ui/TicketCouponCard';
import CouponQrModal from '../components/ui/CouponQrModal';
import MerchantDetailModal from '../components/ui/MerchantDetailModal';
import ProofPhotoModal from '../components/ui/ProofPhotoModal';
import ModalExitButton from '../components/ui/ModalExitButton';
import {
  addWalletCoupon,
  promotionToWallet,
  setAttendanceProof,
  useAppState,
  type AttendanceProofKind,
  type WalletCoupon,
} from '../stores/appStore';
import { getFeedPosts, getMyFeedPosts } from '../stores/feedStore';
import { pickFromCamera, pickPhotoFromGallery } from '../utils/pickImage';

const DEV_USER_ID = '11111111-1111-4111-8111-111111111111';

function proofForPromotion(promo: HomePromotion): string | undefined {
  const feeds = [...getMyFeedPosts(), ...getFeedPosts()];
  const match = feeds.find((item) =>
    (promo.festival_title && item.festival && item.festival.includes(promo.festival_title.slice(0, 4)))
    || (promo.festival_id && item.festivalId === promo.festival_id),
  );
  return match?.imageUrl ?? promo.exterior_image_url ?? undefined;
}

export default function CouponsScreen() {
  const [tab, setTab] = useState<'available' | 'wallet'>('available');
  const [promotions, setPromotions] = useState<HomePromotion[]>([]);
  const [issuingId, setIssuingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<WalletCoupon | null>(null);
  const [proofOpen, setProofOpen] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [merchant, setMerchant] = useState<HomePromotion | null>(null);
  const app = useAppState();

  useEffect(() => {
    fetchHomeFeed('GYEONGGI').then((feed) => {
      setPromotions([...app.localPromotions, ...feed.promotions.filter((item) => !app.localPromotions.some((local) => local.id === item.id))]);
    });
    fetchMyCoupons(DEV_USER_ID).then((items) => {
      items.forEach((item) => addWalletCoupon(item));
    }).catch(() => undefined);
  }, [app.localPromotions]);

  const handleIssue = async (promo: HomePromotion) => {
    setIssuingId(promo.id);
    try {
      const code = await issueCoupon(DEV_USER_ID, promo.id);
      addWalletCoupon(promotionToWallet(promo, code, proofForPromotion(promo)));
      setTab('wallet');
      Alert.alert('쿠폰함', '쿠폰을 다운로드했습니다. 하단 오른쪽 인증 칸에 참석 사진을 올린 뒤 사용하세요.');
    } catch {
      const code = `GGON-${promo.id.slice(-4).toUpperCase()}`;
      addWalletCoupon(promotionToWallet(promo, code, proofForPromotion(promo)));
      setTab('wallet');
      Alert.alert('미리보기 쿠폰', '백엔드 미연결 시 미리보기 쿠폰을 쿠폰함에 담았습니다.');
    } finally {
      setIssuingId(null);
      setMerchant(null);
    }
  };

  const captureProof = async (kind: AttendanceProofKind) => {
    const uri = kind === 'upload' ? await pickPhotoFromGallery() : await pickFromCamera();
    if (!uri) return;
    setAttendanceProof(uri, kind);
    setCaptureOpen(false);
  };

  return (
    <View style={styles.root}>
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'available' && styles.tabOn]}
          onPress={() => setTab('available')}
        >
          <Text style={[styles.tabText, tab === 'available' && styles.tabTextOn]}>사용 가능 쿠폰</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'wallet' && styles.tabOn]}
          onPress={() => setTab('wallet')}
        >
          <Text style={[styles.tabText, tab === 'wallet' && styles.tabTextOn]}>
            내 쿠폰함 ({app.wallet.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: tab === 'wallet' ? 120 : 32 }}>
        {tab === 'available' ? (
          <>
            <Text style={styles.lead}>상가 상세를 확인한 뒤 쿠폰을 다운로드하세요. 지자체별로 할인율 색이 다릅니다.</Text>
            {promotions.map((promo) => (
              <TicketCouponCard
                key={promo.id}
                compact
                {...ticketFromPromotion(promo, issuingId === promo.id ? '발급 중...' : '상가 보기')}
                onPress={() => setMerchant(promo)}
              />
            ))}
          </>
        ) : (
          <>
            <View style={styles.guide}>
              <Text style={styles.guideTitle}>쿠폰 사용 안내</Text>
              <Text style={styles.lead}>
                하단 오른쪽 인증 칸에 행사장 참석 QR을 찍거나, 행사장 배경으로 촬영하거나, 사진을 올리세요. 상가 관계자가 그 칸을 눌러 참석 이미지를 확인한 뒤 쿠폰을 결제합니다.
              </Text>
            </View>
            {app.wallet.length === 0 ? (
              <Text style={styles.empty}>아직 받은 쿠폰이 없습니다</Text>
            ) : (
              app.wallet.map((item) => (
                <TicketCouponCard
                  key={item.id}
                  compact
                  {...ticketFromWallet(item)}
                  onPress={() => setSelected(item)}
                />
              ))
            )}
          </>
        )}
      </ScrollView>

      {tab === 'wallet' ? (
        <View style={styles.proofDock} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.proofBox}
            onPress={() => {
              if (app.attendanceProofUrl) {
                setProofOpen(true);
                return;
              }
              setCaptureOpen(true);
            }}
            activeOpacity={0.85}
          >
            {app.attendanceProofUrl ? (
              <Image source={{ uri: app.attendanceProofUrl }} style={styles.proofImg} />
            ) : (
              <View style={styles.proofEmpty}>
                <Text style={styles.proofPlus}>+</Text>
              </View>
            )}
            <Text style={styles.proofCap}>행사 인증</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.proofEdit} onPress={() => setCaptureOpen(true)}>
            <Text style={styles.proofEditText}>촬영·업로드</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <Modal visible={captureOpen} transparent animationType="fade" onRequestClose={() => setCaptureOpen(false)}>
        <View style={styles.captureOverlay}>
          <TouchableOpacity style={styles.captureBackdrop} activeOpacity={1} onPress={() => setCaptureOpen(false)} />
          <View style={styles.captureCard}>
            <ModalExitButton onPress={() => setCaptureOpen(false)} />
            <Text style={styles.captureTitle}>행사 참석 이미지</Text>
            <Text style={styles.captureLead}>상가 결제 전에 참석을 확인할 사진을 담아 주세요.</Text>
            <TouchableOpacity style={styles.captureBtn} onPress={() => captureProof('qr')}>
              <Text style={styles.captureBtnText}>행사장 참석 QR 촬영</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.captureBtn} onPress={() => captureProof('venue')}>
              <Text style={styles.captureBtnText}>행사장 배경으로 촬영</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.captureGhost} onPress={() => captureProof('upload')}>
              <Text style={styles.captureGhostText}>사진 업로드</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <CouponQrModal coupon={selected} onClose={() => setSelected(null)} />
      <ProofPhotoModal
        visible={proofOpen}
        imageUrl={app.attendanceProofUrl}
        festivalTitle={app.wallet[0]?.festival_title ?? '행사 참석'}
        capturedAt={app.attendanceProofAt}
        kind={app.attendanceProofKind}
        coupons={app.wallet}
        onClose={() => setProofOpen(false)}
        onUse={(coupon) => {
          setProofOpen(false);
          setSelected(coupon);
        }}
      />
      <MerchantDetailModal
        promotion={merchant}
        issuing={issuingId === merchant?.id}
        onClose={() => setMerchant(null)}
        onDownload={handleIssue}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F7F8FA' },
  tabs: {
    flexDirection: 'row',
    margin: 16,
    marginBottom: 0,
    backgroundColor: '#E5E7EB',
    borderRadius: 14,
    padding: 4,
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: 'center' },
  tabOn: { backgroundColor: '#111827' },
  tabText: { fontSize: 13, fontWeight: '800', color: '#4B5563' },
  tabTextOn: { color: '#fff' },
  guide: {
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  guideTitle: { fontSize: 13, fontWeight: '800', color: '#9A3412', marginBottom: 4 },
  lead: { fontSize: 13, color: '#6B7280', marginBottom: 12, lineHeight: 20 },
  empty: { color: '#6B7280', marginTop: 20 },
  proofDock: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    alignItems: 'center',
    gap: 6,
  },
  proofBox: {
    width: 72,
    height: 86,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    shadowColor: '#111827',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  proofImg: { width: 56, height: 56, borderRadius: 8, backgroundColor: '#E5E7EB' },
  proofEmpty: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
  },
  proofPlus: { fontSize: 22, fontWeight: '800', color: '#6B7280' },
  proofCap: { fontSize: 10, fontWeight: '800', color: '#374151', marginTop: 4 },
  proofEdit: {
    backgroundColor: '#111827',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  proofEditText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  captureOverlay: { flex: 1, justifyContent: 'flex-end' },
  captureBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  captureCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: 24,
  },
  captureTitle: { fontSize: 17, fontWeight: '800', paddingRight: 40 },
  captureLead: { fontSize: 13, color: '#6B7280', marginTop: 6, marginBottom: 14, lineHeight: 20 },
  captureBtn: {
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 8,
  },
  captureBtnText: { color: '#fff', fontWeight: '800' },
  captureGhost: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  captureGhostText: { color: '#111827', fontWeight: '800' },
});
