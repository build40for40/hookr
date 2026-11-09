import test from 'node:test';
import assert from 'node:assert/strict';
import { selectionFor } from '../prompts/formats/index.js';
import { FORMATS, copyLabel, formatFor, measure, platformFor, postLabel } from './formats.js';

test('every format and platform in the picker is one the Worker accepts', () => {
  assert.deepEqual(FORMATS.map(({ name }) => name), ['X', 'LinkedIn', 'Threads', 'Essay', 'TikTok script', 'Instagram']);
  for (const format of FORMATS) {
    for (const platform of format.platforms) assert.deepEqual(selectionFor(format.id, platform.id), { format: format.id, platform: platform.id });
  }
});

test('unknown IDs fall back to the first format and platform', () => {
  assert.equal(formatFor('nope').id, 'tweet');
  assert.equal(platformFor(formatFor('thread'), 'nope').id, 'x');
});

test('labels say what it is and where it is going', () => {
  const tweet = formatFor('tweet');
  assert.equal(postLabel(tweet, platformFor(tweet)), 'Your post for X');
  assert.equal(copyLabel(tweet, platformFor(tweet)), 'Copy for X');
  const essay = formatFor('essay');
  assert.equal(postLabel(essay, platformFor(essay, 'linkedin')), 'Your essay for LinkedIn');
  const feed = formatFor('feed');
  assert.equal(copyLabel(feed, platformFor(feed, 'linkedin')), 'Copy for LinkedIn');
  const thread = formatFor('thread');
  assert.equal(copyLabel(thread, platformFor(thread, 'threads')), 'Copy the thread');
});

test('measure gives each format its own length line and flags edits past a limit', () => {
  const tweet = formatFor('tweet'), x = platformFor(tweet);
  assert.deepEqual(measure(tweet, x, ['Hello.']), { meta: '6 / 280', over: false });
  assert.deepEqual(measure(tweet, x, ['a'.repeat(283)]), { meta: '283 / 280 · 3 over', over: true });

  const thread = formatFor('thread');
  assert.deepEqual(measure(thread, platformFor(thread, 'threads'), ['One.', 'Two.', 'a'.repeat(300)]), { meta: '3 posts', over: false });
  assert.equal(measure(thread, platformFor(thread, 'x'), ['One.', 'a'.repeat(300)]).over, true);

  const words = n => [Array(n).fill('word').join(' ')];
  assert.equal(measure(formatFor('shorts'), platformFor(formatFor('shorts')), words(190)).meta, 'about 76 seconds');
  assert.equal(measure(formatFor('essay'), platformFor(formatFor('essay')), words(1200)).meta, '1,200 words');
  assert.equal(measure(formatFor('essay'), platformFor(formatFor('essay')), words(1200)).over, false);
});
