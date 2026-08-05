// Runs on Walmart product detail pages (walmart.com/ip/...)
// Finds the UPC in Walmart's embedded page data and shows a badge with
// a link to search that UPC on Amazon.

(function () {
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

  function getNextData() {
    const script = document.getElementById("__NEXT_DATA__");
    if (!script) return null;
    try {
      return JSON.parse(script.textContent);
    } catch (e) {
      return null;
    }
  }

  function extractFromSpecsTable() {
    // Fallback: scan visible text nodes for a "UPC" spec row.
    const candidates = document.querySelectorAll("div, tr, li, span");
    for (const el of candidates) {
      const text = el.textContent.trim();
      if (text.length < 40 && /^UPC[:\s]/i.test(text)) {
        const match = text.match(/UPC[:\s]+([0-9]{8,14})/i);
        if (match) return match[1];
      }
    }
    return null;
  }

  function extractUPC() {
    const data = getNextData();
    if (data) {
      const upc = findUPC(data);
      if (upc) return upc;
    }
    return extractFromSpecsTable();
  }

  function insertBadge(upc) {
    if (document.getElementById("wm-upc-badge")) return;
    const titleEl = document.querySelector("h1");
    if (!titleEl) return;
    const amazonTag = "retailupcfinder-20";
    const amazonUrl =
        "https://www.amazon.com/s?k=" +
        encodeURIComponent(upc) +
        "&tag=" +
        amazonTag;
    const container = document.createElement("div");
    container.id = "wm-upc-badge";
    container.className = "wm-upc-badge";
    container.innerHTML =
      '<span class="wm-upc-label">UPC:</span>' +
      '<span class="wm-upc-value">' + upc + "</span>" +
      '<a class="wm-upc-link" href="' + amazonUrl + '" target="_blank" rel="noopener noreferrer">Search on Amazon \u2192</a>';

    titleEl.insertAdjacentElement("afterend", container);
  }

  function run() {
    if (document.getElementById("wm-upc-badge")) return;
    const upc = extractUPC();
    if (upc) insertBadge(upc);
  }

  run();

  // Walmart is a single-page app; content re-renders on client-side navigation,
  // so keep watching and re-run when the page changes.
  let lastUrl = location.href;
  const observer = new MutationObserver(function () {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      const old = document.getElementById("wm-upc-badge");
      if (old) old.remove();
      setTimeout(run, 800);
    } else {
      run();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
