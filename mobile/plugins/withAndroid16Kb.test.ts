import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const plugin = require('./withAndroid16Kb.js') as {
  MARKER: string;
  PROJECT_MARKER: string;
  CMAKE_MARKER: string;
  applyAlign16kbAppBuildGradle: (text: string) => string;
  apply16kbGradlePropertiesText: (text: string) => string;
  apply16kbProjectBuildGradle: (text: string) => string;
  applyCmake16kb: (text: string) => string;
};

test('app build.gradle gets compressed JNI packaging and a 16KB align hook', () => {
  const first = plugin.applyAlign16kbAppBuildGradle(
    'android {\n    packagingOptions {\n        jniLibs {\n            useLegacyPackaging (findProperty(\'expo.useLegacyPackaging\')?.toBoolean() ?: false)\n        }\n    }\n}\n',
  );
  assert.match(first, /useLegacyPackaging true/);
  assert.match(first, /align-elf-16kb\.py/);
  assert.match(first, new RegExp(plugin.MARKER));
  assert.equal(plugin.applyAlign16kbAppBuildGradle(first), first);
});

test('gradle.properties enables official AGP 8.5-or-lower 16KB packaging fallback', () => {
  const next = plugin.apply16kbGradlePropertiesText('expo.useLegacyPackaging=false\n');
  assert.match(next, /expo\.useLegacyPackaging=true/);
  assert.doesNotMatch(next, /android\.bundle\.enableUncompressedNativeLibs/);
});

test('root build.gradle injects 16KB CMake/ndk-build linker flags', () => {
  const first = plugin.apply16kbProjectBuildGradle('apply plugin: "com.facebook.react.rootproject"\n');
  assert.match(first, new RegExp(plugin.PROJECT_MARKER));
  assert.match(first, /max-page-size=16384/);
  assert.match(first, /ANDROID_SUPPORT_FLEXIBLE_PAGE_SIZES=ON/);
  assert.equal(plugin.apply16kbProjectBuildGradle(first), first);
});

test('CMakeLists.txt gets add_link_options for 16KB ELF alignment', () => {
  const first = plugin.applyCmake16kb('cmake_minimum_required(VERSION 3.9.0)\n\nproject(rnscreens)\n');
  assert.match(first, new RegExp(plugin.CMAKE_MARKER));
  assert.match(first, /add_link_options\("-Wl,-z,max-page-size=16384"/);
  assert.equal(plugin.applyCmake16kb(first), first);
});

test('align-elf-16kb.py rewrites arm64 hermes LOAD and RELRO to 16KB', () => {
  const downloads = join(dir, '../public/downloads');
  const aab = existsSync(downloads)
    ? readdirSync(downloads).filter((name) => name.endsWith('.aab')).sort().at(-1)
    : undefined;
  if (!aab) return;
  const tmp = mkdtempSync(join(tmpdir(), 'elf16-'));
  const unzip = spawnSync(
    'unzip',
    ['-qo', join(downloads, aab), 'base/lib/arm64-v8a/libhermes.so', '-d', tmp],
    { encoding: 'utf8' },
  );
  assert.equal(unzip.status, 0, unzip.stderr);
  const so = join(tmp, 'base/lib/arm64-v8a/libhermes.so');
  const align = spawnSync('python3', [join(dir, '../scripts/align-elf-16kb.py'), so], { encoding: 'utf8' });
  assert.equal(align.status, 0, `${align.stderr}\n${align.stdout}`);
  const check = spawnSync('python3', ['-c', `
import struct, sys
PAGE=16384
PT_LOAD=1
PT_GNU_RELRO=0x6474e552
data=open(sys.argv[1],'rb').read()
e_phoff=struct.unpack_from('<Q', data, 32)[0]
e_phentsize,e_phnum=struct.unpack_from('<HH', data, 54)
bad=0
for i in range(e_phnum):
    off=e_phoff+i*e_phentsize
    p_type=struct.unpack_from('<I', data, off)[0]
    p_offset=struct.unpack_from('<Q', data, off+8)[0]
    p_vaddr=struct.unpack_from('<Q', data, off+16)[0]
    p_memsz=struct.unpack_from('<Q', data, off+40)[0]
    p_align=struct.unpack_from('<Q', data, off+48)[0]
    if p_type==PT_LOAD and (p_align<PAGE or (p_offset%PAGE)!=(p_vaddr%PAGE)):
        bad+=1
    if p_type==PT_GNU_RELRO and (p_vaddr+p_memsz)%PAGE:
        bad+=1
raise SystemExit(bad)
`, so], { encoding: 'utf8' });
  assert.equal(check.status, 0, `${check.stderr}\n${check.stdout}`);
});
