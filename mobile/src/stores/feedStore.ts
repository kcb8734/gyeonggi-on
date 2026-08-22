import { useEffect, useState } from 'react';
import { readJson, writeJson } from '../utils/storage';

export interface FeedPost {
  id: string;
  author: string;
  caption: string;
  festival?: string;
  imageUrl: string;
  likes: number;
  createdAt: string;
}

const KEY = 'gyeonggi-on-feed';

const SEEDED: FeedPost[] = [
  {
    id: 'feed-1',
    author: '수원나들이',
    caption: '화성행궁 야경 미쳤다… 야행 조명 실화?',
    festival: '수원 국가유산야행',
    imageUrl: 'https://images.unsplash.com/photo-1549692520-acc6669e2f0c?w=600&q=80',
    likes: 1284,
    createdAt: '2026-08-21',
  },
  {
    id: 'feed-2',
    author: '먹킷리스트',
    caption: '영동시장 꼬치 한 입. 쿠폰 찍고 왔음',
    festival: '수원 영동시장 먹거리 축제',
    imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80',
    likes: 862,
    createdAt: '2026-08-21',
  },
  {
    id: 'feed-3',
    author: '재즈키드',
    caption: '자라섬 선셋 무대. 소리 꺼도 심장은 쿵',
    festival: '가평 자라섬 재즈페스티벌',
    imageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&q=80',
    likes: 2103,
    createdAt: '2026-08-22',
  },
  {
    id: 'feed-4',
    author: '플리헌터',
    caption: '용인 플리에서 빈티지 가방 득템',
    festival: '용인 플리마켓 위크',
    imageUrl: 'https://images.unsplash.com/photo-1515165562839-978bbcf01262?w=600&q=80',
    likes: 541,
    createdAt: '2026-08-22',
  },
];

type Listener = () => void;
let posts: FeedPost[] = readJson(KEY, SEEDED);
const listeners = new Set<Listener>();

function emit(next: FeedPost[]) {
  posts = next;
  writeJson(KEY, posts);
  listeners.forEach((fn) => fn());
}

export function getFeedPosts(): FeedPost[] {
  return posts;
}

export function getFeedPost(id: string): FeedPost | undefined {
  return posts.find((item) => item.id === id);
}

export function useFeedPosts(): FeedPost[] {
  const [value, setValue] = useState(posts);
  useEffect(() => {
    const listen = () => setValue(getFeedPosts());
    listeners.add(listen);
    return () => {
      listeners.delete(listen);
    };
  }, []);
  return value;
}

export function addFeedPost(input: Omit<FeedPost, 'id' | 'likes' | 'createdAt' | 'author'> & { author?: string }) {
  const post: FeedPost = {
    id: `feed-${Date.now()}`,
    author: input.author ?? '온앤온 탐험가',
    caption: input.caption,
    festival: input.festival,
    imageUrl: input.imageUrl,
    likes: 0,
    createdAt: new Date().toISOString().slice(0, 10),
  };
  emit([post, ...posts]);
  return post;
}
