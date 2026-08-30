import React, { useEffect, useState } from 'react';
import { Image, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';
import { regionalFallbackSource } from '../../constants/regionalFallbackImages';
import { secureMediaUrl } from '../../utils/mediaUrl';

export default function SafeFestivalImage({
  uri,
  title,
  location,
  metro,
  style,
}: {
  uri?: string | null;
  title?: string | null;
  location?: string | null;
  metro?: string | null;
  style?: StyleProp<ImageStyle | ViewStyle>;
}) {
  const safe = secureMediaUrl(uri);
  const fallback = regionalFallbackSource(location, metro, title);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [safe]);

  if (!safe || failed) {
    return <Image source={fallback} style={style as StyleProp<ImageStyle>} resizeMode="cover" />;
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
