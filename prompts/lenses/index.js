import elegant from './elegant.js';
import calm from './calm.js';
import light from './light.js';
import serious from './serious.js';
import dramatic from './dramatic.js';
import beast from './beast.js';
import tiktok from './tiktok.js';

// Stable IDs are the API contract; labels and UI styling can change independently.
export const DEFAULT_LENS = 'elegant';
export const LENS_PROMPTS = Object.freeze({ elegant, calm, light, serious, dramatic, beast, tiktok });

export function lensFor(id) {
  return typeof id === 'string' && Object.hasOwn(LENS_PROMPTS, id) ? id : DEFAULT_LENS;
}
