// ====================================================================
// WISHLIST
// ====================================================================

/** Safe JSON parse with fallback */
function safeParse(val, fallback = null) {
    if (val === null || val === undefined) return fallback;
    try { return JSON.parse(val); } catch { return fallback; }
}

/** Safe localStorage getter with fallback for private browsing */
function safeGet(key, fallback = null) {
    try { const v = localStorage.getItem(key); return v !== null ? v : fallback; }
    catch { return fallback; }
}

/** Safe localStorage setter with fallback for private browsing */
function safeSet(key, val) {
    try { localStorage.setItem(key, val); return true; }
    catch { return false; }
}

/** Escape single quotes for HTML attribute usage */
function attrEscape(str) {
    if (!str) return '';
    return String(str).replace(/'/g, '&#39;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

let wishlist = safeParse(safeGet('leafWishlist'), []);

// ====================================================================
// WISHLIST POPULARITY COUNTER
// ====================================================================

function getWishlistCounts() {
    return safeParse(safeGet('leafWishlistCounts'), {});
}

function updateWishlistCount(name, price) {
    const counts = getWishlistCounts();
    if (!counts[name]) {
        counts[name] = { count: 0, price: price, name: name };
    }
    counts[name].count += 1;
    counts[name].price = price;
    safeSet('leafWishlistCounts', JSON.stringify(counts));
}

// ====================================================================
// PRICE DROP DETECTION
// ====================================================================

function detectPriceDrop(item) {
    const added = parseFloat(item.addedPrice);
    const current = parseFloat(item.price);
    if (!isNaN(added) && !isNaN(current) && current < added) {
        return { dropped: true, saved: added - current };
    }
    return { dropped: false };
}

const updateWishlistBadge = () => {
    const count = wishlist.length;
    document.querySelectorAll('#wishlist-badge').forEach(badge => {
        if (count > 0) {
            badge.classList.remove('d-none');
            badge.textContent = count;
        } else {
            badge.classList.add('d-none');
        }
    });
};

// use window.showToast from script.js (loaded after cart.js)

wishlist = safeParse(safeGet('leafWishlist'), []);

const wishlistBtn = document.getElementById('wishlist-btn');
if (wishlistBtn) {
    const updateWishlistIcon = () => {
        wishlistBtn.style.fontVariationSettings = wishlist.length > 0 ? "'FILL' 1" : "'FILL' 0";
        wishlistBtn.style.color = wishlist.length > 0 ? '#D4A0A0' : '';
    };
    updateWishlistIcon();
    wishlistBtn.addEventListener('click', function(e) {
        e.preventDefault();
        // Use pageUrl() if available (defined in script.js) for correct directory resolution
        var target = typeof pageUrl === 'function' ? pageUrl('wishlist.html') : 'wishlist.html';
        window.location.href = target;
    });
}

// Toggle individual product in wishlist (delegated)
document.addEventListener('click', function(e) {
    const btn = e.target.closest('.btn-toggle-wishlist');
    if (!btn) return;

    e.preventDefault();

    // Prevent double-clicks with loading state
    if (btn.dataset.loading === 'true') return;
    btn.dataset.loading = 'true';
    btn.classList.add('btn-loading');

    let product;
    try {
        product = JSON.parse(btn.dataset.product);
    } catch {
        showToast('Error updating wishlist.');
        btn.dataset.loading = 'false';
        btn.classList.remove('btn-loading');
        return;
    }

    const idx = wishlist.findIndex(w => w.name === product.name);
    const icon = btn.querySelector('.material-symbols-outlined');
    if (idx > -1) {
        wishlist.splice(idx, 1);
        if (icon) { icon.style.fontVariationSettings = "'FILL' 0"; icon.style.color = ''; }
        showToast(`Removed ${product.name} from wishlist`);
    } else {
        const wishlistItem = { name: product.name, price: product.price, addedPrice: product.price, category: product.category, image: product.image };
        wishlist.push(wishlistItem);
        updateWishlistCount(product.name, product.price);
        if (icon) { icon.style.fontVariationSettings = "'FILL' 1"; icon.style.color = '#D4A0A0'; }
        showToast(`Added ${product.name} to wishlist`);
    }

    safeSet('leafWishlist', JSON.stringify(wishlist));

    if (wishlistBtn) {
        wishlistBtn.style.fontVariationSettings = wishlist.length > 0 ? "'FILL' 1" : "'FILL' 0";
        wishlistBtn.style.color = wishlist.length > 0 ? '#D4A0A0' : '';
    }

    updateWishlistBadge();

    // Reset loading state
    setTimeout(() => {
        btn.dataset.loading = 'false';
        btn.classList.remove('btn-loading');
    }, 400);

    // If on wishlist page, remove the item from the grid
    if (btn.closest('#wishlist-grid')) {
        btn.closest('.col')?.remove();

        // Re-check if wishlist is empty
        const grid = document.getElementById('wishlist-grid');
        if (grid && grid.children.length === 0) {
            const empty = document.getElementById('wishlist-empty');
            const content = document.getElementById('wishlist-content');
            const subtitle = document.getElementById('wishlist-subtitle');
            if (empty) empty.classList.remove('d-none');
            if (content) content.classList.add('d-none');
            if (subtitle) subtitle.textContent = 'No saved plants yet.';
        }
    }
});

// Sync wishlist icons on page load
const syncWishlistIcons = () => {
    document.querySelectorAll('.btn-toggle-wishlist').forEach(btn => {
        try {
            const product = JSON.parse(btn.dataset.product);
            const icon = btn.querySelector('.material-symbols-outlined');
            if (icon) {
                const isInWishlist = wishlist.some(w => w.name === product.name);
                icon.style.fontVariationSettings = isInWishlist ? "'FILL' 1" : "'FILL' 0";
                icon.style.color = isInWishlist ? '#D4A0A0' : '';
            }
        } catch (e) {}
    });
};
syncWishlistIcons();

// ====================================================================
// WISHLIST PAGE
// ====================================================================

const isWishlistPage = () => !!document.getElementById('wishlist-grid');

if (isWishlistPage()) {
    const grid = document.getElementById('wishlist-grid');
    const empty = document.getElementById('wishlist-empty');
    const content = document.getElementById('wishlist-content');
    const countEl = document.getElementById('wishlist-count');
    const subtitle = document.getElementById('wishlist-subtitle');
    const clearAll = document.getElementById('wishlist-clear-all');

    const renderWishlist = () => {
        if (!wishlist.length) {
            if (empty) empty.classList.remove('d-none');
            if (content) content.classList.add('d-none');
            if (subtitle) subtitle.textContent = 'No saved plants yet.';
            return;
        }

        if (empty) empty.classList.add('d-none');
        if (content) content.classList.remove('d-none');
        if (subtitle) subtitle.textContent = `${wishlist.length} saved ${wishlist.length === 1 ? 'plant' : 'plants'}.`;
        if (countEl) countEl.textContent = `${wishlist.length} ${wishlist.length === 1 ? 'item' : 'items'}`;

        grid.innerHTML = wishlist.map((item) => {
            const imgSrc = item.image || '../../assets/white_background_202607131940.jpeg';
            const safeName = attrEscape(item.name);
            const safeCategory = attrEscape(item.category || '');
            const dataAttr = attrEscape(JSON.stringify(item));
            const drop = detectPriceDrop(item);

            const ribbon = drop.dropped
                ? `<div style="position:absolute;top:16px;left:-35px;z-index:3;transform:rotate(-45deg);background:linear-gradient(135deg,#f59e0b,#ef4444);color:#fff;font-size:0.65rem;font-weight:700;letter-spacing:0.5px;padding:4px 40px;text-align:center;text-transform:uppercase;box-shadow:0 2px 8px rgba(245,158,11,0.4)">Save &#8377;${Math.round(drop.saved)}</div>`
                : '';

            const priceArea = drop.dropped
                ? `<div style="background:linear-gradient(135deg,#fef3c7,#fef9c3);border:1px solid #fbbf24;border-radius:8px;padding:8px 10px;margin-top:6px">
<div class="d-flex align-items-center gap-2">
<span class="material-symbols-outlined" style="font-size:16px;color:#d97706">local_offer</span>
<span style="font-size:0.72rem;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.3px">Price Dropped</span>
</div>
<div class="d-flex align-items-baseline gap-2 mt-1">
<span style="font-size:1.1rem;font-weight:800;color:#15803d">&#8377;${item.price}</span>
<span style="font-size:0.75rem;color:#92400e;text-decoration:line-through;opacity:0.7">&#8377;${item.addedPrice}</span>
</div>
</div>`
                : `<span class="fw-bold text-primary" style="font-size:1rem">&#8377;${(item.price || 0)}</span>`;

            return `<div class="col">
<div class="bg-white rounded-3 p-3 shadow-sm hover-lift border border-outline-variant/10 group" style="position:relative;overflow:visible">
<div class="position-relative aspect-4-5 rounded-3 overflow-hidden bg-surface-container-low mb-3">
<img class="w-100 h-100 object-fit-cover transition-standard group-hover-scale-105" src="${imgSrc}" alt="${safeName}" loading="lazy"/>
${ribbon}
<button class="position-absolute top-0 end-0 bg-white bg-white/90 p-2 rounded-5 border-0 transition-standard hover-bg-primary hover-text-white m-2 btn-toggle-wishlist" data-product='${dataAttr}' style="z-index:2">
<span class="material-symbols-outlined d-block" style="font-size:20px;font-variation-settings:'FILL' 1;color:#D4A0A0">favorite</span>
</button>
<a class="position-absolute bottom-0 end-0 text-white p-3 rounded-5 border-0 transition-standard mb-2 me-2 text-decoration-none d-flex align-items-center justify-content-center" href="https://wa.me/916393394554?text=${encodeURIComponent("Hi! I'd like to order " + item.name + " - ₹" + (item.price || 0))}" target="_blank" rel="noopener noreferrer" style="opacity:0;transform:translateY(1rem);background-color:#25D366;width:44px;height:44px">
<span class="material-symbols-outlined" style="font-size:22px">chat</span>
</a>
</div>
<div class="d-flex flex-column gap-1">
<div class="d-flex justify-content-between align-items-start">
<h3 class="text-label-md mb-0 fw-normal">${safeName}</h3>
</div>
${priceArea}
<p class="text-label-sm text-on-surface-variant mb-0 opacity-70 mt-1">${safeCategory}</p>
</div>
</div>
</div>`;
        }).join('');

        // Re-sync wishlist icons after render
        syncWishlistIcons();
    };

    if (clearAll) {
        clearAll.addEventListener('click', function() {
            wishlist = [];
            safeSet('leafWishlist', JSON.stringify(wishlist));
            if (wishlistBtn) {
                wishlistBtn.style.fontVariationSettings = "'FILL' 0";
                wishlistBtn.style.color = '';
            }
            renderWishlist();
            showToast('Wishlist cleared');
        });
    }

    renderWishlist();
}

// ====================================================================
// CONTACT FORM VALIDATION (field-level like checkout)
// ====================================================================

const contactForm = document.getElementById('contact-form');
if (contactForm) {
    const contactValidateField = (id) => {
        const el = document.getElementById(id);
        if (!el) return true;
        const feedback = el.parentElement.querySelector('.invalid-feedback');
        if (!el.value.trim()) {
            el.classList.add('is-invalid');
            el.classList.remove('is-valid');
            if (feedback) feedback.classList.add('show');
            return false;
        }
        if (id === 'email') {
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(el.value.trim())) {
                el.classList.add('is-invalid');
                el.classList.remove('is-valid');
                if (feedback) {
                    feedback.textContent = 'Please enter a valid email address.';
                    feedback.classList.add('show');
                }
                return false;
            }
        }
        el.classList.remove('is-invalid');
        el.classList.add('is-valid');
        if (feedback) feedback.classList.remove('show');
        return true;
    };

    ['name', 'email', 'message'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('blur', () => contactValidateField(id));
            el.addEventListener('input', function() {
                if (this.classList.contains('is-invalid')) {
                    contactValidateField(id);
                } else if (this.value.trim()) {
                    this.classList.add('is-valid');
                } else {
                    this.classList.remove('is-valid');
                }
            });
        }
    });

    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const fields = ['name', 'email', 'message'];
        let allValid = true;
        fields.forEach(id => {
            if (!contactValidateField(id)) allValid = false;
        });
        if (!allValid) {
            showToast('Please fill in all required fields correctly.');
            return;
        }
        showToast('Message sent! We\'ll get back to you soon.');
        this.reset();
        fields.forEach(id => {
            const el = document.getElementById(id);
            if (el) { el.classList.remove('is-valid', 'is-invalid'); }
        });
    });
}

