import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const script = join(dirname(fileURLToPath(import.meta.url)), 'play-keystore.cjs');

test('encode writes one-line base64 and restore round-trips the file', () => {
  const dir = mkdtempSync(join(tmpdir(), 'play-ks-'));
  const jks = join(dir, 'upload-keystore.jks');
  const bytes = Buffer.from('onandon-play-keystore-fixture');
  writeFileSync(jks, bytes);
  const encoded = spawnSync(process.execPath, [script, 'encode'], {
    encoding: 'utf8',
    env: { ...process.env, ANDROID_KEYSTORE_FILE: jks },
  });
  assert.equal(encoded.status, 0, encoded.stderr);
  const b64 = encoded.stdout.trim();
  assert.equal(b64, bytes.toString('base64'));
  assert.doesNotMatch(b64, /\s/);

  const restored = join(dir, 'restored.jks');
  const result = spawnSync(process.execPath, [script, 'restore'], {
    encoding: 'utf8',
    env: {
      ...process.env,
      ANDROID_KEYSTORE_BASE64: b64,
      ANDROID_KEYSTORE_FILE: restored,
    },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(existsSync(restored), true);
  assert.deepEqual(readFileSync(restored), bytes);
});

test('encode without a keystore exits nonzero', () => {
  const result = spawnSync(process.execPath, [script, 'encode'], {
    encoding: 'utf8',
    env: { ...process.env, ANDROID_KEYSTORE_FILE: join(tmpdir(), 'missing-upload-keystore.jks') },
  });
  assert.notEqual(result.status, 0);
});
