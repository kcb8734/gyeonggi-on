import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const NOTICES = [
  { id: '1', title: '2026년 8월 온앤온(on&on) 축제 쿠폰 오픈', body: '수원·용인·가평 축제와 제휴 상가 할인이 앱에서 바로 발급됩니다.' },
  { id: '2', title: '한국관광공사 TourAPI 연동', body: '경기도 축제 일정과 주변 관광 정보가 실시간으로 갱신됩니다.' },
  { id: '3', title: '국세청 인증 가맹만 매칭', body: '계속사업자만 지자체 1:1 매칭 할인을 등록할 수 있습니다.' },
];

export default function SupportScreen({ topic }: { topic?: 'notice' | 'help' | 'privacy' }) {
  const isHelp = topic === 'help';
  const isPrivacy = topic === 'privacy';
  return (
    <ScrollView style={styles.root} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>{isPrivacy ? '개인정보처리방침' : isHelp ? '고객센터' : '공지사항'}</Text>
      {isPrivacy ? (
        <View>
          <Text style={styles.body}>
            온앤온(on&on)은 축제 현장 인증, 쿠폰 발급, 가맹점 국세청 확인에 필요한 최소한의 개인정보만 처리합니다.
          </Text>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>수집 항목</Text>
            <Text style={styles.meta}>
              로그인 식별정보(카카오/구글), 닉네임, 위치(현장 인증 시), 피드 사진, 쿠폰 이용 내역, 가맹점 사업자등록번호·상호명.
            </Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>이용 목적</Text>
            <Text style={styles.meta}>
              축제 참여 인증, 할인쿠폰·지역화폐 쿠폰 발급, 가맹점 계속사업자 확인, 고객 문의 응대, 부정 이용 방지.
            </Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>보유 기간</Text>
            <Text style={styles.meta}>
              회원 탈퇴 또는 목적 달성 후 지체 없이 파기합니다. 관련 법령에 따라 거래 기록은 최대 5년간 보관할 수 있습니다.
            </Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>제3자 제공</Text>
            <Text style={styles.meta}>
              국세청 사업자 상태조회, 한국관광공사 TourAPI, 결제·문자 대행 등 서비스 수행에 필요한 범위에서만 제공합니다.
            </Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>권리와 문의</Text>
            <Text style={styles.meta}>
              열람·정정·삭제·처리정지를 요청할 수 있습니다. 문의: help@gyeonggi-on.kr / 경기도 콜센터 120.
            </Text>
          </View>
        </View>
      ) : isHelp ? (
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
