import test from 'node:test';
import assert from 'node:assert/strict';
import { mockModel } from './mock-model.js';
import { instructionsFor } from './lenses.js';
import { excerptInArticle, InsufficientSourceError, modelFor, NoValidPostError, parseReply, weightedLength, writePost, X_LIMIT } from './post.js';

const article = 'A small pilot suggests that starting with one read-only folder may help teams spot mistakes. We have not tested whether this prevents data loss.';
const reply = (post, excerpt) => `Post: ${post}\nSupporting excerpt: ${excerpt}`;

test('writePost sends prompt v1 plus the default lens with the article as labelled data and returns the post and excerpt', async () => {
  const { model, prompts } = mockModel(reply('Start with one read-only folder.', '“starting with one read-only folder may help teams spot mistakes”'));
  assert.deepEqual(await writePost(model, article), {
    post: 'Start with one read-only folder.',
    excerpt: 'starting with one read-only folder may help teams spot mistakes',
    length: 32,
  });
  const [system, user] = prompts[0];
  assert.equal(system.content, instructionsFor());
  assert.match(JSON.stringify(user.content), /^\[{"type":"text","text":"ARTICLE DATA\\n\\nA small pilot/);
});

test('writePost retries posts that are too long or quote words not in the article, then gives up', async () => {
  const good = reply('Short.', 'one read-only folder');
  const retried = mockModel(reply('a'.repeat(X_LIMIT + 1), 'one read-only folder'), reply('Short.', 'one read-only folder will help'), good);
  assert.equal((await writePost(retried.model, article)).post, 'Short.');
  assert.equal(retried.prompts.length, 3);

  const stuck = mockModel(reply('Short.', 'this prevents data loss for sure'));
  await assert.rejects(writePost(stuck.model, article), NoValidPostError);
});

test('writePost stops when the model says there is not enough source material', async () => {
  const { model, prompts } = mockModel('There is not enough suitable source material to write a post.');
  await assert.rejects(writePost(model, 'Home. Sign in. Subscribe.'), InsufficientSourceError);
  assert.equal(prompts.length, 1);
});

test('parseReply reads both fields, with or without bold labels', () => {
  assert.deepEqual(parseReply('**Post:** One idea.\nIt continues.\n\n**Supporting excerpt:** "the source"'), { post: 'One idea.\nIt continues.', excerpt: '"the source"' });
  assert.equal(parseReply('Not enough material.'), null);
});

test('weightedLength follows X counting', () => {
  const family = '👨‍👩‍👧‍👦';
  assert.equal(weightedLength('a'.repeat(280)), 280);
  assert.equal(weightedLength('a'.repeat(281)), 281);
  assert.equal(weightedLength('界'.repeat(140)), 280);
  assert.equal(weightedLength('界'.repeat(141)), 282);
  assert.equal(weightedLength(family.repeat(140)), 280);
  assert.equal(weightedLength(family.repeat(141)), 282);
  assert.equal(weightedLength('café'), weightedLength('café'));
});

test('excerptInArticle wants an exact, nonempty passage', () => {
  assert.ok(excerptInArticle('“may help teams   spot mistakes”', article));
  assert.ok(excerptInArticle('café au lait', 'I ordered a café au lait.'));
  assert.ok(!excerptInArticle('', article));
  assert.ok(!excerptInArticle('will help teams spot mistakes', article));
});

test('modelFor picks the provider and model from MODEL', () => {
  const openai = modelFor({ OPENAI_API_KEY: 'o', MODEL: 'openai:gpt-test' });
  assert.equal(openai.modelId, 'gpt-test');
  assert.match(openai.provider, /^openai/);
});
