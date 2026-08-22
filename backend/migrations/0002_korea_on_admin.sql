-- Korea-On 전국 확장 + 관리자 승인 + 상가 자체 할인

ALTER TABLE municipalities
  ADD COLUMN IF NOT EXISTS metro_region VARCHAR(20) NOT NULL DEFAULT 'GYEONGGI',
  ADD COLUMN IF NOT EXISTS initial_budget DECIMAL(15, 2);

UPDATE municipalities
SET initial_budget = budget_balance
WHERE initial_budget IS NULL;

ALTER TABLE festivals
  ADD COLUMN IF NOT EXISTS category VARCHAR(30) NOT NULL DEFAULT '문화/예술',
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS is_trending BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS nts_verified_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS nts_b_stt_cd VARCHAR(10);

ALTER TABLE discount_promotions
  ADD COLUMN IF NOT EXISTS funding_type VARCHAR(20) NOT NULL DEFAULT 'MATCHED',
  ADD COLUMN IF NOT EXISTS matching_status VARCHAR(20) NOT NULL DEFAULT 'NONE';

-- MATCHED + PENDING 인 기존 행이 없다면 시드 ACTIVE 매칭 건은 승인된 것으로 본다
UPDATE discount_promotions
SET matching_status = 'APPROVED', funding_type = 'MATCHED'
WHERE gov_matching_rate > 0 AND matching_status = 'NONE';

CREATE INDEX IF NOT EXISTS idx_festivals_category ON festivals(category);
CREATE INDEX IF NOT EXISTS idx_promotions_matching ON discount_promotions(matching_status);
CREATE INDEX IF NOT EXISTS idx_merchants_verified ON merchants(is_verified);
