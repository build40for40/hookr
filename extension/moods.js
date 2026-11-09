// The moods an author can pick. Each one's colours and type live in panel.css
// under [data-mood="id"]. MrBeast and TikTok are working names: rename them
// before the store listing.
export const MOODS = [
  { id: 'elegant',  name: 'Elegant',      line: 'Say less. Mean all of it.' },
  { id: 'calm',     name: 'Calm',         line: 'Big thoughts. Indoor voice.' },
  { id: 'light',    name: 'Light',        line: 'Smart, with its shoes off.' },
  { id: 'serious',  name: 'Serious',      line: 'Fewer adjectives. More consequences.' },
  { id: 'dramatic', name: 'Dramatic',     line: 'Cue the cello.' },
  { id: 'beast',    name: 'MrBeast mode', line: 'I gave this paragraph $10,000.' },
  { id: 'tiktok',   name: 'TikTok mode',  line: 'Hooked before the thumb moves.' },
];

export const DEFAULT_MOOD = 'elegant';

export const moodFor = id => MOODS.find(mood => mood.id === id) ?? MOODS[0];
