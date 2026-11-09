# Hookr

Day 6 of 40 for 40, built live on Twitch on Monday 9 November 2026. The problem is "Repurposing writing into content", from Kate, who sponsored it.

- **Form factor:** a browser extension, for Chrome first and Firefox too, since a developer account is already registered. Anything web-facing, such as the landing page, is served at `build40for40.com/hookr/`.
- **Tracking:** the Superthread `day6` board, the "Day 6" page, and the "Day 6 - brief & prep" page with the kickoff notes.

Shared 40 for 40 context lives in `../AGENTS.md`.

## Layout

- **`extension/`:** the Manifest V3 extension, plain JavaScript with no build step. Clicking the toolbar button opens Hookr in Chrome's side panel (`panel.html`, Chrome 116+). `background.js` listens for `action.onClicked`, calls `chrome.sidePanel.open` and messages an open panel to hook that tab. It doesn't use `setPanelBehavior({ openPanelOnActionClick: true })`: Chrome skips the `activeTab` grant when the panel opens that way, so the panel couldn't read the page. `panel.js` runs `page.js` in the active tab (`activeTab` + `scripting`) to copy the article text, then sends the text to the Worker through `api.js` and shows the post it gets back. The panel stays open across tabs and pages: when the active tab or its page changes it re-reads quietly and, rather than replacing the post, offers "Hook this page" or says it can't read the tab (`tabNotice` in `page.js`). A tab is only readable after a click on the toolbar button there, until it leaves that site. `api.js` defaults to `http://localhost:8787`; the store build rewrites that line to the live Worker. `trace.js` checks the post against the page: "Traced to your page" when every sentence is there word for word, a flag when it isn't. Access codes are off for now: the check before writing and the footer's **Access code** link are commented out in `panel.js`, so the panel never asks. The access screen, `chrome.storage.local` handling and 401 path are still there for when they come back. `moods.js` lists the lenses (kinds of post: Pull quote, the verbatim default, then Story, Lesson, Hot take and the rest); the picked one is sent as `mood` and the Worker resolves it to a lens sub-prompt. Every page opens on Pull quote. Once the page is read, `api.js` `rateFit` asks `POST /fit` how well the page suits each lens (`strong`, `thin`, `none`, with a one-line reason); the chips get a green dot, yellow half dot or grey ring and sort good fits first. Every rated lens gets the same line above the post, edged green, yellow or grey: "This story is a great fit for / a stretch for / isn't a great fit for the <Lens> angle." then the reason (from `/fit`, else the lens's own `reasons` in `moods.js`). A poor fit also greys out the post (placeholder lines and "I know the risks, show me anyway"), writing it behind the veil. The line under the chips is only the lens's description; hovering a chip shows its description and fit. `POST /fit` rates every current lens except Pull quote through the Worker (card 230). It shares `/post` rate limiting and input cap. Malformed or unsourced ratings fail with 502 and leave the picker unrated; source fit is separate from output quality.
- **`worker/`:** the `hookr-api` Cloudflare Worker: `POST /post` takes `{ text, mood?, format?, platform? }` and returns `{ post, excerpt, length }` for tweets, with format metadata for other outputs, plus `GET /health`. `index.js` routes and exports `handle(request, env, model)` for tests. Access codes are off for now: the `ACCESS_CODES` check in `index.js` is commented out (`access.js` is kept, and compares SHA-256 digests of `name:code` pairs), so `POST /post` and `POST /fit` answer anyone. They take one from the `POSTS_PER_PERSON` rate limit binding keyed by `CF-Connecting-IP` (20 a minute, `ratelimits` in `wrangler.jsonc`; skipped when the binding is absent, as in tests), answering 429 `rate_limited`, and log `{ event: 'post', mood, format, platform }` for each post written, never the IP. `GET /health` and `OPTIONS` stay open. `post.js` calls the model through the Vercel AI SDK with the approved prompt in `prompts/generate-post-v1.md` (copied into `worker/prompt.js`, and `prompt.test.js` fails if they differ), sending the article as a separate `ARTICLE DATA` message. `worker/lenses.js` appends the selected sub-prompt from `prompts/lenses/<id>.js`, registered in `prompts/lenses/index.js`, plus shared source/output boundaries; missing or unknown IDs use Pull quote (`line`). UI labels can change independently of stable IDs. Lens instructions never override source accuracy or the author’s voice. See `prompts/lenses/README.md` to add or retire a lens. It parses the `Post:` and `Supporting excerpt:` reply, checks the post's X weighted length with `twitter-text` and that the excerpt appears in the article (ignoring whitespace, Unicode normalisation, curly quotes and surrounding quote marks), and tries up to three times. A reply with no `Post:` means the model abstained: `/post` answers 422 `insufficient_source`; three failed tries answer 502 `no_valid_post`. To change the prompt, edit the markdown file and `worker/prompt.js` together. The model is `MODEL` in `wrangler.jsonc` (`provider:model`, with `anthropic`, `openai` or `google` registered), currently `anthropic:claude-sonnet-5-5` with Anthropic's server-side refusal fallbacks on; `/post` answers 503 `not_configured` if it's unset. CI copies the org's `ANTHROPIC_API_KEY` secret into the Worker on every deploy. JSON responses, CORS `*` (no cookies), errors as `{ error: { code, message } }`. The entry module may only export handlers, so shared constants live in `post.js`.
- **`scripts/package-extension.mjs`:** builds the store ZIP from the `RUNTIME_FILES` allowlist. Any other file in `extension/`, except `*.test.js`, stops the build.
- **`publishing/`:** store listing, privacy facts and release checks. Start with `publishing/README.md`.
- **`brand/`, `design/`, `web/`:** the brand and icons, and the static landing page. The look is After Hours, from the Superthread page "Hookr brand brief: After Hours" (card 229): Midnight ground, Cherry neon, a Yellowtail neon logotype, Unbounded for labels and headlines, Inter for everything else. The panel bundles those fonts in `extension/fonts/` (with their licences) rather than loading Google Fonts. Each icon size has its own SVG (`brand/icon.svg` is the 128px one, then `icon-48.svg`, `icon-32.svg` and the inverted `icon-16.svg`); `extension/icons/` are copies of the `brand/icon-*.png` renders. `design/popup.html` is the original paper and red ink mockup, kept for history. `design/preview.html` is a board of the real panel in every screen and lens, fit states and a few side panel widths, run on Kate's article from `design/sample.js` instead of Chrome and the API: serve the repo root (`python3 -m http.server`) and open `/design/preview.html`.
- **Tests:** `node --test`, colocated with the file they cover (`worker/index.test.js`, `worker/post.test.js`, `worker/prompt.test.js`, `worker/access.test.js`, `extension/api.test.js`, `extension/formats.test.js`, `extension/background.test.js`, `extension/page.test.js`, `extension/trace.test.js`, `scripts/package-extension.test.mjs`, `scripts/access-code.test.mjs`). The Worker tests use the AI SDK's `MockLanguageModelV4` (`worker/mock-model.js`), so they need no key.

## Output formats and global evaluation

- `prompts/formats/` defines tweet (default), essay (Substack/LinkedIn articles), YouTube Shorts scripts, Instagram captions, and X/Threads threads. `worker/formats.js` shares mechanical validation with `evals/global/`; `worker/lenses.js` composes the selected format and dynamic lens without carrying tweet-only length rules into long-form output. See `prompts/formats/README.md` for request/response contracts and editorial defaults. `feed` is a LinkedIn or Threads post up to 500 characters, and essays also go to X articles. The panel's format picker ("Where's it going tonight?") lists them from `extension/formats.js` with their own names: Tease (X post), Pearls (thread), Charmer (feed post), Slow Burn (essay), Screen Test (Shorts script) and Flash (Instagram caption). A format with more than one platform shows a platform toggle. `api.js` sends `format` and `platform` with each `/post`, and the panel shows each result with its own length line, threads as numbered cards and long reads scrolling inside the card.
- `evals/global/` is an offline evaluation workflow and JSON CLI (`node evals/global/run.mjs record.json`). Shared criteria cover source fidelity, naturalness, author voice, lens fit, hook/usefulness and platform fit; editorial judgments require identified reviewers. Trend alignment requires fresh sourced evidence and otherwise remains not assessed. Unit tests validate the evaluator and routing, not live model quality. This workflow is not a generation-time automatic approval gate.

## Commands

- Node.js 24 (`.node-version`). `npm ci`.
- `npm run dev` runs the Worker on http://localhost:8787 with `ANTHROPIC_API_KEY` from the ignored `.dev.vars` (copy `.dev.vars.example`). Load `extension/` unpacked at `chrome://extensions` (Developer mode, **Load unpacked**). After changing extension files, click **Reload** on its card; that closes the panel, so click the toolbar button again. Right-click inside the panel and **Inspect** for its DevTools; the service worker has its own link on the card.
- `npm test` and `npm run check` (tests plus a Wrangler dry run).
- **Deploys:** CI deploys the Worker on every push to `main` once the checks pass, with the org's `CLOUDFLARE_API_TOKEN` secret (skipped with a notice if the repo can't see it). `npm run deploy` is the hand fallback. The same deploy step copies the org's `ANTHROPIC_API_KEY` into the Worker's secrets, so no key is set by hand. Switching model is a change to `MODEL` in `wrangler.jsonc`; a new provider also needs its key added to that step's `secrets`. The extension goes to the stores by hand (`publishing/README.md`).
- **Access codes (off for now):** `npm run access-code -- <name>` prints a fresh code and its `name:code` pair; never invent codes by hand or commit them. Production codes live only in the Worker secret and the team's password manager: `npm run wrangler -- secret put ACCESS_CODES` with the whole list adds or revokes people within seconds, no deploy needed (CI deploys leave it alone). Locally, set `ACCESS_CODES` in `.dev.vars`. Never run `secret put` or print real codes from an agent session.
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

## Lens fit

The shared `extension/fit.js` schema is used by the Worker, frontend and offline evals; keep it on the extension packaging allowlist. Global output records take `fitAssessment: {article, response}` from the actual `/fit` run, validate that the source snapshot matches and include `sourceFit` in schema version 2. The existing `lens_fit` judgment measures output adherence, never a replacement source rating. Strong fit does not approve quality; thin/none/missing fit requires review. See `evals/global/README.md`.

`worker/fit.js` builds dynamic source-suitability instructions from `LENSES`, calls the configured model once with transport retries disabled, and validates complete IDs, levels, one-sentence reasons and internal exact source evidence for strong/thin ratings. Only `{fit:{id:{level,reason}}}` reaches the frontend. None requires empty evidence. Evidence matching proves provenance, not semantic support. `evals/fit/` supplies offline reference fixtures and saved-response comparison; mock tests are not evidence of live classification accuracy. See `evals/fit/README.md`.
