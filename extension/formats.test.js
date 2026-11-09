import test from 'node:test';
import assert from 'node:assert/strict';
import { FORMATS as WORKER_FORMATS } from '../prompts/formats/index.js';
import { FORMATS, copyLabel, formatFor, measure, platformFor } from './formats.js';

test('every format and platform in the picker is one the Worker accepts', () => {
  for (const format of FORMATS) {
    assert.deepEqual(format.platforms.map(({ id }) => id), WORKER_FORMATS[format.id].platforms, format.id);
  }
  assert.equal(new Set(FORMATS.map(({ name }) => name)).size, FORMATS.length);
});

test('unknown IDs fall back to the first format and platform', () => {
  assert.equal(formatFor('nope').id, 'tweet');
  assert.equal(platformFor(formatFor('thread'), 'nope').id, 'x');
});

test('copy says where it is going, or that it is a thread', () => {
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
