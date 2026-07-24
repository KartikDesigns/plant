// ====================================================================
// ACTIVE NAVIGATION HIGHLIGHTING — smart detection based on current URL
// ====================================================================
(function initActiveNav() {
    var pageName = window.location.pathname.split('/').pop() || 'index.html';
    // Normalize: remove query string for comparison
    pageName = pageName.split('?')[0];

    // Desktop nav links
    document.querySelectorAll('.navbar-nav .nav-link').forEach(function(link) {
        var href = link.getAttribute('href');
        if (!href) return;
        // Only match pages/ subdirectory links or root-level page links
        var linkPage = href.split('/').pop().split('?')[0];
        if (linkPage === pageName) {
            link.classList.add('active');
            link.setAttribute('aria-current', 'page');
        }
    });
})();

// ====================================================================
// PAGE LOADER
// ====================================================================

(function initPageLoader() {
    var loader = document.getElementById('page-loader');
    if (!loader) return;

    var MIN_DISPLAY = 800;
    var MAX_DISPLAY = 3000;
    var startTime = performance.now();
    var hidden = false;

    function hideLoader() {
        if (hidden) return;
        hidden = true;
        var elapsed = performance.now() - startTime;
        var remaining = Math.max(0, MIN_DISPLAY - elapsed);
        setTimeout(function () {
            loader.classList.add('hidden');
            setTimeout(function () {
                if (loader.parentNode) loader.parentNode.removeChild(loader);
            }, 500);
        }, remaining);
    }

    if (document.readyState === 'complete') {
        hideLoader();
    } else {
        window.addEventListener('load', hideLoader, { passive: true });
    }

    setTimeout(hideLoader, MAX_DISPLAY);
})();

// ====================================================================
// RIGHT-CLICK ENABLER — ensures right-click is never blocked
// ====================================================================

(function enableRightClick() {
    document.addEventListener('contextmenu', function (e) { return true; }, false);
    document.addEventListener('dragstart', function (e) { return true; }, false);
    document.addEventListener('selectstart', function (e) { return true; }, false);
})();

// ====================================================================
// COMPACT TOAST / NOTIFICATION SYSTEM
// ====================================================================

/**
 * Show a compact, dismissible toast notification.
 * @param {string} message  - The message text
 * @param {string} type     - 'success' | 'error' | 'info' | 'warning' (default: 'success')
 * @param {number} duration - Auto-dismiss in ms (default: 3200)
 */
window.showToast = function(message, type, duration) {
    type = type || 'success';
    duration = duration || 3200;

    var container = document.getElementById('toast-container');
    if (!container) return;

    var icons = {
        success: 'check_circle',
        error: 'error',
        info: 'info',
        warning: 'warning'
    };
    var icon = icons[type] || 'check_circle';

    var toast = document.createElement('div');
    toast.className = 'toast-notif ' + type;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');

    // Build inner HTML
    toast.innerHTML =
        '<span class="toast-icon material-symbols-outlined" aria-hidden="true">' + icon + '</span>' +
        '<span class="toast-message">' + message + '</span>' +
        '<button class="toast-close" aria-label="Dismiss"><span class="material-symbols-outlined" aria-hidden="true">close</span></button>' +
        '<div class="toast-progress" aria-hidden="true" style="animation:toastProgress ' + duration + 'ms linear forwards"></div>';

    container.appendChild(toast);

    // Close button handler
    var closeBtn = toast.querySelector('.toast-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            dismissToast(toast);
        });
    }

    // Click anywhere on toast to dismiss (except close button)
    toast.addEventListener('click', function(e) {
        if (e.target.closest('.toast-close')) return;
        dismissToast(toast);
    });

    // Auto-dismiss
    var autoTimer = setTimeout(function() {
        dismissToast(toast);
    }, duration);

    // Store timer reference for cleanup on manual dismiss
    toast._autoTimer = autoTimer;

    // Pause auto-dismiss on hover
    toast.addEventListener('mouseenter', function() {
        clearTimeout(this._autoTimer);
        var progress = this.querySelector('.toast-progress');
        if (progress) progress.style.animationPlayState = 'paused';
    });

    toast.addEventListener('mouseleave', function() {
        var progress = this.querySelector('.toast-progress');
        if (progress) progress.style.animationPlayState = '';
        this._autoTimer = setTimeout(function() {
            dismissToast(toast);
        }, duration);
    });

    // Touch device: pause on touch start
    toast.addEventListener('touchstart', function() {
        clearTimeout(this._autoTimer);
        var progress = this.querySelector('.toast-progress');
        if (progress) progress.style.animationPlayState = 'paused';
    }, { passive: true });

    toast.addEventListener('touchend', function() {
        var progress = this.querySelector('.toast-progress');
        if (progress) progress.style.animationPlayState = '';
        this._autoTimer = setTimeout(function() {
            dismissToast(toast);
        }, duration);
    }, { passive: true });
};

