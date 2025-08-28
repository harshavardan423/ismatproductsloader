// ===============================
// UNIFIED ISMAT PRODUCTS & QUOTATION SYSTEM
// ===============================

// Initialize global quotation storage immediately
window.quotationItems = window.quotationItems || [];
window.cartItems = window.cartItems || [];

// ===============================
// CONSTANTS & CONFIGURATION
// ===============================

const BASE_URL = 'https://admin.ismatindia.com:7000';
const FALLBACK_IMG = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik0xMDAgNzBWMTMwTTcwIDEwMEgxMzAiIHN0cm9rZT0iI0NDQ0NDQyIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KPC9zdmc+';

// ===============================
// QUOTATION SYSTEM - DIRECT GLOBAL FUNCTIONS
// ===============================

// Function to get quotation items count
window.getQuotationItemsCount = function() {
    return window.quotationItems.reduce((total, item) => total + item.quantity, 0);
};

// Function to check if item is in quotation
window.isInQuotation = function(productId, variantId = null) {
    return window.quotationItems.some(item => 
        item.id === productId && 
        (item.selectedVariant?.name || null) === variantId
    );
};

// Function to get item quantity in quotation
window.getQuotationQuantity = function(productId, variantId = null) {
    const item = window.quotationItems.find(item => 
        item.id === productId && 
        (item.selectedVariant?.name || null) === variantId
    );
    return item ? item.quantity : 0;
};

// SAFE Function to update quotation button - NO AUTO WHATSAPP
window.updateQuotationButtonSafe = function() {
    console.log('Updating quotation button - count:', window.getQuotationItemsCount());
    
    const quotationButton = document.getElementById('quotation-cart-button');
    if (quotationButton) {
        const count = window.getQuotationItemsCount();
        
        // Remove existing badge
        const existingBadge = quotationButton.querySelector('.quotation-badge');
        if (existingBadge) {
            existingBadge.remove();
        }
        
        quotationButton.setAttribute('data-count', count);
        
        const quotationText = quotationButton.querySelector('.quotation-text');
        if (quotationText) {
            quotationText.textContent = count > 0 ? `Quotes (${count})` : 'Quotes';
        } else if (quotationButton.childNodes.length === 1 && quotationButton.childNodes[0].nodeType === 3) {
            quotationButton.textContent = count > 0 ? `Quotes (${count})` : 'Quotes';
        }
        
        if (count > 0) {
            const badge = document.createElement('span');
            badge.className = 'quotation-badge';
            badge.textContent = count;
            badge.style.cssText = `
                position: absolute; top: -8px; right: -8px; background: #28a745; color: white;
                border-radius: 50%; width: 20px; height: 20px; font-size: 12px; font-weight: bold;
                display: flex; align-items: center; justify-content: center; z-index: 10;
                animation: quotationBadgePulse 0.3s ease-out;
            `;
            
            const currentPosition = window.getComputedStyle(quotationButton).position;
            if (currentPosition === 'static') {
                quotationButton.style.position = 'relative';
            }
            
            quotationButton.appendChild(badge);
        }
    } else {
        console.log('Quotation button not found during update');
    }
};

// MAIN QUOTATION FUNCTION - DIRECT GLOBAL
window.addToQuotation = function(product) {
    console.log('ADD TO QUOTATION CALLED for:', product?.product_name);
    
    if (!product) {
        console.log('No product provided');
        return 0;
    }
    
    // Get selectedVariant from global scope if it exists
    const selectedVariant = window.selectedVariant || null;
    
    const existingItem = window.quotationItems.find(item => 
        item.id === product.id && 
        (item.selectedVariant?.name || null) === (selectedVariant?.name || null)
    );
    
    if (existingItem) {
        existingItem.quantity += 1;
        console.log('Updated existing quotation item, new quantity:', existingItem.quantity);
    } else {
        const price = product.offer_price || product.mrp || 0;
        const finalPrice = selectedVariant ? (selectedVariant.price || price) : price;
        
        const newItem = {
            id: product.id,
            name: product.product_name,
            price: parseFloat(finalPrice),
            image: window.getImageUrl ? window.getImageUrl(product.product_image_urls && product.product_image_urls[0]) : (product.product_image_urls && product.product_image_urls[0]),
            category: product.category,
            quantity: 1,
            selectedVariant: selectedVariant ? {
                name: selectedVariant.name,
                price: selectedVariant.price,
                sku: selectedVariant.sku || product.sku
            } : null
        };
        
        window.quotationItems.push(newItem);
        console.log('Added new item to quotation:', newItem.name);
    }
    
    // Update the button safely
    window.updateQuotationButtonSafe();
    
    // Update modal buttons if modal is open
    if (window.updateModalButtons) {
        window.updateModalButtons();
    }
    
    console.log('Total quotation items now:', window.getQuotationItemsCount());
    return existingItem ? existingItem.quantity : 1;
};

