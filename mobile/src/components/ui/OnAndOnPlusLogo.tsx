import React from 'react';
import { Image } from 'react-native';

const LOGO = require('../../../assets/onandon-logo.png');
const RATIO = 1482 / 365;

/** 홈 화면 상단과 같은 on&on+ PNG 로고. */
export default function OnAndOnPlusLogo({ height = 26 }: { height?: number }) {
  const width = Math.round(height * RATIO);
  return (
    <Image
      source={LOGO}
      style={{ height, width }}
      resizeMode="contain"
      accessibilityLabel="on&on+"
    />
  );
}
