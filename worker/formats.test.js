import test from 'node:test';
import assert from 'node:assert/strict';
import { handle } from './index.js';
import { mockModel } from './mock-model.js';
import { instructionsFor } from './lenses.js';
import { characterCount, parseFormatReply, validateFormat } from './formats.js';
import { selectionFor } from '../prompts/formats/index.js';
import { InsufficientSourceError, NoValidPostError, writePost } from './post.js';

const article = 'Start small. Give the agent only the files it needs. Read-only access may help you spot mistakes.';
const excerpt = 'Give the agent only the files it needs.';
const data = (content, posts) => JSON.stringify({ content, excerpt, ...(posts ? { posts } : {}) });
const send = (body, model) => handle(new Request('http://api/post', {
  method: 'POST', headers: { Authorization: 'Bearer test-code' }, body: JSON.stringify({text:article, ...body}),
}), { MODEL: 'mock:model', ACCESS_CODES: 'tester:test-code' }, () => model);

test('every non-tweet platform variant reaches its prompt through authenticated Worker', async t => {
  t.mock.method(console, 'log', () => {});
  const script = Array(150).fill('Source').join(' ');
  const posts = ['Start small.', 'Give it only the files it needs.', 'Read-only access may help you spot mistakes.'];
  const cases = [
    ['feed', 'linkedin', 'Start small.'], ['feed', 'threads', 'Start small.'],
    ['essay', 'substack', 'Start small.'], ['essay', 'linkedin', 'Start small.'], ['essay', 'x', 'Start small.'],
    ['shorts', 'youtube', script], ['instagram', 'instagram', 'Start small.'],
    ['thread', 'x', posts.join('\n\n')], ['thread', 'threads', posts.join('\n\n')],
  ];
  for (const [format, platform, content] of cases) {
    const { model, prompts } = mockModel(data(content, format === 'thread' ? posts : undefined));
    const response = await send({ format, platform, mood: 'calm' }, model);
    assert.equal(response.status, 200, `${format}/${platform}`);
    const body = await response.json();
    assert.equal(body.post, content);
    assert.equal(body.format, format);
    assert.equal(body.platform, platform);
    assert.equal(body.excerpt, excerpt);
    assert.equal(prompts[0][0].content, instructionsFor('calm', {format, platform}));
    assert.doesNotMatch(prompts[0][0].content, /Turn the supplied article into ONE compelling X post/);
    if (format === 'thread') assert.deepEqual(body.posts, posts);
    if (format === 'shorts') assert.equal(body.estimatedSeconds, 60);
  }
});

test('invalid format/platform is rejected before model access; missing format defaults to tweet', async () => {
  for (const body of [{format:'constructor'}, {format:null}, {format:{}}, {format:{toString:'x'}}, {format:['tweet']}, {format:'essay', platform:'youtube'}, {format:'feed', platform:'x'}, {platform:[]}, {platform:{toString:'x'}}, {format:'shorts',platform:'threads'}]) {
    assert.equal((await send(body)).status, 400);
  }
  assert.deepEqual(selectionFor(), {format:'tweet', platform:'x'});
  assert.deepEqual(selectionFor('essay'), {format:'essay', platform:'substack'});
});

test('mechanical format guards cover weighted thread limits, duration, caption and essay caps', () => {
  const reply = post => ({post, excerpt});
  assert.ok(validateFormat(reply('a'.repeat(501)), 'feed', 'linkedin'));
  assert.equal(validateFormat(reply('a'.repeat(500)), 'feed', 'threads'), null);
  assert.ok(validateFormat(reply('a'.repeat(2201)), 'instagram', 'instagram'));
  assert.equal(validateFormat(reply('a'.repeat(2200)), 'instagram', 'instagram'), null);
  assert.ok(validateFormat(reply('word '.repeat(701)), 'essay', 'substack'));
  assert.equal(validateFormat(reply('word '.repeat(700)), 'essay', 'linkedin'), null);
  for (const words of [149,301]) assert.ok(validateFormat(reply(Array(words).fill('a').join(' ')), 'shorts', 'youtube'));
  for (const words of [150,300]) assert.equal(validateFormat(reply(Array(words).fill('a').join(' ')), 'shorts', 'youtube'), null);
  const posts = ['界'.repeat(141), 'Second.', 'Third.'];
  const thread = { ...reply(posts.join('\n\n')), posts };
  assert.ok(validateFormat(thread, 'thread', 'x'));
  assert.equal(validateFormat(thread, 'thread', 'threads'), null);
  assert.ok(validateFormat({...thread, post:'mismatch'}, 'thread', 'threads'));
  assert.ok(validateFormat({...thread, posts:['A.','A.','A.'],post:'A.\n\nA.\n\nA.'}, 'thread', 'threads'));
  assert.equal(characterCount('😀café'), 5);
  for (const malformed of [null, {}, {post:null}, {post:'Text',posts:'bad'}, {post:'Text',posts:[null]}, {post:'Text',posts:[{}]}]) {
    assert.ok(validateFormat(malformed, 'thread', 'x'));
  }
});

test('non-tweet malformed responses and bad excerpts retry with corrective feedback; explicit abstention stops', async () => {
  const {model, prompts} = mockModel('not JSON', JSON.stringify({content:'Start small.',excerpt:'invented quote'}), data('Start small.'));
  assert.equal((await writePost(model, article, {format:'essay'})).post, 'Start small.');
  assert.match(JSON.stringify(prompts[1]), /previous response failed validation/);
  assert.equal(prompts.length,3);
  await assert.rejects(writePost(mockModel('not JSON').model, article, {format:'essay'}), NoValidPostError);
  await assert.rejects(writePost(mockModel('{"abstain":true}').model, article, {format:'shorts'}), InsufficientSourceError);
  for (const bad of ['{}','[]','null','{"content":42,"excerpt":"source"}','{"content":"text","excerpt":null}']) assert.equal(parseFormatReply(bad), null);
});
