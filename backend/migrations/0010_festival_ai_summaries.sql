-- Gemini 축제 상세 요약. 팝업·상세 중복 호출은 이 테이블을 읽고 Gemini를 다시 치지 않는다.
CREATE TABLE IF NOT EXISTS festival_ai_summaries (
  cache_key VARCHAR(512) PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  title_norm VARCHAR(200) NOT NULL,
  place VARCHAR(200),
  start_date VARCHAR(20) NOT NULL DEFAULT '',
  end_date VARCHAR(20) NOT NULL DEFAULT '',
  metro VARCHAR(40) NOT NULL DEFAULT '',
  overview TEXT NOT NULL,
  highlights JSONB NOT NULL DEFAULT '[]'::jsonb,
  tips TEXT NOT NULL DEFAULT '',
  model VARCHAR(80),
  source VARCHAR(20) NOT NULL DEFAULT 'gemini',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS festival_ai_summaries_title_metro_idx
  ON festival_ai_summaries (title_norm, metro);