// ====================================================================
// NEWSLETTER
// ====================================================================

document.querySelectorAll('footer input[type="email"]').forEach(input => {
    const parent = input.parentElement;
    if (parent) {
        const btn = parent.querySelector('button');
        if (btn) {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                const val = input.value.trim();
                if (val) {
                    showToast('Subscribed! Check your inbox for 10% off.');
                    input.value = '';
                } else {
                    showToast('Please enter your email address.');
                }
            });
        }
    }
});

updateWishlistBadge();

// ====================================================================
// SANITIZATION — Only allow text + emojis, strip HTML/scripts
// ====================================================================

/**
 * Sanitize a string to ONLY allow visible text characters and emojis.
 * Strips ALL HTML tags, scripts, and dangerous content.
 * Preserves: letters, numbers, spaces, punctuation, and emojis 🎉🌿
 */
function sanitizeTextAndEmoji(str) {
    if (!str) return '';
    
    // 1. First, use DOMParser if available to safely strip HTML
    var textOnly = str;
    try {
        if (typeof DOMParser !== 'undefined') {
            var parser = new DOMParser();
            var doc = parser.parseFromString(str, 'text/html');
            textOnly = doc.body.textContent || '';
        } else {
            // Fallback: strip HTML tags with regex
            textOnly = str.replace(/<[^>]*>/g, '');
        }
    } catch(e) {
        textOnly = str.replace(/<[^>]*>/g, '');
    }
    
    // 2. Decode HTML entities back to readable text
    var decoded = textOnly;
    try {
        var txt = document.createElement('textarea');
        txt.innerHTML = textOnly;
        decoded = txt.value;
    } catch(e) {
        decoded = textOnly;
    }
    
    // 3. Block dangerous patterns like javascript:, data:, etc.
    decoded = decoded.replace(/(javascript|data|vbscript):/gi, 'blocked:');
    
    // 4. Trim whitespace
    decoded = decoded.trim();
    
    return decoded;
}

