// ====================================================================
// MOST WISHLISTED PAGE
// ====================================================================

(function () {
    const grid = document.getElementById('most-wishlisted-grid');
    const emptyState = document.getElementById('most-wishlisted-empty');
    const contentState = document.getElementById('most-wishlisted-content');
    const countEl = document.getElementById('most-wishlisted-count');
    const clearBtn = document.getElementById('most-wishlisted-clear');

    if (!grid) return;

    function safeParse(val, fallback) {
        if (val === null || val === undefined) return fallback;
        try { return JSON.parse(val); } catch { return fallback; }
    }
    function safeGet(key, fallback) {
        try { const v = localStorage.getItem(key); return v !== null ? v : fallback; }
        catch { return fallback; }
    }
    function safeSet(key, val) {
        try { localStorage.setItem(key, val); return true; } catch { return false; }
    }

    let counts = safeParse(safeGet('leafWishlistCounts'), {});

    function render() {
        const items = Object.values(counts)
            .filter(item => item.count > 0)
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        if (items.length === 0) {
            if (emptyState) emptyState.classList.remove('d-none');
            if (contentState) contentState.classList.add('d-none');
            return;
        }

        if (emptyState) emptyState.classList.add('d-none');
        if (contentState) contentState.classList.remove('d-none');
        if (countEl) countEl.textContent = `Top ${items.length} most wishlisted plants`;

        const productImages = {
            'Snake Plant': '../assets/white_background_202607131940.jpeg',
            'Jade Plant': '../assets/Jade_Plant_white_background_202607131940.jpeg',
            'Haworthia': '../assets/Haworthia_white_background_202607131940.jpeg',
            'Spider Plant': '../assets/Spider_Plant_white_background_202607131940.jpeg',
            'Syngonium': '../assets/Syngonium_white_background_202607131940.jpeg',
            'ZZ Plant': '../assets/ZZ_Plant_white_background_202607131940.jpeg',
            'Peace Lily': '../assets/Peace_Lily_white_background_202607131940.jpeg',
            'Kalanchoe': '../assets/Kalanchoe_white_background_202607131940.jpeg',
            'Adenium': '../assets/Adenium_white_background_202607131940.jpeg',
            'Portulaca': '../assets/Portulaca_white_background_202607131940.jpeg',
        };

        const productCategories = {
            'Snake Plant': 'Indoor Plant',
            'Jade Plant': 'Succulent',
            'Haworthia': 'Succulent',
            'Spider Plant': 'Indoor Plant',
            'Syngonium': 'Indoor Plant',
            'ZZ Plant': 'Indoor Plant',
            'Peace Lily': 'Indoor Plant',
            'Kalanchoe': 'Succulent',
            'Adenium': 'Succulent',
            'Portulaca': 'Succulent',
        };

        const medals = ['🥇', '🥈', '🥉'];

        grid.innerHTML = items.map((item, i) => {
            const img = productImages[item.name] || '../assets/white_background_202607131940.jpeg';
            const category = productCategories[item.name] || '';
            const medal = i < 3 ? `<span class="position-absolute top-0 start-0 bg-primary text-white text-label-sm px-2 py-1 rounded-end m-2" style="z-index:2;font-size:0.9rem">${medals[i]} #${i + 1}</span>` :
                `<span class="position-absolute top-0 start-0 bg-surface-container-high text-on-surface text-label-sm px-2 py-1 rounded-end m-2" style="z-index:2;font-size:0.75rem">#${i + 1}</span>`;
            const waMsg = encodeURIComponent("Hi! I'd like to order " + item.name + " - ₹" + (item.price || 0));
            return `<div class="col">
<div class="bg-white rounded-3 p-3 shadow-sm hover-lift border border-outline-variant/10 group">
<div class="position-relative aspect-4-5 rounded-3 overflow-hidden bg-surface-container-low mb-3">
<img class="w-100 h-100 object-fit-cover transition-standard group-hover-scale-105" src="${img}" alt="${item.name}" loading="lazy"/>
${medal}
<a class="position-absolute bottom-0 end-0 text-white p-3 rounded-5 border-0 transition-standard mb-2 me-2 text-decoration-none" href="https://wa.me/916393394554?text=${waMsg}" target="_blank" rel="noopener noreferrer" style="opacity:0;transform:translateY(1rem);background-color:#25D366">
<span class="material-symbols-outlined d-block">chat</span>
</a>
</div>
<div class="d-flex flex-column gap-1">
<div class="d-flex justify-content-between align-items-start">
<h3 class="text-label-md mb-0 fw-normal">${item.name}</h3>
<span class="fw-bold text-primary">₹${(item.price || 0).toFixed(0)}</span>
</div>
<div class="d-flex justify-content-between align-items-center">
<p class="text-label-sm text-on-surface-variant mb-0 opacity-70">${category}</p>
<span class="text-label-sm text-primary fw-bold">${item.count} ${item.count === 1 ? 'wishlist' : 'wishlists'}</span>
</div>
</div>
</div>
</div>`;
        }).join('');
    }

    render();

    if (clearBtn) {
        clearBtn.addEventListener('click', function () {
            counts = {};
            safeSet('leafWishlistCounts', JSON.stringify(counts));
            render();
            if (typeof showToast === 'function') showToast('Most wishlisted data cleared');
        });
    }

})();
