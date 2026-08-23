ALTER TABLE discount_promotions ADD COLUMN IF NOT EXISTS coupon_type VARCHAR(20) DEFAULT 'OFFICIAL';
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS coupon_type VARCHAR(20) DEFAULT 'OFFICIAL';
ALTER TABLE municipalities ADD COLUMN IF NOT EXISTS metro_region VARCHAR(40);

CREATE TABLE IF NOT EXISTS attractions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    area_code VARCHAR(8) NOT NULL,
    metro_region VARCHAR(40),
    content_id VARCHAR(40) UNIQUE,
    title VARCHAR(200) NOT NULL,
    category VARCHAR(80),
    address TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    image_url TEXT,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attractions_area ON attractions(area_code);
CREATE INDEX IF NOT EXISTS idx_promotions_coupon_type ON discount_promotions(coupon_type);
CREATE INDEX IF NOT EXISTS idx_municipalities_metro ON municipalities(metro_region);
