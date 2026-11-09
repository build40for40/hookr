import test from 'node:test';
import assert from 'node:assert/strict';
import { MockLanguageModelV4 } from 'ai/test';
import { handle } from './index.js';
import { MAX_TEXT } from './post.js';
import { mockModel } from './mock-model.js';

const CODES = 'ben:ben-test-code,kate:kate-test-code';
const env = { MODEL: 'mock:model', ACCESS_CODES: CODES };
const send = (body, model, settings = env, code = 'kate-test-code') =>
  handle(new Request('http://api/post', {
    method: 'POST',
    headers: code ? { Authorization: `Bearer ${code}` } : {},
    body: JSON.stringify(body),
  }), settings, () => model);

test('POST /post turns text into a post, readable from any origin, and logs who asked but not their code', async t => {
  const log = t.mock.method(console, 'log', () => {});
  const { model } = mockModel('Post: A post.\nSupporting excerpt: The article.');
  const response = await send({ text: 'The article.' }, model);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), '*');
  assert.deepEqual(await response.json(), { post: 'A post.', excerpt: 'The article.', length: 7 });
  assert.deepEqual(log.mock.calls.map(call => call.arguments), [[{ event: 'post', person: 'kate', mood: null }]]);
});

test('POST /post needs a valid access code, and fails closed when none are set', async () => {
  const { model, prompts } = mockModel('Post: A post.\nSupporting excerpt: The article.');
  for (const code of [null, 'wrong-code', 'ben-test-codex', 'ben']) {
    const response = await send({ text: 'The article.' }, model, env, code);
    assert.equal(response.status, 401);
    assert.equal(response.headers.get('WWW-Authenticate'), 'Bearer');
    assert.equal((await response.json()).error.code, 'unauthorised');
  }
  for (const ACCESS_CODES of [undefined, '', ' , ']) {
    const response = await send({ text: 'The article.' }, model, { MODEL: 'mock:model', ACCESS_CODES }, 'kate-test-code');
    assert.equal(response.status, 503);
    assert.equal((await response.json()).error.code, 'not_configured');
  }
  assert.equal(prompts.length, 0);
});

test('POST /post rate limits each person by name', async t => {
  t.mock.method(console, 'log', () => {});
  const keys = [];
  const POSTS_PER_PERSON = { limit: async ({ key }) => { keys.push(key); return { success: keys.length < 2 }; } };
  const { model } = mockModel('Post: A post.\nSupporting excerpt: The article.');
  assert.equal((await send({ text: 'The article.' }, model, { ...env, POSTS_PER_PERSON }, 'ben-test-code')).status, 200);
  const limited = await send({ text: 'The article.' }, model, { ...env, POSTS_PER_PERSON }, 'ben-test-code');
  assert.equal(limited.status, 429);
  assert.equal((await limited.json()).error.code, 'rate_limited');
  assert.deepEqual(keys, ['ben', 'ben']);
});

test('POST /post says so when the page has too little to work with', async () => {
  const { model } = mockModel('There is not enough suitable source material.');
  const response = await send({ text: 'Home. Subscribe.' }, model);
  assert.equal(response.status, 422);
  assert.equal((await response.json()).error.code, 'insufficient_source');
});

test('POST /post rejects empty or oversized text and a missing MODEL, and reports model failures', async () => {
  assert.equal((await send({ text: '  ' })).status, 400);
  assert.equal((await send({ text: 'x'.repeat(MAX_TEXT + 1) })).status, 413);
  const unset = await send({ text: 'The article.' }, undefined, { ACCESS_CODES: CODES });
  assert.equal(unset.status, 503);
  assert.equal((await unset.json()).error.code, 'not_configured');
  const broken = new MockLanguageModelV4({ doGenerate: async () => { throw new Error('boom'); } });
  const failed = await send({ text: 'The article.' }, broken);
  assert.equal(failed.status, 502);
  assert.equal((await failed.json()).error.code, 'upstream');
});

test('GET /health and preflight stay open, and unknown routes are a JSON 404', async () => {
  assert.deepEqual(await (await handle(new Request('http://api/health'), {})).json(), { ok: true });
  const preflight = await handle(new Request('http://api/post', { method: 'OPTIONS' }), {});
  assert.equal(preflight.status, 204);
  assert.match(preflight.headers.get('Access-Control-Allow-Headers'), /Authorization/);
  const missing = await handle(new Request('http://api/nope'), {});
  assert.equal(missing.status, 404);
  assert.equal((await missing.json()).error.code, 'not_found');
});
