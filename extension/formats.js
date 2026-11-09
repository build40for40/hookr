import { characters, wordCount } from './api.js';

// Where a page can go. IDs are the Worker's (prompts/formats/index.js); names are
// ours to change, so the Shorts script shows as TikTok. `limit` caps each post,
// in characters. `noun` names the result.
export const FORMATS = [
  { id: 'tweet', name: 'X', noun: 'post', line: 'One post, up to 280 characters.', platforms: [{ id: 'x', name: 'X', limit: 280 }] },
  { id: 'feed', name: 'LinkedIn', noun: 'post', line: 'One post, up to 500 characters.', platforms: [{ id: 'linkedin', name: 'LinkedIn', limit: 500 }] },
  {
    id: 'thread', name: 'Threads', noun: 'thread', line: 'Three to five posts.',
    platforms: [{ id: 'x', name: 'X', limit: 280 }, { id: 'threads', name: 'Threads', limit: 500 }],
  },
  {
    id: 'essay', name: 'Essay', noun: 'essay', line: 'A long read, up to 700 words.',
    platforms: [{ id: 'substack', name: 'Substack' }, { id: 'linkedin', name: 'LinkedIn' }, { id: 'x', name: 'X' }],
  },
  { id: 'shorts', name: 'TikTok script', noun: 'script', line: 'A script, 60 to 120 seconds spoken.', platforms: [{ id: 'youtube', name: 'TikTok' }] },
  { id: 'instagram', name: 'Instagram', noun: 'caption', line: 'One caption.', platforms: [{ id: 'instagram', name: 'Instagram', limit: 2200 }] },
];

export const DEFAULT_FORMAT = 'tweet';

export const formatFor = id => FORMATS.find(format => format.id === id) ?? FORMATS[0];

export const platformFor = (format, id) => format.platforms.find(platform => platform.id === id) ?? format.platforms[0];

export const postLabel = (format, platform) => `Your ${format.noun} for ${platform.name}`;

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
