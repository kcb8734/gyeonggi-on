-- TourAPI contentid 기준 축제 upsert
ALTER TABLE festivals
  ADD COLUMN IF NOT EXISTS tour_content_id VARCHAR(40),
  ADD COLUMN IF NOT EXISTS tel VARCHAR(50),
  ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'db';

CREATE UNIQUE INDEX IF NOT EXISTS festivals_tour_content_id_uidx
  ON festivals (tour_content_id);

CREATE INDEX IF NOT EXISTS festivals_source_end_date_idx
  ON festivals (source, end_date);
