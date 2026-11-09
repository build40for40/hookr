# Output formats

The Worker supports six format families and ten platform variants: the five agreed in card 218 plus a short feed post for LinkedIn and Threads. The extension's format picker (`extension/formats.js`) sends `format` and `platform` and renders each result.

## Frontend contract

Send `POST /post` (access codes are off for now, so no `Authorization` header is needed):

```json
{"text":"The extracted article", "mood":"calm", "format":"essay", "platform":"linkedin"}
```

| Stable format ID | Platform values (first is default) | Product output rules |
|---|---|---|
| `tweet` (default) | `x` | One valid X post, at most 280 weighted characters |
| `feed` | `linkedin`, `threads` | One feed post, at most 500 NFC Unicode code points |
| `essay` | `substack`, `linkedin`, `x` | Article/essay with title; target 400–700 words, maximum 700; shorter is allowed when source material is limited |
| `shorts` | `youtube` | Spoken-only script, 150–300 words; estimated 60–120 seconds at 150 words/minute |
| `instagram` | `instagram` | One caption, target 80–160 words; maximum 2,200 NFC Unicode code points |
| `thread` | `x`, `threads` | 3–5 distinct posts; X at most 280 weighted characters each, Threads at most 500 NFC Unicode code points each |

The essay for LinkedIn or X is an **article**, not a feed update; `feed` is the feed update. The word targets, maximum essay length, thread size and speaking rate are product defaults, not platform maximums or guarantees of actual reading time. Scripts need a timed read aloud. X threads work conservatively without requiring a paid plan; paid-only longer posts are not implemented. Threads text attachments are not implemented. The conservative caption/Threads caps are product rules; verify a final draft in its native composer before posting.

For new formats, the response keeps `post` as copyable text, with the source `excerpt` and `length`, and adds `format` and `platform`. Non-tweet `length` is NFC Unicode code points, **not** X weighted length. Threads also return `posts: string[]`; `post` equals `posts.join('\n\n')`. Shorts also return `estimatedSeconds: number`.

```json
{"post":"First.\n\nSecond.\n\nThird.","excerpt":"Exact source passage.","length":23,"format":"thread","platform":"threads","posts":["First.","Second.","Third."]}
```

Tweet responses retain exactly the old `{post, excerpt, length}` schema, including weighted length. Missing format defaults to tweet; missing platform uses that format's default. Unknown IDs, malformed types and incompatible platforms return 400 before a model call. Unknown mood IDs keep the existing Elegant fallback. Auth, rate limits, model configuration and input-size enforcement remain unchanged. Ben owns the separate 3,000-word input change.

## Prompt and validation design

Each non-tweet type has a separate prompt module in this directory. The registry owns stable IDs and allowed platform variants. Frontend labels may change independently. The existing tweet prompt stays in `prompts/generate-post-v1.md`. Non-tweet requests use shared source/voice rules, the selected format prompt and the selected lens; the tweet-only 280-character instructions never enter the essay or script base prompt.

Non-tweet model replies use JSON `{content, excerpt, posts?}`; explicit `{"abstain":true}` becomes 422 `insufficient_source`. Malformed replies, output-limit failures and non-verbatim excerpts retry up to three times with corrective feedback, then become 502 `no_valid_post`. These are mechanical guards. A valid excerpt only proves that passage exists; it does not establish that the full output is truthful, human-sounding or faithful. Run the global evaluations and review drafts before release.

Nothing here retrieves trends or claims a template is currently trending. Current platform/trend suitability requires dated evidence, supplied separately to the global evaluation workflow.

## Sources checked 9 November 2026

- [X character counting](https://docs.x.com/fundamentals/counting-characters): use `twitter-text` for the 280-character product format.
- [LinkedIn posts versus articles](https://www.linkedin.com/help/linkedin/answer/a522483/differences-between-posting-and-publishing?lang=en): the 3,000-character feed limit is not applied to the essay/article format.
- [Meta: Threads longer text attachments](https://about.fb.com/news/2025/09/attach-text-threads-posts-share-longer-perspectives/): ordinary posts and longer attachments are distinct; this product emits ordinary posts.

Tests use mock models to verify request routing, prompt composition, output contracts, retry/abstention behavior and mechanical limits. Passing them does not establish live model writing quality.
