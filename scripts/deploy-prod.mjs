#!/usr/bin/env node
/**
 * www.kdanji.com 프로덕션 배포는 반드시 저장소 최상위에서 실행한다.
 * backend/ 의 .vercel 은 다른 프로젝트(backend)라 kdanji.com 이 갱신되지 않는다.
 *
 * .vercel/project.json 이 없으면(클론 직후) 환경변수 또는 `vercel link --project kdanji` 로 연결한다.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const PROJECT_FILE = join(ROOT, '.vercel', 'project.json');
const PROJECT_NAME = 'kdanji';

export function kdanjiProjectFromEnv(env = process.env) {
  const orgId = String(env.VERCEL_ORG_ID || env.VERCEL_TEAM_ID || '').trim();
  const projectId = String(env.VERCEL_PROJECT_ID || '').trim();
  const projectName = String(env.VERCEL_PROJECT_NAME || PROJECT_NAME).trim() || PROJECT_NAME;
  if (!orgId || !projectId) return null;
  return { orgId, projectId, projectName };
}

export function assertKdanjiProject(project) {
  const name = String(project?.projectName || project?.name || '').trim();
  if (name && name !== PROJECT_NAME) {
    throw new Error('루트 Vercel 프로젝트가 kdanji 가 아닙니다: ' + name);
  }
  return project;
}

export function writeProjectFile(file, project) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(project, null, 2) + '\n');
  return file;
}

export function loadProjectFile(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

function run(cmd, args, cwd) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(cmd, args, {
      cwd,
      stdio: 'inherit',
      env: process.env,
      shell: false,
    });
    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (signal) {
        reject(new Error(cmd + ' 가 신호로 종료되었습니다: ' + signal));
        return;
      }
      if (code) {
        reject(new Error(cmd + ' 가 종료 코드 ' + code + ' 로 실패했습니다.'));
        return;
      }
      resolvePromise();
    });
  });
}

export async function ensureKdanjiProject({
  root = ROOT,
  projectFile = PROJECT_FILE,
  env = process.env,
  link = defaultLink,
} = {}) {
  if (!existsSync(projectFile)) {
    const fromEnv = kdanjiProjectFromEnv(env);
    if (fromEnv) {
      assertKdanjiProject(fromEnv);
      writeProjectFile(projectFile, fromEnv);
      console.log('VERCEL_ORG_ID / VERCEL_PROJECT_ID 로 .vercel/project.json 을 만들었습니다.');
    } else {
      console.log('루트 .vercel/project.json 이 없습니다. kdanji 프로젝트에 연결합니다...');
      console.log('명령: npx vercel link --yes --project kdanji');
      try {
        await link(root);
      } catch (err) {
        const extra = err instanceof Error ? err.message : String(err);
        throw new Error(
          [
            'www.kdanji.com 배포는 루트 kdanji 프로젝트 연결이 필요합니다.',
            extra,
            '',
            '다음을 실행한 뒤 다시 배포하세요:',
            '  npx vercel login',
            '  npx vercel link --yes --project kdanji',
            '  npm run deploy:prod',
            '',
            '또는 VERCEL_ORG_ID, VERCEL_PROJECT_ID 환경변수를 설정하세요.',
          ].join('\n'),
        );
      }
    }
  }

  if (!existsSync(projectFile)) {
    throw new Error('vercel link 후에도 .vercel/project.json 이 없습니다.');
  }

  const project = assertKdanjiProject(loadProjectFile(projectFile));
  return project;
}

function defaultLink(root) {
  return run('npx', ['vercel', 'link', '--yes', '--project', PROJECT_NAME], root);
}

export async function main() {
  const startedIn = resolve(process.cwd());
  const startedIsBackend = /[/\\]backend[/\\]?$/.test(startedIn) || startedIn === join(ROOT, 'backend');
  if (startedIsBackend) {
    console.error('');
    console.error('backend/ 에서 vercel 을 실행하면 www.kdanji.com 이 갱신되지 않습니다.');
    console.error('이 스크립트는 저장소 최상위에서 kdanji 프로젝트로 배포합니다.');
    console.error('');
  }

  process.chdir(ROOT);
  const project = await ensureKdanjiProject();

  console.log('배포 디렉토리:', ROOT);
  console.log('Vercel 프로젝트:', project.projectName || PROJECT_NAME, project.projectId ? '(' + project.projectId + ')' : '');
  console.log('명령: npx vercel --prod --yes');
  console.log('');

  await run('npx', ['vercel', '--prod', '--yes'], ROOT);
}

const invokedDirectly = process.argv[1]
  && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;

if (invokedDirectly) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
