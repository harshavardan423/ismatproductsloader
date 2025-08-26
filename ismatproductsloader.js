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
let allProducts = [];

// Modal history management
let modalHistoryState = null;
let isModalOpen = false;

// Event listener management
let mainEventListenerAttached = false;
let isProcessingClick = false;

// Base URL for images
const BASE_URL = 'https://admin.ismatindia.com:7000';

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
    
    // Generate WhatsApp message
    const variantText = selectedVariant ? ` (${selectedVariant.name})` : '';
    const message = `Hi, I'm interested in ${product.product_name}${variantText}`;
    const whatsappNumber = product.whatsapp_number || '917738096075';
    const whatsappUrl = `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
    
    // Open WhatsApp in new tab
    window.open(whatsappUrl, '_blank');
    
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
// FILTER FUNCTIONS
// ===============================

// Function to update results display text
function updateResultsDisplayText(count, query = '', isFiltered = false) {
    // Find the results display element - adjust selector based on your HTML
    const possibleSelectors = [
        '.search-results-header', 
        '.results-count', 
        '.search-results-text',
        '.products-header',
        '.filter-results-text',
        '[class*="result"]',
        '[class*="count"]'
    ];
    
    let resultsDisplay = null;
    for (const selector of possibleSelectors) {
        resultsDisplay = document.querySelector(selector);
        if (resultsDisplay) break;
    }
    
    if (!resultsDisplay) {
        console.log('No results display element found');
        return;
    }
    
    let displayText = '';
    
    if (query && query.trim()) {
        // Search mode
        if (isFiltered) {
            displayText = `Found ${count} results for "${query}" (filtered)`;
        } else {
            displayText = `Found ${count} results for "${query}"`;
        }
    } else if (isFiltered) {
        // Filter mode (no search)
        const priceFilters = document.querySelectorAll('input[name="price"]:checked');
        const brandFilters = document.querySelectorAll('.brand-options input[type="checkbox"]:checked');
        
        let filterText = [];
        
        if (brandFilters.length > 0) {
            const brandNames = Array.from(brandFilters).map(cb => cb.value);
            if (brandNames.length === 1) {
                filterText.push(`brand: ${brandNames[0]}`);
            } else {
                filterText.push(`${brandNames.length} brands`);
            }
        }
        
        if (priceFilters.length > 0) {
            filterText.push('price range');
        }
        
        if (filterText.length > 0) {
            displayText = `Found ${count} products (filtered by ${filterText.join(', ')})`;
        } else {
            displayText = `Showing ${count} products`;
        }
    } else {
        // No search, no filters
        displayText = `Showing ${count} products`;
    }
    
    // Update the display
    resultsDisplay.textContent = displayText;
    console.log('Updated results display:', displayText);
}

// Function to apply filters
function applyFilters() {
    const priceFilters = document.querySelectorAll('input[name="price"]:checked');
    const brandFilters = document.querySelectorAll('.brand-options input[type="checkbox"]:checked');
    
    // Get the products to filter (either search results or original products)
    const sourceProducts = window.searchResults || originalProducts;
    
    let filtered = [...sourceProducts];
    const hasActiveFilters = priceFilters.length > 0 || brandFilters.length > 0;
    
    // Apply price filters
    if (priceFilters.length > 0) {
        filtered = filtered.filter(product => {
            const price = product.offer_price || product.mrp || 0;
            
            return Array.from(priceFilters).some(filter => {
                const filterText = filter.parentElement.textContent.trim();
                
                if (filterText.includes('Under â‚¹1,000')) {
                    return price < 1000;
                } else if (filterText.includes('â‚¹1,000 - â‚¹3,000')) {
                    return price >= 1000 && price <= 3000;
                } else if (filterText.includes('â‚¹3,000 - â‚¹5,000')) {
                    return price >= 3000 && price <= 5000;
                } else if (filterText.includes('Above â‚¹5,000')) {
                    return price > 5000;
                }
                return true;
            });
        });
    }
    
    // Apply brand filters
    if (brandFilters.length > 0) {
        const selectedBrands = Array.from(brandFilters).map(cb => cb.value.toLowerCase());
        filtered = filtered.filter(product => {
            const productName = (product.product_name || '').toLowerCase();
            const manufacturer = (product.manufacturer || '').toLowerCase();
            const category = (product.category || '').toLowerCase();
            
            return selectedBrands.some(brand => 
                productName.includes(brand) || 
                manufacturer.includes(brand) || 
                category.includes(brand)
            );
        });
    }
    
    // Update filteredProducts and display
    filteredProducts = filtered;
    allProducts = filtered;
    displayProductsInGrid(filtered);
    
    // Update results display text
    const currentQuery = window.currentSearchQuery || '';
    updateResultsDisplayText(filtered.length, currentQuery, hasActiveFilters);
    
    // Update filter UI
    updateFilterUI();
}

// Function to filter brands in the sidebar
function filterBrands(searchTerm) {
    const brandOptions = document.querySelectorAll('.brand-options label');
    const term = searchTerm.toLowerCase();
    
    brandOptions.forEach(option => {
        const brandName = option.textContent.toLowerCase();
        if (brandName.includes(term)) {
            option.style.display = 'block';
        } else {
            option.style.display = 'none';
        }
    });
}

// Function to update filter UI
function updateFilterUI() {
    // Add visual indication for active filters
    const priceFilters = document.querySelectorAll('input[name="price"]:checked');
    const brandFilters = document.querySelectorAll('.brand-options input[type="checkbox"]:checked');
    
    // Reset filter styles
    document.querySelectorAll('.price-range').forEach(label => {
        label.classList.remove('filter-active');
    });
    document.querySelectorAll('.brand-options label').forEach(label => {
        label.classList.remove('filter-active');
    });
    
    // Highlight active filters
    priceFilters.forEach(filter => {
        filter.parentElement.classList.add('filter-active');
    });
    brandFilters.forEach(filter => {
        filter.parentElement.classList.add('filter-active');
    });
}

// Function to clear all filters
function clearAllFilters() {
    // Clear price filters
    document.querySelectorAll('input[name="price"]').forEach(input => {
        input.checked = false;
    });
    
    // Clear brand filters
    document.querySelectorAll('.brand-options input[type="checkbox"]').forEach(input => {
        input.checked = false;
    });
    
    // Clear brand search
    const brandSearch = document.querySelector('.search-brands .search-input');
    if (brandSearch) {
        brandSearch.value = '';
        filterBrands(''); // Show all brands
    }
    
    // Apply filters (which will show all products)
    applyFilters();
}

// ===============================
// VARIANT AND MODAL FUNCTIONS
// ===============================

// Function to handle variant selection
function selectVariant(variantData) {
    // Don't allow selection of out-of-stock variants
    if (variantData.stock_number <= 0) {
        return;
    }
    
    selectedVariant = variantData;
    
    // Update variant UI
    document.querySelectorAll('.variant-option').forEach(option => {
        option.classList.remove('selected');
    });
    
    // Use attribute selector with escaped quotes
    const variantId = variantData.name.replace(/"/g, '\\"');
    const selectedElement = document.querySelector(`.variant-option[data-variant-id="${variantId}"]`);
    
    if (selectedElement && !selectedElement.classList.contains('out-of-stock')) {
        selectedElement.classList.add('selected');
    }
    
    // Update price display
    updateModalPrice();
    
    // Update stock display
    updateStockDisplay();
    
    // Update cart button state
    updateModalCartButton();
    
    // Update quote button state
    updateModalQuoteButton();
}

// Function to update stock display in modal
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
    
    // Update add to cart button availability
    updateModalCartButton();
}

// FIXED: Function to update modal price based on selected variant
function updateModalPrice() {
    const mrpElement = document.getElementById('modalMrpPrice');
    const offerElement = document.getElementById('modalOfferPrice');
    const savingsElement = document.getElementById('modalSavings');
    
    if (!currentModalProduct) return;
    
    // Get current prices based on variant or product
    let currentPrice, originalPrice;
    
    if (selectedVariant) {
        currentPrice = selectedVariant.price;
        originalPrice = selectedVariant.original_price || selectedVariant.mrp || currentModalProduct.mrp;
    } else {
        currentPrice = currentModalProduct.offer_price || currentModalProduct.mrp;
        originalPrice = currentModalProduct.mrp;
    }
    
    // Format prices safely
    const formattedCurrentPrice = formatPrice(currentPrice);
    const formattedOriginalPrice = formatPrice(originalPrice);
    
    if (mrpElement && offerElement && savingsElement) {
        // Check if we have a valid discount scenario
        if (formattedOriginalPrice && formattedCurrentPrice && 
            parseFloat(formattedCurrentPrice) < parseFloat(formattedOriginalPrice)) {
            
            // Show discounted price
            mrpElement.innerHTML = `${getCurrencySymbol()}${formattedOriginalPrice}`;
            mrpElement.style.display = 'inline';
            offerElement.innerHTML = `${getCurrencySymbol()}${formattedCurrentPrice}`;
            
            const savings = parseFloat(formattedOriginalPrice) - parseFloat(formattedCurrentPrice);
            const savingsPercent = ((savings / parseFloat(formattedOriginalPrice)) * 100).toFixed(0);
            savingsElement.innerHTML = `Save ${getCurrencySymbol()}${savings.toFixed(2)} (${savingsPercent}% off)`;
            savingsElement.style.display = 'block';
            
        } else if (formattedCurrentPrice) {
            // Show regular price
            mrpElement.style.display = 'none';
            savingsElement.style.display = 'none';
            offerElement.innerHTML = `${getCurrencySymbol()}${formattedCurrentPrice}`;
            
        } else {
            // No valid price available
            mrpElement.style.display = 'none';
            savingsElement.style.display = 'none';
            offerElement.innerHTML = 'Price on Request';
        }
    }
}

// Function to update modal cart button state
function updateModalCartButton() {
    const addToCartBtn = document.getElementById('modalAddToCart');
    if (!addToCartBtn || !currentModalProduct) return;
    
    const variantId = selectedVariant ? selectedVariant.name : null;
    const isAdded = isInCart(currentModalProduct.id, variantId);
    const quantity = getCartQuantity(currentModalProduct.id, variantId);
    
    // Check stock availability
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

// Function to update modal quote button state
function updateModalQuoteButton() {
    let requestQuoteBtn = document.getElementById('modalRequestQuote');
    
    if (!currentModalProduct) return;
    
    if (!requestQuoteBtn) {
        // Create the quote button if it doesn't exist
        const modalActions = document.querySelector('.product-modal-actions');
        if (modalActions) {
            requestQuoteBtn = document.createElement('button');
            requestQuoteBtn.id = 'modalRequestQuote';
            requestQuoteBtn.className = 'product-modal-request-quote';
            requestQuoteBtn.innerHTML = '<i class="fab fa-whatsapp"></i> REQUEST QUOTE';
            modalActions.appendChild(requestQuoteBtn);
            
            // Add event listener
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
    
    // Show stock warning for cart button if needed
    const addToCartBtn = document.getElementById('modalAddToCart');
    if (addToCartBtn && currentModalProduct) {
        const stockNumber = currentModalProduct.stock_number || 0;
        const hasStock = stockNumber > 5;
        
        if (!hasStock) {
            addToCartBtn.style.display = 'none';
            
            // Add stock warning if it doesn't exist
            let stockWarning = document.getElementById('modalStockWarning');
            if (!stockWarning) {
                stockWarning = document.createElement('div');
                stockWarning.id = 'modalStockWarning';
                stockWarning.className = 'modal-stock-warning';
                if (stockNumber <= 0) {
                    stockWarning.innerHTML = '<i class="fas fa-exclamation-triangle"></i> This item is currently out of stock. Please request a quote for availability.';
                } else {
                    stockWarning.innerHTML = '<i class="fas fa-exclamation-circle"></i> Limited stock available. Please request a quote for bulk orders.';
                }
                addToCartBtn.parentNode.insertBefore(stockWarning, addToCartBtn);
            }
        } else {
            const stockWarning = document.getElementById('modalStockWarning');
            if (stockWarning) {
                stockWarning.remove();
            }
        }
    }
}

// Function to change main product image
function changeMainImage(imageUrl, thumbnailElement) {
    const mainImage = document.getElementById('modalImage');
    if (mainImage) {
        mainImage.src = getImageUrl(imageUrl);
        
        // Update active thumbnail
        document.querySelectorAll('.gallery-thumbnail').forEach(thumb => {
            thumb.classList.remove('active');
        });
        
        if (thumbnailElement) {
            thumbnailElement.classList.add('active');
        }
    }
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
// MODAL MANAGEMENT
// ===============================

// History management functions for modal navigation
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

// Handle browser back/forward button
function handlePopState(event) {
    if (isModalOpen) {
        event.preventDefault();
        closeProductModal();
        history.pushState(null, '', window.location.href);
        return false;
    }
}

// Modal functions with history management
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
        
        // Update modal content
        const titleElement = document.getElementById('modalTitle');
        if (titleElement) titleElement.textContent = 'Product Details';
        
        // Handle multiple images
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
        
        // Description
        const descriptionElement = document.getElementById('modalDescription');
        if (descriptionElement) {
            const description = product.long_description || 
                `${product.product_name || 'Product'} - Professional quality product with excellent performance and durability.`;
            descriptionElement.textContent = description;
        }
        
        // Short description
        const shortDescElement = document.getElementById('modalShortDescription');
        if (shortDescElement) {
            const shortDescription = product.short_description || 'Additional product details available on request.';
            shortDescElement.textContent = shortDescription;
        }
        
        // PDF Links
        const pdfSection = document.getElementById('modalPdfSection');
        const pdfLinksContainer = document.getElementById('modalPdfLinks');
        
        if (pdfSection && pdfLinksContainer) {
            if (product.download_pdfs && product.download_pdfs.length > 0) {
                pdfSection.style.display = 'block';
                pdfLinksContainer.innerHTML = product.download_pdfs
                    .map(pdf => `<a href="${getPdfUrl(pdf)}" class="download-pdf" target="_blank">${pdf.split('/').pop()}</a>`)
                    .join('');
            } else {
                pdfSection.style.display = 'none';
            }
        }
        
        // YouTube Links
        const youtubeSection = document.getElementById('modalYoutubeSection');
        const youtubeLinksContainer = document.getElementById('modalYoutubeLinks');
        
        if (youtubeSection && youtubeLinksContainer) {
            const productName = product.product_name || 'Product';
            
            if (product.youtube_links && product.youtube_links.length > 0) {
                youtubeSection.style.display = 'block';
                youtubeLinksContainer.innerHTML = product.youtube_links
                    .map(link => createYouTubeEmbed(link, productName))
                    .join('');
            } else {
                youtubeSection.style.display = 'block';
                const searchUrl = createYouTubeSearchUrl(productName);
                youtubeLinksContainer.innerHTML = `
                    <a href="${searchUrl}" target="_blank" class="product-youtube-link">
                        <div class="youtube-video-container">
                            <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRkY0NDQ0Ii8+Cjx0ZXh0IHg9IjE1MCIgeT0iOTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IndoaXRlIiBmb250LXNpemU9IjE2IiBmb250LWZhbWlseT0iQXJpYWwiPllvdVR1YmU8L3RleHQ+Cjx0ZXh0IHg9IjE1MCIgeT0iMTEwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSIgZm9udC1zaXplPSIxNCIgZm9udC1mYW1pbHk9IkFyaWFsIj5TZWFyY2g8L3RleHQ+PC9zdmc+" alt="YouTube Search" class="youtube-thumbnail">
                            <div class="youtube-play-overlay">
                                <div class="youtube-play-icon"></div>
                            </div>
                            <div class="youtube-video-title">Search "${productName}" on YouTube</div>
                        </div>
                    </a>
                `;
            }
        }
        
        updateModalCartButton();
        updateModalQuoteButton();
        
        // WhatsApp button
        const whatsappBtn = document.getElementById('modalWhatsapp');
        if (whatsappBtn) {
            if (product.whatsapp_number) {
                const variantText = selectedVariant ? ` (${selectedVariant.name})` : '';
                whatsappBtn.href = `https://wa.me/${product.whatsapp_number.replace(/[^0-9]/g, '')}?text=Hi, I'm interested in ${encodeURIComponent(product.product_name + variantText)}`;
                whatsappBtn.style.display = 'inline-block';
            } else {
                whatsappBtn.style.display = 'none';
            }
        }
        
        // Show modal
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
    
    // Reset modal state
    isModalOpen = false;
    currentModalProduct = null;
    selectedVariant = null;
    modalHistoryState = null;
    
    // Refresh the product grid display
    refreshDisplay();
    
    // Remove any lingering event listeners
    const modalElements = document.querySelectorAll('.modal *');
    modalElements.forEach(element => {
        const oldElement = element;
        const newElement = element.cloneNode(true);
        if (oldElement.parentNode) {
            oldElement.parentNode.replaceChild(newElement, oldElement);
        }
    });
}

