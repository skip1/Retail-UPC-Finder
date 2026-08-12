
// Retail UPC Finder - Product Pages
// Walmart, Target, Best Buy, Costco, Home Depot, and Lowe's product pages.
//
// Handles SPA navigation without requiring a manual refresh.
// Best Buy uses a lightweight special observer path.

(function () {

    console.log(
        "RETAIL UPC PRODUCT SCRIPT START:",
        location.href
    );


    /*
     * -----------------------------------------
     * PRODUCT SCRIPT FLAG
     * -----------------------------------------
     *
     * Do not immediately abort just because the
     * content script was already initialized.
     *
     * SPA sites can navigate from listing -> product
     * without creating a fresh document.
     *
     * We keep one controller per page and let it
     * detect URL changes itself.
     */

    if (window.retailUPCProductController) {

        console.log(
            "RETAIL UPC PRODUCT SCRIPT ALREADY RUNNING"
        );

        return;
    }


    window.retailUPCProductController = true;


    /*
     * -----------------------------------------
     * PRODUCT PAGE CHECK
     * -----------------------------------------
     */

    function isProductPage() {

        const host =
            location.hostname.toLowerCase();

        const path =
            location.pathname;


       if (host.includes("target"))
    return /\/p\//.test(path);

if (host.includes("walmart"))
    return /\/ip\//.test(path);

if (host.includes("bestbuy"))
    return /\/product\//.test(path);

if (host.includes("costco"))
    return /\/p\//.test(path);

if (host.includes("homedepot"))
    return /^\/(p|pep)\//.test(path);

if (host.includes("lowes"))
    return /\/pd\/[^/]+\/\d+/.test(path);

        /*
         * LOWE'S
         *
         * Example:
         * /pd/Dremel-Drill-DD12V-S1/5015662267
         */

        if (host.includes("lowes"))
            return /\/pd\/[^/]+\/\d+/.test(path);


        return false;
    }


    /*
     * -----------------------------------------
     * WALMART / GENERIC NEXT_DATA SEARCH
     * -----------------------------------------
     */

    function findUPC(obj, depth) {

        depth =
            depth || 0;


        if (
            !obj ||
            typeof obj !== "object" ||
            depth > 12
        ) {

            return null;
        }


        /*
         * First look for UPC fields.
         */

        for (
            const key of Object.keys(obj)
        ) {

            if (
                /^upc$/i.test(key) &&
                (
                    typeof obj[key] === "string" ||
                    typeof obj[key] === "number"
                )
            ) {

                const code =
                    String(obj[key])
                        .replace(/\D/g, "");


                if (
                    code.length === 12 &&
                    RetailUPC.isValidUPC(code)
                ) {

                    console.log(
                        "PRODUCT UPC FOUND:",
                        code,
                        "KEY:",
                        key
                    );

                    return code;
                }
            }
        }


        /*
         * Recurse.
         */

        for (
            const key of Object.keys(obj)
        ) {

            const val =
                obj[key];


            if (
                val &&
                typeof val === "object"
            ) {

                const found =
                    findUPC(
                        val,
                        depth + 1
                    );


                if (found)
                    return found;
            }
        }


        return null;
    }


    /*
     * -----------------------------------------
     * NEXT_DATA
     * -----------------------------------------
     */

    function getNextData() {

        const script =
            document.getElementById(
                "__NEXT_DATA__"
            );


        if (!script)
            return null;


        try {

            return JSON.parse(
                script.textContent
            );

        } catch (e) {

            console.log(
                "NEXT_DATA parse failed:",
                e
            );

            return null;
        }
    }


    /*
     * -----------------------------------------
     * WALMART FALLBACK
     * -----------------------------------------
     */

    function extractFromSpecsTable() {

        const candidates =
            document.querySelectorAll(
                "div, tr, li, span"
            );


        for (
            const el of candidates
        ) {

            const text =
                el.textContent.trim();


            if (
                text.length < 80 &&
                /^UPC[:\s]/i.test(text)
            ) {

                const match =
                    text.match(
                        /UPC[:\s]+([0-9]{8,14})/i
                    );


                if (match)
                    return match[1];
            }
        }


        return null;
    }


    /*
     * -----------------------------------------
     * BEST BUY
     * -----------------------------------------
     */

    function extractBestBuyUPC() {

        console.log(
            "BEST BUY UPC EXTRACTION START"
        );


        const scripts =
            document.querySelectorAll(
                "script"
            );


        for (
            const script of scripts
        ) {

            const text =
                script.textContent;


            if (
                !text ||
                text.length < 12
            ) {

                continue;
            }


            /*
             * Don't scan enormous scripts.
             */

            const limited =
                text.length > 500000
                    ? text.substring(
                        0,
                        500000
                    )
                    : text;


            const regex =
                /\b\d{12}\b/g;


            let match;


            while (
                (match =
                    regex.exec(limited))
            ) {

                const code =
                    match[0];


                if (
                    RetailUPC.isValidUPC(
                        code
                    )
                ) {

                    console.log(
                        "BEST BUY UPC FOUND:",
                        code
                    );

                    return code;
                }
            }
        }


        /*
         * Body fallback.
         */

        const body =
            document.body;


        if (!body)
            return null;


        const text =
            body.textContent;


        if (!text)
            return null;


        const limitedText =
            text.length > 500000
                ? text.substring(
                    0,
                    500000
                )
                : text;


        const regex =
            /\b\d{12}\b/g;


        let match;


        while (
            (match =
                regex.exec(limitedText))
        ) {

            const code =
                match[0];


            if (
                RetailUPC.isValidUPC(
                    code
                )
            ) {

                console.log(
                    "BEST BUY UPC FOUND FROM BODY:",
                    code
                );

                return code;
            }
        }


        return null;
    }


    /*
     * -----------------------------------------
     * TARGET
     * -----------------------------------------
     */

    function extractTargetUPC() {

        console.log(
            "TARGET PRODUCT EXTRACTION START"
        );


        const upc =
            RetailUPC.extractTarget(
                document,
                location.href
            );


        console.log(
            "TARGET PRODUCT UPC:",
            upc
        );


        return upc;
    }


    /*
     * -----------------------------------------
     * COSTCO
     * -----------------------------------------
     */

    function extractCostcoUPC() {

        console.log(
            "COSTCO PRODUCT EXTRACTION START"
        );


        const upc =
            RetailUPC.extract(
                "costco",
                document,
                location.href
            );


        console.log(
            "COSTCO PRODUCT UPC:",
            upc
        );


        return upc;
    }


    /*
     * -----------------------------------------
     * HOME DEPOT
     * -----------------------------------------
     */

    function extractHomeDepotUPC() {

        console.log(
            "HOME DEPOT PRODUCT EXTRACTION START"
        );


        const upc =
            RetailUPC.extract(
                "homedepot",
                document,
                location.href
            );


        console.log(
            "HOME DEPOT PRODUCT UPC:",
            upc
        );


        return upc;
    }


    /*
     * -----------------------------------------
     * LOWE'S
     * -----------------------------------------
     */

    function extractLowesUPC() {

        console.log(
            "LOWES PRODUCT EXTRACTION START"
        );


        const upc =
            RetailUPC.extract(
                "lowes",
                document,
                location.href
            );


        console.log(
            "LOWES PRODUCT UPC:",
            upc
        );


        return upc;
    }


    /*
     * -----------------------------------------
     * EXTRACT UPC
     * -----------------------------------------
     */

    function extractUPC() {

        const host =
            location.hostname.toLowerCase();


        /*
         * WALMART
         */

        if (
            host.includes("walmart")
        ) {

            console.log(
                "PRODUCT SITE: walmart"
            );


            const data =
                getNextData();


            if (data) {

                const upc =
                    findUPC(data);


                if (upc)
                    return upc;
            }


            return extractFromSpecsTable();
        }


        /*
         * TARGET
         */

        if (
            host.includes("target")
        ) {

            console.log(
                "PRODUCT SITE: target"
            );


            return extractTargetUPC();
        }


        /*
         * BEST BUY
         */

        if (
            host.includes("bestbuy")
        ) {

            console.log(
                "PRODUCT SITE: bestbuy"
            );


            return extractBestBuyUPC();
        }


        /*
         * COSTCO
         */

        if (
            host.includes("costco")
        ) {

            console.log(
                "PRODUCT SITE: costco"
            );


            return extractCostcoUPC();
        }


        /*
         * HOME DEPOT
         */

        if (
            host.includes("homedepot")
        ) {

            console.log(
                "PRODUCT SITE: homedepot"
            );


            return extractHomeDepotUPC();
        }


        /*
         * LOWE'S
         */

        if (
            host.includes("lowes")
        ) {

            console.log(
                "PRODUCT SITE: lowes"
            );


            return extractLowesUPC();
        }


        return null;
    }


    /*
     * -----------------------------------------
     * INSERT AMAZON BADGE
     * -----------------------------------------
     */

    function insertBadge(upc) {

        if (!upc)
            return false;


        /*
         * Don't create duplicates.
         */

        const existing =
            document.getElementById(
                "retail-upc-badge"
            );


        if (existing)
            return true;


        const titleEl =
            document.querySelector(
                "h1"
            );


        if (!titleEl) {

            console.log(
                "PRODUCT BADGE: no h1 yet"
            );

            return false;
        }


        const amazonUrl =
            "https://www.amazon.com/s?k=" +
            encodeURIComponent(upc) +
            "&tag=retailupcfind-20";


        /*
         * -----------------------------------------
         * COMPACT UPC BADGE
         * -----------------------------------------
         */

        const container =
            document.createElement(
                "div"
            );


        container.id =
            "retail-upc-badge";


        container.className =
            "retail-upc-badge";


        const label =
            document.createElement(
                "span"
            );


        label.className =
            "retail-upc-label";


        label.textContent =
            "UPC: ";


        const value =
            document.createElement(
                "span"
            );


        value.className =
            "retail-upc-value";


        value.textContent =
            upc;


        const link =
            document.createElement(
                "a"
            );


        link.className =
            "retail-upc-link";


        link.href =
            amazonUrl;


        link.target =
            "_blank";


        link.rel =
            "noopener noreferrer";


        link.textContent =
            " Search on Amazon →";


        container.appendChild(
            label
        );


        container.appendChild(
            value
        );


        container.appendChild(
            link
        );


        /*
         * Put the compact UPC row
         * directly underneath the title.
         */

        titleEl.insertAdjacentElement(
            "afterend",
            container
        );


        console.log(
            "PRODUCT AMAZON LINK ADDED:",
            upc
        );


        return true;
    }


    /*
     * -----------------------------------------
     * REMOVE BADGE
     * -----------------------------------------
     */

    function removeBadge() {

        const badge =
            document.getElementById(
                "retail-upc-badge"
            );


        if (badge)
            badge.remove();
    }


    /*
     * -----------------------------------------
     * STATE
     * -----------------------------------------
     */

    let lastUrl =
        location.href;


    let runTimer =
        null;


    let retryTimer =
        null;


    let retryCount =
        0;


    const MAX_RETRIES =
        10;


    let runInProgress =
        false;


    /*
     * -----------------------------------------
     * RESET PRODUCT STATE
     * -----------------------------------------
     */

    function resetProductState() {

        retryCount = 0;

        clearTimeout(runTimer);
        clearTimeout(retryTimer);

        runTimer = null;
        retryTimer = null;

        removeBadge();
    }


    /*
     * -----------------------------------------
     * RUN
     * -----------------------------------------
     */

    function run() {

        if (runInProgress)
            return false;


        if (!isProductPage()) {

            removeBadge();

            return false;
        }


        const currentUrl =
            location.href;


        /*
         * Make sure the badge belongs to the
         * current product.
         */

        const existing =
            document.getElementById(
                "retail-upc-badge"
            );


        if (existing) {

            if (
                existing.dataset.productUrl ===
                currentUrl
            ) {

                return true;
            }


            existing.remove();
        }


        runInProgress =
            true;


        console.log(
            "PRODUCT RUN:",
            currentUrl
        );


        let upc = null;


        try {

            upc =
                extractUPC();

        } catch (e) {

            console.error(
                "PRODUCT UPC EXTRACTION ERROR:",
                e
            );

        }


        runInProgress =
            false;


        console.log(
            "PRODUCT EXTRACT RESULT:",
            upc,
            currentUrl
        );


        if (!upc)
            return false;


        const inserted =
            insertBadge(upc);


        if (!inserted)
            return false;


        const newBadge =
            document.getElementById(
                "retail-upc-badge"
            );


        if (newBadge) {

            newBadge.dataset.productUrl =
                currentUrl;

            newBadge.dataset.upc =
                upc;
        }


        retryCount = 0;


        return true;
    }


    /*
     * -----------------------------------------
     * SCHEDULE RUN
     * -----------------------------------------
     *
     * This is deliberately debounced.
     */

    function scheduleRun(delay) {

        clearTimeout(runTimer);


        runTimer =
            setTimeout(
                function () {

                    runTimer = null;


                    if (
                        location.href !== lastUrl
                    ) {

                        return;
                    }


                    if (!isProductPage()) {

                        removeBadge();

                        return;
                    }


                    const success =
                        run();


                    if (success) {

                        retryCount = 0;

                        return;
                    }


                    /*
                     * Extraction may have happened
                     * before the site's product data
                     * finished rendering.
                     *
                     * Try again.
                     */

                    if (
                        retryCount <
                        MAX_RETRIES
                    ) {

                        retryCount++;


                        const delay =
                            Math.min(
                                500 + (
                                    retryCount *
                                    250
                                ),
                                2500
                            );


                        clearTimeout(
                            retryTimer
                        );


                        retryTimer =
                            setTimeout(
                                function () {

                                    retryTimer =
                                        null;

                                    scheduleRun(
                                        0
                                    );

                                },
                                delay
                            );
                    }

                },
                delay
            );
    }


    /*
     * -----------------------------------------
     * URL CHANGE DETECTION
     * -----------------------------------------
     */

    function checkUrl() {

        const currentUrl =
            location.href;


        if (
            currentUrl === lastUrl
        ) {

            return false;
        }


        console.log(
            "PRODUCT URL CHANGED:",
            currentUrl
        );


        lastUrl =
            currentUrl;


        resetProductState();


        /*
         * Give the SPA a moment to begin
         * rendering the new product.
         */

        if (isProductPage()) {

            scheduleRun(300);

        } else {

            console.log(
                "NEW URL IS NOT A PRODUCT PAGE"
            );
        }


        return true;
    }


    /*
     * -----------------------------------------
     * INITIAL RUN
     * -----------------------------------------
     *
     * Do an immediate attempt, followed by
     * scheduled retries if the page isn't ready.
     */

    if (isProductPage()) {

        run();


        if (
            !document.getElementById(
                "retail-upc-badge"
            )
        ) {

            scheduleRun(500);
        }

    } else {

        console.log(
            "INITIAL URL IS NOT A PRODUCT PAGE:",
            location.href
        );
    }


    /*
     * -----------------------------------------
     * HISTORY API HOOK
     * -----------------------------------------
     *
     * Many retail sites use pushState/replaceState
     * for SPA navigation.
     *
     * We don't modify their functions.
     * We simply periodically detect the URL.
     */


    /*
     * -----------------------------------------
     * DEBOUNCED MUTATION OBSERVER
     * -----------------------------------------
     *
     * Do NOT run extraction on every mutation.
     *
     * Retail sites can generate hundreds or
     * thousands of mutations while rendering.
     */

    let mutationTimer =
        null;


    function scheduleMutationCheck() {

        clearTimeout(
            mutationTimer
        );


        mutationTimer =
            setTimeout(
                function () {

                    mutationTimer =
                        null;


                    /*
                     * URL may have changed without
                     * a separate navigation event.
                     */

                    if (
                        checkUrl()
                    ) {

                        return;
                    }


                    /*
                     * Only retry if we're on a
                     * product page and haven't
                     * successfully inserted a badge.
                     */

                    if (
                        isProductPage() &&
                        !document.getElementById(
                            "retail-upc-badge"
                        )
                    ) {

                        scheduleRun(250);
                    }

                },
                250
            );
    }


    /*
     * Observe only once.
     */

    if (document.body) {

        const observer =
            new MutationObserver(
                function () {

                    scheduleMutationCheck();

                }
            );


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
     * PERIODIC URL SAFETY CHECK
     * -----------------------------------------
     *
     * This catches SPA navigation that changes
     * history/location without producing a useful
     * mutation.
     */

    setInterval(
        function () {

            checkUrl();

        },
        500
    );


    /*
     * -----------------------------------------
     * POPSTATE
     * -----------------------------------------
     */

    window.addEventListener(
        "popstate",
        function () {

            console.log(
                "PRODUCT POPSTATE:",
                location.href
            );


            lastUrl =
                location.href;


            resetProductState();


            if (
                isProductPage()
            ) {

                scheduleRun(300);
            }
        }
    );


    /*
     * -----------------------------------------
     * BEST BUY EXTRA RETRY PATH
     * -----------------------------------------
     *
     * Best Buy frequently renders its product
     * information later than other sites.
     *
     * Keep a lightweight retry loop rather than
     * aggressively scanning the entire DOM.
     */

    if (
        location.hostname
            .toLowerCase()
            .includes("bestbuy")
    ) {

        let bestBuyTimer =
            null;


        function scheduleBestBuyRun(delay) {

            clearTimeout(
                bestBuyTimer
            );


            bestBuyTimer =
                setTimeout(
                    function () {

                        bestBuyTimer =
                            null;


                        if (
                            location.href !==
                            lastUrl
                        ) {

                            checkUrl();

                            return;
                        }


                        if (
                            !isProductPage()
                        ) {

                            return;
                        }


                        if (
                            document.getElementById(
                                "retail-upc-badge"
                            )
                        ) {

                            return;
                        }


                        scheduleRun(0);


                        /*
                         * Continue checking while
                         * the product is rendering.
                         */

                        if (
                            retryCount <
                            MAX_RETRIES
                        ) {

                            scheduleBestBuyRun(
                                1200
                            );
                        }

                    },
                    delay
                );
        }


        scheduleBestBuyRun(1000);
    }


    console.log(
        "RETAIL UPC PRODUCT SCRIPT READY"
    );

})();

