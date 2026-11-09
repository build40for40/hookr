# Release checks

Run these on a **clean Chrome profile** with sample data. Record the Chrome version, the ZIP name, the date and the result for each run.

Chrome 137 and later ignore `--load-extension` on the command line, so these checks are manual: unzip the store ZIP and load the folder with **Load unpacked**.

| Check | Result | What good looks like |
| --- | --- | --- |
| Package builds | Not run | `npm run extension:package` succeeds and `test/package.test.js` passes in CI |
| ZIP contents | Not run | Only the allowlisted files; no localhost in the manifest; `DEFAULT_API` is the live service |
| Loads in Chrome | Not run | No errors on `chrome://extensions`; name, version and icon are right |
| Icon | Not run | Readable in the toolbar in light and dark Chrome themes |
| Install prompt | Not run | Asks only for what the extension uses |
| Opens the side panel | Not run | Clicking the icon opens Hookr in the side panel, never a popup, and the panel fills its height |
| Access code asked | Not run | On a fresh install the panel asks for an access code before writing anything; the field hides what's typed |
| Wrong code | Not run | A made-up code shows "That code didn't work" and stays on the access screen; nothing else breaks |
| Right code | Not run | A real code (the reviewer one is fine) writes a post, and closing and reopening the panel doesn't ask again |
| Change or forget code | Not run | **Access code** in the footer opens the screen with **Back**; **Forget my code on this browser** clears it and the next post asks again |
| Revoked code | Not run | After the code is taken out of `ACCESS_CODES`, the next post shows the access screen with the wrong code message |
| Main flow | Not run | On a text-only Substack article, clicking the icon shows one post of 280 characters or fewer, in the author's words |
| Substack details | Not run | The post sent starts with its title and subtitle, and no "Subscribe" or button text appears in it (check the request body in the panel's DevTools) |
| Paywalled post | Not run | Signed out, a paid-only Substack post says it's behind a paywall and sends nothing |
| News article | Not run | A BBC News article is hooked; the request body has the story without captions, byline or "Top stories" |
| Homepage | Not run | The BBC News homepage says Hookr can't find a post, and DevTools shows no request to the service |
| Might not be a post | Not run | A page Hookr can't call, such as a short about page, shows **Hook it anyway**, and nothing is sent until it's clicked |
| Highlighted text | Not run | Highlighting a paragraph on any page, even a feed, and clicking the icon hooks exactly that paragraph |
| X | Not run | Signed in: a tweet's own page hooks that tweet; on a reply's page, the reply, not the tweet above it; the home feed and a profile say there's no post |
| LinkedIn | Not run | Signed in: a post's page (`/posts/…` or `/feed/update/…`) hooks the post text without comments or reaction counts; the feed says there's no post |
| Reddit | Not run | A post's page hooks its title and body without comments; a subreddit's front page says there's no post |
| Custom domain | Not run | The main flow works on a Substack post on its own domain, with no extra permission prompt |
| Switching tab | Not run | On another tab the post stays and the panel says it can't read the tab; clicking the icon there hooks that tab |
| Moving to a feed | Not run | With a post showing, following a link to a homepage or feed on the same site keeps the post and says there's no post here |
| Same site, new page | Not run | Following a link to another post on the same site keeps the post and offers **Hook this page** |
| Panel width | Not run | Dragging the panel from narrowest to widest leaves no horizontal scroll and nothing cut off |
| Unreadable page | Not run | On `chrome://extensions` or the Web Store, clicking the icon opens the panel and it says it can't read the tab |
| Service down | Not run | A plain error, nothing broken |
| Privacy check | Not run | DevTools Network tab shows requests only to the Hookr service, carrying only the post's text, the mood and the access code header, and none on pages that aren't posts |
| Store install | Not run | Installing from the store gives the same version as the tested ZIP |
| Update | Not run | Uploading the next version updates the installed copy with data intact |

Screenshots for the listing come from this run: 1280×800, browser zoom 100%, sample data only, no personal bookmarks or tabs visible. Export JPEGs for the store (no transparency) and strip metadata with `exiftool -all= -overwrite_original <file>` before committing.