// ====================================================================
// PRODUCT REVIEWS & STAR RATINGS
// ====================================================================

const REVIEWS_KEY = 'leafReviews';
const HELPFUL_KEY = 'leafReviewHelpful';

/** Get reviews for a product */
window.getProductReviews = function(productName) {
    const allReviews = safeParse(safeGet(REVIEWS_KEY), []);
    return allReviews.filter(r => r.product === productName);
};

/** Get all reviews (for admin/history) */
window.getAllReviews = function() {
    return safeParse(safeGet(REVIEWS_KEY), []);
};

/** Get average rating for a product */
window.getAverageRating = function(productName) {
    const reviews = window.getProductReviews(productName);
    if (!reviews.length) return null;
    const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
    return { average: Math.round(avg * 10) / 10, count: reviews.length };
};

/** Submit a new review — sanitized to only allow text + emojis */
window.submitReview = function(productName, rating, comment, author, email, userId) {
    if (!productName || !rating) return false;
    
    // === SANITIZE: Strip HTML, keep only text + emojis ===
    var cleanComment = sanitizeTextAndEmoji(comment || '');
    var cleanAuthor = sanitizeTextAndEmoji(author || 'Anonymous');
    if (!cleanAuthor) cleanAuthor = 'Anonymous';
    // Limit length for safety
    if (cleanComment.length > 1000) cleanComment = cleanComment.substring(0, 1000);
    if (cleanAuthor.length > 50) cleanAuthor = cleanAuthor.substring(0, 50);
    
    var allReviews = safeParse(safeGet(REVIEWS_KEY), []);
    var review = {
        product: productName,
        rating: Math.min(5, Math.max(1, rating)),
        comment: cleanComment,
        author: cleanAuthor,
        email: email || null,
        date: new Date().toISOString(),
        id: 'rev_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)
    };
    
    // Include user_id from auth if available (for Supabase tracking)
    if (userId) {
        review.user_id = userId;
    }
    
    allReviews.push(review);
    safeSet(REVIEWS_KEY, JSON.stringify(allReviews));
    
    // Sync to Supabase (async, non-blocking)
    if (typeof window.saveReviewToCloud === 'function') {
        window.saveReviewToCloud(review);
    }
    
    return true;
};

