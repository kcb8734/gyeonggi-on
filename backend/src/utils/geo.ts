/**
 * PostgreSQL용 Haversine 거리(km) 식.
 * PostGIS 없이 festivals/merchants 위경도로 주변 검색을 하기 위해 사용한다.
 */
export function haversineKmSql(
  latParam: number,
  lngParam: number,
  latCol = 'latitude',
  lngCol = 'longitude',
): string {
  return `6371 * 2 * ASIN(SQRT(
    POWER(SIN(RADIANS(${latCol} - $${latParam}) / 2), 2) +
    COS(RADIANS($${latParam})) * COS(RADIANS(${latCol})) *
    POWER(SIN(RADIANS(${lngCol} - $${lngParam}) / 2), 2)
  ))`;
}

export function parseOptionalFloat(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function toNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