/** Internal: animate out and remove a toast */
function dismissToast(toast) {
    if (toast.classList.contains('toast-exit')) return;
    clearTimeout(toast._autoTimer);
    toast.classList.add('toast-exit');
    setTimeout(function() {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 350);
}

// ====================================================================
// UTILITY HELPERS
// ====================================================================

/** Determine if we need a 'pages/' prefix for page links */
const PAGES_PREFIX = (function() {
    var path = window.location.pathname.replace(/\\/g, '/');
    // If already inside /pages/ directory, no prefix needed
    if (path.indexOf('/pages/') !== -1) return '';
    return 'pages/';
})();

/** Build a root-agnostic page URL that works from both root and /pages/ */
function pageUrl(path) {
    return PAGES_PREFIX + path;
}

/** Safe localStorage access with fallback for private browsing */
const safeStorage = {
    get(key, fallback = null) {
        try { const v = localStorage.getItem(key); return v !== null ? v : fallback; }
        catch { return fallback; }
    },
    set(key, val) {
        try { localStorage.setItem(key, val); return true; }
        catch { return false; }
    },
    remove(key) {
        try { localStorage.removeItem(key); return true; }
        catch { return false; }
    },
    getJSON(key, fallback = null) {
        try { const v = this.get(key); return v ? JSON.parse(v) : fallback; }
        catch { return fallback; }
    },
    setJSON(key, val) {
        return this.set(key, JSON.stringify(val));
    }
};

/** Debounce utility */
function debounce(fn, delay = 300) {
    let timer;
    return function(...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

/** Sanitize a string for safe HTML attribute use */
function sanitize(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ====================================================================
// FUZZY SEARCH UTILITY — Levenshtein distance & scoring
// ====================================================================

/** Levenshtein distance between two strings */
function levenshtein(a, b) {
    var m = a.length, n = b.length;
    var matrix = [];
    for (var i = 0; i <= n; i++) matrix[i] = [i];
    for (var j = 0; j <= m; j++) matrix[0][j] = j;
    for (var i = 1; i <= n; i++) {
        for (var j = 1; j <= m; j++) {
            if (b[i-1] === a[j-1]) {
                matrix[i][j] = matrix[i-1][j-1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i-1][j-1] + 1,
                    matrix[i][j-1] + 1,
                    matrix[i-1][j] + 1
                );
            }
        }
    }
    return matrix[n][m];
}

/** Score a query against a target string (higher = better match) */
function fuzzyScore(query, target) {
    if (!query || !target) return 0;
    var q = query.toLowerCase().trim();
    var t = target.toLowerCase().trim();
    
    // Exact match = perfect score
    if (t === q) return 100;
    
    // Starts with = very high
    if (t.indexOf(q) === 0) return 90;
    
    // Contains as word boundary = high
    if (t.indexOf(' ' + q) !== -1 || t.indexOf('-' + q) !== -1) return 80;
    
    // Contains = good
    if (t.indexOf(q) !== -1) return 70;
    
    // Levenshtein fuzzy match
    var dist = levenshtein(q, t);
    var maxLen = Math.max(q.length, t.length);
    if (maxLen === 0) return 0;
    var similarity = 1 - (dist / maxLen);
    
    // Allow partial matches where all query chars appear in order
    if (similarity > 0.4) return Math.round(similarity * 60);
    
    // Allow subsequence match (chars in order but not contiguous)
    var qi = 0;
    for (var ti = 0; ti < t.length && qi < q.length; ti++) {
        if (t[ti] === q[qi]) qi++;
    }
    if (qi === q.length) return 50;
    
    return 0;
}

/** Get matching suggestions sorted by relevance score */
function getPlantSuggestions(query) {
    if (!query || query.trim().length < 1) return [];
    var q = query.trim().toLowerCase();
    
    return PLANT_SUGGESTIONS.map(function(p) {
        var nameScore = fuzzyScore(q, p.name);
        var catScore = fuzzyScore(q, p.category);
        var score = Math.max(nameScore, catScore);
        return { suggestion: p, score: score, matchType: nameScore >= catScore ? 'name' : 'category' };
    })
    .filter(function(item) { return item.score > 0; })
    .sort(function(a, b) { return b.score - a.score; })
    .slice(0, 8);
}

// ====================================================================
// PLANT SUGGESTION DATA — used by search autocomplete
// ====================================================================

const PLANT_SUGGESTIONS = [
    { name: 'Tulsi (Holy Basil)', category: 'Sacred Plant', url: pageUrl('tulsi.html'), icon: 'spa' },
    { name: 'Rama Tulsi', category: 'Sacred Plant', url: pageUrl('tulsi.html'), icon: 'spa' },
    { name: 'Krishna Tulsi', category: 'Sacred Plant', url: pageUrl('tulsi.html'), icon: 'spa' },
    { name: 'Vana Tulsi', category: 'Sacred Plant', url: pageUrl('tulsi.html'), icon: 'spa' },
    { name: 'Snake Plant', category: 'Indoor Plant', url: pageUrl('product.html?name=Snake%20Plant'), icon: 'cottage' },
    { name: 'Spider Plant', category: 'Indoor Plant', url: pageUrl('product.html?name=Spider%20Plant'), icon: 'cottage' },
    { name: 'ZZ Plant', category: 'Indoor Plant', url: pageUrl('product.html?name=ZZ%20Plant'), icon: 'cottage' },
    { name: 'Peace Lily', category: 'Indoor Plant', url: pageUrl('product.html?name=Peace%20Lily'), icon: 'cottage' },
    { name: 'Syngonium', category: 'Indoor Plant', url: pageUrl('product.html?name=Syngonium'), icon: 'cottage' },
    { name: 'Jade Plant', category: 'Succulent', url: pageUrl('product.html?name=Jade%20Plant'), icon: 'local_florist' },
    { name: 'Haworthia', category: 'Succulent', url: pageUrl('product.html?name=Haworthia'), icon: 'local_florist' },
    { name: 'Kalanchoe', category: 'Succulent', url: pageUrl('product.html?name=Kalanchoe'), icon: 'local_florist' },
    { name: 'Adenium', category: 'Succulent', url: pageUrl('product.html?name=Adenium'), icon: 'local_florist' },
    { name: 'Portulaca', category: 'Succulent', url: pageUrl('product.html?name=Portulaca'), icon: 'local_florist' },
];

// ====================================================================
// SEARCH AUTOCOMPLETE — shared by desktop & mobile search
// ====================================================================

(function initSearchSuggestions() {
    var SEARCH_SUGGESTIONS_KEY = 'leafSearchSuggestions';

    function getSearchHistory() {
        try {
            return JSON.parse(localStorage.getItem(SEARCH_SUGGESTIONS_KEY)) || [];
        } catch (e) { return []; }
    }

    function addToSearchHistory(query) {
        if (!query || query.trim().length < 2) return;
        var history = getSearchHistory();
        query = query.trim();
        history = history.filter(function(h) { return h.toLowerCase() !== query.toLowerCase(); });
        history.unshift(query);
        if (history.length > 5) history = history.slice(0, 5);
        try { localStorage.setItem(SEARCH_SUGGESTIONS_KEY, JSON.stringify(history)); } catch (e) {}
    }

    function createSuggestionsContainer(input) {
        var container = document.createElement('div');
        container.className = 'search-suggestions';
        container.style.display = 'none';
        input.parentElement.style.position = 'relative';
        input.parentElement.appendChild(container);
        return container;
    }

    function renderSuggestions(input, container, query) {
        if (!query || query.trim().length < 1) {
            // Show recent search history when input is empty/cleared
            var history = getSearchHistory();
            if (history.length === 0) {
                container.style.display = 'none';
                return;
            }
            var html = '<div class="suggestions-header">' +
                '<span>Recent Searches</span>' +
                '<span class="clear-btn" id="clear-search-history">Clear</span>' +
                '</div>';
            html += history.map(function(h, i) {
                return '<div class="suggestion-item suggestion-history" data-value="' + h.replace(/"/g, '&quot;') + '">' +
                    '<span class="suggestion-icon-wrap"><span class="material-symbols-outlined">schedule</span></span>' +
                    '<span class="suggestion-text-wrap"><span class="suggestion-name">' + h + '</span></span>' +
                    '<span class="material-symbols-outlined suggestion-arrow">chevron_right</span>' +
                    '</div>';
            }).join('');
            container.innerHTML = html;
            container.style.display = 'block';

            // Clear history button
            var clearBtn = container.querySelector('#clear-search-history');
            if (clearBtn) {
                clearBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    try { localStorage.removeItem(SEARCH_SUGGESTIONS_KEY); } catch (e) {}
                    container.style.display = 'none';
                });
            }
            return;
        }

        var q = query.toLowerCase().trim();

        // Use fuzzy matching with scored results
        var scoredMatches = getPlantSuggestions(q);

        // Also search history with fuzzy
        var history = getSearchHistory();
        var historyMatches = history.filter(function(h) {
            return fuzzyScore(q, h) > 0;
        }).slice(0, 3);

        if (scoredMatches.length === 0 && historyMatches.length === 0) {
            container.style.display = 'none';
            return;
        }

        var html = '';

        // History section
        if (historyMatches.length > 0) {
            html += '<div class="suggestions-header"><span class="suggestions-header-icon material-symbols-outlined">schedule</span>Recent</div>';
            html += historyMatches.map(function(h) {
                return '<div class="suggestion-item suggestion-history" data-value="' + h.replace(/"/g, '&quot;') + '">' +
                    '<span class="suggestion-icon-wrap"><span class="material-symbols-outlined">schedule</span></span>' +
                    '<span class="suggestion-text-wrap"><span class="suggestion-name">' + highlightMatch(h, q) + '</span></span>' +
                    '<span class="material-symbols-outlined suggestion-arrow">chevron_right</span>' +
                    '</div>';
            }).join('');
        }

        // Plant suggestions section — Group by category with Apple/Spotify-style headers
        if (scoredMatches.length > 0) {
            // Group results by category
            var grouped = {};
            scoredMatches.forEach(function(item) {
                var cat = item.suggestion.category;
                if (!grouped[cat]) grouped[cat] = [];
                grouped[cat].push(item);
            });

            var categoryKeys = Object.keys(grouped);
            var categoryIcons = {
                'Indoor Plant': 'cottage',
                'Outdoor Plant': 'park',
                'Succulent': 'local_florist',
                'Sacred Plant': 'spa',
                'Air Purifying': 'air',
                'Low Light': 'bedtime',
                'Flowering': 'flowering',
                'Hanging': 'hanging'
            };

            html += '<div class="suggestions-header"><span class="suggestions-header-icon material-symbols-outlined">search</span>Plants</div>';

            categoryKeys.forEach(function(cat, catIdx) {
                var catIcon = categoryIcons[cat] || 'eco';
                var items = grouped[cat];

                // Category group header (collapsible style)
                html += '<div class="suggestion-category-group">' +
                    '<div class="suggestion-category-label">' +
                    '<span class="material-symbols-outlined suggestion-category-icon">' + catIcon + '</span>' +
                    '<span class="suggestion-category-text">' + cat + '</span>' +
                    '<span class="suggestion-category-count">' + items.length + '</span>' +
                    '</div>';

                items.forEach(function(item) {
                    var p = item.suggestion;
                    var matchLabel = item.matchType === 'name' ? 'Best match' : '';
                    html += '<a class="suggestion-item suggestion-plant" href="' + p.url + '">' +
                        '<span class="suggestion-icon-wrap"><span class="material-symbols-outlined">' + p.icon + '</span></span>' +
                        '<span class="suggestion-text-wrap">' +
                        '<span class="suggestion-name">' + highlightMatch(p.name, q) + '</span>' +
                        '<span class="suggestion-category">' + p.category + '</span>' +
                        '</span>';
                    if (matchLabel) {
                        html += '<span class="suggestion-badge">Best</span>';
                    }
                    html += '<span class="material-symbols-outlined suggestion-arrow">chevron_right</span>' +
                        '</a>';
                });

                html += '</div>';
            });
        }

        // "View all results" link
        html += '<div class="suggestion-item view-all-results" data-query="' + query.replace(/"/g, '&quot;') + '">' +
            '<span class="material-symbols-outlined">search</span>' +
            '<span>Search all plants for "' + sanitize(query) + '"</span>' +
            '</div>';

        container.innerHTML = html;
        container.style.display = 'block';
    }

    function highlightMatch(text, query) {
        if (!query) return text;
        var idx = text.toLowerCase().indexOf(query.toLowerCase());
        if (idx === -1) return text;
        return text.substring(0, idx) +
            '<mark style="background:var(--c-primary-light);color:var(--c-primary-dark);padding:0 2px;border-radius:2px">' +
            text.substring(idx, idx + query.length) + '</mark>' +
            text.substring(idx + query.length);
    }

    function attachSuggestions(input) {
        if (!input) return;
        // Only attach once
        if (input.dataset.suggestionsAttached) return;
        input.dataset.suggestionsAttached = 'true';

        var container = createSuggestionsContainer(input);
        var activeIndex = -1;

        function hideSuggestions() {
            container.style.display = 'none';
            activeIndex = -1;
        }

        function getItems() {
            return container.querySelectorAll('.suggestion-item');
        }

        function selectItem(index) {
            var items = getItems();
            if (index < 0 || index >= items.length) return;
            items[index].click();
        }

        input.addEventListener('input', function() {
            renderSuggestions(input, container, this.value);
            activeIndex = -1;
        });

        input.addEventListener('focus', function() {
            renderSuggestions(input, container, this.value);
        });

        input.addEventListener('blur', function() {
            // Delay so click on suggestion registers before hiding
            setTimeout(hideSuggestions, 200);
        });

        input.addEventListener('keydown', function(e) {
            var items = getItems();
            if (container.style.display !== 'block' || items.length === 0) {
                if (e.key === 'Enter') {
                    var q = this.value.trim();
                    if (q) {
                        addToSearchHistory(q);
                        window.location.href = pageUrl('shop.html?q=') + encodeURIComponent(q);
                    }
                }
                return;
            }

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                activeIndex = (activeIndex + 1) % items.length;
                items.forEach(function(item, i) {
                    item.style.background = i === activeIndex ? 'var(--c-surface-container-high)' : '';
                });
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                activeIndex = (activeIndex - 1 + items.length) % items.length;
                items.forEach(function(item, i) {
                    item.style.background = i === activeIndex ? 'var(--c-surface-container-high)' : '';
                });
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (activeIndex >= 0 && activeIndex < items.length) {
                    selectItem(activeIndex);                    } else {
                        var q = this.value.trim();
                        if (q) {
                            addToSearchHistory(q);
                            window.location.href = pageUrl('shop.html?q=') + encodeURIComponent(q);
                        }
                    }
            } else if (e.key === 'Escape') {
                hideSuggestions();
            }
        });

        // Delegate click on suggestion items
        container.addEventListener('click', function(e) {
            var item = e.target.closest('.suggestion-item');
            if (!item) return;

            var query = item.dataset.value || item.dataset.query || '';
            if (query) {
                addToSearchHistory(query);
            }

            // If it's a link (has href), let it navigate naturally
            if (item.tagName === 'A') return;

            // If it's a "view all results" item, redirect to shop
            if (item.classList.contains('view-all-results')) {
                window.location.href = pageUrl('shop.html?q=') + encodeURIComponent(query);
                return;
            }

            // For history items, redirect to shop with query
            if (query) {
                input.value = query;
                window.location.href = pageUrl('shop.html?q=') + encodeURIComponent(query);
            }
        });

        return container;
    }

    // Attach to desktop search
    var desktopInput = document.getElementById('search-input');
    if (desktopInput) {
        attachSuggestions(desktopInput);
    }

    // Attach to mobile search
    var mobileInput = document.getElementById('mobile-search-input');
    if (mobileInput) {
        attachSuggestions(mobileInput);
    }
})();

// ====================================================================
// SCROLL REVEAL with IntersectionObserver
// ====================================================================

var observer = null;
var revealElements = null;
try {
    observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                var el = entry.target;

                if (el.classList.contains('stagger-children')) {
                    el.classList.add('active');
                }

                if (el.classList.contains('reveal') ||
                    el.classList.contains('reveal-fade-up') ||
                    el.classList.contains('reveal-fade-down') ||
                    el.classList.contains('reveal-fade-left') ||
                    el.classList.contains('reveal-fade-right') ||
                    el.classList.contains('reveal-scale') ||
                    el.classList.contains('reveal-slide-up') ||
                    el.classList.contains('reveal-pop')) {
                    el.classList.add('active');
                }

                observer.unobserve(el);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    revealElements = document.querySelectorAll('.reveal, .reveal-fade-up, .reveal-fade-down, .reveal-fade-left, .reveal-fade-right, .reveal-scale, .reveal-slide-up, .reveal-pop, .stagger-children');
    revealElements.forEach(function (el) { observer.observe(el); });
} catch (e) {
    // IntersectionObserver not supported — reveal all elements immediately
    var fallbacks = document.querySelectorAll('.reveal, .reveal-fade-up, .reveal-fade-down, .reveal-fade-left, .reveal-fade-right, .reveal-scale, .reveal-slide-up, .reveal-pop, .stagger-children');
    fallbacks.forEach(function (el) { el.classList.add('active'); });
}

// ====================================================================
// PAGE ENTRANCE ANIMATION
// ====================================================================

document.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('page-enter');
    // Ensure hero reveal is active immediately
    document.querySelectorAll('.reveal.active')?.forEach(el => el.classList.add('active'));
});

// ====================================================================
// DESKTOP SEARCH — toggleable panel
// ====================================================================

(function initDesktopSearch() {
    const trigger = document.getElementById('desktop-search-trigger');
    const panel = document.getElementById('desktop-search-panel');
    const closeBtn = document.getElementById('desktop-search-close');
    const searchInput = document.getElementById('search-input');

    if (!trigger || !panel || !searchInput) return;

    /** Open search panel and focus input */
    const openSearch = () => {
        panel.classList.add('open');
        // Small delay so the panel can render before focusing
        requestAnimationFrame(() => searchInput.focus());
    };

    /** Close search panel */
    const closeSearch = () => {
        panel.classList.remove('open');
        searchInput.blur();
    };

    // Click trigger to toggle
    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        if (panel.classList.contains('open')) {
            closeSearch();
        } else {
            openSearch();
        }
    });

    // Click close button
    if (closeBtn) {
        closeBtn.addEventListener('click', closeSearch);
    }

    // Close on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && panel.classList.contains('open')) {
            closeSearch();
        }
    });

    // Close on click outside panel and trigger
    document.addEventListener('click', (e) => {
        if (!panel.classList.contains('open')) return;
        if (!panel.contains(e.target) && e.target !== trigger && !trigger.contains(e.target)) {
            closeSearch();
        }
    });

    // Ctrl+K / Cmd+K to open
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            openSearch();
        }
    });

    // Enter to search (redirect to shop page)
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const q = searchInput.value.trim();
            if (q) {
                window.location.href = pageUrl('shop.html?q=') + encodeURIComponent(q);
            }
        }
    });
})();

