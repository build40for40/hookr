// Shared by the Worker, UI and offline evaluations. These levels describe
// source suitability, never the quality of a generated answer.
export const FIT_LEVELS = Object.freeze(['strong', 'thin', 'none']);
export function isFitRating(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && FIT_LEVELS.includes(value.level) && typeof value.reason === 'string'
    && Boolean(value.reason.trim()) && value.reason.length <= 300
    && !/[\r\n]/u.test(value.reason)
    && [...new Intl.Segmenter('en', { granularity: 'sentence' }).segment(value.reason.trim())].length === 1;
}

// Require one result per currently rated lens, with no unknown IDs. Return a
// snapshot so review records cannot change when the caller edits the response.
export function readFitResponse(response, ratedIds) {
  const fit = response?.fit;
  if (!fit || typeof fit !== 'object' || Array.isArray(fit)
    || Object.keys(fit).length !== ratedIds.length
    || !ratedIds.every(id => Object.hasOwn(fit, id) && isFitRating(fit[id]))) return null;
  return Object.fromEntries(ratedIds.map(id => [id, { level: fit[id].level, reason: fit[id].reason.trim() }]));
}
