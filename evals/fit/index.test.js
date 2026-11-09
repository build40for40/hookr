import test from 'node:test';
import assert from 'node:assert/strict';
import { FIXTURES } from './fixtures.js';
import { evaluateFit } from './index.js';
import { LENSES, DEFAULT_LENS, ratedIds } from '../../prompts/lenses/index.js';
test('reference fixtures cover missing dialogue, source scenes, practical advice and Kate preview', () => {
  assert.equal(FIXTURES.length, 4);
  assert.equal(FIXTURES[0].expected.dialogue, 'none');
  assert.equal(FIXTURES[1].expected.scene, 'strong');
  assert.equal(FIXTURES[2].expected.howto, 'strong');
});
test('saved rating comparison catches false green and leaves unreviewed reasons pending', () => {
  const fixture = FIXTURES[0];
  const fit = Object.fromEntries(ratedIds().map(id => [id, { level: 'none', reason: 'No supporting material is present.' }]));
  assert.equal(evaluateFit({ fixture, response: { fit } }).readiness, 'needs_review');
  fit.dialogue.level = 'strong';
  const report = evaluateFit({ fixture, response: { fit } });
  assert.equal(report.readiness, 'fail');
  assert.equal(report.checks.find(c => c.id === 'dialogue').status, 'fail');
  delete fit.dialogue;
  assert.equal(evaluateFit({ fixture, response: { fit } }).checks[0].status, 'fail');
});
