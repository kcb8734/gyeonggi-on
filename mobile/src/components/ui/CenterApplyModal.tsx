import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { CenterApplyInput, CenterLocalityRow } from '../../constants/centerDirectors';
import { pickFromCamera, pickPhotoFromGallery } from '../../utils/pickImage';
import IsolatedImeField from './IsolatedImeField';
import ModalExitButton from './ModalExitButton';

export default function CenterApplyModal({
  visible,
  row,
  submitting,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  row: CenterLocalityRow | null;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (input: CenterApplyInput) => Promise<void> | void;
}) {
  const nameRef = useRef('');
  const ageRef = useRef('');
  const phoneRef = useRef('');
  const emailRef = useRef('');
  const addressRef = useRef('');
  const careerRef = useRef('');
  const introRef = useRef('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!visible) return;
    nameRef.current = '';
    ageRef.current = '';
    phoneRef.current = '';
    emailRef.current = '';
    addressRef.current = '';
    careerRef.current = '';
    introRef.current = '';
    setPhotoUrl('');
    setTick((value) => value + 1);
  }, [visible, row?.id]);

  const submit = async () => {
    if (!row) return;
    if (!photoUrl) {
      Alert.alert('알림', '얼굴이 보이는 프로필 사진을 올려 주세요.');
      return;
    }
    if (!nameRef.current.trim() || !ageRef.current.trim() || !phoneRef.current.trim() || !addressRef.current.trim() || !careerRef.current.trim() || !introRef.current.trim()) {
      Alert.alert('알림', '이름, 나이, 연락처, 활동 주소, 경력, 자기소개를 모두 입력해 주세요.');
      return;
    }
    await onSubmit({
      localityKey: row.id,
      name: nameRef.current,
      age: ageRef.current,
      phone: phoneRef.current,
      email: emailRef.current,
      address: addressRef.current,
      photoUrl,
      career: careerRef.current,
      intro: introRef.current,
    });
  };

  if (!visible || !row) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <ModalExitButton onPress={onClose} />
          <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 28 }} keyboardShouldPersistTaps="handled">
            <Text style={styles.kicker}>간편 지원</Text>
            <Text style={styles.title}>{row.regionLabel} {row.label} 센터장 지원</Text>
            <Text style={styles.count}>현재 {row.applicantCount ?? 0}명 지원 중</Text>
            <Text style={styles.lead}>서류 없이 한 번에 작성하고 바로 접수합니다. 모든 입력창에 바로 입력할 수 있습니다.</Text>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.photo} />
            ) : (
              <View style={styles.photo}><Text style={styles.photoHint}>프로필 사진</Text></View>
            )}
            <View style={styles.rowBtns}>
              <TouchableOpacity
                style={styles.photoBtn}
                onPress={async () => {
                  const uri = await pickFromCamera();
                  if (uri) setPhotoUrl(uri);
                }}
              >
                <Text style={styles.photoBtnText}>사진 촬영</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.photoGhost}
                onPress={async () => {
                  const uri = await pickPhotoFromGallery();
                  if (uri) setPhotoUrl(uri);
                }}
              >
                <Text style={styles.photoGhostText}>갤러리 선택</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.split} key={`name-age-${tick}`}>
              <View style={{ flex: 1.4 }}>
                <Text style={styles.label}>이름</Text>
                <IsolatedImeField valueRef={nameRef} placeholder="홍길동" fieldKey={`center-name-${tick}`} ignoreModalLock />
              </View>
              <View style={{ width: 92 }}>
                <Text style={styles.label}>나이</Text>
                <IsolatedImeField valueRef={ageRef} placeholder="35" inputMode="numeric" fieldKey={`center-age-${tick}`} ignoreModalLock />
              </View>
            </View>
            <Text style={styles.label}>연락처</Text>
            <IsolatedImeField valueRef={phoneRef} placeholder="010-0000-0000" inputMode="tel" fieldKey={`center-phone-${tick}`} ignoreModalLock />
            <Text style={styles.label}>이메일</Text>
            <IsolatedImeField valueRef={emailRef} placeholder="name@example.com" fieldKey={`center-email-${tick}`} ignoreModalLock />
            <Text style={styles.label}>활동 주소</Text>
            <IsolatedImeField valueRef={addressRef} placeholder="시·군·구 활동 주소를 입력해 주세요" fieldKey={`center-address-${tick}`} ignoreModalLock />
            <Text style={styles.label}>활동 지역</Text>
            <View style={styles.locked}><Text style={styles.lockedText}>{row.regionLabel} {row.label}</Text></View>
            <Text style={styles.label}>주요 경력</Text>
            <IsolatedImeField valueRef={careerRef} placeholder="지역 축제·상권 관련 경력을 적어 주세요" multiline fieldKey={`center-career-${tick}`} ignoreModalLock />
            <Text style={styles.label}>자기소개 · 센터 운영 계획</Text>
            <IsolatedImeField valueRef={introRef} placeholder="현장에서 어떻게 축제와 상가를 잇고 싶은지 적어 주세요" multiline fieldKey={`center-intro-${tick}`} ignoreModalLock />
            <TouchableOpacity style={styles.submit} onPress={submit} disabled={submitting}>
              <Text style={styles.submitText}>{submitting ? '접수 중...' : '원클릭 지원하기'}</Text>
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
  },
  kicker: { color: '#0F766E', fontSize: 11, fontWeight: '800' },
  title: { fontSize: 20, fontWeight: '800', color: '#111827', marginTop: 4 },
  count: { marginTop: 6, color: '#EA580C', fontWeight: '800', fontSize: 13 },
  lead: { fontSize: 13, color: '#6B7280', marginTop: 6, marginBottom: 12 },
  photo: {
    width: 80,
    height: 100,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  photoHint: { color: '#6B7280', fontWeight: '700', fontSize: 12 },
  rowBtns: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  split: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  photoBtn: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
  },
  photoBtnText: { color: '#fff', fontWeight: '800' },
  photoGhost: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
  },
  photoGhostText: { color: '#111827', fontWeight: '800' },
  label: { fontSize: 12, fontWeight: '800', color: '#6B7280', marginBottom: 6, marginTop: 8 },
  locked: {
    borderWidth: 1,
    borderColor: '#D1FAE5',
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  lockedText: { color: '#065F46', fontWeight: '800' },
  submit: {
    marginTop: 16,
    backgroundColor: '#EA580C',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
