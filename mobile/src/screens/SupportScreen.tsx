import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const NOTICES = [
  { id: '1', title: '2026년 8월 경기온 축제 쿠폰 오픈', body: '수원·용인·가평 축제와 제휴 상가 할인이 앱에서 바로 발급됩니다.' },
  { id: '2', title: '한국관광공사 TourAPI 연동', body: '경기도 축제 일정과 주변 관광 정보가 실시간으로 갱신됩니다.' },
  { id: '3', title: '국세청 인증 가맹만 매칭', body: '계속사업자만 지자체 1:1 매칭 할인을 등록할 수 있습니다.' },
];

export default function SupportScreen({ topic }: { topic?: 'notice' | 'help' }) {
  const isHelp = topic === 'help';
  return (
    <ScrollView style={styles.root} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>{isHelp ? '고객센터' : '공지사항'}</Text>
      {isHelp ? (
        <View>
          <Text style={styles.body}>쿠폰이 스캔되지 않거나 정산이 지연되면 아래 채널로 문의하세요.</Text>
          <TouchableOpacity style={styles.card} onPress={() => Linking.openURL('tel:031120')}>
            <Text style={styles.cardTitle}>경기도 콜센터 120</Text>
            <Text style={styles.meta}>평일 09:00–18:00</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.card} onPress={() => Linking.openURL('mailto:help@gyeonggi-on.kr')}>
            <Text style={styles.cardTitle}>help@gyeonggi-on.kr</Text>
            <Text style={styles.meta}>가맹·정산·API 연동 문의</Text>
          </TouchableOpacity>
        </View>
      ) : (
        NOTICES.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.meta}>{item.body}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F7F8FA' },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 12 },
  body: { fontSize: 14, color: '#4B5563', marginBottom: 12, lineHeight: 21 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  cardTitle: { fontSize: 15, fontWeight: '800' },
  meta: { fontSize: 13, color: '#6B7280', marginTop: 6, lineHeight: 20 },
});
