import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { loginWithGoogleToken, loginWithKakaoToken } from '../api/auth';
import { GOOGLE_CLIENT_ID, KAKAO_CLIENT_ID } from '../config';
import { makeRedirect, startOAuth } from '../utils/oauth';

const LOGO = require('../../assets/onandon-logo.png');

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const [busy, setBusy] = useState<'kakao' | 'google' | null>(null);

  const finish = async (provider: 'kakao' | 'google', token: string) => {
    setBusy(provider);
    try {
      const user = provider === 'kakao'
        ? await loginWithKakaoToken(token)
        : await loginWithGoogleToken(token);
      Alert.alert('로그인 완료', `${user.nickname}님, 온앤온+에 오신 것을 환영합니다.`);
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('로그인 실패', err?.message ?? '다시 시도해주세요.');
    } finally {
      setBusy(null);
    }
  };

  const kakao = async () => {
    if (!KAKAO_CLIENT_ID) {
      await finish('kakao', 'demo');
      return;
    }
    const redirectUri = makeRedirect();
    const result = await startOAuth(
      `https://kauth.kakao.com/oauth/authorize?client_id=${encodeURIComponent(KAKAO_CLIENT_ID)}`
      + `&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token`,
    );
    const token = result.type === 'success' ? String(result.params?.access_token ?? '') : '';
    if (!token) {
      Alert.alert('알림', '카카오 로그인이 취소되었습니다.');
      return;
    }
    await finish('kakao', token);
  };

  const google = async () => {
    if (!GOOGLE_CLIENT_ID) {
      await finish('google', 'demo');
      return;
    }
    const redirectUri = makeRedirect();
    const result = await startOAuth(
      `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}`
      + `&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=profile%20email`,
    );
    const token = result.type === 'success' ? String(result.params?.access_token ?? '') : '';
    if (!token) {
      Alert.alert('알림', '구글 로그인이 취소되었습니다.');
      return;
    }
    await finish('google', token);
  };

  return (
    <View style={styles.root}>
      <Image source={LOGO} style={styles.logo} resizeMode="contain" accessibilityLabel="on&on+" />
      <Text style={styles.name}>온앤온+</Text>
      <Text style={styles.lead}>카카오 또는 구글로 3초 만에 가입하고 축제를 기록하세요.</Text>

      <TouchableOpacity style={styles.kakao} onPress={kakao} disabled={!!busy}>
        {busy === 'kakao' ? <ActivityIndicator color="#191919" /> : <Text style={styles.kakaoText}>카카오로 시작하기</Text>}
      </TouchableOpacity>
      <TouchableOpacity style={styles.google} onPress={google} disabled={!!busy}>
        {busy === 'google' ? <ActivityIndicator color="#111827" /> : <Text style={styles.googleText}>Google로 시작하기</Text>}
      </TouchableOpacity>
      <Text style={styles.hint}>클라이언트 ID가 없으면 미리보기 계정으로 들어갑니다.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F7F8FA', padding: 24, justifyContent: 'center' },
  logo: { width: 220, height: 54, marginBottom: 4 },
  name: { fontSize: 16, fontWeight: '800', color: '#374151', marginTop: 4 },
  lead: { fontSize: 14, color: '#6B7280', marginTop: 12, marginBottom: 28, lineHeight: 21 },
  kakao: {
    backgroundColor: '#FEE500',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  kakaoText: { fontSize: 16, fontWeight: '800', color: '#191919' },
  google: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  googleText: { fontSize: 16, fontWeight: '800', color: '#111827' },
  hint: { fontSize: 12, color: '#9CA3AF', marginTop: 16, textAlign: 'center' },
});
