// ====================================================================
// PRICE ENGINE — detects price drops/increases, injects badges
// ====================================================================

(function () {
    'use strict';

    var CFG = window.PRICE_CONFIG;
    if (!CFG || !CFG.products || !CFG.products.length) return;

    var HISTORY_KEY = CFG.storageKey || 'ankuramPriceHistory';

    // ---- HELPERS ----
    function safeParse(v, f) { try { return JSON.parse(v) || f; } catch { return f; } }
    function safeGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
    function safeSet(k, v) { try { localStorage.setItem(k, v); } catch {} }

    // ---- BUILD MAPS ----
    var CURRENT = {};
    CFG.products.forEach(function (p) { CURRENT[p.name] = p.price; });

    // ---- LOAD PREVIOUS PRICES ----
    var prev = safeParse(safeGet(HISTORY_KEY), null);
    if (!prev) prev = {};

    // ---- DETECT CHANGES & INJECT ----
    var grid = document.getElementById('product-grid');
    if (!grid) return;

    var cols = grid.querySelectorAll('.col');
    cols.forEach(function (col) {
        var nameEl = col.querySelector('.card-name');
        if (!nameEl) return;
        var name = nameEl.textContent.trim();
        var curPrice = CURRENT[name];
        if (curPrice === undefined) return;

        var oldPrice = prev[name];
        var card = col.querySelector('.product-card-modern');
        if (!card) return;
        var imgWrap = card.querySelector('.card-image-wrap');
        if (!imgWrap) return;

        // remove old injected badge
        var old = imgWrap.querySelector('.price-change-badge');
        if (old) old.remove();

        if (oldPrice === undefined) {
            // first time — no change to show, just save
            prev[name] = curPrice;
            return;
        }

        if (oldPrice === curPrice) return; // no change

        var diff = curPrice - oldPrice;
        var pct = Math.round(Math.abs(diff) / oldPrice * 100);
        var isDrop = diff < 0;

        var badgeClass = isDrop ? 'price-drop-badge' : 'price-up-badge';
        var icon = isDrop ? 'arrow_downward' : 'arrow_upward';
        var label = isDrop
            ? 'Price Drop \u2014 Save \u20b9' + Math.abs(diff) + ' (' + pct + '%)'
            : 'Price Up \u2014 +\u20b9' + diff + ' (' + pct + '%)';

        imgWrap.insertAdjacentHTML('afterbegin',
            '<span class="card-badge price-change-badge ' + badgeClass + '">'
            + '<span class="material-symbols-outlined" style="font-size:12px">' + icon + '</span> '
            + label
            + '</span>');

        // update stored price
        prev[name] = curPrice;
    });

    // ---- SAVE UPDATED HISTORY ----
    safeSet(HISTORY_KEY, JSON.stringify(prev));

})();