// ====================================================================
// SCROLL PROGRESS BAR
// ====================================================================

(function initScrollProgress() {
    if (!document.body) return;
    var bar = document.createElement('div');
    bar.className = 'scroll-progress-bar';
    bar.id = 'scroll-progress-bar';
    document.body.prepend(bar);

    window.addEventListener('scroll', function() {
        var scrollTop = window.scrollY;
        var docHeight = document.documentElement.scrollHeight - window.innerHeight;
        if (docHeight > 0) {
            var progress = (scrollTop / docHeight) * 100;
            bar.style.width = progress + '%';
        } else {
            bar.style.width = '0%';
        }
    }, { passive: true });
})();

// ====================================================================
// BACK TO TOP BUTTON
// ====================================================================

(function initBackToTop() {
    const btn = document.getElementById('back-to-top');
    if (!btn) return;

    const handleScroll = () => {
        if (window.scrollY > 400) {
            btn.classList.add('visible');
        } else {
            btn.classList.remove('visible');
        }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    btn.addEventListener('click', function(e) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
})();

// ====================================================================
// NUMBER COUNTER ANIMATION
// ====================================================================

(function initCounters() {
    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                const target = parseInt(el.dataset.target, 10);
                const suffix = el.dataset.suffix || '';
                const prefix = el.dataset.prefix || '';
                const duration = parseInt(el.dataset.duration, 10) || 1500;
                const start = performance.now();

                function update(now) {
                    const elapsed = now - start;
                    const progress = Math.min(elapsed / duration, 1);
                    // Ease out quad
                    const eased = 1 - (1 - progress) * (1 - progress);
                    const current = Math.round(eased * target);
                    el.textContent = prefix + current.toLocaleString() + suffix;
                    if (progress < 1) {
                        requestAnimationFrame(update);
                    } else {
                        el.textContent = prefix + target.toLocaleString() + suffix;
                    }
                }

                requestAnimationFrame(update);
                counterObserver.unobserve(el);
            }
        });
    }, { threshold: 0.5 });

    document.querySelectorAll('.counter-value[data-target]').forEach(el => counterObserver.observe(el));
})();

// ====================================================================
// FLOATING LEAF PARTICLES ON HERO
// ====================================================================

