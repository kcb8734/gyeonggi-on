import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';
import { secureMediaUrl } from '../../utils/mediaUrl';

export default function SafeFestivalImage({
  uri,
  title,
  style,
}: {
  uri?: string | null;
  title?: string | null;
  style?: StyleProp<ImageStyle | ViewStyle>;
}) {
  const safe = secureMediaUrl(uri);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [safe]);

  if (!safe || failed) {
    return (
      <View style={[styles.fallback, style]}>
        <Text style={styles.fallbackText} numberOfLines={2}>{title || '축제 이미지'}</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: safe }}
      style={style as StyleProp<ImageStyle>}
      resizeMode="cover"
      onError={() => setFailed(true)}
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: '#1E6FEA',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fallbackText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
});
