import { selectionFor } from '../prompts/formats/index.js';
import twitter from 'twitter-text';

export const wordCount = text => text.trim().split(/\s+/u).filter(Boolean).length;
export const characterCount = text => Array.from(text.normalize('NFC')).length;

export function parseFormatReply(text) {
  try {
    const value = JSON.parse(text);
    if (value?.abstain === true) return { abstain: true };
    if (typeof value?.content !== 'string' || !value.content.trim() || typeof value.excerpt !== 'string') return null;
    if (value.posts !== undefined && (!Array.isArray(value.posts) || value.posts.some(post => typeof post !== 'string' || !post.trim()))) return null;
    return { post: value.content.trim(), excerpt: value.excerpt.trim(), ...(value.posts ? { posts: value.posts } : {}) };
  } catch { return null; }
}

// Enforce mechanical requirements only. Human voice, factual entailment and
// platform suitability require the separate global evaluation/review workflow.
export function validateFormat(reply, format, platform) {
  if (!selectionFor(format, platform)) return 'unsupported format or platform';
  if (!reply || typeof reply.post !== 'string' || !reply.post.trim()) return 'output content must be a nonempty string';
  if (reply.posts !== undefined && (!Array.isArray(reply.posts) || reply.posts.some(post => typeof post !== 'string' || !post.trim()))) return 'thread posts must be nonempty strings in an array';
  const length = characterCount(reply.post);
  if (format === 'tweet' && !twitter.parseTweet(reply.post).valid) return 'tweet is invalid or exceeds 280 X weighted characters';
  if (format !== 'thread' && reply.posts !== undefined) return 'posts array is only valid for threads';
  if (format === 'essay') {
    if (wordCount(reply.post) > 700) return 'essay exceeds 700 words';
  }
  if (format === 'instagram' && length > 2200) return 'caption exceeds 2200 characters';
  if (format === 'shorts') {
    const words = wordCount(reply.post);
    if (words < 150 || words > 300) return 'script must contain 150–300 spoken words (estimated 60–120 seconds at 150 words/minute)';
  }
  if (format === 'thread') {
    if (!reply.posts || reply.posts.length < 3 || reply.posts.length > 5) return 'thread must contain 3–5 posts';
    if (reply.post !== reply.posts.join('\n\n')) return 'thread content must match its posts';
    if (new Set(reply.posts.map(post => post.trim())).size !== reply.posts.length) return 'thread repeats an identical post';
    const count = platform === 'x' ? post => twitter.parseTweet(post).weightedLength : characterCount;
    if (platform === 'x' && reply.posts.some(post => !twitter.parseTweet(post).valid)) return 'thread contains an invalid X post';
    if (reply.posts.some(post => count(post) > (platform === 'x' ? 280 : 500))) return 'thread post exceeds its platform limit';
  }
  return null;
}
