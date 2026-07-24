// ====================================================================
// FLASH SALE — injects sale badges/pricing into existing product cards
// ====================================================================

(function () {
    'use strict';

    var CFG = window.FLASH_SALE_CONFIG;
    if (!CFG || !CFG.items || !CFG.items.length) return;

    var SALE_KEY    = CFG.storageKey || 'ankuramFlashSale';
    var DURATION_MS = (CFG.durationHours || 6) * 3600000;
    var WA_NUMBER   = CFG.whatsappNumber || '916393394554';
    var ITEMS       = CFG.items;

    // build lookup: name -> sale data
    var SALE_MAP = {};
    ITEMS.forEach(function (it) { SALE_MAP[it.name] = it; });

    // ---- HELPERS ----
    function safeParse(v, f) { try { return JSON.parse(v) || f; } catch { return f; } }
    function safeGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
    function safeSet(k, v) { try { localStorage.setItem(k, v); } catch {} }
    function pad(n) { return String(n).padStart(2, '0'); }

    // ---- SALE STATE ----
    function getState() {
        var state = safeParse(safeGet(SALE_KEY), null);
        if (!state || !state.endTime) {
            state = { endTime: Date.now() + DURATION_MS, stock: {} };
            ITEMS.forEach(function (it) { state.stock[it.name] = it.stock; });
            safeSet(SALE_KEY, JSON.stringify(state));
        }
        ITEMS.forEach(function (it) {
            if (state.stock[it.name] === undefined) state.stock[it.name] = it.stock;
        });
        return state;
    }

    function isActive(s) { return Date.now() < s.endTime; }

    function timeLeft(end) {
        var d = Math.max(0, end - Date.now());
        return { h: Math.floor(d / 3600000), m: Math.floor((d % 3600000) / 60000), s: Math.floor((d % 60000) / 1000) };
    }

    var state = getState();
    if (!isActive(state)) return;

    // ---- BANNER ----
    var banner = document.getElementById('flash-sale-banner');
    function renderBanner() {
        var t = timeLeft(state.endTime);
        banner.className = 'flash-sale-top-banner';
        banner.innerHTML =
            '<div class="flash-banner-inner">'
            + '<span class="material-symbols-outlined flash-banner-icon">bolt</span>'
            + '<strong>' + (CFG.bannerTitle || 'FLASH SALE') + '</strong>'
            + '<span class="flash-banner-sub">' + (CFG.bannerSubtitle || '') + '</span>'
            + '<span class="flash-banner-timer" id="flash-banner-timer">'
            + pad(t.h) + ':' + pad(t.m) + ':' + pad(t.s)
            + '</span>'
            + '</div>';
    }
    if (banner) renderBanner();

    // ---- INJECT INTO PRODUCT CARDS ----
    var grid = document.getElementById('product-grid');
    if (!grid) return;

    var cards = grid.querySelectorAll('.col');
    cards.forEach(function (col) {
        var nameEl = col.querySelector('.card-name');
        if (!nameEl) return;
        var name = nameEl.textContent.trim();
        var sale = SALE_MAP[name];
        if (!sale) return;

        var rem = state.stock[name] || 0;
        var soldOut = rem <= 0;
        var almostGone = rem > 0 && rem <= 3;
        var disc = Math.round(((sale.originalPrice - sale.salePrice) / sale.originalPrice) * 100);

        // find card elements
        var card = col.querySelector('.product-card-modern');
        if (!card) return;
        var imgWrap = card.querySelector('.card-image-wrap');
        var footer = card.querySelector('.card-footer');
        if (!imgWrap || !footer) return;

        // remove old badge if any
        var oldBadge = imgWrap.querySelector('.flash-sale-badge-inject');
        if (oldBadge) oldBadge.remove();

        // add flash sale badge
        var badgeHtml = '<span class="card-badge flash-sale-badge-inject' + (soldOut ? ' flash-sold-out' : almostGone ? ' flash-almost' : '') + '">'
            + (soldOut ? 'SOLD OUT' : sale.badge || disc + '% OFF')
            + '</span>';
        imgWrap.insertAdjacentHTML('afterbegin', badgeHtml);

        // add almost gone warning on image
        var oldWarn = imgWrap.querySelector('.flash-almost-gone-inject');
        if (oldWarn) oldWarn.remove();
        if (almostGone && !soldOut) {
            imgWrap.insertAdjacentHTML('beforeend',
                '<div class="flash-almost-gone-inject"><span class="material-symbols-outlined" style="font-size:14px">warning</span> Only ' + rem + ' left!</div>');
        }

        // update price display — show original struck through + sale price
        var priceEl = footer.querySelector('.card-price');
        if (priceEl) {
            priceEl.innerHTML = '<span class="flash-original-price">₹' + sale.originalPrice + '</span> <span class="flash-sale-price">₹' + sale.salePrice + '</span>';
        }

        // update WhatsApp link with sale price
        var waBtn = footer.querySelector('.btn-whatsapp');
        if (waBtn && !soldOut) {
            var msg = encodeURIComponent("Hi! I'd like to order " + name + " (Flash Sale \u2014 " + disc + "% OFF) \u2014 \u20b9" + sale.salePrice);
            waBtn.href = 'https://wa.me/' + WA_NUMBER + '?text=' + msg;
        }

        // if sold out, disable the button
        if (soldOut && waBtn) {
            waBtn.classList.add('flash-sold-out-btn');
            waBtn.setAttribute('aria-disabled', 'true');
            waBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:18px">block</span> Sold Out';
        }
    });

    // ---- TICKER ----
    setInterval(function () {
        if (!isActive(state)) {
            if (banner) banner.classList.add('d-none');
            return;
        }
        var t = timeLeft(state.endTime);
        var el = document.getElementById('flash-banner-timer');
        if (el) el.textContent = pad(t.h) + ':' + pad(t.m) + ':' + pad(t.s);
    }, 1000);

})();
