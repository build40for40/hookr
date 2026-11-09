import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_MOOD, MOODS, RATED_IDS, moodFor, ordered } from './moods.js';

test('Pull quote is the default and unknown or retired IDs fall back to it', () => {
  assert.equal(DEFAULT_MOOD, 'line');
  assert.equal(MOODS[0].id, 'line');
  for (const id of ['elegant', 'tiktok', undefined]) assert.equal(moodFor(id).id, 'line');
  assert.equal(new Set(MOODS.map(({ id }) => id)).size, MOODS.length);
});

test('the picker puts good fits first and reaches last, Pull quote first and Pick-up line last', () => {
  const fit = { story: { level: 'none' }, dialogue: { level: 'strong' }, lesson: { level: 'thin' } };
  const ids = ordered(fit).map(({ id }) => id);
  assert.equal(ids[0], 'line');
  assert.ok(ids.indexOf('dialogue') < ids.indexOf('lesson'));
  assert.equal(ids.at(-2), 'story');
  assert.equal(ids.at(-1), 'pickup');
  assert.deepEqual(ordered(null).map(({ id }) => id), MOODS.map(({ id }) => id));
});

test('every lens but Pull quote has a plain why-sentence for every fit', () => {
  for (const { id, reasons, rated } of MOODS) {
    if (id === DEFAULT_MOOD || rated === false) { assert.equal(reasons, undefined); continue; }
    for (const level of ['strong', 'thin', 'none']) assert.match(reasons?.[level] ?? '', /^[A-Z].*\.$/, `${id} ${level}`);
  }
});

test('Pick-up line is never rated and always sits last', () => {
  assert.ok(!RATED_IDS.includes('pickup') && !RATED_IDS.includes('line'));
  assert.equal(RATED_IDS.length, MOODS.length - 2);
  const fit = Object.fromEntries(RATED_IDS.map(id => [id, { level: 'none' }]));
  assert.equal(ordered(fit).at(-1).id, 'pickup');
  assert.equal(ordered(null).at(-1).id, 'pickup');
});
