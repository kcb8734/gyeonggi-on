import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { fetchHomeFeed } from '../api/home';
import { fetchMyCoupons, issueCoupon } from '../api/coupons';
import type { HomePromotion } from '../types/home';
import { TicketCouponCard, ticketFromPromotion, ticketFromWallet } from '../components/ui/TicketCouponCard';
import CouponQrModal from '../components/ui/CouponQrModal';
import MerchantDetailModal from '../components/ui/MerchantDetailModal';
import ProofPhotoModal from '../components/ui/ProofPhotoModal';
import {
  addWalletCoupon,
  promotionToWallet,
  useAppState,
  type WalletCoupon,
} from '../stores/appStore';
import { getFeedPosts, getMyFeedPosts } from '../stores/feedStore';

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
  const [proof, setProof] = useState<WalletCoupon | null>(null);
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
      Alert.alert('쿠폰함', '쿠폰을 다운로드했습니다. 인증사진을 확인한 뒤 QR을 제시하세요.');
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

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
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
            <Text style={styles.lead}>인증사진 섬네일을 눌러 행사 참여를 확인한 뒤, 해당 상가에서 쿠폰을 사용하세요.</Text>
            {app.wallet.length === 0 ? (
              <Text style={styles.empty}>아직 받은 쿠폰이 없습니다</Text>
            ) : (
              app.wallet.map((item) => (
                <TicketCouponCard
                  key={item.id}
                  compact
                  {...ticketFromWallet(item)}
                  onPress={() => setSelected(item)}
                  onProofPress={() => setProof(item)}
                />
              ))
            )}
          </>
        )}
      </ScrollView>

      <CouponQrModal coupon={selected} onClose={() => setSelected(null)} />
      <ProofPhotoModal
        coupon={proof}
        onClose={() => setProof(null)}
        onUse={(coupon) => {
          setProof(null);
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
  lead: { fontSize: 13, color: '#6B7280', marginBottom: 12, lineHeight: 20 },
  empty: { color: '#6B7280', marginTop: 20 },
});
