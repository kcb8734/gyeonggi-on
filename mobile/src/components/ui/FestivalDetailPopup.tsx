import React from 'react';
import {
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import SafeFestivalImage from './SafeFestivalImage';
import type { HomeFestival, HomePromotion } from '../../types/home';
import { isFavorite, isScheduled } from '../../stores/appStore';
import { ddayLabel, formatRange } from '../../utils/date';
import { formatTel, telHref } from '../../utils/phone';
import { setImeModalLock } from '../../utils/nativeImeHost';
import { festivalListHeroUrl } from '../../utils/festivalFeed';
import ModalExitButton from './ModalExitButton';

interface Props {
  festival: HomeFestival | null;
  promotions: HomePromotion[];
  issuingId?: string | null;
  initialFocus?: 'info' | 'coupon';
  onClose: () => void;
  onOpenDetail: () => void;
  onFavorite: () => void;
  onSchedule: () => void;
  onIssue: (promo: HomePromotion) => void;
}

export default function FestivalDetailPopup({
  festival,
  promotions,
  issuingId,
  initialFocus = 'info',
  onClose,
  onOpenDetail,
  onFavorite,
  onSchedule,
  onIssue,
}: Props) {
  const scrollRef = React.useRef<ScrollView>(null);
  const { width } = useWindowDimensions();
  React.useEffect(() => {
    setImeModalLock(Boolean(festival));
    return () => setImeModalLock(false);
  }, [festival]);
  React.useEffect(() => {
    if (!festival || initialFocus !== 'coupon') return;
    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 240);
    return () => clearTimeout(timer);
  }, [festival, initialFocus]);
  if (!festival) return null;
  const liked = isFavorite(festival.id);
  const saved = isScheduled(festival.id);
  const inquiry = festival.inquiryTel || festival.tel;
  const callUrl = telHref(inquiry);
  const telLabel = formatTel(inquiry) || inquiry;
  const heroUri = festivalListHeroUrl(festival);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <ModalExitButton onPress={onClose} />
          <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false}>
            <View style={[styles.hero, { width }]}>
              <SafeFestivalImage
                uri={heroUri}
                title={festival.title}
                location={festival.location_name}
                metro={festival.metro || festival.regionalZone}
                style={styles.heroImage}
              />
            </View>
            <View style={styles.body}>
              <View style={styles.row}>
                <Text style={styles.dday}>{ddayLabel(festival.start_date, festival.end_date)}</Text>
                {festival.category ? <Text style={styles.cat}>{festival.category}</Text> : null}
                {promotions.length ? <Text style={styles.couponChip}>쿠폰 발행</Text> : null}
              </View>
              <Text style={styles.title}>{festival.title}</Text>
              <Text style={styles.meta}>{formatRange(festival.start_date, festival.end_date)}</Text>
              <Text style={styles.meta}>{festival.location_name ?? '위치 미정'}</Text>
              {telLabel ? (
                <TouchableOpacity disabled={!callUrl} onPress={() => callUrl && Linking.openURL(callUrl)}>
                  <Text style={[styles.meta, callUrl ? styles.telLink : null]}>행사 문의 {telLabel}</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.meta}>행사 문의 전화번호 없음</Text>
              )}
              {festival.managerEmail ? (
                <Text style={styles.meta}>담당자 메일 {festival.managerEmail}</Text>
              ) : null}
              {festival.fee ? <Text style={styles.meta}>이용요금 {festival.fee}</Text> : null}
              <Text style={styles.overview} numberOfLines={6}>
                {festival.description || '한국관광공사 TourAPI에서 수집한 행사 개요입니다.'}
              </Text>

              <View style={styles.actions}>
                <TouchableOpacity style={[styles.ghost, liked && styles.favOn]} onPress={onFavorite}>
                  <Text style={[styles.ghostText, liked && styles.favOnText]}>{liked ? '즐겨찾기 됨' : '즐겨찾기'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.ghost} onPress={onSchedule}>
                  <Text style={styles.ghostText}>{saved ? '일정 담김' : '알림 받기'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primary} onPress={onOpenDetail}>
                  <Text style={styles.primaryText}>상세보기</Text>
                </TouchableOpacity>
              </View>
              {callUrl ? (
                <TouchableOpacity style={styles.call} onPress={() => Linking.openURL(callUrl)}>
                  <Text style={styles.callText}>전화 걸기 {telLabel}</Text>
                </TouchableOpacity>
              ) : null}

              <View style={styles.tabRow}>
                <TouchableOpacity
                  style={[styles.tab, initialFocus !== 'coupon' && styles.tabOn]}
                  onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
                >
                  <Text style={[styles.tabText, initialFocus !== 'coupon' && styles.tabTextOn]}>소개</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tab, initialFocus === 'coupon' && styles.tabOn]}
                  onPress={() => scrollRef.current?.scrollToEnd({ animated: true })}
                >
                  <Text style={[styles.tabText, initialFocus === 'coupon' && styles.tabTextOn]}>쿠폰/할인 혜택</Text>
                </TouchableOpacity>
              </View>

              <Text nativeID="festival-coupon" style={styles.section}>이 축제 쿠폰 받기</Text>
              {promotions.length === 0 ? (
                <Text style={styles.empty}>연결된 상생 쿠폰이 아직 없습니다</Text>
              ) : (
                promotions.map((promo) => (
                  <View key={promo.id} style={styles.promo}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.shop}>{promo.business_name}</Text>
                      <Text style={styles.rate}>총 {promo.total_discount_rate}% 할인</Text>
                    </View>
                    <TouchableOpacity style={styles.issue} onPress={() => onIssue(promo)} disabled={issuingId === promo.id}>
                      <Text style={styles.issueText}>{issuingId === promo.id ? '발급 중' : '상가 보기'}</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    maxHeight: '86%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: 'hidden',
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    marginTop: 10,
    marginBottom: 6,
  },
  hero: { width: '100%', height: 180, backgroundColor: '#93C5FD', overflow: 'hidden' },
  heroImage: { width: '100%', height: 180 },
  fallback: { backgroundColor: '#1E6FEA', alignItems: 'center', justifyContent: 'center' },
  fallbackText: { color: '#fff', fontWeight: '800', fontSize: 16, paddingHorizontal: 20, textAlign: 'center' },
  body: { padding: 16, paddingBottom: 28 },
  row: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  dday: {
    backgroundColor: '#111827',
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
  },
  couponChip: {
    backgroundColor: '#FFEDD5',
    color: '#C2410C',
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
  },
  cat: {
    backgroundColor: '#EEF2FF',
    color: '#3730A3',
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
  },
  title: { fontSize: 20, fontWeight: '800', color: '#111827' },
  meta: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  overview: { fontSize: 14, lineHeight: 21, color: '#374151', marginTop: 12 },
  tabRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  tab: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tabOn: { backgroundColor: '#EA580C', borderColor: '#EA580C' },
  tabText: { fontSize: 12, fontWeight: '800', color: '#374151' },
  tabTextOn: { color: '#fff' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  ghost: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
  },
  ghostText: { fontSize: 12, fontWeight: '800', color: '#374151' },
  favOn: { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' },
  favOnText: { color: '#92400E' },
  primary: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
  },
  primaryText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  telLink: { color: '#2563EB', fontWeight: '800' },
  call: {
    marginTop: 10,
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  callText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  section: { fontSize: 15, fontWeight: '800', marginTop: 20, marginBottom: 8 },
  empty: { fontSize: 13, color: '#6B7280' },
  promo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  shop: { fontSize: 14, fontWeight: '800' },
  rate: { fontSize: 12, color: '#B4530A', fontWeight: '700', marginTop: 2 },
  issue: { backgroundColor: '#E0392A', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  issueText: { color: '#fff', fontWeight: '800', fontSize: 12 },
});
