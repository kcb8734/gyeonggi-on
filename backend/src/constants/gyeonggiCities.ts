/** 경기도 31개 시·군 */
export const GYEONGGI_CITIES = [
  '수원시', '용인시', '고양시', '화성시', '성남시', '부천시', '남양주시', '안산시',
  '안양시', '평택시', '시흥시', '파주시', '김포시', '의정부시', '광주시', '하남시',
  '광명시', '군포시', '오산시', '이천시', '양주시', '구리시', '안성시', '포천시',
  '의왕시', '여주시', '양평군', '동두천시', '과천시', '가평군', '연천군',
] as const;

export function municipalityFromAddress(address: string): string {
  const hay = String(address || '');
  const found = GYEONGGI_CITIES.find((name) => hay.includes(name));
  return found ?? '경기도';
}

export function municipalityRegionCode(name: string): string {
  return `GG_${name.replace(/\s+/g, '')}`;
}
