// The store build rewrites this line to the live Worker (scripts/package-extension.mjs).
export const DEFAULT_API = 'http://localhost:8787';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// `mood` is a stable lens ID from moods.js, `format` and `platform` stable IDs
// from formats.js. Resolves to the Worker's reply: `post`, plus `posts` for a thread.
export async function writePost(text, { mood, format, platform, code, base = DEFAULT_API, fetcher = fetch } = {}) {
  const response = await fetcher(`${base}/post`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(code && { Authorization: `Bearer ${code}` }) },
    body: JSON.stringify({ text, ...(mood && { mood }), ...(format && { format }), ...(platform && { platform }) }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(body.error?.message ?? `The server said ${response.status}.`, response.status);
  return body;
}

// How well the page suits each lens, so the picker can colour them before the
// author clicks. POST /fit { text } → { fit: { story: { level, reason }, … } },
// level being strong, thin or none. Fit is a hint, never a blocker: if the
// Worker can't rate (no /fit yet, an error), the lenses just stay unrated.
export async function rateFit(text, { code, base = DEFAULT_API, fetcher = fetch } = {}) {
  try {
    const response = await fetcher(`${base}/fit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(code && { Authorization: `Bearer ${code}` }) },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) return null;
    const { fit } = await response.json();
    return fit && typeof fit === 'object' ? fit : null;
  } catch {
    return null;
  }
}

export const characters =text => [...text].length;

export const wordCount = text => text.split(/\s+/).filter(Boolean).length;

export function sourceLabel(page) {
  const host = new URL(page.url).hostname.replace(/^www\./, '');
  const site = host.endsWith('substack.com') ? 'Substack' : host;
  return page.title ? `${page.title} · ${site}` : site;
}
