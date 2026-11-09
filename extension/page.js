// Runs inside the reader's tab through chrome.scripting, so it must stay self-contained.
export function readPage() {
  const root = ['.available-content', 'article', 'main']
    .map(selector => document.querySelector(selector))
    .find(element => element?.innerText.trim()) ?? document.body;
  return { title: document.title, url: location.href, text: root.innerText.trim() };
}

// What the panel says when the reader moves to another tab or page: `hooked` is
// the page the post came from, `here` what could be read now (null if nothing).
export function tabNotice(hooked, here) {
  if (!here?.text) return hooked ? 'unreadable' : null;
  return here.url === hooked?.url ? null : 'new';
}
