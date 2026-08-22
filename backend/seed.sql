-- 개발용 시드 데이터 (경기온)
-- 메인 지도 / 할인 등록 화면이 고정 DEV ID로 조회할 수 있도록 UUID를 고정한다.

INSERT INTO municipalities (name, region_code, budget_balance) VALUES
  ('수원시', 'GG_SUWON', 50000000.00),
  ('용인시', 'GG_YONGIN', 30000000.00),
  ('가평군', 'GG_GAPYEONG', 10000000.00)
ON CONFLICT (region_code) DO NOTHING;

-- 고객 / 점주 개발용 계정 ID
-- user:     11111111-1111-4111-8111-111111111111
-- merchant: 22222222-2222-4222-8222-222222222222

INSERT INTO festivals (
  id, municipality_id, title, description, start_date, end_date,
  location_name, latitude, longitude
)
SELECT
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  m.id,
  '수원화성문화제',
  '수원화성 일원에서 열리는 전통문화 축제. 주변 제휴업소에서 경기온 상생 할인을 받을 수 있습니다.',
  CURRENT_DATE - INTERVAL '3 days',
  CURRENT_DATE + INTERVAL '30 days',
  '수원화성 행궁광장',
  37.2870,
  127.0130
FROM municipalities m
WHERE m.region_code = 'GG_SUWON'
ON CONFLICT (id) DO NOTHING;

INSERT INTO festivals (
  id, municipality_id, title, description, start_date, end_date,
  location_name, latitude, longitude
)
SELECT
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  m.id,
  '용인 한국민속촌 축제',
  '한국민속촌에서 열리는 전통 체험 축제와 골목 상권 연계 할인.',
  CURRENT_DATE - INTERVAL '1 day',
  CURRENT_DATE + INTERVAL '20 days',
  '한국민속촌',
  37.2590,
  127.1170
FROM municipalities m
WHERE m.region_code = 'GG_YONGIN'
ON CONFLICT (id) DO NOTHING;

INSERT INTO festivals (
  id, municipality_id, title, description, start_date, end_date,
  location_name, latitude, longitude
)
SELECT
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  m.id,
  '가평 자라섬 재즈페스티벌',
  '자라섬에서 열리는 재즈 페스티벌. 카페·식당 제휴 할인을 확인하세요.',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '14 days',
  '자라섬',
  37.8230,
  127.5130
FROM municipalities m
WHERE m.region_code = 'GG_GAPYEONG'
ON CONFLICT (id) DO NOTHING;

INSERT INTO merchants (
  id, owner_user_id, municipality_id, business_name, business_number,
  category, address, latitude, longitude, is_verified
)
SELECT
  '22222222-2222-4222-8222-222222222222',
  '11111111-1111-4111-8111-111111111111',
  m.id,
  '화성행궁 한정식',
  '123-45-00001',
  '음식점',
  '경기도 수원시 팔달구 정조로 825',
  37.2865,
  127.0140,
  TRUE
FROM municipalities m
WHERE m.region_code = 'GG_SUWON'
ON CONFLICT (id) DO NOTHING;

INSERT INTO merchants (
  id, owner_user_id, municipality_id, business_name, business_number,
  category, address, latitude, longitude, is_verified
)
SELECT
  '33333333-3333-4333-8333-333333333333',
  '11111111-1111-4111-8111-111111111112',
  m.id,
  '팔달문 카페',
  '123-45-00002',
  '카페',
  '경기도 수원시 팔달구 팔달로2가 11',
  37.2820,
  127.0165,
  TRUE
FROM municipalities m
WHERE m.region_code = 'GG_SUWON'
ON CONFLICT (id) DO NOTHING;

INSERT INTO merchants (
  id, owner_user_id, municipality_id, business_name, business_number,
  category, address, latitude, longitude, is_verified
)
SELECT
  '44444444-4444-4444-8444-444444444444',
  '11111111-1111-4111-8111-111111111113',
  m.id,
  '남문시장 분식',
  '123-45-00003',
  '음식점',
  '경기도 수원시 팔달구 수원천로 255',
  37.2768,
  127.0160,
  TRUE
FROM municipalities m
WHERE m.region_code = 'GG_SUWON'
ON CONFLICT (id) DO NOTHING;

INSERT INTO merchants (
  id, owner_user_id, municipality_id, business_name, business_number,
  category, address, latitude, longitude, is_verified
)
SELECT
  '55555555-5555-4555-8555-555555555555',
  '11111111-1111-4111-8111-111111111114',
  m.id,
  '민속촌 전집',
  '123-45-00004',
  '음식점',
  '경기도 용인시 기흥구 민속촌로 90',
  37.2580,
  127.1180,
  TRUE
FROM municipalities m
WHERE m.region_code = 'GG_YONGIN'
ON CONFLICT (id) DO NOTHING;

INSERT INTO merchants (
  id, owner_user_id, municipality_id, business_name, business_number,
  category, address, latitude, longitude, is_verified
)
SELECT
  '66666666-6666-4666-8666-666666666666',
  '11111111-1111-4111-8111-111111111115',
  m.id,
  '용인 공예공방',
  '123-45-00005',
  '공예',
  '경기도 용인시 기흥구 민속촌로 102',
  37.2610,
  127.1150,
  TRUE
