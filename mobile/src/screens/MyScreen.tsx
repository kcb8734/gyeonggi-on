import React, { useEffect } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { syncRewardBalance, useAppState } from '../stores/appStore';
import { clearAuthSession, useAuthUser } from '../stores/authStore';
import { deleteMyFeedPost, useMyFeedPosts } from '../stores/feedStore';
import { fetchRewardBalance } from '../api/feeds';

export default function MyScreen() {
  const navigation = useNavigation<any>();
  const app = useAppState();
  const user = useAuthUser();
  const myFeeds = useMyFeedPosts();

  useEffect(() => {
    const userId = user?.id ?? '11111111-1111-4111-8111-111111111111';
    fetchRewardBalance(userId)
      .then((balance) => {
        if (balance) syncRewardBalance(balance.points, balance.coupons ?? []);
      })
      .catch(() => undefined);
  }, [user?.id]);

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ padding: 16, paddingBottom: 36 }}>
      <View style={styles.profile}>
        {user?.avatarUrl
          ? <Image source={{ uri: user.avatarUrl }} style={styles.avatarImg} />
          : <View style={styles.avatar}><Text style={styles.avatarText}>온</Text></View>}
        <View style={{ flex: 1 }}>
          <Text style={styles.hello}>{user ? `${user.provider === 'kakao' ? '카카오' : '구글'} 로그인` : '온앤온(on&on)'}</Text>
          <Text style={styles.grade}>{user ? user.nickname : '로그인하고 축제를 기록하세요'}</Text>
        </View>
      </View>
      {user ? (
        <TouchableOpacity style={styles.loginGhost} onPress={() => clearAuthSession()}>
          <Text style={styles.loginGhostText}>로그아웃</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.loginBtn} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.loginBtnText}>카카오 / 구글로 로그인</Text>
        </TouchableOpacity>
      )}

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statNum}>{app.wallet.length}</Text>
          <Text style={styles.statLabel}>보유 쿠폰</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNum}>{app.points.toLocaleString()}</Text>
          <Text style={styles.statLabel}>온앤온 포인트</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNum}>{app.localCoupons.length}</Text>
          <Text style={styles.statLabel}>지역화폐 쿠폰</Text>
        </View>
      </View>

      <View style={styles.rewardBox}>
        <Text style={styles.merchantKicker}>내 보유 포인트 / 지역화폐 쿠폰</Text>
        <Text style={styles.merchantTitle}>{app.points.toLocaleString()} P</Text>
        <Text style={styles.merchantBody}>
          축제 현장 피드 1건당 지자체 1:1 매칭 1,000P와 지역화폐 쿠폰이 적립됩니다.
        </Text>
        {app.localCoupons.length === 0 ? (
          <Text style={styles.empty}>아직 받은 지역화폐 쿠폰이 없습니다</Text>
        ) : (
          app.localCoupons.slice(0, 4).map((coupon) => (
            <View key={coupon.id} style={styles.couponRow}>
              <Text style={styles.rowTitle}>{coupon.title}</Text>
              <Text style={styles.rowMeta}>{coupon.festivalTitle} · {coupon.amount.toLocaleString()}원</Text>
            </View>
          ))
        )}
      </View>

      <TouchableOpacity style={styles.feedBtn} onPress={() => navigation.navigate('FeedUpload')}>
        <Text style={styles.feedBtnKicker}>축제 현장 공유 · 1,000P</Text>
        <Text style={styles.feedBtnTitle}>틱톡형 피드 올리기</Text>
        <Text style={styles.feedBtnBody}>GPS·축제 태그 후 올리면 지자체 매칭 포인트가 적립되고, 아래 저장소에 보관됩니다.</Text>
      </TouchableOpacity>

      <View style={styles.vault}>
        <Text style={styles.merchantKicker}>내가 올린 피드 저장소</Text>
        <Text style={styles.merchantTitle}>{myFeeds.length}건 보관 중</Text>
        <Text style={styles.merchantBody}>이 기기 저장소에 남습니다. 카드를 누르면 전체화면으로 다시 볼 수 있습니다.</Text>
        {myFeeds.length === 0 ? (
          <Text style={styles.empty}>아직 올린 피드가 없습니다. 위에서 현장 피드를 올려 보세요.</Text>
        ) : (
          myFeeds.map((post) => (
            <TouchableOpacity
              key={post.id}
              style={styles.vaultRow}
              onPress={() => navigation.navigate('FeedView', { postId: post.id })}
            >
              <Image source={{ uri: post.imageUrl }} style={styles.thumb} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={2}>{post.caption}</Text>
                <Text style={styles.rowMeta}>{post.festival ?? '축제'} · {post.createdAt}</Text>
                <Text style={styles.vaultBadge}>
                  {post.rewarded === false ? '지자체 1:1 매칭 피드' : '🎁 리워드 지급완료'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  Alert.alert('삭제', '이 피드를 저장소에서 지울까요?', [
                    { text: '취소', style: 'cancel' },
                    { text: '삭제', style: 'destructive', onPress: () => deleteMyFeedPost(post.id) },
                  ]);
                }}
              >
                <Text style={styles.deleteText}>삭제</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}
      </View>

      <View style={styles.merchant}>
        <Text style={styles.merchantKicker}>사장님 전용 코너</Text>
        <Text style={styles.merchantTitle}>가맹점 쿠폰을 직접 열고 정산하세요</Text>
        <Text style={styles.merchantBody}>국세청 계속사업자 인증 후 자율 할인을 바로 등록할 수 있습니다.</Text>
        <TouchableOpacity style={styles.merchantBtn} onPress={() => navigation.navigate('PromotionRegister')}>
          <Text style={styles.merchantBtnText}>자율 할인 등록 · 상호명 한글 입력</Text>
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
        <Text style={styles.menuMeta}>8월 축제 쿠폰 오픈 · 온앤온(on&on)</Text>
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
  avatarImg: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#374151' },
  loginBtn: { marginTop: 10, backgroundColor: '#FEE500', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  loginBtnText: { fontWeight: '800', color: '#191919' },
  loginGhost: { marginTop: 8, alignItems: 'center', paddingVertical: 8 },
  loginGhostText: { fontWeight: '800', color: '#6B7280' },
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
  rewardBox: {
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  couponRow: { marginTop: 10, backgroundColor: '#F9FAFB', borderRadius: 12, padding: 10 },
  vault: {
    marginTop: 16,
    backgroundColor: '#EEF2FF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  vaultRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 10,
    marginTop: 10,
  },
  vaultBadge: { fontSize: 11, fontWeight: '800', color: '#B4530A', marginTop: 4 },
  deleteText: { fontWeight: '800', color: '#B91C1C', fontSize: 12, padding: 8 },
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
