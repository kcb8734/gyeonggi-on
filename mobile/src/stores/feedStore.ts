import { useEffect, useState } from 'react';
import { readJson, writeJson } from '../utils/storage';

export interface FeedPost {
  id: string;
  author: string;
  caption: string;
  festival?: string;
  festivalId?: string;
  imageUrl: string;
  likes: number;
  createdAt: string;
  rewarded?: boolean;
  pointsAwarded?: number;
  badge?: '지자체 지원 리워드 지급완료' | '지자체 1:1 매칭 피드';
  mine?: boolean;
}

const FEED_KEY = 'onandon-feed-v3';
const MY_KEY = 'onandon-my-feeds-v1';

const SEEDED: FeedPost[] = [
  {
    id: 'feed-1',
    author: '수원나들이',
    caption: '화성행궁 야경 미쳤다… 야행 조명 실화?',
    festival: '수원 국가유산야행',
    festivalId: '1000001',
    imageUrl: 'https://images.unsplash.com/photo-1549692520-acc6669e2f0c?w=600&q=80',
    likes: 1284,
    createdAt: '2026-08-21',
    rewarded: true,
    pointsAwarded: 1000,
    badge: '지자체 지원 리워드 지급완료',
  },
  {
    id: 'feed-2',
    author: '먹킷리스트',
    caption: '영동시장 꼬치 한 입. 쿠폰 찍고 왔음',
    festival: '수원 영동시장 먹거리 축제',
    festivalId: '1000004',
    imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80',
    likes: 862,
    createdAt: '2026-08-21',
    rewarded: true,
    pointsAwarded: 1000,
    badge: '지자체 1:1 매칭 피드',
  },
  {
    id: 'feed-3',
    author: '재즈키드',
    caption: '자라섬 선셋 무대. 소리 꺼도 심장은 쿵',
    festival: '가평 자라섬 재즈페스티벌',
    festivalId: '1000003',
    imageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&q=80',
    likes: 2103,
    createdAt: '2026-08-22',
    rewarded: true,
    pointsAwarded: 1000,
    badge: '지자체 지원 리워드 지급완료',
  },
  {
    id: 'feed-4',
    author: '플리헌터',
    caption: '용인 플리에서 빈티지 가방 득템',
    festival: '용인 플리마켓 위크',
    festivalId: '1000005',
    imageUrl: 'https://images.unsplash.com/photo-1515165562839-978bbcf01262?w=600&q=80',
    likes: 541,
    createdAt: '2026-08-22',
    rewarded: true,
    pointsAwarded: 1000,
    badge: '지자체 1:1 매칭 피드',
  },
];

type Listener = () => void;
let posts: FeedPost[] = readJson(FEED_KEY, SEEDED);
let myPosts: FeedPost[] = readJson(MY_KEY, []);
const listeners = new Set<Listener>();

function emit() {
  writeJson(FEED_KEY, posts);
  writeJson(MY_KEY, myPosts);
  listeners.forEach((fn) => fn());
}

export function getFeedPosts(): FeedPost[] {
  return posts;
}

export function getMyFeedPosts(): FeedPost[] {
  return myPosts;
}

export function getFeedPost(id: string): FeedPost | undefined {
  return posts.find((item) => item.id === id) ?? myPosts.find((item) => item.id === id);
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

export function useMyFeedPosts(): FeedPost[] {
  const [value, setValue] = useState(myPosts);
  useEffect(() => {
    const listen = () => setValue(getMyFeedPosts());
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
    festivalId: input.festivalId,
    imageUrl: input.imageUrl,
    likes: 0,
    createdAt: new Date().toISOString().slice(0, 10),
    rewarded: input.rewarded ?? true,
    pointsAwarded: input.pointsAwarded ?? 1000,
    badge: input.badge ?? (input.rewarded === false ? '지자체 1:1 매칭 피드' : '지자체 지원 리워드 지급완료'),
    mine: true,
  };
  posts = [post, ...posts];
  myPosts = [post, ...myPosts.filter((item) => item.id !== post.id)];
  emit();
  return post;
}

export function deleteMyFeedPost(id: string) {
  myPosts = myPosts.filter((item) => item.id !== id);
  posts = posts.filter((item) => item.id !== id);
  emit();
}
