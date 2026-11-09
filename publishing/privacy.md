# Privacy facts

An inventory for writing this app's section of https://build40for40.com/privacy/. It's not a published policy. Re-check every line against the code before publishing, and don't claim anything that hasn't been verified.

## What the extension does on the device

- **Permissions:** `activeTab`, `scripting`, `sidePanel`, `storage` and one host permission, the Hookr service. No `tabs`, cookies, history, optional host permissions or always-on content scripts. The background service worker only opens the side panel on a toolbar click; it reads nothing.
- **Pages read:** only a tab where the user clicked the toolbar button, through Chrome's `activeTab` grant, which ends when that tab leaves the site. It copies the visible text of the article (`extension/page.js`); the title and URL stay in the side panel for its header.
- **Re-reading while the panel is open:** when the author switches tab or the tab loads another page, the panel tries to read the active tab again on the device, to offer "Hook this page". That only works on a tab the user already clicked the button on, and nothing leaves the device until the author asks for a post. The panel listens to Chrome's tab events, which without the `tabs` permission carry no URLs or titles for other tabs.
- **Stored locally:** nothing while access codes are off. Posts shown in the panel are gone when it closes. (With codes on, the author's access code sits in `chrome.storage.local` until they choose **Forget my code** or the service rejects it, and isn't synced.)
- **Analytics or tracking code:** none.

## What it sends to the Hookr service (Cloudflare Worker)

- `POST /fit` with the article text, to rate how well the page suits each lens. Planned; the Worker doesn't answer it yet.
- `POST /post` with the article text, and the picked lens (one word, such as `story`). No title, URL or cookies.
- **Not sent:** browsing history, other tabs, anything typed by the user.

## Third parties

- **The model provider:** the Worker forwards the article text to the provider in `MODEL` (`wrangler.jsonc`), currently Anthropic (Claude Sonnet 5.5). Name the provider actually configured in the notice, and check its API terms on retention and training before publishing.

## Open before publishing

1. **Cloudflare logging.** Observability is on in `wrangler.jsonc`. The Worker logs errors from the Claude call, and for each post it writes, the lens and format. It doesn't log the caller's IP address. Check what lands in Workers Logs (request bodies aren't logged by the code) and record it. Don't promise a Cloudflare retention period.
2. **Retention and deletion:** the Worker stores nothing today, beyond Cloudflare's rate limit counter, keyed by the caller's IP address, which lasts a minute. Keep it that way or update this file.
3. **Pages the user doesn't own:** the extension reads whatever page the user points it at. Decide what the notice says about that.

Don't write "we collect no data" or "everything stays on your device": page text leaves the device by design.
