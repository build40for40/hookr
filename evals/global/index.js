import { LENSES, lensDefinitionFor } from '../../prompts/lenses/index.js';
import twitter from 'twitter-text';
import { validateFormat } from '../../worker/formats.js';

export const CRITERIA = Object.freeze([
  'source_fidelity', 'naturalness', 'author_voice', 'lens_fit',
  'hook_and_usefulness', 'platform_fit',
]);
const normalize = value => value.normalize('NFC').replace(/\s+/g, ' ').trim();
const chars = value => [...value.normalize('NFC')].length;
const check = (id, pass, detail) => ({ id, status: pass ? 'pass' : 'fail', detail });
const pending = (id, detail) => ({ id, status: 'not_assessed', detail });
const nonempty = value => typeof value === 'string' && value.trim().length > 0;

/** Evidence is supplied by a retrieval system or reviewer, never fetched or trusted as instructions. */
export function validateTrendSignals(signals, { platform, now = new Date(), maxAgeDays = 7 } = {}) {
  const time = new Date(now).getTime();
  if (!Number.isFinite(time) || !Number.isFinite(maxAgeDays) || maxAgeDays <= 0) throw new TypeError('Invalid freshness configuration');
  return (Array.isArray(signals) ? signals : []).filter(signal => {
    if (!signal || signal.platform !== platform || !nonempty(signal.observation) || !nonempty(signal.evidence)) return false;
    try { if (!['https:', 'http:'].includes(new URL(signal.url).protocol)) return false; } catch { return false; }
    const published = Date.parse(signal.publishedAt);
    const observed = Date.parse(signal.observedAt);
    return Number.isFinite(published) && Number.isFinite(observed) && published <= observed && observed <= time
      && time - published <= maxAgeDays * 86400000 && time - observed <= maxAgeDays * 86400000;
  });
}