// Function to show quotation cart - DIRECT GLOBAL
window.showQuotationCart = function() {
    console.log('SHOW QUOTATION CART CALLED');
    console.log('Items in quotation:', window.quotationItems.length);
    
    const quotationCart = document.createElement('div');
    quotationCart.className = 'quotation-sidebar';
    
    const quotationItemsHTML = window.quotationItems.length > 0 ? 
        window.quotationItems.map(item => `
            <div class="quotation-item" data-product-id="${item.id}">
                <img src="${item.image || FALLBACK_IMG}" alt="${item.name}" class="quotation-item-image">
                <div class="quotation-item-details">
                    <h4>${item.name}</h4>
                    ${item.selectedVariant ? `<p class="variant-info">Variant: ${item.selectedVariant.name}</p>` : ''}
                    <div class="quantity-controls">
                        <button class="quantity-btn minus" data-product-id="${item.id}" ${item.quantity <= 1 ? 'disabled' : ''}>-</button>
                        <span class="quantity">${item.quantity}</span>
                        <button class="quantity-btn plus" data-product-id="${item.id}">+</button>
                        <button class="remove-item" data-product-id="${item.id}">Remove</button>
                    </div>
                </div>
            </div>
        `).join('') : 
        '<div class="empty-quotation">Your quotation list is empty</div>';

    quotationCart.innerHTML = `
        <div class="quotation-header">
            <h2>Quotation Cart (${window.getQuotationItemsCount()} items)</h2>
            <button class="close-quotation">&times;</button>
        </div>
        <div class="quotation-items">
            ${quotationItemsHTML}
        </div>
        <div class="quotation-footer">
            <button class="request-all-quotes" ${window.quotationItems.length === 0 ? 'disabled' : ''}>Request All Quotes via WhatsApp</button>
        </div>
    `;

    document.body.appendChild(quotationCart);

    // Add overlay
    const overlay = document.createElement('div');
    overlay.className = 'quotation-overlay';
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5);
        opacity: 0; visibility: hidden; transition: all 0.3s ease; z-index: 999;
    `;
    document.body.appendChild(overlay);

    // Show quotation cart and overlay
    setTimeout(() => {
        quotationCart.classList.add('active');
        overlay.style.opacity = '1';
        overlay.style.visibility = 'visible';
        document.body.style.overflow = 'hidden';
    }, 10);

    function updateQuotationDisplay() {
        const quotationItemsContainer = quotationCart.querySelector('.quotation-items');
        const requestButton = quotationCart.querySelector('.request-all-quotes');
        const quotationHeader = quotationCart.querySelector('.quotation-header h2');

        const quotationItemsHTML = window.quotationItems.length > 0 ? 
            window.quotationItems.map(item => `
                <div class="quotation-item" data-product-id="${item.id}">
                    <img src="${item.image || FALLBACK_IMG}" alt="${item.name}" class="quotation-item-image">
                    <div class="quotation-item-details">
                        <h4>${item.name}</h4>
                        ${item.selectedVariant ? `<p class="variant-info">Variant: ${item.selectedVariant.name}</p>` : ''}
                        <div class="quantity-controls">
                            <button class="quantity-btn minus" data-product-id="${item.id}" ${item.quantity <= 1 ? 'disabled' : ''}>-</button>
                            <span class="quantity">${item.quantity}</span>
                            <button class="quantity-btn plus" data-product-id="${item.id}">+</button>
                            <button class="remove-item" data-product-id="${item.id}">Remove</button>
                        </div>
                    </div>
                </div>
            `).join('') : 
            '<div class="empty-quotation">Your quotation list is empty</div>';

        quotationItemsContainer.innerHTML = quotationItemsHTML;
        quotationHeader.textContent = `Quotation Cart (${window.getQuotationItemsCount()} items)`;
        requestButton.disabled = window.quotationItems.length === 0;

        attachQuotationEventListeners();
        window.updateQuotationButtonSafe();
    }

    function attachQuotationEventListeners() {
        // Quantity increase
        quotationCart.querySelectorAll('.quantity-btn.plus').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const productId = parseInt(e.target.getAttribute('data-product-id'));
                const item = window.quotationItems.find(item => item.id === productId);
                if (item) {
                    item.quantity++;
                    updateQuotationDisplay();
                }
            });
        });

        // Quantity decrease
        quotationCart.querySelectorAll('.quantity-btn.minus').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const productId = parseInt(e.target.getAttribute('data-product-id'));
                const item = window.quotationItems.find(item => item.id === productId);
                if (item && item.quantity > 1) {
                    item.quantity--;
                    updateQuotationDisplay();
                }
            });
        });

        // Remove item
        quotationCart.querySelectorAll('.remove-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const productId = parseInt(e.target.getAttribute('data-product-id'));
                window.quotationItems = window.quotationItems.filter(item => item.id !== productId);
                updateQuotationDisplay();
                if (window.updateModalButtons) window.updateModalButtons();
            });
        });

        // Request all quotes button
        const requestBtn = quotationCart.querySelector('.request-all-quotes');
        if (requestBtn) {
            requestBtn.addEventListener('click', () => {
                window.requestAllQuotes();
            });
        }
    }

    attachQuotationEventListeners();

    const closeQuotationCart = () => {
        quotationCart.classList.remove('active');
        overlay.style.opacity = '0';
        overlay.style.visibility = 'hidden';
        document.body.style.overflow = 'auto';
        setTimeout(() => {
            if (document.body.contains(quotationCart)) document.body.removeChild(quotationCart);
            if (document.body.contains(overlay)) document.body.removeChild(overlay);
        }, 300);
    };

    quotationCart.querySelector('.close-quotation').addEventListener('click', closeQuotationCart);
    overlay.addEventListener('click', closeQuotationCart);
    
    const escapeHandler = (e) => {
        if (e.key === 'Escape') {
            closeQuotationCart();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);
    
    console.log('Quotation cart opened successfully');
};

// Function to request all quotes via WhatsApp
window.requestAllQuotes = function() {
    if (window.quotationItems.length === 0) {
        alert('Your quotation cart is empty');
        return;
    }

    const whatsappNumber = "917358223153";
    
    let message = "Hi, I would like to request quotes for the following products:\n\n";
    
    window.quotationItems.forEach((item, index) => {
        const variantText = item.selectedVariant ? ` (${item.selectedVariant.name})` : '';
        message += `${index + 1}. ${item.name}${variantText} - Quantity: ${item.quantity}\n`;
    });
    
    message += "\nPlease provide your best quotes for these items. Thank you!";
    
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    
    console.log('Opening WhatsApp because user clicked Request All Quotes');
    window.open(whatsappUrl, '_blank');
};

// ===============================
// MAIN PRODUCT SYSTEM IN CLOSURE
// ===============================

(function() {
    'use strict';

    // Global state
    window.isFilterSystemActive = false;
    
    Object.defineProperty(window, 'allProducts', {
        get: () => window._allProducts || [],
        set: (value) => window._allProducts = value
    });

    // State variables
    let currentPage = 1, totalPages = 1, currentFilteredPage = 1;
    let isLoading = false, isLoadingFiltered = false, isProcessingClick = false;
    let hasMoreProducts = true, hasMoreFilteredPages = false, isFilterOptionsLoaded = false;
    let currentModalProduct = null, selectedVariant = null, modalHistoryState = null, isModalOpen = false;
    
    let currentSearchQuery = '', allUniqueCategories = [], allUniqueBrands = [];
    let filterSidebar, filterOverlay;
    let currentFilters = { search: '', price: '', stock: [], brands: [], categories: [] };

    // Cached DOM elements
    const dom = {};
    
    function cacheElements() {
        const selectors = {
            productsGrid: '#products-grid',
            loadingIndicator: '#infinite-scroll-loading',
            endIndicator: '#end-of-products',
            searchInput: '#product-search-input',
            clearSearchBtn: '#clear-search-btn',
            modal: '#productModal'
        };
        
        Object.entries(selectors).forEach(([key, selector]) => {
            dom[key] = document.querySelector(selector);
        });
        
        filterSidebar = document.getElementById('filter-sidebar');
        filterOverlay = document.getElementById('filter-sidebar-overlay');
    }

    // ===============================
    // UTILITY FUNCTIONS
    // ===============================

    const getStockInfo = (stock) => {
        if (!stock || stock <= 0) return { status: 'out-of-stock', text: 'Out of Stock', class: 'out-of-stock' };
        if (stock <= 5) return { status: 'low-stock', text: `Low Stock (${stock} left)`, class: 'low-stock' };
        if (stock <= 20) return { status: 'in-stock', text: `In Stock (${stock} available)`, class: 'in-stock' };
        return { status: 'in-stock', text: 'In Stock', class: 'in-stock' };
    };

    const getImageUrl = (url) => {
        if (!url) return FALLBACK_IMG;
        if (url.startsWith('http')) return url;
        return BASE_URL + (url.startsWith('/') ? url : '/' + url);
    };

    const formatPrice = (price) => price && !isNaN(price) && price > 0 ? parseFloat(price).toFixed(2) : null;
    const getCurrencySymbol = () => '&#8377;';
    const isSimpleSpecification = (text) => /^\d+[\w]*$|^\d+\/\d+|^\d+\.\d+|mm$|cm$|V$|W$|A$|kg$|g$|^[A-Z]{2,4}\+?$|^T\d+$/i.test(text.trim());

    // Export getImageUrl globally
    window.getImageUrl = getImageUrl;

    // YouTube and PDF helpers
    const getYouTubeVideoId = (url) => {
        const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
        return url.match(regex)?.[1] || null;
    };

    const createYouTubeEmbed = (url, productName) => {
        const videoId = getYouTubeVideoId(url);
        if (!videoId) return `<a href="${url}" target="_blank" class="product-youtube-link">Watch Video</a>`;
        
        const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        return `
            <a href="${url}" target="_blank" class="product-youtube-link">
                <div class="youtube-video-container">
                    <img src="${thumbnailUrl}" alt="Video thumbnail" class="youtube-thumbnail">
                    <div class="youtube-play-overlay">
                        <div class="youtube-play-icon"></div>
                    </div>
                    <div class="youtube-video-title">${productName} - Watch Video</div>
                </div>
            </a>`;
    };

    const createYouTubeSearchUrl = (productName) => 
        `https://www.youtube.com/results?search_query=${encodeURIComponent(productName)}`;

    const getPdfUrl = (pdfUrl) => {
        if (!pdfUrl) return '';
        if (pdfUrl.startsWith('http')) return pdfUrl;
        return BASE_URL + (pdfUrl.startsWith('/') ? pdfUrl : '/' + pdfUrl);
    };

    // ===============================
    // CART MANAGEMENT
    // ===============================

    function addToCart(product) {
        if (!product || isProcessingClick) return 0;
        
        isProcessingClick = true;
        setTimeout(() => isProcessingClick = false, 500);
        
        const stockNumber = selectedVariant?.stock_number || product.stock_number;
        
        if (stockNumber <= 0) {
            alert('This item is currently out of stock.');
            return 0;
        }
        
        const existingItem = window.cartItems.find(item => 
            item.id === product.id && 
            (item.selectedVariant?.name || null) === (selectedVariant?.name || null)
        );
        
        if (existingItem) {
            if (existingItem.quantity >= Math.min(10, stockNumber)) {
                alert(`Maximum available quantity reached.`);
                return existingItem.quantity;
            }
            existingItem.quantity += 1;
        } else {
            const price = product.offer_price || product.mrp || 0;
            const finalPrice = selectedVariant?.price || price;
            
            const newItem = {
                id: product.id,
                name: product.product_name,
                price: parseFloat(finalPrice),
                image: getImageUrl(product.product_image_urls?.[0]),
                category: product.category,
                quantity: 1,
                selectedVariant: selectedVariant ? {
                    name: selectedVariant.name,
                    price: selectedVariant.price,
                    sku: selectedVariant.sku || product.sku,
                    stock_number: selectedVariant.stock_number
                } : null,
                stock_number: stockNumber
            };
            
            window.cartItems.push(newItem);
        }
        
        window.updateCartButton?.();
        return existingItem ? existingItem.quantity : 1;
    }

    const isInCart = (id, variant) => 
        window.cartItems.some(item => 
            item.id === id && (item.selectedVariant?.name || null) === variant
        );

    const getCartQuantity = (id, variant) => {
        const item = window.cartItems.find(item => 
            item.id === id && (item.selectedVariant?.name || null) === variant
        );
        return item?.quantity || 0;
    };

    // ===============================
    // PRODUCT CARD & DISPLAY
    // ===============================

    function createProductCard(product) {
        const cartQty = getCartQuantity(product.id);
        const quoteQty = window.getQuotationQuantity(product.id);
        const isAdded = cartQty > 0;
        const isQuoted = quoteQty > 0;
        
        const formattedOffer = formatPrice(product.offer_price);
        const formattedMrp = formatPrice(product.mrp);
        
        let priceDisplay = '';
        if (formattedOffer && formattedMrp && parseFloat(formattedOffer) < parseFloat(formattedMrp)) {
            const savingsPercent = (((formattedMrp - formattedOffer) / formattedMrp) * 100).toFixed(0);
            priceDisplay = `
                <span class="mrp-price">${getCurrencySymbol()}${formattedMrp}</span>
                <span class="offer-price">${getCurrencySymbol()}${formattedOffer}</span>
                <span class="savings">Save ${savingsPercent}%</span>`;
        } else {
            const displayPrice = formattedOffer || formattedMrp;
            priceDisplay = `<span class="current-price">${displayPrice ? getCurrencySymbol() + displayPrice : 'Price on Request'}</span>`;
        }
        
        const combinedStock = product.variants?.reduce((total, variant) => total + (variant.stock_number || 0), 0) || product.stock_number;
        const isOutOfStock = combinedStock <= 0;
        const hasStockForCart = combinedStock > 5;
        
        const variantIndicator = product.variants?.length > 0 ? 
            `<div style="font-size: 12px; color: #666; margin-bottom: 5px;">
                <i class="fas fa-layer-group"></i> ${product.variants.length} variants available
            </div>` : '';
        
        return `
            <div class="product-card ${isOutOfStock ? 'out-of-stock-card' : ''}" data-product-id="${product.id}">
                <div class="product-card-content" onclick="window.openProductModal(window.allProducts.find(p => p.id === ${product.id}))">
                    <img src="${getImageUrl(product.product_image_urls?.[0])}" 
                         class="product-image" 
                         alt="${product.product_name || 'Product'}"
                         onerror="this.src='${FALLBACK_IMG}'">
                    <h4 class="product-title">${product.product_name || 'Unnamed Product'}</h4>
                    ${variantIndicator}
                    <div class="price-container">${priceDisplay}</div>
                </div>
                <div class="action-buttons-wrapper">
                    <div class="action-buttons">
                        <button class="action-btn view-details-button" onclick="window.openProductModal(window.allProducts.find(p => p.id === ${product.id}))" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${hasStockForCart ? `
                            <button class="action-btn add-to-cart ${isAdded ? 'added' : ''}" 
                                    onclick="window.addToCart(window.allProducts.find(p => p.id === ${product.id}))"
                                    title="${isOutOfStock ? 'Out of Stock' : isAdded ? `In Cart (${cartQty})` : 'Add to Cart'}"
                                    ${isOutOfStock ? 'disabled' : ''}>
                                <i class="fas fa-${isOutOfStock ? 'times' : 'shopping-cart'}"></i>
                            </button>` : ''}
                        <button class="action-btn request-quote ${isQuoted ? 'quoted' : ''}" 
                                onclick="console.log('Quote button clicked'); window.addToQuotation(window.allProducts.find(p => p.id === ${product.id}))"
                                title="${isQuoted ? `Quoted (${quoteQty})` : 'Request Quote'}">
                            <i class="fab fa-whatsapp"></i>
                        </button>
                    </div>
                </div>
            </div>`;
    }

    function displayProducts(products, append = false) {
        if (!dom.productsGrid) return;
        
        if (dom.loadingIndicator) dom.loadingIndicator.style.display = 'none';
        if (dom.endIndicator) dom.endIndicator.style.display = 'none';
        
        if (products.length === 0) {
            const hasSearchQuery = currentSearchQuery?.trim();
            const message = hasSearchQuery ? 'No products found matching your search criteria.' : 'No products found matching your filters.';
            const clearButton = hasSearchQuery ? 
                '<button onclick="window.clearSearchInput()">Clear Search</button>' : 
                '<button onclick="window.clearAllFiltersFromSidebar()">Clear Filters</button>';
            
            dom.productsGrid.innerHTML = `
                <div class="no-results-message">
                    <i class="fas fa-search"></i>
                    <h3>No Results Found</h3>
                    <p>${message}</p>
                    ${clearButton}
                </div>`;
            return;
        }
        
        const productCards = products.map(createProductCard).join('');
        dom.productsGrid.innerHTML = append ? dom.productsGrid.innerHTML + productCards : productCards;
        
        if ((currentSearchQuery || hasActiveFilters()) && dom.endIndicator) {
            dom.endIndicator.style.display = 'block';
            dom.endIndicator.innerHTML = '<p>End of filtered results</p>';
        }
    }

    // ===============================
    // FILTER SYSTEM
    // ===============================

    const hasActiveFilters = () => Object.values(currentFilters).some(v => Array.isArray(v) ? v.length > 0 : v);
    const hasActiveNonSearchFilters = () => currentFilters.price || currentFilters.stock.length > 0 || 
        currentFilters.brands.length > 0 || currentFilters.categories.length > 0;

    function updateSearchIndicator() {
        const searchButton = document.querySelector('.searchbutton');
        if (!searchButton) return;
        
        const existingIndicator = searchButton.querySelector('.search-indicator');
        existingIndicator?.remove();
        
        const isSearchActive = dom.searchInput?.value.trim() || window.searchResults?.length >= 0 || hasActiveFilters();
        
        if (isSearchActive) {
            const indicator = document.createElement('span');
            indicator.className = 'search-indicator';
            indicator.style.cssText = `position: absolute; top: -7px; right: -4px; background: #007bff; 
                border: 2px solid white; border-radius: 50%; width: 12px; height: 12px; z-index: 10;`;
            searchButton.style.position = 'relative';
            searchButton.appendChild(indicator);
        }
    }

    function buildFilterParams(page = 1, perPage = 12) {
        const params = new URLSearchParams({ page: page.toString(), per_page: perPage.toString() });
        
        if (currentFilters.search) params.append('q', currentFilters.search);
        currentFilters.categories.forEach(cat => params.append('categories', cat));
        currentFilters.brands.forEach(brand => params.append('brands', brand));
        currentFilters.stock.forEach(stock => params.append('stock_status', stock));
        
        if (currentFilters.price) {
            const priceRanges = {
                'under-1000': { max_price: '999' },
                '1000-3000': { min_price: '1000', max_price: '3000' },
                '3000-5000': { min_price: '3000', max_price: '5000' },
                'above-5000': { min_price: '5001' }
            };
            Object.entries(priceRanges[currentFilters.price] || {}).forEach(([key, value]) => params.append(key, value));
        }
        
        return params;
    }

    function updateFilterState() {
        currentFilters = {
            search: currentSearchQuery,
            price: document.querySelector('input[name="price"]:checked')?.value || '',
            stock: Array.from(document.querySelectorAll('input[name="stock"]:checked')).map(cb => cb.value),
            brands: Array.from(document.querySelectorAll('.brand-option input:checked')).map(cb => cb.value),
            categories: Array.from(document.querySelectorAll('.category-option input:checked')).map(cb => cb.value)
        };
    }

    async function loadFilterOptions() {
        try {
            ['category-loading', 'brand-loading'].forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.style.display = 'block';
                    el.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
                }
            });

            let data;
            try {
                const response = await fetch(`${BASE_URL}/products/filter-options`);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                data = await response.json();
            } catch {
                data = await fallbackExtractFilters();
            }
            
            allUniqueCategories = data.categories || [];
            allUniqueBrands = data.brands || [];

            populateFilterOptions('category', allUniqueCategories);
            populateFilterOptions('brand', allUniqueBrands);
            
            isFilterOptionsLoaded = true;

        } catch (error) {
            console.error('Filter loading failed:', error);
        }
    }

    function populateFilterOptions(type, options) {
        const container = document.getElementById(`${type}-options-container`);
        const loading = document.getElementById(`${type}-loading`);
        
        if (!container) return;
        
        if (loading) loading.style.display = 'none';
        
        if (options.length > 0) {
            container.innerHTML = options.map(option => `
                <label class="${type}-option">
                    <input type="checkbox" value="${option}">
                    <span class="checkmark">${option}</span>
                </label>`).join('');
            container.style.display = 'flex';
            
            if (type === 'brand') {
                const searchContainer = document.getElementById('brand-search-container');
                if (searchContainer) searchContainer.style.display = 'block';
            }
        } else {
            container.innerHTML = `<div style="text-align: center; color: #666;">No ${type}s found</div>`;
        }
    }

    async function fallbackExtractFilters() {
        try {
            let allProducts = [];
            for (let page = 1; page <= 3; page++) {
                const response = await fetch(`${BASE_URL}/products?page=${page}&per_page=50`);
                if (!response.ok) break;
                const data = await response.json();
                allProducts = allProducts.concat(data.products || []);
                if (data.current_page >= data.total_pages) break;
            }
            
            const categories = new Set();
            const brands = new Set();
            
            allProducts.forEach(product => {
                if (product.category?.trim()) categories.add(product.category.trim());
                if (product.manufacturer?.trim() && !isSimpleSpecification(product.manufacturer.trim())) {
                    brands.add(product.manufacturer.trim());
                }
            });
            
            return {
                categories: Array.from(categories).sort(),
                brands: Array.from(brands).sort()
            };
        } catch {
            return {
                categories: ['Tools', 'Hardware', 'Electrical', 'Accessories'],
                brands: ['Bosch', 'Stanley', 'DeWalt', 'Makita']
            };
        }
    }

    async function performFilteredLoad(isSearch = false, append = false) {
        const targetPage = append ? (isSearch ? currentFilteredPage + 1 : currentPage + 1) : 1;
        
        try {
            const params = buildFilterParams(targetPage, 12);
            let response, endpoint;
            
            try {
                endpoint = `${BASE_URL}/products/filtered?${params.toString()}`;
                response = await fetch(endpoint);
            } catch {
                endpoint = currentFilters.search ? 
                    `${BASE_URL}/search?q=${encodeURIComponent(currentFilters.search)}&per_page=12` :
                    `${BASE_URL}/products?per_page=12`;
                response = await fetch(endpoint);
            }
            
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();
            const results = data.products || [];
            
            if (append) {
                const updated = [...window.allProducts, ...results];
                window.allProducts = updated;
                displayProducts(results, true);
            } else {
                window.allProducts = results;
                displayProducts(results);
            }
            
            if (isSearch) {
                currentFilteredPage = targetPage;
                hasMoreFilteredPages = data.has_next || false;
            } else {
                currentPage = targetPage;
                hasMoreProducts = data.has_next || false;
            }
            
            return results;
            
        } catch (error) {
            console.error('Filter load error:', error);
            return [];
        }
    }

    async function applyFilters() {
        updateFilterState();
        window.isFilterSystemActive = hasActiveFilters();
        
        if (!hasActiveFilters()) {
            window.searchResults = null;
            window.currentSearchQuery = '';
            window.onSearchClear?.();
            updateResultsDisplay(0, '', false, false);
            closeFilterSidebar();
            return;
        }
        
        updateResultsDisplay(0, currentFilters.search, hasActiveNonSearchFilters(), true);
        
        const results = await performFilteredLoad(true);
        
        if (currentFilters.search) {
            window.searchResults = results;
            window.currentSearchQuery = currentFilters.search;
            window.onSearchComplete?.(results, currentFilters.search);
        }
        
        updateResultsDisplay(results.length, currentFilters.search, hasActiveNonSearchFilters());
        closeFilterSidebar();
        updateSearchIndicator();
    }

    function updateResultsDisplay(count, query = '', isFiltered = false, isLoading = false, errorMessage = '') {
        const resultDisplay = document.querySelector('.results-count');
        if (!resultDisplay) return;

        let text = '';
        if (isLoading) text = query ? `Searching for "${query}"...` : 'Loading products...';
        else if (errorMessage) text = errorMessage;
        else if (query?.trim()) text = `Found ${count} results for "${query}"${isFiltered ? ' (filtered)' : ''}`;
        else if (isFiltered) text = `Found ${count} products (filtered)`;
        else text = `Showing ${count} products`;
        
        resultDisplay.textContent = text;
    }

    function closeFilterSidebar() {
        filterSidebar?.classList.remove('active');
        filterOverlay?.classList.remove('active');
        document.body.style.overflow = '';
    }

    // ===============================
    // MODAL FUNCTIONS
    // ===============================

    function selectVariant(variantData) {
        if (variantData.stock_number <= 0) return;
        
        selectedVariant = variantData;
        window.selectedVariant = selectedVariant; // Make globally accessible
        
        document.querySelectorAll('.variant-option').forEach(option => option.classList.remove('selected'));
        const selected = document.querySelector(`.variant-option[data-variant-id="${variantData.name.replace(/"/g, '\\"')}"]`);
        if (selected && !selected.classList.contains('out-of-stock')) {
            selected.classList.add('selected');
        }
        
        updateModalPrice();
        updateStockDisplay();
        updateModalButtons();
    }

    function updateModalPrice() {
        const elements = ['modalMrpPrice', 'modalOfferPrice', 'modalSavings'].map(id => document.getElementById(id));
        const [mrpEl, offerEl, savingsEl] = elements;
        if (!elements.every(el => el) || !currentModalProduct) return;
        
        const currentPrice = selectedVariant?.price || currentModalProduct.offer_price || currentModalProduct.mrp;
        const originalPrice = selectedVariant?.original_price || selectedVariant?.mrp || currentModalProduct.mrp;
        
        const formattedCurrent = formatPrice(currentPrice);
        const formattedOriginal = formatPrice(originalPrice);
        
        if (formattedOriginal && formattedCurrent && parseFloat(formattedCurrent) < parseFloat(formattedOriginal)) {
            mrpEl.innerHTML = `${getCurrencySymbol()}${formattedOriginal}`;
            mrpEl.style.display = 'inline';
            offerEl.innerHTML = `${getCurrencySymbol()}${formattedCurrent}`;
            const savings = parseFloat(formattedOriginal) - parseFloat(formattedCurrent);
            const percent = ((savings / parseFloat(formattedOriginal)) * 100).toFixed(0);
            savingsEl.innerHTML = `Save ${getCurrencySymbol()}${savings.toFixed(2)} (${percent}% off)`;
            savingsEl.style.display = 'block';
        } else {
            mrpEl.style.display = 'none';
            savingsEl.style.display = 'none';
            offerEl.innerHTML = formattedCurrent ? `${getCurrencySymbol()}${formattedCurrent}` : 'Price on Request';
        }
    }

    function updateStockDisplay() {
        const stockInfo = document.getElementById('stockInfo');
        const stockText = document.getElementById('stockText');
        if (!stockInfo || !stockText || !currentModalProduct) return;
        
        const stockNumber = selectedVariant?.stock_number || currentModalProduct.stock_number;
        const stock = getStockInfo(stockNumber);
        
        stockText.textContent = stock.text;
        stockInfo.className = `stock-info ${stock.class}`;
    }

    function updateModalButtons() {
        if (!currentModalProduct) return;
        
        const variantId = selectedVariant?.name || null;
        
        // Update cart button
        const cartBtn = document.getElementById('modalAddToCart');
        if (cartBtn) {
            const isAdded = isInCart(currentModalProduct.id, variantId);
            const quantity = getCartQuantity(currentModalProduct.id, variantId);
            const stockNumber = selectedVariant?.stock_number || currentModalProduct.stock_number;
            const hasStock = stockNumber > 5;
            
            if (stockNumber <= 0 || !hasStock) {
                cartBtn.style.display = 'none';
            } else {
                cartBtn.style.display = 'inline-block';
                cartBtn.disabled = false;
                cartBtn.textContent = isAdded ? `IN CART (${quantity})` : 'ADD TO CART';
                cartBtn.className = isAdded ? 'added' : '';
            }
        }
        
        // Update quote button - create if doesn't exist
        let quoteBtn = document.getElementById('modalRequestQuote');
        if (!quoteBtn) {
            const modalActions = document.querySelector('.product-modal-actions');
            if (modalActions) {
                quoteBtn = document.createElement('button');
                quoteBtn.id = 'modalRequestQuote';
                quoteBtn.className = 'product-modal-request-quote';
                modalActions.appendChild(quoteBtn);
            }
        }
        
        if (quoteBtn) {
            const isQuoted = window.isInQuotation(currentModalProduct.id, variantId);
            const quantity = window.getQuotationQuantity(currentModalProduct.id, variantId);
            
            quoteBtn.className = isQuoted ? 'product-modal-request-quote quoted' : 'product-modal-request-quote';
            quoteBtn.innerHTML = `<i class="fab fa-whatsapp"></i> ${isQuoted ? `QUOTED (${quantity})` : 'REQUEST QUOTE'}`;
            
            // Remove old listeners and add new one
            quoteBtn.onclick = function() {
                console.log('Modal quote button clicked');
                window.addToQuotation(currentModalProduct);
                updateModalButtons();
            };
        }
    }

    function openProductModal(product) {
        currentModalProduct = product;
        selectedVariant = null;
        window.selectedVariant = null;
        
        if (!dom.modal) return;
        
        modalHistoryState = { modal: true, timestamp: Date.now() };
        history.pushState(modalHistoryState, '', window.location.href);
        isModalOpen = true;
        
        // Update modal content
        const elements = {
            title: document.getElementById('modalTitle'),
            image: document.getElementById('modalImage'),
            gallery: document.getElementById('imageGallery'),
            productTitle: document.getElementById('modalProductTitle')
        };
        
        if (elements.title) elements.title.textContent = 'Product Details';
        if (elements.productTitle) elements.productTitle.textContent = product.product_name || 'Unnamed Product';
        
        // Handle images
        const images = product.product_image_urls || [];
        if (elements.image) {
            elements.image.src = getImageUrl(images[0]);
            elements.image.alt = product.product_name || 'Product image';
        }
        
        if (elements.gallery) {
            if (images.length > 1) {
                elements.gallery.innerHTML = images.map((img, i) => 
                    `<img src="${getImageUrl(img)}" class="gallery-thumbnail ${i === 0 ? 'active' : ''}" 
                          onclick="window.changeMainImage('${img}', this)">`).join('');
                elements.gallery.style.display = 'flex';
            } else {
                elements.gallery.style.display = 'none';
            }
        }

        // Handle all the modal content sections (description, video, PDF, variants)
        handleModalContent(product);
        
        updateModalPrice();
        updateStockDisplay();
        updateModalButtons();
        
        dom.modal.style.display = 'block';
        dom.modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    function handleModalContent(product) {
        // Handle product descriptions
        let descriptionContainer = document.getElementById('modalDescription') || 
                                 document.getElementById('product-modal-description') ||
                                 document.querySelector('.product-modal-description') ||
                                 document.querySelector('.modal-description') ||
                                 document.querySelector('#productModal .description');
        
        if (!descriptionContainer) {
            const modalContent = document.querySelector('.product-modal-content');
            if (modalContent) {
                descriptionContainer = document.createElement('div');
                descriptionContainer.id = 'modalDescription';
                descriptionContainer.className = 'product-modal-description';
                
                const productTitle = document.getElementById('modalProductTitle');
                if (productTitle) {
                    productTitle.parentNode.insertBefore(descriptionContainer, productTitle.nextSibling);
                } else {
                    modalContent.appendChild(descriptionContainer);
                }
            }
        }
        
        if (descriptionContainer) {
            let descContent = '';
            
            if (product.short_description?.trim()) {
                descContent += `<div class="short-description">
                    <h4>Description</h4>
                    <p>${product.short_description}</p>
                </div>`;
            }
            
            if (product.long_description?.trim() && product.long_description !== product.short_description) {
                descContent += `<div class="long-description">
                    <h4>Detailed Description</h4>
                    <div>${product.long_description}</div>
                </div>`;
            }
            
            const basicInfo = [];
            if (product.sku) basicInfo.push(`<span><strong>SKU:</strong> ${product.sku}</span>`);
            if (product.manufacturer) basicInfo.push(`<span><strong>Manufacturer:</strong> ${product.manufacturer}</span>`);
            if (product.category) basicInfo.push(`<span><strong>Category:</strong> ${product.category}</span>`);
            
            if (basicInfo.length > 0) {
                descContent += `<div class="basic-product-info">
                    <h4>Product Information</h4>
                    <div class="info-grid">${basicInfo.join('')}</div>
                </div>`;
            }
            
            if (product.technical_information?.trim()) {
                const techInfo = product.technical_information.replace(/\\n/g, '\n');
                
                if (techInfo.includes('|')) {
                    const lines = techInfo.split('\n').filter(line => line.trim());
                    if (lines.length > 2) {
                        let tableHTML = '<div class="technical-specifications"><h4>Technical Specifications</h4><table class="specs-table">';
                        
                        lines.forEach((line, index) => {
                            if (index === 1 && line.includes('---')) return;
                            
                            const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell);
                            if (cells.length >= 2) {
                                if (index === 0) {
                                    tableHTML += '<thead><tr>';
                                    cells.forEach(cell => tableHTML += `<th>${cell}</th>`);
                                    tableHTML += '</tr></thead><tbody>';
                                } else {
                                    tableHTML += '<tr>';
                                    cells.forEach(cell => {
                                        const processedCell = cell.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
                                        tableHTML += `<td>${processedCell}</td>`;
                                    });
                                    tableHTML += '</tr>';
                                }
                            }
                        });
                        
                        tableHTML += '</tbody></table></div>';
                        descContent += tableHTML;
                    }
                } else {
                    descContent += `<div class="technical-specifications">
                        <h4>Technical Information</h4>
                        <div class="tech-info-text">${techInfo}</div>
                    </div>`;
                }
            }
            
            if (product.special_note?.trim()) {
                descContent += `<div class="special-note">
                    <h4>Important Notes</h4>
                    <div class="note-content">
                        <i class="fas fa-info-circle"></i> ${product.special_note}
                    </div>
                </div>`;
            }
            
            const dimensions = [];
            if (product.length) dimensions.push(`Length: ${product.length}${product.dimension_unit || 'mm'}`);
            if (product.width) dimensions.push(`Width: ${product.width}${product.dimension_unit || 'mm'}`);
            if (product.height) dimensions.push(`Height: ${product.height}${product.dimension_unit || 'mm'}`);
            
            if (dimensions.length > 0) {
                descContent += `<div class="product-dimensions">
                    <h4>Dimensions</h4>
                    <div class="dimensions-info">${dimensions.join(' × ')}</div>
                </div>`;
            }
            
            if (descContent.trim()) {
                descriptionContainer.innerHTML = descContent;
            } else {
                descriptionContainer.innerHTML = `
                    <div class="minimal-info">
                        <h4>Product Details</h4>
                        <p>${product.product_name || 'Product details not available'}</p>
                    </div>`;
            }
            descriptionContainer.style.display = 'block';
        }

        // Handle video links
        const videoContainer = document.getElementById('modalVideoContainer');
        if (videoContainer) {
            let videoContent = '';
            
            if (product.youtube_links?.length > 0) {
                videoContent = `<div class="video-section">
                    <h4>Product Videos</h4>
                    ${product.youtube_links.map(url => createYouTubeEmbed(url, product.product_name)).join('')}
                </div>`;
            } else if (product.video_url?.trim()) {
                videoContent = `<div class="video-section">
                    <h4>Product Video</h4>
                    ${createYouTubeEmbed(product.video_url, product.product_name)}
                </div>`;
            } else {
                const searchUrl = createYouTubeSearchUrl(product.product_name);
                videoContent = `<div class="video-section">
                    <h4>Related Videos</h4>
                    <a href="${searchUrl}" target="_blank" class="youtube-search-link">
                        <i class="fab fa-youtube"></i> Search "${product.product_name}" on YouTube
                    </a>
                </div>`;
            }
            
            videoContainer.innerHTML = videoContent;
            videoContainer.style.display = 'block';
        }

        // Handle PDF downloads
        const pdfContainer = document.getElementById('modalPdfContainer');
        if (pdfContainer) {
            let pdfContent = '';
            
            if (product.download_pdfs?.length > 0) {
                pdfContent = `<div class="pdf-section">
                    <h4>Downloads</h4>
                    ${product.download_pdfs.map((pdfUrl, index) => {
                        const fullPdfUrl = getPdfUrl(pdfUrl);
                        return `<a href="${fullPdfUrl}" target="_blank" class="pdf-download-link">
                            <i class="fas fa-file-pdf"></i> Download Manual ${index > 0 ? (index + 1) : ''}
                        </a>`;
                    }).join('')}
                </div>`;
            } else if (product.pdf_url?.trim()) {
                const pdfUrl = getPdfUrl(product.pdf_url);
                pdfContent = `<div class="pdf-section">
                    <h4>Downloads</h4>
                    <a href="${pdfUrl}" target="_blank" class="pdf-download-link">
                        <i class="fas fa-file-pdf"></i> View Product Manual
                    </a>
                </div>`;
            }
            
            if (pdfContent) {
                pdfContainer.innerHTML = pdfContent;
                pdfContainer.style.display = 'block';
            } else {
                pdfContainer.style.display = 'none';
            }
        }

        // Handle variants
        const variantsSection = document.getElementById('variantsSection');
        const variantsList = document.getElementById('variantsList');
        
        if (variantsSection && variantsList && product.variants?.length > 0) {
            variantsSection.style.display = 'block';
            variantsList.innerHTML = product.variants.map(variant => {
                const stockInfo = getStockInfo(variant.stock_number);
                const isOutOfStock = variant.stock_number <= 0;
                const formattedPrice = formatPrice(variant.price);
                
                return `<div class="variant-option ${isOutOfStock ? 'out-of-stock' : ''}" 
                    data-variant-id="${variant.name.replace(/"/g, '&quot;')}"
                    onclick="${isOutOfStock ? '' : `window.selectVariant(${JSON.stringify(variant).replace(/"/g, '&quot;')})`}">
                    <div class="variant-name">${variant.name}</div>
                    ${formattedPrice ? `<div class="variant-price">${getCurrencySymbol()}${formattedPrice}</div>` : ''}
                    <div class="variant-stock ${stockInfo.class}"><i class="fas fa-box"></i> ${stockInfo.text}</div>
                </div>`;
            }).join('');
            
            const firstAvailable = product.variants.find(v => v.stock_number > 0);
            if (firstAvailable) selectVariant(firstAvailable);
        } else if (variantsSection) {
            variantsSection.style.display = 'none';
        }
    }

    function closeProductModal() {
        if (dom.modal) {
            dom.modal.style.display = 'none';
            dom.modal.classList.remove('show');
        }
        
        document.body.style.overflow = 'auto';
        isModalOpen = false;
        currentModalProduct = null;
        selectedVariant = null;
        window.selectedVariant = null;
        modalHistoryState = null;
        
        updateModalButtons();
    }

    // ===============================
    // PRODUCT LOADING
    // ===============================

    async function loadProducts(page = 1, append = false, isSearchMode = false) {
        if (isLoading && !isSearchMode) return;
        if (isSearchMode && window.searchResults) {
            displayProducts(window.searchResults);
            window.allProducts = window.searchResults;
            return;
        }
        
        isLoading = true;
        
        if (page === 1 && !append) {
            if (dom.productsGrid) dom.productsGrid.innerHTML = '<div class="loading">Loading products...</div>';
            if (dom.endIndicator) dom.endIndicator.style.display = 'none';
        } else if (append && hasMoreProducts && dom.loadingIndicator) {
            dom.loadingIndicator.style.display = 'block';
        }
        
        try {
            const response = await fetch(`${BASE_URL}/products?page=${page}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();
            if (!Array.isArray(data.products)) throw new Error('Invalid response format');
            
            const { products, current_page, total_pages } = data;
            currentPage = current_page || 1;
            totalPages = total_pages || 1;
            hasMoreProducts = currentPage < totalPages;
            
            if (page === 1 && products.length === 0) {
                if (dom.productsGrid) dom.productsGrid.innerHTML = '<div class="no-products">No products available.</div>';
                return;
            }
            
            if (append) {
                window.allProducts = [...window.allProducts, ...products];
                displayProducts(products, true);
            } else {
                window.allProducts = products;
                displayProducts(products);
            }
            
            if (dom.loadingIndicator) dom.loadingIndicator.style.display = 'none';
            if (!hasMoreProducts && dom.endIndicator) dom.endIndicator.style.display = 'block';
            
        } catch (error) {
            console.error('Error loading products:', error);
            const errorMsg = `<div class="error">Failed to load products. <button onclick="window.loadProducts(${page}, ${append})">Retry</button></div>`;
            if (dom.productsGrid) {
                dom.productsGrid.innerHTML = append ? dom.productsGrid.innerHTML + errorMsg : errorMsg;
            }
        } finally {
            isLoading = false;
        }
    }

    // ===============================
    // EVENT HANDLING & INITIALIZATION
    // ===============================

    function setupEventListeners() {
        // Filter events
        document.getElementById('product-filter-search')?.addEventListener('click', () => {
            filterSidebar?.classList.add('active');
            filterOverlay?.classList.add('active');
            document.body.style.overflow = 'hidden';
            if (!isFilterOptionsLoaded) loadFilterOptions();
        });

        document.getElementById('close-filter-sidebar')?.addEventListener('click', closeFilterSidebar);
        filterOverlay?.addEventListener('click', closeFilterSidebar);

        // Search events
        const searchBtn = document.getElementById('search-products-btn');
        if (dom.searchInput && searchBtn) {
            const performSearch = () => {
                currentSearchQuery = dom.searchInput.value.trim();
                applyFilters();
            };
            
            searchBtn.addEventListener('click', performSearch);
            dom.searchInput.addEventListener('keypress', (e) => e.key === 'Enter' && performSearch());
            dom.searchInput.addEventListener('input', (e) => {
                const hasValue = e.target.value.trim().length > 0;
                if (dom.clearSearchBtn) dom.clearSearchBtn.style.display = hasValue ? 'flex' : 'none';
                setTimeout(updateSearchIndicator, 100);
            });
        }

        dom.clearSearchBtn?.addEventListener('click', () => {
            if (dom.searchInput) dom.searchInput.value = '';
            if (dom.clearSearchBtn) dom.clearSearchBtn.style.display = 'none';
            currentSearchQuery = '';
            updateFilterState();
            updateSearchIndicator();
        });

        // Filter form events
        document.getElementById('apply-filters-btn')?.addEventListener('click', applyFilters);
        document.getElementById('clear-filters-btn')?.addEventListener('click', () => {
            document.querySelectorAll('input[name="price"], input[name="stock"], .brand-option input, .category-option input')
                .forEach(input => input.checked = false);
            currentFilters = { search: '', price: '', stock: [], brands: [], categories: [] };
            window.isFilterSystemActive = false;
            window.searchResults = null;
            window.onSearchClear?.();
            closeFilterSidebar();
            updateSearchIndicator();
        });

        // Modal events
        document.getElementById('modalAddToCart')?.addEventListener('click', () => {
            if (currentModalProduct && !isProcessingClick) {
                addToCart(currentModalProduct);
                updateModalButtons();
            }
        });

        document.getElementById('closeModalBtn')?.addEventListener('click', closeProductModal);
        
        // History and keyboard events
        window.addEventListener('popstate', (e) => {
            if (isModalOpen) {
                e.preventDefault();
                closeProductModal();
                history.pushState(null, '', window.location.href);
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (isModalOpen) closeProductModal();
                else if (filterSidebar?.classList.contains('active')) closeFilterSidebar();
            }
        });

        // Filter change events
        document.addEventListener('change', (e) => {
            if (e.target.matches('input[name="price"], input[name="stock"], .brand-option input, .category-option input')) {
                updateFilterState();
                setTimeout(updateSearchIndicator, 100);
            }
        });
    }

    function setupInfiniteScroll() {
        let ticking = false;
        
        const checkScroll = () => {
            if (window.searchResults || hasActiveFilters()) {
                ticking = false;
                return;
            }
            
            const { pageYOffset, innerHeight } = window;
            const { scrollHeight } = document.documentElement;
            
            if (pageYOffset + innerHeight >= scrollHeight - 200 && hasMoreProducts && !isLoading) {
                loadProducts(currentPage + 1, true);
            }
            ticking = false;
        };
        
        const onScroll = () => {
            if (!ticking) {
                requestAnimationFrame(checkScroll);
                ticking = true;
            }
        };
        
        window.addEventListener('scroll', onScroll, { passive: true });
    }

    // Export essential functions globally
    Object.assign(window, {
        openFilterSidebar: () => applyFilters(),
        closeFilterSidebar,
        updateSearchIndicator,
        loadMoreProducts: () => loadProducts(currentPage + 1, true),
        openProductModal,
        closeProductModal,
        loadProducts,
        selectVariant,
        changeMainImage: (url, thumb) => {
            const mainImg = document.getElementById('modalImage');
            if (mainImg) {
                mainImg.src = getImageUrl(url);
                document.querySelectorAll('.gallery-thumbnail').forEach(t => t.classList.remove('active'));
                thumb?.classList.add('active');
            }
        },
        displayProductsInGrid: displayProducts,
        appendProductsToGrid: (products) => displayProducts(products, true),
        addToCart,
        isInCart,
        getCartQuantity,
        updateModalCartButton: updateModalButtons,
        updateModalQuoteButton: updateModalButtons,
        updateQuotationButton: window.updateQuotationButtonSafe,
        createProductCard,
        clearSearchInput: () => {
            if (dom.searchInput) dom.searchInput.value = '';
            if (dom.clearSearchBtn) dom.clearSearchBtn.style.display = 'none';
            currentSearchQuery = '';
            updateFilterState();
            updateSearchIndicator();
        },
        clearAllFiltersFromSidebar: applyFilters,
        refreshProductDisplay: updateModalButtons,
        refreshQuoteDisplay: updateModalButtons,
        updateModalButtons
    });

    // Search integration
    window.onSearchComplete = (results, query) => {
        window.isFilterSystemActive = true;
        window.allProducts = results;
        window.currentSearchQuery = query;
        window.searchResults = results;
    };

    window.onSearchClear = () => {
        window.isFilterSystemActive = false;
        window.currentSearchQuery = '';
        window.searchResults = null;
        loadProducts(1, false, false);
    };

    // Initialize
    function init() {
        cacheElements();
        setupEventListeners();
        setupInfiniteScroll();
        
        // Restore saved state
        try {
            const saved = localStorage.getItem('cartItems');
            if (saved) window.cartItems = JSON.parse(saved);
            const savedQuote = localStorage.getItem('quotationItems');
            if (savedQuote) window.quotationItems = JSON.parse(savedQuote);
        } catch (e) {}
        
        loadProducts(1, false);
        setTimeout(updateSearchIndicator, 500);
        
        console.log('Main product system loaded');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 100);
    }

})();

// ===============================
// QUOTATION SYSTEM INITIALIZATION (OUTSIDE CLOSURE)
// ===============================

function initializeQuotationSystem() {
    console.log('Initializing quotation system...');
    
    // Update quotation button immediately
    window.updateQuotationButtonSafe();
    
    // Try to attach quotation button listener with retries
    function attachQuotationButton() {
        const quotationButton = document.getElementById('quotation-cart-button');
        
        if (quotationButton && !quotationButton.hasAttribute('data-quotation-attached')) {
            console.log('Found quotation button, attaching listener');
            quotationButton.setAttribute('data-quotation-attached', 'true');
            
            quotationButton.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Quotation cart button clicked - opening sidebar');
                window.showQuotationCart();
            });
            
            console.log('✅ Quotation button listener attached successfully');
            return true;
        } else if (quotationButton) {
            console.log('Quotation button already has listener');
            return true;
        } else {
            console.log('Quotation button not found yet');
            return false;
        }
    }
    
    // Try multiple times
    if (!attachQuotationButton()) {
        setTimeout(() => attachQuotationButton(), 500);
        setTimeout(() => attachQuotationButton(), 1000);
        setTimeout(() => attachQuotationButton(), 2000);
    }
}

