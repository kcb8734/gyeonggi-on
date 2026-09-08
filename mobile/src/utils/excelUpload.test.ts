import test from 'node:test';
import assert from 'node:assert/strict';
import { fileToBase64, isWebFilePickerAvailable } from './excelUpload';

test('web file picker is off in node tests', () => {
  assert.equal(isWebFilePickerAvailable(), false);
});

test('analyze and crawl helpers are exported as functions', async () => {
  const { analyzeExcelFile, crawlExcelMetros } = await import('./excelUpload');
  assert.equal(typeof analyzeExcelFile, 'function');
  assert.equal(typeof crawlExcelMetros, 'function');
});

test('fileToBase64 encodes bytes', () => {
  const encoded = fileToBase64(new Uint8Array([80, 75, 3, 4]));
  assert.equal(encoded, Buffer.from([80, 75, 3, 4]).toString('base64'));
});
