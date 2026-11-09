import { LENSES, DEFAULT_LENS } from '../../prompts/lenses/index.js';

// Grade saved actual /fit responses against reference labels. Does not generate ratings.
export function evaluateFit({ fixture, response, reasonReviews = {}, registry = LENSES, defaultLens = DEFAULT_LENS }) {
  const ids = Object.keys(registry).filter(id => id !== defaultLens);
  const fit = response?.fit;
  const covered = fit && !Array.isArray(fit) && typeof fit === 'object'
    && Object.keys(fit).length === ids.length && ids.every(id => Object.hasOwn(fit, id)
      && ['strong', 'thin', 'none'].includes(fit[id]?.level) && typeof fit[id]?.reason === 'string' && fit[id].reason.trim());
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
