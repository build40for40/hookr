// ACCESS_CODES is a Worker secret of `name:code` pairs, comma separated.
export function parseCodes(raw = '') {
  return raw.split(',').flatMap(entry => {
    const split = entry.indexOf(':');
    const name = entry.slice(0, split).trim();
    const code = entry.slice(split + 1).trim();
    return split > 0 && name && code ? [{ name, code }] : [];
  });
}

export function bearer(request) {
  return request.headers.get('Authorization')?.match(/^Bearer\s+(\S+)\s*$/i)?.[1] ?? null;
}

const digest = async text => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));

// Equal-length digests compared without an early exit, so timing says nothing about the code.
function same(a, b) {
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

// Checks every entry, even after a match, and returns the matching person's name or null.
export async function personFor(code, codes) {
  if (!code) return null;
  const given = await digest(code);
  let person = null;
  for (const entry of codes) {
    if (same(given, await digest(entry.code)) && person === null) person = entry.name;
  }
  return person;
}
