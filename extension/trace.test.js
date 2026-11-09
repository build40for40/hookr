import test from 'node:test';
import assert from 'node:assert/strict';
import { clip, pieces, trace } from './trace.js';

const page = [
  'Before you turn on your AI agent',
  'Every major AI company now offers a personal AI agent, and each one asks for access to your files, email, and calendar on day one. Most people will say yes to all of it before they think about what those accounts hold.',
  'Think about what is in your drive right now. Tax returns. Passwords saved in a file called “misc.” Contracts with client names.',
].join('\n\n');

test('a word-for-word post is traced to its paragraph', () => {
  const result = trace('Every major AI company now offers a personal AI agent, and each one asks for access to your files, email, and calendar on day one.', page);
  assert.equal(result.found, true);
  assert.equal(result.paragraph, 2);
});

test('line breaks, curly quotes and a passage cut short still count as her words', () => {
  const post = 'Think about what is in your drive right now.\n\nTax returns.\nPasswords saved in a file called "misc."\n\nMost people will say yes to all of it.';
  assert.equal(trace(post, page).found, true);
  assert.equal(trace(post, page).paragraph, 3);
});

test('anything not on the page is flagged', () => {
  const result = trace('Every major AI company now offers a personal AI agent. Most of them will sell your data.', page);
  assert.equal(result.found, false);
  assert.deepEqual(result.missing, ['most of them will sell your data']);
});

test('pieces split on sentences and lines', () => {
  assert.deepEqual(pieces('One. Two!\nThree'), ['one', 'two', 'three']);
});

test('clip stops on a word', () => {
  assert.equal(clip('short'), 'short');
  assert.equal(clip('one two three four', 10), 'one two…');
});
