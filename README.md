# UPC Finder for Resellers

Chrome extension (Manifest V3) that shows a product's UPC on supported
shopping sites and gives you one-click links to check that UPC on Google,
Amazon, and eBay.

## What it does

- **Product pages** (e.g. `walmart.com/ip/...`, `target.com/p/...`): adds a
  badge under the product title showing the UPC (click to copy it) and
  links to search that UPC on Google, Amazon, and eBay.
- **Search / category / browse pages**: since UPCs usually aren't present
  in the listing HTML itself, the extension fetches each product's page in
  the background (using your own existing browser session, the same as if
  you'd clicked into it) to find and display its UPC, then tags the tile
  with the same UPC + Google/Amazon/eBay links.
- Background fetches are queued and throttled per-site (see "Concurrency"
  below) rather than firing all at once, and successful results are cached
  for the current page session so scrolling back up doesn't re-fetch.

## Supported sites

Walmart, Target, Best Buy, Costco, Home Depot, and Lowe's.

## Install (unpacked, for testing/personal use)

1. Unzip this folder somewhere permanent (don't delete it after installing —
   Chrome loads the extension from these files).
2. Go to `chrome://extensions`.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and select this extension's folder.
5. Visit a supported retailer's product page, or run a search/browse on
   that site.

## How UPC extraction works

Extraction logic is retailer-specific and lives in `upc.js`:

- **Walmart** — parses the `<script id="__NEXT_DATA__">` JSON blob embedded
  on every page and recursively searches for a UPC/GTIN/barcode field.
  Falls back to scanning visible page text for a labeled UPC if that fails.
- **Target, Home Depot** — scans embedded `<script>` tag contents for a
  valid 12-digit UPC, with a body-text fallback.
- **Best Buy** — searches script contents for the specific
  `ProductSpecification` entry where `displayName` is `"UPC"`.
- **Costco** — checks JSON-LD product data first, then explicit
  `upc`/`gtin`/`barcode` fields in scripts, then visible page text near a
  UPC/GTIN label.
- **Lowe's** — checks for a `barcode` field, then a consumer-unit `EACH`
  barcode, then falls back to a generic script/body scan.

All extracted codes are validated against the UPC-A check-digit algorithm
before being used, to reduce false positives from unrelated 12-digit
numbers on the page.

## Concurrency

Background fetches on listing pages are throttled differently per site,
based on how each site's server responds to concurrent requests:

- **Walmart**: up to 3 concurrent fetches
- **Best Buy, Home Depot**: 1 at a time (Home Depot also has an added
  ~400ms delay between fetches — its server appears to apply stricter
  bot/rate-limit detection than the others)
- **All other supported sites**: up to 2 concurrent fetches

Fetch failures caused by the user navigating away mid-request are detected
and silently ignored (this is expected, not a bug). Other fetch failures
(e.g. HTTP errors, blocked requests) are retried once before being logged.

## Links generated

- **UPC** — click to copy the UPC to your clipboard. Not a link.
- **Google** — plain web search for the UPC.
- **Amazon** — plain search link (`amazon.com/s?k=<UPC>`). Currently
  carries no Associates tag; Amazon's Associates Program does not permit
  Special Links in browser extensions (see "Monetization" below).
- **eBay** — search link tagged with an eBay Partner Network affiliate
  campaign ID. Clicking this link may result in the developer earning a
  commission if you make a purchase (see `PRIVACY_POLICY.md`).

## Known limitations

- **Retailer markup changes over time.** The CSS selectors and extraction
  patterns used per site may need updates if a retailer redesigns its
  pages. If tiles or badges stop appearing on a given site, that's the
  first place to check.
- **Not all products expose a UPC.** Some listings (marketplace sellers,
  certain categories) don't include one in the page data — those tiles are
  skipped rather than showing a wrong value.
- **Home Depot in particular returns occasional HTTP 403 errors** on
  background fetches, likely due to bot-detection on their end. This is
  throttled but not fully eliminated; some tiles on that site may not get
  a UPC even after a retry.
- Listing-page fetches use your own browser session (no external servers
  involved) and are throttled per the concurrency settings above, so cost
  scales with how many products are on the page, not a fixed rate.
- This extension is for personal/testing use as an unpacked extension
  unless/until it's published to the Chrome Web Store.

## Monetization

This extension is free, with no account or subscription required. It may
earn a commission through the eBay Partner Network when a user clicks the
eBay link and makes a purchase. The Amazon link currently carries no
affiliate tag — Amazon Associates does not permit Special Links to be used
in browser extensions, and this was confirmed directly with Amazon
Associates support. See `PRIVACY_POLICY.md` for full disclosure.

## Files

- `manifest.json` — extension configuration
- `content-product.js` — logic for single product pages
- `content-listing.js` — logic for search/browse/listing pages
- `upc.js` — shared UPC extraction logic used by both content scripts
- `style.css` — styling for the injected badge/links
- `PRIVACY_POLICY.md` — privacy policy (host publicly before submitting to
  the Chrome Web Store)
- `STORE_LISTING.md` — draft listing copy, single purpose statement, and
  permission justifications for the Chrome Web Store submission form

## Before submitting to the Chrome Web Store

1. Host `PRIVACY_POLICY.md` at a public URL and link it in the store
   listing.
2. Fill in the single purpose and permission justification fields using
   `STORE_LISTING.md` as a starting point.
3. Add real screenshots of the extension in action.
4. Review Google's current trademark/impersonation policy before
   finalizing your listing copy, since using retailer names in a
   description (even just to describe compatibility) is the area most
   likely to draw scrutiny:
   https://developer.chrome.com/docs/webstore/program-policies/impersonation-and-intellectual-property
5. Confirm your Trader/Non-Trader declaration is accurate to your current
   business status before publishing.
6. This is provided as a starting point, not legal advice — if you want
   certainty about how a retailer's terms of service apply to fetching
   their pages programmatically, or about affiliate program compliance,
   that's worth a direct check with the program in question or a lawyer.