(function initLeafParticles() {
    const container = document.getElementById('leaf-particles');
    if (!container) return;

    const leaves = ['🍃', '🌿', '☘️', '🌱'];
    const totalLeaves = 8;

    for (let i = 0; i < totalLeaves; i++) {
        const leaf = document.createElement('span');
        leaf.className = 'leaf-particle';
        leaf.textContent = leaves[i % leaves.length];
        leaf.style.left = (10 + Math.random() * 80) + '%';
        leaf.style.top = (60 + Math.random() * 40) + '%';
        leaf.style.animationDelay = (Math.random() * 8) + 's';
        leaf.style.animationDuration = (8 + Math.random() * 6) + 's';
        leaf.style.fontSize = (16 + Math.random() * 20) + 'px';
        container.appendChild(leaf);
    }
})();

// ====================================================================
// RIPPLE EFFECT ON BUTTONS
// ====================================================================

(function initRipple() {
    document.addEventListener('click', function(e) {
        var btn = e.target.closest('.ripple-container, .btn-toggle-wishlist');
        if (!btn || btn.closest('.no-ripple')) return;

        var ripple = document.createElement('span');
        ripple.className = 'ripple-effect';
        var rect = btn.getBoundingClientRect();
        var size = Math.max(rect.width, rect.height);
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
        ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';

        var cs = getComputedStyle(btn);
        if (cs.position === 'static') btn.style.position = 'relative';
        if (cs.overflow !== 'hidden') btn.style.overflow = 'hidden';

        btn.appendChild(ripple);

        // Shared cleanup — clears the other path so only one removes the element
        function removeRipple() {
            clearTimeout(cleanupTimer);
            ripple.removeEventListener('animationend', removeRipple);
            if (ripple.parentNode) ripple.parentNode.removeChild(ripple);
        }

        var cleanupTimer = setTimeout(removeRipple, 800);
        ripple.addEventListener('animationend', removeRipple);
    });
})();

// ====================================================================
// IMAGE LAZY LOADING WITH SKELETON
// ====================================================================

(function initLazyImages() {
    let wrapper;
    const imgObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                const src = img.dataset.src || img.getAttribute('src');
                const alt = img.dataset.alt || '';
                wrapper = img.parentElement;

                // Create skeleton placeholder
                if (!img.classList.contains('loaded') && !img.classList.contains('lazy-loaded')) {
                    if (wrapper && !wrapper.querySelector('.skeleton-placeholder')) {
                        const skeleton = document.createElement('div');
                        skeleton.className = 'skeleton skeleton-image skeleton-placeholder';
                        skeleton.style.position = 'absolute';
                        skeleton.style.top = '0';
                        skeleton.style.left = '0';
                        skeleton.style.width = '100%';
                        skeleton.style.height = '100%';
                        skeleton.style.zIndex = '0';
                        wrapper.style.position = 'relative';
                        wrapper.insertBefore(skeleton, img);
                    }
                }

                if (src && !img.classList.contains('lazy-loaded')) {
                    const temp = new Image();
                    temp.onload = function() {
                        img.src = src;
                        img.alt = alt;
                        img.classList.add('lazy-loaded');
                        // Remove skeleton
                        const skeleton = wrapper?.querySelector('.skeleton-placeholder');
                        if (skeleton) skeleton.remove();
                    };
                    temp.onerror = function() {
                        // Fallback: load original src anyway
                        img.src = src;
                        img.alt = alt;
                        img.classList.add('lazy-loaded');
                        const skeleton = wrapper?.querySelector('.skeleton-placeholder');
                        if (skeleton) skeleton.remove();
                    };
                    temp.src = src;
                }

                imgObserver.unobserve(img);
            }
        });
    }, { threshold: 0.05, rootMargin: '200px' });

    // Images with loading=lazy attribute
    document.querySelectorAll('img[loading="lazy"]').forEach(img => {
        if (!img.classList.contains('lazy-loaded') && !img.complete) {
            // Check if this is an SVG placeholder that needs a real image
            const src = img.getAttribute('src') || '';
            if (src.includes('.svg') || src.includes('placeholder')) {
                // Look for real image URL from the nearest [data-product] button
                const productBtn = img.closest('.card-3d, .product-card, .group')?.querySelector('[data-product]');
                if (productBtn) {
                    try {
                        const product = JSON.parse(productBtn.dataset.product);
                        if (product.image) {
                            // Use a larger version of the product image
                            const realSrc = product.image.replace('w=100&h=100', 'w=600&h=750');
                            img.dataset.src = realSrc;
                        }
                    } catch (e) {}
                }
            }
            imgObserver.observe(img);
        }
    });

    // Images with data-src (true lazy loading for placeholder images)
    document.querySelectorAll('img[data-src]').forEach(img => imgObserver.observe(img));

    // Legacy: images with data-alt (still present on some pages)
    document.querySelectorAll('img[data-alt]').forEach(img => {
        if (!img.classList.contains('lazy-loaded')) {
            imgObserver.observe(img);
        }
    });
})();

// ====================================================================
// IMAGE LIGHTBOX — Premium Gallery with Navigation
// ====================================================================

