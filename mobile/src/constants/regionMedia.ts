/** 권역·축제별 대표 이미지. TourAPI 이미지가 없을 때 카드·피드·쿠폰에 쓴다. */
import { regionalFallbackUri } from './regionalFallbackKeys';

export const REGION_STOCK: Record<string, string> = {
  GYEONGGI: 'https://images.unsplash.com/photo-1549692520-acc6669e2f0c?w=800&q=80',
  SEOUL: 'https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=800&q=80',
  INCHEON: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&q=80',
  GANGWON: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
  CHUNGBUK: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&q=80',
  CHUNGNAM: 'https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=800&q=80',
  DAEJEON: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=800&q=80',
  SEJONG: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80',
  JEONBUK: 'https://images.unsplash.com/photo-1548013146-72479768bada?w=800&q=80',
  JEONNAM: 'https://images.unsplash.com/photo-1467810563316-b554652e1da4?w=800&q=80',
  GWANGJU: 'https://images.unsplash.com/photo-1467260201071-6e2ed80abd56?w=800&q=80',
  GYEONGBUK: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=800&q=80',
  GYEONGNAM: 'https://images.unsplash.com/photo-1528360983277-427c9a0e30ef?w=800&q=80',
  BUSAN: 'https://images.unsplash.com/photo-1467810563316-b554652e1da4?w=800&q=80',
  DAEGU: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80',
  ULSAN: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
  JEJU: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80',
  CHUNGCHEONG: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&q=80',
  JEOLLA: 'https://images.unsplash.com/photo-1548013146-72479768bada?w=800&q=80',
  GYEONGSANG: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=800&q=80',
};

const FESTIVAL_IMAGES: Array<{ token: string; url: string }> = [
  { token: '세미원', url: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80' },
  { token: '연꽃', url: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80' },
  { token: '양평', url: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80' },
];

const SHOP_EXTERIOR = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80';
const SHOP_INTERIOR = 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&q=80';

export function festivalImageFor(title?: string | null, location?: string | null, metro?: string | null): string {
  const hay = `${title ?? ''} ${location ?? ''}`;
  const hit = FESTIVAL_IMAGES.find((item) => hay.includes(item.token));
  if (hit) return hit.url;
  return regionalFallbackUri(location, metro, title);
}

export function shopPhotosFor(kind: 'food' | 'cafe' | 'market' | 'night' = 'food') {
  if (kind === 'cafe') {
    return {
      exterior_image_url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&q=80',
      interior_image_url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80',
    };
  }
  if (kind === 'market') {
    return {
      exterior_image_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80',
      interior_image_url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',
    };
  }
  if (kind === 'night') {
    return {
      exterior_image_url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=800&q=80',
      interior_image_url: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&q=80',
    };
  }
  return { exterior_image_url: SHOP_EXTERIOR, interior_image_url: SHOP_INTERIOR };
}
