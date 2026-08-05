// Runs on Walmart search/browse/category pages.
// Listing tiles don't include the UPC, so as each tile scrolls near the
// viewport we fetch its product page in the background, pull the UPC out
// of the same embedded data used on the detail page, and tag the tile with
// a small link. Tiles off-screen are left alone until the user scrolls to
// them, so the background work scales with what's actually being viewed.

(function () {
  const CONCURRENCY = 3;
  const cache = new Map(); // productUrl -> upc | null

  function findUPC(obj, depth) {
    depth = depth || 0;
    if (!obj || typeof obj !== "object" || depth > 6) return null;

    for (const key of Object.keys(obj)) {
      if (/^upc$/i.test(key) && typeof obj[key] === "string" && obj[key].replace(/\D/g, "").length >= 8) {
        return obj[key].replace(/\D/g, "");
      }
    }
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (val && typeof val === "object") {
        const found = findUPC(val, depth + 1);
        if (found) return found;
      }
    }
    return null;
  }

  async function fetchUPC(url) {
    if (cache.has(url)) return cache.get(url);
    try {
      const res = await fetch(url, { credentials: "include" });
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      const script = doc.getElementById("__NEXT_DATA__");
      let upc = null;
      if (script) {
        try {
          upc = findUPC(JSON.parse(script.textContent));
        } catch (e) {
          /* ignore parse errors */
        }
      }
      cache.set(url, upc);
      return upc;
    } catch (e) {
      cache.set(url, null);
      return null;
    }
  }

  function getProductTiles() {
    const links = Array.from(document.querySelectorAll('a[href*="/ip/"]'));
    const tiles = new Set();
    for (const a of links) {
      const tile = a.closest("[data-item-id]") || a.closest('div[role="group"]') || a.parentElement;
      if (tile) tiles.add(tile);
    }
    return Array.from(tiles);
  }

  function injectLink(tile, upc) {
    if (tile.querySelector(".wm-upc-mini")) return;
     const amazonTag = "retailupcfinder-20";
     const amazonUrl =
        "https://www.amazon.com/s?k=" +
        encodeURIComponent(upc) +
        "&tag=" +
        amazonTag;
    const el = document.createElement("a");
    el.className = "wm-upc-mini";
    el.href = amazonUrl;
    el.target = "_blank";
    el.rel = "noopener noreferrer";
    el.textContent = " Search UPC On Amazon " + upc + " \u2197";
    el.addEventListener("click", function (e) {
     e.preventDefault();
     e.stopPropagation();
     e.stopImmediatePropagation();
     window.open(el.href, "_blank", "noopener,noreferrer");
     return false;
 }, true);   // <-- capture phase
    const title = tile.querySelector('[data-automation-id="product-title"]');

if (!title) return;

const container = document.createElement("div");
container.style.position = "relative";
container.style.zIndex = "9999";
container.className = "wm-upc-container";

el.style.position = "relative";
el.style.zIndex = "9999";
el.style.display = "inline-block";

container.appendChild(el);
title.parentElement.appendChild(container);
  }

  const queue = [];
  let active = 0;

  function pump() {
    while (active < CONCURRENCY && queue.length) {
      const job = queue.shift();
      active++;
      job().finally(function () {
        active--;
        pump();
      });
    }
  }

  function queueTile(tile) {
    if (tile.dataset.wmUpcQueued) return;
    const link = tile.querySelector('a[href*="/ip/"]');
    if (!link) return;
    tile.dataset.wmUpcQueued = "1";
    let href;
    try {
      href = new URL(link.getAttribute("href"), location.origin).href;
    } catch (e) {
      return;
    }
    queue.push(async function () {
      const upc = await fetchUPC(href);
      if (upc) injectLink(tile, upc);
    });
    pump();
  }

  // Only fetch a tile's UPC once it's actually scrolled near the viewport,
  // instead of fetching every product on the page up front. This keeps the
  // background network/CPU cost proportional to what the user is actually
  // looking at.
  const lazyObserver = new IntersectionObserver(
    function (entries) {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          queueTile(entry.target);
          lazyObserver.unobserve(entry.target);
        }
      }
    },
    {
      root: null,
      rootMargin: "600px 0px", // start fetching a bit before tiles enter view
      threshold: 0,
    }
  );

  function watchTiles() {
    const tiles = getProductTiles();
    for (const tile of tiles) {
      if (tile.dataset.wmUpcQueued || tile.dataset.wmUpcWatched) continue;
      tile.dataset.wmUpcWatched = "1";
      lazyObserver.observe(tile);
    }
  }

  watchTiles();

  // New tiles get added as the user scrolls/paginates (infinite scroll,
  // filters, etc.) - keep watching for them, but don't re-scan or re-fetch
  // anything already queued.
  const domObserver = new MutationObserver(function () {
    watchTiles();
  });
  domObserver.observe(document.body, { childList: true, subtree: true });
})();
