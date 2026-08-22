import React from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFeedPosts } from '../../stores/feedStore';

export default function FeedRail() {
  const posts = useFeedPosts();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {posts.map((post) => (
        <View key={post.id} style={styles.card}>
          <Image source={{ uri: post.imageUrl }} style={styles.image} />
          <View style={styles.scrim} />
          <View style={styles.meta}>
            {post.festival ? <Text style={styles.fest} numberOfLines={1}>{post.festival}</Text> : null}
            <Text style={styles.caption} numberOfLines={3}>{post.caption}</Text>
            <Text style={styles.author}>@{post.author} · ♥ {post.likes.toLocaleString()}</Text>
          </View>
        </View>
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
  },
  image: { width: '100%', height: '100%' },
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
  author: { color: '#E5E7EB', fontSize: 11, marginTop: 6, fontWeight: '600' },
});
