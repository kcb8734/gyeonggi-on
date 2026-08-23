/** 권역·축제별 대표 이미지. TourAPI 이미지가 없을 때 카드·피드·쿠폰에 쓴다. */
export const REGION_STOCK: Record<string, string> = {
  GYEONGGI: 'https://images.unsplash.com/photo-1549692520-acc6669e2f0c?w=800&q=80',
  SEOUL: 'https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=800&q=80',
  INCHEON: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&q=80',
  GANGWON: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
  CHUNGCHEONG: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&q=80',
  JEOLLA: 'https://images.unsplash.com/photo-1548013146-72479768bada?w=800&q=80',
  GYEONGSANG: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=800&q=80',
  JEJU: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80',
};

const FESTIVAL_IMAGES: Array<{ token: string; url: string }> = [
  { token: '수원화성', url: 'https://images.unsplash.com/photo-1549692520-acc6669e2f0c?w=800&q=80' },
  { token: '화성문화', url: 'https://images.unsplash.com/photo-1549692520-acc6669e2f0c?w=800&q=80' },
  { token: '야행', url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=800&q=80' },
  { token: '영동시장', url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80' },
  { token: '민속촌', url: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80' },
  { token: '자라섬', url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80' },
  { token: '플리', url: 'https://images.unsplash.com/photo-1515165562839-978bbcf01262?w=800&q=80' },
  { token: '마임', url: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800&q=80' },
  { token: '커피', url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80' },
  { token: '효석', url: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800&q=80' },
  { token: '메밀', url: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800&q=80' },
  { token: '속초', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80' },
  { token: '거리예술', url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80' },
  { token: '빛초롱', url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=800&q=80' },
  { token: '장미', url: 'https://images.unsplash.com/photo-1455659817273-f96807779a8a?w=800&q=80' },
  { token: '한강', url: 'https://images.unsplash.com/photo-1538485399081-7191377e8241?w=800&q=80' },
  { token: '펜타포트', url: 'https://images.unsplash.com/photo-1459749414110-6f7bf737c4b3?w=800&q=80' },
  { token: '고인돌', url: 'https://images.unsplash.com/photo-1467260201071-6e2ed80abd56?w=800&q=80' },
  { token: '개항장', url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&q=80' },
  { token: '직지', url: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&q=80' },
  { token: '머드', url: 'https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=800&q=80' },
  { token: '서동', url: 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?w=800&q=80' },
  { token: '한지', url: 'https://images.unsplash.com/photo-1548013146-72479768bada?w=800&q=80' },
  { token: '밤바다', url: 'https://images.unsplash.com/photo-1467810563316-b554652e1da4?w=800&q=80' },
  { token: '여수', url: 'https://images.unsplash.com/photo-1467810563316-b554652e1da4?w=800&q=80' },
  { token: '갈대', url: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=800&q=80' },
  { token: '유등', url: 'https://images.unsplash.com/photo-1528360983277-427c9a0e30ef?w=800&q=80' },
  { token: '벚꽃', url: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=800&q=80' },
  { token: '부산불꽃', url: 'https://images.unsplash.com/photo-1467810563316-b554652e1da4?w=800&q=80' },
  { token: '들불', url: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800&q=80' },
  { token: '칠십리', url: 'https://images.unsplash.com/photo-1590523277543-a94d2e4eb00b?w=800&q=80' },
  { token: '유채', url: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=800&q=80' },
];

const SHOP_EXTERIOR = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80';
const SHOP_INTERIOR = 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&q=80';

export function festivalImageFor(title?: string | null, location?: string | null, metro?: string | null): string {
  const hay = `${title ?? ''} ${location ?? ''}`;
  const hit = FESTIVAL_IMAGES.find((item) => hay.includes(item.token));
  if (hit) return hit.url;
  return REGION_STOCK[metro ?? 'GYEONGGI'] ?? REGION_STOCK.GYEONGGI;
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