(function initLightbox() {
    var overlay = document.getElementById('lightbox-overlay');
    if (!overlay) return;

    var imageWrap = overlay.querySelector('.lightbox-image-wrap');
    var img = overlay.querySelector('img');
    var close = overlay.querySelector('.lightbox-close');
    var captionEl = document.getElementById('lightbox-caption');

    if (!img) return;

    var galleryItems = [];
    var currentIndex = 0;
    var isOpen = false;
    var touchStartX = 0;
    var touchEndX = 0;

    /** Gather all gallery images from the page */
    function refreshGallery() {
        var items = [];
        document.querySelectorAll('[data-lightbox]').forEach(function(el) {
            var src = el.dataset.lightbox || (el.tagName === 'IMG' ? el.src : (el.querySelector('img') ? el.querySelector('img').src : null));
            if (!src) return;
            items.push({
                src: src,
                caption: el.dataset.lightboxCaption || el.getAttribute('alt') || ''
            });
        });
        galleryItems = items;
    }

    /** Open lightbox at a specific index */
    function openAtIndex(index) {
        if (!galleryItems.length || index < 0 || index >= galleryItems.length) return;
        currentIndex = index;
        var item = galleryItems[currentIndex];

        // Add exit animation to old image if transitioning
        if (isOpen) {
            img.classList.add('lightbox-img-exit');
            setTimeout(function() {
                img.src = item.src;
                img.alt = item.caption || 'Enlarged view';
                img.classList.remove('lightbox-img-exit');
                updateUI();
            }, 200);
        } else {
            img.src = item.src;
            img.alt = item.caption || 'Enlarged view';
            overlay.classList.add('active');
            isOpen = true;
            updateUI();
        }


    }

    /** Update caption */
    function updateUI() {
        if (captionEl) {
            captionEl.textContent = galleryItems[currentIndex]?.caption || '';
        }
    }

    /** Close lightbox */
    function closeLightbox() {
        overlay.classList.remove('active');
        isOpen = false;
        img.classList.remove('lightbox-img-exit');
        document.body.style.overflow = '';
    }

    /** Navigate to previous image */
    function prevImage() {
        if (galleryItems.length <= 1) return;
        var newIndex = (currentIndex - 1 + galleryItems.length) % galleryItems.length;
        openAtIndex(newIndex);
    }

    /** Navigate to next image */
    function nextImage() {
        if (galleryItems.length <= 1) return;
        var newIndex = (currentIndex + 1) % galleryItems.length;
        openAtIndex(newIndex);
    }

    // ===== Click handler: trigger lightbox =====
    document.addEventListener('click', function(e) {
        if (overlay.contains(e.target)) return;
        var trigger = e.target.closest('[data-lightbox]');
        if (!trigger) return;

        var src = trigger.dataset.lightbox || (trigger.tagName === 'IMG' ? trigger.src : (trigger.querySelector('img') ? trigger.querySelector('img').src : null));
        if (!src || src.trim() === '') return;

        e.preventDefault();

        // Rebuild gallery and find the clicked index
        refreshGallery();
        var clickIndex = galleryItems.findIndex(function(item) { return item.src === src; });
        if (clickIndex === -1) {
            // Fallback: just open this single image
            galleryItems = [{ src: src, caption: trigger.dataset.lightboxCaption || trigger.getAttribute('alt') || '' }];
            clickIndex = 0;
        }

        // Prevent body scroll
        document.body.style.overflow = 'hidden';

        openAtIndex(clickIndex);
    });

    // ===== Close button =====
    if (close) close.addEventListener('click', function(e) {
        e.stopPropagation();
        closeLightbox();
    });

    // ===== Click backdrop to close =====
    overlay.addEventListener('click', function(e) {
        if (e.target === this || e.target === imageWrap) {
            closeLightbox();
        }
    });

    // ===== Keyboard navigation =====
    document.addEventListener('keydown', function(e) {
        if (!overlay.classList.contains('active')) return;

        switch (e.key) {
            case 'Escape':
                closeLightbox();
                break;
            case 'ArrowLeft':
                e.preventDefault();
                prevImage();
                break;
            case 'ArrowRight':
                e.preventDefault();
                nextImage();
                break;
        }
    });

    // ===== Swipe support (touch) =====
    overlay.addEventListener('touchstart', function(e) {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    overlay.addEventListener('touchend', function(e) {
        touchEndX = e.changedTouches[0].screenX;
        var diff = touchStartX - touchEndX;
        var SWIPE_THRESHOLD = 50;

        if (Math.abs(diff) > SWIPE_THRESHOLD) {
            if (diff > 0) {
                nextImage();
            } else {
                prevImage();
            }
        }
    }, { passive: true });

    // ===== Restore body scroll on any navigation away =====
    document.addEventListener('visibilitychange', function() {
        if (document.hidden && overlay.classList.contains('active')) {
            document.body.style.overflow = '';
        }
    });

    // Initial gallery scan
    refreshGallery();
})();

// ====================================================================
// MOBILE NAV — SWIPE TO CLOSE
// ====================================================================

(function initSwipeToClose() {
  const offcanvas = document.getElementById('navbarOffcanvas');
  if (!offcanvas) return;

  let startX = 0;
  let currentX = 0;
  let isDragging = false;
  const SWIPE_THRESHOLD = 80;

  offcanvas.addEventListener('touchstart', function(e) {
    const touch = e.touches[0];
    startX = touch.clientX;
    isDragging = true;
    currentX = startX;
  }, { passive: true });

  offcanvas.addEventListener('touchmove', function(e) {
    if (!isDragging) return;
    const touch = e.touches[0];
    currentX = touch.clientX;
    const diff = currentX - startX;

    // Only allow swipe right-to-left (closing the offcanvas)
    if (diff > 0) {
      offcanvas.classList.add('swiping');
      offcanvas.style.transform = `translateX(${diff}px)`;
      offcanvas.style.transition = 'none';
    }
  }, { passive: true });

  offcanvas.addEventListener('touchend', function() {
    if (!isDragging) return;
    isDragging = false;

    const diff = currentX - startX;
    offcanvas.style.transform = '';
    offcanvas.style.transition = '';
    offcanvas.classList.remove('swiping');

    if (diff > SWIPE_THRESHOLD) {
      offcanvas.classList.add('swipe-closing');
      // Use Bootstrap offcanvas API to close
      const bsOffcanvas = bootstrap?.Offcanvas?.getInstance(offcanvas);
      if (bsOffcanvas) {
        bsOffcanvas.hide();
      }
      setTimeout(() => {
        offcanvas.classList.remove('swipe-closing');
      }, 350);
    }
  }, { passive: true });
})();

// ====================================================================
// MOBILE FILTER TOGGLE — Bottom Sheet Overlay
// ====================================================================

(function initMobileFilter() {
    var toggleBtn = document.getElementById('mobile-filter-toggle');
    var sidebar = document.getElementById('filter-sidebar');
    var closeBtn = document.getElementById('filter-sheet-close');
    var applyBtn = document.getElementById('mobile-filter-apply');
    if (!toggleBtn || !sidebar) return;

    // Create backdrop element
    var backdrop = document.getElementById('filter-backdrop');
    if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.className = 'filter-backdrop';
        backdrop.id = 'filter-backdrop';
        document.body.appendChild(backdrop);
    }

    function openMobileFilter() {
        if (window.innerWidth >= 992) return;
        sidebar.classList.add('mobile-open');
        backdrop.classList.add('open');
        toggleBtn.setAttribute('aria-expanded', 'true');

        if (closeBtn) {
            setTimeout(function () { if (closeBtn) closeBtn.focus(); }, 100);
        }

        updateFilterCountBadge();
        enableTrap();
    }

    function closeMobileFilter() {
        disableTrap();
        sidebar.classList.remove('mobile-open');
        backdrop.classList.remove('open');
        toggleBtn.setAttribute('aria-expanded', 'false');
        toggleBtn.focus();
    }

    toggleBtn.addEventListener('click', function (e) {
        e.preventDefault();
        if (sidebar.classList.contains('mobile-open')) {
            closeMobileFilter();
        } else {
            openMobileFilter();
        }
    });

    if (closeBtn) closeBtn.addEventListener('click', closeMobileFilter);

    if (applyBtn) {
        applyBtn.addEventListener('click', function () {
            closeMobileFilter();
            if (typeof filterProducts === 'function') filterProducts();
        });
    }

    backdrop.addEventListener('click', closeMobileFilter);

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && sidebar.classList.contains('mobile-open')) {
            closeMobileFilter();
        }
    }, { passive: true });

    function updateFilterCountBadge() {
        var badge = document.getElementById('filter-count-badge');
        if (!badge) return;
        var count = 0;
        var activeCategoryLink = document.querySelector('#category-filter a.active:not([data-filter="all"])');
        if (activeCategoryLink) count++;

        badge.classList.toggle('d-none', count === 0);
        if (count > 0) badge.textContent = count;
    }

    document.addEventListener('click', function (e) {
        var filterLink = e.target.closest('#category-filter a[data-filter]');
        if (filterLink && window.innerWidth < 992) {
            setTimeout(function () {
                if (sidebar.classList.contains('mobile-open')) closeMobileFilter();
            }, 150);
        }
    });

    updateFilterCountBadge();

    var debouncedResize = debounce(function () {
        if (window.innerWidth >= 992 && sidebar.classList.contains('mobile-open')) {
            closeMobileFilter();
        }
    }, 200);
    window.addEventListener('resize', debouncedResize, { passive: true });

    // --- Focus trapping for accessibility (single handler, no leak) ---
    var trapActive = false;
    var trapContainer = null;

    function handleTrapKeydown(e) {
        if (!trapActive || !trapContainer) return;
        var focusable = trapContainer.querySelectorAll(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        var first = focusable[0];
        var last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }

    function enableTrap() {
        if (trapActive) disableTrap();
        trapActive = true;
        trapContainer = sidebar;
        document.addEventListener('keydown', handleTrapKeydown);
    }

    function disableTrap() {
        trapActive = false;
        trapContainer = null;
        document.removeEventListener('keydown', handleTrapKeydown);
    }
})();

// ====================================================================
// MOBILE SEARCH — Premium Redesign (clear button, chips, sync)
// ====================================================================

(function initMobileSearch() {
  const searchInput = document.getElementById('mobile-search-input');
  if (!searchInput) return;

  const clearBtn = document.getElementById('mobile-search-clear');

  /** Toggle clear button visibility based on input value */
  function toggleClear() {
    if (!clearBtn) return;
    if (searchInput.value.trim().length > 0) {
      clearBtn.classList.add('visible');
    } else {
      clearBtn.classList.remove('visible');
    }
  }

  // Clear button click
  if (clearBtn) {
    clearBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      searchInput.value = '';
      searchInput.focus();
      toggleClear();
      // Trigger input event for any listeners
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  // Show/hide clear button on input
  searchInput.addEventListener('input', toggleClear);

  // Keydown: Enter to search
  searchInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      const q = this.value.trim();
      if (q) {
        window.location.href = pageUrl('shop.html?q=') + encodeURIComponent(q);
      }
    }
  });

  // Sync with desktop search if available
  const desktopSearch = document.getElementById('search-input');
  if (desktopSearch) {
    searchInput.addEventListener('input', function() {
      desktopSearch.value = this.value;
    });
    desktopSearch.addEventListener('input', function() {
      searchInput.value = this.value;
    });
  }

  // Initial check for pre-filled value
  toggleClear();

})();

// ====================================================================
// SHOP PAGE ONLY: Filter / Sort / Pagination
// ====================================================================

const isShopPage = () => !!document.getElementById('product-grid');

