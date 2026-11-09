// Copies Mozilla Readability from node_modules into extension/vendor/readability/,
// since the extension has no build step. Run it after bumping @mozilla/readability:
//
//   node scripts/vendor-readability.mjs
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const FILES = ['Readability.js', 'Readability-readerable.js', 'LICENSE.md'];
export const FROM = 'node_modules/@mozilla/readability';
export const TO = 'extension/vendor/readability';

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  mkdirSync(join(root, TO), { recursive: true });
  for (const file of FILES) copyFileSync(join(root, FROM, file), join(root, TO, file));
  console.log(`Copied ${FILES.join(', ')} into ${TO}`);
}
