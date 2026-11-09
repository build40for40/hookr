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
| Main flow | Not run | On a text-only Substack article, clicking the icon shows one post of 280 characters or fewer, in the author's words |
| Unreadable page | Not run | On `chrome://extensions` or the Web Store the popup says it can't read the page |
| Service down | Not run | A plain error, nothing broken |
| Privacy check | Not run | DevTools Network tab shows requests only to the Hookr service, carrying only the article text |
| Store install | Not run | Installing from the store gives the same version as the tested ZIP |
| Update | Not run | Uploading the next version updates the installed copy with data intact |

Screenshots for the listing come from this run: 1280×800, browser zoom 100%, sample data only, no personal bookmarks or tabs visible. Export JPEGs for the store (no transparency) and strip metadata with `exiftool -all= -overwrite_original <file>` before committing.
