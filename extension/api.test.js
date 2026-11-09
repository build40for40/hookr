import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_API, sourceLabel, wordCount, writePost } from './api.js';

const reply = (body, status = 200) => new Response(JSON.stringify(body), { status });

test('writePost sends the text to the Worker and surfaces its errors', async () => {
  let asked;
  const post = await writePost('Some words.', {
    fetcher: async (url, init) => { asked = { url, body: JSON.parse(init.body) }; return reply({ post: 'P', excerpt: 'E' }); },
  });
  assert.deepEqual(asked, { url: `${DEFAULT_API}/post`, body: { text: 'Some words.' } });
  assert.deepEqual(post, { post: 'P', excerpt: 'E' });
  await assert.rejects(writePost('x', { fetcher: async () => reply({ error: { message: 'Too long.' } }, 413) }), /Too long\./);
});

test('word count and the source label', () => {
  assert.equal(wordCount('  one two\nthree '), 3);
  assert.equal(sourceLabel({ title: 'On writer’s block', url: 'https://kate.substack.com/p/block' }), 'On writer’s block · Substack');
  assert.equal(sourceLabel({ title: '', url: 'https://www.example.com/a' }), 'example.com');
});
