import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  assertKdanjiProject,
  ensureKdanjiProject,
  kdanjiProjectFromEnv,
  writeProjectFile,
} from './deploy-prod.mjs';

test('reads kdanji ids from Vercel env vars', () => {
  const project = kdanjiProjectFromEnv({
    VERCEL_ORG_ID: 'team_abc',
    VERCEL_PROJECT_ID: 'prj_123',
  });
  assert.deepEqual(project, {
    orgId: 'team_abc',
    projectId: 'prj_123',
    projectName: 'kdanji',
  });
  assert.equal(kdanjiProjectFromEnv({}), null);
});

test('rejects a linked non-kdanji project', () => {
  assert.throws(
    () => assertKdanjiProject({ projectName: 'backend', projectId: 'prj_x' }),
    /kdanji/,
  );
  assert.ok(assertKdanjiProject({ projectName: 'kdanji', projectId: 'prj_x' }));
  assert.ok(assertKdanjiProject({ orgId: 'team', projectId: 'prj_x' }));
});

test('ensureKdanjiProject writes project.json from env when missing', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'kdanji-deploy-'));
  const file = join(dir, '.vercel', 'project.json');
  try {
    const project = await ensureKdanjiProject({
      root: dir,
      projectFile: file,
      env: { VERCEL_ORG_ID: 'team_env', VERCEL_PROJECT_ID: 'prj_env' },
      link: async () => {
        throw new Error('link should not run when env is set');
      },
    });
    assert.equal(project.projectName, 'kdanji');
    const saved = JSON.parse(readFileSync(file, 'utf8'));
    assert.equal(saved.orgId, 'team_env');
    assert.equal(saved.projectId, 'prj_env');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('ensureKdanjiProject links when neither file nor env exists', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'kdanji-deploy-'));
  const file = join(dir, '.vercel', 'project.json');
  try {
    await ensureKdanjiProject({
      root: dir,
      projectFile: file,
      env: {},
      link: async () => {
        mkdirSync(join(dir, '.vercel'), { recursive: true });
        writeFileSync(file, JSON.stringify({ orgId: 'team_link', projectId: 'prj_link', projectName: 'kdanji' }));
      },
    });
    const saved = JSON.parse(readFileSync(file, 'utf8'));
    assert.equal(saved.projectId, 'prj_link');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('ensureKdanjiProject explains how to login when link fails', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'kdanji-deploy-'));
  const file = join(dir, '.vercel', 'project.json');
  try {
    await assert.rejects(
      () => ensureKdanjiProject({
        root: dir,
        projectFile: file,
        env: {},
        link: async () => {
          throw new Error('not logged in');
        },
      }),
      /npx vercel login/,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('writeProjectFile creates the .vercel directory', () => {
  const dir = mkdtempSync(join(tmpdir(), 'kdanji-deploy-'));
  try {
    const file = join(dir, '.vercel', 'project.json');
    writeProjectFile(file, { orgId: 'team', projectId: 'prj', projectName: 'kdanji' });
    assert.match(readFileSync(file, 'utf8'), /"projectName": "kdanji"/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
