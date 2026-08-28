-- 지역 센터장이 발굴한 4대 추천 코스
CREATE TABLE IF NOT EXISTS center_local_courses (
    id TEXT PRIMARY KEY,
    region_id TEXT NOT NULL,
    metro TEXT,
    center_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    images JSONB NOT NULL DEFAULT '[]'::jsonb,
    history_course JSONB NOT NULL DEFAULT '{}'::jsonb,
    market_food_course JSONB NOT NULL DEFAULT '{}'::jsonb,
    main_axis JSONB NOT NULL DEFAULT '{}'::jsonb,
    camping_accommodation JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_center_local_courses_region ON center_local_courses(region_id);
CREATE INDEX IF NOT EXISTS idx_center_local_courses_metro ON center_local_courses(metro);
CREATE INDEX IF NOT EXISTS idx_center_local_courses_status ON center_local_courses(status);
