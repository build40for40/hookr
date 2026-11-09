import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
import { READER_FILES, readPage, tabNotice } from './page.js';

const readers = READER_FILES.map(file => readFileSync(new URL(file, import.meta.url), 'utf8'));

// A tab as Chrome leaves it after executeScript({ files: READER_FILES }).
function tab(fixture, url) {
  const html = readFileSync(new URL(`fixtures/${fixture}.html`, import.meta.url), 'utf8');
  const dom = new JSDOM(html, { url, runScripts: 'outside-only', virtualConsole: new VirtualConsole() });
  for (const source of readers) dom.window.eval(source);
  return dom.window;
}

function highlight(win, selector) {
  const range = win.document.createRange();
  range.selectNodeContents(win.document.querySelector(selector));
  win.getSelection().addRange(range);
}

const cases = [
  {
    name: 'a Substack post keeps its title and subtitle and drops the button',
    fixture: 'substack-post', url: 'https://marginnotes.substack.com/p/the-first-draft-is-a-map',
    verdict: 'post', source: 'readability',
    starts: 'The first draft is a map, not the territory\n\nWhy I stopped polishing chapter one before chapter two existed.\n\nFor three years',
    has: ['nobody draws an accurate coastline from the harbour.', 'try writing the last page instead', 'know where the roads go.'],
    lacks: ['Register Here', 'Margin Notes', 'Like 42', 'My desk on a good day', 'Fake Reader', 'Privacy'],
  },
  {
    name: 'a Substack post drops its subscribe widgets',
    fixture: 'substack-subscribe', url: 'https://notes.example.org/p/notes-from-the-slush-pile',
    verdict: 'post', source: 'readability',
    starts: "Notes from the slush pile\n\nWhat a year of reading other people's openings taught me about mine.",
    has: ['started in the middle of a decision', 'watch where their eyes drift away.'],
    lacks: ['Subscribe', 'Type your email', 'reader-supported', 'Thanks for reading'],
  },
  {
    name: 'a paywalled Substack post sends nothing from its free preview',
    fixture: 'substack-paywalled', url: 'https://marginnotes.substack.com/p/the-chapter-i-cut',
    verdict: 'post', source: 'readability', paywalled: true, text: '',
  },
  {
    name: 'a news article keeps the story and drops captions, byline and related links',
    fixture: 'news-article', url: 'https://news.example/news/articles/c0ffee123',
    verdict: 'post', source: 'readability',
    starts: 'Village library lends out its last typewriter\n\nA village library in Northshire',
    has: ['"People queued for them," she said.', 'a repair cafe has offered to look at the broken pair in the new year.'],
    lacks: ['Image caption', 'Sam Fakename', 'Related topics', 'Ferry timetable', 'Lost parrot', 'Terms of Use'],
  },
  {
    name: 'a news homepage is not a post',
    fixture: 'news-home', url: 'https://news.example/news',
    verdict: 'not_post', source: 'readability', text: '',
  },
  {
    name: 'a blog post on an unknown domain, with no metadata at all, is a post',
    fixture: 'blog-post', url: 'https://adaquill.example/2026/11/reading-aloud',
    verdict: 'post', source: 'readability',
    has: ['On reading your own book in public', 'ordinary lungs', 'whether it is proud of you back.'],
    lacks: ['Posted on', 'Share this post', 'You might also like', 'Choosing a title', 'Powered by'],
  },
  {
    name: "an author's homepage with a short bio might not be a post",
    fixture: 'author-home', url: 'https://adaquill.example/',
    verdict: 'unsure', source: 'readability',
    has: ['I write novels about small coastal towns'],
  },
  {
    name: 'an X status page reads its own tweet, not the quoted one or the replies',
    fixture: 'x-status', url: 'https://x.com/adaquill/status/1111111111',
    verdict: 'post', source: 'x',
    text: 'Finished the second draft today. The trick that got me here: no sentence gets polished until the chapter after it exists.',
  },
  {
    name: 'an X reply page reads the reply, not the parent above it',
    fixture: 'x-reply', url: 'https://twitter.com/adaquill/status/4444444444',
    verdict: 'post', source: 'x',
    text: 'Read every chapter aloud before it leaves your desk. If you trip over a sentence, so will your reader.',
  },
  {
    name: "a reply page in X's layout without test ids reads the reply",
    fixture: 'x-reply-signed-out', url: 'https://x.com/adaquill/status/4444444444',
    verdict: 'post', source: 'x',
    text: 'Read every chapter aloud before it leaves your desk. If you trip over a sentence, so will your reader.',
  },
  {
    name: 'the X home feed is not a post',
    fixture: 'x-home', url: 'https://x.com/home',
    verdict: 'not_post', source: 'x', text: '',
  },
  {
    name: 'a LinkedIn post reads its text without reactions, buttons or comments',
    fixture: 'linkedin-post', url: 'https://www.linkedin.com/posts/ada-quill_writing-activity-7000000000000000001-AbCd/',
    verdict: 'post', source: 'linkedin',
    text: 'Three things a year of reading slush taught me about my own openings.\n\n1. Start with a decision, not a description.\n2. Cut everything before the first choice.\n3. Read it aloud to someone who owes you nothing.',
  },
  {
    name: 'the LinkedIn feed is not a post',
    fixture: 'linkedin-feed', url: 'https://www.linkedin.com/feed/',
    verdict: 'not_post', source: 'linkedin', text: '',
  },
  {
    name: 'a Reddit post reads its title and body without comments',
    fixture: 'reddit-post', url: 'https://www.reddit.com/r/writing/comments/abc123/how_i_finally_finished_my_second_novel/',
    verdict: 'post', source: 'reddit',
    text: 'How I finally finished my second novel\n\nAfter three years of rewriting chapter one, I made a rule: no sentence gets polished until the chapter after it exists.\n\nIt took eleven months from there. Happy to answer questions about the process.',
  },
  {
    name: 'a subreddit feed is not a post',
    fixture: 'reddit-feed', url: 'https://www.reddit.com/r/writing/',
    verdict: 'not_post', source: 'reddit', text: '',
  },
];

