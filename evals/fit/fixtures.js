import { SAMPLE } from '../../design/sample.js';

// Reference expectations from card 230, not live model results or calibrated labels.
export const FIXTURES = [
  { id: 'no-dialogue-essay', article: 'A small pilot suggests that limiting access may help teams review mistakes. Further research is needed. An example prompt, “Help me with my work”, is too broad.', expected: { dialogue: 'none', confession: 'none', behind: 'none' } },
  { id: 'memoir-scene', article: 'I stood on the freezing platform, gripping a red suitcase. When the last train left, I called my sister and asked for help.', expected: { scene: 'strong', story: 'strong', dialogue: 'none' } },
  { id: 'practical-list', article: 'To prepare your folder: first remove unrelated files. Then give the agent read-only access. Finally, test it on a low-risk task.', expected: { howto: 'strong', confession: 'none', dialogue: 'none' } },
  { id: 'kate-preview-excerpt', article: SAMPLE.page.text, expected: { ...Object.fromEntries(Object.entries(SAMPLE.fit).map(([id, value]) => [id, value.level])) }, note: 'Preview excerpts only, not the full article; inherited design expectations need human calibration.' },
];
