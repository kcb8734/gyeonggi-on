import React, { useState } from 'react';
import { Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { sendManagerEmailCode, verifyManagerEmailCode } from '../../api/emailAuth';
import { DEFAULT_FESTIVAL_MANAGER_EMAIL, loginFestivalManager, registerFestivalManager } from '../../stores/managerStore';
import {
  canSetManagerPassword,
  canSubmitEmailCode,
  isValidManagerEmail,
  isValidManagerPhone,
  normalizeEmailCode,
} from '../../utils/managerAuth';
import { formatTel } from '../../utils/phone';
import ModalExitButton from './ModalExitButton';

function AuthField({
  value,
  onChange,
  placeholder,
  keyboardType,
  secure,
  maxLength,
  autoFocus,
  center,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  secure?: boolean;
  maxLength?: number;
  autoFocus?: boolean;
  center?: boolean;
}) {
  if (Platform.OS === 'web') {
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
        autoFocus={autoFocus}
        maxLength={maxLength}
        inputMode={keyboardType === 'phone-pad' ? 'numeric' : undefined}
        autoComplete={keyboardType === 'phone-pad' ? 'one-time-code' : undefined}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          border: '1px solid #E5E7EB',
          borderRadius: 12,
          padding: center ? '14px 12px' : '12px 14px',
          fontSize: center ? 24 : 15,
          fontWeight: 700,
          letterSpacing: center ? 8 : 0,
          textAlign: center ? 'center' : 'left',
          color: '#111827',
          background: '#fff',
          minHeight: 46,
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
      keyboardType={keyboardType}
      secureTextEntry={secure}
      maxLength={maxLength}
      autoFocus={autoFocus}
      style={[styles.input, center ? styles.codeInput : null]}
    />
  );
}

export default function ManagerAuthPanel({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState(DEFAULT_FESTIVAL_MANAGER_EMAIL);
  const [phone, setPhone] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginMessage, setLoginMessage] = useState('');
  const [loginOk, setLoginOk] = useState(false);
  const [formMessage, setFormMessage] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogStep, setDialogStep] = useState<'code' | 'password'>('code');
  const [code, setCode] = useState('');
  const [challenge, setChallenge] = useState('');
  const [devCode, setDevCode] = useState('');
  const [status, setStatus] = useState('');
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');

  const openCodeDialog = async () => {
    if (!isValidManagerEmail(email)) {
      setFormMessage('담당자 메일 형식을 확인해주세요.');
      return;
    }
    if (!isValidManagerPhone(phone)) {
      setFormMessage('연락처는 숫자 9~11자리로 입력해주세요.');
      return;
    }
    setFormMessage('');
    setDialogOpen(true);
    setDialogStep('code');
    setCode('');
    setDevCode('');
    setStatus('인증메일을 보내는 중입니다.');
    setSending(true);
    const result = await sendManagerEmailCode(email.trim());
    setSending(false);
    if (!result.success) {
      setStatus(result.message);
      return;
    }
    if (result.challenge) setChallenge(result.challenge);
    if (result.devCode) setDevCode(result.devCode);
    setStatus(result.message);
  };

  const confirmCode = async () => {
    const next = normalizeEmailCode(code);
    if (!canSubmitEmailCode(next)) {
      setStatus('메일로 받은 6자리 인증번호를 입력해주세요.');
      return;
    }
    setChecking(true);
    const result = await verifyManagerEmailCode(email.trim(), next, challenge);
    setChecking(false);
    if (!result.success) {
      setStatus(result.message);
      return;
    }
    setDialogStep('password');
    setPassword('');
    setPasswordConfirm('');
    setPasswordMessage(`${email.trim()} 메일이 확인되었습니다. 로그인에 쓸 비밀번호를 설정하세요.`);
  };

  const savePasswordAndLogin = () => {
    const check = canSetManagerPassword(password, passwordConfirm);
    if (!check.ok) {
      setPasswordMessage(check.message);
      return;
    }
    registerFestivalManager({
      email: email.trim(),
      phone: phone.trim(),
      password,
    });
  };

  const handleLogin = () => {
    const result = loginFestivalManager(loginEmail, loginPassword);
    setLoginOk(result.success);
    setLoginMessage(result.message);
  };

  return (
    <View style={styles.root}>
      <Text style={styles.kicker}>지자체 담당자 확인</Text>
      <Text style={styles.title}>메일 인증 후 로그인</Text>
      <Text style={styles.lead}>
        담당자 메일과 연락처를 넣고 확인하면 인증번호 입력 창이 열립니다. 메일에서 코드를 확인한 뒤 비밀번호를 설정하면 담당자로 로그인됩니다.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>신규 담당자 등록</Text>
        <Text style={styles.label}>담당자 메일</Text>
        <AuthField
          value={email}
          onChange={setEmail}
          placeholder="pizon8113@gmail.com"
          keyboardType="email-address"
        />
        <Text style={styles.label}>연락처</Text>
        <AuthField
          value={phone}
          onChange={setPhone}
          placeholder="예: 031-228-0000"
          keyboardType="phone-pad"
        />
        {formMessage ? <Text style={styles.error}>{formMessage}</Text> : null}
        <TouchableOpacity style={styles.primaryBtn} onPress={openCodeDialog} disabled={sending}>
          <Text style={styles.primaryText}>{sending ? '인증메일 보내는 중...' : '메일·연락처 확인'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>등록 이메일로 로그인</Text>
        <Text style={styles.hint}>이미 비밀번호를 설정했다면 메일과 비밀번호로 들어옵니다.</Text>
        <AuthField
          value={loginEmail}
          onChange={setLoginEmail}
          placeholder="등록한 담당자 메일"
          keyboardType="email-address"
        />
        <View style={{ height: 8 }} />
        <AuthField
          value={loginPassword}
          onChange={setLoginPassword}
          placeholder="관리 비밀번호"
          secure
        />
        {loginMessage ? <Text style={loginOk ? styles.status : styles.error}>{loginMessage}</Text> : null}
        <TouchableOpacity style={styles.primaryBtn} onPress={handleLogin}>
          <Text style={styles.primaryText}>담당자 로그인</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.ghostBtn} onPress={onClose}>
        <Text style={styles.ghostText}>닫기</Text>
      </TouchableOpacity>

      <Modal visible={dialogOpen} transparent animationType="fade" onRequestClose={() => setDialogOpen(false)}>
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogCard}>
            <ModalExitButton onPress={() => setDialogOpen(false)} />
            {dialogStep === 'code' ? (
              <>
                <Text style={styles.dialogKicker}>인증번호 입력</Text>
                <Text style={styles.dialogTitle}>메일에서 받은 코드를 입력하세요</Text>
                <Text style={styles.dialogLead}>
                  {email.trim()} / {formatTel(phone) || phone}
                  {'\n'}메일함을 확인한 뒤 6자리 인증번호를 입력합니다.
                </Text>
                <AuthField
                  value={code}
                  onChange={(next) => setCode(normalizeEmailCode(next))}
                  placeholder="000000"
                  keyboardType="phone-pad"
                  maxLength={6}
                  autoFocus
                  center
                />
                {devCode ? <Text style={styles.devHint}>개발용 코드 {devCode}</Text> : null}
                {status ? <Text style={styles.status}>{status}</Text> : null}
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={confirmCode}
                  disabled={checking || sending}
                >
                  <Text style={styles.primaryText}>{checking ? '확인 중...' : '인증번호 확인'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.ghostBtn} onPress={openCodeDialog} disabled={sending}>
                  <Text style={styles.ghostText}>{sending ? '다시 보내는 중...' : '인증메일 다시 보내기'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.ghostBtn} onPress={() => setDialogOpen(false)}>
                  <Text style={styles.ghostText}>닫기</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.dialogKicker}>비밀번호 설정</Text>
                <Text style={styles.dialogTitle}>등록 이메일로 로그인하세요</Text>
                <Text style={styles.dialogLead}>
                  {email.trim()} 담당자 계정의 비밀번호를 만들면 바로 로그인됩니다.
                </Text>
                <Text style={styles.label}>관리 비밀번호</Text>
                <AuthField value={password} onChange={setPassword} placeholder="4자 이상" secure />
                <Text style={styles.label}>비밀번호 확인</Text>
                <AuthField
                  value={passwordConfirm}
                  onChange={setPasswordConfirm}
                  placeholder="비밀번호를 한 번 더 입력"
                  secure
                />
                {passwordMessage ? <Text style={styles.status}>{passwordMessage}</Text> : null}
                <TouchableOpacity style={styles.primaryBtn} onPress={savePasswordAndLogin}>
                  <Text style={styles.primaryText}>비밀번호 저장하고 로그인</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.ghostBtn} onPress={() => setDialogOpen(false)}>
                  <Text style={styles.ghostText}>닫기</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { paddingBottom: 8 },
  kicker: { fontSize: 12, fontWeight: '800', color: '#0F766E', paddingRight: 88 },
  title: { fontSize: 20, fontWeight: '700', color: '#111827', marginTop: 4, paddingRight: 88 },
  lead: { fontSize: 13, color: '#374151', marginTop: 6, lineHeight: 20, fontWeight: '600' },
  card: {
    marginTop: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardTitle: { fontSize: 14, fontWeight: '800', color: '#111827', marginBottom: 4 },
  label: { fontSize: 13, fontWeight: '700', color: '#111827', marginTop: 12, marginBottom: 8 },
  hint: { fontSize: 12, fontWeight: '600', color: '#555555', marginBottom: 10, lineHeight: 18 },
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
  codeInput: {
    fontSize: 24,
    letterSpacing: 8,
    textAlign: 'center',
    fontWeight: '800',
  },
  primaryBtn: {
    marginTop: 12,
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '800' },
  ghostBtn: { marginTop: 6, paddingVertical: 10, alignItems: 'center' },
  ghostText: { fontWeight: '700', color: '#4B5563' },
  error: { marginTop: 8, fontSize: 12, fontWeight: '700', color: '#B91C1C' },
  status: { marginTop: 10, fontSize: 12, fontWeight: '700', color: '#047857', lineHeight: 18 },
  devHint: { marginTop: 8, fontSize: 12, fontWeight: '700', color: '#92400E' },
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17,24,39,0.55)',
    justifyContent: 'center',
    padding: 16,
  },
  dialogCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    paddingTop: 52,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'visible' as const,
  },
  dialogKicker: { fontSize: 12, fontWeight: '800', color: '#0F766E' },
  dialogTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginTop: 4 },
  dialogLead: { fontSize: 13, fontWeight: '600', color: '#374151', marginTop: 6, marginBottom: 12, lineHeight: 20 },
});
