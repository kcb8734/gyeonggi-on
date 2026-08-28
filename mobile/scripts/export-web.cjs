#!/usr/bin/env node
/**
 * Expo SDK 51은 `expo export --platform web`으로 정적 파일(dist/)을 만든다.
 * Vercel 빌드 캐시가 예전 번들을 재사용하지 않도록 Metro 캐시를 지우고
 * 배포마다 다른 BUILD_ID를 심어 해시가 바뀌게 한다.
 */
const { spawnSync, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sha = (
  process.env.VERCEL_GIT_COMMIT_SHA
  || process.env.GITHUB_SHA
  || execSync('git rev-parse HEAD', { cwd: root, encoding: 'utf8' }).trim()
).slice(0, 7);
const stamp = new Date().toISOString();
const label = stamp.slice(0, 16).replace('T', ' ');

fs.writeFileSync(
  path.join(root, 'src/buildInfo.ts'),
  `/** 배포 시각 ${stamp} */\nexport const BUILD_ID = ${JSON.stringify(sha)};\nexport const BUILD_LABEL = ${JSON.stringify(label)};\n`,
);

for (const dir of ['dist', '.expo', 'node_modules/.cache']) {
  fs.rmSync(path.join(root, dir), { recursive: true, force: true });
}

const env = {
  ...process.env,
  NODE_ENV: 'production',
  BABEL_ENV: 'production',
  EXPO_NO_TELEMETRY: '1',
};

const result = spawnSync(
  'npx',
  ['expo', 'export', '--platform', 'web', '--output-dir', 'dist', '--clear'],
  { stdio: 'inherit', env, cwd: root },
);

const indexPath = path.join(root, 'dist/index.html');
if (fs.existsSync(indexPath)) {
  const html = fs.readFileSync(indexPath, 'utf8')
    .replace(
      '<head>',
      `<head>\n    <meta name="onandon-build" content="${sha} ${label}" />\n    <link rel="canonical" href="https://www.kdanji.com/" />\n    <script>if(location.hostname==='kdanji.com')location.replace('https://www.kdanji.com'+location.pathname+location.search+location.hash);</script>`,
    )
    .replace('</body>', `<!-- onandon-build ${sha} ${stamp} -->\n  </body>`);
  fs.writeFileSync(indexPath, html);
}

const privacySrc = path.join(root, 'public/privacy/index.html');
const privacyDestDir = path.join(root, 'dist/privacy');
if (fs.existsSync(privacySrc)) {
  fs.mkdirSync(privacyDestDir, { recursive: true });
  fs.copyFileSync(privacySrc, path.join(privacyDestDir, 'index.html'));
}

process.exit(result.status ?? 1);
