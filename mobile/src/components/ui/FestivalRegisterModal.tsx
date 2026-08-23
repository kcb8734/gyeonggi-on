import React, { useEffect, useState } from 'react';
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
import { FESTIVAL_CATEGORIES, GYEONGGI_CITY_COORDS, METRO_LOCALITIES } from '../../constants/regions';
import { addLocalFestival } from '../../stores/appStore';
import type { HomeFestival } from '../../types/home';
import { pickPhotoFromGallery } from '../../utils/pickImage';
import { setImeModalLock } from '../../utils/nativeImeHost';
import { logoutFestivalManager, useManagerState } from '../../stores/managerStore';
import ManagerAuthPanel from './ManagerAuthPanel';
import ModalExitButton from './ModalExitButton';

const CITIES = [...METRO_LOCALITIES.GYEONGGI].sort((a, b) => a.label.localeCompare(b.label, 'ko'));

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
          boxSizing: 'border-box',
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

function InModalField({
  value,
  onChange,
  placeholder,
  multiline,
  keyboardType,
  secure,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  secure?: boolean;
}) {
  if (Platform.OS === 'web') {
    const webStyle: React.CSSProperties = {
      width: '100%',
      boxSizing: 'border-box',
      border: '1px solid #E5E7EB',
      borderRadius: 12,
      padding: '12px 14px',
      fontSize: 15,
      fontWeight: 600,
      color: '#111827',
      background: '#fff',
      minHeight: multiline ? 110 : 46,
      resize: multiline ? 'vertical' : 'none',
      fontFamily: 'inherit',
    };
    if (multiline) {
      return (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          rows={4}
          style={webStyle}
        />
      );
    }
    const type = secure
      ? 'password'
      : keyboardType === 'email-address'
        ? 'email'
        : keyboardType === 'phone-pad'
          ? 'tel'
          : 'text';
    return (
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        style={webStyle}
      />
    );
  }
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      multiline={multiline}
      keyboardType={keyboardType}
      secureTextEntry={secure}
      style={[styles.input, multiline ? styles.area : null]}
      textAlignVertical={multiline ? 'top' : 'center'}
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
  const [title, setTitle] = useState('');
  const [address, setAddress] = useState('');
  const [summary, setSummary] = useState('');
  const [overview, setOverview] = useState('');
  const [inquiryTel, setInquiryTel] = useState('');
  const [localityId, setLocalityId] = useState(CITIES[0]?.id ?? '수원시');
  const [category, setCategory] = useState<string>('먹거리');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [posterUrl, setPosterUrl] = useState('');
  const [rewardEnabled, setRewardEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const manager = useManagerState();
  const session = manager.accounts.find((item) => item.email === manager.sessionEmail) ?? null;

  useEffect(() => {
    setImeModalLock(visible);
    return () => setImeModalLock(false);
  }, [visible]);

  const reset = () => {
    setTitle('');
    setAddress('');
    setSummary('');
    setOverview('');
    setInquiryTel('');
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
    if (!session) {
      Alert.alert('알림', '담당자 메일 인증과 비밀번호 설정 후 로그인해주세요.');
      return;
    }
    const nextTitle = title.trim();
    const nextAddress = address.trim();
    const nextSummary = summary.trim();
    const nextOverview = overview.trim();
    const nextInquiry = (inquiryTel || session.phone).trim();
    const locality = CITIES.find((item) => item.id === localityId) ?? CITIES[0];
    if (!nextTitle) {
      Alert.alert('알림', '축제명을 입력해주세요.');
      return;
    }
    if (!nextAddress) {
      Alert.alert('알림', '장소/주소를 입력해주세요.');
      return;
    }
    if (!startDate || !endDate) {
      Alert.alert('알림', '축제 기간을 선택해주세요.');
      return;
    }
    if (!nextInquiry) {
      Alert.alert('알림', '행사 문의 전화번호를 입력해주세요.');
      return;
    }
    setSaving(true);
    const coords = GYEONGGI_CITY_COORDS[locality.label] ?? { lat: 37.2636, lng: 127.0286 };
    const contentId = `gov-${Date.now()}`;
    const festival: HomeFestival = {
      id: contentId,
      title: nextTitle,
      location_name: `${locality.label} ${nextAddress}`,
      latitude: coords.lat,
      longitude: coords.lng,
      start_date: startDate,
      end_date: endDate,
      municipality_name: locality.label,
      description: nextOverview || nextSummary,
      summary: nextSummary,
      category,
      image_url: posterUrl || null,
      is_trending: true,
      contentId,
      contentTypeId: '15',
      source: 'gov',
      rewardEnabled,
      managerEmail: session.email,
      managerPhone: session.phone,
      inquiryTel: nextInquiry,
      tel: nextInquiry,
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
          eventPlace: nextAddress,
          mapX: coords.lng,
          mapY: coords.lat,
          managerEmail: festival.managerEmail,
          managerPhone: festival.managerPhone,
          inquiryTel: festival.inquiryTel,
          tel: festival.tel,
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
          <ModalExitButton onPress={onClose} />
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {!session ? (
              <ManagerAuthPanel onClose={onClose} />
            ) : (
              <>
            <Text style={styles.kicker}>지자체 축제 관리</Text>
            <Text style={styles.title}>지자체 축제 등록</Text>
            <Text style={styles.lead}>31개 시·군 축제를 직접 올리고 지역화폐 쿠폰과 매칭할 수 있습니다.</Text>

            <View style={styles.loginBox}>
              <Text style={styles.loginTitle}>등록 담당자</Text>
              <Text style={styles.verifyHint}>{session.email} 로그인됨 · {session.phone || '연락처 없음'}</Text>
              <TouchableOpacity style={styles.cancelBtn} onPress={logoutFestivalManager}>
                <Text style={styles.cancelText}>담당자 로그아웃</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>축제명</Text>
            <InModalField value={title} onChange={setTitle} placeholder="예: 수원화성문화제" />

            <Text style={styles.label}>지자체 지역 (경기도 31개 시·군)</Text>
            <View style={styles.pickerWrap}>
              <Picker selectedValue={localityId} onValueChange={(value) => setLocalityId(String(value))}>
                {CITIES.map((city) => (
                  <Picker.Item key={city.id} label={city.label} value={city.id} />
                ))}
              </Picker>
            </View>

            <Text style={styles.label}>장소 / 주소</Text>
            <InModalField value={address} onChange={setAddress} placeholder="예: 팔달구 정조로 825 행궁광장" />

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
            <InModalField value={summary} onChange={setSummary} placeholder="시민과 함께하는 우리 지역 대표 축제" />

            <Text style={styles.label}>상세 내용</Text>
            <InModalField
              value={overview}
              onChange={setOverview}
              placeholder="프로그램, 입장 안내, 교통편을 적어 주세요"
              multiline
            />

            <Text style={styles.label}>행사 문의 전화번호</Text>
            <InModalField
              value={inquiryTel}
              onChange={setInquiryTel}
              placeholder="예: 031-228-3675"
              keyboardType="phone-pad"
            />
            <Text style={styles.dateHint}>비워 두면 위에서 확인한 담당자 연락처를 사용합니다.</Text>

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
              </>
            )}
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
  loginBox: {
    marginTop: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  loginTitle: { fontSize: 14, fontWeight: '800', color: '#111827', marginBottom: 6 },
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
  area: { minHeight: 110, textAlignVertical: 'top' },
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
  verifyBtn: {
    marginTop: 10,
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  verifyBtnOn: { backgroundColor: '#047857' },
  verifyText: { color: '#fff', fontWeight: '800' },
  verifyTextOn: { color: '#ECFDF5' },
  verifyHint: { marginTop: 8, fontSize: 12, fontWeight: '700', color: '#047857' },
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
