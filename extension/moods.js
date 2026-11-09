// The lenses an author can pick: kinds of post, not tones or platforms. Pull
// quote is the default and the only one kept word for word; every other lens may
// reword, but every claim must come from the page. Each ID has a sub-prompt in
// prompts/lenses/. The API still calls the field `mood`.
//
// `line` is shown under the chips, so it says what the lens does in plain words
// for an author who has never heard of the style.
export const MOODS = [
  { id: 'line',        name: 'Pull quote',      line: 'Your strongest sentence, exactly as you wrote it.' },
  { id: 'story',       name: 'Story',           line: 'Drops the reader into a moment, then the turn.' },
  { id: 'lesson',      name: 'Lesson',          line: 'What you learned, then the moment that taught you.' },
  { id: 'take',        name: 'Hot take',        line: 'Leads with the point most people would argue with.' },
  { id: 'question',    name: 'Question',        line: 'Opens with a question your piece answers.' },
  { id: 'howto',       name: 'How-to',          line: 'Your practical advice, as steps.' },
  { id: 'cliffhanger', name: 'Cliffhanger',     line: 'The setup, stopping before the payoff, so they read the rest.' },
  { id: 'confession',  name: 'Confession',      line: 'Leads with what you admit, or got wrong.' },
  { id: 'scene',       name: 'Scene',           line: 'One vivid image or detail. No point made.' },
  { id: 'behind',      name: 'Behind the page', line: 'Why you wrote it, or how.' },
  { id: 'dialogue',    name: 'Dialogue',        line: 'Leads with something someone said.' },
];

export const DEFAULT_MOOD = 'line';

export const moodFor = id => MOODS.find(mood => mood.id === id) ?? MOODS[0];

// How well the page suits each lens, from POST /fit. Pull quote is never rated.
// The mark is the second cue next to the colour, for colour-blind readers.
export const FITS = {
  strong: { rank: 0, name: 'Good fit for this piece' },
  thin:   { rank: 1, name: 'Could work, with a stretch' },
  none:   { rank: 2, name: 'Not a great fit for this piece' },
};

// Rated lenses in picker order: Pull quote first, then good fits, stretches and
// reaches, keeping the list's own order within each. Unrated lenses keep their place.
export function ordered(fit) {
  const rank = ({ id }) => (id === DEFAULT_MOOD ? -1 : FITS[fit?.[id]?.level]?.rank ?? 0);
  return MOODS.map((mood, index) => ({ mood, index }))
    .sort((a, b) => rank(a.mood) - rank(b.mood) || a.index - b.index)
    .map(({ mood }) => mood);
}

// The lens to offer instead of a reach: the first good fit, else the first stretch.
export function better(fit) {
  const rated = ordered(fit).filter(({ id }) => id !== DEFAULT_MOOD && fit?.[id]);
  return rated.find(({ id }) => fit[id].level === 'strong') ?? rated.find(({ id }) => fit[id].level === 'thin') ?? MOODS[0];
}
