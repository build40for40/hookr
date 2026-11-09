// Checks a post against the page it came from, so the author can see where it
// came from or that it isn't word for word. Kate's brief: anything that can't
// be traced back to her writing gets flagged.

// Curly quotes, spacing and case don't count as changes.
const normalise = text => text
  .replace(/[‘’]/g, "'")
  .replace(/[“”]/g, '"')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase();

export const paragraphs = text => text.split(/\n+/).map(line => line.trim()).filter(Boolean);

// A post's pieces: its sentences and its lines. Trailing punctuation is
// dropped, so a passage cut short ("…all of it.") still matches the page.
export const pieces = post => post
  .split(/(?<=[.!?…])\s+|\n+/)
  .map(piece => normalise(piece).replace(/[.!?…,;:]+$/, ''))
  .filter(Boolean);

// { found: true, paragraph, excerpt } when every piece of the post is on the
// page word for word; { found: false, missing } when any piece isn't.
export function trace(post, pageText) {
  const source = paragraphs(pageText);
  const lower = source.map(normalise);
  const missing = [];
  let first = -1;
  for (const piece of pieces(post)) {
    const at = lower.findIndex(paragraph => paragraph.includes(piece));
    if (at === -1) missing.push(piece);
    else if (first === -1) first = at;
  }
  if (missing.length || first === -1) return { found: false, missing };
  return { found: true, paragraph: first + 1, excerpt: source[first] };
}

export function clip(text, max = 90) {
  if ([...text].length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(' ') > 0 ? cut.lastIndexOf(' ') : max)}…`;
}
