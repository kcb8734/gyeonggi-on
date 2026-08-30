import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFeedPosts } from '../../stores/feedStore';
import SafeFestivalImage from './SafeFestivalImage';

export default function FeedRail({ onPress, metro }: { onPress?: (postId: string) => void; metro?: string }) {
  const posts = useFeedPosts(metro);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {posts.map((post) => (
        <TouchableOpacity
          key={post.id}
          style={styles.card}
          activeOpacity={0.9}
          onPress={() => onPress?.(post.id)}
        >
          <SafeFestivalImage
            uri={post.imageUrl}
            title={post.festival}
            location={post.festival}
            metro={post.metro || metro}
            style={styles.image}
          />
          <View style={styles.scrim} />
          <View style={styles.meta}>
            {post.festival ? <Text style={styles.fest} numberOfLines={1}>{post.festival}</Text> : null}
            <Text style={styles.caption} numberOfLines={3}>{post.caption}</Text>
            <View style={styles.badge}>
              <Text style={styles.reward} numberOfLines={2}>
                {post.rewarded === false ? '지자체 1:1 매칭 피드' : '🎁 지자체 지원 리워드 지급완료'}
              </Text>
            </View>
            <Text style={styles.author}>@{post.author} · ♥ {post.likes.toLocaleString()}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 16, paddingTop: 10, gap: 10 },
  card: {
    width: 148,
    height: 248,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#111827',
    position: 'relative',
  },
  image: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 148,
    height: 248,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17,24,39,0.28)',
  },
  meta: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
  },
  fest: { color: '#FDE68A', fontSize: 10, fontWeight: '800', marginBottom: 4 },
  caption: { color: '#fff', fontSize: 13, fontWeight: '800', lineHeight: 18 },
  badge: {
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(253, 230, 138, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  reward: { color: '#FDE68A', fontSize: 10, fontWeight: '800' },
  author: { color: '#E5E7EB', fontSize: 11, marginTop: 6, fontWeight: '600' },
});
