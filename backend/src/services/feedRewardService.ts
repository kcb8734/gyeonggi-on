import { matchingMatrixRows, REGION_META } from '../constants/metroLocalities';

export interface FeedRewardRow {
  id: string;
  userName: string;
  festival: string;
  city: string;
  regionalZone: string;
  regionLabel: string;
  amountWon: number;
  points: number;
  postedAt: string;
  status: 'PENDING' | 'PAID';
}

const SAMPLE: Array<Omit<FeedRewardRow, 'id' | 'regionLabel' | 'points'>> = [
  { userName: '수원나들이', festival: '수원화성문화제', city: '수원시', regionalZone: 'GYEONGGI', amountWon: 1000, postedAt: '2026-08-22', status: 'PAID' },
  { userName: '재즈키드', festival: '가평 자라섬 재즈페스티벌', city: '가평군', regionalZone: 'GYEONGGI', amountWon: 1000, postedAt: '2026-08-22', status: 'PENDING' },
  { userName: '광장탐험가', festival: '서울거리예술축제', city: '종로구', regionalZone: 'SEOUL', amountWon: 1000, postedAt: '2026-08-21', status: 'PAID' },
  { userName: '송도락커', festival: '인천펜타포트락페스티벌', city: '연수구', regionalZone: 'INCHEON', amountWon: 1000, postedAt: '2026-08-21', status: 'PENDING' },
  { userName: '광안리야행', festival: '부산불꽃축제', city: '수영구', regionalZone: 'BUSAN', amountWon: 1000, postedAt: '2026-08-20', status: 'PAID' },
  { userName: '치맥러버', festival: '대구치맥페스티벌', city: '수성구', regionalZone: 'DAEGU', amountWon: 1000, postedAt: '2026-08-20', status: 'PENDING' },
  { userName: '김치여행', festival: '광주김치축제', city: '서구', regionalZone: 'GWANGJU', amountWon: 1000, postedAt: '2026-08-19', status: 'PAID' },
  { userName: '대전야행', festival: '대전 0시 축제', city: '중구', regionalZone: 'DAEJEON', amountWon: 1000, postedAt: '2026-08-19', status: 'PENDING' },
  { userName: '고래마을', festival: '울산고래축제', city: '남구', regionalZone: 'ULSAN', amountWon: 1000, postedAt: '2026-08-18', status: 'PAID' },
  { userName: '세종탐험가', festival: '세종축제', city: '세종시', regionalZone: 'SEJONG', amountWon: 1000, postedAt: '2026-08-18', status: 'PENDING' },
  { userName: '마임광장', festival: '춘천마임축제', city: '춘천시', regionalZone: 'GANGWON', amountWon: 1000, postedAt: '2026-08-17', status: 'PAID' },
  { userName: '직지기록가', festival: '청주직지축제', city: '청주시', regionalZone: 'CHUNGBUK', amountWon: 1000, postedAt: '2026-08-17', status: 'PENDING' },
  { userName: '머드여행', festival: '보령머드축제', city: '보령시', regionalZone: 'CHUNGNAM', amountWon: 1000, postedAt: '2026-08-16', status: 'PAID' },
  { userName: '한옥골목', festival: '전주한지문화축제', city: '전주시', regionalZone: 'JEONBUK', amountWon: 1000, postedAt: '2026-08-16', status: 'PENDING' },
  { userName: '밤바다러버', festival: '여수밤바다불꽃축제', city: '여수시', regionalZone: 'JEONNAM', amountWon: 1000, postedAt: '2026-08-15', status: 'PAID' },
  { userName: '대릉원벚꽃', festival: '경주벚꽃축제', city: '경주시', regionalZone: 'GYEONGBUK', amountWon: 1000, postedAt: '2026-08-15', status: 'PENDING' },
  { userName: '유등산책', festival: '진주남강유등축제', city: '진주시', regionalZone: 'GYEONGNAM', amountWon: 1000, postedAt: '2026-08-14', status: 'PAID' },
  { userName: '오름들불', festival: '제주들불축제', city: '제주시', regionalZone: 'JEJU', amountWon: 1000, postedAt: '2026-08-14', status: 'PENDING' },
];

let rewards: FeedRewardRow[] = SAMPLE.map((row, index) => ({
  ...row,
  id: `FR-${String(index + 1).padStart(4, '0')}`,
  regionLabel: REGION_META[row.regionalZone]?.label ?? row.regionalZone,
  points: 1000,
}));

export function listFeedRewards(): FeedRewardRow[] {
  if (rewards.length) return rewards;
  return matchingMatrixRows().slice(0, 17).map((row, index) => ({
    id: `FR-${String(index + 1).padStart(4, '0')}`,
    userName: `${row.city.replace(/\s+/g, '')}탐험가`,
    festival: `${row.city} 축제`,
    city: row.city,
    regionalZone: row.regionalZone,
    regionLabel: row.regionLabel,
    amountWon: 1000,
    points: 1000,
    postedAt: '2026-08-22',
    status: index % 2 === 0 ? 'PAID' : 'PENDING',
  }));
}

export function markFeedRewardPaid(id: string): FeedRewardRow | undefined {
  rewards = rewards.map((row) => (row.id === id ? { ...row, status: 'PAID' } : row));
  return rewards.find((row) => row.id === id);
}
