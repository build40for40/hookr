import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createProviderRegistry, generateText } from 'ai';

export const X_LIMIT = 280;
export const MAX_TEXT = 100_000;
const ATTEMPTS = 3;

export const INSTRUCTIONS = `You turn an author's writing into one post for X.

You are given the text of a page the author wrote. Find the line most likely to stop someone scrolling and build the post around it.

- Use the author's own words. Don't invent facts or claims.
- At most ${X_LIMIT} characters.
- Reply with the post text only: no quotes around it, no hashtags, no preamble.`;

export class TooLongError extends Error {
  name = 'TooLongError';
}

export const characters = text => [...text].length;

export function modelFor(env) {
  const registry = createProviderRegistry({
    anthropic: createAnthropic({ apiKey: env.ANTHROPIC_API_KEY }),
    openai: createOpenAI({ apiKey: env.OPENAI_API_KEY }),
    google: createGoogleGenerativeAI({ apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY }),
  });
  return registry.languageModel(env.MODEL);
}

export async function writePost(model, text) {
  let prompt = text;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    const result = await generateText({ model, instructions: INSTRUCTIONS, prompt });
    const post = result.text.trim();
    if (characters(post) <= X_LIMIT) return post;
    prompt = `${text}\n\nYour last post was ${characters(post)} characters. Write a shorter one, at most ${X_LIMIT}.`;
  }
  throw new TooLongError(`Couldn't get a post under ${X_LIMIT} characters.`);
}
