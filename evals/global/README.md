# Shared output evaluation

One rubric applies across tweet, essay (Substack/LinkedIn), shorts, Instagram and thread (X/Threads). Format checks are separate from editorial judgment. No heuristic or mock test establishes that writing is human, faithful or good.

Mechanical rules reuse `worker/formats.js`, so generation and evaluation stay aligned. Run validator regression tests with `node --test evals/global/*.test.js`. These test the evaluator, not live model performance. Keep the existing v1 baseline and raw failures unchanged.

For a saved JSON evaluation input, run `node evals/global/run.mjs path/to/run.json` (or pipe JSON to stdin). It prints the report without modifying the record. Exit codes: 0 pass, 1 failure, 2 needs review, 3 invalid input. Do not turn a missing review into a green CI check.

```js
import { evaluateOutput } from './evals/global/index.js';
const report = evaluateOutput({
  article: sourceSnapshot,
  output: generatedResponse, // {post, excerpt, posts?}
  format: 'tweet', platform: 'x', lens: 'story', promptVersion: 'git-commit',
  judgments: reviewerAssessment,
  now: '2026-11-09T12:00:00Z',
});
```

Review against the exact source and selected lens instructions, not a hardcoded number of lenses. The current agreed definitions are tracked in Superthread cards 230 (decision record) and 224 (Lawrence). `lens` resolves through the shared `LENSES` registry; reports include a `lensDefinition` snapshot of its stable ID, current label and exact instructions. Send that snapshot to the judge. Unknown IDs fail `known_lens` and keep `lens_fit` unassessed; they never silently evaluate the default style. Use a trusted historical `lensRegistry` when replaying an older definition. Score each criterion **0: fails; 1: acceptable; 2: strong**, with a reason and `reviewer` identity (human or exact judge model). Missing assessments remain `not_assessed`. Any deterministic or editorial failure fails readiness; missing required review gives `needs_review`. Trend assessment is optional for evergreen posts. Set `trendRequested: true` for timely mode: missing evidence then gives `needs_review`, and poor trend alignment fails.

| Criterion | Review question |
| --- | --- |
| `source_fidelity` | Is every claim supported, with original uncertainty preserved? No invented numbers, experiences, quotations or promises? |
| `naturalness` | Would this read naturally aloud? Specific phrasing, varied rhythm, no filler, canned transitions or forced engagement? This is editorial quality, not AI detection. |
| `author_voice` | Does vocabulary, rhythm, point of view and tone resemble this source? |
| `lens_fit` | Does the actual selected lens affect delivery without overpowering voice or facts? |
| `hook_and_usefulness` | Is the opening specific and compelling, with a coherent useful payoff? |
| `platform_fit` | Does it work in its intended format: standalone tweet; progressing thread; structured essay; speakable script; readable caption? This is evergreen fit, not a current trend claim. |

For source fidelity, include `claims: [{claim, quote}]`: claim must occur in the output and quote in the source. Reviewer must map **every** factual claim; a substring match alone cannot verify completeness or entailment. Exact excerpt checks also cannot establish that an excerpt supports the whole output. Optional model-judge instructions are in `judge-prompt.md`; model review needs human calibration before relying on its scores.

## Format rules

- Tweet: `twitter-text` weighted length <=280 (including emoji/URLs). [Official counting rules](https://docs.x.com/fundamentals/counting-characters).
- Thread: `posts` contains three to five complete posts; `post === posts.join('\n\n')`. X defaults to conservative 280 weighted characters per post; this is a Hookr editorial choice, not X Premium's maximum. Threads defaults to 500 Unicode code points including numbering. [Meta announcement](https://about.fb.com/news/2023/07/introducing-threads-new-app-text-sharing/). Publishing APIs may count Unicode differently: validate again at integration. Shared Worker validation also enforces these caps; any future policy change belongs in the format registry and shared validator, then in this adapter.
- Shorts: 60–120 seconds is the team's requested range, not YouTube's maximum. Estimate from plain spoken `post` at configurable `constraints.wordsPerMinute` (default150); time a real spoken read before publishing. Stage directions should not be included in the spoken post. [YouTube permits up to three minutes](https://support.google.com/youtube/answer/15424877?hl=en).
- Essay/caption: reuse shared Worker rules (essay <=700 words for Substack and LinkedIn articles, Instagram <=2200 characters). LinkedIn here means a long-form article, not a feed post. These are conservative Hookr product caps, not assertions of universal platform maxima. `constraints.maxCharacters` adds a stricter editorial cap. Review completeness/structure manually.

Platform docs checked 9 November 2026. Neither a passing length check nor a generated `estimatedSeconds` guarantees successful publication.

## Current trend evidence

Supply `trendSignals: [{platform, url, publishedAt, observedAt, observation, evidence}]`. `observation` names the format pattern; `evidence` records what was actually observed at the linked source. Both dates are ISO8601. Only HTTP(S), matching-platform, nonfuture signals published and observed within `maxAgeDays` (default7) are eligible. Re-observing an old article does not make it fresh. A dated URL is provenance, not independent proof of popularity: reviewers must verify credibility, representativeness and the claimed pattern. Never label generic platform advice “trending.”

`judgments.trend_fit` needs the same score/reason/reviewer plus `evidenceUrls` referencing eligible signals. Without evidence, it is `not_assessed`, even if a model confidently says a format is trending. No live data is fetched by this offline evaluator. Topic relevance and popularity are distinct from format patterns. Trend context may guide presentation; factual claims still come only from the author's article.

## Run records

Save source snapshot/fixture ID, prompt and lens commit, exact model ID, settings, timestamp, format/platform, raw response, report, reviewer and claim mappings for every run. Never save credentials. Compare criterion pass rates across repeated runs and models, not only an average. Preserve failures and abstentions; don't replace them with successful retries. Include insufficient source, embedded malicious instructions, false numbers, uncertain claims, wrong lens and irrelevant trend signals in the regression corpus. Live model evaluation remains to be run; unit tests do not measure generation quality.

The current categories are post shapes, not tones. Evaluate Story against an actual event; Confession against an explicit author admission; Behind the page against a stated writing motive or process; Dialogue against exact source speech. Never fill missing material with an invented experience or motive. Best line must stay verbatim; longer-format interplay needs explicit review. This output evaluator does not measure `/fit` rating accuracy or reason quality; reference fixtures and saved-response comparisons live in `evals/fit/`, and the route is implemented in `worker/fit.js`; live calibration remains pending under card 230.
