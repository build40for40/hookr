# Privacy facts

An inventory for writing this app's section of https://build40for40.com/privacy/. It's not a published policy. Re-check every line against the code before publishing, and don't claim anything that hasn't been verified.

## What the extension does on the device

- **Permissions:** `activeTab`, `scripting` and one host permission, the Hookr service. No `storage`, `tabs`, cookies, history or always-on content scripts.
- **Pages read:** only the tab the user is on, and only when they click the toolbar button. It copies the visible text of the article (`extension/page.js`); the title and URL stay in the popup for its header.
- **Stored locally:** nothing. Posts shown in the popup are gone when it closes.
- **Analytics or tracking code:** none.

## What it sends to the Hookr service (Cloudflare Worker)

- `POST /post` with the article text only. No title, URL, user id or cookies.
- **Not sent:** browsing history, other tabs, anything typed by the user.

## Third parties

- **The model provider:** the Worker forwards the article text to whichever provider the Worker's `MODEL` secret names (Anthropic, OpenAI or Google). Name the provider actually configured in the notice, and check its API terms on retention and training before publishing.

## Open before publishing

1. **Cloudflare logging.** Observability is on in `wrangler.jsonc`, and the Worker logs errors from the Claude call. Check what lands in Workers Logs (request bodies aren't logged by the code) and record it. Don't promise a Cloudflare retention period.
2. **Retention and deletion:** the Worker stores nothing today. Keep it that way or update this file.
3. **Pages the user doesn't own:** the extension reads whatever page the user points it at. Decide what the notice says about that.

Don't write "we collect no data" or "everything stays on your device": page text leaves the device by design.
