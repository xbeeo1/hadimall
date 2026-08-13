/** @odoo-module **/

(function () {
    "use strict";


    // =========================================================
    // GLOBAL STATE
    // =========================================================

    let searchWord = "";

    /*
     * true  = search active nahi hai
     * false = search active hai
     */
    let searchWasCleared = true;

    /*
     * Search remove hone ke baad Odoo DOM update karta hai.
     * Is time old search ko dobara restore nahi karna.
     */
    let searchRemovalInProgress = false;

    let retryTimers = [];

    let formTimer = null;


    // =========================================================
    // ESCAPE HELPERS
    // =========================================================

    function escapeRegExp(string) {

        return string.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
        );
    }


    // =========================================================
    // PRODUCT FORM
    // =========================================================

    function isProductTemplateForm() {

        const form =
            document.querySelector(
                ".o_form_view"
            );

        if (!form) {
            return false;
        }

        return !!form.querySelector(
            '[name="description"]'
        );
    }


    // =========================================================
    // DESCRIPTION FIELD
    // =========================================================

    function getDescriptionField() {

        return document.querySelector(
            '.o_form_view [name="description"]'
        );
    }


    // =========================================================
    // REMOVE HIGHLIGHT
    // =========================================================

    function restoreNote(field) {

        if (!field) {
            return;
        }


        const highlights =
            field.querySelectorAll(
                ".product-search-highlight"
            );


        highlights.forEach(
            function (highlight) {

                /*
                 * Span remove karo aur original text
                 * wapas TextNode mein daal do.
                 */
                highlight.replaceWith(
                    document.createTextNode(
                        highlight.textContent
                    )
                );
            }
        );


        /*
         * Adjacent text nodes ko merge karo.
         */
        field.normalize();


        delete field.dataset.highlightedSearch;
    }


    // =========================================================
    // CANCEL TIMERS
    // =========================================================

    function cancelHighlightTimers() {

        retryTimers.forEach(
            function (timer) {

                clearTimeout(
                    timer
                );
            }
        );


        retryTimers = [];


        if (formTimer) {

            clearTimeout(
                formTimer
            );

            formTimer = null;
        }
    }


    // =========================================================
    // CLEAR SEARCH
    // =========================================================

    function clearSearch() {

        console.log(
            "PRODUCT SEARCH CLEARED"
        );


        /*
         * Old search completely remove.
         */
        searchWord = "";

        searchWasCleared = true;

        searchRemovalInProgress = true;


        /*
         * Pending highlight cancel.
         */
        cancelHighlightTimers();


        /*
         * Current form se red remove.
         */
        const field =
            getDescriptionField();


        if (field) {

            restoreNote(
                field
            );
        }


        /*
         * Odoo ko DOM update complete
         * karne ka time.
         */
        setTimeout(
            function () {

                searchRemovalInProgress =
                    false;

            },
            700
        );
    }


    // =========================================================
    // SET SEARCH
    // =========================================================

    function setSearchWord(value) {

        value =
            (value || "").trim();


        if (!value) {
            return;
        }


        searchWord =
            value;

        searchWasCleared =
            false;

        searchRemovalInProgress =
            false;


        console.log(
            "ACTIVE SEARCH:",
            searchWord
        );
    }


    // =========================================================
    // SEARCH INPUT
    // =========================================================

    function getSearchFromInput() {

        const input =
            document.querySelector(
                ".o_searchview_input"
            );


        if (!input) {
            return "";
        }


        return (
            input.value || ""
        ).trim();
    }


    // =========================================================
    // SEARCH FACET
    // =========================================================

    function getSearchFromFacet() {

        const searchView =
            document.querySelector(
                ".o_searchview"
            );


        if (!searchView) {
            return "";
        }


        const facets =
            searchView.querySelectorAll(
                ".o_searchview_facet"
            );


        for (
            const facet of facets
        ) {

            const label =
                facet.querySelector(
                    ".o_searchview_facet_label"
                );


            const value =
                facet.querySelector(
                    ".o_searchview_facet_value"
                );


            if (
                !label ||
                !value
            ) {
                continue;
            }


            const labelText =
                label.textContent
                    .trim()
                    .toLowerCase();


            /*
             * Our search field:
             *
             * Internal Notes
             */
            if (
                labelText.includes(
                    "internal notes"
                )
            ) {

                return (
                    value.textContent || ""
                ).trim();
            }
        }


        return "";
    }


    // =========================================================
    // GET ACTIVE SEARCH
    // =========================================================

    function getActiveSearch() {

        /*
         * First input.
         */
        const inputValue =
            getSearchFromInput();


        if (inputValue) {
            return inputValue;
        }


        /*
         * Then facet.
         */
        const facetValue =
            getSearchFromFacet();


        if (facetValue) {
            return facetValue;
        }


        return "";
    }


    // =========================================================
    // HIGHLIGHT TEXT NODES
    // =========================================================

    function highlightTextNodes(
        field,
        search
    ) {

        if (!field || !search) {
            return false;
        }


        /*
         * Regex.
         */
        const regex =
            new RegExp(
                escapeRegExp(search),
                "gi"
            );


        /*
         * Text nodes collect karo.
         *
         * Direct DOM modification walker ke andar
         * nahi karni, isliye pehle nodes ki list
         * bana rahe hain.
         */
        const walker =
            document.createTreeWalker(
                field,
                NodeFilter.SHOW_TEXT,
                {
                    acceptNode: function (node) {

                        if (
                            !node ||
                            !node.nodeValue
                        ) {

                            return NodeFilter.FILTER_REJECT;
                        }


                        const parent =
                            node.parentElement;


                        if (!parent) {

                            return NodeFilter.FILTER_REJECT;
                        }


                        /*
                         * Script/style ignore.
                         */
                        if (
                            parent.closest(
                                "script, style"
                            )
                        ) {

                            return NodeFilter.FILTER_REJECT;
                        }


                        /*
                         * Existing highlight ignore.
                         */
                        if (
                            parent.closest(
                                ".product-search-highlight"
                            )
                        ) {

                            return NodeFilter.FILTER_REJECT;
                        }


                        /*
                         * Search word exist karta hai?
                         */
                        regex.lastIndex = 0;


                        if (
                            !regex.test(
                                node.nodeValue
                            )
                        ) {

                            regex.lastIndex = 0;

                            return NodeFilter.FILTER_REJECT;
                        }


                        regex.lastIndex = 0;


                        return NodeFilter.FILTER_ACCEPT;
                    }
                }
            );


        const textNodes = [];


        let node;


        while (
            (node =
                walker.nextNode())
        ) {

            textNodes.push(
                node
            );
        }


        if (!textNodes.length) {
            return false;
        }


        /*
         * Har matching TextNode ko process karo.
         */
        textNodes.forEach(
            function (textNode) {

                /*
                 * Node DOM se remove ho chuka ho
                 * to skip.
                 */
                if (
                    !textNode.parentNode
                ) {

                    return;
                }


                const text =
                    textNode.nodeValue;


                regex.lastIndex = 0;


                const fragment =
                    document.createDocumentFragment();


                let lastIndex = 0;


                let match;


                while (
                    (
                        match =
                            regex.exec(text)
                    ) !== null
                ) {

                    const matchStart =
                        match.index;


                    const matchText =
                        match[0];


                    /*
                     * Match se pehle ka text.
                     */
                    if (
                        matchStart >
                        lastIndex
                    ) {

                        fragment.appendChild(
                            document.createTextNode(
                                text.substring(
                                    lastIndex,
                                    matchStart
                                )
                            )
                        );
                    }


                    /*
                     * Red span.
                     */
                    const span =
                        document.createElement(
                            "span"
                        );


                    span.className =
                        "product-search-highlight";


                    span.style.color =
                        "red";


                    span.style.fontWeight =
                        "bold";


                    span.textContent =
                        matchText;


                    fragment.appendChild(
                        span
                    );


                    lastIndex =
                        matchStart +
                        matchText.length;


                    /*
                     * Safety for zero-length regex.
                     */
                    if (
                        matchText.length === 0
                    ) {

                        regex.lastIndex++;
                    }
                }


                /*
                 * Match ke baad remaining text.
                 */
                if (
                    lastIndex <
                    text.length
                ) {

                    fragment.appendChild(
                        document.createTextNode(
                            text.substring(
                                lastIndex
                            )
                        )
                    );
                }


                /*
                 * Sirf TextNode replace karo.
                 *
                 * Pura field replace nahi hoga.
                 */
                textNode.parentNode.replaceChild(
                    fragment,
                    textNode
                );
            }
        );


        return true;
    }


    // =========================================================
    // HIGHLIGHT
    // =========================================================

    function highlightInternalNote() {

        /*
         * Search active nahi hai.
         */
        if (
            !searchWord ||
            searchWasCleared ||
            searchRemovalInProgress
        ) {

            const field =
                getDescriptionField();


            if (field) {
                restoreNote(field);
            }


            return false;
        }


        /*
         * Product form check.
         */
        if (
            !isProductTemplateForm()
        ) {

            return false;
        }


        const field =
            getDescriptionField();


        if (!field) {
            return false;
        }


        /*
         * Same search already highlighted.
         */
        if (
            field.dataset.highlightedSearch ===
            searchWord
        ) {

            return true;
        }


        /*
         * Existing highlight remove karo.
         */
        restoreNote(field);


        /*
         * Clean text.
         */
        const originalText =
            field.textContent || "";


        if (
            !originalText.trim()
        ) {

            return false;
        }


        /*
         * Check search word.
         */
        const checkRegex =
            new RegExp(
                escapeRegExp(
                    searchWord
                ),
                "i"
            );


        if (
            !checkRegex.test(
                originalText
            )
        ) {

            restoreNote(field);

            return true;
        }


        /*
         * Highlight matching text nodes.
         */
        const highlighted =
            highlightTextNodes(
                field,
                searchWord
            );


        if (!highlighted) {

            return false;
        }


        /*
         * Remember current search.
         */
        field.dataset.highlightedSearch =
            searchWord;


        console.log(
            "RED HIGHLIGHT:",
            searchWord
        );


        return true;
    }


    // =========================================================
    // SCHEDULE HIGHLIGHT
    // =========================================================

    function scheduleHighlight() {

        /*
         * No active search.
         */
        if (
            !searchWord ||
            searchWasCleared ||
            searchRemovalInProgress
        ) {

            return;
        }


        /*
         * Product form nahi.
         */
        if (
            !isProductTemplateForm()
        ) {

            return;
        }


        cancelHighlightTimers();


        /*
         * Odoo form rendering ke different stages.
         */
        const delays = [
            100,
            300,
            600,
            1000,
            1500,
            2000
        ];


        delays.forEach(
            function (delay) {

                const timer =
                    setTimeout(
                        function () {

                            /*
                             * Search remove ho gayi?
                             */
                            if (
                                !searchWord ||
                                searchWasCleared ||
                                searchRemovalInProgress
                            ) {

                                return;
                            }


                            /*
                             * Form available?
                             */
                            if (
                                !isProductTemplateForm()
                            ) {

                                return;
                            }


                            highlightInternalNote();

                        },
                        delay
                    );


                retryTimers.push(
                    timer
                );
            }
        );
    }


    // =========================================================
    // SEARCH INPUT EVENT
    // =========================================================

    function setupSearchInput() {

        document.addEventListener(
            "input",
            function (event) {

                if (
                    !event.target ||
                    !event.target.classList ||
                    !event.target.classList.contains(
                        "o_searchview_input"
                    )
                ) {

                    return;
                }


                const value =
                    (
                        event.target.value ||
                        ""
                    ).trim();


                /*
                 * New search.
                 */
                if (value) {

                    setSearchWord(
                        value
                    );


                    scheduleHighlight();


                    return;
                }


                /*
                 * Search input empty.
                 */
                clearSearch();

            }
        );
    }


    // =========================================================
    // SEARCH OBSERVER
    // =========================================================

    function setupSearchObserver() {

        /*
         * IMPORTANT:
         *
         * Sirf search view observe karni hai.
         *
         * Product description / Wysiwyg ko
         * observe nahi karna.
         */

        const searchView =
            document.querySelector(
                ".o_searchview"
            );


        if (!searchView) {
            return;
        }


        const observer =
            new MutationObserver(
                function () {

                    /*
                     * Search removal process.
                     */
                    if (
                        searchRemovalInProgress
                    ) {

                        return;
                    }


                    const activeSearch =
                        getActiveSearch();


                    /*
                     * No active search.
                     */
                    if (!activeSearch) {

                        /*
                         * No search = no highlight.
                         */
                        if (
                            !searchWord
                        ) {

                            const field =
                                getDescriptionField();


                            if (field) {
                                restoreNote(field);
                            }


                            searchWasCleared =
                                true;
                        }


                        return;
                    }


                    /*
                     * Active search.
                     */
                    if (
                        activeSearch !==
                        searchWord
                    ) {

                        setSearchWord(
                            activeSearch
                        );
                    }


                    /*
                     * Product form already open.
                     */
                    if (
                        isProductTemplateForm()
                    ) {

                        scheduleHighlight();
                    }

                }
            );


        observer.observe(
            searchView,
            {
                childList: true,
                subtree: true,
                characterData: true
            }
        );
    }


    // =========================================================
    // FORM OBSERVER
    // =========================================================

    function setupFormObserver() {

        /*
         * IMPORTANT:
         *
         * Form observer disabled.
         *
         * Odoo description is HtmlField/Wysiwyg.
         *
         * Body/form MutationObserver se Wysiwyg
         * mount ke waqt DOM modify karne se
         * tagName null error aa sakta hai.
         *
         * Navigation ko click handler aur
         * scheduled highlight handle karte hain.
         */

        return;
    }


    // =========================================================
    // CLICK HANDLER
    // =========================================================

    function setupClickHandler() {

        document.addEventListener(
            "click",
            function (event) {

                // =================================================
                // SEARCH FACET X
                // =================================================

                const facet =
                    event.target.closest(
                        ".o_searchview_facet"
                    );


                if (facet) {

                    const removeButton =
                        event.target.closest(
                            [
                                ".o_searchview_facet_remove",
                                ".o_searchview_facet_remove_button",
                                ".o_chip_remove",
                                ".o_facet_remove",
                                ".o_searchview_facet button",
                                "button[aria-label*='Remove']",
                                "button[aria-label*='remove']",
                                "button[aria-label*='Close']",
                                "button[aria-label*='close']",
                                "[title*='Remove']",
                                "[title*='remove']",
                                "[title*='Close']",
                                "[title*='close']",
                                ".fa-times",
                                ".fa-close",
                                ".oi-close"
                            ].join(",")
                        );


                    if (removeButton) {

                        console.log(
                            "SEARCH X CLICKED"
                        );


                        /*
                         * Search immediately clear.
                         */
                        clearSearch();


                        return;
                    }
                }


                // =================================================
                // SEARCH CLEAR BUTTON
                // =================================================

                const searchClear =
                    event.target.closest(
                        ".o_searchview_clear"
                    );


                if (searchClear) {

                    clearSearch();

                    return;
                }


                // =================================================
                // PRODUCT MENU
                // =================================================

                const productMenu =
                    event.target.closest(
                        [
                            ".o_menu_sections a",
                            ".o_nav_entry",
                            ".o_menuitem"
                        ].join(",")
                    );


                if (
                    productMenu &&
                    !getActiveSearch()
                ) {

                    /*
                     * Fresh Product menu.
                     * Old highlight remove.
                     */
                    clearSearch();

                    return;
                }


                // =================================================
                // APP MENU
                // =================================================

                const appMenu =
                    event.target.closest(
                        ".o_app"
                    );


                if (appMenu) {

                    clearSearch();

                    return;
                }


                // =================================================
                // PRODUCT NAVIGATION
                // =================================================

                /*
                 * Search active hai.
                 *
                 * Product A -> Product B
                 */
                if (
                    searchWord &&
                    !searchWasCleared &&
                    !searchRemovalInProgress
                ) {

                    /*
                     * First attempt.
                     */
                    setTimeout(
                        function () {

                            if (
                                searchWord &&
                                !searchWasCleared &&
                                !searchRemovalInProgress &&
                                isProductTemplateForm()
                            ) {

                                scheduleHighlight();
                            }

                        },
                        300
                    );


                    /*
                     * Second attempt.
                     */
                    setTimeout(
                        function () {

                            if (
                                searchWord &&
                                !searchWasCleared &&
                                !searchRemovalInProgress &&
                                isProductTemplateForm()
                            ) {

                                scheduleHighlight();
                            }

                        },
                        800
                    );
                }

            },
            true
        );
    }


    // =========================================================
    // INITIAL CHECK
    // =========================================================

    function initialCheck() {

        setTimeout(
            function () {

                const activeSearch =
                    getActiveSearch();


                /*
                 * Search already active.
                 */
                if (activeSearch) {

                    setSearchWord(
                        activeSearch
                    );


                    scheduleHighlight();


                    return;
                }


                /*
                 * Fresh Product menu.
                 *
                 * No search = no highlight.
                 */
                searchWord = "";

                searchWasCleared =
                    true;

                searchRemovalInProgress =
                    false;


                const field =
                    getDescriptionField();


                if (field) {

                    restoreNote(
                        field
                    );
                }

            },
            500
        );
    }


    // =========================================================
    // START
    // =========================================================

    function start() {

        if (!document.body) {

            setTimeout(
                start,
                100
            );

            return;
        }


        setupSearchInput();

        setupSearchObserver();

        /*
         * Form observer intentionally disabled.
         */
        setupFormObserver();

        setupClickHandler();

        initialCheck();
    }


    // =========================================================
    // SAFE START
    // =========================================================

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            start
        );

    } else {

        start();
    }

})();