// ===============================
// PRODUCT DISPLAY AND LOADING
// ===============================

// Function to display products in grid
function displayProductsInGrid(products) {
    const productsGrid = document.getElementById('products-grid');
    const loadingIndicator = document.getElementById('infinite-scroll-loading');
    const endIndicator = document.getElementById('end-of-products');
    
    if (loadingIndicator) loadingIndicator.style.display = 'none';
    if (endIndicator) endIndicator.style.display = 'none';
    
    if (products.length === 0) {
        const isSearchMode = window.isSearchMode && window.isSearchMode();
        const message = isSearchMode ? 
            'No products found matching your search criteria.' : 
            'No products found matching your filters.';
        
        if (productsGrid) {
            productsGrid.innerHTML = `
                <div class="no-results-message">
                    <i class="fas fa-search"></i>
                    <h3>No Results Found</h3>
                    <p>${message}</p>
                    ${isSearchMode ? 
                        '<button onclick="window.clearSearch && window.clearSearch()" style="padding: 10px 20px; background: #dc2626; color: white; border: none; border-radius: 6px; cursor: pointer;">Clear Search</button>' : 
                        '<button onclick="clearAllFilters()" style="padding: 10px 20px; background: #dc2626; color: white; border: none; border-radius: 6px; cursor: pointer;">Clear Filters</button>'
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
    
    // Only attach event listeners once
    if (!mainEventListenerAttached) {
        attachEventListeners();
        mainEventListenerAttached = true;
    }
    
    if (window.isSearchMode && window.isSearchMode() && endIndicator) {
        endIndicator.style.display = 'block';
        endIndicator.innerHTML = '<p>End of search results</p>';
    }
}

// Infinite Scroll Implementation
async function loadProducts(page = 1, append = false, isSearchMode = false) {
    if (isLoading && !isSearchMode) return;
    
    const productsGrid = document.getElementById('products-grid');
    const loadingIndicator = document.getElementById('infinite-scroll-loading');
    const endIndicator = document.getElementById('end-of-products');
    
    if (isSearchMode && window.searchResults) {
        displayProductsInGrid(window.searchResults);
        originalProducts = window.searchResults;
        allProducts = window.searchResults;
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
        const response = await fetch(`https://admin.ismatindia.com:7000/products?page=${page}`);
        
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
            originalProducts = [...originalProducts, ...products];
            allProducts = [...allProducts, ...products];
        } else {
            originalProducts = products;
            allProducts = products;
        }
        
        if (page === 1 && !append) {
            applyFilters();
        } else {
            displayProductsInGrid(allProducts);
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

// Infinite scroll detection
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
// EVENT HANDLING
// ===============================

function handleModalQuoteClick(e) {
    e.preventDefault();
    e.stopPropagation();
    
    if (!currentModalProduct || isProcessingClick) return;
    
    try {
        const quantity = addToQuotation(currentModalProduct);
        updateModalQuoteButton();
        
    } catch (error) {
        console.error('Error adding to quotation from modal:', error);
        alert('Error adding product to quotation');
    }
}

// FIXED: Single event listener attachment to prevent multiple listeners
function attachEventListeners() {
    // Use event delegation with a single listener on document
    document.addEventListener('click', handleProductCardClick);
}

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
    
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    
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
        
        const quantity = addToQuotation(product);
        return;
    }
}

function showSuccessMessage(button, message, revertText = null) {
    // Only show messages for quote buttons, not cart buttons
    if (button.classList.contains('request-quote')) {
        const originalHTML = button.innerHTML;
        button.innerHTML = `<i class="fas fa-check"></i> ${message}`;
        setTimeout(() => {
            if (revertText) {
                button.innerHTML = `<i class="fab fa-whatsapp"></i> ${revertText}`;
            } else {
                button.innerHTML = originalHTML;
            }
        }, 1000);
    }
}

function refreshDisplay() {
    // Only update modal buttons if modal is open
    if (currentModalProduct) {
        updateModalCartButton();
        updateModalQuoteButton();
    }
}

// ===============================
// SEARCH INTEGRATION
// ===============================

window.onSearchComplete = function(results, query) {
    console.log(`Search completed for "${query}": ${results.length} results found`);
    
    // IMMEDIATELY activate filter system
    window.isFilterSystemActive = true;
    
    originalProducts = results;
    allProducts = results;
    filteredProducts = results;
    
    // Store search state
    window.currentSearchQuery = query;
    window.searchResults = results;
    
    applyFilters();
};

window.onSearchClear = function() {
    console.log('Search cleared, loading all products');
    
    // IMMEDIATELY deactivate filter system
    window.isFilterSystemActive = false;
    
    window.currentSearchQuery = '';
    window.searchResults = null;
    loadProducts(1, false, false);
};

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
window.refreshProductDisplay = refreshDisplay;
window.refreshQuoteDisplay = refreshDisplay;
window.loadMoreProducts = loadMoreProducts;
window.openProductModal = openProductModal;
window.closeProductModal = closeProductModal;
window.loadProducts = loadProducts;
window.selectVariant = selectVariant;
window.changeMainImage = changeMainImage;
window.displayProductsInGrid = displayProductsInGrid;
window.applyFilters = applyFilters;
window.clearAllFilters = clearAllFilters;
window.addToCart = addToCart;
window.addToQuotation = addToQuotation;
window.isInCart = isInCart;
window.isInQuotation = isInQuotation;
window.getCartQuantity = getCartQuantity;
window.getQuotationQuantity = getQuotationQuantity;
window.updateModalCartButton = updateModalCartButton;
window.updateModalQuoteButton = updateModalQuoteButton;
window.updateResultsDisplayText = updateResultsDisplayText;

// Make accessors available
window.currentModalProduct = () => currentModalProduct;
window.selectedVariant = () => selectedVariant;
window.allProducts = () => allProducts;

// ===============================
// INITIALIZATION
// ===============================

document.addEventListener('DOMContentLoaded', () => {
    try {
        // Restore saved state
        try {
            const savedCart = localStorage.getItem('cartItems');
            const savedQuotation = localStorage.getItem('quotationItems');
            if (savedCart) window.cartItems = JSON.parse(savedCart);
            if (savedQuotation) window.quotationItems = JSON.parse(savedQuotation);
        } catch (error) {
            console.log('Could not restore saved state:', error);
        }
        
        // Setup history management
        window.addEventListener('popstate', handlePopState);
        
        window.addEventListener('beforeunload', (e) => {
            // Save state
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
        
        // Load initial products
        loadProducts(1, false);
        
        // Setup infinite scroll
        setupInfiniteScroll();
        
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
        
        // Close button
        const closeBtn = document.getElementById('closeModalBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', closeProductModal);
        }
        
        // Close modal with Escape key
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape' && isModalOpen) {
                closeProductModal();
            }
        });
        
        // Close modal on background click
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
        
        console.log('Combined Products & Quotation component initialized successfully');
        
    } catch (error) {
        console.error('Error during initialization:', error);
    }
});


