# Hookr

Day 6 of 40 for 40, built live on Twitch on Monday 9 November 2026. The problem is "Repurposing writing into content", from Kate, who sponsored it.

- **Form factor:** a browser extension, for Chrome first and Firefox too, since a developer account is already registered. Anything web-facing, such as the landing page, is served at `build40for40.com/hookr/`.
- **Tracking:** the Superthread `day6` board, the "Day 6" page, and the "Day 6 - brief & prep" page with the kickoff notes.

Shared 40 for 40 context lives in `../AGENTS.md`.

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
