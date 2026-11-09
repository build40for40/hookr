// import { bearer, parseCodes, personFor } from './access.js';
import { InsufficientSourceError, MAX_TEXT, modelFor, NoValidPostError, writePost } from './post.js';
import { rateFit } from './fit.js';
import { selectionFor } from '../prompts/formats/index.js';

// CORS allows any origin: requests never carry cookies.
const headers = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff'
};
const json = (body, status = 200, extra = {}) => new Response(JSON.stringify(body), { status, headers: { ...headers, ...extra } });
const error = (code, message, status, extra) => json({ error: { code, message } }, status, extra);

async function post(request, env, model, mode = 'post') {
  // Access codes are off for now. To turn them back on, restore these lines,
  // key the rate limit by `person` and log it again.
  // const codes = parseCodes(env.ACCESS_CODES);
  // if (!codes.length) return error('not_configured', "Access codes aren't set up on the server.", 503);
  // const person = await personFor(bearer(request), codes);
  // if (!person) return error('unauthorised', "That access code didn't work.", 401, { 'WWW-Authenticate': 'Bearer' });
  const caller = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  const limit = await env.POSTS_PER_PERSON?.limit({ key: caller });
  if (limit && !limit.success) return error('rate_limited', "That's a lot of hooks in one minute. Give it a moment.", 429, { 'Retry-After': '60' });

  const body = await request.json().catch(() => null);
  const text = typeof body?.text === 'string' ? body.text.trim() : '';
  if (!text) return error('bad_request', 'Send JSON with a "text" field.', 400);
  if (text.length > MAX_TEXT) return error('too_long', `That's over ${MAX_TEXT.toLocaleString('en-GB')} characters. Try a single article.`, 413);
  if (mode === 'fit') {
    if (!env.MODEL) return error('not_configured', 'No model is set on the server.', 503);
    try {
      const rated = await rateFit(model(), text);
      console.log({ event: 'fit' });
      return json(rated);
    } catch {
      // No fallback ratings: the extension intentionally leaves all lenses unrated.
      console.error('rateFit failed');
      return error('no_valid_fit', "Couldn't assess this page just now.", 502);
    }
  }
  if (body.mood !== undefined && (typeof body.mood !== 'string' || body.mood.length > 64)) return error('bad_request', 'Mood must be a short lens ID.', 400);
  const selection = selectionFor(body.format, body.platform);
  if (!selection) return error('bad_request', 'Choose a supported format and platform. See prompts/formats/README.md.', 400);
  if (!env.MODEL) return error('not_configured', 'No model is set on the server.', 503);

  try {
    const written = await writePost(model(), text, { mood: body.mood, ...selection });
    console.log({ event: 'post', mood: body.mood ?? null, ...selection });
    return json(written);
  } catch (cause) {
    if (cause instanceof InsufficientSourceError) {
      return error('insufficient_source', "There isn't enough in this page to write a post from.", 422);
    }
    console.error('writePost failed', cause);
    if (cause instanceof NoValidPostError) {
      return error('no_valid_post', "Couldn't write a post that fits and quotes the page. Give it another go.", 502);
    }
    return error('upstream', "Couldn't write a post just now. Give it another go.", 502);
  }
}

export async function handle(request, env, model = () => modelFor(env)) {
  const { pathname } = new URL(request.url);
  const method = request.method;
  if (method === 'OPTIONS') return new Response(null, { status: 204, headers });

  if (pathname === '/health' && method === 'GET') return json({ ok: true });
  if (pathname === '/fit' && method === 'POST') return post(request, env, model, 'fit');
  if (pathname === '/post' && method === 'POST') return post(request, env, model);

  return error('not_found', 'Not found.', 404);
}

export default {
  fetch: (request, env) => handle(request, env)
};
