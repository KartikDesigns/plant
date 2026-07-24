// ====================================================================
// SUPABASE BROWSING HISTORY — Sync important page visits to cloud
// ====================================================================
// Architecture: offline-first, limited sync
//   1. Save ALL visits to localStorage first (as before)
//   2. Only sync IMPORTANT pages to Supabase (product, category, shop)
//   3. Keep cloud storage limited (max 15 items per user)
// ====================================================================

(function() {
    'use strict';

    var HISTORY_KEY = 'leafBrowsingHistory';
    var CLOUD_SYNCED_KEY = 'leafBrowsingCloudSynced';

    // ================================================================
    // IMPORTANT pages only — skip simple/utility pages
    // ================================================================
    var IMPORTANT_PATTERNS = [
        'product.html',    // Product detail pages
        'indoor.html',     // Category pages
        'outdoor.html',
        'succulent.html',
        'tulsi.html',
        'shop.html'        // Shop/browsing page
    ];

    function isImportantPage(url) {
        return IMPORTANT_PATTERNS.some(function(pattern) {
            return url.indexOf(pattern) !== -1;
        });
    }

    // ================================================================
    // Get a session ID for anonymous users
    // ================================================================
    function getSessionId() {
        var SESSION_KEY = 'leafSessionId';
        var sessionId = null;
        try {
            sessionId = localStorage.getItem(SESSION_KEY);
            if (!sessionId) {
                sessionId = 'ses_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                localStorage.setItem(SESSION_KEY, sessionId);
            }
        } catch(e) {
            sessionId = 'ses_' + Date.now();
        }
        return sessionId;
    }

    // ================================================================
    // Get current user ID (or null if not logged in)
    // ================================================================
    function getUserId() {
        try {
            var user = JSON.parse(localStorage.getItem('leafUser') || 'null');
            return user ? user.sub : null;
        } catch(e) {
            return null;
        }
    }

    // ================================================================
    // Sync limited browsing history to Supabase
    // ================================================================
    window.syncBrowsingToCloud = function() {
        if (!window._supabase) return Promise.resolve(false);

        var userId = getUserId();
        if (!userId) {
            // Only sync if user is logged in
            return Promise.resolve(false);
        }

        try {
            var allHistory = JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
            // Only sync important pages
            var importantItems = allHistory.filter(function(item) {
                return item.url && isImportantPage(item.url);
            });

            // Limit to last 10 important items
            var limitedItems = importantItems.slice(0, 10);
            if (limitedItems.length === 0) return Promise.resolve(true);

            var syncedCount = parseInt(localStorage.getItem(CLOUD_SYNCED_KEY) || '0', 10);

            return window._supabase
                .from('browsing_history')
                .upsert(
                    limitedItems.map(function(item) {
                        return {
                            user_id: userId,
                            session_id: getSessionId(),
                            page_url: item.url || '',
                            page_name: item.name || 'Unknown',
                            page_icon: item.icon || 'eco',
                            visited_at: new Date(item.timestamp).toISOString()
                        };
                    }),
                    { onConflict: 'id', ignoreDuplicates: true }
                )
                .then(function(result) {
                    if (result.error) {
                        console.warn('☁️ Browsing history sync failed:', result.error.message);
                        return false;
                    }
                    localStorage.setItem(CLOUD_SYNCED_KEY, String(syncedCount + limitedItems.length));
                    console.log('☁️ Synced ' + limitedItems.length + ' browsing visits to cloud');
                    return true;
                })
                .catch(function(err) {
                    console.warn('☁️ Browsing history sync error:', err.message);
                    return false;
                });
        } catch(e) {
            console.warn('☁️ Browsing history sync error:', e.message);
            return Promise.resolve(false);
        }
    };

    // ================================================================
    // Hook into savePageVisit to sync important pages
    // ================================================================
    // This wraps the existing savePageVisit to also sync to cloud
    // for important pages only
    var originalUpdateBrowsingHistory = window.updateBrowsingHistory;

    window.updateBrowsingHistory = function() {
        // Call original function first (saves to localStorage)
        if (typeof originalUpdateBrowsingHistory === 'function') {
            originalUpdateBrowsingHistory();
        }

        // Then sync limited important pages to cloud (debounced)
        if (typeof window._supabase !== 'undefined' && window._supabase) {
            var path = window.location.pathname.split('/').pop() || '';
            if (isImportantPage(path)) {
                // Debounce: wait 1.5s after page load, then sync
                clearTimeout(window._browsingSyncTimer);
                window._browsingSyncTimer = setTimeout(function() {
                    window.syncBrowsingToCloud();
                }, 1500);
            }
        }
    };

    // Also wrap the manual sync function from savePageVisit for initial load
    var origSave = window.savePageVisit || function(){};
    window.savePageVisit = function() {
        origSave();
        if (typeof window._supabase !== 'undefined' && window._supabase) {
            var path = window.location.pathname.split('/').pop() || '';
            if (isImportantPage(path)) {
                clearTimeout(window._browsingSyncTimer);
                window._browsingSyncTimer = setTimeout(function() {
                    window.syncBrowsingToCloud();
                }, 1500);
            }
        }
    };

    // ================================================================
    // Also sync when cloud-sync-complete event fires
    // ================================================================
    window.addEventListener('cloud-sync-complete', function() {
        window.syncBrowsingToCloud();
    });

    // ================================================================
    // Auto-sync on page load for important pages
    // ================================================================
    function initSync() {
        var path = window.location.pathname.split('/').pop() || '';
        if (isImportantPage(path) && typeof window._supabase !== 'undefined' && window._supabase) {
            setTimeout(function() {
                window.syncBrowsingToCloud();
            }, 2000);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSync);
    } else {
        initSync();
    }

})();