/** Edit an existing review — sanitized to only allow text + emojis */
window.editReview = function(reviewId, newRating, newComment) {
    var allReviews = safeParse(safeGet(REVIEWS_KEY), []);
    var idx = allReviews.findIndex(function(r) { return r.id === reviewId; });
    if (idx === -1) return false;
    if (newRating) allReviews[idx].rating = Math.min(5, Math.max(1, newRating));
    
    // === SANITIZE: Strip HTML, keep only text + emojis ===
    var cleanComment = sanitizeTextAndEmoji(newComment || '');
    if (cleanComment.length > 1000) cleanComment = cleanComment.substring(0, 1000);
    allReviews[idx].comment = cleanComment;
    allReviews[idx].edited = new Date().toISOString();
    safeSet(REVIEWS_KEY, JSON.stringify(allReviews));
    
    // Sync the full updated review to Supabase (async, non-blocking)
    if (typeof window.saveReviewToCloud === 'function') {
        window.saveReviewToCloud(allReviews[idx]);
    }
    
    return true;
};

/** Delete a review */
window.deleteReview = function(reviewId) {
    var allReviews = safeParse(safeGet(REVIEWS_KEY), []);
    allReviews = allReviews.filter(function(r) { return r.id !== reviewId; });
    safeSet(REVIEWS_KEY, JSON.stringify(allReviews));
    
    // Sync to Supabase (async, non-blocking)
    if (typeof window.deleteReviewFromCloud === 'function') {
        window.deleteReviewFromCloud(reviewId);
    }
    
    return true;
};

