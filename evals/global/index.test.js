import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateOutput, validateTrendSignals, CRITERIA } from './index.js';

const article = 'Start small. One read-only folder may help you review mistakes.';
const base = { article, output: { post: 'Start small.', excerpt: 'Start small.' } };
const result = (args = {}) => evaluateOutput({ ...base, ...args });
const signal = { platform: 'x', url: 'https://example.org/posts/1', publishedAt: '2026-11-08T00:00:00Z', observedAt: '2026-11-09T00:00:00Z', observation: 'Question-led openings', evidence: 'A sourced example' };
const freshness = { platform: 'x', now: '2026-11-09T12:00:00Z' };
test('offline checks cannot claim naturalness, fidelity or overall quality', () => {
  const r = result();
  assert.equal(r.readiness, 'needs_review');
  assert.equal(r.judgments.find(j => j.id === 'naturalness').status, 'not_assessed');
  assert.equal(r.trend.status, 'not_assessed');
});
test('weighted X length handles CJK, emoji and normalized accents', () => {
  for (const text of ['a'.repeat(280), '界'.repeat(140), '👨‍👩‍👧‍👦'.repeat(140)]) {
    assert.equal(result({ output: { post: text, excerpt: 'Start small.' } }).checks.find(c => c.id === 'length').status, 'pass');
  }
  assert.equal(result({ output: { post: '界'.repeat(141), excerpt: 'Start small.' } }).readiness, 'fail');
});
test('exact excerpt does not prove unsupported output claims', () => {
  const r = result({ output: { post: 'This prevents every mistake.', excerpt: 'Start small.' }, judgments: { source_fidelity: { score: 2, reason: 'Looks good', reviewer: 'judge' } } });
  assert.equal(r.checks.find(c => c.id === 'source_excerpt').status, 'pass');
  assert.equal(r.judgments.find(c => c.id === 'source_fidelity').status, 'not_assessed');
});
test('claim mapping rejects fabricated quotes; records explicit fidelity failure', () => {
  const judgment = { score: 0, reason: 'Changes may to will', reviewer: 'human:Samira', claims: [{ claim: 'Start small.', quote: 'Start small.' }] };
  assert.equal(result({ judgments: { source_fidelity: judgment } }).readiness, 'fail');
  judgment.score = 2;
  judgment.claims[0].quote = 'Invented quotation';
  assert.equal(result({ judgments: { source_fidelity: judgment } }).judgments[0].status, 'not_assessed');
});
test('complete documented review can pass without trend evidence', () => {
  const judgments = Object.fromEntries(CRITERIA.map(id => [id, { score: 1, reason: 'Reviewed against source and rubric', reviewer: 'human:Samira' }]));
  judgments.source_fidelity.claims = [{ claim: 'Start small.', quote: 'Start small.' }];
  const r = result({ judgments, lens: 'story' });
  assert.equal(r.readiness, 'pass');
  assert.equal(r.trend.status, 'not_assessed');
});
test('thread checks complete posts and platform limits', () => {
  const posts = ['a'.repeat(300), 'Second post', 'Third post'];
  const args = { format: 'thread', output: { post: posts.join('\n\n'), posts, excerpt: 'Start small.' } };
  assert.equal(result({ ...args, platform: 'x' }).readiness, 'fail');
  assert.equal(result({ ...args, platform: 'threads' }).checks.find(c => c.id === 'thread_lengths').status, 'pass');
  assert.equal(result({ ...args, output: { ...args.output, posts: [''] } }).readiness, 'fail');
});
test('script timing is estimated from spoken words, not trusted model metadata', () => {
  const output = { post: Array(225).fill('word').join(' '), excerpt: 'Start small.', estimatedSeconds: 5 };
  assert.equal(result({ format: 'shorts', platform: 'youtube', output }).checks.find(c => c.id === 'estimated_duration').status, 'pass');
  assert.equal(result({ format: 'shorts' }).readiness, 'fail');
});
test('essay and instagram support configured editorial bounds', () => {
  for (const format of ['essay', 'instagram']) {
    assert.equal(result({ format, platform: format === 'essay' ? 'substack' : 'instagram' }).readiness, 'needs_review');
    assert.equal(result({ format, platform: format === 'essay' ? 'substack' : 'instagram', constraints: { maxCharacters: 2 } }).readiness, 'fail');
  }
});
test('trend evidence rejects stale, future, wrong-platform and unsourced data', () => {
  assert.equal(validateTrendSignals([signal], freshness).length, 1);
  for (const changes of [{ publishedAt: '2025-01-01' }, { observedAt: '2027-01-01' }, { platform: 'threads' }, { url: 'javascript:alert(1)' }, { evidence: '' }]) {
    assert.equal(validateTrendSignals([{ ...signal, ...changes }], freshness).length, 0);
  }
  assert.throws(() => validateTrendSignals([], { maxAgeDays: -1 }));
});
test('trend assessment needs an identified reviewer and valid source citations', () => {
  const args = { now: freshness.now, trendSignals: [signal], judgments: { trend_fit: { score: 2, reason: 'Matches the cited opening pattern', reviewer: 'human:Samira', evidenceUrls: [signal.url] } } };
  assert.equal(result(args).trend.status, 'pass');
  args.judgments.trend_fit.evidenceUrls = ['https://invented.example'];
  assert.equal(result(args).trend.status, 'not_assessed');
});
test('supplied status and id cannot override computed judgment failure', () => {
  const fake = { id: 'bypass', status: 'pass', score: 0, reason: 'Fails', reviewer: 'judge' };
  assert.equal(result({ judgments: { naturalness: fake } }).judgments.find(j => j.id === 'naturalness').status, 'fail');
  assert.equal(result({ now: freshness.now, trendSignals: [signal], judgments: { trend_fit: { ...fake, evidenceUrls: [signal.url] } } }).trend.status, 'fail');
});
test('malformed posts and unknown selections fail rather than crashing', () => {
  for (const posts of [42, 'a string', [null]]) assert.equal(result({ format: 'thread', output: { ...base.output, posts } }).readiness, 'fail');
  assert.equal(result({ platform: 'unknown' }).readiness, 'fail');
  assert.equal(result({ format: 'unknown' }).readiness, 'fail');
});
test('requested timely mode cannot pass without an evidence assessment', () => {
  const judgments = Object.fromEntries(CRITERIA.map(id => [id, { score: 1, reason: 'Reviewed', reviewer: 'human' }]));
  judgments.source_fidelity.claims = [{ claim: 'Start small.', quote: 'Start small.' }];
  assert.equal(result({ judgments, trendRequested: true }).readiness, 'needs_review');
});

test('lens evaluation snapshots the selected definition and rejects unknown IDs', () => {
  const definition = { id: 'new_lens', label: 'A changing label', instructions: 'Use reflective questions without inventing facts.' };
  const args = { lens: 'new_lens', lensRegistry: { new_lens: definition }, judgments: { lens_fit: { score: 2, reason: 'Reflective opening', reviewer: 'human:Samira' } } };
  const r = result(args);
  assert.deepEqual(r.lensDefinition, definition);
  assert.notEqual(r.lensDefinition, definition);
  assert.equal(r.judgments.find(j => j.id === 'lens_fit').status, 'pass');
  const unknown = result({ ...args, lens: 'removed_lens' });
  assert.equal(unknown.readiness, 'fail');
  assert.equal(unknown.lensDefinition, null);
  assert.equal(unknown.judgments.find(j => j.id === 'lens_fit').status, 'not_assessed');
  assert.equal(result({ lens: 'story' }).lensDefinition.id, 'story');
});
