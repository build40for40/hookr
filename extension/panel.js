import { characters, rateFit, sourceLabel, wordCount, writePost } from './api.js';
import { DEFAULT_MOOD, FITS, moodFor, ordered } from './moods.js';
import { readPage, tabNotice } from './page.js';
import { clip, trace } from './trace.js';

const LIMIT = 280;
const $ = id => document.getElementById(id);

// Opened outside the extension (design/preview.html), the panel runs on Kate's
// sample article instead of a tab and the API. ?state= pins one screen.
const preview = !globalThis.chrome?.tabs;
const params = new URLSearchParams(location.search);
const sample = preview ? (await import('../design/sample.js')).SAMPLE : null;
const windowId = preview ? null : (await chrome.windows.getCurrent()).id;
const CODE_KEY = 'accessCode';

let page;
let mood = params.get('mood') ?? DEFAULT_MOOD;
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
const CANT_READ = "Hookr can't read this tab yet. Open an article, like a Substack post, and click the Hookr icon in your toolbar.";

// ---- Lenses ---------------------------------------------------------------

// Every page opens on Pull quote, her words exactly. The other lenses are rated
// for fit once the page is read: good fits first, reaches last and quiet.
const levelOf = id => (id === DEFAULT_MOOD ? null : fit?.[id]?.level in FITS ? fit[id].level : null);

function setMood(id) {
  mood = moodFor(id).id;
  $('mood-line').textContent = moodFor(mood).line;
  for (const chip of $('moods').children) chip.setAttribute('aria-pressed', String(chip.dataset.mood === mood));
}

function chips() {
  $('moods').replaceChildren(...ordered(fit).map(({ id, name, line }) => {
    const chip = document.createElement('button');
    const level = levelOf(id);
    chip.className = 'mood';
    chip.dataset.mood = id;
    if (level) {
      chip.dataset.fit = level;
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
  attempt = 0;
  if (!page) return;
  if (levelOf(id) === 'none') hide();
  else write();
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
  for (const id of ['reading', 'result', 'failed', 'access']) $(id).hidden = id !== state;
  $('change-code').hidden = !code || !['result', 'failed'].includes(state);
}

function fail(message) {
  $('error').textContent = message;
  show('failed');
}

function showPost(post) {
  original = post;
  $('post').textContent = post;
  const source = trace(post, page.text);
  $('trace').classList.toggle('flagged', !source.found);
  if (source.found) {
    $('trace-label').textContent = 'Found in your page';
    $('excerpt').textContent = clip(source.excerpt);
    $('where').textContent = `Paragraph ${source.paragraph}`;
    $('promise').textContent = 'Nothing invented';
  } else {
    $('trace-label').textContent = 'Not word for word on your page';
    $('excerpt').textContent = clip(source.missing[0]);
    $('where').textContent = 'Check it before you post';
    $('promise').textContent = 'Drafted from your page';
  }
  $('result').dataset.found = String(source.found);
  fitLine();
  veil(false);
  count();
  show('result');
}

// Every rated lens gets the same line above the post: the fit, then why, from
// the Worker's reason or the lens's own. Pull quote has no line.
const why = level => fit?.[mood]?.reason?.trim() || moodFor(mood).reasons?.[level] || '';

const FIT_LINES = {
  strong: name => [`This story is a great fit for the ${name} format.`, ''],
  thin: name => [`This story is a stretch for the ${name} format.`, 'Worth a polish before you post.'],
  none: name => [`This story isn't a great fit for the ${name} format.`, "We wrote one anyway because it might spark an idea, but we don't recommend posting it as is."],
};

function fitLine() {
  const level = levelOf(mood);
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
// post stays greyed out until she asks to see it.
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

// The author can edit the post. X counts most characters as one; the Worker
// keeps its own posts to 280, this keeps the author's edits honest.
function count() {
  const text = $('post').innerText.trim();
  const over = characters(text) - LIMIT;
  $('chars').textContent = characters(text);
  $('over').textContent = over > 0 ? ` · ${over} over` : '';
  $('count').classList.toggle('over', over > 0);
  $('copy').disabled = !text || over > 0;
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
  const [{ result }] = await chrome.scripting.executeScript({ target: { tabId }, func: readPage });
  return result;
}

async function peek() {
  try { return await read(); } catch { return null; }
}

async function hook() {
  if (!preview) return writePost(page.text, { mood, code });
  await new Promise(resolve => setTimeout(resolve, 900));
  const hooks = sample.hooks[mood];
  return hooks[attempt % hooks.length];
}

// `hold` writes behind the greyed-out post and keeps the post until she asks for it.
async function write({ hold = false } = {}) {
  const mine = ++run;
  revealed = !hold;
  held = null;
  if (!code && !preview) return ask();
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
  if (error.status !== 401) return fail(error.message);
  await saveCode(null);
  ask(WRONG_CODE, true);
}

$('post').addEventListener('input', count);
$('copy').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText($('post').innerText.trim());
    $('copy').textContent = 'Copied';
  } catch {
    $('copy').textContent = 'Select and copy';
  }
  setTimeout(() => { $('copy').textContent = 'Copy for X'; }, 1500);
});
$('again').addEventListener('click', () => { attempt += 1; write(); });
$('retry').addEventListener('click', () => (page ? write() : start()));
$('hook-here').addEventListener('click', () => start());

function describe(here) {
  $('source').textContent = here ? sourceLabel(here) : '';
  $('words').textContent = here ? `Read ${wordCount(here.text).toLocaleString('en-GB')} words` : '';
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
  page = here?.text ? here : null;
  describe(page);
  if (!here) return fail(CANT_READ);
  if (!page) return fail('This page has no words to work with. Try it on an article.');
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
  if (kind === 'unreadable') $('elsewhere-text').textContent = "Hookr can't read this tab. Click the Hookr icon in your toolbar to read it.";
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
  $('words').textContent = `Read ${wordCount(page.text).toLocaleString('en-GB')} words`;
  const hooks = sample.hooks[mood];
  if (state !== 'unrated') fit = sample.fit;
  chips();
  if (state === 'reading') show('reading');
  if (state === 'unrated') showPost(hooks[0]);
  if (state === 'reach') hide();
  if (state === 'stretch' || state === 'revealed') showPost(hooks[0]);
  if (state === 'result') showPost(hooks[0]);
  if (state === 'drafted') showPost(sample.drafted);
  if (state === 'over') {
    showPost(hooks[0]);
    $('post').textContent = `${hooks[0]} ${sample.hooks.lesson[0]}`;
    count();
  }
  if (state === 'failed') fail("Couldn't write a post just now. Give it another go.");
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
  if (state === 'blocked') {
    page = null;
    describe(null);
    fail(CANT_READ);
  }
}

chips();
if (preview && params.get('state')) pin(params.get('state'));
else {
  if (!preview) listen();
  start();
}
