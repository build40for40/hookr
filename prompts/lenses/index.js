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

// Stable IDs are the API contract; labels and UI styling can change independently.
// Retired IDs (elegant, calm, light, serious, dramatic, beast, tiktok) fall back to Pull quote.
export const DEFAULT_LENS = 'line';
export const LENS_PROMPTS = Object.freeze({ line, story, lesson, take, question, howto, cliffhanger, confession, scene, behind, dialogue });

export function lensFor(id) {
  return typeof id === 'string' && Object.hasOwn(LENS_PROMPTS, id) ? id : DEFAULT_LENS;
}
