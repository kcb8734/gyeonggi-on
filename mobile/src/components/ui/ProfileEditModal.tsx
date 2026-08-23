import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { updateAuthProfile, useAuthUser } from '../../stores/authStore';
import { pickFromCamera, pickPhotoFromGallery } from '../../utils/pickImage';
import { setImeModalLock } from '../../utils/nativeImeHost';
import ModalExitButton from './ModalExitButton';

export default function ProfileEditModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const user = useAuthUser();
  const [nickname, setNickname] = useState(user?.nickname ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '');

  useEffect(() => {
    setImeModalLock(visible);
    return () => setImeModalLock(false);
  }, [visible]);

  useEffect(() => {
    if (visible) {
      setNickname(user?.nickname ?? '');
      setAvatarUrl(user?.avatarUrl ?? '');
    }
  }, [visible, user?.nickname, user?.avatarUrl]);

  const save = () => {
    if (!nickname.trim()) {
      Alert.alert('알림', '닉네임을 입력해주세요.');
      return;
    }
    updateAuthProfile({ nickname: nickname.trim(), avatarUrl: avatarUrl || undefined });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.card}>
          <ModalExitButton onPress={onClose} />
          <Text style={styles.kicker}>마이페이지</Text>
          <Text style={styles.title}>프로필 등록 · 수정</Text>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatar}><Text style={styles.avatarText}>온</Text></View>
          )}
          <View style={styles.row}>
            <TouchableOpacity
              style={styles.photoBtn}
              onPress={async () => {
                const uri = await pickFromCamera();
                if (uri) setAvatarUrl(uri);
              }}
            >
              <Text style={styles.photoText}>사진 촬영</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.photoGhost}
              onPress={async () => {
                const uri = await pickPhotoFromGallery();
                if (uri) setAvatarUrl(uri);
              }}
            >
              <Text style={styles.photoGhostText}>갤러리 선택</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.label}>닉네임</Text>
          {Platform.OS === 'web' ? (
            <input
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              placeholder="예: 온앤온 수원"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                border: '1px solid #E5E7EB',
                borderRadius: 12,
                padding: '12px 14px',
                fontSize: 15,
                fontWeight: 600,
              }}
            />
          ) : (
            <TextInput
              value={nickname}
              onChangeText={setNickname}
              placeholder="예: 온앤온 수원"
              style={styles.input}
            />
          )}
          <TouchableOpacity style={styles.save} onPress={save}>
            <Text style={styles.saveText}>프로필 저장</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', padding: 18 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 18,
    paddingTop: 22,
  },
  kicker: { fontSize: 12, fontWeight: '800', color: '#6B7280' },
  title: { fontSize: 20, fontWeight: '800', color: '#111827', marginTop: 4, marginBottom: 14 },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#E0392A',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '900', fontSize: 24 },
  row: { flexDirection: 'row', gap: 8, marginTop: 12 },
  photoBtn: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  photoText: { color: '#fff', fontWeight: '800' },
  photoGhost: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  photoGhostText: { color: '#111827', fontWeight: '800' },
  label: { fontSize: 13, fontWeight: '700', color: '#111827', marginTop: 16, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '600',
  },
  save: {
    marginTop: 16,
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  saveText: { color: '#fff', fontWeight: '800' },
});
