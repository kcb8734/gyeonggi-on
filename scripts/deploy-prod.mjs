#!/usr/bin/env node
/**
 * www.kdanji.com 프로덕션 배포는 반드시 저장소 최상위에서 실행한다.
 * backend/ 의 .vercel 은 다른 프로젝트(backend)라 kdanji.com 이 갱신되지 않는다.
 */
import { existsSync, readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const startedIn = resolve(process.cwd());
const projectFile = join(root, '.vercel', 'project.json');
const backendDir = join(root, 'backend');

if (startedIn === backendDir || startedIn.startsWith(backendDir + '/') || /[/\\]backend[/\\]?$/.test(startedIn)) {
  console.log('현재 경로가 backend/ 입니다. 저장소 최상위로 이동합니다:', root);
}

if (!existsSync(projectFile)) {
  console.error('프로젝트 최상위에 .vercel/project.json 이 없습니다. 저장소 루트에서 연결하세요.');
  process.exit(1);
}

let project;
try {
  project = JSON.parse(readFileSync(projectFile, 'utf8'));
} catch (err) {
  console.error('루트 .vercel/project.json 을 읽지 못했습니다.', err instanceof Error ? err.message : err);
  process.exit(1);
}

if (project.projectName !== 'kdanji') {
  console.error('루트 Vercel 프로젝트가 kdanji 가 아닙니다:', project.projectName);
  process.exit(1);
}

process.chdir(root);

if (resolve(process.cwd()) !== root) {
  console.error('최상위 디렉토리로 이동하지 못했습니다. cwd=', process.cwd(), 'root=', root);
  process.exit(1);
}

console.log('배포 디렉토리:', process.cwd());
console.log('Vercel 프로젝트:', project.projectName, '(' + project.projectId + ')');
console.log('명령: npx vercel --prod --yes --cwd ' + root);
console.log('');

const child = spawn('npx', ['vercel', '--prod', '--yes', '--cwd', root], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
  shell: false,
});

child.on('exit', (code, signal) => {
  if (signal) process.exit(1);
  process.exit(code ?? 1);
});
