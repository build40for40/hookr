# Hookr

Day 6 of 40 for 40, built live on Twitch on Monday 9 November 2026. The problem is "Repurposing writing into content", from Kate, who sponsored it.

- **Form factor:** a browser extension, for Chrome first and Firefox too, since a developer account is already registered. Anything web-facing, such as the landing page, is served at `build40for40.com/hookr/`.
- **Tracking:** the Superthread `day6` board, the "Day 6" page, and the "Day 6 - brief & prep" page with the kickoff notes.

Shared 40 for 40 context lives in `../AGENTS.md`.

## Layout

- **`extension/`:** the Manifest V3 extension, plain JavaScript with no build step. Clicking the toolbar button opens `popup.html`; `popup.js` runs `page.js` in the active tab (`activeTab` + `scripting`) to copy the article text, then sends the text to the Worker through `api.js` and shows the post it gets back. `api.js` defaults to `http://localhost:8787`; the store build rewrites that line to the live Worker. `trace.js` checks the post against the page: "Found in your page" when every sentence is there word for word, a flag when it isn't. `moods.js` lists the moods; each mood's colours and type are tokens under `[data-mood]` in `popup.css`, and the picked mood is sent as `mood` (the Worker ignores it for now).
- **`worker/`:** the `hookr-api` Cloudflare Worker: `POST /post` takes `{ text }` and returns `{ post }` of at most 280 characters, plus `GET /health`. `index.js` routes and exports `handle(request, env, model)` for tests. `post.js` holds the prompt and the model call through the Vercel AI SDK, so prompt work happens there; it retries up to three times if a post comes back too long. No model or provider is assumed: `MODEL` (`provider:model`, with `anthropic`, `openai` or `google` registered) and the provider's key are Worker secrets, and `/post` answers 503 `not_configured` until `MODEL` is set. JSON responses, CORS `*` (no cookies), errors as `{ error: { code, message } }`. The entry module may only export handlers, so shared constants live in `post.js`.
- **`scripts/package-extension.mjs`:** builds the store ZIP from the `RUNTIME_FILES` allowlist. Any other file in `extension/`, except `*.test.js`, stops the build.
- **`publishing/`:** store listing, privacy facts and release checks. Start with `publishing/README.md`.
- **`brand/`, `design/`, `web/`:** the brand and icons (`extension/icons/` are copies of `brand/icon-*.png`), the popup mockup the extension follows, and the static landing page. `design/preview.html` is a board of the real popup in every screen and mood, run on Kate's article from `design/sample.js` instead of Chrome and the API: serve the repo root (`python3 -m http.server`) and open `/design/preview.html`.
- **Tests:** `node --test`, colocated with the file they cover (`worker/index.test.js`, `worker/post.test.js`, `extension/api.test.js`, `scripts/package-extension.test.mjs`). The Worker tests use the AI SDK's `MockLanguageModelV4` (`worker/mock-model.js`), so they need no key.

## Commands

- Node.js 24 (`.node-version`). `npm ci`.
- `npm run dev` runs the Worker on http://localhost:8787 with `MODEL` and the provider's key from the ignored `.dev.vars` (copy `.dev.vars.example`). Load `extension/` unpacked at `chrome://extensions` (Developer mode, **Load unpacked**). After changing extension files, click **Reload** on its card.
- `npm test` and `npm run check` (tests plus a Wrangler dry run).
- **Deploys:** CI deploys the Worker on every push to `main` once the checks pass, with the org's `CLOUDFLARE_API_TOKEN` secret (skipped with a notice if the repo can't see it). `npm run deploy` is the hand fallback. Set `MODEL` and the provider's key once with `npm run wrangler -- secret put <NAME>`, never from CI. Switching model is `secret put MODEL` again, no deploy needed. The extension goes to the stores by hand (`publishing/README.md`).
- `npm run extension:package` builds `dist/hookr-chrome-<version>.zip` (no localhost, live API). `npm run extension:package:dev` keeps localhost; never upload it. Add new extension files to `RUNTIME_FILES` first.
- Always run Wrangler as `npm run wrangler -- <args>` (the `40for40` profile).

## The problem

I want to turn my Substack posts and a book that I have written into a content engine for marketing. Breaking it up into social media scripts and content that I can use - no hallucination. All with my tone of voice and exactly as I've written it.

Kate couldn't make kickoff, so she sent her pitch by email. She has plenty of material in her books and Substack posts but draws a blank when it comes to social content, and a content calendar she tried before lost her tone of voice and quality. Her idea: an author uploads a finished book, and a private engine builds content only from their own pages, so nothing is invented. Anything that can't be traced back to the book gets flagged, and every batch is reviewed by hand. She'd like it free for the community and told us to go wild with the structure.

## What we're building

Hookr is for published authors who want a marketing drip feed from writing they've already done, so they get more out of their IP and reach more people for little effort. Authors tend to get little marketing help from publishers.

The MVP: on any page, such as a Substack article, the extension reads the full text and returns one post for X, built around a hook. Text only, no images, within 280 characters.

The extension reads the page and sends the text to an API, which calls an LLM and returns the post. Text in, text out. Test it on a simple text-only Substack article.

## Workstreams

Each one gets a card on the `day6` board. Who does what hasn't been settled yet.

- **Scaffolding and deploy:** the repo, the extension and the API, live.
- **Extension publishing:** get the extension ready for the Chrome Web Store and Firefox Add-ons.
- **Prompt and evals:** the prompt that finds the hook, plus evals that check the post makes sense, stays true to the source and fits the character limit.
- **Branding and landing page:** part of the MVP, so there's something to show at the end of the day.

## Decided

- Start with published authors only, print or digital. Readers might come later. Wider audiences, such as anyone who publishes or evergreen creators, were too broad.
- Stick with a browser extension rather than a web app.
- One post, for one platform (X), per run.

## Still open

Don't record architecture, design or tech choices here until the team has made them.

- Fiction, non-fiction or both
- Whether Substack allows its pages to be read like this
- Where and when an author uses it, such as planning content at home
- Whether an author can set how much time they have, per day or per week

Stretch goals, not commitments: better hooks and prompts, hooks based on what's trending, image output, books and PDFs (which need splitting into chunks and knowing what's in view), and posting to X automatically.

Ideas from kickoff, not commitments: free text posts with paid video, posts in the style of popular formats or creators, suggestions that know your calendar, and a "Pinterest for social writing" that pins ideas to a content calendar.