/** Toggle helpful mark on a review */
window.toggleHelpful = function(reviewId) {
    const helpful = safeParse(safeGet(HELPFUL_KEY), {});
    const key = 'rev_' + reviewId;
    helpful[key] = !helpful[key];
    safeSet(HELPFUL_KEY, JSON.stringify(helpful));
    return helpful[key];
};

/** Get helpful count for a review */
window.getHelpfulCount = function(reviewId) {
    const helpful = safeParse(safeGet(HELPFUL_KEY), {});
    const key = 'rev_' + reviewId;
    return helpful[key] ? 1 : 0;
};

/** Color palette for star ratings — each position gets its own vibrant hue */
var STAR_COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e'];
var STAR_EMOJIS = ['😞', '😕', '😐', '😊', '🥰'];
var STAR_LABELS = ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

/** Render colorful star rating HTML with emoji support */
window.renderStars = function(rating, size = 16, showEmoji = false) {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    let html = '';
    
    // Full stars — each with its own color
    for (let i = 0; i < full; i++) {
        html += '<span class="material-symbols-outlined" style="font-size:' + size + 'px;font-variation-settings:\'FILL\' 1;color:' + STAR_COLORS[i] + '">star</span>';
    }
    // Half star — color of its position
    if (half) {
        html += '<span class="material-symbols-outlined" style="font-size:' + size + 'px;font-variation-settings:\'FILL\' 0.5;color:' + STAR_COLORS[full] + '">star_half</span>';
    }
    // Empty stars — light gray
    for (let i = 0; i < empty; i++) {
        html += '<span class="material-symbols-outlined" style="font-size:' + size + 'px;color:#d0d0d0">star</span>';
    }
    
    // Append emoji label if requested
    if (showEmoji && full > 0) {
        var emojiIdx = Math.min(full - 1, 4);
        html += ' <span style="font-size:' + (size + 4) + 'px;line-height:1;margin-left:4px;vertical-align:middle">' + STAR_EMOJIS[emojiIdx] + '</span>';
    }
    
    return html;
};

/** Get a star's color by its 1-based position */
window.getStarColor = function(position) {
    return STAR_COLORS[Math.min(position - 1, 4)] || '#d0d0d0';
};

/** Get emoji for a rating value (1-5) */
window.getStarEmoji = function(rating) {
    var idx = Math.min(Math.max(Math.round(rating) - 1, 0), 4);
    return STAR_EMOJIS[idx];
};