for (const { name, fixture, url, verdict, source, paywalled = false, text, starts, has = [], lacks = [] } of cases) {
  test(name, () => {
    const page = readPage(tab(fixture, url));
    assert.equal(page.verdict, verdict, page.reasons.join('; '));
    assert.equal(page.source, source);
    assert.equal(page.paywalled, paywalled);
    assert.equal(page.url, url);
    if (text !== undefined) assert.equal(page.text, text);
    if (starts) assert.ok(page.text.startsWith(starts), page.text.slice(0, 200));
    for (const words of has) assert.ok(page.text.includes(words), `missing: ${words}`);
    for (const words of lacks) assert.ok(!page.text.includes(words), `should drop: ${words}`);
  });
}

test('highlighted text wins, even on a feed', () => {
  const win = tab('x-home', 'https://x.com/home');
  highlight(win, '[data-testid="cellInnerDiv"]:nth-child(2) [data-testid="tweetText"]');
  const page = readPage(win);
  assert.equal(page.verdict, 'post');
  assert.equal(page.source, 'selection');
  assert.equal(page.text, 'Feed tweet two: finished the second draft today. No sentence gets polished until the chapter after it exists.');
});

test('a stray word or two highlighted is ignored', () => {
  const win = tab('news-home', 'https://news.example/news');
  highlight(win, 'h3');
  assert.equal(readPage(win).verdict, 'not_post');
});

test("meta tags left over from another page don't count", () => {
  const page = readPage(tab('news-article', 'https://news.example/news/articles/another-story'));
  assert.ok(page.reasons.some(reason => reason.startsWith('meta tags ignored')));
  assert.ok(!page.reasons.some(reason => reason.includes('JSON-LD')));
});

test('an X status page whose tweet has not loaded yet sends nothing', () => {
  const page = readPage(tab('x-home', 'https://x.com/adaquill/status/9999999999'));
  assert.equal(page.verdict, 'not_post');
  assert.equal(page.text, '');
});

const article = { title: 'Before you turn on your AI agent', url: 'https://katebmarshall.substack.com/p/before', text: 'Every major AI company now offers a personal AI agent.', verdict: 'post' };

test('staying on the hooked page shows no notice', () => {
  assert.equal(tabNotice(article, { ...article }), null);
});

test('another post, or a page that might be one, is offered, even before anything was hooked', () => {
  const other = { ...article, url: 'https://example.com/essay' };
  assert.equal(tabNotice(article, other), 'new');
  assert.equal(tabNotice(null, other), 'new');
  assert.equal(tabNotice(article, { ...other, verdict: 'unsure' }), 'new');
});

test('a page that is not a post only gets a notice when a post is showing', () => {
  const feed = { title: 'Home', url: 'https://example.com/', text: '', verdict: 'not_post' };
  assert.equal(tabNotice(article, feed), 'not_post');
  assert.equal(tabNotice(null, feed), null);
});

test('an unreadable tab only gets a notice when a post is showing', () => {
  assert.equal(tabNotice(article, null), 'unreadable');
  assert.equal(tabNotice(null, null), null);
});
