// ====================================================================
// SUPABASE REVIEWS — Sync product reviews between localStorage & Supabase
// ====================================================================
// Architecture: offline-first
//   1. Always save to localStorage first (instant UI feedback)
//   2. Then sync to Supabase asynchronously (non-blocking)
//   3. On page load, fetch from Supabase and merge into localStorage
// ====================================================================

(function() {
    'use strict';

    var REVIEWS_KEY = 'leafReviews';

    // Safe localStorage helpers
    function safeGet(key) {
        try { var v = localStorage.getItem(key); return v !== null ? v : null; }
        catch(e) { return null; }
    }
    function safeSet(key, val) {
        try { localStorage.setItem(key, val); return true; }
        catch(e) { return false; }
    }
    function safeParse(val, fallback) {
        try { return val ? JSON.parse(val) : fallback; }
        catch(e) { return fallback; }
    }

    // ================================================================
    // LOAD reviews from Supabase → merge into localStorage
    // ================================================================
    window.syncReviewsFromCloud = function() {
        if (!window._supabase) return Promise.resolve(false);

        return window._supabase
            .from('reviews')
            .select('*')
            .order('date', { ascending: false })
            .then(function(result) {
                if (result.error) {
                    console.warn('☁️ Supabase sync failed:', result.error.message);
                    return false;
                }

                var cloudReviews = result.data || [];
                if (cloudReviews.length === 0) return true;

                // Merge: cloud data overwrites local (cloud is source of truth)
                var localReviews = safeParse(safeGet(REVIEWS_KEY), []);
                var mergedMap = {};

                // Add cloud reviews first
                cloudReviews.forEach(function(r) {
                    mergedMap[r.id] = r;
                });

                // Add local reviews (won't overwrite cloud if same id)
                localReviews.forEach(function(r) {
                    if (!mergedMap[r.id]) {
                        mergedMap[r.id] = r;
                    }
                });

                var merged = Object.values(mergedMap);
                safeSet(REVIEWS_KEY, JSON.stringify(merged));
                console.log('☁️ Synced ' + cloudReviews.length + ' reviews from cloud');
                return true;
            })
            .catch(function(err) {
                console.warn('☁️ Supabase sync error:', err.message);
                return false;
            });
    };

    // ================================================================
    // UPSERT a single review to Supabase
    // ================================================================
    window.saveReviewToCloud = function(review) {
        if (!window._supabase || !review) return Promise.resolve(false);

        // Include user info from localStorage auth if available
        var reviewData = {};
        Object.keys(review).forEach(function(k) { reviewData[k] = review[k]; });
        
        // Add user_id from localStorage auth if not already set
        if (!reviewData.user_id) {
            try {
                var user = JSON.parse(localStorage.getItem('leafUser'));
                if (user && user.sub) {
                    reviewData.user_id = user.sub;
                }
            } catch(e) {}
        }

        return window._supabase
            .from('reviews')
            .upsert(reviewData, { onConflict: 'id' })
            .then(function(result) {
                if (result.error) {
                    console.warn('☁️ Failed to save review:', result.error.message, result);
                    return false;
                }
                console.log('☁️ Review saved to cloud:', reviewData.id);
                return true;
            })
            .catch(function(err) {
                console.warn('☁️ Error saving review:', err.message);
                return false;
            });
    };

    // ================================================================
    // DELETE a review from Supabase
    // ================================================================
    window.deleteReviewFromCloud = function(reviewId) {
        if (!window._supabase || !reviewId) return Promise.resolve(false);

        return window._supabase
            .from('reviews')
            .delete()
            .eq('id', reviewId)
            .then(function(result) {
                if (result.error) {
                    console.warn('☁️ Failed to delete review:', result.error.message);
                    return false;
                }
                return true;
            })
            .catch(function(err) {
                console.warn('☁️ Error deleting review:', err.message);
                return false;
            });
    };

    // ================================================================
    // Auto-sync on page load
    // ================================================================
    function initSync() {
        // Wait a moment for other scripts to be ready, then sync
        setTimeout(function() {
            window.syncReviewsFromCloud();
        }, 500);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSync);
    } else {
        initSync();
    }

})();
