import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import IsolatedImeField from './IsolatedImeField';
import { FESTIVAL_CATEGORIES, GYEONGGI_CITY_COORDS, METRO_LOCALITIES } from '../../constants/regions';
import { addLocalFestival } from '../../stores/appStore';
import type { HomeFestival } from '../../types/home';
import { pickPhotoFromGallery } from '../../utils/pickImage';
import { readLiveImeValue, setImeModalLock } from '../../utils/nativeImeHost';

const CITIES = METRO_LOCALITIES.GYEONGGI;

function DateField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
}) {
  if (Platform.OS === 'web') {
    return (
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={{
          width: '100%',
          border: '1px solid #E5E7EB',
          borderRadius: 12,
          padding: '12px 14px',
          fontSize: 15,
          fontWeight: 600,
          color: '#111827',
          background: '#fff',
        }}
      />
    );
  }
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      style={styles.input}
    />
  );
}

export default function FestivalRegisterModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const titleRef = useRef('');
  const addressRef = useRef('');
  const summaryRef = useRef('');
  const overviewRef = useRef('');
  const [localityId, setLocalityId] = useState(CITIES[0]?.id ?? '수원시');
  const [category, setCategory] = useState<string>('먹거리');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [posterUrl, setPosterUrl] = useState('');
  const [rewardEnabled, setRewardEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setImeModalLock(visible);
    return () => setImeModalLock(false);
  }, [visible]);

  const reset = () => {
    titleRef.current = '';
    addressRef.current = '';
    summaryRef.current = '';
    overviewRef.current = '';
    setLocalityId(CITIES[0]?.id ?? '수원시');
    setCategory('먹거리');
    setStartDate('');
    setEndDate('');
    setPosterUrl('');
    setRewardEnabled(true);
  };

  const pickPoster = async () => {
    const uri = await pickPhotoFromGallery();
    if (uri) setPosterUrl(uri);
  };

  const handleSave = async () => {
    const title = (readLiveImeValue('govFestivalTitle') || titleRef.current).trim();
    const address = (readLiveImeValue('govFestivalAddress') || addressRef.current).trim();
    const summary = (readLiveImeValue('govFestivalSummary') || summaryRef.current).trim();
    const overview = (readLiveImeValue('govFestivalOverview') || overviewRef.current).trim();
    const locality = CITIES.find((item) => item.id === localityId) ?? CITIES[0];
    if (!title) {
      Alert.alert('알림', '축제명을 입력해주세요.');
      return;
    }
    if (!address) {
      Alert.alert('알림', '장소/주소를 입력해주세요.');
      return;
    }
    if (!startDate || !endDate) {
      Alert.alert('알림', '축제 기간을 선택해주세요.');
      return;
    }
    setSaving(true);
    const coords = GYEONGGI_CITY_COORDS[locality.label] ?? { lat: 37.2636, lng: 127.0286 };
    const contentId = `gov-${Date.now()}`;
    const festival: HomeFestival = {
      id: contentId,
      title,
      location_name: `${locality.label} ${address}`,
      latitude: coords.lat,
      longitude: coords.lng,
      start_date: startDate,
      end_date: endDate,
      municipality_name: locality.label,
      description: overview || summary,
      summary,
      category,
      image_url: posterUrl || null,
      is_trending: true,
      contentId,
      contentTypeId: '15',
      source: 'gov',
      rewardEnabled,
    };
    addLocalFestival(festival);
    try {
      await fetch('/api/admin/festivals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId: festival.contentId,
          title: festival.title,
          address: festival.location_name,
          overview: festival.description,
          eventStartDate: startDate,
          eventEndDate: endDate,
          firstImage: posterUrl,
          category,
          eventPlace: address,
          mapX: coords.lng,
          mapY: coords.lat,
        }),
      });
    } catch {
      // 로컬 저장은 이미 반영
    }
    setSaving(false);
    Alert.alert(
      '등록 완료',
      rewardEnabled
        ? `${locality.label} 축제를 등록했습니다. 홈 리스트와 지역화폐 매칭이 연결됩니다.`
        : `${locality.label} 축제를 등록했습니다.`,
    );
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <Text style={styles.kicker}>지자체 축제 관리</Text>
            <Text style={styles.title}>지자체 축제 등록</Text>
            <Text style={styles.lead}>31개 시·군 축제를 직접 올리고 지역화폐 쿠폰과 매칭할 수 있습니다.</Text>

            <Text style={styles.label}>축제명</Text>
            <IsolatedImeField fieldKey="govFestivalTitle" valueRef={titleRef} placeholder="예: 수원화성문화제" />

            <Text style={styles.label}>지자체 지역 (경기도 31개 시·군)</Text>
            <View style={styles.pickerWrap}>
              <Picker selectedValue={localityId} onValueChange={(value) => setLocalityId(String(value))}>
                {CITIES.map((city) => (
                  <Picker.Item key={city.id} label={city.label} value={city.id} />
                ))}
              </Picker>
            </View>

            <Text style={styles.label}>장소 / 주소</Text>
            <IsolatedImeField fieldKey="govFestivalAddress" valueRef={addressRef} placeholder="예: 팔달구 정조로 825 행궁광장" />

            <Text style={styles.label}>축제 기간</Text>
            <View style={styles.dateRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.dateHint}>시작일</Text>
                <DateField value={startDate} onChange={setStartDate} placeholder="YYYY-MM-DD" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.dateHint}>종료일</Text>
                <DateField value={endDate} onChange={setEndDate} placeholder="YYYY-MM-DD" />
              </View>
            </View>

            <Text style={styles.label}>카테고리</Text>
            <View style={styles.catRow}>
              {FESTIVAL_CATEGORIES.map((item) => {
                const active = category === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.catChip, active && styles.catChipOn]}
                    onPress={() => setCategory(item.id)}
                  >
                    <Text style={[styles.catText, active && styles.catTextOn]}>{item.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>대표 이미지 / 포스터</Text>
            <TouchableOpacity style={styles.posterBtn} onPress={pickPoster}>
              <Text style={styles.posterBtnText}>{posterUrl ? '포스터 다시 선택' : '갤러리에서 포스터 올리기'}</Text>
            </TouchableOpacity>
            {posterUrl ? <Image source={{ uri: posterUrl }} style={styles.poster} /> : null}

            <Text style={styles.label}>한 줄 소개</Text>
            <IsolatedImeField fieldKey="govFestivalSummary" valueRef={summaryRef} placeholder="시민과 함께하는 우리 지역 대표 축제" />

            <Text style={styles.label}>상세 내용</Text>
            <IsolatedImeField
              fieldKey="govFestivalOverview"
              valueRef={overviewRef}
              placeholder="프로그램, 입장 안내, 교통편을 적어 주세요"
              multiline
            />

            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleTitle}>매칭 포인트 / 지역화폐 연동</Text>
                <Text style={styles.toggleMeta}>현장 피드 작성 시 1,000P와 지역화폐 쿠폰을 연결합니다.</Text>
              </View>
              <Switch
                value={rewardEnabled}
                onValueChange={setRewardEnabled}
                trackColor={{ false: '#D1D5DB', true: '#111827' }}
                thumbColor="#fff"
              />
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              <Text style={styles.saveText}>{saving ? '등록 중...' : '축제 등록하기'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>닫기</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    maxHeight: '92%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: 'hidden',
    shadowColor: '#111827',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    marginTop: 10,
  },
  body: { padding: 16, paddingBottom: 32 },
  kicker: { fontSize: 12, fontWeight: '800', color: '#0F766E' },
  title: { fontSize: 20, fontWeight: '700', color: '#111827', marginTop: 4 },
  lead: { fontSize: 13, color: '#374151', marginTop: 6, lineHeight: 20, fontWeight: '600' },
  label: { fontSize: 13, fontWeight: '700', color: '#111827', marginTop: 16, marginBottom: 8 },
  pickerWrap: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F9FAFB',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    backgroundColor: '#fff',
  },
  dateRow: { flexDirection: 'row', gap: 10 },
  dateHint: { fontSize: 12, fontWeight: '700', color: '#555555', marginBottom: 6 },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
  },
  catChipOn: { backgroundColor: '#111827' },
  catText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  catTextOn: { color: '#fff', fontWeight: '700' },
  posterBtn: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  posterBtnText: { fontWeight: '700', color: '#111827' },
  poster: { width: '100%', height: 160, borderRadius: 14, marginTop: 10, backgroundColor: '#E5E7EB' },
  toggleRow: {
    marginTop: 18,
    backgroundColor: '#F0FDFA',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  toggleTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  toggleMeta: { fontSize: 12, color: '#555555', marginTop: 4, fontWeight: '600', lineHeight: 18 },
  saveBtn: {
    marginTop: 18,
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  cancelBtn: { marginTop: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontWeight: '700', color: '#4B5563' },
});
