import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_MOOD, MOODS, better, moodFor, ordered } from './moods.js';

test('Pull quote is the default and unknown or retired IDs fall back to it', () => {
  assert.equal(DEFAULT_MOOD, 'line');
  assert.equal(MOODS[0].id, 'line');
  for (const id of ['elegant', 'tiktok', undefined]) assert.equal(moodFor(id).id, 'line');
  assert.equal(new Set(MOODS.map(({ id }) => id)).size, MOODS.length);
});

test('the picker puts good fits first and reaches last, Pull quote always first', () => {
  const fit = { story: { level: 'none' }, dialogue: { level: 'strong' }, lesson: { level: 'thin' } };
  const ids = ordered(fit).map(({ id }) => id);
  assert.equal(ids[0], 'line');
  assert.ok(ids.indexOf('dialogue') < ids.indexOf('lesson'));
  assert.equal(ids.at(-1), 'story');
  assert.deepEqual(ordered(null).map(({ id }) => id), MOODS.map(({ id }) => id));
});

test('a reach offers the first good fit, else a stretch, else Pull quote', () => {
  assert.equal(better({ story: { level: 'thin' }, take: { level: 'strong' }, dialogue: { level: 'none' } }).id, 'take');
  assert.equal(better({ story: { level: 'thin' }, dialogue: { level: 'none' } }).id, 'story');
  assert.equal(better(null).id, 'line');
});
