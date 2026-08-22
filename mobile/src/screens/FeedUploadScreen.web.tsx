import React, { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import { addFeedPost } from '../stores/feedStore';
import { addLocalCurrencyCoupon, addPoints } from '../stores/appStore';
import { getAuthUser } from '../stores/authStore';
import { fetchTourFestivals } from '../api/tour';
import { submitFeedReward } from '../api/feeds';
import type { TourFestival } from '../types/tour';
import { pickFromCamera, pickFromGallery } from '../utils/pickImage';
import { mountBodyOverlay } from '../utils/nativeImeHost';

const PRESETS = [
  'https://images.unsplash.com/photo-1549692520-acc6669e2f0c?w=600&q=80',
  'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80',
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&q=80',
  'https://images.unsplash.com/photo-1515165562839-978bbcf01262?w=600&q=80',
];
const DEV_USER_ID = '11111111-1111-4111-8111-111111111111';

const FORM = `
<div style="font-family:'Noto Sans KR','Apple SD Gothic Neo',sans-serif;color:#111827;background:#F7F8FA;min-height:100%;box-sizing:border-box">
  <div style="position:sticky;top:0;z-index:6;background:#fff;border-bottom:1px solid #E5E7EB;padding:10px 12px;display:flex;align-items:center;gap:10px">
    <button id="exitBtn" type="button" style="border:0;background:#111827;color:#fff;border-radius:10px;padding:8px 12px;font-weight:800;font-size:14px;font-family:inherit;cursor:pointer">‹ 나가기</button>
    <strong style="font-size:16px">피드 올리기</strong>
  </div>
  <div style="padding:16px 16px 40px">
  <div style="background:#ECFDF5;border:1px solid #6EE7B7;color:#065F46;border-radius:12px;padding:10px;font-size:12px;font-weight:700;margin-bottom:12px">한 줄 소개는 #root 밖 브라우저 기본 입력입니다. ‘화성행궁 야경’을 쳐 보세요.</div>
  <div style="background:#111827;color:#fff;border-radius:16px;padding:14px;margin-bottom:14px"><b style="color:#FDE68A;display:block;font-size:11px">지자체 1:1 매칭 리워드</b>축제 현장 피드 작성 시 지자체 매칭 포인트(또는 지역화폐 쿠폰) 즉시 적립!</div>
  <h1 style="font-size:22px;margin:0 0 8px">축제 피드 올리기</h1>
  <img id="preview" src="${PRESETS[0]}" style="width:100%;height:200px;object-fit:cover;border-radius:16px;background:#E5E7EB" />
  <div style="display:flex;gap:8px;margin-top:8px">
    <button id="cam" type="button" style="flex:1;border:0;border-radius:10px;padding:12px;font-weight:800;font-family:inherit;cursor:pointer;background:#111827;color:#fff">카메라 촬영</button>
    <button id="gal" type="button" style="flex:1;border:0;border-radius:10px;padding:12px;font-weight:800;font-family:inherit;cursor:pointer;background:#111827;color:#fff">갤러리 사진/영상</button>
  </div>
  <label style="display:block;font-weight:700;margin:14px 0 6px;font-size:14px">위치 인증</label>
  <div id="gps" style="color:#2563EB;font-weight:700;font-size:13px">위치 확인 중...</div>
  <label for="festival" style="display:block;font-weight:700;margin:14px 0 6px;font-size:14px">축제 태그 (필수)</label>
  <select id="festival" style="width:100%;box-sizing:border-box;border:1px solid #DDD;border-radius:8px;padding:12px;font-size:16px;font-family:inherit;background:#fff"><option value="">축제를 불러오는 중</option></select>
  <label for="caption" style="display:block;font-weight:700;margin:14px 0 6px;font-size:14px">한 줄 소개 (한글 입력)</label>
  <textarea id="caption" lang="ko" placeholder="예: 화성행궁 야경 실화냐" autocomplete="off" autocorrect="off" spellcheck="false" style="width:100%;box-sizing:border-box;border:1px solid #DDD;border-radius:8px;padding:12px;font-size:16px;font-family:inherit;background:#fff;min-height:96px"></textarea>
  <button id="submit" type="button" style="width:100%;border:0;border-radius:10px;padding:14px;font-weight:800;font-size:16px;font-family:inherit;cursor:pointer;background:#111827;color:#fff;margin-top:18px">피드 올리고 1,000P 받기</button>
  </div>
</div>
`;

export default function FeedUploadScreen() {
  const navigation = useNavigation<any>();
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const festivalsRef = useRef<TourFestival[]>([]);
  const imageRef = useRef(PRESETS[0]);
  const coordsRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const [festivals, setFestivals] = useState<TourFestival[]>([]);
  const [imageUrl, setImageUrl] = useState(PRESETS[0]);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [gpsLabel, setGpsLabel] = useState('위치 확인 중...');

  useEffect(() => {
    fetchTourFestivals({ areaCode: 'all' })
      .then(setFestivals)
      .catch(() => undefined);
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const next = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
          setCoords(next);
          setGpsLabel(`현장 위치 인증 ${next.latitude.toFixed(4)}, ${next.longitude.toFixed(4)}`);
        },
        () => setGpsLabel('위치 권한을 허용하면 현장 방문 인증이 완료됩니다'),
        { enableHighAccuracy: true, timeout: 8000 },
      );
    } else {
      Location.requestForegroundPermissionsAsync()
        .then((permission) => (permission.granted ? Location.getCurrentPositionAsync({}) : null))
        .then((pos) => {
          if (!pos) return;
          const next = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
          setCoords(next);
          setGpsLabel(`현장 위치 인증 ${next.latitude.toFixed(4)}, ${next.longitude.toFixed(4)}`);
        })
        .catch(() => setGpsLabel('위치 권한을 허용하면 현장 방문 인증이 완료됩니다'));
    }
  }, []);

  useEffect(() => {
    festivalsRef.current = festivals;
    imageRef.current = imageUrl;
    coordsRef.current = coords;
    const root = overlayRef.current;
    if (!root) return;
    const preview = root.querySelector('#preview') as HTMLImageElement | null;
    const gps = root.querySelector('#gps');
    const select = root.querySelector('#festival') as HTMLSelectElement | null;
    if (preview) preview.src = imageUrl;
    if (gps) gps.textContent = gpsLabel;
    if (select && festivals.length) {
      const current = select.value;
      select.innerHTML = festivals.map((item) => `<option value="${item.contentId}">${item.title}</option>`).join('');
      if (current) select.value = current;
    }
  }, [coords, festivals, gpsLabel, imageUrl]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const { root, dispose } = mountBodyOverlay(FORM);
    overlayRef.current = root;

    const onPick = async (type: 'camera' | 'gallery') => {
      const uri = type === 'camera' ? await pickFromCamera() : await pickFromGallery();
      if (uri) setImageUrl(uri);
    };

    const onSubmit = async () => {
      const caption = ((root.querySelector('#caption') as HTMLTextAreaElement | null)?.value || '').trim();
      const festivalId = (root.querySelector('#festival') as HTMLSelectElement | null)?.value;
      const festival = festivalsRef.current.find((item) => item.contentId === festivalId) ?? festivalsRef.current[0];
      const currentCoords = coordsRef.current;
      if (!currentCoords) {
        Alert.alert('위치 인증 필요', 'GPS 현재 위치를 확인한 뒤 피드를 올릴 수 있습니다.');
        return;
      }
      if (!festival) {
        Alert.alert('축제 선택 필요', '현장 방문 인증을 위해 축제를 선택해주세요.');
        return;
      }
      if (!caption) {
        Alert.alert('알림', '한 줄 소개를 입력해주세요.');
        return;
      }
      let rewarded = true;
      let pointsAwarded = 1000;
      let badge: '지자체 지원 리워드 지급완료' | '지자체 1:1 매칭 피드' = '지자체 지원 리워드 지급완료';
      try {
        const reward = await submitFeedReward({
          userId: getAuthUser()?.id ?? DEV_USER_ID,
          festivalId: festival.contentId,
          festivalTitle: festival.title,
          caption,
          imageUrl: imageRef.current,
          latitude: currentCoords.latitude,
          longitude: currentCoords.longitude,
        });
        rewarded = reward.rewarded;
        pointsAwarded = reward.pointsAwarded;
        badge = reward.badge;
        if (reward.rewarded) {
          addPoints(reward.pointsAwarded);
          if (reward.coupon) addLocalCurrencyCoupon(reward.coupon);
        }
      } catch {
        addPoints(1000);
        addLocalCurrencyCoupon({
          id: `lc-local-${Date.now()}`,
          title: `${festival.title} 지역화폐 1,000원`,
          amount: 1000,
          kind: 'LOCAL_CURRENCY',
          festivalId: festival.contentId,
          festivalTitle: festival.title,
          issuedAt: new Date().toISOString(),
        });
      }
      addFeedPost({
        caption,
        festival: festival.title,
        festivalId: festival.contentId,
        imageUrl: imageRef.current,
        author: getAuthUser()?.nickname,
        rewarded,
        pointsAwarded,
        badge,
      });
      Alert.alert(
        rewarded ? '리워드 지급 완료' : '피드 등록',
        rewarded
          ? `지자체 1:1 매칭 ${pointsAwarded.toLocaleString()}P와 지역화폐 쿠폰이 적립되었습니다.`
          : '오늘은 해당 축제 보상을 이미 받았습니다. 피드는 등록되었습니다.',
      );
      navigation.goBack();
    };

    root.querySelector('#exitBtn')?.addEventListener('click', () => navigation.goBack());
    root.querySelector('#cam')?.addEventListener('click', () => { void onPick('camera'); });
    root.querySelector('#gal')?.addEventListener('click', () => { void onPick('gallery'); });
    root.querySelector('#submit')?.addEventListener('click', () => { void onSubmit(); });

    return () => {
      dispose();
      overlayRef.current = null;
    };
  }, [navigation]);

  return <View style={styles.host} />;
}

const styles = StyleSheet.create({
  host: { flex: 1, minHeight: 720, backgroundColor: '#F7F8FA' },
});
