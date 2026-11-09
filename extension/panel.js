import { rateFit, sourceLabel, wordCount, writePost } from './api.js';
import { FORMATS, copyLabel, formatFor, measure, platformFor } from './formats.js';
import { DEFAULT_MOOD, FITS, moodFor, ordered } from './moods.js';
import { READER_FILES, readPage, tabNotice } from './page.js';
import { clip, trace } from './trace.js';

const $ = id => document.getElementById(id);

// Opened outside the extension (design/preview.html), the panel runs on Kate's
// sample article instead of a tab and the API. ?state= pins one screen.
const preview = !globalThis.chrome?.tabs;
const params = new URLSearchParams(location.search);
const sample = preview ? (await import('../design/sample.js')).SAMPLE : null;
const windowId = preview ? null : (await chrome.windows.getCurrent()).id;
const CODE_KEY = 'accessCode';

let page;
let maybe = null;
let mood = params.get('mood') ?? DEFAULT_MOOD;
let format = formatFor(params.get('format'));
let platform = platformFor(format, params.get('platform'));
let fit = null;
let held = null;
let revealed = true;
let attempt = 0;
let original = '';
let run = 0;
let looks = 0;
let code = preview ? null : (await chrome.storage.local.get(CODE_KEY))[CODE_KEY] ?? null;
let screen = 'reading';
let before = 'reading';

const WRONG_CODE = "That code didn't work. Check you copied all of it, or ask the team for a fresh one.";
const CANT_READ = "Click the hookr button on this page first, then we'll take a look.";
const NOT_A_POST = "We can't find a post on this page, so we're sending nothing. Open the post itself, or highlight the words you want and hit Try again.";
const UNSURE = "This might not be a post. If it's your writing, go for it. Or highlight just the bit you want and hit Try again.";
const PAYWALLED = "This post is behind a paywall, so we can only see the free preview. Open it signed in with full access, then hit Try again.";
const ERRORS = {
  413: "That's a lot of you. Try a chapter rather than the whole book.",
  422: "This page isn't giving us much. Try one with more words.",
  429: 'Easy, tiger. Give it a minute.',
  502: "Couldn't find an angle that fits tonight. Try again or try another page.",
};
const TRACED = 'Everything here comes from this page. No fakes.';

// ---- Lenses ---------------------------------------------------------------

// Every page opens on Pull quote, her words exactly. The other lenses are rated
// for fit once the page is read: good fits first, reaches last and quiet.
const levelOf = id => (id === DEFAULT_MOOD || moodFor(id).rated === false ? null : fit?.[id]?.level in FITS ? fit[id].level : null);

function setMood(id) {
  mood = moodFor(id).id;
  $('mood-line').textContent = moodFor(mood).line;
  for (const chip of $('moods').children) chip.setAttribute('aria-pressed', String(chip.dataset.mood === mood));
}

function chips() {
  $('moods').replaceChildren(...ordered(fit).map(({ id, name, line, rated }) => {
    const chip = document.createElement('button');
    const level = levelOf(id);
    const party = rated === false;
    chip.className = 'mood';
    chip.dataset.mood = id;
    if (party) chip.dataset.fit = 'party';
    if (level || party) {
      if (level) chip.dataset.fit = level;
      const dot = document.createElement('span');
      dot.className = 'fit';
      dot.setAttribute('aria-hidden', 'true');
      chip.append(dot);
    }
    chip.append(name);
    chip.title = level ? `${line} ${FITS[level].name}.` : line;
    if (level) chip.setAttribute('aria-label', `${name}, ${FITS[level].name.toLowerCase()}`);
    chip.addEventListener('click', () => pick(id));
    return chip;
  }));
  setMood(mood);
}

function pick(id) {
  if (id === mood) return;
  setMood(id);
  rewrite();
}

function rewrite() {
  attempt = 0;
  if (!page) return;
  if (levelOf(mood) === 'none') hide();
  else write();
}

// ---- Formats --------------------------------------------------------------

// Where the page is going. The pick stays as the author moves between pages;
// a format with more than one home also asks which one.
function setFormat() {
  for (const tab of $('formats').children) tab.setAttribute('aria-pressed', String(tab.dataset.format === format.id));
  $('format-line').textContent = format.line;
  $('platforms').hidden = format.platforms.length < 2;
  $('platforms').replaceChildren(...format.platforms.map(({ id, name }) => {
    const choice = document.createElement('button');
    choice.className = 'platform';
    choice.textContent = name;
    choice.setAttribute('aria-pressed', String(id === platform.id));
    choice.addEventListener('click', () => choosePlatform(id));
    return choice;
  }));
  $('reading-line').textContent = format.loading;
  $('copy').textContent = copyLabel(format, platform);
}

