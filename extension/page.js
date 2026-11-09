// Injected into the tab before readPage, which runs Readability on pages that
// aren't one of the hardcoded platforms.
export const READER_FILES = ['vendor/readability/Readability.js', 'vendor/readability/Readability-readerable.js'];

// Decides on the device whether the tab is a post and, if it is, copies only
// the post. Returns { verdict: 'post' | 'not_post' | 'unsure', source, title,
// subtitle, text, url, paywalled, reasons }. `text` is empty unless there is
// something the panel may send. Runs inside the tab through chrome.scripting,
// so it must stay self-contained.
export function readPage(win = window) {
  const MIN_SELECTION = 40;
  const MIN_TEXT = 200;
  const SHORT_TEXT = 500;
  const LONG_TEXT = 1500;
  const LINKY = 0.3;
  const PROSE = 0.05;
  const FEW_TEASERS = 3;
  const SOME_TEASERS = 15;
  const MANY_TEASERS = 40;
  const POST_SCORE = 2;
  const NOT_POST_SCORE = -2;

  const doc = win.document;
  const url = new URL(win.location.href);
  const path = url.pathname;
  const bare = host => host.replace(/^www\./, '');

  const BLOCK = /^(address|article|aside|blockquote|dd|div|dl|dt|figure|footer|h[1-6]|header|hr|li|main|ol|p|pre|section|table|tr|ul)$/;
  const SKIP = /^(script|style|noscript|template|button|svg|iframe|select|textarea|input)$/;
  const tidy = text => text
    .split('\n').map(line => line.replace(/\s+/g, ' ').trim()).join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const blockText = root => {
    let out = '';
    (function walk(node) {
      if (node.nodeType === 3) out += node.data;
      if (node.nodeType !== 1) return;
      if (SKIP.test(node.localName) || node.hidden) return;
      if (node.localName === 'br') return void (out += '\n');
      const block = BLOCK.test(node.localName);
      if (block) out += '\n\n';
      for (const child of node.childNodes) walk(child);
      if (block) out += '\n\n';
    })(root);
    return tidy(out);
  };
  // Chrome's innerText knows what's rendered; detached nodes and test DOMs don't have it.
  const textOf = el => (!el ? '' : el.isConnected && typeof el.innerText === 'string' ? tidy(el.innerText) : blockText(el));
  const flat = el => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

  const result = (verdict, source, { title = doc.title.trim(), subtitle = '', text = '', paywalled = false } = {}, reasons = []) => ({
    verdict, source, title, subtitle, text: verdict === 'not_post' || paywalled ? '' : text, url: url.href, paywalled, reasons,
  });
  const withTitle = (title, subtitle, body) => [
    body.startsWith(title) ? '' : title,
    body.includes(subtitle) ? '' : subtitle,
    body,
  ].filter(Boolean).join('\n\n');

  // 1. Highlighted text wins, on any site.
  const selected = tidy(win.getSelection?.()?.toString() ?? '');
  if (selected.length >= MIN_SELECTION) return result('post', 'selection', { text: selected }, ['highlighted text']);

  // 2. Platforms Readability can't read, by hostname and path.
  const host = url.hostname;
  if (/(^|\.)(x|twitter)\.com$/.test(host)) {
    const id = path.match(/^\/(?:i\/web|\w{1,15})\/status\/(\d+)/)?.[1];
    if (!id) return result('not_post', 'x', {}, ['not a single post on X']);
    const permalink = new RegExp(`/status/${id}(/|$)`);
    const links = article => [...article.querySelectorAll('a[href]')].map(a => new URL(a.getAttribute('href'), url).pathname);
    const tweet = [...doc.querySelectorAll('article')].find(article => links(article).some(href => permalink.test(href)));
    const quoted = el => el.closest('[role="link"]') && tweet.contains(el.closest('[role="link"]'));
    // X's layout without test ids, seen signed out in November 2026.
    const layout = tweet?.querySelector('[data-testid]') ? '[data-testid="tweetText"]' : '[dir="auto"]';
    const body = tweet && [...tweet.querySelectorAll(layout)].find(el => !quoted(el));
    const text = textOf(body);
    if (!text) return result('not_post', 'x', {}, ['post not found']);
    return result('post', 'x', { text }, [`post ${id}`]);
  }
  if (/(^|\.)linkedin\.com$/.test(host) && !path.startsWith('/pulse/')) {
    if (!/^\/(posts|feed\/update)\/[^/]+/.test(path)) return result('not_post', 'linkedin', {}, ['not a single post on LinkedIn']);
    const COMMENTARY = '[data-test-id="main-feed-activity-card__commentary"], .feed-shared-update-v2__description, .update-components-text, .feed-shared-inline-show-more-text, .feed-shared-text';
    const COMMENTS = '.comments-comments-list, .comments-comment-list, .comments-comment-item, .comments-comment-entity, section.comment, .comment';
    const body = [...doc.querySelectorAll(COMMENTARY)].find(el => !el.closest(COMMENTS));
    const text = textOf(body);
    if (!text) return result('not_post', 'linkedin', {}, ['post not found']);
    return result('post', 'linkedin', { text }, ['post text']);
  }
  if (/(^|\.)reddit\.com$/.test(host)) {
    if (!/^\/r\/[^/]+\/comments\/[^/]+/.test(path)) return result('not_post', 'reddit', {}, ['not a single post on Reddit']);
    const post = doc.querySelector('shreddit-post');
    const title = textOf(post?.querySelector('[slot="title"]')) || post?.getAttribute('post-title')?.trim() || '';
    const body = textOf(post?.querySelector('[slot="text-body"], [data-post-click-location="text-body"]'));
    if (!title && !body) return result('not_post', 'reddit', {}, ['post not found']);
    return result('post', 'reddit', { title: title || doc.title, text: withTitle(title, '', body) }, [body ? 'title and body' : 'title only']);
  }

  // 3. Everything else: Readability, plus signals for post or not.
  const reasons = [];
  let score = 0;
  const signal = (points, reason) => { score += points; reasons.push(`${reason} (${points > 0 ? '+' : ''}${points})`); };

  const meta = name => doc.querySelector(`meta[property="${name}"], meta[name="${name}"]`)?.getAttribute('content')?.trim() ?? '';
  const samePage = href => {
    try {
      const other = new URL(href, url);
      return bare(other.hostname) === bare(url.hostname) && other.pathname.replace(/\/+$/, '') === path.replace(/\/+$/, '');
    } catch { return false; }
  };
  // Single-page apps can leave stale tags behind after in-app navigation.
  const fresh = [meta('og:url'), doc.querySelector('link[rel="canonical"]')?.getAttribute('href')].some(href => href && samePage(href));

  const types = [];
  const collect = node => {
    if (Array.isArray(node)) return node.forEach(collect);
    if (!node || typeof node !== 'object') return;
    types.push(...[node['@type']].flat().filter(type => typeof type === 'string'));
    collect(node['@graph']);
  };
  for (const script of doc.querySelectorAll('script[type="application/ld+json"]')) {
    try { collect(JSON.parse(script.textContent)); } catch {}
  }

  if (fresh) {
    const postType = types.find(type => /(Article|Posting)$/.test(type));
    const listType = types.find(type => /^(CollectionPage|ItemList|SearchResultsPage|ProfilePage)$/.test(type));
    if (postType) signal(2, `JSON-LD ${postType}`);
    else if (listType) signal(-2, `JSON-LD ${listType}`);
    else if (types.includes('WebSite')) signal(-1, 'JSON-LD WebSite');
    if (!postType && (meta('og:type') === 'article' || meta('article:published_time'))) signal(1, 'article meta tags');
  } else {
    reasons.push('meta tags ignored: no og:url or canonical matches this URL');
  }

  if (/^\/(?:(?:archives?|latest|home|news|blog|search)\/?)?$|^\/(?:tags?|categor(?:y|ies)|topics?|page|authors?)\//.test(path)) signal(-2, 'homepage or listing path');
  else if (/^\/p\/[^/]+|\/\d{4}\/(?:\d{1,2}|[a-z]{3})\//i.test(path)) signal(1, 'post path');

  const teasers = new Set();
  for (const a of doc.querySelectorAll('a[href]')) {
    if (a.closest('p, blockquote, figcaption')) continue;
    const heading = a.closest('h1, h2, h3, h4') || a.querySelector('h1, h2, h3, h4');
    if (!heading && (a.closest('li, td') || flat(a).length < 25)) continue;
    try {
      const target = new URL(a.getAttribute('href'), url);
      if (/^https?:$/.test(target.protocol) && !samePage(target.href)) teasers.add(target.origin + target.pathname);
    } catch {}
  }
  if (teasers.size >= MANY_TEASERS) signal(-2, `${teasers.size} headline links`);
  else if (teasers.size >= SOME_TEASERS) signal(-1, `${teasers.size} headline links`);
  else if (teasers.size <= FEW_TEASERS) signal(1, `${teasers.size} headline links`);

  const substack = Boolean(doc.querySelector('.available-content, link[href*="substackcdn.com"], script[src*="substackcdn.com"]')) || host.endsWith('.substack.com');
  const paywalled = substack && Boolean(doc.querySelector('.paywall, [data-component-name="Paywall"]'));

  const CLUTTER = [
    'button', '[role="button"]', 'form', 'nav', 'figcaption', 'time', 'address', '[rel="author"]',
    '[class*="byline" i]', '[data-testid*="byline" i]', '[data-block*="byline" i]',
    ...(substack ? ['.post-header', '.button-wrapper', 'a.button', '.subscribe-widget', '.subscription-widget-wrap', '.subscription-widget-wrap-editor', '[data-component-name^="SubscribeWidget"]', '[data-component-name="ButtonCreateButton"]', '.paywall', '[data-component-name="Paywall"]'] : []),
  ].join(', ');
  const clone = doc.cloneNode(true);
  for (const el of clone.querySelectorAll(CLUTTER)) el.remove();
  const article = new win.Readability(clone, { serializer: el => el }).parse();
  const body = article ? blockText(article.content) : '';

  if (win.isProbablyReaderable(doc)) signal(1, 'readerable');
  else signal(-1, 'not readerable');
  if (body.length >= LONG_TEXT) signal(1, `${body.length} characters`);
  else if (body.length < SHORT_TEXT) signal(-1, `${body.length} characters`);
  const linked = article ? [...article.content.querySelectorAll('a')].reduce((sum, a) => sum + flat(a).length, 0) : 0;
  const density = article ? linked / Math.max(flat(article.content).length, 1) : 0;
  if (density > LINKY) signal(-2, `link density ${density.toFixed(2)}`);
  else if (density < PROSE && body.length >= SHORT_TEXT) signal(1, `link density ${density.toFixed(2)}`);

  const title = flat(doc.querySelector('h1.post-title')) || article?.title?.trim() || meta('og:title') || doc.title.trim();
  const subtitle = substack ? flat(doc.querySelector('.post-header .subtitle, h3.subtitle')) : '';
  const page = { title, subtitle, text: withTitle(title, subtitle, body), paywalled };

  if (body.length < MIN_TEXT) return result('not_post', 'readability', page, [...reasons, 'too little text']);
  if (paywalled && score > NOT_POST_SCORE) return result('post', 'readability', page, [...reasons, 'paywalled']);
  const verdict = score >= POST_SCORE ? 'post' : score <= NOT_POST_SCORE ? 'not_post' : 'unsure';
  return result(verdict, 'readability', page, [...reasons, `score ${score}`]);
}

// What the panel says when the reader moves to another tab or page: `hooked` is
// the page the post came from, `here` what was read now (null if nothing).
export function tabNotice(hooked, here) {
  if (!here) return hooked ? 'unreadable' : null;
  if (here.url === hooked?.url) return null;
  if (here.verdict === 'not_post') return hooked ? 'not_post' : null;
  return 'new';
}
