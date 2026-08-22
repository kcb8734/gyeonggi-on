#!/usr/bin/env node
/**
 * Expo SDK 51은 예전 `expo export:web`(webpack) 대신
 * `expo export --platform web`으로 정적 파일(dist/)을 만든다.
 * 개발용 의존성은 번들에 넣지 않는다(production NODE_ENV).
 */
const { spawnSync } = require('child_process');
const path = require('path');

const env = {
  ...process.env,
  NODE_ENV: 'production',
  BABEL_ENV: 'production',
  EXPO_NO_TELEMETRY: '1',
};

const result = spawnSync(
  'npx',
  ['expo', 'export', '--platform', 'web', '--output-dir', 'dist'],
  { stdio: 'inherit', env, cwd: path.resolve(__dirname, '..') },
);

process.exit(result.status ?? 1);
