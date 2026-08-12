// Retail UPC Finder - Listing Pages
// Walmart, Target, Best Buy, Costco, Home Depot, and Lowe's.
//
// Best Buy is handled separately to minimize memory usage.
// The queue stores URLs, NOT DOM tile references.

(function () {

    if (window.retailUPCListingLoaded)
        return;

    window.retailUPCListingLoaded = true;


    const AMAZON_TAG = "retailupcfind-20";

    const CONCURRENCY = 1;

    const queue = [];
    let active = 0;

    const cache = new Map();
    const MAX_CACHE = 100;


    function setCache(url, value) {

        if (cache.size >= MAX_CACHE)
            cache.delete(
                cache.keys().next().value
            );

        cache.set(url, value);
    }


    function getSite() {

        const host =
            location.hostname.toLowerCase();

        if (host.includes("walmart"))
            return "walmart";

        if (host.includes("target"))
            return "target";

        if (host.includes("bestbuy"))
            return "bestbuy";

        if (host.includes("costco"))
            return "costco";

        if (host.includes("homedepot"))
            return "homedepot";

        if (host.includes("lowes"))
            return "lowes";

        return null;
    }


    const SITE = getSite();


    console.log(
        "Listing script active:",
        SITE,
        location.href
    );


    if (!SITE)
        return;


    const CONFIG = {

        walmart: {
            links: 'a[href*="/ip/"]',
            title: '[data-automation-id="product-title"]'
        },

        target: {
            links: 'a[href*="/p/"]',
            title: '[data-test="product-title"]'
        },

        bestbuy: {
            links: 'a[href*="/product/"]',
            title: '.product-title'
        },

        costco: {
            links: 'a[href*=".product."]',
            title: '[data-testid^="Text_ProductTile_"][data-testid$="_title"]'
        },

       homedepot: {
    links: 'a[href*="/p/"], a[href*="/pep/"]',
    title: 'a[href*="/p/"], a[href*="/pep/"]'
},

lowes: {
    links: 'a[href*="/pd/"]',
    title: '[data-selector="splp-prd-ttl"]'
}

};

    


    /*
     * -----------------------------------------
     * RESOLVE HREF
     * -----------------------------------------
     */

    function resolveHref(a) {

        try {

            let url =
                new URL(
                    a.href,
                    location.origin
                );


            /*
             * Walmart sponsored tracking links
             */

            if (
                SITE === "walmart" &&
                url.pathname.includes("/sp/track")
            ) {

                const rd =
                    url.searchParams.get("rd");

                if (rd) {
                    url = new URL(rd);
                }
            }


            return url.href;


        } catch (e) {

            return null;
        }
    }


    /*
     * -----------------------------------------
     * PRODUCT URL
     * -----------------------------------------
     */

    function isProductURL(url) {

        if (SITE === "walmart")
            return /\/ip\/[^/]+\/\d+/.test(url);

        if (SITE === "target")
            return /\/p\/[^?#]+/.test(url);

        if (SITE === "bestbuy")
            return /\/product\/.*\/sku\/\d+/.test(url);

        if (SITE === "costco")
            return /\/[^/?#]+\.product\.\d+\.html/i.test(url);

       if (SITE === "homedepot")
    return /\/(?:p|pep)\/[^/?#]+\/\d+/.test(url);

        if (SITE === "lowes")
            return /\/pd\/[^/?#]+\/\d+/.test(url);

        return false;
    }


    /*
     * -----------------------------------------
     * BEST BUY
     * -----------------------------------------
     *
     * IMPORTANT:
     *
     * We return ONLY URLs.
     *
     * We do NOT retain DOM tile references.
     */

    function getBestBuyURLs() {

        const found = new Set();

        const links =
            document.querySelectorAll(
                'a[href*="/product/"]'
            );

        for (const a of links) {

            const href =
                resolveHref(a);

            if (
                !href ||
                !/\/product\/.*\/sku\/\d+/i.test(href)
            ) {
                continue;
            }

            found.add(href);
        }

        return Array.from(found);
    }


    /*
     * -----------------------------------------
     * FIND CURRENT BEST BUY TILE
     * -----------------------------------------
     *
     * This is intentionally called AFTER
     * the UPC has been found.
     *
     * Therefore the extension doesn't retain
     * stale Best Buy DOM nodes while fetching.
     */

    function findBestBuyTile(url) {

        const match =
            String(url).match(
                /\/product\/.*\/sku\/(\d+)/i
            );

        if (!match)
            return null;

        const wantedSKU =
            match[1];


        const links =
            document.querySelectorAll(
                'a[href*="/product/"]'
            );


        for (const a of links) {

            const href =
                resolveHref(a);


            if (!href)
                continue;


            const currentMatch =
                String(href).match(
                    /\/product\/.*\/sku\/(\d+)/i
                );


            if (
                !currentMatch ||
                currentMatch[1] !== wantedSKU
            ) {
                continue;
            }


            const tile =
                a.closest(
                    ".sku-block"
                );


            if (tile)
                return tile;
        }


        return null;
    }


    /*
     * -----------------------------------------
     * GET TILES
     * -----------------------------------------
     */

    function getTiles() {


        /*
         * -----------------------------------------
         * BEST BUY
         * -----------------------------------------
         */

        if (SITE === "bestbuy") {

            return getBestBuyURLs()
                .map(url => [
                    url,
                    null
                ]);
        }


        /*
         * -----------------------------------------
         * TARGET
         * -----------------------------------------
         */

        if (SITE === "target") {

            const found =
                new Map();

            const links =
                document.querySelectorAll(
                    'a[href*="/p/"]'
                );

            links.forEach(a => {

                const href =
                    resolveHref(a);

                if (
                    !href ||
                    !/\/p\/[^?#]+/.test(href)
                ) {
                    return;
                }

                const tile =
                    a.closest(
                        '[data-test="@web/site-top-of-funnel/ProductCardWrapper"]'
                    )
                    ||
                    a.closest(
                        '[data-test="@web/ProductCard/ProductCardVariantDefaultWrapper"]'
                    )
                    ||
                    a.closest(
                        '[data-test="@web/ProductCard/ProductCardVariantDefault"]'
                    );

                if (!tile) {

                    console.log(
                        "TARGET: no product card found",
                        a
                    );

                    return;
                }

                if (!found.has(href)) {

                    found.set(
                        href,
                        tile
                    );
                }

            });

            return Array.from(
                found.entries()
            );
        }


        /*
         * -----------------------------------------
         * WALMART
         * -----------------------------------------
         */

        if (SITE === "walmart") {

            const found =
                new Map();

            const links =
                document.querySelectorAll(
                    'a[href*="/ip/"], a[href*="/sp/track"]'
                );

            links.forEach(a => {

                const href =
                    resolveHref(a);

                if (
                    !href ||
                    !isProductURL(href)
                ) {
                    return;
                }

                const tile =
                    a.closest(
                        '[data-test-id="gpt-main"]'
                    );

                if (!tile) {

                    console.log(
                        "WALMART: no gpt-main product tile found",
                        a
                    );

                    return;
                }

                if (!found.has(href)) {

                    found.set(
                        href,
                        tile
                    );
                }

            });

            return Array.from(
                found.entries()
            );
        }


        /*
         * -----------------------------------------
         * COSTCO
         * -----------------------------------------
         */

        if (SITE === "costco") {

            const found =
                new Map();

            const links =
                document.querySelectorAll(
                    'a[href*=".product."]'
                );

            links.forEach(a => {

                const href =
                    resolveHref(a);

                if (
                    !href ||
                    !isProductURL(href)
                ) {
                    return;
                }

                const tile =
                    a.closest(
                        '[data-testid^="ProductTile_"]'
                    );

                if (!tile) {

                    console.log(
                        "COSTCO: no ProductTile found",
                        a
                    );

                    return;
                }

                if (!found.has(href)) {

                    found.set(
                        href,
                        tile
                    );
                }

            });

            return Array.from(
                found.entries()
            );
        }


        /*
         * -----------------------------------------
         * HOME DEPOT
         * -----------------------------------------
         */

       if (SITE === "homedepot") {

    const found =
        new Map();

    const links =
        document.querySelectorAll(
            'a[href*="/p/"], a[href*="/pep/"]'
        );

    links.forEach(a => {

        const href =
            resolveHref(a);

        if (
            !href ||
            !isProductURL(href)
        ) {
            return;
        }

        const tile =
            a.closest(
                '[data-testid="product-pod"]'
            )
            ||
            a.closest(
                '[data-testid*="product-pod"]'
            )
            ||
            a.closest(
                '[class*="product-pod"]'
            )
            ||
            a.closest(
                '[class*="ProductPod"]'
            )
            ||
            a.closest(
                '[data-testid*="product"]'
            )
            ||
            a.closest(
                'li'
            );

        if (!tile) {

            console.log(
                "HOME DEPOT: no product tile found",
                a
            );

            return;
        }

        if (!found.has(href)) {

            found.set(
                href,
                tile
            );
        }

    });

    return Array.from(
        found.entries()
    );
}

        /*
         * -----------------------------------------
         * LOWE'S
         * -----------------------------------------
         */

        if (SITE === "lowes") {

            const found =
                new Map();

            const links =
                document.querySelectorAll(
                    'a[href*="/pd/"]'
                );

            links.forEach(a => {

                const href =
                    resolveHref(a);

                if (
                    !href ||
                    !isProductURL(href)
                ) {
                    return;
                }

                const tile =
                    a.closest(
                        '[data-selector="prd-description-zone"]'
                    );

                if (!tile) {

                    console.log(
                        "LOWES: description zone not found",
                        a
                    );

                    return;
                }

                if (!found.has(href)) {

                    found.set(
                        href,
                        tile
                    );
                }

            });

            return Array.from(
                found.entries()
            );
        }


        /*
         * -----------------------------------------
         * DEFAULT
         * -----------------------------------------
         */

        return [];
    }


    /*
     * -----------------------------------------
     * FETCH UPC
     * -----------------------------------------
     */

    async function fetchUPC(url) {

        console.log(
            "Fetching:",
            url
        );


        if (cache.has(url)) {

            return cache.get(url);
        }


        try {

            const response =
                await fetch(
                    url,
                    {
                        credentials: "include",

                        headers: {
                            "accept":
                                "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",

                            "cache-control":
                                "no-cache"
                        }
                    }
                );


            console.log(
                "FINAL URL:",
                response.url
            );


            console.log(
                "STATUS:",
                response.status
            );


            if (!response.ok) {

                console.log(
                    "UPC FETCH HTTP ERROR:",
                    response.status,
                    response.url
                );

                return null;
            }


            const html =
                await response.text();


            console.log(
                "FETCHED HTML LENGTH:",
                html.length
            );


            /*
             * -----------------------------------------
             * RETAIL UPC MODULE
             * -----------------------------------------
             */

            if (!window.RetailUPC) {

                console.error(
                    "RetailUPC module is not loaded"
                );

                return null;
            }


            /*
             * -----------------------------------------
             * BEST BUY
             * -----------------------------------------
             */

            if (SITE === "bestbuy") {

                return window.RetailUPC.findBestBuyUPC(
                    html
                );
            }


            /*
             * -----------------------------------------
             * EVERYTHING ELSE
             * -----------------------------------------
             */

            const doc =
                new DOMParser()
                    .parseFromString(
                        html,
                        "text/html"
                    );


            const result =
                window.RetailUPC.extract(
                    SITE,
                    doc,
                    response.url
                );


            /*
             * Cache successful and failed
             * results so the same product
             * isn't repeatedly fetched.
             */

            setCache(
                url,
                result
            );


            return result;


        } catch (e) {

            console.error(
                "UPC fetch failed",
                e
            );

            return null;
        }
    }


    /*
     * -----------------------------------------
     * ADD AMAZON LINK
     * -----------------------------------------
     */

    function addAmazonLink(
        tile,
        upc
    ) {

        if (!tile || !upc)
            return;


        if (
            tile.querySelector(
                ".retail-upc-mini"
            )
        ) {
            return;
        }


        console.log(
            "ADDING UPC:",
            upc,
            "SITE:",
            SITE
        );


        const link =
            document.createElement(
                "a"
            );


        link.className =
            "retail-upc-mini";


        link.target =
            "_blank";


        link.rel =
            "noopener noreferrer";


        link.href =
            "https://www.amazon.com/s?k=" +
            encodeURIComponent(upc) +
            "&tag=" +
            AMAZON_TAG;


        link.textContent =
            "UPC " + upc + " →";


        /*
         * -----------------------------------------
         * HOME DEPOT
         * -----------------------------------------
         */

        if (SITE === "homedepot") {

            const header =
                tile.querySelector(
                    '[data-testid="product-header"]'
                );

            if (header) {

                header.appendChild(link);

            } else {

                tile.appendChild(link);
            }

            link.style.position =
                "relative";

            link.style.zIndex =
                "20";

            link.style.pointerEvents =
                "auto";

            return;
        }


        /*
         * -----------------------------------------
         * TARGET
         * -----------------------------------------
         */

        if (SITE === "target") {

            const card =
                tile.closest(
                    '[data-test="@web/site-top-of-funnel/ProductCardWrapper"]'
                )
                ||
                tile.closest(
                    '[data-test="@web/ProductCard/ProductCardVariantDefaultWrapper"]'
                )
                ||
                tile.closest(
                    '[data-test="@web/ProductCard/ProductCardVariantDefault"]'
                );


            if (card) {

                const details =
                    card.querySelector(
                        '[data-test="product-details"]'
                    );


                if (details) {

                    details.appendChild(
                        link
                    );

                } else {

                    card.appendChild(
                        link
                    );
                }


            } else {

                tile.appendChild(
                    link
                );
            }


            return;
        }


        /*
         * -----------------------------------------
         * BEST BUY
         * -----------------------------------------
         */

        if (SITE === "bestbuy") {

            const title =
                tile.querySelector(
                    'a[href*="/product/"]'
                );


            if (title) {

                title.after(
                    link
                );

            } else {

                tile.appendChild(
                    link
                );
            }


            return;
        }


        /*
         * -----------------------------------------
         * WALMART
         * -----------------------------------------
         */

        if (SITE === "walmart") {

            const title =
                tile.querySelector(
                    CONFIG[SITE].title
                )
                ||
                tile.querySelector(
                    "a"
                );


            if (title) {

                title.after(
                    link
                );

            } else {

                tile.appendChild(
                    link
                );
            }


            return;
        }


        /*
         * -----------------------------------------
         * COSTCO
         * -----------------------------------------
         */

        if (SITE === "costco") {

            const productLink =
                tile.querySelector(
                    'a[href*=".product."]'
                );


            if (
                productLink &&
                productLink.parentNode
            ) {

                productLink.parentNode.insertBefore(
                    link,
                    productLink.nextSibling
                );


                link.style.position =
                    "relative";

                link.style.zIndex =
                    "1000";

                link.style.pointerEvents =
                    "auto";


                link.addEventListener(
                    "click",
                    function (e) {

                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();


                        window.open(
                            link.href,
                            "_blank",
                            "noopener,noreferrer"
                        );
                    },
                    true
                );

            } else {

                tile.appendChild(
                    link
                );
            }


            return;
        }


        /*
         * -----------------------------------------
         * DEFAULT
         * -----------------------------------------
         */

        tile.appendChild(
            link
        );
    }


    /*
     * -----------------------------------------
     * BEST BUY PROCESSED URLS
     * -----------------------------------------
     */

    const bestBuyProcessed =
        new Set();


    /*
     * -----------------------------------------
     * PROCESS TILE
     * -----------------------------------------
     */

    async function processTile(
        tile,
        url
    ) {

        console.log(
            "PROCESSING:",
            url
        );


        const upc =
            await fetchUPC(
                url
            );


        console.log(
            "RESULT UPC:",
            upc,
            url
        );


        if (!upc)
            return;


        /*
         * BEST BUY:
         *
         * Find the CURRENT tile only now.
         */

        if (SITE === "bestbuy") {

            const currentTile =
                findBestBuyTile(
                    url
                );


            if (currentTile) {

                addAmazonLink(
                    currentTile,
                    upc
                );
            }


            return;
        }


        /*
         * Walmart / Target / Costco /
         * Home Depot / Lowe's continue
         * using their existing tile references.
         */

        if (tile) {

            addAmazonLink(
                tile,
                upc
            );
        }
    }


    /*
     * -----------------------------------------
     * PUMP
     * -----------------------------------------
     */

    function pump() {

        while (
            active < CONCURRENCY &&
            queue.length
        ) {

            const job =
                queue.shift();


            active++;


            job()
                .finally(() => {

                    active--;

                    pump();
                });
        }
    }


    /*
     * -----------------------------------------
     * BEST BUY UPC CACHE
     * -----------------------------------------
     */

    const bestBuyUPCs =
        new Map();


    /*
     * -----------------------------------------
     * BEST BUY SCAN
     * -----------------------------------------
     */

    function scanBestBuy() {

        const products =
            getBestBuyURLs();

        let added = 0;

        for (
            const url
            of products
        ) {

            const match =
                String(url).match(
                    /\/product\/.*\/sku\/(\d+)/i
                );


            if (!match)
                continue;


            const sku =
                match[1];


            /*
             * If we already fetched this SKU,
             * don't fetch it again.
             */

            if (
                bestBuyProcessed.has(sku)
            ) {
                continue;
            }


            /*
             * Mark immediately so repeated
             * scans cannot queue duplicates.
             */

            bestBuyProcessed.add(sku);


            added++;


            queue.push(
                async function () {

                    console.log(
                        "BEST BUY FETCH:",
                        sku,
                        url
                    );


                    const upc =
                        await fetchUPC(
                            url
                        );


                    console.log(
                        "BEST BUY UPC:",
                        sku,
                        upc
                    );


                    if (!upc)
                        return;


                    /*
                     * Find the CURRENT tile.
                     */

                    const currentTile =
                        findBestBuyTile(
                            url
                        );


                    if (currentTile) {

                        addAmazonLink(
                            currentTile,
                            upc
                        );

                    } else {

                        console.log(
                            "BEST BUY TILE NOT FOUND:",
                            sku
                        );
                    }

                }
            );
        }


        if (added) {

            console.log(
                "BEST BUY NEW PRODUCTS:",
                added
            );


            pump();
        }
    }


    /*
     * -----------------------------------------
     * NORMAL SCAN
     * -----------------------------------------
     */

    function scan() {

        if (SITE === "bestbuy") {

            scanBestBuy();

            return;
        }


        const tiles =
            getTiles();


        console.log(
            "SITE:",
            SITE
        );


        console.log(
            "Tiles:",
            tiles
        );


        for (
            const [url, tile]
            of tiles
        ) {

            if (
                tile.dataset.upcQueued
            ) {
                continue;
            }


            tile.dataset.upcQueued =
                "1";


            queue.push(
                () =>
                    processTile(
                        tile,
                        url
                    )
            );
        }


        pump();
    }


    /*
     * -----------------------------------------
     * INITIAL SCAN
     * -----------------------------------------
     */

    setTimeout(
        scan,
        SITE === "bestbuy"
            ? 3000
            : 5000
    );


    /*
     * -----------------------------------------
     * BEST BUY OBSERVER
     * -----------------------------------------
     */

    if (SITE === "bestbuy") {

        let observer = null;

        let timer = null;


        function stopBestBuyObserver() {

            if (observer) {

                observer.disconnect();

                observer = null;
            }


            clearTimeout(
                timer
            );


            timer = null;
        }


        function scheduleBestBuyScan() {

            clearTimeout(
                timer
            );


            timer =
                setTimeout(
                    () => {

                        scanBestBuy();

                    },
                    2500
                );
        }


        observer =
            new MutationObserver(
                () => {

                    scheduleBestBuyScan();
                }
            );


        if (document.body) {

            observer.observe(
                document.body,
                {
                    childList: true,
                    subtree: true
                }
            );


            setTimeout(
                stopBestBuyObserver,
                30000
            );
        }
    }


   /*
 * -----------------------------------------
 * WALMART / TARGET / COSTCO /
 * HOME DEPOT / LOWE'S OBSERVER
 * -----------------------------------------
 */

if (
    SITE === "walmart" ||
    SITE === "target" ||
    SITE === "costco" ||
    SITE === "homedepot" ||
    SITE === "lowes"
) {

    let observerTimer = null;

    let scans = 0;

    const MAX_SCANS = 5;

    const SCAN_DELAY = 3000;


    /*
     * -----------------------------------------
     * PRODUCT URL CHECK
     * -----------------------------------------
     *
     * Used to detect when a listing page
     * becomes a product page through SPA
     * navigation without a full reload.
     */

    function isCurrentProductURL(url) {

        if (!url)
            return false;


        if (SITE === "walmart")
            return /\/ip\/[^/?#]+\/\d+/.test(url);


        if (SITE === "target")
            return /\/p\/[^?#]+/.test(url);


        if (SITE === "costco")
            return /\/[^/?#]+\.product\.\d+\.html/i.test(url);


        if (SITE === "homedepot")
            return /\/(?:p|pep)\/[^/?#]+\/\d+/.test(url);


        if (SITE === "lowes")
            return /\/pd\/[^/?#]+\/\d+/.test(url);


        return false;
    }


    /*
     * -----------------------------------------
     * LAST URL
     * -----------------------------------------
     */

    let lastUrl =
        location.href;


    /*
     * -----------------------------------------
     * CHECK URL
     * -----------------------------------------
     */

    function checkListingURL() {

        const currentUrl =
            location.href;


        if (
            currentUrl === lastUrl
        ) {

            return false;
        }


        console.log(
            "LISTING URL CHANGED:",
            lastUrl,
            "->",
            currentUrl
        );


        lastUrl =
            currentUrl;


        /*
         * -----------------------------------------
         * LISTING -> PRODUCT
         * -----------------------------------------
         *
         * IMPORTANT:
         *
         * If the retailer performed SPA navigation
         * from a listing to a product, content-product.js
         * may NOT be injected again.
         *
         * We therefore stop listing processing here.
         *
         * The product script, if injected normally,
         * will handle the product page.
         */

        if (
            isCurrentProductURL(
                currentUrl
            )
        ) {

            console.log(
                SITE.toUpperCase(),
                "SPA NAVIGATION TO PRODUCT PAGE:",
                currentUrl
            );


            /*
             * Stop any pending listing scan.
             */

            clearTimeout(
                observerTimer
            );


            observerTimer =
                null;


            /*
             * Do NOT scan product DOM as a listing.
             */

            return true;
        }


        /*
         * -----------------------------------------
         * PRODUCT -> LISTING
         * -----------------------------------------
         */

        console.log(
            SITE.toUpperCase(),
            "SPA NAVIGATION TO LISTING PAGE"
        );


        /*
         * Reset scan counter because this is
         * effectively a new listing page.
         */

        scans = 0;


        return true;
    }


    /*
     * -----------------------------------------
     * MUTATION OBSERVER
     * -----------------------------------------
     */

    const observer =
        new MutationObserver(
            function () {


                /*
                 * First detect SPA URL changes.
                 */

                const urlChanged =
                    checkListingURL();


                /*
                 * If the new URL is a product page,
                 * do not run listing scans.
                 */

                if (
                    isCurrentProductURL(
                        location.href
                    )
                ) {

                    return;
                }


                /*
                 * -----------------------------------------
                 * STOP AFTER MAX SCANS
                 * -----------------------------------------
                 */

                if (
                    scans >= MAX_SCANS
                ) {

                    observer.disconnect();

                    console.log(
                        SITE.toUpperCase(),
                        "LISTING OBSERVER STOPPED AFTER",
                        scans,
                        "SCANS"
                    );

                    return;
                }


                /*
                 * -----------------------------------------
                 * DEBOUNCE MUTATIONS
                 * -----------------------------------------
                 */

                clearTimeout(
                    observerTimer
                );


                observerTimer =
                    setTimeout(
                        function () {


                            /*
                             * URL may have changed while
                             * the debounce timer was waiting.
                             */

                            if (
                                checkListingURL()
                            ) {

                                if (
                                    isCurrentProductURL(
                                        location.href
                                    )
                                ) {

                                    return;
                                }
                            }


                            /*
                             * Don't scan a product page.
                             */

                            if (
                                isCurrentProductURL(
                                    location.href
                                )
                            ) {

                                return;
                            }


                            scans++;


                            console.log(
                                SITE.toUpperCase(),
                                "LISTING SCAN",
                                scans
                            );


                            scan();


                            /*
                             * Stop after maximum scans.
                             */

                            if (
                                scans >= MAX_SCANS
                            ) {

                                observer.disconnect();

                                clearTimeout(
                                    observerTimer
                                );

                                observerTimer =
                                    null;


                                console.log(
                                    SITE.toUpperCase(),
                                    "LISTING OBSERVER STOPPED"
                                );
                            }

                        },
                        SCAN_DELAY
                    );
            }
        );


    /*
     * -----------------------------------------
     * START OBSERVER
     * -----------------------------------------
     */

    if (document.body) {

        observer.observe(
            document.body,
            {
                childList: true,
                subtree: true
            }
        );

    }


    /*
     * -----------------------------------------
     * PERIODIC URL CHECK
     * -----------------------------------------
     *
     * Some retailers can change the URL without
     * producing a useful DOM mutation.
     *
     * This lightweight check catches that case.
     */

       const urlCheckTimer =
        setInterval(
            function () {

                const changed =
                    checkListingURL();

                if (
                    isCurrentProductURL(
                        location.href
                    )
                ) {

                    clearInterval(
                        urlCheckTimer
                    );

                    console.log(
                        SITE.toUpperCase(),
                        "LISTING URL CHECK STOPPED ON PRODUCT PAGE"
                    );
                }

                if (
                    changed &&
                    !isCurrentProductURL(
                        location.href
                    )
                ) {

                    scans = 0;

                    console.log(
                        SITE.toUpperCase(),
                        "LISTING PAGE DETECTED:",
                        location.href
                    );

                    clearTimeout(
                        observerTimer
                    );

                    observerTimer =
                        setTimeout(
                            function () {

                                scan();

                            },
                            1000
                        );
                }

            },
            1000
        );

}})();