// Add all the styles
function addQuotationStyles() {
    if (!document.getElementById('unified-styles')) {
        const style = document.createElement('style');
        style.id = 'unified-styles';
        style.textContent = `
            /* Core Product & Cart Styles */
            .cart-actions-container { display: flex; gap: 8px; margin-top: 10px; align-items: stretch; }
            .cart-actions-container.quote-only { justify-content: center; }
            .cart-actions-container.quote-only .request-quote { flex: 1; }
            @media (max-width: 768px) { .cart-actions-container { flex-direction: column; } }
            
            .request-quote { 
                color: white; padding: 12px; border: none; border-radius: 28px; cursor: pointer; 
                font-size: 14px; background: #128c7e; display: inline-flex; align-items: center; 
                justify-content: center; gap: 6px; min-height: 44px; transition: background-color 0.3s; 
            }
            .request-quote:hover { background: #218838; }
            .request-quote.quoted { background: #155724; }
            
            .product-modal-request-quote { 
                padding: 15px; background: #28a745; color: white; border: none; border-radius: 4px; 
                cursor: pointer; font-size: 16px; margin-left: 10px; transition: background-color 0.3s; 
            }
            .product-modal-request-quote:hover { background: #218838; }
            .product-modal-request-quote.quoted { background: #155724; }
            
            .stock-indicator { font-size: 12px; padding: 4px 8px; border-radius: 4px; margin-bottom: 8px; }
            .stock-indicator.in-stock { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
            .stock-indicator.low-stock { background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }
            .stock-indicator.out-of-stock { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
            
            .add-to-cart, .request-quote { min-height: 44px; display: inline-flex; align-items: center; justify-content: center; gap: 6px; }
            .product-card-content { cursor: pointer; }
            
            /* Quotation Badge Animation */
            @keyframes quotationBadgePulse {
                0% { transform: scale(0); }
                50% { transform: scale(1.2); }
                100% { transform: scale(1); }
            }
            
            #quotation-cart-button { position: relative !important; }
            #quotation-cart-button[data-count="0"] .quotation-badge { display: none !important; }
            .quotation-badge { pointer-events: none; }
            
            /* Quotation Sidebar Styles */
            .quotation-sidebar {
                position: fixed; top: 0; right: -400px; width: 400px; height: 100%; background: white;
                box-shadow: -2px 0 5px rgba(0,0,0,0.1); transition: right 0.3s ease; z-index: 1000;
                box-sizing: border-box; display: flex; flex-direction: column; border-left: 3px solid #28a745;
            }
            .quotation-sidebar.active { right: 0; }
            .quotation-header {
                display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee;
                padding: 20px; margin-bottom: 20px;
            }
            .quotation-header h2 { margin: 0; font-size: 18px; color: #28a745; }
            .close-quotation {
                background: none; border: none; font-size: 24px; cursor: pointer; color: #666;
                width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;
                border-radius: 50%; transition: background-color 0.2s;
            }
            .close-quotation:hover { background: #f0f0f0; }
            .quotation-items { flex: 1; overflow-y: auto; margin-bottom: 20px; }
            .quotation-item {
                display: flex; align-items: flex-start; gap: 15px; margin-bottom: 20px;
                border-bottom: 1px solid #eee; padding-bottom: 15px; padding: 20px;
            }
            .quotation-item:last-child { border-bottom: none; }
            .quotation-item-image {
                width: 60px; height: 60px; object-fit: cover; border-radius: 28px; flex-shrink: 0;
            }
            .quotation-item-details { flex: 1; }
            .quotation-item h4 {
                margin: 0 0 5px 0; font-size: 16px; line-height: 1.3; color: #333;
            }
            .quotation-item .variant-info {
                margin: 0 0 5px 0; font-size: 13px; color: #666; font-style: italic;
            }
            .quantity-controls {
                display: flex; align-items: left; gap: 10px; margin-top: 20px;
            }
            .quantity-btn {
                width: 30px; height: 30px; border: 1px solid #ddd; background: white; cursor: pointer;
                border-radius: 28px; display: flex; align-items: center; justify-content: center;
                font-size: 14px; transition: all 0.2s;
            }
            .quantity-btn:hover { background: #f0f0f0; border-color: #28a745; }
            .quantity-btn:disabled { opacity: 0.5; cursor: not-allowed; }
            .quantity {
                font-weight: bold; min-width: 30px; text-align: center; padding: 5px;
            }
            .remove-item {
                background: #dc2626; color: white; border: none; padding: 5px 10px;
                border-radius: 28px; cursor: pointer; font-size: 12px; transition: background-color 0.2s;
            }
            .remove-item:hover { background: #b91c1c; }
            .empty-quotation {
                text-align: center; color: #666; font-style: italic; padding: 40px 20px;
            }
            .quotation-footer { border-top: 1px solid #eee; padding: 20px; }
            .request-all-quotes {
                width: fit-content; padding: 15px; background: #25d366; color: white;
                border: none; border-radius: 28px; cursor: pointer; font-size: 16px;
                font-weight: 500; transition: background-color 0.2s;
            }
            .request-all-quotes:hover:not(:disabled) { background: #128c7e; }
            .request-all-quotes:disabled { background: #6c757d; cursor: not-allowed; }
            
            /* Modal Description Styles */
            .short-description, .long-description, .basic-product-info, .technical-specifications, .special-note { 
                margin-bottom: 20px; 
            }
            .short-description h4, .long-description h4, .basic-product-info h4, .technical-specifications h4, .special-note h4 { 
                margin: 0 0 10px 0; color: #333; font-size: 16px; 
            }
            .info-grid { 
                display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; 
            }
            .info-grid span { 
                padding: 8px; background: #f8f9fa; border-radius: 4px; font-size: 14px; 
            }
            .specs-table { 
                width: 100%; border-collapse: collapse; margin-top: 10px; 
            }
            .specs-table th, .specs-table td { 
                padding: 8px 12px; border: 1px solid #ddd; text-align: left; 
            }
            .specs-table th { 
                background: #f8f9fa; font-weight: 600; 
            }
            .specs-table tr:nth-child(even) { 
                background: #f9f9f9; 
            }
            .specs-table a { 
                color: #007bff; text-decoration: none; 
            }
            .specs-table a:hover { 
                text-decoration: underline; 
            }
            .special-note .note-content { 
                padding: 10px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px; 
            }
            .video-section, .pdf-section { 
                margin-bottom: 15px; 
            }
            .video-section h4, .pdf-section h4 { 
                margin: 0 0 10px 0; color: #333; font-size: 16px; 
            }
            .youtube-video-container { 
                position: relative; display: inline-block; margin: 10px 0; 
            }
            .youtube-thumbnail { 
                width: 100%; max-width: 300px; border-radius: 8px; 
            }
            .youtube-play-overlay { 
                position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                background: rgba(0,0,0,0.8); border-radius: 50%; width: 50px; height: 50px; 
                display: flex; align-items: center; justify-content: center; 
            }
            .youtube-play-icon { 
                width: 0; height: 0; border-left: 15px solid white; 
                border-top: 10px solid transparent; border-bottom: 10px solid transparent; margin-left: 3px; 
            }
            .youtube-video-title { 
                margin-top: 5px; font-size: 14px; color: #333; 
            }
            .pdf-download-link, .youtube-search-link { 
                display: inline-block; padding: 10px 15px; background: #dc3545; color: white; 
                text-decoration: none; border-radius: 5px; margin: 5px 5px 5px 0; 
            }
            .pdf-download-link:hover, .youtube-search-link:hover { 
                background: #c82333; color: white; 
            }
            
            @media (max-width: 480px) {
                .quotation-sidebar {
                    width: 100%; right: -100%;
                }
                .quotation-item {
                    flex-direction: column; align-items: flex-start;
                }
                .quotation-item-image { align-self: start; }
                .quantity-controls { justify-content: start; }
            }
        `;
        document.head.appendChild(style);
    }
}

// Initialize quotation system when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        addQuotationStyles();
        initializeQuotationSystem();
    });
} else {
    addQuotationStyles();
    initializeQuotationSystem();
}

console.log('✅ Unified ISMAT system loaded - Quotation system should work now');
