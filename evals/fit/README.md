# Lens suitability evaluation

`POST /fit` answers whether this article contains material for each lens. It does not grade the writing or approve generated outputs. `strong` means clear supporting material, `thin` some material but a stretch, and `none` absent required material. Every current registry lens except the default Pull quote is assessed; no count or list is duplicated in the route. Exact style instructions come from the shared registry. Source-specific reasons must describe material, never insult the author.

The frontend mapping remains Lawrence's design: strong is a green solid dot, thin a yellow half dot, none a grey ring and reach card. No red state is introduced. The UI already calls this endpoint after reading each page, alongside generating Pull quote. A missing/failed assessment leaves the lenses unrated. Deploying this branch is required before production can use the route.

The route uses the configured dynamic model, existing bearer access-code auth and shared 20/minute person limit. One fit request consumes one slot, in addition to any post request. Input uses exactly the existing article validation and `MAX_TEXT` cap; a later shared article cap applies to both routes. No model call occurs for invalid auth/input or exhausted limits. Provider errors, malformed JSON, missing/extra IDs, unsupported levels, multiple-sentence reasons and ungrounded evidence return 502. There is one model call with SDK retries disabled, with no invented fallback ratings.

Strong/thin ratings require internal exact contiguous source quotations; none requires an empty evidence array. Source matching normalizes Unicode and whitespace, not words or punctuation. Evidence is stripped from the response. This verifies quotation provenance, not whether it logically supports the rating. A model can still misclassify material or give a poor reason. Quoted example prompts are not evidence of an actual conversation. Confession needs an explicit admission, Behind the page a stated writing motive/process, and Dialogue actual attributed/spoken words.

`fixtures.js` contains reference expectations from card 230 and Kate's design preview. The Kate fixture is a shortened preview source, and its inherited labels are provisional: it is not a full-article gold standard. The other fixtures are small synthetic examples. They exercise absent dialogue (including illustrative prompt quotations), a memoir scene and practical advice. Human calibration may revise these expected labels; changing the reference is separate from improving the model.

To evaluate a saved real response:

```js
import { FIXTURES } from './evals/fit/fixtures.js';
import { evaluateFit } from './evals/fit/index.js';
const report = evaluateFit({
  fixture: FIXTURES[0],
  response: savedWorkerResponse,
  reasonReviews: { dialogue: { pass: true, reason: 'Specific to absence of speech and kind to author', reviewer: 'human:Samira' } },
});
```

The comparator checks complete dynamic coverage and exact reference levels. Every reason needs a named human/model review of source specificity, accuracy, one-sentence form and respectful phrasing; missing reviews remain `not_assessed` and readiness stays `needs_review`. A false green is a failure even if its reason sounds fluent. Store source snapshot, model ID, prompt commit, raw response/error and timestamp; preserve failed runs. Do not save access codes. Compare repeated actual model ratings with Samira's labels before treating the colours as reliable.

`npm test` checks routing, schema rejection, dynamic additions and the comparator. These tests use mocked responses: **no live fit accuracy or reason quality is established yet**. Output-level factual fidelity, exact Dialogue quotes, Pull quote verbatim copying and lens×format adherence remain separately evaluated in `evals/global/` and human review.
