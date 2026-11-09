import { MOODS } from '../../extension/moods.js';
import line from './line.js';
import story from './story.js';
import lesson from './lesson.js';
import take from './take.js';
import question from './question.js';
import howto from './howto.js';
import cliffhanger from './cliffhanger.js';
import confession from './confession.js';
import scene from './scene.js';
import behind from './behind.js';
import dialogue from './dialogue.js';
import pickup from './pickup.js';

// Stable IDs are the API contract; labels and UI styling can change independently.
// Retired IDs (elegant, calm, light, serious, dramatic, beast, tiktok) fall back to Pull quote.
export const DEFAULT_LENS = 'line';
export const LENS_PROMPTS = Object.freeze({ line, story, lesson, take, question, howto, cliffhanger, confession, scene, behind, dialogue, pickup });

export function lensFor(id) {
  return typeof id === 'string' && Object.hasOwn(LENSES, id) ? id : DEFAULT_LENS;
}

// One descriptor per selectable lens: the UI owns stable IDs/labels, individual
// files own style instructions. Evaluation consumes these same instructions.
// No fixed lens count: additions become available to Worker and eval together.
export function createLensRegistry(moods, prompts) {
  const entries = moods.map(({ id, name, rated }) => {
    if (typeof id !== 'string' || !/^[a-z][a-z0-9_-]*$/.test(id)
      || typeof name !== 'string' || !name.trim()
      || !Object.hasOwn(prompts, id) || typeof prompts[id] !== 'string' || !prompts[id].trim()) {
      throw new TypeError(`Missing or invalid lens definition: ${id}`);
    }
    return [id, Object.freeze({ id, label: name, instructions: prompts[id], rated: rated !== false })];
  });
  if (new Set(entries.map(([id]) => id)).size !== entries.length) throw new TypeError('Duplicate lens IDs');
  return Object.freeze(Object.fromEntries(entries));
}

export const LENSES = createLensRegistry(MOODS, LENS_PROMPTS);

// The lenses /fit rates: all but the default and any marked `rated: false`
// (Pick-up line works on any page). Entries without the flag are rated.
export function ratedIds(registry = LENSES, defaultLens = DEFAULT_LENS) {
  return Object.values(registry).filter(lens => lens.id !== defaultLens && lens.rated !== false).map(lens => lens.id);
}
export function lensDefinitionFor(id, registry = LENSES) {
  return typeof id === 'string' && Object.hasOwn(registry, id) ? registry[id] : null;
}
