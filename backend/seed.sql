-- 개발용 시드 데이터 (경기온)
INSERT INTO municipalities (name, region_code, budget_balance) VALUES
  ('수원시', 'GG_SUWON', 50000000.00),
  ('용인시', 'GG_YONGIN', 30000000.00),
  ('가평군', 'GG_GAPYEONG', 10000000.00)
ON CONFLICT (region_code) DO NOTHING;
