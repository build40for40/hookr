// The store build rewrites this line to the live Worker (scripts/package-extension.mjs).
export const DEFAULT_API = 'http://localhost:8787';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// `mood` is a stable lens ID from moods.js; the Worker resolves its sub-prompt.
export async function writePost(text, { mood, code, base = DEFAULT_API, fetcher = fetch } = {}) {
  const response = await fetcher(`${base}/post`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(code && { Authorization: `Bearer ${code}` }) },
    body: JSON.stringify(mood ? { text, mood } : { text }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(body.error?.message ?? `The server said ${response.status}.`, response.status);
  return body.post;
}

export const characters = text => [...text].length;

export const wordCount = text => text.split(/\s+/).filter(Boolean).length;

export function sourceLabel(page) {
  const host = new URL(page.url).hostname.replace(/^www\./, '');
  const site = host.endsWith('substack.com') ? 'Substack' : host;
  return page.title ? `${page.title} · ${site}` : site;
}
