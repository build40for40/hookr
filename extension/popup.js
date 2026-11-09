import { characters, sourceLabel, wordCount, writePost } from './api.js';
import { DEFAULT_MOOD, MOODS, moodFor } from './moods.js';
import { readPage } from './page.js';
import { clip, trace } from './trace.js';

const LIMIT = 280;
const $ = id => document.getElementById(id);

// Opened outside the extension (design/preview.html), the popup runs on Kate's
// sample article instead of a tab and the API. ?state= pins one screen.
const preview = !globalThis.chrome?.tabs;
const params = new URLSearchParams(location.search);
const sample = preview ? (await import('../design/sample.js')).SAMPLE : null;

let page;
let mood = params.get('mood') ?? remembered() ?? DEFAULT_MOOD;
let attempt = 0;
let original = '';
let run = 0;

// ---- Moods ----------------------------------------------------------------

function remembered() {
  try { return localStorage.getItem('hookr.mood'); } catch { return null; }
}

function setMood(id) {
  mood = moodFor(id).id;
  document.documentElement.dataset.mood = mood;
  $('mood-line').textContent = moodFor(mood).line;
  for (const chip of $('moods').children) chip.setAttribute('aria-pressed', String(chip.dataset.mood === mood));
}

for (const { id, name } of MOODS) {
  const chip = document.createElement('button');
  chip.className = 'mood';
  chip.dataset.mood = id;
  chip.textContent = name;
  chip.addEventListener('click', () => {
    if (id === mood) return;
    setMood(id);
    try { localStorage.setItem('hookr.mood', id); } catch {}
    chip.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    attempt = 0;
    if (page) write();
  });
  $('moods').append(chip);
}

// ---- Screens --------------------------------------------------------------

function show(state) {
  for (const id of ['reading', 'result', 'failed']) $(id).hidden = id !== state;
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
  count();
  show('result');
}

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

// ---- Reading and writing --------------------------------------------------

async function read() {
  if (preview) return sample.page;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const [{ result }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: readPage });
  return result;
}

async function hook() {
  if (!preview) return writePost(page.text, { mood });
  await new Promise(resolve => setTimeout(resolve, 900));
  const hooks = sample.hooks[mood];
  return hooks[attempt % hooks.length];
}

async function write() {
  const mine = ++run;
  show('reading');
  try {
    const post = await hook();
    if (mine === run) showPost(post);
  } catch (error) {
    if (mine === run) fail(error.message);
  }
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

async function start() {
  show('reading');
  try {
    page = await read();
  } catch {
    return fail("Hookr can't read this page. Try it on an article, like a Substack post.");
  }
  if (!page?.text) return fail('This page has no words to work with. Try it on an article.');
  $('source').textContent = sourceLabel(page);
  $('words').textContent = `Read ${wordCount(page.text).toLocaleString('en-GB')} words`;
  await write();
}

// Pinned screens for the preview board.
function pin(state) {
  page = sample.page;
  $('source').textContent = sourceLabel(page);
  $('words').textContent = `Read ${wordCount(page.text).toLocaleString('en-GB')} words`;
  const hooks = sample.hooks[mood];
  if (state === 'reading') show('reading');
  if (state === 'result') showPost(hooks[0]);
  if (state === 'drafted') showPost(sample.drafted);
  if (state === 'over') {
    showPost(hooks[0]);
    $('post').textContent = `${hooks[0]} ${sample.hooks.calm[0]}`;
    count();
  }
  if (state === 'failed') fail("Couldn't write a post just now. Give it another go.");
}

setMood(mood);
requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.add('ready')));
if (preview && params.get('state')) pin(params.get('state'));
else start();
