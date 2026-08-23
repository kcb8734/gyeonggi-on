import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

const ACTIVE = '#E0392A';
const INACTIVE = '#555555';

type Glyph = 'home' | 'nearby' | 'calendar' | 'coupons' | 'my';

function Icon({ name, color }: { name: Glyph; color: string }) {
  const stroke = color;
  if (name === 'home') {
    return (
      <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
        <Path
          d="M4.5 11.2 12 4.8l7.5 6.4V20a.8.8 0 0 1-.8.8h-4.4v-5.4H9.7V20.8H5.3a.8.8 0 0 1-.8-.8v-8.8Z"
          stroke={stroke}
          strokeWidth={1.8}
          strokeLinejoin="round"
          fill={stroke}
        />
      </Svg>
    );
  }
  if (name === 'nearby') {
    return (
      <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
        <Path
          d="M12 21s6.5-6.1 6.5-11.2A6.5 6.5 0 0 0 5.5 9.8C5.5 14.9 12 21 12 21Z"
          fill={stroke}
        />
        <Circle cx="12" cy="9.8" r="2.2" fill="#fff" />
      </Svg>
    );
  }
  if (name === 'calendar') {
    return (
      <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
        <Rect x="3.5" y="5" width="17" height="15" rx="2" fill={stroke} />
        <Rect x="3.5" y="5" width="17" height="4.2" rx="2" fill={stroke} />
        <Rect x="7" y="3.2" width="1.6" height="3.4" rx="0.6" fill={stroke} />
        <Rect x="15.4" y="3.2" width="1.6" height="3.4" rx="0.6" fill={stroke} />
        <Rect x="7.2" y="12" width="3" height="2.2" rx="0.4" fill="#fff" />
        <Rect x="11.5" y="12" width="3" height="2.2" rx="0.4" fill="#fff" />
        <Rect x="15.8" y="12" width="3" height="2.2" rx="0.4" fill="#fff" />
      </Svg>
    );
  }
  if (name === 'coupons') {
    return (
      <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
        <Path
          d="M4 8.2A1.7 1.7 0 0 1 5.7 6.5h12.6A1.7 1.7 0 0 1 20 8.2v2a1.6 1.6 0 1 0 0 3.2v2.4a1.7 1.7 0 0 1-1.7 1.7H5.7A1.7 1.7 0 0 1 4 15.8v-2.4a1.6 1.6 0 1 0 0-3.2V8.2Z"
          fill={stroke}
        />
        <Path d="M12 7v10" stroke="#fff" strokeWidth={1.6} strokeDasharray="2 2" />
      </Svg>
    );
  }
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8.2" r="3.4" fill={stroke} />
      <Path d="M5.4 19.2c.7-3.4 3.3-5.2 6.6-5.2s5.9 1.8 6.6 5.2" fill={stroke} />
    </Svg>
  );
}

export default function TabGlyph({
  name,
  label,
  focused,
}: {
  name: Glyph;
  label: string;
  focused: boolean;
}) {
  const color = focused ? ACTIVE : INACTIVE;
  return (
    <View style={styles.wrap}>
      <Icon name={name} color={color} />
      <Text
        numberOfLines={1}
        ellipsizeMode="clip"
        style={[
          styles.label,
          { color, fontWeight: focused ? '700' : '600' },
          Platform.OS === 'web' ? ({ whiteSpace: 'nowrap' } as object) : null,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  label: {
    fontSize: 13,
    lineHeight: 16,
    width: 64,
    textAlign: 'center',
    includeFontPadding: false,
  },
});
