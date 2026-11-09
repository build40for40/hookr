import { sourceLabel, wordCount, writePost } from './api.js';
import { readPage } from './page.js';

const $ = id => document.getElementById(id);
let page;

function show(state) {
  for (const id of ['reading', 'result', 'failed']) $(id).hidden = id !== state;
}

function fail(message) {
  $('error').textContent = message;
  show('failed');
}

async function read() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const [{ result }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: readPage });
  return result;
}

async function write() {
  show('reading');
  try {
    const { post, excerpt, length } = await writePost(page.text);
    $('post').textContent = post;
    $('chars').textContent = length;
    $('excerpt').textContent = excerpt;
    show('result');
  } catch (error) {
    fail(error.message);
  }
}

$('copy').addEventListener('click', async () => {
  await navigator.clipboard.writeText($('post').textContent);
  $('copy').textContent = 'Copied';
  setTimeout(() => { $('copy').textContent = 'Copy for X'; }, 1500);
});
$('again').addEventListener('click', write);
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

start();