function formatTabs() {
  $('formats').replaceChildren(...FORMATS.map(({ id, name }) => {
    const tab = document.createElement('button');
    tab.className = 'format';
    tab.dataset.format = id;
    tab.textContent = name;
    tab.addEventListener('click', () => chooseFormat(id));
    return tab;
  }));
  setFormat();
}

function chooseFormat(id) {
  if (id === format.id) return;
  format = formatFor(id);
  platform = platformFor(format);
  setFormat();
  rewrite();
}

function choosePlatform(id) {
  if (id === platform.id) return;
  platform = platformFor(format, id);
  setFormat();
  rewrite();
}

// Fit arrives while Pull quote is being written. A late answer for a page the
// author has since left is dropped.
async function rate() {
  const asked = page;
  const got = preview ? await new Promise(resolve => setTimeout(() => resolve(sample.fit), 500)) : await rateFit(page.text, { code });
  if (page !== asked) return;
  fit = got;
  chips();
  if (screen === 'result') fitLine();
}

// ---- Screens --------------------------------------------------------------

function show(state) {
  screen = state;
  document.body.dataset.screen = state;
  for (const id of ['reading', 'result', 'failed', 'access']) $(id).hidden = id !== state;
  // Access codes are off for now, so the footer link stays hidden.
  // $('change-code').hidden = !code || !['result', 'failed'].includes(state);
}

function fail(message, anyway = false) {
  $('error').textContent = message;
  $('anyway').hidden = !anyway;
  show('failed');
}

// A thread shows each post as its own numbered card; everything else is one
// block, and long reads and scripts scroll inside the card.
function showPost(result) {
  const reply = typeof result === 'string' ? { post: result } : result;
  const posts = format.id === 'thread' && reply.posts?.length ? reply.posts : [reply.post];
  original = posts.join('\n\n');
  $('post-label').textContent = `${format.name} · ${platform.name}`;
  $('post').hidden = format.id === 'thread';
  $('thread').hidden = format.id !== 'thread';
  $('post').classList.toggle('long', format.id === 'essay' || format.id === 'shorts');
  if (format.id === 'thread') $('thread').replaceChildren(...posts.map(pearl));
  else $('post').textContent = reply.post;
  const source = trace(original, page.text);
  $('trace').classList.toggle('flagged', !source.found);
  if (source.found) {
    $('trace-label').textContent = 'Traced to your page';
    $('excerpt').textContent = clip(source.excerpt);
    $('where').textContent = `Paragraph ${source.paragraph}`;
    $('promise').textContent = TRACED;
  } else {
    $('trace-label').textContent = "Some of this isn't on your page.";
    $('excerpt').textContent = clip(source.missing[0]);
    $('where').textContent = 'Check it before you post.';
    $('promise').textContent = 'Drafted from this page.';
  }
  $('result').dataset.found = String(source.found);
  fitLine();
  veil(false);
  count();
  show('result');
  switchOn();
}

// A post arriving is a sign switching on: the card lifts in, the logo pulses once.
function switchOn() {
  for (const id of ['card', 'logo']) {
    $(id).classList.remove('on');
    void $(id).offsetWidth;
    $(id).classList.add('on');
  }
}

// Every rated lens gets the same line above the result: the fit, then why, from
// the Worker's reason or the lens's own. Pull quote has no line.
const why = level => fit?.[mood]?.reason?.trim() || moodFor(mood).reasons?.[level] || '';

const FIT_LINES = {
  party: () => ['Every story has a pick-up line in it.', "It's meant to be cheesy, so check it lands before you post."],
  strong: name => [`This story is a great fit for the ${name} angle.`, ''],
  thin: name => [`This story is a stretch for the ${name} angle.`, 'Worth a polish before you post.'],
  none: name => [`This story isn't a great fit for the ${name} angle.`, "We wrote one anyway because it might spark an idea, but we don't recommend posting it as is."],
};

function fitLine() {
  const party = mood !== DEFAULT_MOOD && moodFor(mood).rated === false;
  const level = party ? 'party' : levelOf(mood);
  const line = $('fit-line');
  line.hidden = !level;
  if (!level) return;
  line.dataset.fit = level;
  const [title, note] = FIT_LINES[level](moodFor(mood).name);
  const strong = document.createElement('b');
  strong.textContent = title;
  line.replaceChildren(strong, ` ${[why(level), note].filter(Boolean).join(' ')}`);
}

// A poor fit: Hookr still writes one, because it might spark an idea, but the
// result stays greyed out until she asks to see it.
function veil(on) {
  $('veil').hidden = !on;
  $('shown').hidden = on;
}

function hide() {
  fitLine();
  veil(true);
  show('result');
  write({ hold: true });
}

$('reveal').addEventListener('click', () => {
  revealed = true;
  if (held === null) show('reading');
  else if (held instanceof Error) failed(held);
  else showPost(held);
});

