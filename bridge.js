// Integration Bridge Script
// Place this AFTER both main scripts are loaded
// This ensures proper communication between ismatproductsloader.js and filterSystem.js

(function() {
    'use strict';
    
    // Wait for both scripts to be loaded
    function waitForScripts() {
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                if (window.displayProductsInGrid && 
                    window.attachEventListeners && 
                    window.openFilterSidebar) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
        });
    }
    
    // Enhanced displayProductsInGrid that ensures event listeners
    function enhancedDisplayProductsInGrid(products) {
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
        
        // Create product cards
        const productCards = products.map(product => {
            if (window.createProductCard) {
                return window.createProductCard(product);
            }
            return '<div class="product-card">Error loading product</div>';
        }).join('');
        
        if (productsGrid) {
            productsGrid.innerHTML = productCards;
        }
        
        // CRITICAL: Always reattach event listeners for new products
        reattachEventListeners();
        
        if (window.isSearchMode && window.isSearchMode() && endIndicator) {
            endIndicator.style.display = 'block';
            endIndicator.innerHTML = '<p>End of search results</p>';
        }
    }
    
    // Function to reattach event listeners without conflicts
    function reattachEventListeners() {
        // Remove existing delegated listeners to prevent conflicts
        const existingHandler = window.handleProductCardClick;
        if (existingHandler) {
            document.removeEventListener('click', existingHandler);
        }
        
        // Reattach the event listener
        if (window.handleProductCardClick) {
            document.addEventListener('click', window.handleProductCardClick);
        } else {
            // Fallback: create a basic event handler if the main one isn't available
            document.addEventListener('click', fallbackEventHandler);
        }
        
        console.log('Event listeners reattached for filtered products');
    }
    
    // Fallback event handler in case the main one isn't available
    function fallbackEventHandler(e) {
        const target = e.target;
        const card = target.closest('.product-card');
        if (!card) return;
        
        const productId = parseInt(card.getAttribute('data-product-id'));
        if (!productId) return;
        
        const product = (window.allProducts || []).find(p => p.id === productId);
        if (!product) return;
        
        // Handle different button clicks
        if (target.classList.contains('view-details-button') || 
            target.closest('.view-details-button') ||
            target.closest('.product-card-content')) {
            e.preventDefault();
            e.stopPropagation();
            if (window.openProductModal) {
                window.openProductModal(product);
            }
            return;
        }
        
        if (target.classList.contains('add-to-cart') || 
            target.closest('.add-to-cart')) {
            e.preventDefault();
            e.stopPropagation();
            if (window.addToCart) {
                window.addToCart(product);
            }
            return;
        }
        
        if (target.classList.contains('request-quote') || 
            target.closest('.request-quote')) {
            e.preventDefault();
            e.stopPropagation();
            if (window.addToQuotation) {
                window.addToQuotation(product);
            }
            return;
        }
    }
    
    // Enhanced onSearchComplete that ensures proper integration
    function enhancedOnSearchComplete(results, query) {
        console.log(`Search completed for "${query}": ${results.length} results found`);
        
        // Update global state
        window.isFilterSystemActive = true;
        
        // Update all product arrays
        if (typeof window.originalProducts !== 'undefined') {
            window.originalProducts = results;
        }
        if (typeof window.allProducts !== 'undefined') {
            window.allProducts = results;
        }
        if (typeof window.filteredProducts !== 'undefined') {
            window.filteredProducts = results;
        }
        
        // Store search state
        window.currentSearchQuery = query;
        window.searchResults = results;
        
        // Apply filters using enhanced display
        enhancedDisplayProductsInGrid(results);
        
        // Update results display
        if (window.updateResultsDisplayText) {
            window.updateResultsDisplayText(results.length, query, false);
        }
    }
    
    // Enhanced onSearchClear
    function enhancedOnSearchClear() {
        console.log('Search cleared, loading all products');
        
        window.isFilterSystemActive = false;
        window.currentSearchQuery = '';
        window.searchResults = null;
        
        // Reload products with proper event handling
        if (window.loadProducts) {
            window.loadProducts(1, false, false);
        }
    }
    
    // Initialize integration when both scripts are ready
    waitForScripts().then(() => {
        console.log('🔗 Integrating filter system with product loader...');
        
        // Override the display function to ensure event listeners
        if (window.displayProductsInGrid) {
            window.originalDisplayProductsInGrid = window.displayProductsInGrid;
            window.displayProductsInGrid = enhancedDisplayProductsInGrid;
        }
        
        // Override search callbacks
        if (window.onSearchComplete) {
            window.originalOnSearchComplete = window.onSearchComplete;
        }
        window.onSearchComplete = enhancedOnSearchComplete;
        
        if (window.onSearchClear) {
            window.originalOnSearchClear = window.onSearchClear;
        }
        window.onSearchClear = enhancedOnSearchClear;
        
        // Make helper functions globally available
        window.reattachEventListeners = reattachEventListeners;
        window.enhancedDisplayProductsInGrid = enhancedDisplayProductsInGrid;
        
        console.log('✅ Integration bridge loaded successfully');
        
        // Test integration
        setTimeout(() => {
            const testButton = document.querySelector('.add-to-cart, .request-quote');
            if (testButton) {
                console.log('✅ Action buttons detected and should be working');
            } else {
                console.log('⚠️ No action buttons found yet - they will be handled when products load');
            }
        }, 2000);
    });
    
    // Additional safety: Monitor for products being added and reattach listeners
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                const addedNodes = Array.from(mutation.addedNodes);
                const hasProductCards = addedNodes.some(node => 
                    node.nodeType === 1 && (
                        node.classList?.contains('product-card') ||
                        node.querySelector?.('.product-card')
                    )
                );
                
                if (hasProductCards) {
                    console.log('🔄 New product cards detected, reattaching listeners...');
                    setTimeout(reattachEventListeners, 100);
                }
            }
        });
    });
    
    // Start observing when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            const productsGrid = document.getElementById('products-grid');
            if (productsGrid) {
                observer.observe(productsGrid, { childList: true, subtree: true });
            }
        });
    } else {
        const productsGrid = document.getElementById('products-grid');
        if (productsGrid) {
            observer.observe(productsGrid, { childList: true, subtree: true });
        }
    }
})();