if (isShopPage()) {
    const productGrid = document.getElementById('product-grid');
    const productCards = Array.from(productGrid.querySelectorAll('.col[data-category]'));
    const resultCount = document.getElementById('result-count');
    const sortPills = document.getElementById('sort-pills');

    function getSortValue() {
        if (!sortPills) return 'popularity';
        var active = sortPills.querySelector('.sort-pill.active');
        return active ? active.dataset.sort : 'popularity';
    }
    const paginationList = document.getElementById('pagination-list');
    const PER_PAGE = 6;

    let activeCategory = 'all';
    let currentPage = 1;
    let filteredCards = [];
    let inStockOnly = false;
    let petFriendlyOnly = false;

    // Pet-friendly plant names
    const PET_FRIENDLY_PLANTS = [
        'spider plant', 'snake plant',
        'peace lily', 'jade plant'
    ];

    const isPetFriendly = (card) => {
        const name = (card.querySelector('h3')?.textContent || '').toLowerCase();
        return PET_FRIENDLY_PLANTS.some(p => name.includes(p));
    };

    // Debounced search for shop filter
    const debouncedFilter = debounce(() => filterProducts(), 250);

    const urlQuery = new URLSearchParams(window.location.search).get('q');
    const shopSearchInput = document.getElementById('search-input');
    if (urlQuery && shopSearchInput) {
        shopSearchInput.value = decodeURIComponent(urlQuery);
    }

    const goToPage = (page) => {
        const totalPages = Math.ceil(filteredCards.length / PER_PAGE) || 1;
        if (page < 1 || page > totalPages || page === currentPage) return;
        currentPage = page;
        applyPage();
    };

    const renderPagination = (totalPages) => {
        if (!paginationList) return;
        paginationList.innerHTML = '';
        
        // Add entrance animation by removing and re-adding the class
        const paginationParent = paginationList.closest('#pagination-nav');
        if (paginationParent) {
            paginationParent.classList.remove('pagination-enter');
            // Force reflow for animation replay
            void paginationParent.offsetWidth;
            paginationParent.classList.add('pagination-enter');
        }
        
        if (totalPages <= 1) {
            // Hide pagination when there's only one page
            var nav = paginationList.closest('#pagination-nav');
            if (nav) nav.classList.add('d-none');
            paginationList.innerHTML = '';
            currentPage = 1;
            return;
        }
        // Show pagination when there are multiple pages
        var nav = paginationList.closest('#pagination-nav');
        if (nav) nav.classList.remove('d-none');

        // Previous button
        const prevLi = document.createElement('li');
        prevLi.className = `page-item ${currentPage <= 1 ? 'disabled' : ''}`;
        const prevA = document.createElement('a');
        prevA.className = 'page-link pagination-prev';
        prevA.href = '#';
        prevA.setAttribute('aria-label', 'Previous page');
        prevA.innerHTML = '<i class="fa-solid fa-chevron-left" style="font-size:14px"></i>';
        prevA.addEventListener('click', function(e) {
            e.preventDefault();
            if (currentPage > 1) goToPage(currentPage - 1);
        });
        prevLi.appendChild(prevA);
        paginationList.appendChild(prevLi);

        // Page numbers - show first, last, and pages around current
        const range = 2;
        let pages = [];
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - range && i <= currentPage + range)) {
                pages.push(i);
            } else if (pages[pages.length - 1] !== '...') {
                pages.push('...');
            }
        }

        pages.forEach(p => {
            if (p === '...') {
                const li = document.createElement('li');
                li.className = 'page-item disabled';
                const a = document.createElement('a');
                a.className = 'page-link pagination-ellipsis';
                a.textContent = '...';
                li.appendChild(a);
                paginationList.appendChild(li);
            } else {
                const li = document.createElement('li');
                li.className = `page-item${p === currentPage ? ' active' : ''}`;
                const a = document.createElement('a');
                a.className = `page-link ${p === currentPage ? 'pagination-active fw-bold' : 'pagination-page'}`;
                a.href = '#';
                a.dataset.page = p;
                a.textContent = p;
                a.addEventListener('click', function(e) {
                    e.preventDefault();
                    goToPage(parseInt(this.dataset.page));
                });
                li.appendChild(a);
                paginationList.appendChild(li);
            }
        });

        // Next button
        const nextLi = document.createElement('li');
        nextLi.className = `page-item ${currentPage >= totalPages ? 'disabled' : ''}`;
        const nextA = document.createElement('a');
        nextA.className = 'page-link pagination-next';
        nextA.href = '#';
        nextA.setAttribute('aria-label', 'Next page');
        nextA.innerHTML = '<i class="fa-solid fa-chevron-right" style="font-size:14px"></i>';
        nextA.addEventListener('click', function(e) {
            e.preventDefault();
            if (currentPage < totalPages) goToPage(currentPage + 1);
        });
        nextLi.appendChild(nextA);
        paginationList.appendChild(nextLi);
    };

    const applyPage = () => {
        const emptyState = document.getElementById('empty-search-state');
        const paginationNav = document.getElementById('pagination-nav');

        if (filteredCards.length === 0) {
            productCards.forEach(card => card.classList.add('d-none'));
            if (emptyState) {
                emptyState.classList.remove('d-none');
                const message = document.getElementById('empty-search-message');
                if (message) {
                    const q = shopSearchInput ? shopSearchInput.value.trim() : '';
                    if (q) {
                        message.textContent = `No plants found matching "${sanitize(q)}". Try a different search term.`;
                    } else {
                        message.textContent = 'No plants match your current filters. Try adjusting your selections.';
                    }
                }
            }
            if (paginationNav) paginationNav.classList.add('d-none');
            if (resultCount) resultCount.textContent = '0 results';
            return;
        }

        if (emptyState) emptyState.classList.add('d-none');
        if (paginationNav) paginationNav.classList.remove('d-none');

        const start = (currentPage - 1) * PER_PAGE;
        const end = start + PER_PAGE;
        const pageItems = filteredCards.slice(start, end);

        productCards.forEach(card => card.classList.add('d-none'));
        pageItems.forEach(card => card.classList.remove('d-none'));

        const totalPages = Math.ceil(filteredCards.length / PER_PAGE) || 1;
        renderPagination(totalPages);

        if (resultCount) {
            const total = productCards.length;
            const showing = filteredCards.length;
            if (showing < total) {
                resultCount.textContent = `Showing ${start + 1}–${Math.min(end, showing)} of ${showing} results`;
            } else {
                resultCount.textContent = `Showing all ${total} results`;
            }
        }

        // Add review badges to visible product cards
        pageItems.forEach(card => {
            const h3 = card.querySelector('h3');
            if (h3 && !card.querySelector('.product-review-stars')) {
                const badge = document.createElement('div');
                badge.className = 'product-review-stars';
                badge.dataset.productName = h3.textContent;
                const descP = card.querySelector('p');
                if (descP && descP.parentElement) {
                    descP.after(badge);
                }
            }
        });
        if (typeof window.syncReviewBadges === 'function') {
            window.syncReviewBadges();
        }

        // Smooth scroll to product grid top
        productGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
            // Show search header if searching
        const searchHeading = document.getElementById('shop-page-title');
        const searchSubtitle = document.getElementById('shop-page-subtitle');
        if (searchHeading && searchSubtitle) {
            const q = shopSearchInput ? shopSearchInput.value.trim() : '';
            if (q) {
                searchHeading.textContent = `🔍 Search results for "${sanitize(q)}"`;
                searchSubtitle.textContent = `Showing results for "${sanitize(q)}". ${filteredCards.length} ${filteredCards.length === 1 ? 'product' : 'products'} found.`;
            } else {
                searchHeading.textContent = 'All Plants';
                searchSubtitle.textContent = 'Discover our complete collection of premium plants — from air-purifying indoor greens to fragrant garden blooms.';
            }
        }

        // Update URL with page param
        if (currentPage > 1) {
            const url = new URL(window.location);
            url.searchParams.set('page', currentPage);
            window.history.replaceState({}, '', url);
        } else {
            const url = new URL(window.location);
            url.searchParams.delete('page');
            window.history.replaceState({}, '', url);
        }
    };

    /** Sync horizontal category pills with sidebar filters */
    const syncCategoryPills = () => {
        const pills = document.querySelectorAll('#category-pills .category-pill');
        if (!pills.length) return;
        pills.forEach(p => p.classList.remove('active'));
        const activePill = document.querySelector(`#category-pills .category-pill[data-filter="${activeCategory}"]`);
        if (activePill) activePill.classList.add('active');
    };

    const renderFilterChips = () => {
        const container = document.getElementById('active-filter-chips');
        if (!container) return;
        
        let chips = [];
        
        // Category chip
        if (activeCategory !== 'all') {
            const labels = { 'indoor': 'Indoor', 'outdoor': 'Outdoor', 'succulent': 'Succulents', 'sacred': 'Sacred Plants',
                'air-purifying': 'Air Purifying', 'low-light': 'Low Light', 'flowering': 'Flowering', 'hanging': 'Hanging',
                'shrub': 'Shrubs', 'climber': 'Climbers', 'fragrant': 'Fragrant', 'succulents': 'Succulents', 'cacti': 'Cacti', 'airplants': 'Air Plants' };
            chips.push({ label: labels[activeCategory] || activeCategory, type: 'category' });
        }
        
        
        // In stock chip
        if (inStockOnly) {
            chips.push({ label: 'In Stock Only', type: 'stock' });
        }
        
        // Pet friendly chip
        if (petFriendlyOnly) {
            chips.push({ label: '🐱 Pet Friendly', type: 'pet' });
        }
        
        if (chips.length === 0) {
            container.innerHTML = '';
            container.classList.add('d-none');
            return;
        }
        
        container.classList.remove('d-none');
        container.innerHTML = chips.map(chip => {
            let onclick = '';
            if (chip.type === 'category') {
                onclick = `document.querySelector('#category-filter a[data-filter="all"]').click()`;
            } else if (chip.type === 'stock') {
                onclick = `document.getElementById('in-stock-toggle').click()`;
            } else if (chip.type === 'pet') {
                onclick = `document.getElementById('pet-friendly-toggle').click()`;
            }
            return `<span class="active-filter-chip" onclick="${onclick}">${chip.label}<span class="material-symbols-outlined chip-close">close</span></span>`;
        }).join('');
    };

    const filterProducts = () => {
        // Start with all cards
        filteredCards = productCards.filter(card => {
            const cats = (card.dataset.category || '').split(' ');
            const matchesCategory = activeCategory === 'all' || cats.includes(activeCategory);
            const matchesStock = !inStockOnly || (card.querySelector('.stock-in-stock') !== null);
            const matchesPet = !petFriendlyOnly || isPetFriendly(card);
            return matchesCategory && matchesStock && matchesPet;
        });

        // Text search filter
        const shopSearchInput = document.getElementById('search-input');
        const query = shopSearchInput ? shopSearchInput.value.toLowerCase().trim() : '';
        if (query) {
            filteredCards = filteredCards.filter(card => {
                const name = card.querySelector('h3')?.textContent.toLowerCase() || '';
                const desc = card.querySelector('p')?.textContent.toLowerCase() || '';
                return name.includes(query) || desc.includes(query);
            });
        }

        // Sort
        const sortVal = getSortValue();
        if (sortVal === 'price-asc') {
            filteredCards.sort((a, b) => parseFloat(a.dataset.price) - parseFloat(b.dataset.price));
        } else if (sortVal === 'price-desc') {
            filteredCards.sort((a, b) => parseFloat(b.dataset.price) - parseFloat(a.dataset.price));
        } else if (sortVal === 'name') {
            filteredCards.sort((a, b) => {
                const na = a.querySelector('h3')?.textContent || '';
                const nb = b.querySelector('h3')?.textContent || '';
                return na.localeCompare(nb);
            });
        }

        currentPage = 1;
        syncCategoryPills();
        renderFilterChips();
        applyPage();
    };

    document.querySelectorAll('#category-filter a[data-filter]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            activeCategory = this.dataset.filter;
            document.querySelectorAll('#category-filter a[data-filter]').forEach(l => {
                l.classList.remove('text-primary', 'fw-bold');
                l.classList.add('text-on-surface-variant');
            });
            this.classList.add('text-primary', 'fw-bold');
            this.classList.remove('text-on-surface-variant');
            syncCategoryPills();
            filterProducts();
        });
    });

    // Sync pills click back to sidebar
    document.querySelectorAll('#category-pills .category-pill').forEach(pill => {
        pill.addEventListener('click', function(e) {
            e.preventDefault();
            const filter = this.dataset.filter;
            const sidebarLink = document.querySelector(`#category-filter a[data-filter="${filter}"]`);
            if (sidebarLink) {
                sidebarLink.click();
            }
        });
    });



    // In-Stock only toggle
    const stockToggle = document.getElementById('in-stock-toggle');
    if (stockToggle) {
        stockToggle.addEventListener('click', function() {
            inStockOnly = !inStockOnly;
            this.classList.toggle('active', inStockOnly);
            filterProducts();
        });
    }

    // Pet-Friendly toggle
    const petToggle = document.getElementById('pet-friendly-toggle');
    if (petToggle) {
        petToggle.addEventListener('click', function() {
            petFriendlyOnly = !petFriendlyOnly;
            this.classList.toggle('active', petFriendlyOnly);
            filterProducts();
        });
    }

    // shopSearchInput is already declared above; just use it
    if (shopSearchInput) {
        shopSearchInput.addEventListener('input', debouncedFilter);
    }

    // Sort pills click handler
    if (sortPills) {
        sortPills.addEventListener('click', function(e) {
            var pill = e.target.closest('.sort-pill');
            if (!pill || pill.classList.contains('active')) return;
            sortPills.querySelectorAll('.sort-pill').forEach(function(p) {
                p.classList.remove('active');
                p.setAttribute('aria-checked', 'false');
            });
            pill.classList.add('active');
            pill.setAttribute('aria-checked', 'true');
            filterProducts();
        });
    }

    // Clear all filters button
    const clearFiltersBtn = document.getElementById('clear-all-filters');
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', function() {
            // Reset category
            activeCategory = 'all';
            document.querySelectorAll('#category-filter a[data-filter]').forEach(l => {
                l.classList.remove('text-primary', 'fw-bold');
                l.classList.add('text-on-surface-variant');
            });
            const allLink = document.querySelector('#category-filter a[data-filter="all"]');
            if (allLink) {
                allLink.classList.add('text-primary', 'fw-bold');
                allLink.classList.remove('text-on-surface-variant');
            }
            syncCategoryPills();

            // Reset in-stock toggle
            inStockOnly = false;
            const stockToggle = document.getElementById('in-stock-toggle');
            if (stockToggle) stockToggle.classList.remove('active');

            // Reset pet-friendly toggle
            petFriendlyOnly = false;
            const petToggle = document.getElementById('pet-friendly-toggle');
            if (petToggle) petToggle.classList.remove('active');

            // Reset search input
            if (shopSearchInput) shopSearchInput.value = '';

            // Reset URL params
            const url = new URL(window.location);
            url.searchParams.delete('q');
            window.history.replaceState({}, '', url);

            filterProducts();
            showToast('All filters cleared');
        });
    }

    filterProducts();
}

