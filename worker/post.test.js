import test from 'node:test';
import assert from 'node:assert/strict';
import { mockModel } from './mock-model.js';
import { modelFor, TooLongError, writePost, X_LIMIT } from './post.js';

const promptText = prompt => JSON.stringify(prompt);

test('writePost sends the text and returns the trimmed post', async () => {
  const { model, prompts } = mockModel('  A post.  ');
  assert.equal(await writePost(model, 'The article.'), 'A post.');
  assert.match(promptText(prompts[0]), /The article\./);
});

test('writePost asks again when a post is over the limit, then gives up', async () => {
  const long = 'x'.repeat(X_LIMIT + 1);
  const retried = mockModel(long, 'Short.');
  assert.equal(await writePost(retried.model, 'Text.'), 'Short.');
  assert.match(promptText(retried.prompts[1]), new RegExp(`was ${X_LIMIT + 1} characters`));

  const stuck = mockModel(long);
  await assert.rejects(writePost(stuck.model, 'Text.'), TooLongError);
  assert.equal(stuck.prompts.length, 3);
});

test('modelFor picks the provider and model from MODEL', () => {
  const pick = env => modelFor({ ANTHROPIC_API_KEY: 'a', OPENAI_API_KEY: 'o', ...env });
  const openai = pick({ MODEL: 'openai:gpt-test' });
  assert.equal(openai.modelId, 'gpt-test');
  assert.match(openai.provider, /^openai/);
});
