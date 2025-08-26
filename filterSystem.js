let hasMoreFilteredPages = true;
let isLoadingFiltered = false;

// STEP 1: Define all functions inside IIFE but DO NOT call any of them
(function() {
    'use strict';
    
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

    // Infinite scroll state for filtered results
    let currentFilteredPage = 1;
    let hasMoreFilteredPages = false;
    let isLoadingFiltered = false;

    // Base URL for API calls
    const BASE_URL = 'https://admin.ismatindia.com:7000';

    // CRITICAL FIX: Function to sync product data between the two systems
    function updateGlobalProductArrays(products) {
        if (typeof window.allProducts !== 'undefined') {
            window.allProducts = products;
        } else {
            window.allProducts = products;
        }
        
        if (typeof window.originalProducts !== 'undefined') {
            window.originalProducts = products;
        } else {
            window.originalProducts = products;
        }
        
        if (typeof window.filteredProducts !== 'undefined') {
            window.filteredProducts = products;
        } else {
            window.filteredProducts = products;
        }
        
        console.log(`Updated global product arrays with ${products.length} products`);
    }

    // Simple specification detection
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

    // Function to update search indicator
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

    // Setup infinite scroll for filtered results
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

    // Load more filtered products for infinite scroll
    async function loadMoreFilteredProducts() {
        if (isLoadingFiltered || !hasMoreFilteredPages) return;
        
        isLoadingFiltered = true;
        const nextPage = currentFilteredPage + 1;
        
        try {
            console.log(`Loading filtered page ${nextPage}`);
            
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
                
                const productsGrid = document.getElementById('products-grid');
                if (productsGrid) {
                    const newProductCards = newProducts.map(product => {
                        return window.createProductCard ? window.createProductCard(product) : '';
                    }).join('');
                    
                    productsGrid.innerHTML += newProductCards;
                }
                
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

    // Build URL parameters for filter requests
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

    // All other functions (keeping them short here for brevity)
    function openFilterSidebar() {
        if (filterSidebar && filterOverlay) {
            filterSidebar.classList.add('active');
            filterOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            if (!isFilterOptionsLoaded) {
                loadFilterOptions();
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

    // Simplified versions of other functions
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
        
        // Basic search implementation
        try {
            const response = await fetch(`${BASE_URL}/search?q=${encodeURIComponent(query)}&per_page=12`);
            if (response.ok) {
                const data = await response.json();
                const results = data.products || [];
                updateGlobalProductArrays(results);
                if (window.displayProductsInGrid) {
                    window.displayProductsInGrid(results);
                }
                window.searchResults = results;
                window.currentSearchQuery = query;
                if (window.onSearchComplete) {
                    window.onSearchComplete(results, query);
                }
                updateResultsDisplay(results.length, query, false);
            }
        } catch (error) {
            console.error('Search error:', error);
        }
        updateSearchIndicator();
    }

    async function applyFiltersFromSidebar() {
        updateFilterState();
        const hasAnyFilters = hasActiveFilters();
        
        if (!hasAnyFilters) {
            window.isFilterSystemActive = false;
            window.searchResults = null;
            window.currentSearchQuery = '';
            if (window.onSearchClear) {
                window.onSearchClear();
            }
            closeFilterSidebar();
            return;
        }
        // Simplified filter application
        closeFilterSidebar();
        updateSearchIndicator();
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
        
        window.searchResults = null;
        window.currentSearchQuery = '';
        
        if (window.onSearchClear) {
            window.onSearchClear();
        }
        
        updateFilterUI();
        closeFilterSidebar();
        updateSearchIndicator();
    }

    // Simplified setup functions
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
        
        console.log('Event listeners attached');
    }

    function initializeFilterSystem() {
        filterSidebar = document.getElementById('filter-sidebar');
        filterOverlay = document.getElementById('filter-sidebar-overlay');
        
        if (!filterSidebar || !filterOverlay) {
            console.error('Filter sidebar elements not found');
            return;
        }

        setupEventListeners(); 
        setupFilteredInfiniteScroll();
        setTimeout(updateSearchIndicator, 500);
        
        console.log('Filter system initialized');
    }

    // Stub functions to prevent errors
    async function loadFilterOptions() {}
    async function populateCategories() {}
    async function populateBrands() {}
    function filterBrandsInSidebar() {}
    function showFilterLoadingError() {}
    async function fallbackExtractFilters() { return { categories: [], brands: [] }; }
    async function debugTestEndpoints() {}
    function applyClientSideFilters(products) { return products; }

    // Export functions to global scope - NO CALLS HERE
    window.openFilterSidebar = openFilterSidebar;
    window.closeFilterSidebar = closeFilterSidebar;
    window.updateSearchIndicator = updateSearchIndicator;
    window.setupFilteredInfiniteScroll = setupFilteredInfiniteScroll;
    window.initializeFilterSystem = initializeFilterSystem;
    
    // Debug functions
    window.retryLoadFilterOptions = function() {
        console.log('Retrying filter options...');
        loadFilterOptions();
    };
    window.debugTestEndpoints = debugTestEndpoints;
    window.filterDebugInfo = {
        getCurrentFilters: () => currentFilters,
        getFilterState: () => ({ isLoaded: isFilterOptionsLoaded })
    };

    console.log('Filter system functions exported');

})(); // END OF IIFE - Functions are now available

// STEP 2: Initialize OUTSIDE the IIFE after a delay
setTimeout(function() {
    console.log('Starting filter system initialization...');
    
    function doInitialization() {
        if (typeof window.initializeFilterSystem === 'function') {
            window.initializeFilterSystem();
        } else {
            console.error('initializeFilterSystem not available');
        }
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', doInitialization);
    } else {
        doInitialization();
    }
}, 100); // Give the IIFE time to complete
