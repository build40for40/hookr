import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCodes } from '../worker/access.js';
import { newCode, pairFor } from './access-code.mjs';

test('newCode is long, random and safe to paste into ACCESS_CODES', () => {
  const code = newCode();
  assert.match(code, /^[A-Za-z0-9_-]{24}$/);
  assert.notEqual(code, newCode());
});

test('pairFor makes a pair the Worker reads back, and refuses names that would break the list', () => {
  const { code, pair } = pairFor('kate');
  assert.deepEqual(parseCodes(pair), [{ name: 'kate', code }]);
  for (const name of [undefined, '', 'Kate', 'a:b', 'a,b', 'two words']) assert.throws(() => pairFor(name));
});