/** Get label for a rating value (1-5) */
window.getStarLabel = function(rating) {
    var idx = Math.min(Math.max(Math.round(rating) - 1, 0), 4);
    return STAR_LABELS[idx];
};

/** Display star rating on product cards */
window.syncReviewBadges = function() {
    document.querySelectorAll('.product-review-stars').forEach(el => {
        const name = el.dataset.productName;
        const data = window.getAverageRating(name);
        if (data && data.count > 0) {
            el.innerHTML = '<span class="text-warning" style="font-size:14px">' + window.renderStars(data.average) + '</span> <span class="text-label-xs text-on-surface-variant">(' + data.count + ')</span>';
        } else {
            el.innerHTML = '<span class="text-label-xs text-on-surface-variant">No reviews</span>';
        }
    });
};

// Auto-sync review badges on page load
window.syncReviewBadges();

// Inject toast keyframes if not present
if (!document.getElementById('toast-keyframes')) {
    const style = document.createElement('style');
    style.id = 'toast-keyframes';
    style.textContent = `@keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}@keyframes fadeOut{to{opacity:0;transform:translateY(-10px)}}@keyframes cartBounce{0%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}60%{transform:translateY(3px)}80%{transform:translateY(-2px)}}`;
    document.head.appendChild(style);
}

// ====================================================================
// PLANT CARE STREAK — gamified habit tracker
// ====================================================================

(function initCareStreak() {
    const STORAGE_KEY = 'leafCareStreak';
    
    const getStreak = () => {
        const data = safeParse(safeGet(STORAGE_KEY), { count: 0, lastDate: null });
        return data;
    };
    
    const saveStreak = (data) => {
        safeSet(STORAGE_KEY, JSON.stringify(data));
    };
    
    const checkAndUpdateStreak = () => {
        const data = getStreak();
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        
        if (data.lastDate === today) {
            return { streak: data.count, alreadyDone: true };
        }
        
        let newCount = 0;
        if (data.lastDate === yesterday) {
            newCount = data.count + 1;
        } else if (data.lastDate !== today) {
            newCount = 1;
        }
        
        saveStreak({ count: newCount, lastDate: today });
        return { streak: newCount, alreadyDone: false };
    };
    
    const showStreakMotivation = (streak) => {
        if (streak === 1) {
            showToast('🌱 Plant care streak started! Water your plant tomorrow to keep it going.');
        } else if (streak === 3) {
            showToast('🌟 3-day streak! Your plant is thriving!');
        } else if (streak === 5) {
            showToast('🔥 5-day streak! You\'re a plant care champion!');
        } else if (streak === 7) {
            showToast('🏆 7-day streak! Amazing dedication! Your plant loves you!');
        } else if (streak === 10) {
            showToast('💪 10-day streak! Master gardener in the making!');
        } else if (streak === 14) {
            showToast('👑 14-day streak! You\'ve earned the Plant Whisperer title!');
        } else if (streak === 21) {
            showToast('🌿 21-day streak! You\'ve formed a healthy habit!');
        } else if (streak === 30) {
            showToast('🎉 30-day streak! Legendary plant parent!');
        } else if (streak % 7 === 0) {
            showToast(`📅 ${streak}-day streak! Keep up the great care!`);
        }
    };
    
    window.waterPlant = function() {
        const result = checkAndUpdateStreak();
        if (result.alreadyDone) {
            showToast('💧 You already watered your plants today!');
        } else {
            showStreakMotivation(result.streak);
        }
        return result;
    };
    
    window.getCareStreak = function() {
        return getStreak();
    };
    
    const lastVisit = safeGet('leafLastVisit');
    const today = new Date().toDateString();
    if (lastVisit !== today) {
        safeSet('leafLastVisit', today);
        const tips = [
            '💡 Tip: Most plants prefer morning watering!',
            '💡 Tip: Wipe leaves gently to keep them dust-free!',
            '💡 Tip: Rotate your plant weekly for even growth!',
            '💡 Tip: Talk to your plants — they respond to vibrations!',
            '💡 Tip: Use room-temperature water for happier roots!',
            '💡 Tip: Check soil before watering — stick a finger in!',
            '💡 Tip: Group plants together for better humidity!'
        ];
        const tip = tips[Math.floor(Math.random() * tips.length)];
        setTimeout(() => showToast(tip), 3000);
    }
})();
