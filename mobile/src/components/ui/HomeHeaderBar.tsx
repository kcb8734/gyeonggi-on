import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useAppState } from '../../stores/appStore';
import { useAuthUser } from '../../stores/authStore';

function ProfileGlyph() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8.2" r="3.2" fill="#fff" />
      <Path d="M5.6 18.8c.7-3.2 3.2-4.9 6.4-4.9s5.7 1.7 6.4 4.9" fill="#fff" />
    </Svg>
  );
}

export default function HomeHeaderBar() {
  const navigation = useNavigation<any>();
  const user = useAuthUser();
  const { points } = useAppState();

  const goMy = () => {
    navigation.navigate('My');
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.side} />
      <View style={styles.center}>
        <Text style={styles.logo} numberOfLines={1}>on&on</Text>
        <Text style={styles.sub} numberOfLines={1}>온앤온</Text>
      </View>
      <TouchableOpacity style={styles.side} onPress={goMy} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="마이페이지로 이동">
        <View style={styles.shortcut}>
          {user?.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatar}>
              <ProfileGlyph />
            </View>
          )}
          <Text style={styles.pts} numberOfLines={1}>
            {user ? `${points.toLocaleString('ko-KR')} P` : '로그인 필요'}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    minHeight: 44,
  },
  side: {
    width: 112,
    minWidth: 96,
    maxWidth: 120,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    minWidth: 0,
  },
  logo: {
    fontSize: 20,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: 0.3,
  },
  sub: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6B7280',
  },
  shortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F3F4F6',
    borderRadius: 999,
    paddingVertical: 5,
    paddingLeft: 5,
    paddingRight: 8,
    maxWidth: 112,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#111827',
  },
  pts: {
    fontSize: 10,
    fontWeight: '800',
    color: '#111827',
    flexShrink: 1,
  },
});
