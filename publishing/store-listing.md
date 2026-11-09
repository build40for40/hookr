# Chrome Web Store listing (draft)

Copy for the dashboard fields. Check every line against the build you upload, and never name a private client.

## Store listing tab

- **Name:** Hookr
- **Summary (132 characters max, same as the manifest `description`):** <summary>
- **Category:** <closest category>
- **Language:** English (UK)
- **Homepage:** https://build40for40.com/hookr/
- **Support:** hello@40for40.app

**Description:**

> <What it does, in the 40 for 40 voice: informal, funny, no corporate language. Say what it doesn't do yet.>
>
> Built live by 40 for 40.

**Graphics:** icon `extension/icons/icon-128.png`. At least one screenshot at 1280×800, JPEG or 24-bit PNG with no transparency, from the installed extension on a clean profile with sample data. Optional small promo tile 440×280.

## Privacy tab

**Single purpose:** <one sentence>

**Permission reasons:**

- Host permission for `https://hookr-api.40for40.workers.dev/*`: sends the article text of the page the user asked Hookr to read and gets back one post for X. No other site is contacted.
- `activeTab`: reads the current tab only after the user clicks the toolbar button on it. The side panel stays open across tabs, but it can only read a tab the user clicked the button on, and only until that tab leaves the site.
- `scripting`: runs the one function that copies that tab's visible article text.
- `sidePanel`: shows Hookr in Chrome's side panel, opened by the toolbar button, so the post sits next to the article while the author edits and copies it.
- `storage`: keeps the user's Hookr access code on their device, so they paste it once instead of every time the panel opens. Nothing else is stored with it, and the user can forget it from the panel. Access codes are off for now, so nothing uses it: drop the permission or turn codes back on before submitting.

**Remote code:** No. All code is in the package. The service returns JSON data only.

**Data usage:** tick only what the build really handles, including data processed locally on the device (Chrome's user data FAQ counts that too). Read `privacy.md` first. The three certifications (not sold, not used for unrelated purposes, not used for creditworthiness) need checking against Chrome's wording before accepting.

**Privacy policy URL:** https://build40for40.com/privacy/

## Test instructions for reviewers

> Open a public Substack article, then click the Hookr toolbar button. Hookr opens in the side panel and writes one post from the article.

While access codes are off, reviewers need no code. If they come back, use these instructions instead:

> Hookr is invite only while we test it, so it asks for an access code first. Your code is: <reviewer code>. Open a public Substack article, then click the Hookr toolbar button. Hookr opens in the side panel; paste the code and click **Let me in**. It writes one post from the article. The **Access code** link at the bottom of the panel changes or forgets the code.

**The reviewer code:** make one just for the review with `npm run access-code -- chrome-review`, add its pair to `ACCESS_CODES` (`npm run wrangler -- secret put ACCESS_CODES` with the full list) and paste the code above. Never give reviewers a team member's code. Once the review is done, approved or not, revoke it by putting the list back without the `chrome-review` pair, and make a fresh one for the next submission.

## Distribution tab

- Visibility: public or unlisted
- Price: free
- Regions: all
- Publishing: manual, after approval
