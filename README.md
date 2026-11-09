# Hookr

A browser extension for Day 6 of [40 for 40](https://build40for40.com), built live on [Twitch](https://www.twitch.tv/40for40).

Hookr is for published authors who want a marketing drip feed from writing they've already done. Open one of your articles, say a Substack post, click Hookr, and it hands back one post for X built around a hook from your own words. Nothing invented, and sized for X's 280 characters.

## Run it locally

Needs Node.js 24 (see `.node-version`), a model and an API key for its provider.

```sh
npm ci
cp .dev.vars.example .dev.vars   # then fill in MODEL and that provider's key
npm run dev
```

That starts the API on http://localhost:8787. Then:

1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and choose this repo's `extension/` folder.
3. Pin Hookr from the puzzle-piece menu, open an article and click its icon.

No build step: after changing extension files, click **Reload** on its card.

## Commands

| Command | What it does |
| --- | --- |
| `npm test` | Worker, extension and packaging tests |
| `npm run check` | Tests plus a Wrangler deploy dry run (what CI runs) |
| `npm run deploy` | Deploys the `hookr-api` Worker by hand. CI does this on every push to `main` |
| `npm run extension:package` | Store ZIP in `dist/`, pointed at the live API |
| `npm run extension:package:dev` | Same files, keeps localhost. Never upload it |

## API

Deployed at https://hookr-api.40for40.workers.dev.

- `GET /health`: `{ "ok": true }`
- `POST /post` with `{ "text": "..." }`: `{ "post": "..." }`, at most 280 characters. Errors are `{ "error": { "code", "message" } }`.

The Worker uses the [AI SDK](https://ai-sdk.dev), so the model is one setting: `MODEL`, written `provider:model` (`anthropic`, `openai` or `google`). Nothing is assumed: set `MODEL` and the matching key (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY` or `GOOGLE_GENERATIVE_AI_API_KEY`) as Worker secrets, and `/post` answers 503 until `MODEL` is set.

## Publishing

See [publishing/README.md](publishing/README.md).

Questions or bugs: `hello@40for40.app`.
