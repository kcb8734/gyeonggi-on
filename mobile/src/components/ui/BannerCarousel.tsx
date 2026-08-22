import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { HomeFestival } from '../../types/home';
import { ddayLabel, formatRange } from '../../utils/date';

const PAGE = Math.min(Dimensions.get('window').width, 370);

interface Props {
  items: HomeFestival[];
  onPress: (item: HomeFestival) => void;
}

export default function BannerCarousel({ items, onPress }: Props) {
  const ref = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (items.length < 2) return;
    const timer = setInterval(() => {
      setIndex((prev) => {
        const next = (prev + 1) % items.length;
        ref.current?.scrollTo({ x: PAGE * next, animated: true });
        return next;
      });
    }, 4200);
    return () => clearInterval(timer);
  }, [items.length]);

  if (!items.length) return null;

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / PAGE);
    if (next !== index) setIndex(next);
  };

  return (
    <View style={styles.wrap}>
      <ScrollView
        ref={ref}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
      >
        {items.map((item) => (
          <TouchableOpacity key={item.id} activeOpacity={0.92} onPress={() => onPress(item)}>
            {item.image_url ? (
              <Image source={{ uri: item.image_url }} style={styles.image} />
            ) : (
              <View style={[styles.image, styles.fallback]} />
            )}
            <View style={styles.scrim} />
            <View style={styles.caption}>
              <View style={styles.dday}>
                <Text style={styles.ddayText}>{ddayLabel(item.start_date, item.end_date) || 'HOT'}</Text>
              </View>
              <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
              <Text style={styles.meta}>{formatRange(item.start_date, item.end_date)}</Text>
              <Text style={styles.meta}>{item.location_name}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <View style={styles.dots}>
        {items.map((item, i) => (
          <View key={item.id} style={[styles.dot, i === index && styles.dotOn]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 12 },
  image: { width: PAGE, height: 210, backgroundColor: '#1F2937' },
  fallback: { backgroundColor: '#334155' },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17,24,39,0.28)',
  },
  caption: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 18,
  },
  dday: {
    alignSelf: 'flex-start',
    backgroundColor: '#E0392A',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 8,
  },
  ddayText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  title: { color: '#fff', fontSize: 20, fontWeight: '800' },
  meta: { color: '#E5E7EB', fontSize: 12, marginTop: 3 },
  dots: {
    position: 'absolute',
    right: 14,
    bottom: 12,
    flexDirection: 'row',
    gap: 5,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.45)' },
  dotOn: { width: 16, backgroundColor: '#fff' },
});
