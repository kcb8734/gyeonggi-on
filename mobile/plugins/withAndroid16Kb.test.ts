import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const plugin = require('./withAndroid16Kb.js') as {
  MARKER: string;
  applyAlign16kbAppBuildGradle: (text: string) => string;
};

test('app build.gradle gets a 16KB align hook once', () => {
  const first = plugin.applyAlign16kbAppBuildGradle('android {}\n');
  assert.match(first, /align-elf-16kb\.py/);
  assert.match(first, new RegExp(plugin.MARKER));
  assert.equal(plugin.applyAlign16kbAppBuildGradle(first), first);
});

test('align-elf-16kb.py rewrites arm64 hermes LOAD align to 16KB', () => {
  const aab = join(dir, '../public/downloads/onandon_plus_1.0.23_vc23.aab');
  if (!existsSync(aab)) return;
  const tmp = mkdtempSync(join(tmpdir(), 'elf16-'));
  const unzip = spawnSync('unzip', ['-qo', aab, 'base/lib/arm64-v8a/libhermes.so', '-d', tmp], { encoding: 'utf8' });
  assert.equal(unzip.status, 0, unzip.stderr);
  const so = join(tmp, 'base/lib/arm64-v8a/libhermes.so');
  const align = spawnSync('python3', [join(dir, '../scripts/align-elf-16kb.py'), so], { encoding: 'utf8' });
  assert.equal(align.status, 0, `${align.stderr}\n${align.stdout}`);
  const check = spawnSync('python3', ['-c', `
import struct, sys
data=open(sys.argv[1],'rb').read()
e_phoff=struct.unpack_from('<Q', data, 32)[0]
e_phentsize,e_phnum=struct.unpack_from('<HH', data, 54)
bad=0
for i in range(e_phnum):
    off=e_phoff+i*e_phentsize
    if struct.unpack_from('<I', data, off)[0]!=1: continue
    p_offset=struct.unpack_from('<Q', data, off+8)[0]
    p_vaddr=struct.unpack_from('<Q', data, off+16)[0]
    p_align=struct.unpack_from('<Q', data, off+48)[0]
    if p_align<16384 or (p_offset%16384)!=(p_vaddr%16384):
        bad+=1
raise SystemExit(bad)
`, so], { encoding: 'utf8' });
  assert.equal(check.status, 0, check.stderr);
});
