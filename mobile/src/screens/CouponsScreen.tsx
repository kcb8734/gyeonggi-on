import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { fetchHomeFeed } from '../api/home';
import type { HomePromotion } from '../types/home';

export default function CouponsScreen() {
  const [promotions, setPromotions] = useState<HomePromotion[]>([]);

  useEffect(() => {
    fetchHomeFeed('GYEONGGI').then((feed) => setPromotions(feed.promotions));
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.header}>내 쿠폰 · 발행 가능 혜택</Text>
      {promotions.map((promo) => (
        <View key={promo.id} style={styles.card}>
          <Text style={styles.shop}>{promo.business_name}</Text>
          <Text style={styles.fest}>{promo.festival_title}</Text>
          <Text style={styles.rate}>총 {promo.total_discount_rate}% · 잔여 {promo.remaining_quantity}장</Text>
          <Text style={styles.fund}>
            {promo.funding_type === 'MERCHANT_ONLY' ? '상가 자체 할인' : '지자체 1:1 매칭'}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },
  header: { fontSize: 22, fontWeight: '800', marginBottom: 12 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  shop: { fontSize: 16, fontWeight: '800' },
  fest: { fontSize: 13, color: '#2D6CDF', marginTop: 4, fontWeight: '700' },
  rate: { fontSize: 13, color: '#B4530A', marginTop: 8, fontWeight: '700' },
  fund: { fontSize: 12, color: '#6B7280', marginTop: 4 },
});
