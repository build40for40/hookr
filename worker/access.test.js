import test from 'node:test';
import assert from 'node:assert/strict';
import { bearer, parseCodes, personFor } from './access.js';

test('parseCodes reads name:code pairs and skips blank or broken entries', () => {
  assert.deepEqual(parseCodes(' ben:abc , kate:d:ef,,:nameless,nocode:, broken '), [
    { name: 'ben', code: 'abc' },
    { name: 'kate', code: 'd:ef' },
  ]);
  assert.deepEqual(parseCodes(undefined), []);
});

test('bearer reads the code from an Authorization header', () => {
  const asking = value => new Request('http://api/post', { headers: value ? { Authorization: value } : {} });
  assert.equal(bearer(asking('Bearer abc123')), 'abc123');
  assert.equal(bearer(asking('bearer   abc123 ')), 'abc123');
  assert.equal(bearer(asking('Basic abc123')), null);
  assert.equal(bearer(asking('Bearer ')), null);
  assert.equal(bearer(asking()), null);
});

test('personFor names the owner of a matching code and nobody otherwise', async () => {
  const codes = parseCodes('ben:first-code,kate:second-code');
  assert.equal(await personFor('second-code', codes), 'kate');
  assert.equal(await personFor('second-cod', codes), null);
  assert.equal(await personFor('', codes), null);
  assert.equal(await personFor('first-code', []), null);
});
