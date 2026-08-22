import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { fetchMerchantSettlement, type MerchantSettlement } from '../api/merchants';

const DEV_MERCHANT_ID = '22222222-2222-4222-8222-222222222222';

export default function MerchantSettlementScreen() {
  const [data, setData] = useState<MerchantSettlement | null>(null);

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
});
