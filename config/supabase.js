// ====================================================================
// SUPABASE CLIENT — Initialize Supabase for cloud data persistence
// ====================================================================

(function() {
    'use strict';

    var SUPABASE_URL = 'https://gjuootsxrkocreozpkfi.supabase.co';
    var SUPABASE_ANON_KEY = 'sb_publishable_nI9xev7C1cZYp9EsoIg54Q_lf9-E4Pt';

    // Create client using the UMD build loaded from CDN
    if (typeof supabase !== 'undefined' && supabase.createClient) {
        window._supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('☁️ Supabase client initialized');
    } else {
        console.warn('☁️ Supabase SDK not loaded — cloud features unavailable');
        window._supabase = null;
    }
})();
