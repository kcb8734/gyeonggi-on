import React, { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import IsolatedImeField from './IsolatedImeField';
import { verifyMerchant, type MerchantVerifyResult } from '../../api/merchants';
import { loginMerchant, registerMerchant } from '../../stores/merchantStore';
import { canSetManagerPassword } from '../../utils/managerAuth';
import { readLiveImeValue } from '../../utils/nativeImeHost';
import { KOREAN_FONT_FAMILY } from '../../utils/koreanFont';

export default function MerchantAuthPanel() {
  const businessNameRef = useRef('');
  const businessNumberRef = useRef('');
  const loginNameRef = useRef('');
  const [verifying, setVerifying] = useState(false);
  const [ntsResult, setNtsResult] = useState<MerchantVerifyResult | null>(null);
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [registerMessage, setRegisterMessage] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginMessage, setLoginMessage] = useState('');
  const [loginOk, setLoginOk] = useState(false);

  const handleVerify = async () => {
    if (typeof document !== 'undefined') {
      const active = document.activeElement as HTMLElement | null;
      active?.blur?.();
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
    const businessName = (readLiveImeValue('merchantRegName') || businessNameRef.current).trim();
    const businessNumber = (readLiveImeValue('merchantRegNumber') || businessNumberRef.current).replace(/\D/g, '');
    if (businessName.length < 1 || businessNumber.length !== 10) {
      setNtsResult({ success: false, message: '상호명과 사업자등록번호 10자리를 입력해주세요.' });
      return;
    }
    setVerifying(true);
    try {
      const verified = await verifyMerchant({ businessNumber, businessName });
      setNtsResult(verified);
    } catch (err: any) {
      const data = err?.response?.data;
      setNtsResult(data ?? { success: false, message: data?.message ?? '국세청 상태조회에 실패했습니다.' });
    } finally {
      setVerifying(false);
    }
  };

  const handleRegister = () => {
    const check = canSetManagerPassword(password, passwordConfirm);
    if (!check.ok) {
      setRegisterMessage(check.message);
      return;
    }
    const businessName = (readLiveImeValue('merchantRegName') || businessNameRef.current).trim();
    const businessNumber = (readLiveImeValue('merchantRegNumber') || businessNumberRef.current).replace(/\D/g, '');
    if (!ntsResult?.data?.verified || ntsResult.data.b_stt_cd !== '01') {
      setRegisterMessage('국세청 계속사업자 확인 후에 등록할 수 있습니다.');
      return;
    }
    registerMerchant({ businessName, businessNumber, password });
  };

  const handleLogin = () => {
    const name = (readLiveImeValue('merchantLoginName') || loginNameRef.current).trim();
    const result = loginMerchant(name, loginPassword);
    setLoginOk(result.success);
    setLoginMessage(result.message);
  };

  return (
    <View>
      <Text style={styles.kicker}>사장님 확인</Text>
      <Text style={styles.title}>사업자 확인 후 간편 로그인</Text>
      <Text style={styles.lead}>
        국세청에서 계속사업자를 확인한 뒤 상호와 비밀번호만 저장하면, 다음부터는 그 둘로 로그인해서 QR 촬영과 정산을 바로 할 수 있습니다.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>신규 사업자 등록</Text>
        <Text style={styles.label}>상호명</Text>
        <IsolatedImeField
          fieldKey="merchantRegName"
          valueRef={businessNameRef}
          placeholder="예: 화성행궁 한정식"
          inputMode="text"
        />
        <Text style={styles.label}>사업자등록번호 (10자리)</Text>
        <IsolatedImeField
          fieldKey="merchantRegNumber"
          valueRef={businessNumberRef}
          placeholder="1234567890"
          inputMode="numeric"
          maxLength={12}
        />
        <TouchableOpacity style={styles.primaryBtn} onPress={handleVerify} disabled={verifying}>
          {verifying ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>국세청 사업자 상태 확인</Text>}
        </TouchableOpacity>
        {ntsResult ? (
          <Text style={ntsResult.data?.verified ? styles.ok : styles.error}>
            {ntsResult.data?.verified
              ? `계속사업자 확인 완료 (${ntsResult.data.b_stt_cd})`
              : `확인 실패: ${ntsResult.message}`}
          </Text>
        ) : null}
        {ntsResult?.data?.verified ? (
          <>
            <Text style={styles.label}>관리 비밀번호</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="4자 이상"
              secureTextEntry
            />
            <Text style={styles.label}>비밀번호 확인</Text>
            <TextInput
              style={styles.input}
              value={passwordConfirm}
              onChangeText={setPasswordConfirm}
              placeholder="비밀번호를 한 번 더 입력"
              secureTextEntry
            />
            {registerMessage ? <Text style={styles.error}>{registerMessage}</Text> : null}
            <TouchableOpacity style={styles.primaryBtn} onPress={handleRegister}>
              <Text style={styles.primaryText}>상호·비밀번호로 등록하고 로그인</Text>
            </TouchableOpacity>
          </>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>등록 상호로 로그인</Text>
        <Text style={styles.hint}>이미 비밀번호를 설정했다면 상호와 비밀번호로 들어옵니다.</Text>
        <IsolatedImeField
          fieldKey="merchantLoginName"
          valueRef={loginNameRef}
          placeholder="등록한 상호명"
          inputMode="text"
        />
        <View style={{ height: 8 }} />
        <TextInput
          style={styles.input}
          value={loginPassword}
          onChangeText={setLoginPassword}
          placeholder="관리 비밀번호"
          secureTextEntry
        />
        {loginMessage ? <Text style={loginOk ? styles.ok : styles.error}>{loginMessage}</Text> : null}
        <TouchableOpacity style={styles.primaryBtn} onPress={handleLogin}>
          <Text style={styles.primaryText}>사장님 로그인</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  kicker: { fontSize: 12, fontWeight: '800', color: '#C2410C', fontFamily: KOREAN_FONT_FAMILY },
  title: { fontSize: 20, fontWeight: '800', color: '#111827', marginTop: 4, fontFamily: KOREAN_FONT_FAMILY },
  lead: { fontSize: 13, color: '#374151', marginTop: 6, lineHeight: 20, fontWeight: '600', fontFamily: KOREAN_FONT_FAMILY },
  card: {
    marginTop: 16,
    backgroundColor: '#FFF7ED',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  cardTitle: { fontSize: 14, fontWeight: '800', color: '#111827', marginBottom: 4, fontFamily: KOREAN_FONT_FAMILY },
  label: { fontSize: 13, fontWeight: '700', color: '#111827', marginTop: 12, marginBottom: 8, fontFamily: KOREAN_FONT_FAMILY },
  hint: { fontSize: 12, fontWeight: '600', color: '#555555', marginBottom: 10, lineHeight: 18, fontFamily: KOREAN_FONT_FAMILY },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD',
    padding: 12,
    fontSize: 16,
    fontFamily: KOREAN_FONT_FAMILY,
  },
  primaryBtn: { backgroundColor: '#111827', borderRadius: 10, padding: 13, alignItems: 'center', marginTop: 12 },
  primaryText: { color: '#fff', fontWeight: '800' },
  ok: { marginTop: 8, fontSize: 12, fontWeight: '700', color: '#047857', lineHeight: 18 },
  error: { marginTop: 8, fontSize: 12, fontWeight: '700', color: '#B91C1C', lineHeight: 18 },
});
