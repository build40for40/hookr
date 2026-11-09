import test from 'node:test';
import assert from 'node:assert/strict';

const calls = [];
let onClicked;
globalThis.chrome = {
  action: { onClicked: { addListener: listener => { onClicked = listener; } } },
  sidePanel: { open: options => { calls.push(['open', options]); return Promise.resolve(); } },
  runtime: { sendMessage: message => { calls.push(['message', message]); return Promise.reject(new Error('Receiving end does not exist.')); } },
};
await import('./background.js');

test('clicking the toolbar button opens the panel first, then asks an open panel to hook that tab', async () => {
  onClicked({ id: 7, windowId: 3 });
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(calls, [
    ['open', { windowId: 3 }],
    ['message', { type: 'hook', tabId: 7, windowId: 3 }],
  ]);
});
