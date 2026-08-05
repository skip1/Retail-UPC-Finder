# Chrome Web Store Listing — Draft Copy

## Short description (up to ~132 characters)

Finds a product's UPC while you shop and links you straight to a search for
that UPC on another retailer's site.

## Detailed description

UPC Finder for Online Shopping shows you the UPC (barcode number) for
products on supported retailer pages, and gives you a one-click link to
search that same UPC on another retailer's site — handy for quickly
comparing prices or finding the identical item elsewhere.

How it works:
- On a product page, the extension reads the UPC that's already embedded
  in the page's own data and displays it near the title.
- On search/category pages, it looks up the UPC for each product as you
  scroll to it, using your own browser session to view that product's page
  (the same as if you'd clicked into it yourself), and tags the item once
  found.
- Each UPC comes with a link to search for that number on another
  retailer's site, so you can quickly check if the identical product is
  listed there.

This extension is not affiliated with, endorsed by, or sponsored by any
retailer named in this listing. All product names, logos, and brands are
property of their respective owners and are used only to describe
compatibility.

The extension does not collect, store, or transmit any personal data. See
the full privacy policy: [link to hosted PRIVACY_POLICY.md]

## Single purpose statement (required field)

This extension has a single purpose: to display each product's UPC while
browsing a supported shopping site, and to provide a link to search that
UPC on another retailer's site.

## Permission justifications (required field per permission)

**Host permission — retailer domain (e.g. `*://*.walmart.com/*`):**
Required to read the UPC embedded in that site's own product page data,
and to fetch individual product pages (using the user's existing session)
in order to find the UPC for items shown on search/listing pages. No other
domains are accessed, and no data from these pages is transmitted anywhere
— it is only parsed locally to extract the UPC and displayed in the page.

_(No other permissions are requested — no `storage`, no `tabs`, no
`cookies`, no `<all_urls>`, no background/analytics access.)_

## Notes before submitting

- Replace the retailer name placeholders above with whichever site(s) you
  actually support, and double-check Google's current trademark guidance
  (developer.chrome.com/docs/webstore/program-policies/impersonation-and-intellectual-property)
  since it's the section most likely to affect this listing.
- Host the privacy policy at a public URL (e.g. a GitHub Pages link, a
  Gist, or your own site) — the Chrome Web Store requires a live link, not
  just a file in the extension package.
- Take a few real screenshots of the badge/link in action for the listing
  — Chrome Web Store review and users both respond much better to real
  screenshots than to text alone.
