import { LENSES, DEFAULT_LENS, ratedIds } from '../../prompts/lenses/index.js';
import { readFitResponse } from '../../extension/fit.js';

const normalize = text => text.normalize('NFC').replace(/\s+/gu, ' ').trim();

// Consume the exact saved /fit response used by the UI. The source snapshot is
// mandatory: a rating from a different article must never look like this one's.
export function sourceFitFor({ article, lens, fitAssessment, registry = LENSES, defaultLens = DEFAULT_LENS }) {
  if (!lens || (Object.hasOwn(registry, lens) && !ratedIds(registry, defaultLens).includes(lens))) return { status: 'not_applicable', level: null, reason: 'Pull quote, Pick-up line and unselected lenses are not rated.' };
  if (!Object.hasOwn(registry, lens)) return { status: 'not_assessed', level: null, reason: 'Unknown lens definition.' };
  if (typeof fitAssessment?.article !== 'string' || normalize(fitAssessment.article) !== normalize(article)) {
    return { status: 'not_assessed', level: null, reason: 'A saved /fit response for this exact article is required.' };
  }
  const fit = readFitResponse(fitAssessment.response, ratedIds(registry, defaultLens));
  if (!fit) return { status: 'not_assessed', level: null, reason: 'The /fit response is missing, malformed or no longer covers the current lens definitions.' };
  return { status: 'assessed', ...fit[lens] };
}

// Grade saved actual /fit responses against reference labels. Does not generate ratings.
export function evaluateFit({ fixture, response, reasonReviews = {}, registry = LENSES, defaultLens = DEFAULT_LENS }) {
  const ids = ratedIds(registry, defaultLens);
  const fit = readFitResponse(response, ids);
  const covered = Boolean(fit);
  const checks = [{ id: 'complete_coverage', status: covered ? 'pass' : 'fail' }];
  for (const [id, expected] of Object.entries(fixture.expected)) checks.push({ id, expected, actual: fit?.[id]?.level ?? null,
    status: fit?.[id]?.level === expected ? 'pass' : 'fail' });
  const reasons = ids.map(id => {
    const review = reasonReviews[id];
    const assessed = review && typeof review.pass === 'boolean' && typeof review.reviewer === 'string' && review.reviewer.trim()
      && typeof review.reason === 'string' && review.reason.trim();
    return { id, ...(assessed ? review : {}), status: assessed ? (review.pass ? 'pass' : 'fail') : 'not_assessed' };
  });
  const all = [...checks, ...reasons];
  return { fixtureId: fixture.id, checks, reasons, readiness: all.some(c => c.status === 'fail') ? 'fail'
    : all.some(c => c.status === 'not_assessed') ? 'needs_review' : 'pass' };
}
