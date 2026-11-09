// Builds the Chrome Web Store ZIP into dist/ from an explicit runtime allowlist.
//
//   npm run extension:package          store build: live API only, ready to upload
//   npm run extension:package -- --dev same files, but keeps localhost for local testing
//
// Anything in extension/ that isn't in RUNTIME_FILES or a *.test.js file stops the build.
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const NAME = 'hookr';
export const LIVE_API = 'https://hookr-api.40for40.workers.dev';
export const RUNTIME_FILES = [
  'manifest.json', 'api.js', 'page.js', 'popup.html', 'popup.css', 'popup.js',
  'icons/icon-16.png', 'icons/icon-32.png', 'icons/icon-48.png', 'icons/icon-128.png',
];
const DEV_API_LINE = /^export const DEFAULT_API = 'http:\/\/localhost:8787';$/m;
const VERSION = /^(0|[1-9][0-9]{0,4})(\.(0|[1-9][0-9]{0,4})){0,3}$/;
const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//;

export function storeManifest(manifest) {
  const out = structuredClone(manifest);
  out.host_permissions = (out.host_permissions ?? []).filter(origin => !LOCAL_ORIGIN.test(origin));
  delete out.key;
  return out;
}

export function storeApi(source, api = LIVE_API) {
  if (!DEV_API_LINE.test(source)) {
    throw new Error("extension/api.js no longer has `export const DEFAULT_API = 'http://localhost:8787';`. Update the store rewrite in scripts/package-extension.mjs.");
  }
  return source.replace(DEV_API_LINE, `export const DEFAULT_API = '${api}';`);
}

function referencedFiles(manifest) {
  return [
    ...Object.values(manifest.icons ?? {}),
    ...Object.values(manifest.action?.default_icon ?? {}),
    manifest.action?.default_popup,
    manifest.options_ui?.page,
    manifest.side_panel?.default_path,
    manifest.background?.service_worker,
    ...(manifest.content_scripts ?? []).flatMap(script => [...(script.js ?? []), ...(script.css ?? [])]),
  ].filter(Boolean);
}

export function checkManifest(manifest) {
  const problems = [];
  if (manifest.manifest_version !== 3) problems.push('manifest_version must be 3');
  if (!VERSION.test(manifest.version ?? '') || manifest.version.split('.').every(part => Number(part) === 0)) problems.push('version must be a nonzero Chrome version such as 0.1.0');
  if (!manifest.name || manifest.name.length > 75) problems.push('name is required and at most 75 characters');
  if (!manifest.description || manifest.description.length > 132) problems.push('description is required and at most 132 characters (Chrome Web Store limit)');
  for (const size of ['16', '32', '48', '128']) {
    if (manifest.icons?.[size] !== `icons/icon-${size}.png`) problems.push(`icons.${size} must be icons/icon-${size}.png`);
  }
  for (const file of referencedFiles(manifest)) {
    if (!RUNTIME_FILES.includes(file)) problems.push(`${file} is referenced by the manifest but not in RUNTIME_FILES`);
  }
  return problems;
}

export function buildPackage({ root, dev = false, outDir = join(root, 'dist') }) {
  const source = join(root, 'extension');

  const found = [];
  (function walk(dir, prefix) {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name), rel = prefix ? `${prefix}/${name}` : name;
      if (lstatSync(path).isSymbolicLink()) throw new Error(`Runtime files must not be symbolic links: ${rel}`);
      lstatSync(path).isDirectory() ? walk(path, rel) : found.push(rel);
    }
  })(source, '');
  const unexpected = found.filter(rel => !RUNTIME_FILES.includes(rel) && !rel.endsWith('.DS_Store') && !rel.endsWith('.test.js'));
  if (unexpected.length) throw new Error(`Review the runtime allowlist before packaging: ${unexpected.join(', ')}`);
  const missing = RUNTIME_FILES.filter(rel => !existsSync(join(source, rel)));
  if (missing.length) throw new Error(`Missing runtime files: ${missing.join(', ')}`);

  let manifest = JSON.parse(readFileSync(join(source, 'manifest.json'), 'utf8'));
  const problems = checkManifest(manifest);
  if (problems.length) throw new Error(`Fix the manifest before packaging:\n- ${problems.join('\n- ')}`);
  let api = readFileSync(join(source, 'api.js'), 'utf8');
  if (!dev) {
    manifest = storeManifest(manifest);
    api = storeApi(api);
    if (!manifest.host_permissions.includes(`${LIVE_API}/*`)) {
      throw new Error(`host_permissions has no entry for ${LIVE_API}. Add "${LIVE_API}/*" to extension/manifest.json.`);
    }
  }

  const staging = mkdtempSync(join(tmpdir(), `${NAME}-extension-`));
  try {
    for (const rel of RUNTIME_FILES) {
      mkdirSync(dirname(join(staging, rel)), { recursive: true });
      cpSync(join(source, rel), join(staging, rel));
    }
    writeFileSync(join(staging, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    writeFileSync(join(staging, 'api.js'), api);
    if (existsSync(join(root, 'LICENSE'))) cpSync(join(root, 'LICENSE'), join(staging, 'LICENSE'));
    const entries = [...RUNTIME_FILES, ...(existsSync(join(staging, 'LICENSE')) ? ['LICENSE'] : [])];
    mkdirSync(outDir, { recursive: true });
    const zip = join(outDir, `${NAME}-chrome-${manifest.version}${dev ? '-dev' : ''}.zip`);
    rmSync(zip, { force: true });
    execFileSync('zip', ['-X', '-q', zip, ...entries], { cwd: staging });
    return { zip, manifest };
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const dev = process.argv.includes('--dev');
  const { zip, manifest } = buildPackage({ root, dev });
  console.log(zip);
  console.log(dev
    ? 'Development build: keeps localhost. Never upload this one.'
    : `Store build ${manifest.version} against ${LIVE_API}. Run through publishing/README.md before uploading.`);
}
