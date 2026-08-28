import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';

/** 브랜드 O: 위가 열린 원과 가운데 세로획(파워 심볼형). */
function PowerO({ color, size }: { color: string; size: number }) {
  const stroke = Math.max(2.1, size * 0.145);
  const cx = size / 2;
  const cy = size / 2 + size * 0.06;
  const r = size * 0.355;
  const gap = r * 0.34;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Path
        d={`M ${cx - gap} ${cy - r * 0.9} A ${r} ${r} 0 1 0 ${cx + gap} ${cy - r * 0.9}`}
        stroke={color}
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
      />
      <Line
        x1={cx}
        y1={size * 0.07}
        x2={cx}
        y2={cy - r * 0.12}
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export default function OnAndOnPlusLogo({ height = 26 }: { height?: number }) {
  const o = Math.round(height * 0.9);
  const nSize = Math.round(height * 0.72);
  const plus = Math.round(height * 0.4);
  return (
    <View style={[styles.row, { height: height + 2 }]} accessibilityLabel="on&on+">
      <PowerO color="#2F6FED" size={o} />
      <Text style={[styles.n, { fontSize: nSize, color: '#2F6FED' }]}>n</Text>
      <Text style={[styles.amp, { fontSize: Math.round(nSize * 0.88) }]}>&amp;</Text>
      <PowerO color="#22A45A" size={o} />
      <Text style={[styles.n, { fontSize: nSize, color: '#22A45A' }]}>n</Text>
      <Text style={[styles.plus, { fontSize: plus, lineHeight: plus + 2 }]}>+</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  n: { fontWeight: '800', includeFontPadding: false, marginLeft: 1, marginBottom: 0 },
  amp: { color: '#F97316', fontWeight: '800', marginHorizontal: 3, includeFontPadding: false, marginBottom: 1 },
  plus: { color: '#F97316', fontWeight: '800', marginLeft: 2, marginBottom: 6, includeFontPadding: false },
});
