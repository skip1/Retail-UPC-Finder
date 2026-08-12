
// Retail UPC Finder - UPC Extraction
// Supports Walmart, Target, Best Buy, Costco,
// Home Depot, and Lowe's.

(function () {

    console.log(
        "RETAIL UPC MODULE LOADING"
    );


    /*
     * Do NOT reference the local RetailUPC
     * before it has been initialized.
     */

    if (
        window.RetailUPC
    ) {

        console.log(
            "RETAIL UPC MODULE ALREADY LOADED"
        );

        return;
    }


    const RetailUPC = {};


    /*
     * -----------------------------------------
     * UPC VALIDATION
     * -----------------------------------------
     */

    RetailUPC.isValidUPC = function (code) {

        if (!/^\d{12}$/.test(code))
            return false;

        let sum = 0;

        for (let i = 0; i < 11; i++) {

            const digit =
                code.charCodeAt(i) - 48;

            sum +=
                digit * (i % 2 === 0 ? 3 : 1);
        }

        const check =
            (10 - (sum % 10)) % 10;

        return (
            check ===
            code.charCodeAt(11) - 48
        );
    };


    /*
     * -----------------------------------------
     * NEXT_DATA
     * -----------------------------------------
     */

    RetailUPC.getNextData = function (doc) {

        const el =
            doc.getElementById(
                "__NEXT_DATA__"
            );

        if (!el)
            return null;

        try {

            return JSON.parse(
                el.textContent
            );

        } catch (e) {

            console.log(
                "NEXT_DATA parse failed"
            );

            return null;
        }
    };


    /*
     * -----------------------------------------
     * SITE
     * -----------------------------------------
     */

    RetailUPC.getSite = function (host) {

        host =
            String(host || "")
                .toLowerCase();

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
    };


    /*
     * -----------------------------------------
     * BEST BUY
     * -----------------------------------------
     *
     * Scan only the first 500 KB.
     *
     * Do not create a giant matches array.
     */

    RetailUPC.findBestBuyUPC = function (html) {

        if (!html)
            return null;

        const limit =
            Math.min(
                html.length,
                500000
            );

        const chunk =
            html.substring(
                0,
                limit
            );

        const regex =
            /\b\d{12}\b/g;

        let match;

        while (
            (match = regex.exec(chunk))
        ) {

            const code =
                match[0];

            if (
                RetailUPC.isValidUPC(
                    code
                )
            ) {

                console.log(
                    "BEST BUY UPC:",
                    code
                );

                return code;
            }
        }

        return null;
    };


    /*
     * -----------------------------------------
     * WALMART
     * -----------------------------------------
     */

    RetailUPC.extractWalmart = function (doc) {

        console.log(
            "WALMART EXTRACT START"
        );

        const next =
            RetailUPC.getNextData(
                doc
            );

        if (next) {

            const found =
                findWalmartUPC(
                    next,
                    0
                );

            if (found) {

                console.log(
                    "WALMART UPC FOUND:",
                    found
                );

                return found;
            }
        }


        /*
         * Fallback:
         *
         * Only scan NEXT_DATA.
         */

        const script =
            doc.getElementById(
                "__NEXT_DATA__"
            );

        if (script) {

            const text =
                script.textContent;

            const regex =
                /\b\d{12}\b/g;

            let match;

            while (
                (match = regex.exec(text))
            ) {

                const code =
                    match[0];

                if (
                    RetailUPC.isValidUPC(
                        code
                    )
                ) {

                    console.log(
                        "WALMART UPC FALLBACK:",
                        code
                    );

                    return code;
                }
            }
        }


        console.log(
            "NO WALMART UPC"
        );

        return null;
    };


    /*
     * -----------------------------------------
     * HOME DEPOT
     * -----------------------------------------
     */

    RetailUPC.extractHomeDepot = function (doc) {

        console.log(
            "HOME DEPOT UPC EXTRACTION START"
        );

        const regex =
            /\b\d{12}\b/g;


        /*
         * Search scripts first.
         */

        const scripts =
            doc.querySelectorAll(
                "script"
            );

        for (
            const script of scripts
        ) {

            const text =
                script.textContent;

            if (!text)
                continue;

            regex.lastIndex = 0;

            let match;

            while (
                (match =
                    regex.exec(text))
            ) {

                const code =
                    match[0];

                if (
                    RetailUPC.isValidUPC(
                        code
                    )
                ) {

                    console.log(
                        "HOME DEPOT UPC:",
                        code
                    );

                    return code;
                }
            }
        }


        /*
         * Fallback:
         *
         * Search visible page text.
         */

        const body =
            doc.body;

        if (!body)
            return null;

        const text =
            body.textContent;

        regex.lastIndex = 0;

        let match;

        while (
            (match =
                regex.exec(text))
        ) {

            const code =
                match[0];

            if (
                RetailUPC.isValidUPC(
                    code
                )
            ) {

                console.log(
                    "HOME DEPOT UPC FALLBACK:",
                    code
                );

                return code;
            }
        }


        console.log(
            "NO HOME DEPOT UPC"
        );

        return null;
    };


    /*
     * -----------------------------------------
     * LOWE'S
     * -----------------------------------------
     *
     * Lowe's product data contains:
     *
     * "barcode":"885911780551"
     *
     * and:
     *
     * "barcodes":[
     *   {
     *      "code":"885911780551",
     *      "hierarchyLevel":"EACH",
     *      "consumerUnit":"true"
     *   }
     * ]
     *
     * Prefer the main barcode.
     * Then prefer the consumer-unit EACH barcode.
     */

    RetailUPC.extractLowes = function (doc) {

        console.log(
            "LOWES UPC EXTRACTION START"
        );


        const scripts =
            doc.querySelectorAll(
                "script"
            );


        /*
         * -----------------------------------------
         * METHOD 1
         * Main product barcode
         * -----------------------------------------
         *
         * "barcode":"885911780551"
         */

        const barcodeRegex =
            /"barcode"\s*:\s*"(\d{12})"/g;


        for (
            const script of scripts
        ) {

            const text =
                script.textContent;

            if (!text)
                continue;

            barcodeRegex.lastIndex = 0;

            let match;

            while (
                (match =
                    barcodeRegex.exec(text))
            ) {

                const code =
                    match[1];

                if (
                    RetailUPC.isValidUPC(
                        code
                    )
                ) {

                    console.log(
                        "LOWES UPC:",
                        code
                    );

                    return code;
                }
            }
        }


        /*
         * -----------------------------------------
         * METHOD 2
         * Consumer-unit EACH barcode
         * -----------------------------------------
         */

        const consumerBarcodeRegex =
            /"code"\s*:\s*"(\d{12})"[^}]*?"hierarchyLevel"\s*:\s*"EACH"[^}]*?"consumerUnit"\s*:\s*"true"/g;


        for (
            const script of scripts
        ) {

            const text =
                script.textContent;

            if (!text)
                continue;

            consumerBarcodeRegex.lastIndex = 0;

            let match;

            while (
                (match =
                    consumerBarcodeRegex.exec(text))
            ) {

                const code =
                    match[1];

                if (
                    RetailUPC.isValidUPC(
                        code
                    )
                ) {

                    console.log(
                        "LOWES CONSUMER UPC:",
                        code
                    );

                    return code;
                }
            }
        }


        /*
         * -----------------------------------------
         * METHOD 3
         * Generic barcode/code search
         * -----------------------------------------
         */

        const genericRegex =
            /\b\d{12}\b/g;


        for (
            const script of scripts
        ) {

            const text =
                script.textContent;

            if (!text)
                continue;

            genericRegex.lastIndex = 0;

            let match;

            while (
                (match =
                    genericRegex.exec(text))
            ) {

                const code =
                    match[0];

                if (
                    RetailUPC.isValidUPC(
                        code
                    )
                ) {

                    console.log(
                        "LOWES GENERIC UPC:",
                        code
                    );

                    return code;
                }
            }
        }


        /*
         * -----------------------------------------
         * METHOD 4
         * Body fallback
         * -----------------------------------------
         */

        const body =
            doc.body;

        if (body) {

            const text =
                body.textContent;

            genericRegex.lastIndex = 0;

            let match;

            while (
                (match =
                    genericRegex.exec(text))
            ) {

                const code =
                    match[0];

                if (
                    RetailUPC.isValidUPC(
                        code
                    )
                ) {

                    console.log(
                        "LOWES BODY UPC:",
                        code
                    );

                    return code;
                }
            }
        }


        console.log(
            "NO LOWES UPC"
        );

        return null;
    };


    /*
     * -----------------------------------------
     * WALMART NEXT_DATA SEARCH
     * -----------------------------------------
     */

    function findWalmartUPC(
        obj,
        depth
    ) {

        if (
            !obj ||
            typeof obj !== "object" ||
            depth > 12
        ) {
            return null;
        }


        /*
         * First look for highly reliable
         * UPC / GTIN / barcode fields.
         */

        for (
            const key of Object.keys(obj)
        ) {

            const value =
                obj[key];

            if (
                !/^(upc|gtin|barcode)$/i.test(
                    key
                )
            ) {
                continue;
            }

            if (
                typeof value !== "string" &&
                typeof value !== "number"
            ) {
                continue;
            }

            const code =
                String(value)
                    .replace(/\D/g, "");

            if (
                code.length === 12 &&
                RetailUPC.isValidUPC(
                    code
                )
            ) {

                console.log(
                    "WALMART UPC:",
                    code,
                    "KEY:",
                    key
                );

                return code;
            }
        }


        /*
         * Then recurse.
         */

        for (
            const key of Object.keys(obj)
        ) {

            const value =
                obj[key];

            if (
                value &&
                typeof value === "object"
            ) {

                const found =
                    findWalmartUPC(
                        value,
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
     * TARGET
     * -----------------------------------------
     */

    RetailUPC.extractTarget = function (
        doc,
        url
    ) {

        console.log(
            "TARGET UPC EXTRACTION START"
        );


        /*
         * Search script/data elements first.
         */

        const scripts =
            doc.querySelectorAll(
                "script"
            );

        const regex =
            /\b\d{12}\b/g;


        for (
            const script of scripts
        ) {

            const text =
                script.textContent;

            if (!text)
                continue;

            regex.lastIndex = 0;

            let match;

            while (
                (match =
                    regex.exec(text))
            ) {

                const code =
                    match[0];

                if (
                    RetailUPC.isValidUPC(
                        code
                    )
                ) {

                    console.log(
                        "TARGET UPC:",
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
            doc.body;

        if (!body)
            return null;

        const text =
            body.textContent;

        regex.lastIndex = 0;

        let match;

        while (
            (match =
                regex.exec(text))
        ) {

            const code =
                match[0];

            if (
                RetailUPC.isValidUPC(
                    code
                )
            ) {

                console.log(
                    "TARGET UPC FALLBACK:",
                    code
                );

                return code;
            }
        }

        return null;
    };


    /*
     * -----------------------------------------
     * COSTCO
     * -----------------------------------------
     */

    RetailUPC.extractCostco = function (doc) {

        console.log(
            "COSTCO UPC EXTRACTION START"
        );

        const regex =
            /\b\d{12}\b/g;

        const scripts =
            doc.querySelectorAll(
                "script"
            );

        for (
            const script of scripts
        ) {

            const text =
                script.textContent;

            if (!text)
                continue;

            regex.lastIndex = 0;

            let match;

            while (
                (match =
                    regex.exec(text))
            ) {

                const code =
                    match[0];

                if (
                    RetailUPC.isValidUPC(
                        code
                    )
                ) {

                    console.log(
                        "COSTCO UPC:",
                        code
                    );

                    return code;
                }
            }
        }

        const body =
            doc.body;

        if (!body)
            return null;

        const text =
            body.textContent;

        regex.lastIndex = 0;

        let match;

        while (
            (match =
                regex.exec(text))
        ) {

            const code =
                match[0];

            if (
                RetailUPC.isValidUPC(
                    code
                )
            ) {

                console.log(
                    "COSTCO UPC FALLBACK:",
                    code
                );

                return code;
            }
        }

        console.log(
            "NO COSTCO UPC"
        );

        return null;
    };


    /*
     * -----------------------------------------
     * GENERIC EXTRACT
     * -----------------------------------------
     */

    RetailUPC.extract = function (
        site,
        data,
        url
    ) {

        switch (site) {

            case "walmart":

                return RetailUPC.extractWalmart(
                    data
                );

            case "target":

                return RetailUPC.extractTarget(
                    data,
                    url
                );

            case "bestbuy":

                return RetailUPC.findBestBuyUPC(
                    data
                );

            case "costco":

                return RetailUPC.extractCostco(
                    data
                );

            case "homedepot":

                return RetailUPC.extractHomeDepot(
                    data
                );

            case "lowes":

                return RetailUPC.extractLowes(
                    data
                );

            default:

                return null;
        }
    };


    /*
     * -----------------------------------------
     * EXPORT
     * -----------------------------------------
     */

    console.log(
        "RETAIL UPC MODULE EXPORTING"
    );

    window.RetailUPC =
        RetailUPC;

})();

