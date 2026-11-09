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
- `activeTab`: reads the current tab only when the user clicks the toolbar button.
- `scripting`: runs the one function that copies that tab's visible article text.

**Remote code:** No. All code is in the package. The service returns JSON data only.

**Data usage:** tick only what the build really handles, including data processed locally on the device (Chrome's user data FAQ counts that too). Read `privacy.md` first. The three certifications (not sold, not used for unrelated purposes, not used for creditworthiness) need checking against Chrome's wording before accepting.

**Privacy policy URL:** https://build40for40.com/privacy/

## Test instructions for reviewers

> Open a public Substack article, then click the Hookr toolbar button. <Steps a reviewer can follow with no account, or the test account to use. Never a real user's account.>

## Distribution tab

- Visibility: public or unlisted
- Price: free
- Regions: all
- Publishing: manual, after approval
