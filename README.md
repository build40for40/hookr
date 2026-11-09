# Hookr

A browser extension for Day 6 of [40 for 40](https://build40for40.com), built live on [Twitch](https://www.twitch.tv/40for40).

Hookr is for published authors who want a marketing drip feed from writing they've already done. Open one of your articles, say a Substack post, click Hookr, and its side panel hands back one post for X built around a hook from your own words. Nothing invented, and sized for X's 280 characters.

## Run it locally

Needs Node.js 24 (see `.node-version`) and an Anthropic API key.

```sh
npm ci
cp .dev.vars.example .dev.vars   # then fill in ANTHROPIC_API_KEY
npm run dev
```

That starts the API on http://localhost:8787. Then:

1. Open `chrome://extensions` in Chrome 116 or later and turn on **Developer mode**.
2. Click **Load unpacked** and choose this repo's `extension/` folder.
3. Pin Hookr from the puzzle-piece menu, open an article and click its icon. Hookr opens in the side panel, reads the page and writes a post.
4. The panel stays open when you switch tabs. Hookr can only read a tab after you click its icon there, so click it again on each article you want to hook. Moving to another page on a site you already clicked on shows **Hook this page**.

### What it reads

Hookr decides on your device whether the page is a post, and only a post's words ever leave it.

- **Highlighted text wins.** Select 40 characters or more and Hookr uses exactly that, on any site or feed.
- **X, LinkedIn and Reddit:** a single post's page only (`x.com/<user>/status/<id>`, LinkedIn `/posts/…` or `/feed/update/…`, Reddit `/r/<sub>/comments/…`), and only that post: no replies, comments, counts or buttons. Feeds, profiles and search pages aren't posts.
- **Everywhere else:** [Mozilla Readability](https://github.com/mozilla/readability) pulls out the main text, and Hookr weighs the page's metadata, how long and link-heavy the text is and how many headlines link elsewhere. A post is sent with its title (and subtitle on Substack) as the first line. A homepage or feed sends nothing. When it can't tell, the panel asks before sending, with **Hook it anyway**.
- **Paywalled Substack posts** say so instead of writing from the free preview.

No build step: after changing extension files, click **Reload** on its card, then click the icon again (reloading closes the panel). Right-click inside the panel and choose **Inspect** for its console.

To check the panel's look without Chrome or the API, serve the repo (`python3 -m http.server`) and open http://localhost:8000/design/preview.html: every screen and lens, plus the panel at 320, 420 and 600px wide.

## Commands

| Command | What it does |
| --- | --- |
| `npm test` | Worker, extension and packaging tests |
| `npm run check` | Tests plus a Wrangler deploy dry run (what CI runs) |
| `npm run deploy` | Deploys the `hookr-api` Worker by hand. CI does this on every push to `main` |
| `npm run access-code -- <name>` | Prints a fresh access code and its `name:code` pair |
| `npm run extension:package` | Chrome and Firefox store ZIPs in `dist/`, pointed at the live API |
| `npm run extension:package:dev` | Same files, keeps localhost. Never upload it |
| `node scripts/vendor-readability.mjs` | Copies the pinned `@mozilla/readability` into `extension/vendor/` after a version bump |

## API

Deployed at https://hookr-api.40for40.workers.dev.

- `GET /health`: `{ "ok": true }`
- `POST /post` with `{ "text": "...", "mood": "story" }`: `{ "post": "...", "excerpt": "...", "length": 0 }`. `post` is at most 280 by X's weighted count (`length`), and `excerpt` is the passage from the article that supports it, checked against the text sent. Errors are `{ "error": { "code", "message" } }`, including 429 `rate_limited` past 20 posts a minute from one IP address and 422 `insufficient_source` when the page has too little to work with.

### Access codes (off for now)

Access codes are switched off: `POST /post` answers anyone, and the panel never asks for a code. The check is commented out in `worker/index.js` and `extension/panel.js`, and `worker/access.js` and the `access-code` script are kept, so it can come back by restoring those lines. When it was on, it worked like this.

The API is for the team and Kate while we test, so `POST /post` needs a personal access code. No accounts or sign-in: the Worker secret `ACCESS_CODES` holds `name:code` pairs, comma separated, and each person pastes their code into the panel once. The Worker logs the name, never the code, on each post it writes, so Workers Logs shows who's using it, and it allows each person 20 posts a minute.

- **Add someone:** `npm run access-code -- <name>` prints a fresh code and its pair. Add the pair to the full list (keep it in the team's password manager, never in the repo), run `npm run wrangler -- secret put ACCESS_CODES` and paste the whole list. Send them the code by hand.
- **Revoke someone:** put the list back without their pair. Their next request gets a 401 and the panel asks for a code again.
- `secret put` replaces the whole value and takes effect within seconds, with no code change or CI run. Wrangler can't show a secret's value, so the list in the password manager is the only copy.
- **Locally:** put a pair in `ACCESS_CODES` in `.dev.vars`. With it unset, `POST /post` answers 503 `not_configured`.

The base prompt is [prompts/generate-post-v1.md](prompts/generate-post-v1.md). Each lens (sent as `mood`) selects a separate [lens sub-prompt](prompts/lenses/README.md), composed with the base by `worker/lenses.js`. `mood` is optional; missing or unknown IDs use Pull quote. The reply format is unchanged.

The Worker uses the [AI SDK](https://ai-sdk.dev), so the model is one setting: `MODEL` in `wrangler.jsonc`, written `provider:model` (`anthropic`, `openai` or `google`). It's `anthropic:claude-sonnet-5-5`. CI copies the org's `ANTHROPIC_API_KEY` secret into the Worker on every deploy; switching provider means adding its key (`OPENAI_API_KEY` or `GOOGLE_GENERATIVE_AI_API_KEY`) to the deploy step's `secrets` in `.github/workflows/ci.yml`.

## Publishing

See [publishing/README.md](publishing/README.md).

Questions or bugs: `hello@40for40.app`.
