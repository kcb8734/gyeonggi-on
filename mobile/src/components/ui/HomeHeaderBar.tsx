import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { useAppState } from '../../stores/appStore';
import { useAuthUser } from '../../stores/authStore';

const LOGO = require('../../../assets/onandon-logo.png');

function CoinGlyph() {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20">
      <Circle cx="10" cy="10" r="9" fill="#F59E0B" />
      <Circle cx="10" cy="10" r="7.2" fill="#FBBF24" />
      <SvgText
        x="10"
        y="14"
        textAnchor="middle"
        fontSize="10"
        fontWeight="800"
        fill="#92400E"
      >
        P
      </SvgText>
    </Svg>
  );
}

export default function HomeHeaderBar() {
  const navigation = useNavigation<any>();
  const user = useAuthUser();
  const { points } = useAppState();

  return (
    <View style={styles.wrap}>
      <View style={styles.left}>
        <Image source={LOGO} style={styles.logo} resizeMode="contain" accessibilityLabel="on&on" />
      </View>
      <TouchableOpacity
        style={styles.pointsBox}
        onPress={() => navigation.navigate('My')}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="마이페이지로 이동"
      >
        <CoinGlyph />
        <Text style={styles.pts} numberOfLines={1}>
          {user ? `${points.toLocaleString('ko-KR')} P` : '로그인 필요'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingVertical: 6,
    minHeight: 48,
    backgroundColor: '#fff',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  logo: {
    height: 32,
    width: 112,
  },
  pointsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginLeft: 12,
  },
  pts: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
});
