import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

function PowerO({ color, size }: { color: string; size: number }) {
  const stroke = Math.max(2, size * 0.13);
  const r = size / 2 - stroke;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle
        cx={size / 2}
        cy={size / 2 + stroke * 0.15}
        r={r * 0.78}
        stroke={color}
        strokeWidth={stroke}
        fill="none"
      />
      <Path
        d={`M ${size / 2 - stroke * 0.7} ${stroke * 1.15} Q ${size / 2} ${stroke * 0.2} ${size / 2 + stroke * 0.7} ${stroke * 1.15}`}
        stroke="#fff"
        strokeWidth={stroke * 1.35}
        fill="none"
      />
      <Line
        x1={size / 2}
        y1={stroke * 0.15}
        x2={size / 2}
        y2={size * 0.42}
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export default function OnAndOnPlusLogo({ height = 26 }: { height?: number }) {
  const o = Math.round(height * 0.92);
  const nSize = Math.round(height * 0.78);
  const plus = Math.round(height * 0.42);
  return (
    <View style={[styles.row, { height }]}>
      <PowerO color="#2F6FED" size={o} />
      <Text style={[styles.n, { fontSize: nSize, color: '#2F6FED', marginLeft: 1 }]}>n</Text>
      <Text style={[styles.amp, { fontSize: nSize * 0.9, lineHeight: height }]}>&</Text>
      <PowerO color="#22A45A" size={o} />
      <Text style={[styles.n, { fontSize: nSize, color: '#22A45A', marginLeft: 1 }]}>n</Text>
      <Text style={[styles.plus, { fontSize: plus, lineHeight: plus + 2 }]}>+</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end' },
  n: { fontWeight: '800', includeFontPadding: false },
  amp: { color: '#F97316', fontWeight: '800', marginHorizontal: 3, includeFontPadding: false },
  plus: { color: '#F97316', fontWeight: '800', marginLeft: 1, marginBottom: 10, includeFontPadding: false },
});
