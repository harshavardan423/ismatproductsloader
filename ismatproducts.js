// ===============================
// OPTIMIZED PRODUCTS & FILTER SYSTEM
// ===============================

(function() {
    'use strict';

    // ===============================
    // GLOBAL STATE & CONSTANTS
    // ===============================

    const BASE_URL = 'https://admin.ismatindia.com:7000';
    const FALLBACK_IMG = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik0xMDAgNzBWMTMwTTcwIDEwMEgxMzAiIHN0cm9rZT0iI0NDQ0NDQyIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KPC9zdmc+';

    // Global state
    window.isFilterSystemActive = false;
    window.cartItems = window.cartItems || [];
    window.quotationItems = window.quotationItems || [];
    
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

    // ===============================
    // CART & QUOTATION MANAGEMENT (UNIFIED)
    // ===============================

    function addToCollection(product, collectionType) {
        if (!product || isProcessingClick) return 0;
        
        isProcessingClick = true;
        setTimeout(() => isProcessingClick = false, 500);
        
        const collection = window[`${collectionType}Items`];
        const stockNumber = selectedVariant?.stock_number || product.stock_number;
        
        if (collectionType === 'cart' && stockNumber <= 0) {
            alert('This item is currently out of stock.');
            return 0;
        }
        
        const existingItem = collection.find(item => 
            item.id === product.id && 
            (item.selectedVariant?.name || null) === (selectedVariant?.name || null)
        );
        
        if (existingItem) {
            if (collectionType === 'cart' && existingItem.quantity >= Math.min(10, stockNumber)) {
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
                    ...(collectionType === 'cart' && { stock_number: selectedVariant.stock_number })
                } : null,
                ...(collectionType === 'cart' && { stock_number: stockNumber })
            };
            
            collection.push(newItem);
        }
        
        const updateFn = window[`update${collectionType.charAt(0).toUpperCase() + collectionType.slice(1)}Button`];
        updateFn?.();
        
        return existingItem ? existingItem.quantity : 1;
    }

    const addToCart = (product) => addToCollection(product, 'cart');
    const addToQuotation = (product) => addToCollection(product, 'quotation');

    const isInCollection = (productId, variantId, collectionType) => 
        window[`${collectionType}Items`].some(item => 
            item.id === productId && (item.selectedVariant?.name || null) === variantId
        );

    const getCollectionQuantity = (productId, variantId, collectionType) => {
        const item = window[`${collectionType}Items`].find(item => 
            item.id === productId && (item.selectedVariant?.name || null) === variantId
        );
        return item?.quantity || 0;
    };

    const isInCart = (id, variant) => isInCollection(id, variant, 'cart');
    const isInQuotation = (id, variant) => isInCollection(id, variant, 'quotation');
    const getCartQuantity = (id, variant) => getCollectionQuantity(id, variant, 'cart');
    const getQuotationQuantity = (id, variant) => getCollectionQuantity(id, variant, 'quotation');

    // ===============================
    // PRODUCT CARD & DISPLAY
    // ===============================

    function createProductCard(product) {
        const cartQty = getCartQuantity(product.id);
        const quoteQty = getQuotationQuantity(product.id);
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
                <div class="product-card-content" data-action="open-modal">
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
                        <button class="action-btn view-details-button" data-action="view-details" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${hasStockForCart ? `
                            <button class="action-btn add-to-cart ${isAdded ? 'added' : ''}" 
                                    data-action="add-to-cart"
                                    title="${isOutOfStock ? 'Out of Stock' : isAdded ? `In Cart (${cartQty})` : 'Add to Cart'}"
                                    ${isOutOfStock ? 'disabled' : ''}>
                                <i class="fas fa-${isOutOfStock ? 'times' : 'shopping-cart'}"></i>
                            </button>` : ''}
                        <button class="action-btn request-quote ${isQuoted ? 'quoted' : ''}" 
                                data-action="request-quote"
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
                '<button onclick="clearSearchInput()">Clear Search</button>' : 
                '<button onclick="clearAllFiltersFromSidebar()">Clear Filters</button>';
            
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
    // EVENT HANDLING
    // ===============================

    function handleProductCardClick(e) {
        if (isProcessingClick) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        
        const card = e.target.closest('.product-card');
        if (!card) return;
        
        const productId = parseInt(card.getAttribute('data-product-id'));
        const product = window.allProducts.find(p => p.id === productId);
        if (!product) return;
        
        const action = e.target.closest('[data-action]')?.getAttribute('data-action');
        
        if (['view-details', 'open-modal'].includes(action) || e.target.closest('.product-card-content')) {
            e.preventDefault();
            e.stopPropagation();
            openProductModal(product);
        } else if (action === 'add-to-cart' && !isProcessingClick) {
            e.preventDefault();
            e.stopPropagation();
            addToCart(product);
        } else if (action === 'request-quote' && !isProcessingClick) {
            e.preventDefault();
            e.stopPropagation();
            addToQuotation(product);
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

    // ===============================
    // MODAL FUNCTIONS (SIMPLIFIED)
    // ===============================

    function selectVariant(variantData) {
        if (variantData.stock_number <= 0) return;
        
        selectedVariant = variantData;
        
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
        const variantId = selectedVariant?.name || null;
        
        // Update cart button
        const cartBtn = document.getElementById('modalAddToCart');
        if (cartBtn && currentModalProduct) {
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
        
        // Update quote button
        const quoteBtn = document.getElementById('modalRequestQuote') || (() => {
            const modalActions = document.querySelector('.product-modal-actions');
            if (!modalActions) return null;
            
            const btn = document.createElement('button');
            btn.id = 'modalRequestQuote';
            btn.className = 'product-modal-request-quote';
            btn.addEventListener('click', () => addToQuotation(currentModalProduct));
            modalActions.appendChild(btn);
            return btn;
        })();
        
        if (quoteBtn && currentModalProduct) {
            const isQuoted = isInQuotation(currentModalProduct.id, variantId);
            const quantity = getQuotationQuantity(currentModalProduct.id, variantId);
            
            quoteBtn.className = isQuoted ? 'quoted' : '';
            quoteBtn.innerHTML = `<i class="fab fa-whatsapp"></i> ${isQuoted ? `QUOTED (${quantity})` : 'REQUEST QUOTE'}`;
        }
    }

    function openProductModal(product) {
        currentModalProduct = product;
        selectedVariant = null;
        
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
                          onclick="changeMainImage('${img}', this)">`).join('');
                elements.gallery.style.display = 'flex';
            } else {
                elements.gallery.style.display = 'none';
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
                    onclick="${isOutOfStock ? '' : `selectVariant(${JSON.stringify(variant).replace(/"/g, '&quot;')})`}">
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
        
        updateModalPrice();
        updateStockDisplay();
        updateModalButtons();
        
        dom.modal.style.display = 'block';
        dom.modal.classList.add('show');
        document.body.style.overflow = 'hidden';
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
            const errorMsg = `<div class="error">Failed to load products. <button onclick="loadProducts(${page}, ${append})">Retry</button></div>`;
            if (dom.productsGrid) {
                dom.productsGrid.innerHTML = append ? dom.productsGrid.innerHTML + errorMsg : errorMsg;
            }
        } finally {
            isLoading = false;
        }
    }

    // ===============================
    // INITIALIZATION & UTILITIES
    // ===============================

    function setupEventListeners() {
        // Filter events
        document.getElementById('product-filter-search')?.addEventListener('click', () => {
            filterSidebar?.classList.add('active');
            filterOverlay?.classList.add('active');
            document.body.style.overflow = 'hidden';
            if (!isFilterOptionsLoaded) loadFilterOptions();
        });

        document.getElementById('close-filter-sidebar')?.addEventListener('click', () => {
            filterSidebar?.classList.remove('active');
            filterOverlay?.classList.remove('active');
            document.body.style.overflow = '';
        });

        filterOverlay?.addEventListener('click', () => {
            filterSidebar?.classList.remove('active');
            filterOverlay?.classList.remove('active');
            document.body.style.overflow = '';
        });

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
            filterSidebar?.classList.remove('active');
            filterOverlay?.classList.remove('active');
            document.body.style.overflow = '';
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
                else if (filterSidebar?.classList.contains('active')) {
                    filterSidebar.classList.remove('active');
                    filterOverlay?.classList.remove('active');
                    document.body.style.overflow = '';
                }
            }
        });

        // Filter change events
        document.addEventListener('change', (e) => {
            if (e.target.matches('input[name="price"], input[name="stock"], .brand-option input, .category-option input')) {
                updateFilterState();
                setTimeout(updateSearchIndicator, 100);
            }
        });

        // Unified product card handling
        document.removeEventListener('click', handleProductCardClick, true);
        document.addEventListener('click', handleProductCardClick, true);
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

    // ===============================
    // GLOBAL EXPORTS & INITIALIZATION
    // ===============================

    // Export essential functions
    Object.assign(window, {
        openFilterSidebar: () => applyFilters(),
        closeFilterSidebar: () => {
            filterSidebar?.classList.remove('active');
            filterOverlay?.classList.remove('active');
            document.body.style.overflow = '';
        },
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
        addToQuotation,
        isInCart,
        isInQuotation,
        getCartQuantity,
        getQuotationQuantity,
        updateModalCartButton: updateModalButtons,
        updateModalQuoteButton: updateModalButtons,
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
        refreshQuoteDisplay: updateModalButtons
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

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
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
    `;
    document.head.appendChild(style);

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
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 100);
    }

})();
