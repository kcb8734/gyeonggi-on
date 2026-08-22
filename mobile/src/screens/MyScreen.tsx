import React from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppState } from '../stores/appStore';

export default function MyScreen() {
  const navigation = useNavigation<any>();
  const app = useAppState();

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ padding: 16, paddingBottom: 36 }}>
      <View style={styles.profile}>
        <View style={styles.avatar}><Text style={styles.avatarText}>온</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.hello}>반가워요, 경기온 회원</Text>
          <Text style={styles.grade}>경기도 축제 탐험가</Text>
        </View>
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statNum}>{app.wallet.length}</Text>
          <Text style={styles.statLabel}>보유 쿠폰</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNum}>{app.points.toLocaleString()}</Text>
          <Text style={styles.statLabel}>포인트</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNum}>{app.schedule.length}</Text>
          <Text style={styles.statLabel}>내 일정</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.feedBtn} onPress={() => navigation.navigate('FeedUpload')}>
        <Text style={styles.feedBtnKicker}>축제 현장 공유</Text>
        <Text style={styles.feedBtnTitle}>틱톡형 피드 올리기</Text>
        <Text style={styles.feedBtnBody}>지금 즐기는 축제를 세로 카드로 올려 홈 피드에 바로 보여주세요</Text>
      </TouchableOpacity>

      <View style={styles.merchant}>
        <Text style={styles.merchantKicker}>사장님 전용 코너</Text>
        <Text style={styles.merchantTitle}>가맹점 쿠폰을 직접 열고 정산하세요</Text>
        <Text style={styles.merchantBody}>국세청 계속사업자 인증 후 자율 할인을 바로 등록할 수 있습니다.</Text>
        <TouchableOpacity style={styles.merchantBtn} onPress={() => navigation.navigate('PromotionRegister')}>
          <Text style={styles.merchantBtnText}>자율 할인 등록 (국세청 API 인증)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.merchantGhost} onPress={() => navigation.navigate('MerchantSettlement')}>
          <Text style={styles.merchantGhostText}>내 가맹점 쿠폰 사용 내역 / 정산 현황</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.section}>최근 본 축제</Text>
      {app.recent.length === 0 ? (
        <Text style={styles.empty}>홈에서 축제를 둘러보면 여기에 모입니다</Text>
      ) : (
        app.recent.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.row}
            onPress={() => item.contentId && navigation.navigate('TourDetail', { contentId: item.contentId, contentTypeId: item.contentTypeId })}
          >
            {item.image_url ? <Image source={{ uri: item.image_url }} style={styles.thumb} /> : <View style={styles.thumb} />}
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{item.title}</Text>
              <Text style={styles.rowMeta}>{item.location_name}</Text>
            </View>
          </TouchableOpacity>
        ))
      )}

      <Text style={styles.section}>즐겨찾기 장소</Text>
      {app.favorites.length === 0 ? (
        <Text style={styles.empty}>축제 상세에서 즐겨찾기를 눌러 모아두세요</Text>
      ) : (
        app.favorites.map((item) => (
          <View key={item.id} style={styles.row}>
            {item.image_url ? <Image source={{ uri: item.image_url }} style={styles.thumb} /> : <View style={styles.thumb} />}
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{item.title}</Text>
              <Text style={styles.rowMeta}>{item.location_name}</Text>
            </View>
          </View>
        ))
      )}

      <Text style={styles.section}>고객센터</Text>
      <TouchableOpacity style={styles.menu} onPress={() => navigation.navigate('Support', { topic: 'notice' })}>
        <Text style={styles.menuTitle}>공지사항</Text>
        <Text style={styles.menuMeta}>8월 축제 쿠폰 오픈 · 경기온 베타</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.menu} onPress={() => navigation.navigate('Support', { topic: 'help' })}>
        <Text style={styles.menuTitle}>고객센터</Text>
        <Text style={styles.menuMeta}>쿠폰 사용 · 정산 · 가맹 문의</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.menu}
        onPress={() => Alert.alert('알림 설정', '축제 시작 하루 전 푸시 알림을 받을 수 있습니다.')}
      >
        <Text style={styles.menuTitle}>알림 설정</Text>
        <Text style={styles.menuMeta}>내 일정 {app.schedule.length}건 연동</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F4F6' },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 16,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E0392A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '900', fontSize: 18 },
  hello: { color: '#E5E7EB', fontSize: 13 },
  grade: { color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 4 },
  stats: { flexDirection: 'row', gap: 8, marginTop: 12 },
  stat: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  statNum: { fontSize: 20, fontWeight: '900', color: '#111827' },
  statLabel: { fontSize: 11, color: '#6B7280', marginTop: 4, fontWeight: '700' },
  feedBtn: {
    marginTop: 16,
    backgroundColor: '#111827',
    borderRadius: 18,
    padding: 16,
  },
  feedBtnKicker: { fontSize: 11, fontWeight: '800', color: '#FDE68A' },
  feedBtnTitle: { fontSize: 17, fontWeight: '800', marginTop: 4, color: '#fff' },
  feedBtnBody: { fontSize: 13, color: '#D1D5DB', marginTop: 6, lineHeight: 19 },
  merchant: {
    marginTop: 16,
    backgroundColor: '#FFF7ED',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FDBA74',
  },
  merchantKicker: { fontSize: 11, fontWeight: '800', color: '#C2410C' },
  merchantTitle: { fontSize: 17, fontWeight: '800', marginTop: 4, color: '#111827' },
  merchantBody: { fontSize: 13, color: '#9A3412', marginTop: 6, lineHeight: 19 },
  merchantBtn: { backgroundColor: '#111827', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 14 },
  merchantBtnText: { color: '#fff', fontWeight: '800' },
  merchantGhost: { marginTop: 8, paddingVertical: 10, alignItems: 'center' },
  merchantGhostText: { fontWeight: '800', color: '#9A3412' },
  section: { fontSize: 16, fontWeight: '800', marginTop: 22, marginBottom: 8, color: '#111827' },
  empty: { color: '#6B7280', fontSize: 13 },
  row: { flexDirection: 'row', gap: 10, backgroundColor: '#fff', borderRadius: 14, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  thumb: { width: 54, height: 54, borderRadius: 10, backgroundColor: '#E5E7EB' },
  rowTitle: { fontSize: 14, fontWeight: '800' },
  rowMeta: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  menu: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  menuTitle: { fontSize: 15, fontWeight: '800' },
  menuMeta: { fontSize: 12, color: '#6B7280', marginTop: 4 },
});