FROM municipalities m
WHERE m.region_code = 'GG_YONGIN'
ON CONFLICT (id) DO NOTHING;

INSERT INTO merchants (
  id, owner_user_id, municipality_id, business_name, business_number,
  category, address, latitude, longitude, is_verified
)
SELECT
  '77777777-7777-4777-8777-777777777777',
  '11111111-1111-4111-8111-111111111116',
  m.id,
  '자라섬 브런치',
  '123-45-00006',
  '카페',
  '경기도 가평군 가평읍 달전리 1',
  37.8220,
  127.5140,
  TRUE
FROM municipalities m
WHERE m.region_code = 'GG_GAPYEONG'
ON CONFLICT (id) DO NOTHING;

INSERT INTO discount_promotions (
  id, merchant_id, festival_id, title, merchant_discount_rate, gov_matching_rate,
  max_discount_amount, total_quantity, remaining_quantity, start_time, end_time, status
) VALUES
  (
    'dddddddd-dddd-4ddd-8ddd-dddddddd0001',
    '22222222-2222-4222-8222-222222222222',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '수원화성문화제 제휴 한정식 할인',
    5.00, 5.00, 8000, 200, 200,
    now() - INTERVAL '1 day', now() + INTERVAL '30 days', 'ACTIVE'
  ),
  (
    'dddddddd-dddd-4ddd-8ddd-dddddddd0002',
    '33333333-3333-4333-8333-333333333333',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '수원화성문화제 제휴 카페 할인',
    10.00, 10.00, 4000, 150, 150,
    now() - INTERVAL '1 day', now() + INTERVAL '30 days', 'ACTIVE'
  ),
  (
    'dddddddd-dddd-4ddd-8ddd-dddddddd0003',
    '44444444-4444-4444-8444-444444444444',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '수원화성문화제 제휴 분식 할인',
    7.00, 7.00, 3000, 120, 120,
    now() - INTERVAL '1 day', now() + INTERVAL '30 days', 'ACTIVE'
  ),
  (
    'dddddddd-dddd-4ddd-8ddd-dddddddd0004',
    '55555555-5555-4555-8555-555555555555',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '민속촌 축제 제휴 전집 할인',
    8.00, 8.00, 6000, 100, 100,
    now() - INTERVAL '1 day', now() + INTERVAL '20 days', 'ACTIVE'
  ),
  (
    'dddddddd-dddd-4ddd-8ddd-dddddddd0005',
    '66666666-6666-4666-8666-666666666666',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '민속촌 축제 제휴 공예 할인',
    5.00, 5.00, 10000, 80, 80,
    now() - INTERVAL '1 day', now() + INTERVAL '20 days', 'ACTIVE'
  ),
  (
    'dddddddd-dddd-4ddd-8ddd-dddddddd0006',
    '77777777-7777-4777-8777-777777777777',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    '자라섬 재즈페스티벌 브런치 할인',
    6.00, 6.00, 5000, 90, 90,
    now() - INTERVAL '1 day', now() + INTERVAL '14 days', 'ACTIVE'
  )
ON CONFLICT (id) DO NOTHING;

UPDATE municipalities SET metro_region = 'GYEONGGI', initial_budget = COALESCE(initial_budget, budget_balance);

UPDATE festivals SET
  category = '문화/예술',
  is_trending = TRUE,
  image_url = 'https://images.unsplash.com/photo-1549692520-acc6669e2f0c?w=800&q=80'
WHERE id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

UPDATE festivals SET
  category = '가족',
  is_trending = TRUE,
  image_url = 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80'
WHERE id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

UPDATE festivals SET
  category = '계절축제',
  is_trending = TRUE,
  image_url = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80'
WHERE id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

INSERT INTO festivals (
  id, municipality_id, title, description, start_date, end_date,
  location_name, latitude, longitude, category, is_trending, image_url
)
SELECT
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  m.id,
  '수원 영동시장 먹거리 축제',
  '영동시장 골목 상권과 함께하는 먹거리 축제.',
  CURRENT_DATE - INTERVAL '2 days',
  CURRENT_DATE + INTERVAL '18 days',
  '수원 영동시장',
  37.2762,
  127.0168,
  '먹거리',
  TRUE,
  'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80'
FROM municipalities m
WHERE m.region_code = 'GG_SUWON'
ON CONFLICT (id) DO NOTHING;

INSERT INTO festivals (
  id, municipality_id, title, description, start_date, end_date,
  location_name, latitude, longitude, category, is_trending, image_url
)
SELECT
  'ffffffff-ffff-4fff-8fff-ffffffffffff',
  m.id,
  '용인 플리마켓 위크',
  '핸드메이드 상점과 로컬 셀러가 모이는 플리마켓.',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '10 days',
  '용인 기흥구청 광장',
  37.2755,
  127.1148,
  '플리마켓',
  FALSE,
  'https://images.unsplash.com/photo-1515165562839-978bbcf01262?w=800&q=80'
FROM municipalities m
WHERE m.region_code = 'GG_YONGIN'
ON CONFLICT (id) DO NOTHING;

UPDATE discount_promotions
SET funding_type = 'MATCHED', matching_status = 'APPROVED'
WHERE gov_matching_rate > 0;
