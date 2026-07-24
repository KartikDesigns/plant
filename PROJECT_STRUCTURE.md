# 🌿 Project Structure Documentation

## Organized Folder Hierarchy

```
plant-main/
├── index.html                    # Homepage (entry point)
├── DESIGN.md                     # Design system & brand guidelines
├── favicon.svg                   # Site favicon
│
├── pages/                        # HTML Pages
│   ├── 404.html                 # Error page
│   ├── about.html               # About page
│   ├── account-settings.html    # User account settings
│   ├── care-guide.html          # Plant care guide
│   ├── cart.html                # Shopping cart
│   ├── checkout.html            # Checkout page
│   ├── contact.html             # Contact page
│   ├── create-account.html      # Registration page
│   ├── indoor.html              # Indoor plants category
│   ├── orders.html              # Active orders
│   ├── outdoor.html             # Outdoor plants category
│   ├── privacy-policy.html      # Privacy policy
│   ├── product.html             # Product detail page
│   ├── quiz.html                # Plant quiz
│   ├── shop.html                # Shop/catalog page
│   ├── succulent.html           # Succulents category
│   ├── tulsi.html               # Tulsi products page
│   └── wishlist.html            # Wishlist page
│
├── styles/                       # CSS Stylesheets
│   ├── animations.css           # Animation definitions
│   ├── base.css                 # CSS variables, base styles
│   ├── components.css           # Reusable component styles
│   ├── navigation-desktop.css   # Desktop navigation styles
│   ├── navigation-mobile.css    # Mobile navigation styles
│   ├── navigation.min.css       # Minified navigation
│   ├── responsive.css           # Responsive breakpoints
│   ├── styles.css               # Global/misc styles
│   └── typography.css           # Font and text styles
│
├── js/                          # JavaScript Modules
│   ├── modules/                 # Core utilities & config
│   │   ├── script.js           # Main app logic, utilities
│   │   └── (see config/ below)
│   │
│   ├── pages/                   # Page-specific scripts
│   │   ├── account-settings-form.js  # Account form handling
│   │   ├── auth.js                   # Authentication logic
│   │   ├── cart.js                   # Cart management
│   │   ├── history-page.js           # Order history page
│   │   ├── orders-page.js            # Orders page
│   │   ├── product-page.js           # Product detail logic
│   │   ├── quiz-page.js              # Quiz page logic
│   │   └── tulsi-product.js          # Tulsi product specific
│   │
│   └── utils/                   # (Currently empty - for future utilities)
│
├── config/                      # Configuration & API Setup
│   ├── firebase-config.js       # Firebase configuration
│   ├── firestore-sync.js        # Firestore data sync logic
│   └── checkout-init.js         # Payment/checkout setup
│
└── assets/                      # (Currently empty - for future assets like images)

```

## File Organization Rules

### Pages
- All HTML files (except index.html) go in `pages/`
- index.html remains in root as the entry point
- Use relative paths: `../styles/`, `../js/`, `../config/`

### Styles
- All CSS files in `styles/` folder
- One CSS file per concern (typography, components, animations, etc.)
- Reference in HTML: `<link href="styles/base.css">`

### JavaScript
- **Core Logic** → `js/modules/` (shared utilities, main script)
- **Page-Specific** → `js/pages/` (cart, auth, product details, etc.)
- **Utilities** → `js/utils/` (for future refactoring)

### Configuration
- Firebase setup, Firestore sync, payment config in `config/`
- Sensitive keys should use environment variables (not hardcoded)

### Assets
- Future home for images, fonts, icons, etc.

## Import Path Examples

### From index.html (root level):
```html
<link href="styles/base.css" rel="stylesheet"/>
<script src="js/pages/cart.js"></script>
<script src="config/firebase-config.js"></script>
```

### From pages/* (one level down):
```html
<link href="../styles/base.css" rel="stylesheet"/>
<script src="../js/pages/cart.js"></script>
<script src="../config/firebase-config.js"></script>
```

## Benefits of This Structure

✅ **Scalability** - Easy to add new pages, styles, or scripts
✅ **Maintainability** - Clear file organization by type/purpose
✅ **Collaboration** - Team members know where to find things
✅ **Performance** - CSS files can be bundled/minified by folder
✅ **Debugging** - Easier to trace which files are used where
✅ **SEO** - Better cache busting with organized asset paths

## Next Steps

1. **Consider moving to build tool** (Webpack, Vite) for:
   - Automatic bundling
   - CSS/JS minification
   - Asset optimization
   - Environment variable management

2. **Create a build script** that:
   - Updates relative paths automatically
   - Minifies CSS/JS
   - Optimizes images
   - Generates source maps

3. **Implement CI/CD** to automate deployment

4. **Add package.json** for npm dependencies and scripts

## Migration Notes

- All file references updated from flat structure to organized hierarchy
- CSS references: `base.css` → `styles/base.css`
- JS references: `script.js` → `js/modules/script.js`
- Page-specific JS: `cart.js` → `js/pages/cart.js`
- Config files: `firebase-config.js` → `config/firebase-config.js`
