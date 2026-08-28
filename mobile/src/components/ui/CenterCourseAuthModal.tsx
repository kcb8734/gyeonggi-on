import React, { useEffect, useState } from 'react';
import { Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { CenterLocalityRow } from '../../constants/centerDirectors';
import { fetchCoursePasswordStatus, submitCourseAuth } from '../../api/centers';
import ModalExitButton from './ModalExitButton';

function PasswordField({
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  autoFocus?: boolean;
}) {
  if (Platform.OS === 'web') {
    return (
      <input
        type="password"
        value={value}
        autoFocus={autoFocus}
        autoComplete="new-password"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          border: '1px solid #DDD',
          borderRadius: 8,
          padding: '12px 14px',
          fontSize: 16,
          fontWeight: 700,
          color: '#111827',
          background: '#fff',
          minHeight: 48,
          fontFamily: 'inherit',
        }}
      />
    );
  }
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      secureTextEntry
      autoFocus={autoFocus}
      style={styles.input}
    />
  );
}

export default function CenterCourseAuthModal({
  visible,
  row,
  onClose,
  onUnlocked,
}: {
  visible: boolean;
  row: CenterLocalityRow | null;
  onClose: () => void;
  onUnlocked: () => void;
}) {
  const [hasPassword, setHasPassword] = useState(false);
  const [mode, setMode] = useState<'login' | 'register' | 'change'>('login');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [nextPassword, setNextPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible || !row) return;
    setPassword('');
    setConfirm('');
    setCurrentPassword('');
    setNextPassword('');
    setError('');
    fetchCoursePasswordStatus(row.id).then((exists) => {
      setHasPassword(exists);
      setMode(exists ? 'login' : 'register');
    });
  }, [visible, row?.id]);

  if (!visible || !row) return null;

  const submit = async () => {
    setBusy(true);
    setError('');
    const result = await submitCourseAuth({
      centerId: row.id,
      mode,
      password,
      confirm,
      currentPassword,
      nextPassword,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.message || '다시 시도해 주세요.');
      return;
    }
    if (mode === 'register' || mode === 'change') setHasPassword(true);
    onUnlocked();
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <ModalExitButton onPress={onClose} />
          <View style={styles.body}>
            <Text style={styles.kicker}>코스 등록 입장</Text>
            <Text style={styles.title}>{row.regionLabel} {row.label}</Text>
            <Text style={styles.lead}>
              {mode === 'register'
                ? '선정된 센터장만 쓸 수 있는 코스 등록 비밀번호를 먼저 등록해 주세요.'
                : mode === 'change'
                  ? '현재 비밀번호를 확인한 뒤 새 비밀번호로 변경합니다.'
                  : '등록한 비밀번호로 입장한 뒤 추천 코스를 작성할 수 있습니다.'}
            </Text>
            {mode === 'change' ? (
              <>
                <Text style={styles.label}>현재 비밀번호</Text>
                <PasswordField value={currentPassword} onChange={setCurrentPassword} placeholder="현재 비밀번호" autoFocus />
                <Text style={styles.label}>새 비밀번호</Text>
                <PasswordField value={nextPassword} onChange={setNextPassword} placeholder="4자 이상" />
                <Text style={styles.label}>새 비밀번호 확인</Text>
                <PasswordField value={confirm} onChange={setConfirm} placeholder="한 번 더 입력" />
              </>
            ) : (
              <>
                <Text style={styles.label}>{mode === 'register' ? '비밀번호 등록' : '비밀번호'}</Text>
                <PasswordField value={password} onChange={setPassword} placeholder="4자 이상" autoFocus />
                {mode === 'register' ? (
                  <>
                    <Text style={styles.label}>비밀번호 확인</Text>
                    <PasswordField value={confirm} onChange={setConfirm} placeholder="한 번 더 입력" />
                  </>
                ) : null}
              </>
            )}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <TouchableOpacity style={styles.submit} onPress={submit} disabled={busy}>
              <Text style={styles.submitText}>
                {busy ? '확인 중...' : mode === 'register' ? '등록하고 입장' : mode === 'change' ? '변경하고 입장' : '입장'}
              </Text>
            </TouchableOpacity>
            {hasPassword && mode !== 'change' ? (
              <TouchableOpacity onPress={() => { setMode('change'); setError(''); }}>
                <Text style={styles.link}>비밀번호 변경</Text>
              </TouchableOpacity>
            ) : null}
            {mode === 'change' ? (
              <TouchableOpacity onPress={() => { setMode('login'); setError(''); }}>
                <Text style={styles.link}>로그인으로</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', padding: 12 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.55)' },
  sheet: {
    backgroundColor: '#F9FAFB',
    borderRadius: 18,
    overflow: 'hidden',
    alignSelf: 'center',
    width: '100%',
    maxWidth: 420,
  },
  body: { padding: 18, paddingBottom: 22 },
  kicker: { color: '#1D4ED8', fontSize: 11, fontWeight: '800' },
  title: { fontSize: 20, fontWeight: '800', color: '#111827', marginTop: 4 },
  lead: { fontSize: 13, lineHeight: 20, color: '#4B5563', marginTop: 8, marginBottom: 8 },
  label: { fontSize: 12, fontWeight: '800', color: '#6B7280', marginBottom: 6, marginTop: 10 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD',
    paddingHorizontal: 12,
    height: 48,
    fontSize: 16,
    color: '#111827',
  },
  error: { marginTop: 10, color: '#B91C1C', fontSize: 13, fontWeight: '700' },
  submit: {
    marginTop: 16,
    backgroundColor: '#1D4ED8',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  link: { marginTop: 12, textAlign: 'center', color: '#1D4ED8', fontWeight: '800', fontSize: 13 },
});