function pearl(text, index) {
  const item = document.createElement('li');
  item.className = 'pearl';
  const body = document.createElement('div');
  body.className = 'pearl-text';
  body.contentEditable = 'plaintext-only';
  body.setAttribute('role', 'textbox');
  body.setAttribute('aria-multiline', 'true');
  body.setAttribute('aria-label', `Post ${index + 1}`);
  body.textContent = text;
  const size = document.createElement('span');
  size.className = 'pearl-count';
  item.append(body, size);
  return item;
}

const texts = () => (format.id === 'thread'
  ? [...$('thread').querySelectorAll('.pearl-text')].map(post => post.innerText.trim()).filter(Boolean)
  : [$('post').innerText.trim()]);

// The author can edit the result. The Worker keeps its own output inside each
// format's limits; this keeps the author's edits honest.
function count() {
  const posts = texts();
  const text = posts.join('\n\n');
  const { meta, over } = measure(format, platform, posts.length ? posts : ['']);
  $('count').textContent = meta;
  $('count').classList.toggle('over', over);
  for (const item of $('thread').children) {
    const size = [...item.querySelector('.pearl-text').innerText.trim()].length;
    item.querySelector('.pearl-count').textContent = `${size} / ${platform.limit}`;
    item.classList.toggle('over', size > platform.limit);
  }
  $('copy').disabled = !text || over;
  const found = $('result').dataset.found === 'true';
  $('voice').textContent = text !== original ? 'Edited by you' : found ? 'Every word is yours' : 'Check every word';
}

// ---- Access code ----------------------------------------------------------

// The Worker only answers people with a code. It lives in chrome.storage.local
// and goes out as a bearer token; the preview keeps it in memory.
async function saveCode(value) {
  code = value;
  if (!preview) await (value ? chrome.storage.local.set({ [CODE_KEY]: value }) : chrome.storage.local.remove(CODE_KEY));
}

function ask(note = '', wrong = false) {
  if (screen !== 'access') before = screen;
  $('code').value = '';
  $('access-note').textContent = note;
  $('access-note').classList.toggle('error', wrong);
  $('access-back').hidden = $('forget').hidden = !code;
  show('access');
  if (!preview) $('code').focus();
}

$('access-form').addEventListener('submit', async event => {
  event.preventDefault();
  const value = $('code').value.trim();
  if (!value) return;
  const changing = Boolean(code);
  await saveCode(value);
  if (changing) show(before);
  else if (page) write();
  else start();
});
$('access-back').addEventListener('click', () => show(before));
$('forget').addEventListener('click', async () => {
  await saveCode(null);
  ask('Forgotten. Paste a code to carry on.');
});
$('change-code').addEventListener('click', () => ask());

// ---- Reading and writing --------------------------------------------------

// Reading a tab needs the activeTab grant from a click on the Hookr icon. It
// lasts until that tab leaves the site, so other tabs fail until clicked.
async function read(tabId) {
  if (preview) return sample.page;
  tabId ??= (await chrome.tabs.query({ active: true, windowId }))[0]?.id;
  await chrome.scripting.executeScript({ target: { tabId }, files: READER_FILES });
  const [{ result }] = await chrome.scripting.executeScript({ target: { tabId }, func: readPage });
  return result;
}

async function peek() {
  try { return await read(); } catch { return null; }
}

async function hook() {
  if (!preview) return writePost(page.text, { mood, format: format.id, platform: platform.id, code });
  await new Promise(resolve => setTimeout(resolve, 900));
  return sampleFor();
}

function sampleFor() {
  if (format.id !== 'tweet') return sample.formats[format.id];
  const hooks = sample.hooks[mood];
  return { post: hooks[attempt % hooks.length] };
}

// `hold` writes behind the greyed-out result and keeps it until she asks for it.
async function write({ hold = false } = {}) {
  const mine = ++run;
  revealed = !hold;
  held = null;
  // Access codes are off for now; restore this to ask for one before writing.
  // if (!code && !preview) return ask();
  $('reading-line').textContent = moodFor(mood).loading ?? format.loading;
  if (!hold) show('reading');
  try {
    const post = await hook();
    if (mine !== run) return;
    if (revealed) showPost(post);
    else held = post;
  } catch (error) {
    if (mine !== run) return;
    if (revealed || error.status === 401) failed(error);
    else held = error;
  }
}

async function failed(error) {
  if (error.status !== 401) return fail(ERRORS[error.status] ?? error.message);
  await saveCode(null);
  ask(WRONG_CODE, true);
}

