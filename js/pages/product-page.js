// ====================================================================
// PRODUCT DETAIL PAGE — Dynamic Product Loader & Review System
// ====================================================================
(function() {
    // Self-contained safe helpers
    function safeParse(val, fallback) {
        if (val === null || val === undefined) return fallback;
        try { return JSON.parse(val); } catch { return fallback; }
    }
    function safeGet(key, fallback) {
        try { var v = localStorage.getItem(key); return v !== null ? v : fallback; } catch { return fallback; }
    }
    function safeSet(key, val) {
        try { localStorage.setItem(key, val); return true; } catch { return false; }
    }
    // Product database
    const ALL_PRODUCTS = [
        { name: 'Snake Plant', price: 15, category: 'Indoor Plant', scientificName: 'Sansevieria trifasciata', image: '../assets/white_background_202607131940.jpeg', tags: 'air-purifying,low-light', badge: 'Bestseller', stock: 'in-stock', water: 'Every 2-3 weeks — drought tolerant', light: 'Low to bright indirect', temp: '15–30°C', petSafe: 'Toxic if ingested', fertilizer: 'Every 3 months', winterCare: 'Keep above 10�C; water every 4-6 weeks', survivalTime: 'Up to 4 weeks without water', description: 'The Snake Plant features tall, upright sword-shaped leaves with striking green and yellow variegated patterns that add architectural drama to any room. Famous for converting CO2 into oxygen at night, it is an ideal bedroom companion. This drought-tolerant beauty thrives on neglect and can survive low-light corners where most other plants struggle. One of the hardiest houseplants you can own, it is the ultimate low-maintenance air-purifying choice for modern homes, offices, and beginners who want greenery without the guilt.' },
        { name: 'Jade Plant', price: 25, category: 'Succulent', scientificName: 'Crassula ovata', image: '../assets/Jade_Plant_white_background_202607131940.jpeg', tags: 'succulent', badge: 'Popular', stock: 'in-stock', water: 'Every 2-3 weeks', light: 'Bright indirect to direct', temp: '18–30°C', petSafe: 'Toxic to pets', fertilizer: 'Every 3 months', winterCare: 'Keep above 5�C; water only when soil is bone dry', survivalTime: '3-4 weeks without water', description: 'The Jade Plant is a beloved succulent symbolizing good luck and prosperity, often called the Money Tree. Its thick, fleshy oval leaves grow on sturdy woody stems, developing a beautiful bonsai-like tree structure over time. Native to South Africa, it produces delicate star-shaped white or pink flowers in winter when given enough sunlight. Incredibly forgiving, it simply needs water when the soil dries completely and bright light. With proper care, a Jade Plant can live for decades, becoming a cherished living heirloom passed through generations.' },
        { name: 'Haworthia', price: 20, category: 'Succulent', scientificName: 'Haworthia fasciata', image: '../assets/Haworthia_white_background_202607131940.jpeg', tags: 'succulent,small', badge: 'Trending', stock: 'in-stock', water: 'Every 3 weeks', light: 'Bright indirect', temp: '18–27°C', petSafe: 'Non-toxic', fertilizer: 'Yearly', winterCare: 'Keep above 5�C; reduce watering to once a month', survivalTime: '4-6 weeks without water', description: 'Haworthia is a charming miniature succulent perfect for desks, shelves, and tiny spaces. Its distinctive rosette of pointed, fleshy leaves is covered in white pearly bumps and translucent stripes, giving it a striking zebra-like appearance. Unlike many succulents, it thrives in moderate indirect light rather than direct sun, making it one of the few succulents that genuinely does well indoors. Its slow growth means it stays compact for years, requiring minimal repotting and care — an ideal choice for adorable succulent arrangements or terrariums.' },
        { name: 'Spider Plant', price: 20, category: 'Indoor Plant', scientificName: 'Chlorophytum comosum', image: '../assets/Spider_Plant_white_background_202607131940.jpeg', tags: 'air-purifying,low-light', badge: 'Popular', stock: 'in-stock', water: 'Moderate — keep soil slightly moist', light: 'Bright indirect', temp: '18–32°C', petSafe: 'Non-toxic, pet-friendly!', fertilizer: 'Monthly in summer', winterCare: 'Keep above 10�C; mist occasionally in dry indoor air', survivalTime: '2 weeks without water', description: 'The Spider Plant is a classic favorite with cascading arching leaves and adorable baby spiderettes that dangle from long stems. Its vibrant green and white striped foliage creates a stunning waterfall effect perfect for hanging baskets and high shelves. Completely non-toxic to cats and dogs, it is one of the most pet-friendly houseplants available. Spider plants are champion air-purifiers that remove formaldehyde and xylene from indoor air. They are incredibly easy to propagate — simply pot the baby spiderettes to create new plants for friends and family.' },
        { name: 'Syngonium', price: 18, category: 'Indoor Plant', scientificName: 'Syngonium podophyllum', image: '../assets/Syngonium_white_background_202607131940.jpeg', tags: 'trailing,low-light', badge: 'Trending', stock: 'in-stock', water: 'When soil feels dry', light: 'Low to bright indirect', temp: '17–30°C', petSafe: 'Toxic if ingested', fertilizer: 'Monthly', winterCare: 'Keep above 15�C; avoid cold drafts', survivalTime: '1-2 weeks without water', description: 'Syngonium, also known as the Arrowhead Vine, is a fast-growing tropical beauty admired for its uniquely shaped leaves that transform as the plant matures — from arrow-shaped juvenile leaves to multi-lobed adult foliage. Its trailing climbing growth habit makes it incredibly versatile; train it up a moss pole for a vertical statement or let it cascade from a hanging basket. Syngoniums come in stunning pink, green, and cream color variations. They tolerate low light exceptionally well and signal thirst through drooping leaves, making care intuitive.' },
        { name: 'ZZ Plant', price: 35, category: 'Indoor Plant', scientificName: 'Zamioculcas zamiifolia', image: '../assets/ZZ_Plant_white_background_202607131940.jpeg', tags: 'low-light', badge: 'Bestseller', stock: 'in-stock', water: 'Every 2-3 weeks — drought tolerant', light: 'Low to bright indirect', temp: '18–30°C', petSafe: 'Toxic if ingested', fertilizer: 'Every 3 months', winterCare: 'Keep above 10�C; water every 4-6 weeks', survivalTime: 'Up to 5 weeks without water', description: 'The ZZ Plant is virtually indestructible, earning its reputation as the houseplant that refuses to die. Its glossy, dark green waxy leaves emerge from thick potato-like rhizomes that store water, allowing it to survive months of drought. This architectural beauty handles low light, fluorescent light, and complete neglect with equal grace. It grows slowly but steadily, eventually reaching 2-3 feet tall with a striking upright habit. Shiny leaves reflect light beautifully, adding sophistication to any space. The ultimate plant for black thumbs and busy professionals.' },
        { name: 'Peace Lily', price: 28, category: 'Indoor Plant', scientificName: 'Spathiphyllum wallisii', image: '../assets/Peace_Lily_white_background_202607131940.jpeg', tags: 'air-purifying,flowering', badge: 'Premium', stock: 'in-stock', water: 'Weekly — keep moist', light: 'Low to medium indirect', temp: '18–27°C', petSafe: 'Toxic to pets', fertilizer: 'Every 6 weeks', winterCare: 'Keep above 15�C; reduce watering; mist leaves', survivalTime: '7-10 days without water', description: 'The Peace Lily is an elegant flowering houseplant renowned for its graceful white spathes that bloom repeatedly throughout the year. Its lush, dark green foliage creates a tropical feel while pure white flowers add serenity to any room. According to NASA studies, it is one of the best air-purifying plants, effectively removing benzene and formaldehyde from indoor air. The Peace Lily communicates wonderfully — it droops dramatically when thirsty and perks up within hours after watering. It thrives in medium to low light, making it perfect for bedrooms and bathrooms.' },
        { name: 'Kalanchoe', price: 22, category: 'Succulent', scientificName: 'Kalanchoe blossfeldiana', image: '../assets/Kalanchoe_white_background_202607131940.jpeg', tags: 'succulent,flowering', badge: 'Popular', stock: 'in-stock', water: 'Every 2 weeks', light: 'Bright direct to indirect', temp: '18–32°C', petSafe: 'Toxic to pets', fertilizer: 'Monthly', winterCare: 'Keep above 7�C; water every 3-4 weeks', survivalTime: '3 weeks without water', description: 'Kalanchoe is a cheerful flowering succulent that rewards owners with months of vibrant blooms in shades of red, pink, orange, yellow, or white. Its thick, fleshy dark green leaves with scalloped edges form a compact rosette, creating a beautiful backdrop for clusters of tiny star-shaped flowers. Native to Madagascar, this sun-loving succulent is drought-tolerant and exceptionally easy to care for. Kalanchoes bloom best when given long winter nights, making them perfect indoor companions that brighten the darkest months with colorful floral displays.' },
        { name: 'Adenium', price: 35, category: 'Succulent', scientificName: 'Adenium obesum', image: '../assets/Adenium_white_background_202607131940.jpeg', tags: 'succulent,flowering', badge: 'Premium', stock: 'in-stock', water: 'Weekly in summer', light: 'Full sun', temp: '20–35°C', petSafe: 'Toxic if ingested', fertilizer: 'Monthly', winterCare: 'Keep above 10�C; nearly dry during winter dormancy', survivalTime: '4-6 weeks without water', description: 'The Desert Rose is a stunning succulent shrub with dramatic architectural impact. Its thick, swollen caudex base resembles an ancient bonsai trunk, while clusters of trumpet-shaped flowers in brilliant pink, red, or white create a spectacular tropical display. Native to arid regions of Africa and Arabia, this sun-worshipper thrives in hot, bright conditions and rewards with nearly year-round blooms. Surprisingly low-maintenance, it prefers to be root-bound and thrives on neglect. During winter it rests, bouncing back vigorously each spring with new growth and flowers.' },
        { name: 'Portulaca', price: 15, category: 'Succulent', scientificName: 'Portulaca grandiflora', image: '../assets/Portulaca_white_background_202607131940.jpeg', tags: 'succulent,flowering', badge: 'Bestseller', stock: 'in-stock', water: 'Every 2-3 days', light: 'Full sun', temp: '20–35°C', petSafe: 'Non-toxic', fertilizer: 'Monthly', winterCare: 'Annual � dies in frost; collect seeds for replanting', survivalTime: '5-7 days without water in summer', description: 'Portulaca, also known as Moss Rose, is a vibrant flowering succulent that brings a carpet of color to sunny spaces. Its succulent needle-like leaves store water efficiently, making it exceptionally drought-tolerant and perfect for hot Indian summers. The colorful cup-shaped flowers in neon shades of pink, orange, yellow, and red open in the morning sun and close at night, creating a dynamic daily display. It spreads beautifully in hanging baskets and borders, blooming prolifically from spring through fall. Self-seeds readily, returning year after year with minimal effort.' },
    ];

    const params = new URLSearchParams(window.location.search);
    const productName = params.get('name') || '';
    
    if (!productName) {
        var errorEl = document.getElementById('product-error');
        if (errorEl) errorEl.classList.remove('d-none');
        return;
    }

    var product = null;
    for (var pi = 0; pi < ALL_PRODUCTS.length; pi++) {
        if (ALL_PRODUCTS[pi].name.toLowerCase() === productName.toLowerCase()) {
            product = ALL_PRODUCTS[pi];
            break;
        }
    }
    
    if (!product) {
        var errorEl = document.getElementById('product-error');
        if (errorEl) errorEl.classList.remove('d-none');
        return;
    }

    var content = document.getElementById('product-content');
    if (content) content.classList.remove('d-none');

    document.title = product.name + ' — Ankuram';
    var metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.content = 'Buy ' + product.name + ' at Ankuram. ₹' + product.price + '. Free shipping. Nursery certified.';
    var metaOgTitle = document.querySelector('meta[property="og:title"]');
    if (metaOgTitle) metaOgTitle.content = product.name + ' — Ankuram';
    var metaOgImage = document.querySelector('meta[property="og:image"]');
    if (metaOgImage) metaOgImage.content = product.image;

    var errorEl = document.getElementById('product-error');
    if (errorEl) errorEl.classList.add('d-none');

    var breadcrumbProduct = document.getElementById('breadcrumb-product');
    if (breadcrumbProduct) breadcrumbProduct.textContent = product.name;
    
    const catMap = { 'Indoor Plant': 'indoor.html', 'Outdoor Plant': 'outdoor.html', 'Succulent': 'succulent.html', 'Sacred Plant': 'tulsi.html' };
    var catLink = document.getElementById('breadcrumb-category');
    if (catLink) {
        catLink.textContent = product.category;
        catLink.href = catMap[product.category] || 'shop.html';
    }

    function safeSetText(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; }

    safeSetText('product-name', product.name);
    safeSetText('product-category', product.category);
    safeSetText('product-price', '₹' + product.price.toFixed(2));
    
    var mainImg = document.getElementById('product-main-image');
    if (mainImg) {
        mainImg.src = product.image.replace('w=100&h=100', 'w=600&h=750').replace('w=60&h=60', 'w=600&h=750');
        mainImg.alt = product.name;
    }

    if (product.badge) {
        var badge = document.getElementById('product-badge');
        if (badge) { badge.textContent = product.badge; badge.classList.remove('d-none'); }
    }

    var stockIndicator = document.getElementById('product-stock-indicator');
    var stockText = document.getElementById('product-stock-text');
    if (stockIndicator && stockText) {
        if (product.stock === 'low-stock') {
            stockIndicator.className = 'stock-indicator stock-low-stock';
            stockText.textContent = product.stockText || 'Only few left';
        } else {
            stockIndicator.className = 'stock-indicator stock-in-stock';
            stockText.textContent = 'In Stock';
        }
    }

    if (product.water) safeSetText('product-water-needs', product.water.split(' — ')[0]);
    if (product.light) safeSetText('product-light-needs', product.light.split(' — ')[0]);
    if (product.temp) safeSetText('product-temp-range', product.temp);
    if (product.petSafe) safeSetText('product-pet-safe', product.petSafe.split(',')[0]);
    
    if (product.water) safeSetText('care-water', product.water);
    if (product.light) safeSetText('care-light', product.light);
    if (product.temp) safeSetText('care-temp', 'Keep between ' + product.temp + '.');
    if (product.fertilizer) safeSetText('care-fertilizer', product.fertilizer);
    if (product.winterCare) safeSetText('care-winter', product.winterCare);
    if (product.survivalTime) safeSetText('care-survival', product.survivalTime);

    if (product.description) safeSetText('product-description', product.description);
    if (product.scientificName) safeSetText('product-scientific-name', product.scientificName);

    var whatsappBtn = document.getElementById('product-whatsapp-btn');
    if (whatsappBtn) {
        var waMsg = encodeURIComponent("Hi! I'd like to order " + product.name + " - ₹" + product.price);
        whatsappBtn.href = "https://wa.me/916393394554?text=" + waMsg;
    }

    var wishlistBtn = document.getElementById('product-wishlist-btn');
    if (wishlistBtn) wishlistBtn.addEventListener('click', function() {
        // Prevent double-clicks
        if (this.dataset.loading === 'true') return;
        this.dataset.loading = 'true';
        this.classList.add('btn-loading');

        var icon = this.querySelector('.material-symbols-outlined');
        var wishlist = safeParse(safeGet('leafWishlist'), []);
        var idx = -1;
        for (var i = 0; i < wishlist.length; i++) { if (wishlist[i].name === product.name) { idx = i; break; } }
        var wishlistItem = { name: product.name, price: product.price, addedPrice: product.price, category: product.category, image: product.image.replace('w=600&h=750', 'w=100&h=100').replace('w=60&h=60', 'w=100&h=100') };
        if (idx > -1) { wishlist.splice(idx, 1); if (icon) icon.style.fontVariationSettings = "'FILL' 0"; showToast('Removed ' + product.name + ' from wishlist'); } else { wishlist.push(wishlistItem); if (typeof updateWishlistCount === 'function') updateWishlistCount(product.name, product.price); if (icon) { icon.style.fontVariationSettings = "'FILL' 1"; icon.style.color = '#D4A0A0'; } showToast('Added ' + product.name + ' to wishlist'); }
        safeSet('leafWishlist', JSON.stringify(wishlist));
        updateWishlistBadge();

        setTimeout(() => {
            this.dataset.loading = 'false';
            this.classList.remove('btn-loading');
        }, 400);
    });

    (function syncWishlist() {
        var wishlist = safeParse(safeGet('leafWishlist'), []);
        var wishlistIcon = document.querySelector('#product-wishlist-btn .material-symbols-outlined');
        if (wishlistIcon) {
            for (var wi = 0; wi < wishlist.length; wi++) {
                if (wishlist[wi].name === product.name) {
                    wishlistIcon.style.fontVariationSettings = "'FILL' 1";
                    wishlistIcon.style.color = '#D4A0A0';
                    break;
                }
            }
        }
    })();

    var related = [];
    for (var ri = 0; ri < ALL_PRODUCTS.length; ri++) {
        if (ALL_PRODUCTS[ri].category === product.category && ALL_PRODUCTS[ri].name !== product.name) {
            related.push(ALL_PRODUCTS[ri]);
            if (related.length >= 4) break;
        }
    }
    var relatedContainer = document.getElementById('related-products');
    if (related.length && relatedContainer) {
        var relatedHtml = '';
        for (var rj = 0; rj < related.length; rj++) {
            var p = related[rj];
            relatedHtml += '<div class="col"><a class="text-decoration-none" href="product.html?name=' + encodeURIComponent(p.name) + '"><div class="bg-white rounded-3 p-3 shadow-sm hover-lift border border-outline-variant/10 h-100 group"><div class="position-relative aspect-4-5 rounded-3 overflow-hidden bg-surface-container-low mb-3"><img class="w-100 h-100 object-fit-cover transition-standard group-hover-scale-105" src="' + p.image + '" alt="' + p.name + '" loading="lazy"/></div><h3 class="text-label-md mb-0 fw-normal text-on-surface">' + p.name + '</h3><span class="fw-bold text-primary">₹' + p.price.toFixed(2) + '</span></div></a></div>';
        }
        relatedContainer.innerHTML = relatedHtml;
    }

    var mainImage = document.getElementById('product-main-image');
    var lightboxOverlay = document.getElementById('lightbox-overlay');

    var imageContainer = document.getElementById('main-image-container');
    if (imageContainer && lightboxOverlay) {
        imageContainer.addEventListener('click', function() {
            var lightboxImg = lightboxOverlay.querySelector('img');
            if (lightboxImg && mainImage) lightboxImg.src = mainImage.src;
            lightboxOverlay.classList.add('active');
        });
    }
    if (lightboxOverlay) {
        var lightboxClose = lightboxOverlay.querySelector('.lightbox-close');
        if (lightboxClose) {
            lightboxClose.addEventListener('click', function() {
                lightboxOverlay.classList.remove('active');
            });
        }
        lightboxOverlay.addEventListener('click', function(e) {
            if (e.target === this) this.classList.remove('active');
        });
    }

})();
