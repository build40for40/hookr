import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiError, DEFAULT_API, characters, rateFit, sourceLabel, wordCount, writePost } from './api.js';
import { MOODS, DEFAULT_MOOD } from './moods.js';

const reply = (body, status = 200) => new Response(JSON.stringify(body), { status });

test('writePost sends the text to the Worker and surfaces its errors', async () => {
  let asked;
  const post = await writePost('Some words.', {
    fetcher: async (url, init) => { asked = { url, body: JSON.parse(init.body) }; return reply({ post: 'P' }); },
  });
  assert.deepEqual(asked, { url: `${DEFAULT_API}/post`, body: { text: 'Some words.' } });
  assert.equal(post, 'P');
  await writePost('Some words.', {
    mood: 'story',
    fetcher: async (url, init) => { asked = JSON.parse(init.body); return reply({ post: 'P' }); },
  });
  assert.deepEqual(asked, { text: 'Some words.', mood: 'story' });
  await assert.rejects(writePost('x', { fetcher: async () => reply({ error: { message: 'Too long.' } }, 413) }), /Too long\./);
});

test('writePost sends the access code as a bearer token and flags a 401', async () => {
  let sent;
  await writePost('x', { code: 'my-code', fetcher: async (url, init) => { sent = init.headers; return reply({ post: 'P' }); } });
  assert.equal(sent.Authorization, 'Bearer my-code');
  await writePost('x', { fetcher: async (url, init) => { sent = init.headers; return reply({ post: 'P' }); } });
  assert.equal(sent.Authorization, undefined);
  await assert.rejects(
    writePost('x', { code: 'old', fetcher: async () => reply({ error: { code: 'unauthorised', message: 'Nope.' } }, 401) }),
    error => error instanceof ApiError && error.status === 401,
  );
});

test('rateFit asks the Worker how each lens fits, and stays quiet when it cannot', async () => {
  let asked;
  const fit = Object.fromEntries(MOODS.filter(lens => lens.id !== DEFAULT_MOOD).map(({ id }) => [id, { level: 'strong', reason: 'A clear moment.' }]));
  const got = await rateFit('Some words.', {
    code: 'c',
    fetcher: async (url, init) => { asked = { url, body: JSON.parse(init.body), auth: init.headers.Authorization }; return reply({ fit }); },
  });
  assert.deepEqual(asked, { url: `${DEFAULT_API}/fit`, body: { text: 'Some words.' }, auth: 'Bearer c' });
  assert.deepEqual(got, fit);
  assert.equal(await rateFit('x', { fetcher: async () => reply({ error: { code: 'not_found' } }, 404) }), null);
  assert.equal(await rateFit('x', { fetcher: async () => { throw new TypeError('offline'); } }), null);
  assert.equal(await rateFit('x', { fetcher: async () => reply({}) }), null);
  assert.equal(await rateFit('x', { fetcher: async () => reply({ fit: { story: fit.story } }) }), null);
  assert.equal(await rateFit('x', { fetcher: async () => reply({ fit: { ...fit, story: { level: 'green', reason: 'Looks good.' } } }) }), null);
});

test('counts, words and the source label', () => {
  assert.equal(characters('héllo 👋'), 7);
  assert.equal(wordCount('  one two\nthree '), 3);
  assert.equal(sourceLabel({ title: 'On writer’s block', url: 'https://kate.substack.com/p/block' }), 'On writer’s block · Substack');
  assert.equal(sourceLabel({ title: '', url: 'https://www.example.com/a' }), 'example.com');
});
