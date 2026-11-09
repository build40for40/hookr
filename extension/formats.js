import { characters, wordCount } from './api.js';

// Where a page can go. IDs are the Worker's (prompts/formats/index.js); names are
// ours to change. `limit` caps each post, in characters.
export const FORMATS = [
  {
    id: 'tweet', name: 'Tease', line: 'One post for X, up to 280 characters.',
    platforms: [{ id: 'x', name: 'X', limit: 280 }], loading: 'Finding your best angle…',
  },
  {
    id: 'thread', name: 'Pearls', line: 'A thread: three to five posts on one string.',
    platforms: [{ id: 'x', name: 'X', limit: 280 }, { id: 'threads', name: 'Threads', limit: 500 }], loading: 'Stringing your pearls…',
  },
  {
    id: 'feed', name: 'Charmer', line: 'One post for the feed, up to 500 characters.',
    platforms: [{ id: 'linkedin', name: 'LinkedIn', limit: 500 }, { id: 'threads', name: 'Threads', limit: 500 }], loading: 'Warming up the room…',
  },
  {
    id: 'essay', name: 'Slow Burn', line: 'A long read, up to 700 words.',
    platforms: [{ id: 'substack', name: 'Substack' }, { id: 'linkedin', name: 'LinkedIn' }, { id: 'x', name: 'X' }], loading: 'Slipping into something longer…',
  },
  {
    id: 'shorts', name: 'Screen Test', line: 'A YouTube Shorts script, 60 to 120 seconds spoken.',
    platforms: [{ id: 'youtube', name: 'YouTube' }], loading: 'Getting camera ready…',
  },
  {
    id: 'instagram', name: 'Flash', line: 'An Instagram caption.',
    platforms: [{ id: 'instagram', name: 'Instagram', limit: 2200 }], loading: 'Finding your best angle…',
  },
];

export const DEFAULT_FORMAT = 'tweet';

export const formatFor = id => FORMATS.find(format => format.id === id) ?? FORMATS[0];

export const platformFor = (format, id) => format.platforms.find(platform => platform.id === id) ?? format.platforms[0];

export const copyLabel = (format, platform) => (format.id === 'thread' ? 'Copy the thread' : `Copy for ${platform.name}`);

const SPOKEN_WORDS_PER_MINUTE = 150;

// The length line under a result, and whether an edit has pushed it over.
// X posts and feed posts count characters, threads count posts, Shorts estimate
// the spoken time, and long reads and captions count words.
export function measure(format, platform, posts) {
  const text = posts.join('\n\n');
  const over = platform.limit ? posts.some(post => characters(post) > platform.limit) : false;
  const words = wordCount(text).toLocaleString('en-GB');
  if (format.id === 'thread') return { meta: `${posts.length} posts`, over };
  if (format.id === 'shorts') return { meta: `about ${Math.round(wordCount(text) / SPOKEN_WORDS_PER_MINUTE * 60)} seconds`, over };
  if (format.id === 'essay' || format.id === 'instagram') return { meta: `${words} words`, over };
  const count = characters(text);
  return { meta: `${count} / ${platform.limit}${over ? ` · ${count - platform.limit} over` : ''}`, over };
}
