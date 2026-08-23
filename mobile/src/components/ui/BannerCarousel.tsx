import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  LayoutChangeEvent,
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

interface Props {
  items: HomeFestival[];
  onPress: (item: HomeFestival) => void;
}

export default function BannerCarousel({ items, onPress }: Props) {
  const listRef = useRef<ScrollView>(null);
  const [width, setWidth] = useState(() => Math.max(280, Dimensions.get('window').width - 32));
  const [index, setIndex] = useState(0);
  const widthRef = useRef(width);
  const indexRef = useRef(index);
  widthRef.current = width;
  indexRef.current = index;

  const onLayout = (event: LayoutChangeEvent) => {
    const next = Math.round(event.nativeEvent.layout.width);
    if (next > 0 && next !== widthRef.current) {
      setWidth(next);
      requestAnimationFrame(() => {
        listRef.current?.scrollTo({ x: next * indexRef.current, animated: false });
      });
    }
  };

  useEffect(() => {
    if (items.length < 2 || width <= 0) return;
    const timer = setInterval(() => {
      const next = (indexRef.current + 1) % items.length;
      listRef.current?.scrollTo({ x: widthRef.current * next, animated: true });
      setIndex(next);
    }, 4200);
    return () => clearInterval(timer);
  }, [items.length, width]);

  if (!items.length) return null;

  const syncIndex = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const page = Math.max(1, widthRef.current);
    const next = Math.round(event.nativeEvent.contentOffset.x / page);
    if (next !== indexRef.current) setIndex(next);
  };

  return (
    <View style={styles.wrap} onLayout={onLayout}>
      <ScrollView
        ref={listRef}
        horizontal
        pagingEnabled
        decelerationRate="fast"
        snapToInterval={width}
        snapToAlignment="start"
        disableIntervalMomentum
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={syncIndex}
        onScrollEndDrag={syncIndex}
        style={{ width }}
      >
        {items.map((item) => (
          <TouchableOpacity
            key={item.id}
            activeOpacity={0.92}
            onPress={() => onPress(item)}
            style={[styles.card, { width }]}
          >
            {item.image_url ? (
              <Image source={{ uri: item.image_url }} style={[styles.image, { width }]} />
            ) : (
              <View style={[styles.image, styles.fallback, { width }]} />
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
  wrap: {
    marginTop: 12,
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1F2937',
  },
  card: {
    height: 210,
    overflow: 'hidden',
  },
  image: { height: 210, backgroundColor: '#1F2937' },
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
