import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'ModalExitButton.tsx'), 'utf8');

test('right-side modal exit shows only > and left-side stack exit shows only <', () => {
  const modal = source.slice(source.indexOf('export default function ModalExitButton'), source.indexOf('export function StackExitButton'));
  const stack = source.slice(source.indexOf('export function StackExitButton'));
  assert.match(modal, /mark=">"/);
  assert.doesNotMatch(modal, /mark="<"/);
  assert.match(stack, /mark="<"/);
  assert.doesNotMatch(stack, /mark=">"/);
});
