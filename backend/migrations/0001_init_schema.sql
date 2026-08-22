-- 경기온(Gyeonggi-On) 초기 스키마 마이그레이션
-- 실행: psql "$DATABASE_URL" -f migrations/0001_init_schema.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. 지자체 테이블 (경기도 31개 시·군)
CREATE TABLE IF NOT EXISTS municipalities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL, -- 예: 수원시, 용인시, 가평군
    region_code VARCHAR(20) UNIQUE NOT NULL, -- 예: GG_SUWON
    budget_balance DECIMAL(15, 2) DEFAULT 0.00, -- 지자체 매칭 지원금 남아있는 예산 잔액
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. 축제 정보 테이블
CREATE TABLE IF NOT EXISTS festivals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    municipality_id UUID REFERENCES municipalities(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL, -- 축제명
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    location_name VARCHAR(150),
    latitude DECIMAL(10, 8), -- 위도
    longitude DECIMAL(11, 8), -- 경도
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. 소상공인 점포 테이블 (사장님 계정)
CREATE TABLE IF NOT EXISTS merchants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID NOT NULL, -- 사용자 계정 ID
    municipality_id UUID REFERENCES municipalities(id),
    business_name VARCHAR(100) NOT NULL, -- 상호명
    business_number VARCHAR(20) UNIQUE NOT NULL, -- 사업자등록번호
    category VARCHAR(50) NOT NULL, -- 음식점, 카페, 공예 등
    address TEXT NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    bank_name VARCHAR(30), -- 지원금 정산용 은행
    bank_account_number VARCHAR(50), -- 정산 계좌번호
    is_verified BOOLEAN DEFAULT FALSE, -- 사업자 인증 여부
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. 상생 할인 쿠폰 프로모션 정책 테이블
CREATE TABLE IF NOT EXISTS discount_promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
    festival_id UUID REFERENCES festivals(id) ON DELETE SET NULL, -- 연계된 축제 (선택)
    title VARCHAR(100) NOT NULL, -- 예: 화성문화제 제휴 10% 할인
    merchant_discount_rate DECIMAL(5, 2) NOT NULL, -- 점주 자체 할인율 (%) 예: 5.00
    gov_matching_rate DECIMAL(5, 2) DEFAULT 0.00, -- 지자체 지원 매칭 할인율 (%) 예: 5.00
    total_discount_rate DECIMAL(5, 2) GENERATED ALWAYS AS (merchant_discount_rate + gov_matching_rate) STORED, -- 총 할인율 (%) 10.00
    max_discount_amount DECIMAL(10, 2), -- 최대 할인 한도액
    total_quantity INT NOT NULL, -- 총 발급 가능 수량
    remaining_quantity INT NOT NULL, -- 남은 수량
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, EXHAUSTED, EXPIRED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. 사용자 발급 쿠폰 테이블
CREATE TABLE IF NOT EXISTS user_coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- 쿠폰 받은 고객 사용자 ID
    promotion_id UUID REFERENCES discount_promotions(id) ON DELETE CASCADE,
    coupon_code VARCHAR(32) UNIQUE NOT NULL, -- QR 스캔용 고유 코드
    status VARCHAR(20) DEFAULT 'ISSUED', -- ISSUED(발급), USED(사용), EXPIRED(만료)
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP WITH TIME ZONE
);

-- 6. 결제 및 지자체 지원금 정산 트랜잭션 테이블
CREATE TABLE IF NOT EXISTS settlement_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_coupon_id UUID REFERENCES user_coupons(id),
    merchant_id UUID REFERENCES merchants(id),
    municipality_id UUID REFERENCES municipalities(id),
    original_amount DECIMAL(12, 2) NOT NULL, -- 원 결제 금액
    merchant_discount_amount DECIMAL(10, 2) NOT NULL, -- 점주 부담 할인액
    gov_support_amount DECIMAL(10, 2) NOT NULL, -- 지자체 정산 지급 대상금액
    final_paid_amount DECIMAL(12, 2) NOT NULL, -- 고객 실제 결제액
    settlement_status VARCHAR(20) DEFAULT 'PENDING', -- PENDING(정산대기), COMPLETED(정산완료)
    settled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 보안/안정성을 위한 추가 제약 (권장)
ALTER TABLE municipalities ADD CONSTRAINT budget_non_negative CHECK (budget_balance >= 0);
ALTER TABLE discount_promotions ADD CONSTRAINT remaining_qty_non_negative CHECK (remaining_quantity >= 0);

-- 조회 성능을 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_festivals_municipality ON festivals(municipality_id);
CREATE INDEX IF NOT EXISTS idx_merchants_municipality ON merchants(municipality_id);
CREATE INDEX IF NOT EXISTS idx_promotions_merchant ON discount_promotions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_promotions_festival ON discount_promotions(festival_id);
CREATE INDEX IF NOT EXISTS idx_user_coupons_promotion ON user_coupons(promotion_id);
CREATE INDEX IF NOT EXISTS idx_user_coupons_user ON user_coupons(user_id);
CREATE INDEX IF NOT EXISTS idx_settlement_municipality ON settlement_transactions(municipality_id);
CREATE INDEX IF NOT EXISTS idx_settlement_merchant ON settlement_transactions(merchant_id);
