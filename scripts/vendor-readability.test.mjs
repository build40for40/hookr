import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FILES, FROM, TO } from './vendor-readability.mjs';
import { RUNTIME_FILES } from './package-extension.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const pinned = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).devDependencies['@mozilla/readability'];

test('the vendored Readability matches the pinned package, licence included', () => {
  assert.match(pinned, /^\d+\.\d+\.\d+$/, 'pin @mozilla/readability to an exact version');
  assert.equal(JSON.parse(readFileSync(join(root, FROM, 'package.json'), 'utf8')).version, pinned);
  for (const file of FILES) {
    assert.equal(readFileSync(join(root, TO, file), 'utf8'), readFileSync(join(root, FROM, file), 'utf8'), `${TO}/${file} differs: run node scripts/vendor-readability.mjs`);
  }
});

test('every vendored file ships in the store ZIP', () => {
  for (const file of FILES) assert.ok(RUNTIME_FILES.includes(`vendor/readability/${file}`), file);
});