// ====================================================================
// USER SESSION — Sign in / Sign out (shared across all pages)
// ====================================================================

const AUTH_KEY = 'leafUser';

/** Get the currently logged-in user, or null */
function getCurrentUser() {
    return safeStorage.getJSON(AUTH_KEY, null);
}

/** Sync Firebase user to localStorage */
function syncAuthState(user) {
    if (user) {
        var name = user.displayName || user.email || 'User';
        var session = {
            sub: user.uid,
            name: name,
            email: user.email,
            given_name: name.split(' ')[0],
            picture: user.photoURL
        };
        safeStorage.setJSON(AUTH_KEY, session);
    } else {
        safeStorage.remove(AUTH_KEY);
    }
    updateUserNav();
}

/** Update the navigation to show user avatar or sign-in icon */
function updateUserNav() {
    const user = getCurrentUser();

    // ====================================================================
    // DESKTOP AVATAR DROPDOWN — Premium Redesign
    // ====================================================================
    const container = document.getElementById('user-menu-container');
    if (container) {
        if (user && user.name) {
            const initials = (user.given_name || user.name || 'U').charAt(0).toUpperCase();
            const avatarUrl = user.picture || null;
            const avatarColors = ['#3D7A4F', '#2A6B2C', '#4A8C5C', '#357347', '#5A9C6C'];
            const colorIdx = user.name.length % avatarColors.length;
            const avatarBg = avatarColors[colorIdx];

            container.innerHTML = `
              <div class="dropdown user-dropdown-premium" id="user-dropdown">
                <button class="user-avatar-btn" type="button" id="userAvatarBtn" data-bs-toggle="dropdown" aria-expanded="false" aria-label="User menu" title="${sanitize(user.name)}">
                  <div class="user-avatar-ring">
                    ${avatarUrl
                      ? `<img src="${avatarUrl}" alt="${sanitize(user.name)}" class="user-avatar-img" referrerpolicy="no-referrer">`
                      : `<div class="user-avatar-initials" style="background:${avatarBg}">${initials}</div>`
                    }
                  </div>
                  <span class="user-avatar-chevron material-symbols-outlined">expand_more</span>
                </button>
                <div class="user-dropdown-menu dropdown-menu" aria-labelledby="userAvatarBtn">
                  <div class="user-dropdown-header">
                    <div class="user-dropdown-avatar">
                      ${avatarUrl
                        ? `<img src="${avatarUrl}" alt="${sanitize(user.name)}" class="user-dropdown-avatar-img" referrerpolicy="no-referrer">`
                        : `<div class="user-dropdown-initials" style="background:${avatarBg}">${initials}</div>`
                      }
                    </div>
                    <div class="user-dropdown-info">
                      <p class="user-dropdown-name">${sanitize(user.name)}</p>
                      <p class="user-dropdown-email">${sanitize(user.email || 'No email')}</p>
                    </div>
                  </div>
                  <div class="user-dropdown-body">
                    <a class="user-dropdown-item" href="${pageUrl('account-settings.html')}">
                      <span class="user-dropdown-item-icon material-symbols-outlined">settings</span>
                      <span class="user-dropdown-item-text">Account Settings</span>
                    </a>
                    <a class="user-dropdown-item" href="${pageUrl('wishlist.html')}">
                      <span class="user-dropdown-item-icon material-symbols-outlined">favorite</span>
                      <span class="user-dropdown-item-text">Wishlist</span>
                    </a>
                    <div class="user-dropdown-divider"></div>
                    <button class="user-dropdown-item user-dropdown-signout" id="sign-out-btn" type="button">
                      <span class="user-dropdown-item-icon material-symbols-outlined">logout</span>
                      <span class="user-dropdown-item-text">Sign Out</span>
                    </button>
                  </div>
                </div>
              </div>
            `;
            const signOutBtn = document.getElementById('sign-out-btn');
            if (signOutBtn) {
                signOutBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    if (typeof firebase !== 'undefined') firebase.auth().signOut().catch(function() {});
                    safeStorage.remove(AUTH_KEY);
                    updateUserNav();
                    if (typeof showToast === 'function') showToast('Signed out successfully.');
                });
            }

            // --- Custom dropdown toggle (avoids Bootstrap re-init issues) ---
            (function initAvatarDropdown() {
                var dropdownRoot = container.querySelector('.user-dropdown-premium');
                var avatarBtn = container.querySelector('.user-avatar-btn');
                var menuEl = container.querySelector('.user-dropdown-menu');
                if (!dropdownRoot || !avatarBtn || !menuEl) return;

                // Prevent duplicate attachment on multiple updateUserNav() calls
                if (menuEl.dataset.dropdownInit) return;
                menuEl.dataset.dropdownInit = 'true';

                // Remove Bootstrap's data attribute to prevent auto-init conflicts
                avatarBtn.removeAttribute('data-bs-toggle');

                function openDropdown() {
                    dropdownRoot.classList.add('show');
                    menuEl.classList.add('show');
                    avatarBtn.setAttribute('aria-expanded', 'true');
                }

                function closeDropdown() {
                    dropdownRoot.classList.remove('show');
                    menuEl.classList.remove('show');
                    avatarBtn.setAttribute('aria-expanded', 'false');
                }

                function isOpen() {
                    return dropdownRoot.classList.contains('show');
                }

                // Toggle on button click
                avatarBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    if (isOpen()) {
                        closeDropdown();
                    } else {
                        openDropdown();
                    }
                });

                // Close on click outside (single document listener via flag)
                if (!window._avatarDropdownAttached) {
                    window._avatarDropdownAttached = true;
                    document.addEventListener('click', function closeHandler(e) {
                        document.querySelectorAll('.user-dropdown-premium.show').forEach(function(root) {
                            if (!root.contains(e.target)) {
                                root.classList.remove('show');
                                var menu = root.querySelector('.user-dropdown-menu');
                                var btn = root.querySelector('.user-avatar-btn');
                                if (menu) menu.classList.remove('show');
                                if (btn) btn.setAttribute('aria-expanded', 'false');
                            }
                        });
                    });

                    document.addEventListener('keydown', function escHandler(e) {
                        if (e.key === 'Escape') {
                            document.querySelectorAll('.user-dropdown-premium.show').forEach(function(root) {
                                root.classList.remove('show');
                                var menu = root.querySelector('.user-dropdown-menu');
                                var btn = root.querySelector('.user-avatar-btn');
                                if (menu) menu.classList.remove('show');
                                if (btn) { btn.setAttribute('aria-expanded', 'false'); btn.focus(); }
                            });
                        }
                    });
                }
            })();
        } else {
                        container.innerHTML = '<a class="nav-link site-navbar-icon" href="' + pageUrl('create-account.html') + '" aria-label="Account" title="Create Account"><span class="material-symbols-outlined" aria-hidden="true">person</span></a>';
        }
    }

    // ====================================================================
    // MOBILE USER MENU — Premium Redesign
    // ====================================================================
    const mobileContainer = document.getElementById('mobile-user-menu-container');
    const mobileItem = document.getElementById('mobile-user-menu-item');
    if (mobileContainer && mobileItem) {
        if (user && user.name) {
            mobileItem.classList.remove('d-none');
            const initials = (user.given_name || user.name || 'U').charAt(0).toUpperCase();
            const avatarUrl = user.picture || null;
            const avatarColors = ['#3D7A4F', '#2A6B2C', '#4A8C5C', '#357347', '#5A9C6C'];
            const colorIdx = user.name.length % avatarColors.length;
            const avatarBg = avatarColors[colorIdx];

            mobileContainer.innerHTML = `
              <div class="mobile-user-card">
                <div class="mobile-user-avatar">
                  ${avatarUrl
                    ? `<img src="${avatarUrl}" alt="${sanitize(user.name)}" class="mobile-user-avatar-img" referrerpolicy="no-referrer">`
                    : `<div class="mobile-user-initials" style="background:${avatarBg}">${initials}</div>`
                  }
                </div>
                <div class="mobile-user-info">
                  <p class="mobile-user-name">${sanitize(user.name)}</p>
                  <p class="mobile-user-email">${sanitize(user.email || 'No email')}</p>
                </div>
              </div>
              <a class="mobile-user-link" href="${pageUrl('account-settings.html')}">
                <span class="material-symbols-outlined">settings</span>
                <span>Account Settings</span>
              </a>
              <a class="mobile-user-link" href="${pageUrl('wishlist.html')}">
                <span class="material-symbols-outlined">favorite</span>
                <span>Wishlist</span>
              </a>
              <div class="mobile-user-divider"></div>
              <button class="mobile-user-link mobile-user-signout" id="mobile-sign-out-btn" type="button">
                <span class="material-symbols-outlined">logout</span>
                <span>Sign Out</span>
              </button>
            `;
            document.getElementById('mobile-sign-out-btn').addEventListener('click', function(e) {
                e.preventDefault();
                if (typeof firebase !== 'undefined') firebase.auth().signOut().catch(function() {});
                safeStorage.remove(AUTH_KEY);
                updateUserNav();
                if (typeof showToast === 'function') showToast('Signed out successfully.');
            });
        } else {
            mobileItem.classList.add('d-none');
                        mobileContainer.innerHTML = '<a class="nav-link" href="' + pageUrl('create-account.html') + '"><span class="material-symbols-outlined me-2">person_add</span>Create Account</a>';
        }
    }
}

