// The lenses an author can pick: kinds of post, not tones or platforms. Pull
// quote is the default and the only one kept word for word; every other lens may
// reword, but every claim must come from the page. Each ID has a sub-prompt in
// prompts/lenses/. The API still calls the field `mood`.
//
// `line` is shown under the chips, so it says what the lens does in plain words
// for an author who has never heard of the style.
//
// `reasons` are the fallback why-sentences when /fit gives no reason of its
// own: `strong` for a good fit, `thin` for a stretch, `none` for a poor fit.
// Pull quote is never rated.
export const MOODS = [
  { id: 'line', name: 'Pull quote', line: 'Your strongest sentence, exactly as you wrote it.' },
  { id: 'story', name: 'Story', line: 'Drops the reader into a moment, then the turn.', reasons: {
    strong: "There's a clear moment here to drop the reader into.",
    thin: "There's a moment here, but not much of one.",
    none: "There's no moment on this page to drop the reader into." } },
  { id: 'lesson', name: 'Lesson', line: 'What you learned, then the moment that taught you.', reasons: {
    strong: "There's a lesson here, and the moment that taught it.",
    thin: "The lesson is here, but not the moment that taught it.",
    none: "This page doesn't draw a lesson from anything that happened." } },
  { id: 'take', name: 'Hot take', line: 'Leads with the point most people would argue with.', reasons: {
    strong: "There's a point here that many people would argue with.",
    thin: "There's a point here, but not one many people would argue with.",
    none: "Nothing on this page goes against what most people think." } },
  { id: 'question', name: 'Question', line: 'Opens with a question your piece answers.', reasons: {
    strong: "This page answers a question readers already have.",
    thin: "There's an answer here, but it's hard to frame as a question.",
    none: "This page doesn't answer a question a reader would ask." } },
  { id: 'howto', name: 'How-to', line: 'Your practical advice, as steps.', reasons: {
    strong: "There's practical advice here that turns into clear steps.",
    thin: "There's some advice here, but not enough for clear steps.",
    none: "There's no practical advice on this page to turn into steps." } },
  { id: 'cliffhanger', name: 'Cliffhanger', line: 'The setup, stopping before the payoff, so they read the rest.', reasons: {
    strong: "There's a setup here worth holding the payoff back for.",
    thin: "There's a payoff here, but not much of a setup.",
    none: "There's no setup and payoff on this page to hold back." } },
  { id: 'confession', name: 'Confession', line: 'Leads with what you admit, or got wrong.', reasons: {
    strong: "You admit something here worth leading with.",
    thin: "There's only a small admission here to lead with.",
    none: "There's no admission on this page, and nothing you say you got wrong." } },
  { id: 'scene', name: 'Scene', line: 'One vivid image or detail. No point made.', reasons: {
    strong: "There's a vivid image here that can stand on its own.",
    thin: "There's only one small image here to work with.",
    none: "There's no vivid image or detail on this page to show." } },
  { id: 'behind', name: 'Behind the page', line: 'Why you wrote it, or how.', reasons: {
    strong: "You say here why or how you wrote it.",
    thin: "There's only a hint of why you wrote it.",
    none: "This page doesn't say why or how you wrote it." } },
  { id: 'dialogue', name: 'Dialogue', line: 'Leads with something someone said.', reasons: {
    strong: "Someone speaks on this page, and it's worth leading with.",
    thin: "There's only a line or two of speech to work with.",
    none: "No one speaks on this page." } },
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
