const app = require('./app.json');

const apiUrl = (
  process.env.EXPO_PUBLIC_API_URL
  || process.env.EXPO_PUBLIC_API_BASE_URL
  || 'https://api.gyeonggi-on.kr'
).replace(/\/$/, '');

module.exports = {
  expo: {
    ...app.expo,
    scheme: app.expo.scheme || 'onandon',
    extra: {
      ...(app.expo.extra ?? {}),
      apiUrl,
      webOrigin: (process.env.EXPO_PUBLIC_WEB_ORIGIN || 'https://kdanji.com').replace(/\/$/, ''),
    },
  },
};
