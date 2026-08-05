# UPC Finder for Online Shopping

Chrome extension (Manifest V3) that shows a product's UPC on supported
shopping sites and gives you a one-click link to search that UPC on
another retailer's site.

## What it does

- **Product pages** (`walmart.com/ip/...`): adds a badge under the title with
  the UPC and a "Search on Amazon →" link (`amazon.com/s?k=<UPC>`).
- **Search / category / browse pages**: since UPCs aren't in the listing
  HTML, the extension fetches each product's page in the background (3 at a
  time) and tags each tile with a small "UPC ... ↗" link once found. Tiles
  are only fetched once they scroll near the viewport (via
  `IntersectionObserver`), so it only does work for products you actually
  scroll to, not the whole results page at once.

## Install (unpacked, for testing/personal use)

1. Unzip this folder somewhere permanent (don't delete it after installing —
   Chrome loads the extension from these files).
2. Go to `chrome://extensions`.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and select the `upc-finder-extension-v1` folder.
5. Visit any Walmart product page or run a search on walmart.com.

## How UPC extraction works

Walmart embeds full product data as JSON in a `<script id="__NEXT_DATA__">`
tag on every page. The extension parses that JSON and recursively looks for
a `upc` field. If that ever fails (Walmart changes its data structure), it
falls back to scanning the visible "Specifications" text for a line like
`UPC: 012345678905`.

## Known limitations

- **Walmart's markup changes over time.** The CSS selectors used to find
  product tiles on listing pages (`[data-item-id]`, links containing `/ip/`)
  may need small updates if Walmart redesigns the search page. If tiles stop
  getting tagged, that's the first place to check.
- **Not all products expose a UPC.** Some listings (marketplace sellers,
  certain categories) don't include one in the page data — those tiles are
  skipped rather than showing a wrong value.
- **Listing pages fetch each product page** to get its UPC, which uses your
  own browser session (no external servers involved). Fetching is lazy
  (only tiles near the viewport) and throttled to 3 concurrent requests, so
  the cost scales with how far you scroll rather than hitting all at once.
  Results are cached per session so scrolling back up doesn't refetch.
- This is for personal/testing use as an unpacked extension — it isn't
  packaged for the Chrome Web Store.

## Files

- `manifest.json` — extension configuration
- `content-product.js` — logic for single product pages
- `content-listing.js` — logic for search/browse pages
- `style.css` — styling for the injected badge/links
- `PRIVACY_POLICY.md` — privacy policy (host publicly before submitting to the Chrome Web Store)
- `STORE_LISTING.md` — draft listing copy, single purpose statement, and permission justifications for the Chrome Web Store submission form

## Before submitting to the Chrome Web Store

1. Host `PRIVACY_POLICY.md` at a public URL and link it in the store listing.
2. Fill in the single purpose and permission justification fields using `STORE_LISTING.md` as a starting point.
3. Add real screenshots of the extension in action.
4. Review Google's current trademark/impersonation policy before finalizing your listing copy, since using retailer names in a description (even just to describe compatibility) is the area most likely to draw scrutiny:
   https://developer.chrome.com/docs/webstore/program-policies/impersonation-and-intellectual-property
5. This is provided as a starting point, not legal advice — if you want certainty about how Walmart's (or any retailer's) terms of service apply to fetching their pages programmatically, that's worth a quick check with someone who can review their specific terms.
