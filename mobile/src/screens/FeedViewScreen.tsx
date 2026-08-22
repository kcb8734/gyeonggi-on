import React, { useMemo } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getFeedPost } from '../stores/feedStore';

export default function FeedViewScreen({ postId }: { postId: string }) {
  const post = useMemo(() => getFeedPost(postId), [postId]);

  if (!post) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>피드를 찾을 수 없습니다</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 36 }}>
      <Image source={{ uri: post.imageUrl }} style={styles.hero} />
      <View style={styles.body}>
        {post.festival ? <Text style={styles.fest}>{post.festival}</Text> : null}
        <Text style={styles.caption}>{post.caption}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.author}>@{post.author}</Text>
          <Text style={styles.likes}>♥ {post.likes.toLocaleString()}</Text>
        </View>
        <Text style={styles.date}>{post.createdAt}</Text>
        <Text style={styles.note}>온앤온(on&on) 축제 현장에서 올라온 세로 피드입니다.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#111827' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6' },
  emptyText: { color: '#6B7280', fontWeight: '700' },
  hero: { width: '100%', height: 520, backgroundColor: '#1F2937' },
  body: { padding: 20, backgroundColor: '#111827' },
  fest: { color: '#FDE68A', fontSize: 12, fontWeight: '800', marginBottom: 8 },
  caption: { color: '#fff', fontSize: 22, fontWeight: '800', lineHeight: 30 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  author: { color: '#E5E7EB', fontSize: 14, fontWeight: '700' },
  likes: { color: '#FCA5A5', fontSize: 14, fontWeight: '800' },
  date: { color: '#9CA3AF', fontSize: 12, marginTop: 8 },
  note: { color: '#9CA3AF', fontSize: 12, marginTop: 18, lineHeight: 18 },
});
