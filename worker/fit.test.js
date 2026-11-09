import test from 'node:test';
import assert from 'node:assert/strict';
import { rateFit as frontendRateFit } from '../extension/api.js';
import { handle } from './index.js';
import { mockModel } from './mock-model.js';
import { MAX_TEXT } from './post.js';
import { LENSES, DEFAULT_LENS } from '../prompts/lenses/index.js';
import { parseFit, rateFit, fitInstructions, InvalidFitError } from './fit.js';
const article = 'First remove unrelated files. Then use read-only access.';
const payload = () => ({ fit: Object.fromEntries(Object.keys(LENSES).filter(id => id !== DEFAULT_LENS).map(id => [id, {
  level: 'none', reason: 'This page does not contain the material for this lens.', evidence: [],
}])) });
const env = { MODEL: 'mock:model', ACCESS_CODES: 'tester:test-code' };
const send = (body, model, settings = env, code = 'test-code') => handle(new Request('http://api/fit', {
  method: 'POST', headers: { Authorization: `Bearer ${code}` }, body: JSON.stringify(body),
}), settings, () => model);

test('/fit reuses limits and text validation without model calls on invalid requests', async () => {
  const { model, prompts } = mockModel(JSON.stringify(payload()));
  for (const [body, settings, code, status] of [
    // Access codes are off for now; restore these cases when they come back.
    // [{ text: article }, env, 'wrong', 401], [{ text: article }, { MODEL: 'mock:model' }, 'test-code', 503],
    [{ text: article }, { ...env, POSTS_PER_PERSON: { limit: async () => ({ success: false }) } }, 'test-code', 429],
    [{ text: '' }, env, 'test-code', 400], [{ text: 'x'.repeat(MAX_TEXT + 1) }, env, 'test-code', 413],
    [{ text: article }, { ACCESS_CODES: env.ACCESS_CODES }, 'test-code', 503],
  ]) assert.equal((await send(body, model, settings, code)).status, status);
  assert.equal(prompts.length, 0);
});

test('/fit returns complete current IDs, hides internal evidence and records no source/code', async t => {
  const log = t.mock.method(console, 'log', () => {});
  const rated = payload();
  rated.fit.howto = { level: 'strong', reason: 'There are two practical steps on this page.', evidence: ['First remove unrelated files.'] };
  const { model, prompts } = mockModel(JSON.stringify(rated));
  const response = await send({ text: article }, model);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body.fit.howto, { level: 'strong', reason: rated.fit.howto.reason });
  assert.equal(Object.keys(body.fit).length, Object.keys(LENSES).length - 1);
  assert.ok(!Object.hasOwn(body.fit, DEFAULT_LENS));
  assert.equal(prompts.length, 1);
  assert.deepEqual(log.mock.calls.map(call => call.arguments), [[{ event: 'fit' }]]);
});

test('invalid or unsourced model ratings never become default green ratings', async t => {
  t.mock.method(console, 'error', () => {});
  const changes = [p => delete p.fit.dialogue, p => { p.fit.unknown = p.fit.story; }, p => { p.fit.story.level = 'green'; },
    p => { p.fit.story = { level: 'strong', reason: 'A story is present.', evidence: [] }; },
    p => { p.fit.story = { level: 'thin', reason: 'A story is present.', evidence: ['Invented source.'] }; },
    p => { p.fit.story.reason = 'First sentence. Second sentence.'; }, p => { p.fit.story.evidence = ['First remove unrelated files.']; }];
  for (const change of changes) {
    const p = payload(); change(p);
    const { model, prompts } = mockModel(JSON.stringify(p));
    assert.equal((await send({ text: article }, model)).status, 502);
    assert.equal(prompts.length, 1);
  }
  assert.throws(() => parseFit('not JSON', article), InvalidFitError);
});

test('new registry entries are automatically requested and required without fixed counts', async () => {
  const registry = { ...LENSES, new_shape: { id: 'new_shape', label: 'New shape', instructions: 'Only use concrete source advice.' } };
  assert.match(fitInstructions(registry), /new_shape — New shape/);
  assert.throws(() => parseFit(JSON.stringify(payload()), article, registry), InvalidFitError);
  const p = payload(); p.fit.new_shape = { level: 'thin', reason: 'There is concrete advice here.', evidence: ['Then use read-only access.'] };
  const { model } = mockModel(JSON.stringify(p));
  assert.equal((await rateFit(model, article, registry)).fit.new_shape.level, 'thin');
});


test('provider errors make the existing frontend leave lenses unrated, with no retry or source logging', async t => {
  const logged = t.mock.method(console, 'error', () => {});
  const { model } = mockModel('unused');
  let calls = 0;
  model.doGenerate = async () => { calls++; throw new Error('private provider diagnostic'); };
  const fetcher = (url, init) => handle(new Request(url, init), env, () => model);
  assert.equal(await frontendRateFit(article, { code: 'test-code', base: 'http://api', fetcher }), null);
  assert.equal(calls, 1);
  assert.deepEqual(logged.mock.calls.map(call => call.arguments), [['rateFit failed']]);
});
