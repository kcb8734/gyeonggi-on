import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { HomePromotion } from '../../types/home';
import type { WalletCoupon } from '../../stores/appStore';

interface Props {
  title: string;
  shop: string;
  festival?: string | null;
  rate: number;
  matched?: boolean;
  expires?: string;
  remaining?: number;
  status?: string;
  onPress?: () => void;
  cta?: string;
  compact?: boolean;
}

export function TicketCouponCard({
  title,
  shop,
  festival,
  rate,
  matched,
  expires,
  remaining,
  status,
  onPress,
  cta,
  compact,
}: Props) {
  return (
    <TouchableOpacity
      style={[styles.wrap, compact && styles.wrapCompact]}
      activeOpacity={0.9}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[styles.notchLeft, compact && styles.notchCompact]} />
      <View style={[styles.notchRight, compact && styles.notchCompact]} />
      <View style={[styles.rateCol, compact && styles.rateColCompact]}>
        <Text style={[styles.rate, compact && styles.rateCompact]}>{rate}</Text>
        <Text style={[styles.percent, compact && styles.percentCompact]}>%</Text>
        {compact ? null : <Text style={styles.off}>OFF</Text>}
      </View>
      <View style={[styles.dash, compact && styles.dashCompact]} />
      <View style={[styles.body, compact && styles.bodyCompact]}>
        <Text style={[styles.shop, compact && styles.shopCompact]} numberOfLines={1}>{shop}</Text>
        {compact ? null : <Text style={styles.title} numberOfLines={2}>{title}</Text>}
        {!compact && festival ? <Text style={styles.fest} numberOfLines={1}>{festival}</Text> : null}
        <View style={[styles.metaRow, compact && styles.metaRowCompact]}>
          {matched ? <Text style={styles.badge}>지자체 1:1 매칭</Text> : <Text style={styles.self}>상가 자체 할인</Text>}
          {!compact && expires ? <Text style={styles.expire}>~ {expires}</Text> : null}
        </View>
        {!compact && remaining != null ? <Text style={styles.remain}>잔여 {remaining.toLocaleString()}장</Text> : null}
        {!compact && status ? <Text style={styles.status}>{status === 'ISSUED' ? '사용 가능' : status}</Text> : null}
        {cta ? <Text style={[styles.cta, compact && styles.ctaCompact]}>{cta}</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

export function ticketFromPromotion(promo: HomePromotion, cta = '다운로드'): Props {
  return {
    title: promo.title,
    shop: promo.business_name ?? '제휴업소',
    festival: promo.festival_title,
    rate: promo.total_discount_rate,
    matched: promo.funding_type !== 'MERCHANT_ONLY',
    remaining: promo.remaining_quantity,
    cta,
  };
}

export function ticketFromWallet(item: WalletCoupon): Props {
  return {
    title: item.title,
    shop: item.business_name,
    festival: item.festival_title,
    rate: item.total_discount_rate,
    matched: item.funding_type !== 'MERCHANT_ONLY',
    expires: item.expires_at,
    status: item.status,
    cta: 'QR 보기',
  };
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#fff',
    borderRadius: 18,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#FECACA',
    minHeight: 118,
  },
  wrapCompact: {
    minHeight: 64,
    borderRadius: 14,
    marginBottom: 8,
  },
  notchLeft: {
    position: 'absolute',
    left: 86,
    top: -9,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#F7F8FA',
    zIndex: 2,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  notchRight: {
    position: 'absolute',
    left: 86,
    bottom: -9,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#F7F8FA',
    zIndex: 2,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  notchCompact: {
    left: 60,
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  rateCol: {
    width: 96,
    backgroundColor: '#E0392A',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  rateColCompact: { width: 68, paddingVertical: 8 },
  rate: { color: '#fff', fontSize: 34, fontWeight: '900', lineHeight: 36 },
  rateCompact: { fontSize: 22, lineHeight: 24 },
  percent: { color: '#fff', fontSize: 16, fontWeight: '800', marginTop: -2 },
  percentCompact: { fontSize: 12, marginTop: 0 },
  off: { color: '#FECACA', fontSize: 11, fontWeight: '800', marginTop: 2 },
  dash: {
    width: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#FECACA',
    marginVertical: 14,
  },
  dashCompact: { marginVertical: 8 },
  body: { flex: 1, padding: 12, justifyContent: 'center' },
  bodyCompact: { paddingVertical: 8, paddingHorizontal: 10 },
  shop: { fontSize: 15, fontWeight: '800', color: '#111827' },
  shopCompact: { fontSize: 13 },
  metaRowCompact: { marginTop: 4 },
  ctaCompact: { marginTop: 4, fontSize: 11 },
  title: { fontSize: 12, color: '#4B5563', marginTop: 3 },
  fest: { fontSize: 11, color: '#2563EB', fontWeight: '700', marginTop: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  badge: {
    backgroundColor: '#FEF3C7',
    color: '#92400E',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  self: {
    backgroundColor: '#D1FAE5',
    color: '#065F46',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  expire: { fontSize: 11, color: '#6B7280', fontWeight: '600' },
  remain: { fontSize: 11, color: '#6B7280', marginTop: 4 },
  status: { fontSize: 11, color: '#059669', fontWeight: '800', marginTop: 4 },
  cta: { marginTop: 8, fontSize: 12, fontWeight: '800', color: '#E0392A' },
});
