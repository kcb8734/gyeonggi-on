ALTER TABLE festivals ADD COLUMN IF NOT EXISTS metro_region VARCHAR(40);
CREATE INDEX IF NOT EXISTS festivals_metro_region_idx ON festivals (metro_region);
