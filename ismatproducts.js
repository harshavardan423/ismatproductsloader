// ===============================
// COMBINED PRODUCTS & FILTER SYSTEM
// ===============================

(function() {
    'use strict';

    // ===============================
    // GLOBAL STATE MANAGEMENT
    // ===============================

    window.isFilterSystemActive = false;

    // Initialize global cart and quotation if they don't exist
    window.cartItems = window.cartItems || [];
    window.quotationItems = window.quotationItems || [];

    // Current page state for infinite scroll
    let currentPage = 1;
    let totalPages = 1;
    let isLoading = false;
    let hasMoreProducts = true;
    let currentModalProduct = null;
    let selectedVariant = null;

    // Store original and filtered products
    let originalProducts = [];
    let filteredProducts = [];

    // Make allProducts always reference the global window version
    Object.defineProperty(window, 'allProducts', {
        get: function() { return window._allProducts || []; },
        set: function(value) { window._allProducts = value; }
    });

    // Modal history management
    let modalHistoryState = null;
    let isModalOpen = false;

    // Event listener management
    let isProcessingClick = false;

    // Base URL for images
    const BASE_URL = 'https://admin.ismatindia.com:7000';

    // Filter system variables
    let filterSidebar, filterOverlay;
    let currentSearchQuery = '';
    let allUniqueCategories = [];
    let allUniqueBrands = [];
    let isFilterOptionsLoaded = false;
    let currentFilters = {
        search: '',
        price: '',
        stock: [],
        brands: [],
        categories: []
    };

    let currentFilteredPage = 1;
    let hasMoreFilteredPages = false;
    let isLoadingFiltered = false;

    // ===============================
    // CORE UTILITY FUNCTIONS
    // ===============================

    // Function to get stock status and display text
    function getStockInfo(stockNumber) {
        if (stockNumber === null || stockNumber === undefined) {
            return { status: 'unknown', text: 'Stock: Unknown', class: 'out-of-stock' };
        }
        
        const stock = parseInt(stockNumber);
        
        if (stock <= 0) {
            return { status: 'out-of-stock', text: 'Out of Stock', class: 'out-of-stock' };
        } else if (stock <= 5) {
            return { status: 'low-stock', text: `Low Stock (${stock} left)`, class: 'low-stock' };
        } else if (stock <= 20) {
            return { status: 'in-stock', text: `In Stock (${stock} available)`, class: 'in-stock' };
        } else {
            return { status: 'in-stock', text: 'In Stock', class: 'in-stock' };
        }
    }

    // Function to get full image URL
    function getImageUrl(imageUrl) {
        if (!imageUrl) return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik0xMDAgNzBWMTMwTTcwIDEwMEgxMzAiIHN0cm9rZT0iI0NDQ0NDQyIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KPC9zdmc+';
        
        if (imageUrl.startsWith('http')) {
            return imageUrl;
        }
        
        if (imageUrl.startsWith('/')) {
            return BASE_URL + imageUrl;
        }
        
        return BASE_URL + '/' + imageUrl;
    }

    // Function to extract YouTube video ID from URL
    function getYouTubeVideoId(url) {
        const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
        const match = url.match(regex);
        return match ? match[1] : null;
    }

    // Function to get YouTube thumbnail URL
    function getYouTubeThumbnail(videoId) {
        return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    }

    // Function to create YouTube video embed HTML
    function createYouTubeEmbed(url, productName) {
        const videoId = getYouTubeVideoId(url);
        
        if (videoId) {
            const thumbnailUrl = getYouTubeThumbnail(videoId);
            return `
                <a href="${url}" target="_blank" class="product-youtube-link">
                    <div class="youtube-video-container">
                        <img src="${thumbnailUrl}" alt="Video thumbnail" class="youtube-thumbnail" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRkY0NDQ0Ii8+Cjx0ZXh0IHg9IjE1MCIgeT0iMTAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSIgZm9udC1zaXplPSIxNiIgZm9udC1mYW1pbHk9IkFyaWFsIj5Zb3VUdWJlIFZpZGVvPC90ZXh0Pgo8L3N2Zz4='">
                        <div class="youtube-play-overlay">
                            <div class="youtube-play-icon"></div>
                        </div>
                        <div class="youtube-video-title">${productName} - Watch Video</div>
                    </div>
                </a>
            `;
        } else {
            return `<a href="${url}" class="product-youtube-link" target="_blank" style="display: inline-block; padding: 10px 20px; background: #ff4444; color: white; text-decoration: none; border-radius: 5px; margin: 5px 0;">Watch Video</a>`;
        }
    }

    // Function to create YouTube search URL
    function createYouTubeSearchUrl(productName) {
        const searchQuery = encodeURIComponent(productName);
        return `https://www.youtube.com/results?search_query=${searchQuery}`;
    }

    function getPdfUrl(pdfUrl) {
        if (!pdfUrl) return '';
        
        if (pdfUrl.startsWith('http')) {
            return pdfUrl;
        }
        
        if (pdfUrl.startsWith('/')) {
            return BASE_URL + pdfUrl;
        }
        
        return BASE_URL + '/' + pdfUrl;
    }

    // Function to format price consistently
    function formatPrice(price) {
        if (!price || isNaN(price)) return null;
        const numericPrice = parseFloat(price);
        if (numericPrice <= 0) return null;
        return numericPrice.toFixed(2);
    }

    // Function to get currency symbol as HTML entity
    function getCurrencySymbol() {
        return '&#8377;'; // Rupee symbol as HTML entity
    }

    function isSimpleSpecification(text) {
        const specPatterns = [
            /^\d+[\w]*$/,
            /^\d+\/\d+/,
            /^\d+\.\d+/,
            /mm$|cm$|V$|W$|A$|kg$|g$/i,
            /^[A-Z]{2,4}\+?$/,
            /^T\d+$/,
        ];
        
        return specPatterns.some(pattern => pattern.test(text.trim()));
    }

    function updateGlobalProductArrays(products) {
        window.allProducts = products;
        originalProducts = products;
        filteredProducts = products;
        console.log(`Updated global product arrays with ${products.length} products`);
    }

    // ===============================
    // CART MANAGEMENT FUNCTIONS
    // ===============================

    // Function to add item to cart with debouncing
    function addToCart(product) {
        if (!product || isProcessingClick) return 0;
        
        isProcessingClick = true;
        
        // Add a small delay to prevent rapid multiple clicks
        setTimeout(() => {
            isProcessingClick = false;
        }, 500);
        
        let stockNumber = selectedVariant ? selectedVariant.stock_number : product.stock_number;
        
        if (stockNumber <= 0) {
            alert('This item is currently out of stock.');
            return 0;
        }
        
        const MAX_QUANTITY_PER_ITEM = 10; // Set a reasonable maximum limit
        
        const existingItem = window.cartItems.find(item => 
            item.id === product.id && 
            (item.selectedVariant?.name || null) === (selectedVariant?.name || null)
        );
        
        if (existingItem) {
            // Check if adding one more would exceed the maximum limit
            if (existingItem.quantity >= MAX_QUANTITY_PER_ITEM) {
                alert(`Maximum quantity limit (${MAX_QUANTITY_PER_ITEM}) reached for this item.`);
                return existingItem.quantity;
            }
            
            // Check if adding one more would exceed the stock
            if (existingItem.quantity >= stockNumber) {
                alert(`Cannot add more items. Only ${stockNumber} in stock.`);
                return existingItem.quantity;
            }
            
            existingItem.quantity += 1;
            return existingItem.quantity;
        }
        
        const price = product.offer_price || product.mrp || 0;
        const finalPrice = selectedVariant ? (selectedVariant.price || price) : price;
        
        const newItem = {
            id: product.id,
            name: product.product_name,
            price: parseFloat(finalPrice),
            image: getImageUrl(product.product_image_urls && product.product_image_urls[0]),
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
        
        if (window.updateCartButton) {
            window.updateCartButton();
        }
        
        return 1;
    }

    // Function to check if item is in cart
    function isInCart(productId, variantId = null) {
        return window.cartItems.some(item => 
            item.id === productId && 
            (item.selectedVariant?.name || null) === variantId
        );
    }

    // Function to get item quantity in cart
    function getCartQuantity(productId, variantId = null) {
        const item = window.cartItems.find(item => 
            item.id === productId && 
            (item.selectedVariant?.name || null) === variantId
        );
        return item ? item.quantity : 0;
    }

    // ===============================
    // QUOTATION MANAGEMENT FUNCTIONS
    // ===============================

    // Function to add item to quotation with debouncing
    function addToQuotation(product) {
        if (!product || isProcessingClick) return 0;
        
        isProcessingClick = true;
        
        // Add a small delay to prevent rapid multiple clicks
        setTimeout(() => {
            isProcessingClick = false;
        }, 500);
        
        const existingItem = window.quotationItems.find(item => 
            item.id === product.id && 
            (item.selectedVariant?.name || null) === (selectedVariant?.name || null)
        );
        
        if (existingItem) {
            existingItem.quantity += 1;
            
            if (window.updateQuotationButton) {
                window.updateQuotationButton();
            }
            
            return existingItem.quantity;
        }
        
        const price = product.offer_price || product.mrp || 0;
        const finalPrice = selectedVariant ? (selectedVariant.price || price) : price;
        
        const newItem = {
            id: product.id,
            name: product.product_name,
            price: parseFloat(finalPrice),
            image: getImageUrl(product.product_image_urls && product.product_image_urls[0]),
            category: product.category,
            quantity: 1,
            selectedVariant: selectedVariant ? {
                name: selectedVariant.name,
                price: selectedVariant.price,
                sku: selectedVariant.sku || product.sku
            } : null
        };
        
        window.quotationItems.push(newItem);
        
        if (window.updateQuotationButton) {
            window.updateQuotationButton();
        }
        
        // Just add to quotation cart - no automatic WhatsApp opening
        return 1;
    }

    // Function to check if item is in quotation
    function isInQuotation(productId, variantId = null) {
        return window.quotationItems.some(item => 
            item.id === productId && 
            (item.selectedVariant?.name || null) === variantId
        );
    }

    // Function to get item quantity in quotation
    function getQuotationQuantity(productId, variantId = null) {
        const item = window.quotationItems.find(item => 
            item.id === productId && 
            (item.selectedVariant?.name || null) === variantId
        );
        return item ? item.quantity : 0;
    }

    // ===============================
    // PRODUCT CARD CREATION
    // ===============================

    function createProductCard(product) {
        try {
            const isAdded = isInCart(product.id);
            const cartQuantity = getCartQuantity(product.id);
            const isQuoted = isInQuotation(product.id);
            const quoteQuantity = getQuotationQuantity(product.id);
            
            // Handle price display with consistent formatting
            let priceDisplay = '';
            const formattedOfferPrice = formatPrice(product.offer_price);
            const formattedMrpPrice = formatPrice(product.mrp);
            
            if (formattedOfferPrice && formattedMrpPrice && 
                parseFloat(formattedOfferPrice) < parseFloat(formattedMrpPrice)) {
                
                const savings = parseFloat(formattedMrpPrice) - parseFloat(formattedOfferPrice);
                const savingsPercent = ((savings / parseFloat(formattedMrpPrice)) * 100).toFixed(0);
                priceDisplay = `
                    <span class="mrp-price">${getCurrencySymbol()}${formattedMrpPrice}</span>
                    <span class="offer-price">${getCurrencySymbol()}${formattedOfferPrice}</span>
                    <span class="savings">Save ${savingsPercent}%</span>
                `;
            } else if (formattedOfferPrice || formattedMrpPrice) {
                const displayPrice = formattedOfferPrice || formattedMrpPrice;
                priceDisplay = `<span class="current-price">${getCurrencySymbol()}${displayPrice}</span>`;
            } else {
                priceDisplay = `<span class="current-price">Price on Request</span>`;
            }
            
            // Get proper image URL
            const imageUrl = product.product_image_urls && product.product_image_urls[0] 
                ? getImageUrl(product.product_image_urls[0]) 
                : getImageUrl(null);
            const fallbackImageUrl = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik0xMDAgNzBWMTMwTTcwIDEwMEgxMzAiIHN0cm9rZT0iI0NDQ0NDQyIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KPC9zdmc+';
            
            // Calculate combined stock (for logic only)
            const combinedStock = product.variants && product.variants.length > 0 ? 
                product.variants.reduce((total, variant) => total + (variant.stock_number || 0), 0) : 
                product.stock_number;
            
            // Variants indicator
            let variantIndicator = '';
            if (product.variants && product.variants.length > 0) {
                variantIndicator = `
                    <div style="font-size: 12px; color: #666; margin-bottom: 5px;">
                        <i class="fas fa-layer-group"></i> ${product.variants.length} variants available
                    </div>
                `;
            }
            
            // Check if product is out of stock
            const isOutOfStock = combinedStock <= 0;
            const hasStockForCart = combinedStock > 5;
            
            return `
                <div class="product-card ${isOutOfStock ? 'out-of-stock-card' : ''}" data-product-id="${product.id}">
                    <div class="product-card-content" data-action="open-modal">
                        <img src="${imageUrl}" 
                             class="product-image" 
                             alt="${product.product_name || 'Product'}"
                             onerror="this.src='${fallbackImageUrl}'">
                        <h4 class="product-title">${product.product_name || 'Unnamed Product'}</h4>
                        ${variantIndicator}
                        <div class="price-container">
                            ${priceDisplay}
                        </div>
                    </div>
                    <div class="action-buttons-wrapper">
                        <div class="action-buttons">
                            <button class="action-btn view-details-button" 
                                    data-product-id="${product.id}"
                                    data-action="view-details"
                                    title="View Details">
                                <i class="fas fa-eye"></i>
                            </button>
                            ${hasStockForCart ? `
                                <button class="action-btn add-to-cart ${isAdded ? 'added' : ''}" 
                                        data-product-id="${product.id}"
                                        data-action="add-to-cart"
                                        title="${isOutOfStock ? 'Out of Stock' : isAdded ? `In Cart (${cartQuantity})` : 'Add to Cart'}"
                                        ${isOutOfStock ? 'disabled' : ''}>
                                    <i class="fas fa-${isOutOfStock ? 'times' : 'shopping-cart'}"></i>
                                </button>
                            ` : ''}
                            <button class="action-btn request-quote ${isQuoted ? 'quoted' : ''}" 
                                    data-product-id="${product.id}"
                                    data-action="request-quote"
                                    title="${isQuoted ? `Quoted (${quoteQuantity})` : 'Request Quote'}">
                                <i class="fab fa-whatsapp"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error creating product card:', error);
            return `
                <div class="product-card">
                    <div class="error">Error loading product</div>
                </div>
            `;
        }
    }

    // ===============================
    // EVENT HANDLING - UNIFIED SYSTEM
    // ===============================

    // Main event handler for all product card interactions
    function handleProductCardClick(e) {
        // Prevent processing if already processing a click
        if (isProcessingClick) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        
        const target = e.target;
        const card = target.closest('.product-card');
        if (!card) return;
        
        const productId = parseInt(card.getAttribute('data-product-id'));
        if (!productId) return;
        
        // Get product from current products array
        const currentProducts = window.allProducts || [];
        const product = currentProducts.find(p => p.id === productId);
        
        if (!product) {
            console.warn(`Product with ID ${productId} not found in current product array`);
            return;
        }
        
        // Handle view details button
        if (target.classList.contains('view-details-button') || 
            target.closest('.view-details-button')) {
            e.preventDefault();
            e.stopPropagation();
            openProductModal(product);
            return;
        }
        
        // Handle card content click
        if (target.closest('.product-card-content')) {
            e.preventDefault();
            e.stopPropagation();
            openProductModal(product);
            return;
        }
        
        // Handle add to cart
        if (target.classList.contains('add-to-cart') || 
            target.closest('.add-to-cart')) {
            e.preventDefault();
            e.stopPropagation();
            
            if (isProcessingClick) return;
            
            const quantity = addToCart(product);
            return;
        }
        
        // Handle request quote
        if (target.classList.contains('request-quote') || 
            target.closest('.request-quote')) {
            e.preventDefault();
            e.stopPropagation();
            
            if (isProcessingClick) return;
            
            // Block any automatic actions and just add to quote cart
            isProcessingClick = true;
            setTimeout(() => {
                isProcessingClick = false;
            }, 500);
            
            // Add to quotation cart directly - NO WhatsApp opening
            const existingItem = window.quotationItems.find(item => 
                item.id === product.id && 
                (item.selectedVariant?.name || null) === (selectedVariant?.name || null)
            );
            
            if (existingItem) {
                existingItem.quantity += 1;
            } else {
                const price = product.offer_price || product.mrp || 0;
                const finalPrice = selectedVariant ? (selectedVariant.price || price) : price;
                
                const newItem = {
                    id: product.id,
                    name: product.product_name,
                    price: parseFloat(finalPrice),
                    image: getImageUrl(product.product_image_urls && product.product_image_urls[0]),
                    category: product.category,
                    quantity: 1,
                    selectedVariant: selectedVariant ? {
                        name: selectedVariant.name,
                        price: selectedVariant.price,
                        sku: selectedVariant.sku || product.sku
                    } : null
                };
                
                window.quotationItems.push(newItem);
            }
            
            if (window.updateQuotationButton) {
                window.updateQuotationButton();
            }
            
            return;
        }
    }

    // Single event listener setup using event delegation
    function setupEventDelegation() {
        // Remove any existing listener
        document.removeEventListener('click', handleProductCardClick, true);
        
        // Add single event listener using capture phase for better performance
        document.addEventListener('click', handleProductCardClick, true);
        
        console.log('✅ Unified event delegation setup complete');
    }

    // ===============================
    // PRODUCT DISPLAY FUNCTIONS
    // ===============================

    // Function to display products in grid - works for all scenarios
    function displayProductsInGrid(products) {
        const productsGrid = document.getElementById('products-grid');
        const loadingIndicator = document.getElementById('infinite-scroll-loading');
        const endIndicator = document.getElementById('end-of-products');
        
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        if (endIndicator) endIndicator.style.display = 'none';
        
        if (products.length === 0) {
            const isSearchMode = window.isSearchMode && window.isSearchMode();
            const hasSearchQuery = currentSearchQuery && currentSearchQuery.trim();
            const message = hasSearchQuery ? 
                'No products found matching your search criteria.' : 
                'No products found matching your filters.';
            
            if (productsGrid) {
                productsGrid.innerHTML = `
                    <div class="no-results-message">
                        <i class="fas fa-search"></i>
                        <h3>No Results Found</h3>
                        <p>${message}</p>
                        ${hasSearchQuery ? 
                            '<button onclick="clearSearchInput()" style="padding: 10px 20px; background: #dc2626; color: white; border: none; border-radius: 6px; cursor: pointer;">Clear Search</button>' : 
                            '<button onclick="clearAllFiltersFromSidebar()" style="padding: 10px 20px; background: #dc2626; color: white; border: none; border-radius: 6px; cursor: pointer;">Clear Filters</button>'
                        }
                    </div>
                `;
            }
            return;
        }
        
        const productCards = products.map(product => createProductCard(product)).join('');
        if (productsGrid) {
            productsGrid.innerHTML = productCards;
        }
        
        // Event delegation is already setup, no need to reattach
        console.log(`Displayed ${products.length} products in grid`);
        
        if ((currentSearchQuery || hasActiveFilters()) && endIndicator) {
            endIndicator.style.display = 'block';
            endIndicator.innerHTML = '<p>End of filtered results</p>';
        }
    }

    // Function to append products to grid (for infinite scroll)
    function appendProductsToGrid(newProducts) {
        const productsGrid = document.getElementById('products-grid');
        if (!productsGrid || !newProducts || newProducts.length === 0) return;
        
        const newProductCards = newProducts.map(product => createProductCard(product)).join('');
        productsGrid.innerHTML += newProductCards;
        
        // Event delegation handles new elements automatically
        console.log(`Appended ${newProducts.length} products to grid`);
    }

    // ===============================
    // FILTER SYSTEM FUNCTIONS
    // ===============================

    async function debugTestEndpoints() {
        console.log('=== FILTER DEBUG TEST ===');
        
        try {
            const basicResponse = await fetch(`${BASE_URL}/products?page=1`);
            if (basicResponse.ok) {
                const basicData = await basicResponse.json();
                console.log('✅ Basic products working:', basicData.products?.length, 'products found');
            }
        } catch (error) {
            console.error('❌ Basic products error:', error);
        }
        
        try {
            const filterResponse = await fetch(`${BASE_URL}/products/filter-options`);
            if (filterResponse.ok) {
                const filterData = await filterResponse.json();
                console.log('✅ Filter options working:', filterData);
                return filterData;
            } else {
                throw new Error(`Filter endpoint failed: ${filterResponse.status}`);
            }
        } catch (error) {
            console.error('❌ Filter options error:', error);
            return await fallbackExtractFilters();
        }
    }

    async function fallbackExtractFilters() {
        console.log('🔄 Using fallback filter extraction...');
        
        try {
            let allProducts = [];
            let page = 1;
            let hasMore = true;
            
            while (hasMore && page <= 5) {
                const response = await fetch(`${BASE_URL}/products?page=${page}&per_page=50`);
                if (!response.ok) break;
                
                const data = await response.json();
                allProducts = allProducts.concat(data.products || []);
                hasMore = data.current_page < data.total_pages && page < 5;
                page++;
            }
            
            const categories = new Set();
            const brands = new Set();
            
            allProducts.forEach(product => {
                if (product.category && product.category.trim()) {
                    categories.add(product.category.trim());
                }
                
                if (product.manufacturer && product.manufacturer.trim()) {
                    const manufacturer = product.manufacturer.trim();
                    if (!isSimpleSpecification(manufacturer)) {
                        brands.add(manufacturer);
                    }
                }
            });
            
            return {
                categories: Array.from(categories).sort(),
                brands: Array.from(brands).sort(),
                price_stats: { min: 0, max: 10000, avg: 1000 },
                stock_stats: { total: allProducts.length, in_stock: 0, low_stock: 0, out_of_stock: 0 }
            };
            
        } catch (error) {
            console.error('❌ Fallback extraction failed:', error);
            return {
                categories: ['Tools', 'Hardware', 'Electrical', 'Accessories', 'Safety Equipment'],
                brands: ['Bosch', 'Stanley', 'DeWalt', 'Black & Decker', 'Makita'],
                price_stats: { min: 0, max: 10000, avg: 1000 },
                stock_stats: { total: 100, in_stock: 80, low_stock: 15, out_of_stock: 5 }
            };
        }
    }

    function updateSearchIndicator() {
        const searchButton = document.querySelector('.searchbutton');
        if (!searchButton) return;
        
        const searchInput = document.getElementById('product-search-input');
        const hasSearchText = searchInput && searchInput.value.trim();
        const hasSearchResults = window.searchResults && window.searchResults.length >= 0;
        const hasActiveFilters = document.querySelectorAll('input[name="price"]:checked, input[name="stock"]:checked, .brand-option input:checked, .category-option input:checked').length > 0;
        
        const isSearchActive = hasSearchText || hasSearchResults || hasActiveFilters;
        
        const existingIndicator = searchButton.querySelector('.search-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }
        
        if (isSearchActive) {
            const indicator = document.createElement('span');
            indicator.className = 'search-indicator';
            indicator.style.cssText = `
                position: absolute;
                top: -7px;
                right: -4px;
                background: #007bff;
                border: 2px solid white;
                border-radius: 50%;
                width: 12px;
                height: 12px;
                z-index: 10;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            `;
            
            searchButton.style.position = 'relative';
            searchButton.appendChild(indicator);
        }
    }

    function hasActiveFilters() {
        return currentFilters.search || 
               currentFilters.price || 
               currentFilters.stock.length > 0 || 
               currentFilters.brands.length > 0 || 
               currentFilters.categories.length > 0;
    }

    function hasActiveNonSearchFilters() {
        return currentFilters.price || 
               currentFilters.stock.length > 0 || 
               currentFilters.brands.length > 0 || 
               currentFilters.categories.length > 0;
    }

    function buildFilterParams(page = 1, perPage = 12) {
        const params = new URLSearchParams();
        
        params.append('page', page.toString());
        params.append('per_page', perPage.toString());
        
        if (currentFilters.search) {
            params.append('q', currentFilters.search);
        }
        
        if (currentFilters.categories.length > 0) {
            currentFilters.categories.forEach(cat => {
                params.append('categories', cat);
            });
        }
        
        if (currentFilters.brands.length > 0) {
            currentFilters.brands.forEach(brand => {
                params.append('brands', brand);
            });
        }
        
        if (currentFilters.stock.length > 0) {
            currentFilters.stock.forEach(stock => {
                params.append('stock_status', stock);
            });
        }
        
        if (currentFilters.price) {
            switch (currentFilters.price) {
                case 'under-1000':
                    params.append('max_price', '999');
                    break;
                case '1000-3000':
                    params.append('min_price', '1000');
                    params.append('max_price', '3000');
                    break;
                case '3000-5000':
                    params.append('min_price', '3000');
                    params.append('max_price', '5000');
                    break;
                case 'above-5000':
                    params.append('min_price', '5001');
                    break;
            }
        }
        
        return params;
    }

    async function loadMoreFilteredProducts() {
        if (isLoadingFiltered || !hasMoreFilteredPages) return;
        
        isLoadingFiltered = true;
        const nextPage = currentFilteredPage + 1;
        
        try {
            const params = buildFilterParams(nextPage, 12);
            const response = await fetch(`${BASE_URL}/products/filtered?${params.toString()}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            const newProducts = data.products || [];
            
            if (newProducts.length > 0) {
                const currentProducts = window.allProducts || [];
                const updatedProducts = [...currentProducts, ...newProducts];
                updateGlobalProductArrays(updatedProducts);
                
                // Use the unified append function
                appendProductsToGrid(newProducts);
                
                currentFilteredPage = nextPage;
                hasMoreFilteredPages = data.has_next || false;
                
                console.log(`Added ${newProducts.length} more filtered products`);
            } else {
                hasMoreFilteredPages = false;
            }
            
        } catch (error) {
            console.error('Error loading more filtered products:', error);
            hasMoreFilteredPages = false;
        } finally {
            isLoadingFiltered = false;
        }
    }

    function setupFilteredInfiniteScroll() {
        let ticking = false;
        
        function checkFilteredScrollPosition() {
            const hasSearchResults = window.searchResults && window.searchResults.length >= 0;
            const hasActiveFilters = document.querySelectorAll('input[name="price"]:checked, input[name="stock"]:checked, .brand-option input:checked, .category-option input:checked').length > 0;
            const hasSearchText = document.getElementById('product-search-input') && document.getElementById('product-search-input').value.trim();
            
            if (!hasSearchResults && !hasActiveFilters && !hasSearchText) {
                ticking = false;
                return;
            }
            
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const windowHeight = window.innerHeight;
            const documentHeight = document.documentElement.scrollHeight;
            
            const threshold = 200;
            const isNearBottom = scrollTop + windowHeight >= documentHeight - threshold;
            
            if (isNearBottom && hasMoreFilteredPages && !isLoadingFiltered) {
                console.log('Loading more filtered products...');
                loadMoreFilteredProducts();
            }
            
            ticking = false;
        }
        
        function onFilteredScroll() {
            if (!ticking) {
                requestAnimationFrame(checkFilteredScrollPosition);
                ticking = true;
            }
        }
        
        window.addEventListener('scroll', onFilteredScroll, { passive: true });
        window.addEventListener('resize', onFilteredScroll, { passive: true });
        
        console.log('Filter infinite scroll enabled');
    }

    async function openFilterSidebar() {
        if (filterSidebar && filterOverlay) {
            filterSidebar.classList.add('active');
            filterOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            if (!isFilterOptionsLoaded) {
                await loadFilterOptions();
            }
        }
    }

    function closeFilterSidebar() {
        if (filterSidebar && filterOverlay) {
            filterSidebar.classList.remove('active');
            filterOverlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    async function loadFilterOptions() {
        const categoryLoading = document.getElementById('category-loading');
        const brandLoading = document.getElementById('brand-loading');

        try {
            if (categoryLoading) {
                categoryLoading.style.display = 'block';
                categoryLoading.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading categories...';
            }
            if (brandLoading) {
                brandLoading.style.display = 'block'; 
                brandLoading.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading brands...';
            }

            let data;
            try {
                const response = await fetch(`${BASE_URL}/products/filter-options`);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                data = await response.json();
                
            } catch (endpointError) {
                data = await fallbackExtractFilters();
            }
            
            allUniqueCategories = data.categories || [];
            allUniqueBrands = data.brands || [];

            await populateCategories();
            await populateBrands();

            isFilterOptionsLoaded = true;

        } catch (error) {
            console.error('All filter loading methods failed:', error);
            showFilterLoadingError(categoryLoading, 'categories', error.message);
            showFilterLoadingError(brandLoading, 'brands', error.message);
        }
    }

    async function populateCategories() {
        const categoryContainer = document.getElementById('category-options-container');
        const categoryLoading = document.getElementById('category-loading');
        
        if (!categoryContainer) return;

        try {
            if (categoryLoading) categoryLoading.style.display = 'none';
            
            if (allUniqueCategories.length > 0) {
                categoryContainer.innerHTML = allUniqueCategories.map(category => `
                    <label class="category-option">
                        <input type="checkbox" value="${category}">
                        <span class="checkmark">${category}</span>
                    </label>
                `).join('');
                categoryContainer.style.display = 'flex';
            } else {
                categoryContainer.innerHTML = '<div style="text-align: center; color: #666; font-size: 14px;">No categories found</div>';
                categoryContainer.style.display = 'block';
            }
        } catch (error) {
            console.error('Error populating categories:', error);
        }
    }

    async function populateBrands() {
        const brandContainer = document.getElementById('brand-options-container');
        const brandLoading = document.getElementById('brand-loading');
        const brandSearchContainer = document.getElementById('brand-search-container');
        
        if (!brandContainer) return;

        try {
            if (brandLoading) brandLoading.style.display = 'none';
            
            if (allUniqueBrands.length > 0) {
                brandContainer.innerHTML = allUniqueBrands.map(brand => `
                    <label class="brand-option">
                        <input type="checkbox" value="${brand}">
                        <span class="checkmark">${brand}</span>
                    </label>
                `).join('');
                brandContainer.style.display = 'flex';
                if (brandSearchContainer) brandSearchContainer.style.display = 'block';
            } else {
                brandContainer.innerHTML = '<div style="text-align: center; color: #666; font-size: 14px;">No brands found</div>';
                brandContainer.style.display = 'block';
            }
        } catch (error) {
            console.error('Error populating brands:', error);
        }
    }

    function filterBrandsInSidebar(searchTerm) {
        const brandOptions = document.querySelectorAll('.brand-option');
        const term = searchTerm.toLowerCase();
        
        brandOptions.forEach(option => {
            const brandName = option.textContent.toLowerCase();
            if (brandName.includes(term)) {
                option.style.display = 'flex';
            } else {
                option.style.display = 'none';
            }
        });
    }

    function showFilterLoadingError(loadingElement, type, errorMessage = 'Unknown error') {
        if (loadingElement) {
            loadingElement.innerHTML = `
                <div class="filter-loading-error">
                    <div>Failed to load ${type}</div>
                    <small>${errorMessage}</small>
                    <div style="margin-top: 5px;">
                        <button class="filter-retry-btn" onclick="window.retryLoadFilterOptions()">Retry</button>
                        <button class="filter-debug-btn" onclick="window.debugTestEndpoints().then(console.log)">Debug</button>
                    </div>
                </div>
            `;
        }
    }

    function clearSearchInput() {
        const searchInput = document.getElementById('product-search-input');
        const clearSearchBtn = document.getElementById('clear-search-btn');
        
        if (searchInput) {
            searchInput.value = '';
        }
        if (clearSearchBtn) {
            clearSearchBtn.style.display = 'none';
        }
        
        currentSearchQuery = '';
        updateFilterState();
        updateSearchIndicator();
    }

    async function performSearch() {
        window.isFilterSystemActive = true;
        
        const searchInput = document.getElementById('product-search-input');
        const query = searchInput?.value?.trim() || '';
        currentSearchQuery = query;
        
        updateFilterState();
        
        if (!query) {
            applyFiltersFromSidebar();
            return;
        }

        currentFilteredPage = 1;
        hasMoreFilteredPages = true;
        
        try {
            updateResultsDisplay(0, query, false, true);
            
            let response, endpoint;
            const params = buildFilterParams(1, 12);
            
            try {
                endpoint = `${BASE_URL}/products/filtered?${params.toString()}`;
                response = await fetch(endpoint);
            } catch (filteredError) {
                endpoint = `${BASE_URL}/search?q=${encodeURIComponent(query)}&per_page=12`;
                response = await fetch(endpoint);
            }
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const results = data.products || [];

            updateGlobalProductArrays(results);
            displayProductsInGrid(results);
            
            hasMoreFilteredPages = data.has_next || false;
            window.hasMoreFilteredPages = hasMoreFilteredPages;

            window.searchResults = results;
            window.currentSearchQuery = query;

            if (window.onSearchComplete) {
                window.onSearchComplete(results, query);
            }

            const hasActiveFilters = hasActiveNonSearchFilters();
            updateResultsDisplay(results.length, query, hasActiveFilters);
            closeFilterSidebar();

        } catch (error) {
            console.error('Search error:', error);
            updateResultsDisplay(0, query, false, false, 'Search failed. Please try again.');
        }

        updateSearchIndicator();
    }

    function updateFilterState() {
        const priceFilter = document.querySelector('input[name="price"]:checked');
        const stockFilters = Array.from(document.querySelectorAll('input[name="stock"]:checked'));
        const brandFilters = Array.from(document.querySelectorAll('.brand-option input:checked'));
        const categoryFilters = Array.from(document.querySelectorAll('.category-option input:checked'));

        currentFilters = {
            search: currentSearchQuery,
            price: priceFilter ? priceFilter.value : '',
            stock: stockFilters.map(cb => cb.value),
            brands: brandFilters.map(cb => cb.value),
            categories: categoryFilters.map(cb => cb.value)
        };
    }

    async function applyFiltersFromSidebar() {
        updateFilterState();
        
        currentFilteredPage = 1;
        hasMoreFilteredPages = true;
        
        try {
            const hasAnyFilters = hasActiveFilters();
            
            if (!hasAnyFilters) {
                window.isFilterSystemActive = false;
                
                window.searchResults = null;
                window.currentSearchQuery = '';
                
                if (window.onSearchClear) {
                    window.onSearchClear();
                }
                
                updateResultsDisplay(0, '', false, false);
                closeFilterSidebar();
                return;
            }
            
            window.isFilterSystemActive = true;
            
            updateResultsDisplay(0, currentFilters.search, hasActiveNonSearchFilters(), true);
            
            let response, data;
            const params = buildFilterParams(1, 12);
            
            try {
                response = await fetch(`${BASE_URL}/products/filtered?${params.toString()}`);
                if (!response.ok) throw new Error(`Filtered endpoint failed: ${response.status}`);
                data = await response.json();
            } catch (filteredError) {
                if (currentFilters.search) {
                    response = await fetch(`${BASE_URL}/search?q=${encodeURIComponent(currentFilters.search)}&per_page=50`);
                } else {
                    response = await fetch(`${BASE_URL}/products?per_page=50`);
                }
                
                if (!response.ok) throw new Error(`Fallback endpoint failed: ${response.status}`);
                data = await response.json();
                
                data.products = applyClientSideFilters(data.products || []);
                data.has_next = false;
            }
            
            const filteredProducts = data.products || [];
            
            updateGlobalProductArrays(filteredProducts);
            displayProductsInGrid(filteredProducts);

            hasMoreFilteredPages = data.has_next || false;
            window.hasMoreFilteredPages = hasMoreFilteredPages;
            
            if (currentFilters.search) {
                window.searchResults = filteredProducts;
                window.currentSearchQuery = currentFilters.search;
                
                if (window.onSearchComplete) {
                    window.onSearchComplete(filteredProducts, currentFilters.search);
                }
            } else {
                window.searchResults = null;
                window.currentSearchQuery = '';
            }
            
            updateResultsDisplay(filteredProducts.length, currentFilters.search, hasActiveNonSearchFilters());
            updateFilterUI();
            closeFilterSidebar();
            
        } catch (error) {
            console.error('Error applying filters:', error);
            updateResultsDisplay(0, currentFilters.search, false, false, 'Failed to apply filters. Please try again.');
        }
        updateSearchIndicator();
    }

    function applyClientSideFilters(products) {
        let filtered = [...products];
        
        if (currentFilters.price) {
            filtered = filtered.filter(product => {
                const price = product.offer_price || product.mrp || 0;
                
                switch (currentFilters.price) {
                    case 'under-1000': return price < 1000;
                    case '1000-3000': return price >= 1000 && price <= 3000;
                    case '3000-5000': return price >= 3000 && price <= 5000;
                    case 'above-5000': return price > 5000;
                    default: return true;
                }
            });
        }

        if (currentFilters.stock.length > 0) {
            filtered = filtered.filter(product => {
                const stockNumber = product.stock_number || 0;
                return currentFilters.stock.some(stockType => {
                    switch (stockType) {
                        case 'in-stock': return stockNumber > 5;
                        case 'low-stock': return stockNumber > 0 && stockNumber <= 5;
                        default: return true;
                    }
                });
            });
        }

        if (currentFilters.brands.length > 0) {
            filtered = filtered.filter(product => {
                const productName = (product.product_name || '').toLowerCase();
                const manufacturer = (product.manufacturer || '').toLowerCase();
                
                return currentFilters.brands.some(brand => {
                    const brandLower = brand.toLowerCase();
                    return productName.includes(brandLower) || manufacturer.includes(brandLower);
                });
            });
        }

        if (currentFilters.categories.length > 0) {
            filtered = filtered.filter(product => {
                return currentFilters.categories.includes(product.category);
            });
        }
        
        return filtered;
    }

    function clearAllFiltersFromSidebar() {
        window.isFilterSystemActive = false;
        
        document.querySelectorAll('input[name="price"]').forEach(input => input.checked = false);
        document.querySelectorAll('input[name="stock"]').forEach(input => input.checked = false);
        document.querySelectorAll('.brand-option input').forEach(input => input.checked = false);
        document.querySelectorAll('.category-option input').forEach(input => input.checked = false);
        
        clearSearchInput();
        
        currentFilters = {
            search: '',
            price: '',
            stock: [],
            brands: [],
            categories: []
        };
        
        currentFilteredPage = 1;
        hasMoreFilteredPages = true;

        const brandSearch = document.getElementById('brand-search');
        if (brandSearch) {
            brandSearch.value = '';
            filterBrandsInSidebar('');
        }

        window.searchResults = null;
        window.currentSearchQuery = '';
        
        if (window.onSearchClear) {
            window.onSearchClear();
        }
        
        updateFilterUI();
        closeFilterSidebar();
        updateSearchIndicator();
    }

    function updateFilterUI() {
        document.querySelectorAll('.price-range, .brand-option, .category-option, .stock-option').forEach(label => {
            label.classList.remove('filter-active');
        });

        document.querySelectorAll('input[name="price"]:checked').forEach(input => {
            input.closest('.price-range').classList.add('filter-active');
        });
        
        document.querySelectorAll('input[name="stock"]:checked').forEach(input => {
            input.closest('.stock-option').classList.add('filter-active');
        });
        
        document.querySelectorAll('.brand-option input:checked').forEach(input => {
            input.closest('.brand-option').classList.add('filter-active');
        });
        
        document.querySelectorAll('.category-option input:checked').forEach(input => {
            input.closest('.category-option').classList.add('filter-active');
        });
    }

    function updateResultsDisplay(count, query = '', isFiltered = false, isLoading = false, errorMessage = '') {
        const resultDisplay = document.querySelector('.results-count');
        if (!resultDisplay) return;

        let displayText = '';
        
        if (isLoading) {
            displayText = query ? `Searching for "${query}"...` : 'Loading products...';
        } else if (errorMessage) {
            displayText = errorMessage;
        } else if (query && query.trim()) {
            if (isFiltered) {
                displayText = `Found ${count} results for "${query}" (filtered)`;
            } else {
                displayText = `Found ${count} results for "${query}"`;
            }
        } else if (isFiltered) {
            displayText = `Found ${count} products (filtered)`;
        } else {
            displayText = `Showing ${count} products`;
        }
        
        resultDisplay.textContent = displayText;
    }

    // ===============================
    // NORMAL PRODUCT LOADING (NON-FILTERED)
    // ===============================

    // Infinite Scroll Implementation for normal products
    async function loadProducts(page = 1, append = false, isSearchMode = false) {
        if (isLoading && !isSearchMode) return;
        
        const productsGrid = document.getElementById('products-grid');
        const loadingIndicator = document.getElementById('infinite-scroll-loading');
        const endIndicator = document.getElementById('end-of-products');
        
        if (isSearchMode && window.searchResults) {
            displayProductsInGrid(window.searchResults);
            updateGlobalProductArrays(window.searchResults);
            return;
        }
        
        isLoading = true;
        
        if (page === 1 && !append) {
            if (productsGrid) productsGrid.innerHTML = '<div class="loading">Loading products...</div>';
            if (endIndicator) endIndicator.style.display = 'none';
        } else if (append && hasMoreProducts) {
            if (loadingIndicator) loadingIndicator.style.display = 'block';
        }
        
        try {
            const response = await fetch(`${BASE_URL}/products?page=${page}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data || !Array.isArray(data.products)) {
                throw new Error('Invalid response format - products array not found');
            }
            
            const { products, current_page, total_pages } = data;
            
            currentPage = current_page || 1;
            totalPages = total_pages || 1;
            hasMoreProducts = currentPage < totalPages;
            
            if (page === 1 && products.length === 0) {
                if (productsGrid) productsGrid.innerHTML = '<div class="no-products">No products available at the moment.</div>';
                if (loadingIndicator) loadingIndicator.style.display = 'none';
                if (endIndicator) endIndicator.style.display = 'none';
                isLoading = false;
                return;
            }
            
            if (append) {
                const currentProducts = window.allProducts || [];
                const updatedProducts = [...currentProducts, ...products];
                updateGlobalProductArrays(updatedProducts);
                appendProductsToGrid(products);
            } else {
                updateGlobalProductArrays(products);
                displayProductsInGrid(products);
            }
            
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            
            if (!hasMoreProducts && endIndicator) {
                endIndicator.style.display = 'block';
            }
            
        } catch (error) {
            console.error('Error loading products:', error);
            
            if (page === 1 && !append && productsGrid) {
                productsGrid.innerHTML = `
                    <div class="error">
                        Failed to load products. Please check your connection.
                        <br><small>Error: ${error.message}</small>
                        <br><button onclick="loadProducts(1, false)" style="margin-top: 10px; padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Retry</button>
                    </div>
                `;
            } else if (productsGrid) {
                const retryButton = `
                    <div class="load-more-error" style="text-align: center; padding: 20px;">
                        <p>Failed to load more products.</p>
                        <button onclick="loadMoreProducts()" style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Try Again</button>
                    </div>
                `;
                productsGrid.innerHTML += retryButton;
            }
            
            if (loadingIndicator) loadingIndicator.style.display = 'none';
        } finally {
            isLoading = false;
        }
    }

    function loadMoreProducts() {
        const errorElements = document.querySelectorAll('.load-more-error');
        errorElements.forEach(el => el.remove());
        loadProducts(currentPage + 1, true);
    }

    // Infinite scroll detection for normal products
    function setupInfiniteScroll() {
        let ticking = false;
        
        function checkScrollPosition() {
            // Simple check - if search results exist, don't load more
            if (window.searchResults) {
                ticking = false;
                return;
            }
            
            // Check for any active filters
            const searchInput = document.getElementById('product-search-input');
            if (searchInput && searchInput.value.trim()) {
                ticking = false;
                return;
            }
            
            if (document.querySelector('input[name="price"]:checked') ||
                document.querySelectorAll('input[name="stock"]:checked').length > 0 ||
                document.querySelectorAll('.brand-option input:checked').length > 0 ||
                document.querySelectorAll('.category-option input:checked').length > 0) {
                ticking = false;
                return;
            }
            
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const windowHeight = window.innerHeight;
            const documentHeight = document.documentElement.scrollHeight;
            
            const threshold = 200;
            const isNearBottom = scrollTop + windowHeight >= documentHeight - threshold;
            
            if (isNearBottom && hasMoreProducts && !isLoading) {
                loadProducts(currentPage + 1, true);
            }
            
            ticking = false;
        }
        
        function onScroll() {
            if (!ticking) {
                requestAnimationFrame(checkScrollPosition);
                ticking = true;
            }
        }
        
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll, { passive: true });
    }

    // ===============================
    // MODAL FUNCTIONS (ABBREVIATED)
    // ===============================

    // Modal history management
    function addModalToHistory() {
        if (!modalHistoryState) {
            modalHistoryState = {
                modal: true,
                timestamp: Date.now()
            };
            history.pushState(modalHistoryState, '', window.location.href);
        }
    }

    function removeModalFromHistory() {
        modalHistoryState = null;
        if (history.state && history.state.modal) {
            history.back();
        }
    }

    function handlePopState(event) {
        if (isModalOpen) {
            event.preventDefault();
            closeProductModal();
            history.pushState(null, '', window.location.href);
            return false;
        }
    }

    function selectVariant(variantData) {
        if (variantData.stock_number <= 0) {
            return;
        }
        
        selectedVariant = variantData;
        
        document.querySelectorAll('.variant-option').forEach(option => {
            option.classList.remove('selected');
        });
        
        const variantId = variantData.name.replace(/"/g, '\\"');
        const selectedElement = document.querySelector(`.variant-option[data-variant-id="${variantId}"]`);
        
        if (selectedElement && !selectedElement.classList.contains('out-of-stock')) {
            selectedElement.classList.add('selected');
        }
        
        updateModalPrice();
        updateStockDisplay();
        updateModalCartButton();
        updateModalQuoteButton();
    }

    function updateStockDisplay() {
        const stockInfo = document.getElementById('stockInfo');
        const stockText = document.getElementById('stockText');
        
        if (!stockInfo || !stockText || !currentModalProduct) return;
        
        let stockNumber;
        if (selectedVariant) {
            stockNumber = selectedVariant.stock_number;
        } else {
            stockNumber = currentModalProduct.stock_number;
        }
        
        const stock = getStockInfo(stockNumber);
        stockText.textContent = stock.text;
        stockInfo.className = `stock-info ${stock.class}`;
        
        updateModalCartButton();
    }

    function updateModalPrice() {
        const mrpElement = document.getElementById('modalMrpPrice');
        const offerElement = document.getElementById('modalOfferPrice');
        const savingsElement = document.getElementById('modalSavings');
        
        if (!currentModalProduct) return;
        
        let currentPrice, originalPrice;
        
        if (selectedVariant) {
            currentPrice = selectedVariant.price;
            originalPrice = selectedVariant.original_price || selectedVariant.mrp || currentModalProduct.mrp;
        } else {
            currentPrice = currentModalProduct.offer_price || currentModalProduct.mrp;
            originalPrice = currentModalProduct.mrp;
        }
        
        const formattedCurrentPrice = formatPrice(currentPrice);
        const formattedOriginalPrice = formatPrice(originalPrice);
        
        if (mrpElement && offerElement && savingsElement) {
            if (formattedOriginalPrice && formattedCurrentPrice && 
                parseFloat(formattedCurrentPrice) < parseFloat(formattedOriginalPrice)) {
                
                mrpElement.innerHTML = `${getCurrencySymbol()}${formattedOriginalPrice}`;
                mrpElement.style.display = 'inline';
                offerElement.innerHTML = `${getCurrencySymbol()}${formattedCurrentPrice}`;
                
                const savings = parseFloat(formattedOriginalPrice) - parseFloat(formattedCurrentPrice);
                const savingsPercent = ((savings / parseFloat(formattedOriginalPrice)) * 100).toFixed(0);
                savingsElement.innerHTML = `Save ${getCurrencySymbol()}${savings.toFixed(2)} (${savingsPercent}% off)`;
                savingsElement.style.display = 'block';
                
            } else if (formattedCurrentPrice) {
                mrpElement.style.display = 'none';
                savingsElement.style.display = 'none';
                offerElement.innerHTML = `${getCurrencySymbol()}${formattedCurrentPrice}`;
                
            } else {
                mrpElement.style.display = 'none';
                savingsElement.style.display = 'none';
                offerElement.innerHTML = 'Price on Request';
            }
        }
    }

    function updateModalCartButton() {
        const addToCartBtn = document.getElementById('modalAddToCart');
        if (!addToCartBtn || !currentModalProduct) return;
        
        const variantId = selectedVariant ? selectedVariant.name : null;
        const isAdded = isInCart(currentModalProduct.id, variantId);
        const quantity = getCartQuantity(currentModalProduct.id, variantId);
        
        let stockNumber;
        if (selectedVariant) {
            stockNumber = selectedVariant.stock_number;
        } else {
            stockNumber = currentModalProduct.stock_number;
        }
        
        const hasStock = stockNumber > 5;
        
        if (stockNumber <= 0) {
            addToCartBtn.disabled = true;
            addToCartBtn.textContent = 'OUT OF STOCK';
            addToCartBtn.style.backgroundColor = '#6c757d';
            addToCartBtn.style.cursor = 'not-allowed';
            addToCartBtn.style.display = 'none';
        } else if (!hasStock) {
            addToCartBtn.style.display = 'none';
        } else if (isAdded) {
            addToCartBtn.disabled = false;
            addToCartBtn.classList.add('added');
            addToCartBtn.textContent = `IN CART (${quantity})`;
            addToCartBtn.style.backgroundColor = '';
            addToCartBtn.style.cursor = 'pointer';
            addToCartBtn.style.display = 'inline-block';
        } else {
            addToCartBtn.disabled = false;
            addToCartBtn.classList.remove('added');
            addToCartBtn.textContent = 'ADD TO CART';
            addToCartBtn.style.backgroundColor = '';
            addToCartBtn.style.cursor = 'pointer';
            addToCartBtn.style.display = 'inline-block';
        }
    }

    function updateModalQuoteButton() {
        let requestQuoteBtn = document.getElementById('modalRequestQuote');
        
        if (!currentModalProduct) return;
        
        if (!requestQuoteBtn) {
            const modalActions = document.querySelector('.product-modal-actions');
            if (modalActions) {
                requestQuoteBtn = document.createElement('button');
                requestQuoteBtn.id = 'modalRequestQuote';
                requestQuoteBtn.className = 'product-modal-request-quote';
                requestQuoteBtn.innerHTML = '<i class="fab fa-whatsapp"></i> REQUEST QUOTE';
                modalActions.appendChild(requestQuoteBtn);
                
                requestQuoteBtn.addEventListener('click', handleModalQuoteClick);
            }
        }
        
        if (!requestQuoteBtn) return;
        
        const variantId = selectedVariant ? selectedVariant.name : null;
        const isQuoted = isInQuotation(currentModalProduct.id, variantId);
        const quantity = getQuotationQuantity(currentModalProduct.id, variantId);
        
        if (isQuoted) {
            requestQuoteBtn.classList.add('quoted');
            requestQuoteBtn.innerHTML = `<i class="fab fa-whatsapp"></i> QUOTED (${quantity})`;
        } else {
            requestQuoteBtn.classList.remove('quoted');
            requestQuoteBtn.innerHTML = '<i class="fab fa-whatsapp"></i> REQUEST QUOTE';
        }
    }

    function changeMainImage(imageUrl, thumbnailElement) {
        const mainImage = document.getElementById('modalImage');
        if (mainImage) {
            mainImage.src = getImageUrl(imageUrl);
            
            document.querySelectorAll('.gallery-thumbnail').forEach(thumb => {
                thumb.classList.remove('active');
            });
            
            if (thumbnailElement) {
                thumbnailElement.classList.add('active');
            }
        }
    }

    function openProductModal(product) {
        try {
            console.log('Opening product modal for:', product);
            currentModalProduct = product;
            selectedVariant = null;
            
            const modal = document.getElementById('productModal');
            
            if (!modal) {
                console.error('Product modal element not found');
                return;
            }
            
            addModalToHistory();
            isModalOpen = true;
            
            // Update modal content (abbreviated - include full implementation)
            const titleElement = document.getElementById('modalTitle');
            if (titleElement) titleElement.textContent = 'Product Details';
            
            const modalImage = document.getElementById('modalImage');
            const imageGallery = document.getElementById('imageGallery');
            
            if (modalImage && imageGallery) {
                const images = product.product_image_urls || [];
                
                if (images.length > 0) {
                    modalImage.src = getImageUrl(images[0]);
                    modalImage.alt = product.product_name || 'Product image';
                    
                    if (images.length > 1) {
                        imageGallery.innerHTML = images.map((img, index) => 
                            `<img src="${getImageUrl(img)}" 
                                 class="gallery-thumbnail ${index === 0 ? 'active' : ''}" 
                                 alt="Product image ${index + 1}"
                                 onclick="changeMainImage('${img}', this)">`
                        ).join('');
                        imageGallery.style.display = 'flex';
                    } else {
                        imageGallery.style.display = 'none';
                    }
                } else {
                    modalImage.src = getImageUrl(null);
                    imageGallery.style.display = 'none';
                }
            }
            
            const productTitleElement = document.getElementById('modalProductTitle');
            if (productTitleElement) {
                productTitleElement.textContent = product.product_name || 'Unnamed Product';
            }
            
            updateStockDisplay();
            
            // Handle variants
            const variantsSection = document.getElementById('variantsSection');
            const variantsList = document.getElementById('variantsList');
            
            if (variantsSection && variantsList) {
                if (product.variants && product.variants.length > 0) {
                    variantsSection.style.display = 'block';
                    variantsList.innerHTML = product.variants.map(variant => {
                        const stockInfo = getStockInfo(variant.stock_number);
                        const isOutOfStock = variant.stock_number <= 0;
                        const escapedVariantName = variant.name.replace(/"/g, '&quot;');
                        const formattedVariantPrice = formatPrice(variant.price);
                        
                        return `<div class="variant-option ${isOutOfStock ? 'out-of-stock' : ''}" 
                            data-variant-id="${escapedVariantName}"
                            onclick="${isOutOfStock ? '' : `selectVariant(${JSON.stringify(variant).replace(/"/g, '&quot;')})`}">
                            <div class="variant-name">${variant.name}</div>
                            ${formattedVariantPrice ? `<div class="variant-price">${getCurrencySymbol()}${formattedVariantPrice}</div>` : ''}
                            <div class="variant-stock ${stockInfo.class}">
                                <i class="fas fa-box"></i> ${stockInfo.text}
                            </div>
                        </div>`;
                    }).join('');
                    
                    const firstAvailableVariant = product.variants.find(v => v.stock_number > 0);
                    if (firstAvailableVariant) {
                        selectVariant(firstAvailableVariant);
                    }
                } else {
                    variantsSection.style.display = 'none';
                }
            }
            
            updateModalPrice();
            
            // ... rest of modal content setup (abbreviated for space)
            
            updateModalCartButton();
            updateModalQuoteButton();
            
            modal.style.display = 'block';
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
            
            console.log('Product modal opened successfully');
            
        } catch (error) {
            console.error('Error opening product modal:', error);
            alert('Error opening product details');
            isModalOpen = false;
            modalHistoryState = null;
        }
    }

    function closeProductModal() {
        const modal = document.getElementById('productModal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('show');
        }
        
        document.body.style.overflow = 'auto';
        
        isModalOpen = false;
        currentModalProduct = null;
        selectedVariant = null;
        modalHistoryState = null;
        
        refreshDisplay();
    }

    function handleModalQuoteClick(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (!currentModalProduct || isProcessingClick) return;
        
        try {
            // Block any WhatsApp opening completely
            if (isProcessingClick) return;
            
            isProcessingClick = true;
            setTimeout(() => {
                isProcessingClick = false;
            }, 500);
            
            // Just add to quotation - NO WhatsApp
            const existingItem = window.quotationItems.find(item => 
                item.id === currentModalProduct.id && 
                (item.selectedVariant?.name || null) === (selectedVariant?.name || null)
            );
            
            if (existingItem) {
                existingItem.quantity += 1;
            } else {
                const price = currentModalProduct.offer_price || currentModalProduct.mrp || 0;
                const finalPrice = selectedVariant ? (selectedVariant.price || price) : price;
                
                const newItem = {
                    id: currentModalProduct.id,
                    name: currentModalProduct.product_name,
                    price: parseFloat(finalPrice),
                    image: getImageUrl(currentModalProduct.product_image_urls && currentModalProduct.product_image_urls[0]),
                    category: currentModalProduct.category,
                    quantity: 1,
                    selectedVariant: selectedVariant ? {
                        name: selectedVariant.name,
                        price: selectedVariant.price,
                        sku: selectedVariant.sku || currentModalProduct.sku
                    } : null
                };
                
                window.quotationItems.push(newItem);
            }
            
            if (window.updateQuotationButton) {
                window.updateQuotationButton();
            }
            
            updateModalQuoteButton();
            
        } catch (error) {
            console.error('Error adding to quotation from modal:', error);
            alert('Error adding product to quotation');
        }
    }

    function refreshDisplay() {
        if (currentModalProduct) {
            updateModalCartButton();
            updateModalQuoteButton();
        }
    }

    // ===============================
    // EVENT LISTENER SETUP
    // ===============================

    function setupEventListeners() {
        const filterButton = document.getElementById('product-filter-search');
        if (filterButton) {
            filterButton.addEventListener('click', openFilterSidebar);
        }

        document.getElementById('close-filter-sidebar')?.addEventListener('click', closeFilterSidebar);
        filterOverlay?.addEventListener('click', closeFilterSidebar);

        const searchInput = document.getElementById('product-search-input');
        const searchBtn = document.getElementById('search-products-btn');
        const clearSearchBtn = document.getElementById('clear-search-btn');
        
        if (searchInput && searchBtn) {
            searchBtn.addEventListener('click', performSearch);
            searchInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    performSearch();
                }
            });
            
            searchInput.addEventListener('input', function(e) {
                const hasValue = e.target.value.trim().length > 0;
                if (clearSearchBtn) {
                    clearSearchBtn.style.display = hasValue ? 'flex' : 'none';
                }
                setTimeout(updateSearchIndicator, 100);
            });
        }
        
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', clearSearchInput);
        }

        const brandSearch = document.getElementById('brand-search');
        if (brandSearch) {
            brandSearch.addEventListener('input', function(e) {
                filterBrandsInSidebar(e.target.value);
            });
        }

        document.getElementById('apply-filters-btn')?.addEventListener('click', applyFiltersFromSidebar);
        document.getElementById('clear-filters-btn')?.addEventListener('click', clearAllFiltersFromSidebar);

        document.addEventListener('change', function(e) {
            if (e.target.matches('input[name="price"]') || 
                e.target.matches('input[name="stock"]') || 
                e.target.matches('.brand-option input') ||
                e.target.matches('.category-option input')) {
                updateFilterState();
                updateFilterUI();
                setTimeout(updateSearchIndicator, 100);
            }
        });

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && filterSidebar?.classList.contains('active')) {
                closeFilterSidebar();
            }
        });

        // History management
        window.addEventListener('popstate', handlePopState);
        
        window.addEventListener('beforeunload', (e) => {
            try {
                localStorage.setItem('cartItems', JSON.stringify(window.cartItems));
                localStorage.setItem('quotationItems', JSON.stringify(window.quotationItems));
            } catch (error) {
                console.log('Could not save state:', error);
            }
            
            if (isModalOpen) {
                e.preventDefault();
                return '';
            }
        });

        // Modal event listeners
        const modalAddToCartBtn = document.getElementById('modalAddToCart');
        if (modalAddToCartBtn) {
            modalAddToCartBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                if (modalAddToCartBtn.disabled || !currentModalProduct || isProcessingClick) return;
                
                try {
                    const quantity = addToCart(currentModalProduct);
                    
                    if (quantity > 0) {
                        updateModalCartButton();
                    }
                } catch (error) {
                    console.error('Error adding to cart from modal:', error);
                    alert('Error adding product to cart');
                }
            });
        }
        
        const closeBtn = document.getElementById('closeModalBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', closeProductModal);
        }
        
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape' && isModalOpen) {
                closeProductModal();
            }
        });
        
        const modal = document.getElementById('productModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeProductModal();
                }
            });
            
            const modalContent = modal.querySelector('.product-modal-content');
            if (modalContent) {
                modalContent.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
            }
        }

        console.log('✅ All event listeners attached');
    }

    // ===============================
    // CSS STYLES
    // ===============================

    const combinedStyles = document.createElement('style');
    combinedStyles.textContent = `
        .cart-actions-container {
            display: flex;
            flex-direction: row;
            gap: 8px;
            margin-top: 10px;
            align-items: stretch;
        }
        
        .cart-actions-container.quote-only {
            justify-content: center;
        }

        .cart-actions-container.quote-only .request-quote {
            flex: 1;
            max-width: none;
        }

        @media (max-width: 768px) {
            .cart-actions-container {
                flex-direction: column;
            }
        }
            
        .request-quote {
            color: white;
            padding: 12px;
            border: none;
            border-radius: 28px;
            cursor: pointer;
            font-size: 14px;
            text-align: center;
            background-color: #128c7e;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            min-height: 44px;
            transition: background-color 0.3s ease;
            user-select: none;
        }
            
        .request-quote:hover {
            background: #218838;
        }
            
        .request-quote.quoted {
            background: #155724;
        }
        
        .add-to-cart {
            user-select: none;
            transition: background-color 0.3s ease;
        }
        
        .add-to-cart:disabled,
        .request-quote:disabled {
            pointer-events: none;
            opacity: 0.6;
        }
            
        .product-modal-request-quote {
            padding: 15px;
            background: #28a745;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            margin-left: 10px;
            transition: background-color 0.3s ease;
            user-select: none;
        }
            
        .product-modal-request-quote:hover {
            background: #218838;
        }
            
        .product-modal-request-quote.quoted {
            background: #155724;
        }
        
        .stock-indicator {
            font-size: 12px;
            padding: 4px 8px;
            border-radius: 4px;
            margin-bottom: 8px;
            display: inline-block;
            width: fit-content;
        }
        
        .stock-indicator.in-stock {
            background-color: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        
        .stock-indicator.low-stock {
            background-color: #fff3cd;
            color: #856404;
            border: 1px solid #ffeaa7;
        }
        
        .stock-indicator.out-of-stock {
            background-color: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        
        .modal-stock-warning {
            background-color: #fff3cd;
            color: #856404;
            border: 1px solid #ffeaa7;
            padding: 10px;
            border-radius: 4px;
            margin-bottom: 10px;
            font-size: 14px;
        }
        
        .product-card-content {
            cursor: pointer;
        }
        
        .add-to-cart, .request-quote {
            min-height: 44px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
        }
        
        .add-to-cart {
            flex: 1;
        }
        
        .cart-actions-container button {
            min-height: 44px;
            box-sizing: border-box;
        }
        
        @media (max-width: 480px) {
            .cart-actions-container {
                flex-direction: column;
                gap: 6px;
            }
            
            .request-quote, .add-to-cart {
                width: 100%;
                padding: 10px;
                font-size: 13px;
            }
        }
    `;

    document.head.appendChild(combinedStyles);

    // ===============================
    // GLOBAL FUNCTION EXPORTS
    // ===============================

    // Make functions globally available
    window.openFilterSidebar = openFilterSidebar;
    window.closeFilterSidebar = closeFilterSidebar;
    window.updateSearchIndicator = updateSearchIndicator;
    window.setupFilteredInfiniteScroll = setupFilteredInfiniteScroll;
    window.refreshProductDisplay = refreshDisplay;
    window.refreshQuoteDisplay = refreshDisplay;
    window.loadMoreProducts = loadMoreProducts;
    window.openProductModal = openProductModal;
    window.closeProductModal = closeProductModal;
    window.loadProducts = loadProducts;
    window.selectVariant = selectVariant;
    window.changeMainImage = changeMainImage;
    window.displayProductsInGrid = displayProductsInGrid;
    window.appendProductsToGrid = appendProductsToGrid;
    window.addToCart = addToCart;
    window.addToQuotation = addToQuotation;
    window.isInCart = isInCart;
    window.isInQuotation = isInQuotation;
    window.getCartQuantity = getCartQuantity;
    window.getQuotationQuantity = getQuotationQuantity;
    window.updateModalCartButton = updateModalCartButton;
    window.updateModalQuoteButton = updateModalQuoteButton;
    window.createProductCard = createProductCard;
    window.clearSearchInput = clearSearchInput;
    window.clearAllFiltersFromSidebar = clearAllFiltersFromSidebar;

    window.retryLoadFilterOptions = function() {
        isFilterOptionsLoaded = false;
        loadFilterOptions();
    };

    window.debugTestEndpoints = debugTestEndpoints;
    
    window.filterDebugInfo = {
        getCurrentFilters: () => currentFilters,
        getAllCategories: () => allUniqueCategories,
        getAllBrands: () => allUniqueBrands,
        getFilterState: () => ({
            isLoaded: isFilterOptionsLoaded,
            hasFilters: hasActiveFilters(),
            categories: allUniqueCategories.length,
            brands: allUniqueBrands.length
        })
    };

    // Search integration callbacks
    window.onSearchComplete = function(results, query) {
        console.log(`Search completed for "${query}": ${results.length} results found`);
        window.isFilterSystemActive = true;
        updateGlobalProductArrays(results);
        window.currentSearchQuery = query;
        window.searchResults = results;
    };

    window.onSearchClear = function() {
        console.log('Search cleared, loading all products');
        window.isFilterSystemActive = false;
        window.currentSearchQuery = '';
        window.searchResults = null;
        loadProducts(1, false, false);
    };

    // ===============================
    // INITIALIZATION
    // ===============================

    function initializeCombinedSystem() {
        filterSidebar = document.getElementById('filter-sidebar');
        filterOverlay = document.getElementById('filter-sidebar-overlay');
        
        // Restore saved state
        try {
            const savedCart = localStorage.getItem('cartItems');
            const savedQuotation = localStorage.getItem('quotationItems');
            if (savedCart) window.cartItems = JSON.parse(savedCart);
            if (savedQuotation) window.quotationItems = JSON.parse(savedQuotation);
        } catch (error) {
            console.log('Could not restore saved state:', error);
        }

        // Setup unified event system
        setupEventDelegation();
        setupEventListeners();
        setupInfiniteScroll();
        setupFilteredInfiniteScroll();
        
        // Load initial products
        loadProducts(1, false);
        
        setTimeout(debugTestEndpoints, 1000);
        setTimeout(updateSearchIndicator, 500);
        
        console.log('✅ Combined Products & Filter System initialized successfully');
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeCombinedSystem);
    } else {
        setTimeout(initializeCombinedSystem, 100);
    }

    console.log('🔍 Combined system loaded and ready');

})();
