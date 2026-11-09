# Publishing the extension

How Hookr goes from `extension/` to something people install. Chrome comes first; Firefox Add-ons is on the publishing card too and isn't covered here yet.

| File | What it's for |
| --- | --- |
| `store-listing.md` | Copy for the Chrome Web Store dashboard: listing, privacy tab, reviewer notes |
| `privacy.md` | Facts for the app's section of https://build40for40.com/privacy/ |
| `testing.md` | Release checks to run on a clean Chrome profile |
| `../brand/icon.svg` | The source drawing for `extension/icons/` |

## Build the package

```sh
npm run extension:package        # dist/hookr-chrome-<version>.zip, the one you upload
npm run extension:package:dev    # dist/hookr-chrome-<version>-dev.zip, keeps localhost, never upload
```

The store build differs from `extension/` in two ways, so whoever installs it gets a working extension with nothing to set up:

- `http://localhost:8787/*` is removed from `host_permissions`.
- `DEFAULT_API` in `api.js` points at `https://hookr-api.40for40.workers.dev`.

The build stops if `extension/` has a file that isn't in `RUNTIME_FILES`, if the manifest would be rejected (version, description over 132 characters, missing icons, a referenced file not in the allowlist) or if the `DEFAULT_API` line no longer matches the rewrite. `LICENSE` from the repo root goes in when it exists.

Check a package before uploading:

```sh
unzip -l dist/hookr-chrome-0.1.0.zip
unzip -p dist/hookr-chrome-0.1.0.zip manifest.json
```

## Distribution route

- **Chrome Web Store, public or unlisted**, under the 40 for 40 Ltd developer account (fee already paid). One click to install and automatic updates. Unlisted keeps it out of search for hand-picked users. Review took longer than a day on Day 3, so it won't be live on the day we submit.
- **Same-day fallback: a direct download.** Send the store ZIP with these steps: unzip it somewhere permanent, open `chrome://extensions`, turn on Developer mode, **Load unpacked**, choose the folder. Chrome shows a developer-mode banner and every update means a new ZIP.

## Submit to the Chrome Web Store

1. Bump `version` in `extension/manifest.json`, then `npm run extension:package` and check the ZIP as above.
2. Check the Worker the store build points at is deployed and answers (CI deploys on merge to `main`; `npm run deploy` by hand otherwise).
3. Open the [developer dashboard](https://chrome.google.com/webstore/devconsole) on the 40 for 40 Ltd account. **Add new item** and upload the ZIP.
4. **Store listing:** paste from `store-listing.md`. Upload the 128px icon and at least one real 1280×800 screenshot of the installed extension (see `testing.md`). No mockups or concept images.
5. **Privacy:** paste the single purpose, permission reasons and data answers from `store-listing.md`, and the privacy policy URL once the site has a section for this app.
6. **Distribution:** public or unlisted, free, all regions.
7. **Test instructions:** from `store-listing.md`. Reviewers need a working live API. While access codes are off they need nothing else; if codes are back on, make a `chrome-review` code as `store-listing.md` says, and revoke it once the review is done.
8. Submit with **manual publishing**, so we choose when it goes live.
9. After approval: publish, install from the store on a clean profile and repeat `testing.md` against it.

Later versions: bump `version`, build, upload to the same item. Never create a second item: its ID is the extension's identity.

## Blockers before submitting

- [ ] The live Worker is deployed and the store build points at it.
- [ ] If access codes are back on, a `chrome-review` code is in `ACCESS_CODES` and in the test instructions.
- [ ] A privacy section for this app is live on https://build40for40.com/privacy/ (`site` repo), written from `privacy.md`.
- [ ] Real screenshots from `testing.md`.
- [ ] Listing copy and privacy answers checked against the build being uploaded.

## References

- [Chrome Web Store: publish](https://developer.chrome.com/docs/webstore/publish)
- [Chrome Web Store: images](https://developer.chrome.com/docs/webstore/images)
- [User data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)
- [Manifest reference](https://developer.chrome.com/docs/extensions/reference/manifest)
