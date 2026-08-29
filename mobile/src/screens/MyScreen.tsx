import React, { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import SafeFestivalImage from '../components/ui/SafeFestivalImage';
import FestivalRegisterModal from '../components/ui/FestivalRegisterModal';
import ProfileEditModal from '../components/ui/ProfileEditModal';
import { forgetFestival, syncRewardBalance, toggleFavorite, useAppState } from '../stores/appStore';
import { clearAuthSession, useAuthUser } from '../stores/authStore';
import { logoutFestivalManager, useManagerState } from '../stores/managerStore';
import { deleteMyFeedPost, useMyFeedPosts } from '../stores/feedStore';
import { fetchRewardBalance } from '../api/feeds';

export default function MyScreen() {
  const navigation = useNavigation<any>();
  const app = useAppState();
  const user = useAuthUser();
  const myFeeds = useMyFeedPosts();
  const [festivalModal, setFestivalModal] = useState(false);
  const [profileModal, setProfileModal] = useState(false);
  const manager = useManagerState();

  useEffect(() => {
    const userId = user?.id ?? '11111111-1111-4111-8111-111111111111';
    fetchRewardBalance(userId)
      .then((balance) => {
        if (balance) syncRewardBalance(balance.points, balance.coupons ?? []);
      })
      .catch(() => undefined);
  }, [user?.id]);

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <View style={styles.profileSection}>
        <View style={styles.profileRow}>
          {user?.avatarUrl
            ? <Image source={{ uri: user.avatarUrl }} style={styles.avatarImg} />
            : <View style={styles.avatar}><Text style={styles.avatarText}>온</Text></View>}
          <View style={{ flex: 1 }}>
            <Text style={styles.hello}>
              {user
                ? (user.provider === 'kakao' ? '카카오 로그인' : user.provider === 'google' ? '구글 로그인' : '로컬 프로필')
                : '온앤온+(on&on+)'}
            </Text>
            <Text style={styles.grade}>{user ? user.nickname : '로그인하고 축제를 기록하세요'}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.profileEdit} onPress={() => setProfileModal(true)}>
          <Text style={styles.profileEditText}>프로필 등록 · 수정</Text>
        </TouchableOpacity>
        {user && user.provider !== 'local' ? (
          <TouchableOpacity style={styles.loginGhost} onPress={() => clearAuthSession()}>
            <Text style={styles.loginGhostText}>로그아웃</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.loginBtn} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginBtnText}>카카오 / 구글로 로그인</Text>
          </TouchableOpacity>
        )}
        <View style={styles.assetBlock}>
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statNum}>{app.wallet.length}</Text>
              <Text style={styles.statLabel}>보유 쿠폰</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNum}>{app.points.toLocaleString()}</Text>
              <Text style={styles.statLabel}>온앤온+ 포인트</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNum}>{app.localCoupons.length}</Text>
              <Text style={styles.statLabel}>지역화폐 쿠폰</Text>
            </View>
          </View>
          <Text style={styles.rewardHint}>
            축제 현장 피드 1건당 지자체 1:1 매칭 1,000P와 지역화폐 쿠폰이 적립됩니다.
          </Text>
          {app.localCoupons.length === 0 ? (
            <Text style={styles.assetEmpty}>아직 받은 지역화폐 쿠폰이 없습니다</Text>
          ) : (
            app.localCoupons.slice(0, 4).map((coupon) => (
              <View key={coupon.id} style={styles.couponRow}>
                <Text style={styles.couponTitle}>{coupon.title}</Text>
                <Text style={styles.couponMeta}>{coupon.festivalTitle} · {coupon.amount.toLocaleString()}원</Text>
              </View>
            ))
          )}
        </View>
      </View>

      <TouchableOpacity style={styles.feedBtn} onPress={() => navigation.navigate('FeedUpload')}>
        <Text style={styles.feedBtnKicker}>축제 현장 공유 · 1,000P</Text>
        <Text style={styles.feedBtnTitle}>틱톡형 피드 올리기</Text>
        <Text style={styles.feedBtnBody}>GPS·축제 태그 후 올리면 지자체 매칭 포인트가 적립되고, 아래 저장소에 보관됩니다.</Text>
      </TouchableOpacity>

      <View style={styles.vault}>
        <Text style={styles.cardKicker}>내가 올린 피드 저장소</Text>
        <Text style={styles.cardTitle}>{myFeeds.length}건 보관 중</Text>
        <Text style={styles.cardBody}>이 기기 저장소에 남습니다. 카드를 누르면 전체화면으로 다시 볼 수 있습니다.</Text>
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
                  {post.rewarded === false ? '지자체 1:1 매칭 피드' : '리워드 지급완료'}
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
        <Text style={styles.cardTitle}>가맹점 쿠폰을 직접 열고 정산하세요</Text>
        <Text style={styles.merchantBody}>국세청 계속사업자 인증 후 할인 쿠폰을 바로 등록할 수 있습니다.</Text>
        <TouchableOpacity style={styles.merchantBtn} onPress={() => navigation.navigate('PromotionRegister')}>
          <Text style={styles.merchantBtnText}>할인 쿠폰 등록 · 상호명 한글 입력</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.merchantGhost} onPress={() => navigation.navigate('MerchantSettlement')}>
          <Text style={styles.merchantGhostText}>내 가맹점 쿠폰 사용 내역 / 정산 현황</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.gov}>
        <Text style={styles.govKicker}>지자체 담당자 코너</Text>
        <Text style={styles.cardTitle}>우리 지역 축제를 직접 등록하세요</Text>
        <Text style={styles.govBody}>우리 지역 축제를 직접 등록하고 지역화폐 쿠폰을 연동하세요</Text>
        <TouchableOpacity style={styles.govBtn} onPress={() => setFestivalModal(true)}>
          <Text style={styles.govBtnText}>지자체 축제 등록하기</Text>
        </TouchableOpacity>
        {manager.sessionEmail ? (
          <TouchableOpacity style={styles.merchantGhost} onPress={logoutFestivalManager}>
            <Text style={styles.merchantGhostText}>{manager.sessionEmail} 담당자 로그아웃</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.govMeta}>메일 인증과 비밀번호로 담당자를 등록하면 다시 관리할 수 있습니다.</Text>
        )}
        {app.localFestivals.length ? (
          <Text style={styles.govMeta}>이 기기에서 등록한 축제 {app.localFestivals.length}건 · 홈 리스트에 바로 반영</Text>
        ) : null}
      </View>

      <View style={styles.centerBox}>
        <Text style={styles.centerKicker}>지역 센터장</Text>
        <Text style={styles.cardTitle}>지역센터장 선정 현황 · 지원하기</Text>
        <Text style={styles.centerBody}>
          지역센터 운영 취지와 17개 권역 선정 현황을 확인하고, 시·군·구 센터장에 지원하세요.
        </Text>
        <TouchableOpacity style={styles.centerBtn} onPress={() => navigation.navigate('CenterDirectors', { tab: 'status' })}>
          <Text style={styles.centerBtnText}>지역센터장 선정 현황 · 지원하기</Text>
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
            onPress={() => item.contentId && navigation.navigate('TourDetail', {
              contentId: item.contentId,
              contentTypeId: item.contentTypeId,
              tel: item.tel,
              title: item.title,
            })}
          >
            <SafeFestivalImage uri={item.image_url} title={item.title} style={styles.thumb} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{item.title}</Text>
              <Text style={styles.rowMeta}>{item.location_name}</Text>
            </View>
            <TouchableOpacity
              onPress={() => forgetFestival(item.id)}
              accessibilityRole="button"
              accessibilityLabel="최근 본 축제 삭제"
            >
              <Text style={styles.deleteText}>삭제</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))
      )}

      <Text style={styles.section}>즐겨찾기 장소</Text>
      <Text style={styles.sectionHint}>축제 상세 화면의 즐겨찾기 버튼으로 모아둘 수 있습니다.</Text>
      {app.favorites.length === 0 ? (
        <Text style={styles.empty}>아직 즐겨찾은 축제가 없습니다</Text>
      ) : (
        app.favorites.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.row}
            onPress={() => item.contentId && navigation.navigate('TourDetail', {
              contentId: item.contentId,
              contentTypeId: item.contentTypeId,
              tel: item.tel,
              title: item.title,
            })}
          >
            <SafeFestivalImage uri={item.image_url} title={item.title} style={styles.thumb} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{item.title}</Text>
              <Text style={styles.rowMeta}>{item.location_name}</Text>
            </View>
            <TouchableOpacity onPress={() => toggleFavorite(item)}>
              <Text style={styles.deleteText}>해제</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))
      )}

      <Text style={styles.section}>고객센터</Text>
      <View style={styles.listGroup}>
        <TouchableOpacity style={styles.menu} onPress={() => navigation.navigate('Support', { topic: 'notice' })}>
          <Text style={styles.menuTitle}>공지사항</Text>
          <Text style={styles.menuMeta}>8월 축제 쿠폰 오픈 · 온앤온+(on&on+)</Text>
        </TouchableOpacity>
        <View style={styles.menuDivider} />
        <TouchableOpacity style={styles.menu} onPress={() => navigation.navigate('Support', { topic: 'help' })}>
          <Text style={styles.menuTitle}>고객센터</Text>
          <Text style={styles.menuMeta}>쿠폰 사용 · 정산 · 가맹 문의</Text>
        </TouchableOpacity>
        <View style={styles.menuDivider} />
        <TouchableOpacity style={styles.menu} onPress={() => navigation.navigate('Support', { topic: 'privacy' })}>
          <Text style={styles.menuTitle}>개인정보처리방침</Text>
          <Text style={styles.menuMeta}>수집 항목 · 이용 목적 · 보유 기간</Text>
        </TouchableOpacity>
        <View style={styles.menuDivider} />
        <TouchableOpacity
          style={styles.menu}
          onPress={() => Alert.alert('알림 설정', '축제 시작 하루 전 푸시 알림을 받을 수 있습니다.')}
        >
          <Text style={styles.menuTitle}>알림 설정</Text>
          <Text style={styles.menuMeta}>내 일정 {app.schedule.length}건 연동</Text>
        </TouchableOpacity>
        <View style={styles.menuDivider} />
        <TouchableOpacity style={styles.menu} onPress={() => navigation.navigate('Admin')}>
          <Text style={styles.menuTitle}>관리자 페이지</Text>
          <Text style={styles.menuMeta}>kdanji.com/admin · TourAPI 수집 안내</Text>
        </TouchableOpacity>
      </View>
      <FestivalRegisterModal visible={festivalModal} onClose={() => setFestivalModal(false)} />
      <ProfileEditModal visible={profileModal} onClose={() => setProfileModal(false)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F4F6' },
  profileSection: {
    backgroundColor: '#111827',
    borderRadius: 22,
    overflow: 'hidden',
  },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 16 },
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
  profileEdit: {
    marginTop: 12,
    marginHorizontal: 16,
    backgroundColor: '#374151',
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
  },
  profileEditText: { color: '#fff', fontWeight: '800' },
  loginBtn: { marginTop: 12, marginHorizontal: 16, backgroundColor: '#FEE500', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  loginBtnText: { fontWeight: '800', color: '#191919' },
  loginGhost: { marginTop: 8, marginBottom: 4, alignItems: 'center', paddingVertical: 8 },
  loginGhostText: { fontWeight: '800', color: '#D1D5DB' },
  hello: { color: '#E5E7EB', fontSize: 13, fontWeight: '600' },
  grade: { color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 4 },
  assetBlock: { marginTop: 14, backgroundColor: '#F3F4F6', padding: 14 },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  statNum: { fontSize: 20, fontWeight: '900', color: '#111827' },
  statLabel: { fontSize: 11, color: '#555555', marginTop: 4, fontWeight: '700' },
  rewardHint: { fontSize: 13, color: '#555555', marginTop: 12, lineHeight: 20, fontWeight: '600' },
  assetEmpty: { color: '#555555', fontSize: 13, fontWeight: '600', marginTop: 10 },
  couponTitle: { fontSize: 14, fontWeight: '800', color: '#111827' },
  couponMeta: { fontSize: 12, color: '#555555', marginTop: 4, fontWeight: '600' },
  feedBtn: {
    marginTop: 22,
    backgroundColor: '#1F2937',
    borderRadius: 18,
    padding: 16,
  },
  feedBtnKicker: { fontSize: 12, fontWeight: '800', color: '#FDE68A' },
  feedBtnTitle: { fontSize: 18, fontWeight: '800', marginTop: 4, color: '#fff' },
  feedBtnBody: { fontSize: 13, color: '#E5E7EB', marginTop: 6, lineHeight: 20, fontWeight: '600' },
  merchant: {
    marginTop: 22,
    backgroundColor: '#FFF7ED',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FDBA74',
  },
  merchantKicker: { fontSize: 12, fontWeight: '800', color: '#9A3412' },
  merchantBody: { fontSize: 13, color: '#7C2D12', marginTop: 6, lineHeight: 20, fontWeight: '600' },
  merchantBtn: { backgroundColor: '#111827', borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 14 },
  merchantBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  merchantGhost: { marginTop: 8, paddingVertical: 10, alignItems: 'center' },
  merchantGhostText: { fontWeight: '800', color: '#9A3412' },
  gov: {
    marginTop: 22,
    backgroundColor: '#F0FDFA',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#99F6E4',
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  govKicker: { fontSize: 12, fontWeight: '800', color: '#0F766E' },
  govBody: { fontSize: 13, color: '#115E59', marginTop: 6, lineHeight: 20, fontWeight: '600' },
  govBtn: { backgroundColor: '#111827', borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 14 },
  govBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  govMeta: { fontSize: 12, color: '#555555', marginTop: 10, fontWeight: '600' },
  centerBox: {
    marginTop: 22,
    backgroundColor: '#FFF7ED',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FDBA74',
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  centerKicker: { fontSize: 12, fontWeight: '800', color: '#9A3412' },
  centerBody: { fontSize: 13, color: '#9A3412', marginTop: 6, lineHeight: 20, fontWeight: '600' },
  centerBtn: { backgroundColor: '#EA580C', borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 14 },
  centerBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  cardKicker: { fontSize: 12, fontWeight: '800', color: '#3730A3' },
  cardTitle: { fontSize: 17, fontWeight: '800', marginTop: 4, color: '#111827' },
  cardBody: { fontSize: 13, color: '#374151', marginTop: 6, lineHeight: 20, fontWeight: '600' },
  couponRow: { marginTop: 10, backgroundColor: '#fff', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  vault: {
    marginTop: 22,
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
  vaultBadge: { fontSize: 11, fontWeight: '800', color: '#92400E', marginTop: 4 },
  deleteText: { fontWeight: '800', color: '#B91C1C', fontSize: 12, padding: 8 },
  section: { fontSize: 18, fontWeight: '700', marginTop: 28, marginBottom: 10, color: '#111827' },
  sectionHint: { fontSize: 13, color: '#374151', marginTop: -4, marginBottom: 10, fontWeight: '600' },
  empty: { color: '#374151', fontSize: 13, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 10, backgroundColor: '#fff', borderRadius: 14, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center' },
  thumb: { width: 54, height: 54, borderRadius: 10, backgroundColor: '#E5E7EB' },
  rowTitle: { fontSize: 14, fontWeight: '800', color: '#111827' },
  rowMeta: { fontSize: 12, color: '#374151', marginTop: 4, fontWeight: '600' },
  listGroup: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  menu: { padding: 16 },
  menuDivider: { height: 1, backgroundColor: '#E5E7EB', marginHorizontal: 16 },
  menuTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  menuMeta: { fontSize: 13, color: '#374151', marginTop: 4, fontWeight: '600' },
});
