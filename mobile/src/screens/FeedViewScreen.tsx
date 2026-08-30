import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFeedPosts } from '../stores/feedStore';
import ModalExitButton from '../components/ui/ModalExitButton';
import SafeFestivalImage from '../components/ui/SafeFestivalImage';

export default function FeedViewScreen({ postId }: { postId: string }) {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const posts = useFeedPosts();
  const [pageH, setPageH] = useState(640);
  const scroller = useRef<ScrollView>(null);
  const startIndex = useMemo(() => {
    const index = posts.findIndex((item) => item.id === postId);
    return index >= 0 ? index : 0;
  }, [posts, postId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      scroller.current?.scrollTo({ y: startIndex * pageH, animated: false });
    }, 40);
    return () => clearTimeout(timer);
  }, [pageH, startIndex]);

  if (posts.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>아직 올라온 피드가 없습니다</Text>
      </View>
    );
  }

  return (
    <View style={styles.root} onLayout={(event) => setPageH(event.nativeEvent.layout.height)}>
      <ModalExitButton onPress={() => navigation.goBack()} />
      <ScrollView
        ref={scroller}
        pagingEnabled
        snapToInterval={pageH}
        snapToAlignment="start"
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
      >
        {posts.map((post) => (
          <View key={post.id} style={{ height: pageH, width: '100%' }}>
            <SafeFestivalImage
              uri={post.imageUrl}
              title={post.festival}
              location={post.festival}
              metro={post.metro}
              style={styles.hero}
            />
            <View style={styles.scrim} />
            <View style={[styles.meta, { bottom: 28 + Math.max(insets.bottom, 12) }]}>
              {post.festival ? <Text style={styles.fest}>{post.festival}</Text> : null}
              <Text style={styles.caption}>{post.caption}</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {post.rewarded === false ? '지자체 1:1 매칭 피드' : '🎁 지자체 지원 리워드 지급완료'}
                </Text>
              </View>
              <Text style={styles.author}>@{post.author} · ♥ {post.likes.toLocaleString()}</Text>
              <Text style={styles.date}>{post.createdAt}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#111827' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827' },
  emptyText: { color: '#9CA3AF', fontWeight: '700' },
  hero: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17,24,39,0.28)',
  },
  meta: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 28,
  },
  fest: { color: '#FDE68A', fontSize: 12, fontWeight: '800', marginBottom: 8 },
  caption: { color: '#fff', fontSize: 22, fontWeight: '800', lineHeight: 30 },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 12,
    backgroundColor: 'rgba(253, 230, 138, 0.18)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: { color: '#FDE68A', fontWeight: '800', fontSize: 12 },
  author: { color: '#E5E7EB', fontSize: 14, fontWeight: '700', marginTop: 12 },
  date: { color: '#9CA3AF', fontSize: 12, marginTop: 6 },
});
