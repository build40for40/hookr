# Lens sub-prompts

The Worker composes the approved base prompt from `worker/prompt.js` with one sub-prompt from its own lens file, registered in `index.js`, then shared source and output boundaries from `worker/lenses.js`. The base v1 document is unchanged. This composition is a new prompt variant; mock integration tests do not establish live writing quality.

## Current lenses

A lens is a kind of post (a copywriting style), not a tone or a platform, and works with every output format. Best line is the default and the only verbatim lens; the others may reword, but every claim must come from the page. Card 230 on the `day6` board has the full reasoning and the fit evals.

| Stable ID | UI label | Direction |
| --- | --- | --- |
| line | Best line | Strongest sentence, word for word; default |
| story | Story | Opens in a moment from the page, then the turn |
| lesson | Lesson | The author's lesson, then what taught it |
| take | Hot take | The point most readers would push back on |
| question | Question | A question the piece answers, answered from it |
| howto | How-to | The author's advice as steps |
| cliffhanger | Cliffhanger | The setup, stopping before the payoff |
| confession | Confession | An admission the author actually makes |
| scene | Scene | One vivid detail from the page, no point made |
| behind | Behind the page | Why or how the author wrote it, if they say |
| dialogue | Dialogue | Speech quoted exactly from the page |

The retired moods (elegant, calm, light, serious, dramatic, beast, tiktok) fall back to `line`.

## Fit

The extension also asks `POST /fit { text }` for `{ fit: { <id>: { level: 'strong' | 'thin' | 'none', reason } } }` covering every lens except `line`, to colour the picker and gate reaches. The route isn't built yet; until it is, the extension leaves lenses unrated. `reason` is one sentence for the author, about the page and never a judgement of the writing.

## Frontend and Worker contract

`POST /post` accepts `{ "text": "article", "mood": "story" }` and still returns `{ post, excerpt, length }`. The existing extension already sends `mood`. The ID selects server-owned instructions; clients cannot supply arbitrary sub-prompts. Missing or unknown IDs use Best line; malformed non-string/oversized mood values return 400.

Labels are not IDs. Rename a button without changing its stable ID when its meaning is unchanged. To change its meaning, edit its own sub-prompt file or introduce a new ID. Never silently repurpose a saved ID for an unrelated lens: existing installs remember it. Unknown retired IDs fall back to Best line.

To add a lens, add its UI metadata in `extension/moods.js`, its own sub-prompt file and registration in `index.js`. No Worker route or model call logic changes are needed. The frontend coverage test catches missing sub-prompts. Remove its UI entry when retiring a lens; keeping its sub-prompt briefly supports older extension versions.

Run `npm run check` and `npm run extension:package:dev`. Live evaluation should compare the same source across lenses, scoring fidelity and exact excerpts before style. Mood instructions must never weaken the base source rules or change the parsed reply labels. A rewritten post may correctly be flagged by the frontend as not word for word; it must never be presented as a verbatim quotation.

Trend context is a separate future input, not a mood and not implemented here. Never claim a topic is trending without fresh evidence.
