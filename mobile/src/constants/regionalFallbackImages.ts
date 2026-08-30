import type { ImageSourcePropType } from 'react-native';
import { regionalFallbackUri, resolveFallbackKey } from './regionalFallbackKeys';

function loadFallbacks(): Record<string, ImageSourcePropType> {
  try {
    return {
      서구: require('../../assets/images/fallback/default_seogu.png'),
      동구: require('../../assets/images/fallback/default_donggu.png'),
      북구: require('../../assets/images/fallback/default_bukgu.png'),
      남구: require('../../assets/images/fallback/default_namgu.png'),
      광산구: require('../../assets/images/fallback/default_gwangsangu.png'),
      중구: require('../../assets/images/fallback/default_junggu.png'),
      종로구: require('../../assets/images/fallback/default_jongno.png'),
      SEOUL: require('../../assets/images/fallback/default_seoul.png'),
      BUSAN: require('../../assets/images/fallback/default_busan.png'),
      DAEGU: require('../../assets/images/fallback/default_daegu.png'),
      INCHEON: require('../../assets/images/fallback/default_incheon.png'),
      GWANGJU: require('../../assets/images/fallback/default_gwangju.png'),
      DAEJEON: require('../../assets/images/fallback/default_daejeon.png'),
      ULSAN: require('../../assets/images/fallback/default_ulsan.png'),
      SEJONG: require('../../assets/images/fallback/default_sejong.png'),
      GYEONGGI: require('../../assets/images/fallback/default_gyeonggi.png'),
      GANGWON: require('../../assets/images/fallback/default_gangwon.png'),
      CHUNGBUK: require('../../assets/images/fallback/default_chungbuk.png'),
      CHUNGNAM: require('../../assets/images/fallback/default_chungnam.png'),
      JEONBUK: require('../../assets/images/fallback/default_jeonbuk.png'),
      JEONNAM: require('../../assets/images/fallback/default_jeonnam.png'),
      GYEONGBUK: require('../../assets/images/fallback/default_gyeongbuk.png'),
      GYEONGNAM: require('../../assets/images/fallback/default_gyeongnam.png'),
      JEJU: require('../../assets/images/fallback/default_jeju.png'),
      default: require('../../assets/images/fallback/default_common.png'),
    };
  } catch {
    return {};
  }
}

/** 권역·자치구별 기본 대표 컷. 원본 이미지가 없거나 로드 실패 시 사용한다. */
export const regionalFallbackImages = loadFallbacks();

export function regionalFallbackSource(
  location?: string | null,
  metro?: string | null,
  title?: string | null,
) {
  const key = resolveFallbackKey(location, metro, title);
  return regionalFallbackImages[key]
    || regionalFallbackImages.default
    || { uri: regionalFallbackUri(location, metro, title) };
}

export { regionalFallbackUri, resolveFallbackKey } from './regionalFallbackKeys';
