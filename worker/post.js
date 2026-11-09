import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createProviderRegistry, generateText } from 'ai';
import twitter from 'twitter-text';
import { instructionsFor } from './lenses.js';

export const X_LIMIT = 280;
export const MAX_TEXT = 100_000;
const ATTEMPTS = 3;

export class InsufficientSourceError extends Error {
  name = 'InsufficientSourceError';
}

export class NoValidPostError extends Error {
  name = 'NoValidPostError';
}

export const weightedLength = text => twitter.parseTweet(text).weightedLength;

const LABEL = /^[*_\s]*(post|supporting excerpt)[*_\s]*:[*_]*\s*/i;

export function parseReply(text) {
  const fields = {};
  let current;
  for (const line of text.split('\n')) {
    const label = line.match(LABEL);
    if (label) {
      current = label[1].toLowerCase();
      fields[current] = [line.slice(label[0].length)];
    } else if (current) {
      fields[current].push(line);
    }
  }
  const post = fields.post?.join('\n').trim();
  const excerpt = fields['supporting excerpt']?.join('\n').trim();
  return post ? { post, excerpt: excerpt ?? '' } : null;
}

const QUOTES = /^["“”'‘’«»]+|["“”'‘’«»]+$/g;
const comparable = text => text
  .normalize('NFC')
  .replace(/[“”«»]/g, '"')
  .replace(/[‘’]/g, "'")
  .replace(/\s+/g, ' ')
  .trim();

export function excerptInArticle(excerpt, article) {
  const needle = comparable(excerpt.replace(QUOTES, ''));
  return needle.length > 0 && comparable(article).includes(needle);
}

export function modelFor(env) {
  const registry = createProviderRegistry({
    anthropic: createAnthropic({ apiKey: env.ANTHROPIC_API_KEY }),
    openai: createOpenAI({ apiKey: env.OPENAI_API_KEY }),
    google: createGoogleGenerativeAI({ apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY }),
  });
  return registry.languageModel(env.MODEL);
}

export async function writePost(model, article, { mood } = {}) {
  const instructions = instructionsFor(mood);
  const problems = [];
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    const { text } = await generateText({
      model,
      instructions,
      prompt: `ARTICLE DATA\n\n${article}`,
      providerOptions: { anthropic: { fallbacks: 'default' } },
    });
    const reply = parseReply(text);
    if (!reply) throw new InsufficientSourceError(text.trim());

    const length = weightedLength(reply.post);
    if (length > X_LIMIT) problems.push(`post was ${length} weighted characters`);
    else if (!excerptInArticle(reply.excerpt, article)) problems.push('excerpt was not in the article');
    else return { post: reply.post, excerpt: reply.excerpt.replace(QUOTES, ''), length };
  }
  throw new NoValidPostError(`No valid post after ${ATTEMPTS} tries: ${problems.join('; ')}.`);
}
