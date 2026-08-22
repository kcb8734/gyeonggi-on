import React, { useEffect, useRef, useState } from 'react';
import { Alert, Image, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import IsolatedImeField from '../components/ui/IsolatedImeField';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import { addFeedPost } from '../stores/feedStore';
import { addLocalCurrencyCoupon, addPoints } from '../stores/appStore';
import { getAuthUser } from '../stores/authStore';
import { pickFromCamera, pickPhotoFromGallery } from '../utils/pickImage';
import { fetchTourFestivals } from '../api/tour';
import { submitFeedReward } from '../api/feeds';
import type { TourFestival } from '../types/tour';

const PRESETS = [
  'https://images.unsplash.com/photo-1549692520-acc6669e2f0c?w=600&q=80',
  'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80',
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&q=80',
  'https://images.unsplash.com/photo-1515165562839-978bbcf01262?w=600&q=80',
];

const DEV_USER_ID = '11111111-1111-4111-8111-111111111111';

async function readGps(): Promise<{ latitude: number; longitude: number } | null> {
  try {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
      return await new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
          () => resolve(null),
          { enableHighAccuracy: true, timeout: 8000 },
        );
      });
    }
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) return null;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
  } catch {
    return null;
  }
}

export default function FeedUploadScreen() {
  const navigation = useNavigation<any>();
  const captionRef = useRef('');
  const [imageUrl, setImageUrl] = useState(PRESETS[0]);
  const [previewNonce, setPreviewNonce] = useState(0);
  const [festivals, setFestivals] = useState<TourFestival[]>([]);
  const [festivalId, setFestivalId] = useState('');
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [gpsLabel, setGpsLabel] = useState('위치 확인 중...');

  useEffect(() => {
    fetchTourFestivals({ areaCode: 'all' })
      .then((list) => {
        setFestivals(list);
        if (list[0]) setFestivalId(list[0].contentId);
      })
      .catch(() => undefined);
    readGps().then((value) => {
      if (value) {
        setCoords(value);
        setGpsLabel(`현장 위치 인증 ${value.latitude.toFixed(4)}, ${value.longitude.toFixed(4)}`);
      } else {
        setGpsLabel('위치 권한을 허용하면 현장 방문 인증이 완료됩니다');
      }
    });
  }, []);

  const submit = async () => {
    const caption = captionRef.current.trim();
    const festival = festivals.find((item) => item.contentId === festivalId);
    if (!coords) {
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
        imageUrl,
        latitude: coords.latitude,
        longitude: coords.longitude,
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
      imageUrl,
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

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ padding: 16, paddingBottom: 36 }}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={{ alignSelf: 'flex-start', backgroundColor: '#111827', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12 }}>
        <Text style={{ color: '#fff', fontWeight: '800' }}>‹ 나가기</Text>
      </TouchableOpacity>
      <View style={styles.banner}>
        <Text style={styles.bannerKicker}>지자체 1:1 매칭 리워드</Text>
        <Text style={styles.bannerTitle}>축제 현장 피드 작성 시 지자체 매칭 포인트(또는 지역화폐 쿠폰) 즉시 적립!</Text>
        <Text style={styles.bannerBody}>피드 1건당 1,000P · 같은 축제는 하루 1회만 지급됩니다.</Text>
      </View>

      <Text style={styles.title}>축제 피드 올리기</Text>
      <Text style={styles.lead}>GPS 위치 인증과 축제 태그가 있어야 보상이 지급됩니다.</Text>
      <Image key={`${previewNonce}-${imageUrl.slice(0, 48)}`} source={{ uri: imageUrl }} style={styles.preview} />
      <Text style={styles.previewHint}>선택한 촬영/갤러리 이미지가 위에 바로 미리보기됩니다.</Text>
      <View style={styles.pickRow}>
        <TouchableOpacity style={styles.pickBtn} onPress={async () => {
          const uri = await pickFromCamera();
          if (uri) {
            setImageUrl(uri);
            setPreviewNonce((n) => n + 1);
          }
        }}>
          <Text style={styles.pickText}>카메라 촬영</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.pickBtn} onPress={async () => {
          const uri = await pickPhotoFromGallery();
          if (uri) {
            setImageUrl(uri);
            setPreviewNonce((n) => n + 1);
          }
        }}>
          <Text style={styles.pickText}>갤러리 사진</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>위치 인증</Text>
      <Text style={styles.gps}>{gpsLabel}</Text>

      <Text style={styles.label}>축제 태그 (필수)</Text>
      <View style={styles.festList}>
        {festivals.map((item) => (
          <TouchableOpacity
            key={item.contentId}
            style={[styles.festChip, festivalId === item.contentId && styles.festChipOn]}
            onPress={() => setFestivalId(item.contentId)}
          >
            <Text style={[styles.festChipText, festivalId === item.contentId && styles.festChipTextOn]} numberOfLines={1}>
              {item.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>썸네일 선택</Text>
      <View style={styles.presets}>
        {PRESETS.map((url) => (
          <TouchableOpacity key={url} onPress={() => { setImageUrl(url); setPreviewNonce((n) => n + 1); }}>
            <Image source={{ uri: url }} style={[styles.preset, imageUrl === url && styles.presetOn]} />
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.label}>한 줄 소개 (한글 입력)</Text>
      <IsolatedImeField
        valueRef={captionRef}
        placeholder="예: 화성행궁 야경 실화냐"
        multiline
      />
      <TouchableOpacity style={styles.submit} onPress={submit}>
        <Text style={styles.submitText}>피드 올리고 1,000P 받기</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F7F8FA' },
  banner: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  bannerKicker: { color: '#FDE68A', fontSize: 11, fontWeight: '800' },
  bannerTitle: { color: '#fff', fontSize: 15, fontWeight: '800', marginTop: 6, lineHeight: 22 },
  bannerBody: { color: '#D1D5DB', fontSize: 12, marginTop: 6 },
  title: { fontSize: 22, fontWeight: '800' },
  lead: { fontSize: 13, color: '#6B7280', marginTop: 6, marginBottom: 14 },
  preview: { width: '100%', height: 220, borderRadius: 16, backgroundColor: '#E5E7EB' },
  previewHint: { fontSize: 12, color: '#6B7280', marginTop: 8, marginBottom: 4 },
  label: { fontSize: 14, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  gps: { fontSize: 13, color: '#2563EB', fontWeight: '700' },
  festList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  festChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 8,
    maxWidth: '100%',
  },
  festChipOn: { backgroundColor: '#111827', borderColor: '#111827' },
  festChipText: { fontSize: 12, fontWeight: '700', color: '#374151' },
  festChipTextOn: { color: '#fff' },
  pickRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  pickBtn: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  pickText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  presets: { flexDirection: 'row', gap: 8 },
  preset: { width: 64, height: 64, borderRadius: 10 },
  presetOn: { borderWidth: 3, borderColor: '#111827' },
  submit: { backgroundColor: '#111827', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  submitText: { color: '#fff', fontWeight: '800' },
});
