import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function MyScreen() {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.container}>
      <Text style={styles.header}>마이</Text>
      <Text style={styles.sub}>고객 · 사장님 메뉴</Text>
      <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('PromotionRegister')}>
        <Text style={styles.btnText}>사장님 자율 할인 등록</Text>
      </TouchableOpacity>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Korea-On</Text>
        <Text style={styles.cardBody}>경기도를 시작으로 전국 광역 상생 할인 플랫폼을 확장합니다.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA', padding: 20 },
  header: { fontSize: 22, fontWeight: '800' },
  sub: { fontSize: 13, color: '#6B7280', marginTop: 4, marginBottom: 20 },
  btn: { backgroundColor: '#111827', borderRadius: 12, padding: 16, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '800' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginTop: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  cardTitle: { fontSize: 16, fontWeight: '800' },
  cardBody: { fontSize: 13, color: '#6B7280', marginTop: 6, lineHeight: 20 },
});
