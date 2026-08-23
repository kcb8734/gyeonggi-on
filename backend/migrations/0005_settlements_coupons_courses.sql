-- 정산 요청 · QR 쿠폰 · AI 코스 · 관리자 엔진 설정
ALTER TABLE municipalities ADD COLUMN IF NOT EXISTS contact_email VARCHAR(200);
ALTER TABLE municipalities ADD COLUMN IF NOT EXISTS settlement_email VARCHAR(200);
ALTER TABLE municipalities ADD COLUMN IF NOT EXISTS mayor_name VARCHAR(80);
ALTER TABLE municipalities ADD COLUMN IF NOT EXISTS department VARCHAR(80);

UPDATE municipalities SET settlement_email = 'municipality@yongin.go.kr'
WHERE name = '용인시' AND settlement_email IS NULL;

CREATE TABLE IF NOT EXISTS settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID REFERENCES merchants(id) ON DELETE SET NULL,
    municipality_id UUID REFERENCES municipalities(id) ON DELETE SET NULL,
    total_count INT NOT NULL DEFAULT 0,
    total_amount INT NOT NULL DEFAULT 0,
    doc_number VARCHAR(40) UNIQUE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    pdf_url TEXT,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_coupons ADD COLUMN IF NOT EXISTS settlement_id UUID REFERENCES settlements(id) ON DELETE SET NULL;
ALTER TABLE user_coupons ADD COLUMN IF NOT EXISTS title VARCHAR(150);
ALTER TABLE user_coupons ADD COLUMN IF NOT EXISTS discount_amount INT DEFAULT 0;
ALTER TABLE user_coupons ADD COLUMN IF NOT EXISTS municipality_id UUID REFERENCES municipalities(id) ON DELETE SET NULL;
ALTER TABLE user_coupons ADD COLUMN IF NOT EXISTS merchant_id UUID REFERENCES merchants(id) ON DELETE SET NULL;
ALTER TABLE user_coupons ADD COLUMN IF NOT EXISTS is_used BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE user_coupons ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(64) UNIQUE NOT NULL,
    title VARCHAR(150) NOT NULL,
    discount_amount INT NOT NULL DEFAULT 0,
    municipality_id UUID REFERENCES municipalities(id) ON DELETE SET NULL,
    merchant_id UUID REFERENCES merchants(id) ON DELETE SET NULL,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    settlement_id UUID REFERENCES settlements(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_unused ON coupons(is_used, settlement_id);
CREATE INDEX IF NOT EXISTS idx_user_coupons_settlement ON user_coupons(settlement_id);
CREATE INDEX IF NOT EXISTS idx_settlements_merchant ON settlements(merchant_id);

CREATE TABLE IF NOT EXISTS ai_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    festival_id TEXT,
    festival_title VARCHAR(200),
    course_json JSONB NOT NULL,
    is_editors_pick BOOLEAN NOT NULL DEFAULT FALSE,
    recommend_count INT NOT NULL DEFAULT 0,
    save_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tour_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ran_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    target_api VARCHAR(80) NOT NULL,
    fetched INT NOT NULL DEFAULT 0,
    failed INT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'OK',
    message TEXT
);

CREATE TABLE IF NOT EXISTS admin_engine_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    festival_weight INT NOT NULL DEFAULT 40,
    camping_distance_weight INT NOT NULL DEFAULT 25,
    market_ratio_weight INT NOT NULL DEFAULT 20,
    history_weight INT NOT NULL DEFAULT 15,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO admin_engine_settings (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;
