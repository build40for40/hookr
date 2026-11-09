// Runs inside the reader's tab through chrome.scripting, so it must stay self-contained.
export function readPage() {
  const root = ['.available-content', 'article', 'main']
    .map(selector => document.querySelector(selector))
    .find(element => element?.innerText.trim()) ?? document.body;
  return { title: document.title, url: location.href, text: root.innerText.trim() };
}
