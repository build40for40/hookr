import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPackage, checkManifest, LIVE_API, RUNTIME_FILES } from './package-extension.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (zip, file) => execFileSync('unzip', ['-p', zip, file], { encoding: 'utf8' });

function sandbox() {
  const dir = mkdtempSync(join(tmpdir(), 'hookr-pkg-test-'));
  cpSync(join(root, 'extension'), join(dir, 'extension'), { recursive: true });
  return dir;
}

test('the manifest passes the store checks', () => {
  assert.deepEqual(checkManifest(JSON.parse(readFileSync(join(root, 'extension/manifest.json'), 'utf8'))), []);
});

test('the store ZIP holds exactly the allowlist, points at the live API and drops localhost', () => {
  const dir = sandbox();
  try {
    const { zip } = buildPackage({ root: dir });
    assert.deepEqual(execFileSync('unzip', ['-Z1', zip], { encoding: 'utf8' }).trim().split('\n').sort(), [...RUNTIME_FILES].sort());
    assert.deepEqual(JSON.parse(read(zip, 'manifest.json')).host_permissions, [`${LIVE_API}/*`]);
    assert.match(read(zip, 'api.js'), new RegExp(`DEFAULT_API = '${LIVE_API}'`));
    assert.doesNotMatch(read(zip, 'api.js'), /localhost/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('an unlisted file in extension/ stops the build', () => {
  const dir = sandbox();
  try {
    writeFileSync(join(dir, 'extension', 'notes.txt'), 'not for the store');
    assert.throws(() => buildPackage({ root: dir }), /allowlist.*notes\.txt/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('colocated test files stay out of the store ZIP', () => {
  const dir = sandbox();
  try {
    const { zip } = buildPackage({ root: dir });
    assert.doesNotMatch(execFileSync('unzip', ['-Z1', zip], { encoding: 'utf8' }), /\.test\.js/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
