# Lens sub-prompts

The Worker composes the approved base prompt from `worker/prompt.js` with one sub-prompt from its own lens file, registered in `index.js`, then shared source and output boundaries from `worker/lenses.js`. The base v1 document is unchanged. This composition is a new prompt variant; mock integration tests do not establish live writing quality.

## Current lenses

| Stable ID | Current UI label | Direction |
| --- | --- | --- |
| elegant | Elegant | Understated, polished, concise; default |
| calm | Calm | Measured, reassuring; keep important warnings |
| light | Light | Warm, conversational, gently playful |
| serious | Serious | Precise, restrained, supported consequences |
| dramatic | Dramatic | Tension through pacing, without exaggeration |
| beast | MrBeast mode | High energy and concrete payoff; no named-creator imitation |
| tiktok | TikTok mode | Immediate conversational hook; still one X text post |

## Frontend and Worker contract

`POST /post` accepts `{ "text": "article", "mood": "calm" }` and still returns `{ post, excerpt, length }`. The existing extension already sends `mood`. The ID selects server-owned instructions; clients cannot supply arbitrary sub-prompts. Missing or unknown IDs use Elegant; malformed non-string/oversized mood values return 400.

Labels are not IDs. Rename a button without changing its stable ID when its meaning is unchanged. To change its meaning, edit its own sub-prompt file or introduce a new ID. Never silently repurpose a saved ID for an unrelated lens: existing installs remember it. Unknown retired IDs fall back to Elegant.

To add a lens, add its UI metadata in `extension/moods.js`, its own sub-prompt file and registration in `index.js`, and its visual tokens in `extension/panel.css`. No Worker route or model call logic changes are needed. The frontend coverage test catches missing sub-prompts. Remove its UI entry when retiring a lens; keeping its sub-prompt briefly supports older extension versions.

Run `npm run check` and `npm run extension:package:dev`. Live evaluation should compare the same source across lenses, scoring fidelity and exact excerpts before style. Mood instructions must never weaken the base source rules or change the parsed reply labels. A rewritten post may correctly be flagged by the frontend as not word for word; it must never be presented as a verbatim quotation.

Trend context is a separate future input, not a mood and not implemented here. Never claim a topic is trending without fresh evidence.
