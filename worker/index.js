import { MAX_TEXT, modelFor, writePost } from './post.js';

// CORS allows any origin: requests never carry cookies.
const headers = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff'
};
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers });
const error = (code, message, status) => json({ error: { code, message } }, status);

async function post(request, env, model) {
  const body = await request.json().catch(() => null);
  const text = typeof body?.text === 'string' ? body.text.trim() : '';
  if (!text) return error('bad_request', 'Send JSON with a "text" field.', 400);
  if (text.length > MAX_TEXT) return error('too_long', `That's over ${MAX_TEXT.toLocaleString('en-GB')} characters. Try a single article.`, 413);
  if (!env.MODEL) return error('not_configured', 'No model is set on the server.', 503);

  try {
    return json({ post: await writePost(model(), text) });
  } catch (cause) {
    console.error('writePost failed', cause);
    return error('upstream', "Couldn't write a post just now. Give it another go.", 502);
  }
}

export async function handle(request, env, model = () => modelFor(env)) {
  const { pathname } = new URL(request.url);
  const method = request.method;
  if (method === 'OPTIONS') return new Response(null, { status: 204, headers });

  if (pathname === '/health' && method === 'GET') return json({ ok: true });
  if (pathname === '/post' && method === 'POST') return post(request, env, model);

  return error('not_found', 'Not found.', 404);
}

export default {
  fetch: (request, env) => handle(request, env)
};
