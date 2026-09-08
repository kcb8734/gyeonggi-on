import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  extractHomepageUrl,
  gyeonggiEventCopy,
  isGenericFestivalOverview,
  resolveEventLink,
  resolveGyeonggiEventGuide,
} from './gyeonggiEventGuides';

test('세미원 연꽃문화제는 소개와 공식 링크를 준다', () => {
  const guide = resolveGyeonggiEventGuide('양평 세미원 연꽃문화제');
  assert.ok(guide);
  assert.match(guide.overview, /세미원/);
  assert.equal(guide.homepage, 'https://www.semiwon.or.kr');
});

test('경기온 미매칭 축제도 소개와 관광공사 검색 링크를 준다', () => {
  const copy = gyeonggiEventCopy('양주 회암사지 축제', undefined, 'GYEONGGI');
  assert.ok(copy);
  assert.match(copy.overview, /경기도/);
  assert.match(copy.homepage, /visitkorea/);
});

test('다른 권역은 경기 가이드를 강제하지 않는다', () => {
  assert.equal(gyeonggiEventCopy('제주들불축제', undefined, 'JEJU'), null);
});

test('TourAPI 껍데기 개요는 빈 소개로 본다', () => {
  assert.equal(isGenericFestivalOverview('현장 프로그램과 인근 전통시장·캠핑을 On&On+ 추천코스로 이을 수 있습니다.'), true);
  assert.equal(isGenericFestivalOverview('세미원에서 연꽃이 만개합니다.'), false);
});

test('홈페이지 HTML에서 URL을 뽑는다', () => {
  assert.equal(
    extractHomepageUrl('<a href="https://www.semiwon.or.kr">홈</a>'),
    'https://www.semiwon.or.kr',
  );
});

test('한국관광공사 자료가 없으면 행사 홈페이지·링크주소를 쓴다', () => {
  const goyang = resolveEventLink({
    title: '고양미술축제 2026 어반 시놉시스',
    metro: 'GYEONGGI',
    source: 'culture',
    homepage: 'https://www.artgy.or.kr/PF/PF0201V.aspx?showid=0000008282',
    description: '상세 https://ggc.ggcf.kr/cultureEvents/view/6a7273e66e80097c99a4b2c2',
  });
  assert.ok(goyang);
  assert.match(goyang.url, /artgy\.or\.kr|ggc\.ggcf\.kr/);
  assert.match(goyang.label, /행사 홈페이지|링크주소/);
  assert.doesNotMatch(goyang.label, /한국관광공사/);
});

test('TourAPI 행사는 공식 링크가 없으면 관광공사 버튼을 준다', () => {
  const jeju = resolveEventLink({
    title: '제주들불축제',
    contentId: '2512345',
    metro: 'JEJU',
    source: 'tour',
  });
  assert.ok(jeju);
  assert.match(jeju.url, /visitkorea/);
  assert.equal(jeju.label, '한국관광공사에서 행사 정보 보기');
});

test('세미원처럼 지정된 공식 홈페이지는 관광공사보다 우선한다', () => {
  const named = resolveEventLink({
    title: '양평 세미원 연꽃문화제',
    metro: 'GYEONGGI',
    source: 'tour',
    homepage: 'https://korean.visitkorea.or.kr/search/search_list.do?keyword=세미원',
  });
  assert.ok(named);
  assert.equal(named.url, 'https://www.semiwon.or.kr');
  assert.match(named.label, /세미원/);
});
