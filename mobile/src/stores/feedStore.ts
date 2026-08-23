import { useEffect, useState } from 'react';
import { festivalImageFor } from '../constants/regionMedia';
import { REGION_FESTIVAL_FALLBACKS } from '../constants/regionTour';
import { readJson, writeJson } from '../utils/storage';

export interface FeedPost {
  id: string;
  author: string;
  caption: string;
  festival?: string;
  festivalId?: string;
  metro?: string;
  imageUrl: string;
  likes: number;
  createdAt: string;
  rewarded?: boolean;
  pointsAwarded?: number;
  badge?: '지자체 지원 리워드 지급완료' | '지자체 1:1 매칭 피드';
  mine?: boolean;
}

const FEED_KEY = 'onandon-feed-v5';
const MY_KEY = 'onandon-my-feeds-v2';

const GYEONGGI_SEEDED: FeedPost[] = [
  {
    id: 'feed-gg-1',
    author: '수원나들이',
    caption: '화성행궁 야경 미쳤다… 야행 조명 실화?',
    festival: '수원 국가유산야행',
    festivalId: '1000001',
    metro: 'GYEONGGI',
    imageUrl: festivalImageFor('수원 국가유산야행', '수원', 'GYEONGGI'),
    likes: 1284,
    createdAt: '2026-08-21',
    rewarded: true,
    pointsAwarded: 1000,
    badge: '지자체 지원 리워드 지급완료',
  },
  {
    id: 'feed-gg-2',
    author: '먹킷리스트',
    caption: '영동시장 꼬치 한 입. 쿠폰 찍고 왔음',
    festival: '수원 영동시장 먹거리 축제',
    festivalId: '1000004',
    metro: 'GYEONGGI',
    imageUrl: festivalImageFor('영동시장', '수원', 'GYEONGGI'),
    likes: 862,
    createdAt: '2026-08-21',
    rewarded: true,
    pointsAwarded: 1000,
    badge: '지자체 1:1 매칭 피드',
  },
  {
    id: 'feed-gg-3',
    author: '재즈키드',
    caption: '자라섬 선셋 무대. 소리 꺼도 심장은 쿵',
    festival: '가평 자라섬 재즈페스티벌',
    festivalId: '1000003',
    metro: 'GYEONGGI',
    imageUrl: festivalImageFor('자라섬', '가평', 'GYEONGGI'),
    likes: 2103,
    createdAt: '2026-08-22',
    rewarded: true,
    pointsAwarded: 1000,
    badge: '지자체 지원 리워드 지급완료',
  },
  {
    id: 'feed-gg-4',
    author: '플리헌터',
    caption: '용인 플리에서 빈티지 가방 득템',
    festival: '용인 플리마켓 위크',
    festivalId: '1000005',
    metro: 'GYEONGGI',
    imageUrl: festivalImageFor('플리', '용인', 'GYEONGGI'),
    likes: 541,
    createdAt: '2026-08-22',
    rewarded: true,
    pointsAwarded: 1000,
    badge: '지자체 1:1 매칭 피드',
  },
];

const REGION_CAPTIONS: Record<string, string[]> = {
  SEOUL: ['광화문 광장에서 거리예술 한바탕', '청계천 초롱이 강을 다 덮었다', '장미정원에서 인생샷 찍고 쿠폰 씀', '한강 불꽃 보고 포차에서 한 잔'],
  INCHEON: ['펜타포트 메인 스테이지 소름', '고인돌 공원 일몰이 예술', '개항장 야행 조명 골목'],
  GANGWON: ['마임 광장에서 웃음 참기 실패', '안목 커피 한 잔이 바다를 담음', '봉평 메밀꽃이 하얗게 피었다', '속초 해변 파도 소리 ASMR'],
  CHUNGCHEONG: ['직지 활자가 빛으로 살아났다', '머드 한바탕 하고 조개 굽는 중', '궁남지 연꽃이 분홍으로 물듦'],
  JEOLLA: ['한옥골목에서 한지등 들고 걸음', '여수 밤바다 불꽃이 바다를 가르다', '순천만 갈대밭이 금빛으로 출렁'],
  GYEONGSANG: ['남강 유등이 강을 따라 흘러간다', '대릉원 벚꽃이 노을에 흩날림', '광안대교 아래 불꽃 폭죽'],
  JEJU: ['새별오름 들불이 밤을 열었다', '칠십리 해안도로 바람이 소금 맛', '협재 유채꽃이 노랗게 번짐'],
};

function regionSeeded(metro: string): FeedPost[] {
  const festivals = REGION_FESTIVAL_FALLBACKS[metro] ?? [];
  const captions = REGION_CAPTIONS[metro] ?? [];
  return festivals.map((item, index) => ({
    id: `feed-${metro}-${item.id}`,
    author: `${item.municipality_name ?? '온앤온'}탐험가`,
    caption: captions[index] ?? `${item.title} 현장에서 쿠폰 찍고 왔어요`,
    festival: item.title,
    festivalId: item.id,
    metro,
    imageUrl: item.image_url ?? festivalImageFor(item.title, item.location_name, metro),
    likes: 420 + index * 137,
    createdAt: '2026-08-22',
    rewarded: true,
    pointsAwarded: 1000,
    badge: index % 2 === 0 ? '지자체 지원 리워드 지급완료' : '지자체 1:1 매칭 피드',
  }));
}

const SEEDED: FeedPost[] = [
  ...GYEONGGI_SEEDED,
  ...Object.keys(REGION_FESTIVAL_FALLBACKS).flatMap((metro) => regionSeeded(metro)),
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

export function feedsForRegion(metro?: string): FeedPost[] {
  const mine = myPosts.filter((item) => !metro || !item.metro || item.metro === metro);
  const seeded = posts.filter((item) => (item.metro ?? 'GYEONGGI') === (metro ?? 'GYEONGGI') && !item.mine);
  const merged = [...mine, ...seeded];
  const seen = new Set<string>();
  return merged.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export function useFeedPosts(metro?: string): FeedPost[] {
  const [value, setValue] = useState(() => feedsForRegion(metro));
  useEffect(() => {
    const listen = () => setValue(feedsForRegion(metro));
    listen();
    listeners.add(listen);
    return () => {
      listeners.delete(listen);
    };
  }, [metro]);
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
    metro: input.metro,
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