// — Record page visit in browsing history (includes query strings for product pages) —
function savePageVisit() {
    var HISTORY_KEY = 'leafBrowsingHistory';
    var MAX_HISTORY = 20;
    // Build full URL including query string so product pages are tracked separately
    var path = window.location.pathname.split('/').pop() || 'index.html';
    var qs = window.location.search || '';
    var fullUrl = path + qs;
    var pageData = {
        url: fullUrl,
        name: document.title.replace(' — Ankuram', '') || 'Ankuram',
        icon: 'eco',
        timestamp: Date.now()
    };
    var icons = {
        'index.html': 'home',
        'shop.html': 'store',
        'indoor.html': 'cottage',
        'outdoor.html': 'park',
        'succulent.html': 'local_florist',
        'tulsi.html': 'spa',
        'about.html': 'info',
        'contact.html': 'mail',
        'care-guide.html': 'menu_book',
        'wishlist.html': 'favorite',
        'cart.html': 'shopping_cart',
        'checkout.html': 'credit_card',
        'product.html': 'eco',
        'quiz.html': 'quiz',
        'create-account.html': 'person_add',
        'account-settings.html': 'settings'
    };
    if (icons[path]) pageData.icon = icons[path];
    try {
        var history = JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
        // Remove previous entry for this exact URL (with query string)
        history = history.filter(function(h) { return h.url !== fullUrl; });
        history.unshift(pageData);
        if (history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
        if (typeof console !== 'undefined' && console.log) {
            console.log('[📜 History] Saved to browser: "' + pageData.name + '" → ' + fullUrl);
        }
    } catch(e) {
        if (typeof console !== 'undefined' && console.warn) {
            console.warn('[📜 History] Browser save failed: ' + e.message);
        }
    }

    // — Also save to Supabase cloud if available —
    if (window._supabase && typeof window._supabase.from === 'function') {
        window._supabase.from('browsing_history').insert({
            page_url: fullUrl,
            page_name: pageData.name,
            page_icon: pageData.icon,
            visited_at: new Date().toISOString()
        }).then(function(result) {
            if (result.error) {
                if (typeof console !== 'undefined' && console.log) {
                    console.log('[📜 History] Cloud save skipped — will sync on login');
                }
            } else if (typeof console !== 'undefined' && console.log) {
                console.log('[📜 History] Saved to cloud: "' + pageData.name + '"');
            }
        }).catch(function() {});
    }
}

// Record initial page visit (runs immediately with current title)
try {
    savePageVisit();
} catch(e) {
    if (typeof console !== 'undefined' && console.warn) {
        console.warn('[📜 History] Initial save failed: ' + e.message);
    }
}

// Export for pages that dynamically update the title (e.g., product.html)
window.updateBrowsingHistory = function() {
    try {
        savePageVisit();
    } catch(e) {
        if (typeof console !== 'undefined' && console.warn) {
            console.warn('[📜 History] updateBrowsingHistory failed: ' + e.message);
        }
    }
};

// Listen to Firebase auth state changes
(function initAuth() {
    function doUpdate() {
        if (typeof firebase !== 'undefined' && firebase.auth) {
            firebase.auth().onAuthStateChanged(function(user) {
                syncAuthState(user);
            });
        } else {
            // Firebase not loaded yet — fallback to localStorage
            updateUserNav();
        }
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', doUpdate);
    } else {
        doUpdate();
    }
})();
