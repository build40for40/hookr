import test from 'node:test';
import assert from 'node:assert/strict';
import { MockLanguageModelV4 } from 'ai/test';
import { handle } from './index.js';
import { MAX_TEXT } from './post.js';
import { mockModel } from './mock-model.js';

const send = (body, model, env = { MODEL: 'mock:model' }) =>
  handle(new Request('http://api/post', { method: 'POST', body: JSON.stringify(body) }), env, () => model);

test('POST /post turns text into a post, readable from any origin', async () => {
  const { model } = mockModel('A post.');
  const response = await send({ text: 'The article.' }, model);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), '*');
  assert.deepEqual(await response.json(), { post: 'A post.' });
});

test('POST /post rejects empty or oversized text and a missing MODEL, and reports model failures', async () => {
  assert.equal((await send({ text: '  ' })).status, 400);
  assert.equal((await send({ text: 'x'.repeat(MAX_TEXT + 1) })).status, 413);
  const unset = await send({ text: 'The article.' }, undefined, {});
  assert.equal(unset.status, 503);
  assert.equal((await unset.json()).error.code, 'not_configured');
  const broken = new MockLanguageModelV4({ doGenerate: async () => { throw new Error('boom'); } });
  const failed = await send({ text: 'The article.' }, broken);
  assert.equal(failed.status, 502);
  assert.equal((await failed.json()).error.code, 'upstream');
});

test('GET /health answers, and unknown routes are a JSON 404', async () => {
  assert.deepEqual(await (await handle(new Request('http://api/health'), {})).json(), { ok: true });
  assert.equal((await handle(new Request('http://api/post', { method: 'OPTIONS' }), {})).status, 204);
  const missing = await handle(new Request('http://api/nope'), {});
  assert.equal(missing.status, 404);
  assert.equal((await missing.json()).error.code, 'not_found');
});