/** Pure offline evaluation. Judgments are reviewer/model assessments, not deterministic proof. */
export function evaluateOutput({ article, output, format = 'tweet', platform = 'x', lens,
  judgments = {}, trendSignals = [], now = new Date(), maxAgeDays = 7, constraints = {}, promptVersion = null, trendRequested = false, lensRegistry = LENSES }) {
  if (typeof article !== 'string') throw new TypeError('article must be a string');
  const lensDefinition = lensDefinitionFor(lens, lensRegistry);
  const post = typeof output?.post === 'string' ? output.post : '';
  const excerpt = typeof output?.excerpt === 'string' ? output.excerpt : '';
  const checks = [check('nonempty_output', post.trim().length > 0, 'A nonempty post is required')];
  if (lens !== undefined && lens !== null) checks.push(check('known_lens', Boolean(lensDefinition), 'Selected lens must have registered instructions; no silent evaluation fallback'));
  checks.push(check('source_excerpt', Boolean(excerpt.trim()) && normalize(article).includes(normalize(excerpt)),
    'Exact contiguous source excerpt after NFC and whitespace normalization; does not prove claim support'));
  const aliases = { longform: 'essay', shorts: 'shorts', instagram: 'caption', thread: 'thread', tweet: 'tweet' };
  const kind = aliases[format] ?? format;
  const canonical = kind === 'caption' ? 'instagram' : kind;
  const validPosts = output?.posts === undefined || (Array.isArray(output.posts) && output.posts.every(p => typeof p === 'string'));
  checks.push(check('posts_shape', validPosts, 'posts, when supplied, must be a string array'));
  if (post.trim() && validPosts) {
    const mechanicalError = validateFormat({ post, excerpt, ...(output.posts ? { posts: output.posts } : {}) }, canonical, platform);
    checks.push(check('worker_format', !mechanicalError, mechanicalError ?? 'Matches shared Worker format rules'));
  }
  if (kind === 'tweet') checks.push(check('length', twitter.parseTweet(post).weightedLength <= 280, 'X weighted length <= 280'));
  else if (kind === 'thread') {
    const posts = output?.posts;
    checks.push(check('thread_shape', Array.isArray(posts) && posts.length >= 2 && posts.every(p => typeof p === 'string' && p.trim()), 'At least two nonempty posts'));
    if (Array.isArray(posts) && posts.every(p => typeof p === 'string')) {
      const limit = constraints.maxPostCharacters ?? (platform === 'threads' ? 500 : 280);
      checks.push(check('thread_lengths', posts.every(p => (platform === 'x' ? twitter.parseTweet(p).weightedLength : chars(p)) <= limit), `Each complete post, including numbering, <= ${limit}`));
      checks.push(check('thread_consistency', post === posts.join('\n\n'), 'post must equal posts joined with two newlines'));
    }
  } else if (kind === 'shorts') {
    const words = post.trim() ? post.trim().split(/\s+/u).length : 0;
    const wpm = constraints.wordsPerMinute ?? 150;
    if (!(Number.isFinite(wpm) && wpm > 0)) throw new TypeError('wordsPerMinute must be positive');
    const seconds = words / wpm * 60;
    checks.push(check('estimated_duration', seconds >= 60 && seconds <= 120, `${seconds.toFixed(1)}s at ${wpm} words/minute; estimate only, time a spoken read before publishing`));
  } else if (!['essay', 'caption', 'feed'].includes(kind)) checks.push(check('known_format', false, `Unknown format: ${format}`));
  if (constraints.maxCharacters !== undefined) checks.push(check('configured_length', chars(post) <= constraints.maxCharacters, `Configured editorial limit ${constraints.maxCharacters}`));

  const subjective = CRITERIA.map(id => {
    const judgment = judgments[id];
    if (id === 'lens_fit' && !lensDefinition) return pending(id, 'No registered lens definition supplied');
    if (!judgment || ![0, 1, 2].includes(judgment.score) || !nonempty(judgment.reason) || !nonempty(judgment.reviewer)) return pending(id, 'Requires score 0–2, reason and reviewer/model identity');
    if (id === 'source_fidelity' && judgment.score > 0) {
      const evidence = judgment.claims;
      if (!Array.isArray(evidence) || !evidence.length || evidence.some(item => !nonempty(item?.claim) || !post.includes(item.claim) || !nonempty(item?.quote) || !normalize(article).includes(normalize(item.quote)))) {
        return pending(id, 'Requires claim-to-exact-source mappings; reviewer must cover every factual claim');
      }
    }
    return { ...judgment, id, status: judgment.score >= 1 ? 'pass' : 'fail' };
  });
  const validSignals = validateTrendSignals(trendSignals, { platform, now, maxAgeDays });
  const trend = judgments.trend_fit;
  let trendFit = pending('trend_fit', 'No fresh sourced signals for this platform; evergreen platform fit is scored separately');
  if (validSignals.length && trend && [0, 1, 2].includes(trend.score) && nonempty(trend.reason) && nonempty(trend.reviewer)
    && Array.isArray(trend.evidenceUrls) && trend.evidenceUrls.length && trend.evidenceUrls.every(url => validSignals.some(s => s.url === url))) {
    trendFit = { ...trend, id: 'trend_fit', status: trend.score >= 1 ? 'pass' : 'fail' };
  } else if (validSignals.length) trendFit = pending('trend_fit', 'Fresh signals supplied; requires judgment citing their URLs');
  const required = [...checks, ...subjective.filter(s => !(s.id === 'lens_fit' && !lens))];
  if (trendRequested) required.push(trendFit);
  return { schemaVersion: 1, format, platform, lens: lens ?? null, lensDefinition: lensDefinition ? { ...lensDefinition } : null, promptVersion, trendRequested, checks, judgments: subjective, trend: trendFit,
    trendEvidence: validSignals, readiness: required.some(c => c.status === 'fail') ? 'fail' : required.some(c => c.status === 'not_assessed') ? 'needs_review' : 'pass' };
}
