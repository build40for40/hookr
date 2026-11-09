// Prints a fresh access code for one person, plus the name:code pair for ACCESS_CODES.
//
//   npm run access-code -- kate
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const NAME = /^[a-z0-9][a-z0-9-]{0,31}$/;

export const newCode = () => randomBytes(18).toString('base64url');

export function pairFor(name, code = newCode()) {
  if (!NAME.test(name ?? '')) {
    throw new Error('Give a short lowercase name, such as kate or chrome-review: letters, digits and hyphens.');
  }
  return { code, pair: `${name}:${code}` };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const { code, pair } = pairFor(process.argv[2]);
    console.log(`Code to send them:     ${code}`);
    console.log(`Pair for ACCESS_CODES: ${pair}`);
    console.log('\nAdd the pair to the full comma separated list, then: npm run wrangler -- secret put ACCESS_CODES');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