$('post').addEventListener('input', count);
$('thread').addEventListener('input', count);
$('copy').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(texts().join('\n\n'));
    $('copy').textContent = 'Copied';
  } catch {
    $('copy').textContent = 'Select and copy';
  }
  setTimeout(() => { $('copy').textContent = copyLabel(format, platform); }, 1500);
});
$('again').addEventListener('click', () => { attempt += 1; write(); });
$('retry').addEventListener('click', () => (page ? write() : start()));
$('hook-here').addEventListener('click', () => start());
$('anyway').addEventListener('click', () => {
  page = maybe;
  hookPage();
});

const words = here => `${wordCount(here.text).toLocaleString('en-GB')} words`;

function describe(here) {
  $('source').textContent = here ? sourceLabel(here) : '';
  $('words').textContent = here?.text ? words(here) : '';
  $('promise').textContent = '';
}

async function start(tabId) {
  const mine = ++run;
  show('reading');
  let here = null;
  try { here = await read(tabId); } catch {}
  if (mine !== run) return;
  looks += 1;
  notice(null);
  page = here?.verdict === 'post' && here.text ? here : null;
  maybe = here?.verdict === 'unsure' ? here : null;
  describe(here);
  if (!here) return fail(CANT_READ);
  if (here.paywalled) return fail(PAYWALLED);
  if (here.verdict === 'not_post') return fail(NOT_A_POST);
  if (maybe) return fail(UNSURE, true);
  await hookPage();
}

async function hookPage() {
  fit = null;
  setMood(DEFAULT_MOOD);
  chips();
  rate();
  await write();
}

// The panel stays open across tabs. Moving tab or page offers the new one
// instead of replacing a post the author may still be copying.
function notice(kind, here) {
  $('elsewhere').hidden = !kind;
  $('hook-here').hidden = kind !== 'new';
  if (kind === 'new') $('elsewhere-text').textContent = `Now on ${here.title || sourceLabel(here)}`;
  if (kind === 'unreadable') $('elsewhere-text').textContent = CANT_READ;
  if (kind === 'not_post') $('elsewhere-text').textContent = "No post here. Highlight the words you want, then click the hookr button.";
}

async function look() {
  const mine = ++looks;
  const here = await peek();
  if (mine === looks) notice(tabNotice(page, here), here);
}

function listen() {
  chrome.runtime.onMessage.addListener(message => {
    if (message?.type === 'hook' && message.windowId === windowId) start(message.tabId);
  });
  chrome.tabs.onActivated.addListener(info => {
    if (info.windowId === windowId) look();
  });
  chrome.tabs.onUpdated.addListener((tabId, change, tab) => {
    if (tab.active && tab.windowId === windowId && (change.status === 'complete' || change.url)) look();
  });
}

// Pinned screens for the preview board.
function pin(state) {
  page = sample.page;
  $('source').textContent = sourceLabel(page);
  $('words').textContent = words(page);
  const hooks = sample.hooks[mood];
  if (state !== 'unrated') fit = sample.fit;
  chips();
  if (state === 'reading') show('reading');
  if (state === 'unrated') showPost(sampleFor());
  if (state === 'reach') hide();
  if (state === 'stretch' || state === 'revealed') showPost(sampleFor());
  if (state === 'result') showPost(sampleFor());
  if (state === 'drafted') showPost(sample.drafted);
  if (state === 'over') {
    showPost(hooks[0]);
    $('post').textContent = `${hooks[0]} ${sample.hooks.lesson[0]}`;
    count();
  }
  if (state === 'thread-over') {
    showPost(sampleFor());
    $('thread').querySelector('.pearl-text').textContent += ` ${sample.hooks.lesson[0]}`;
    count();
  }
  if (state === 'failed') fail(ERRORS[502]);
  if (state === 'rate-limited') fail(ERRORS[429]);
  if (state === 'elsewhere') {
    showPost(hooks[0]);
    notice('new', { ...sample.page, title: 'Five things to do before your AI agent reads your email' });
  }
  if (state === 'unreadable') {
    showPost(hooks[0]);
    notice('unreadable');
  }
  if (state === 'access') ask();
  if (state === 'access-wrong') ask(WRONG_CODE, true);
  if (state === 'access-change') {
    code = 'preview-code';
    showPost(hooks[0]);
    ask();
  }
  if (state === 'not-post') {
    page = null;
    describe({ ...sample.page, title: 'Archive', text: '' });
    fail(NOT_A_POST);
  }
  if (state === 'unsure') {
    page = null;
    maybe = sample.page;
    describe(maybe);
    fail(UNSURE, true);
  }
  if (state === 'paywalled') {
    page = null;
    describe({ ...sample.page, text: '' });
    fail(PAYWALLED);
  }
  if (state === 'elsewhere-not-post') {
    showPost(hooks[0]);
    notice('not_post');
  }
  if (state === 'blocked') {
    page = null;
    describe(null);
    fail(CANT_READ);
  }
}

formatTabs();
chips();
if (preview && params.get('state')) pin(params.get('state'));
else {
  if (!preview) listen();
  start();
}
