let hasMoreFilteredPages = true;
let isLoadingFiltered = false;

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
        // Update all global arrays that the main event handlers depend on
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

    // Debug function to test endpoints
    async function debugTestEndpoints() {
        console.log('=== FILTER DEBUG TEST ===');
        
        // Test basic products endpoint
        try {
            console.log('Testing basic products endpoint...');
            const basicResponse = await fetch(`${BASE_URL}/products?page=1`);
            console.log('Basic products status:', basicResponse.status);
            
            if (basicResponse.ok) {
                const basicData = await basicResponse.json();
                console.log('✅ Basic products working:', basicData.products?.length, 'products found');
            } else {
                console.error('❌ Basic products failed:', await basicResponse.text());
            }
        } catch (error) {
            console.error('❌ Basic products error:', error);
        }
        
        // Test filter options endpoint
        try {
            console.log('Testing filter options endpoint...');
            const filterResponse = await fetch(`${BASE_URL}/products/filter-options`);
            console.log('Filter options status:', filterResponse.status);
            
            if (filterResponse.ok) {
                const filterData = await filterResponse.json();
                console.log('✅ Filter options working:', filterData);
                return filterData;
            } else {
                console.error('❌ Filter options failed:', await filterResponse.text());
                throw new Error(`Filter endpoint failed: ${filterResponse.status}`);
            }
        } catch (error) {
            console.error('❌ Filter options error:', error);
            return await fallbackExtractFilters();
        }
    }

    // Fallback method: extract filters from existing products
    async function fallbackExtractFilters() {
        console.log('🔄 Using fallback filter extraction...');
        
        try {
            let allProducts = [];
            let page = 1;
            let hasMore = true;
            
            // Load first few pages to get filter data
            while (hasMore && page <= 5) {
                const response = await fetch(`${BASE_URL}/products?page=${page}&per_page=50`);
                if (!response.ok) break;
                
                const data = await response.json();
                allProducts = allProducts.concat(data.products || []);
                hasMore = data.current_page < data.total_pages && page < 5;
                page++;
                
                console.log(`Loaded page ${page-1}, total products: ${allProducts.length}`);
            }
            
            // Extract categories and brands
            const categories = new Set();
            const brands = new Set();
            
            allProducts.forEach(product => {
                if (product.category && product.category.trim()) {
                    categories.add(product.category.trim());
                }
                
                if (product.manufacturer && product.manufacturer.trim()) {
                    const manufacturer = product.manufacturer.trim();
                    // Simple brand filtering - exclude specifications
                    if (!isSimpleSpecification(manufacturer)) {
                        brands.add(manufacturer);
                    }
                }
            });
            
            const result = {
                categories: Array.from(categories).sort(),
                brands: Array.from(brands).sort(),
                price_stats: { min: 0, max: 10000, avg: 1000 },
                stock_stats: { total: allProducts.length, in_stock: 0, low_stock: 0, out_of_stock: 0 }
            };
            
            console.log('✅ Fallback extraction successful:', {
                categories: result.categories.length,
                brands: result.brands.length
            });
            
            return result;
            
        } catch (error) {
            console.error('❌ Fallback extraction failed:', error);
            // Last resort: hardcoded defaults
            return {
                categories: ['Tools', 'Hardware', 'Electrical', 'Accessories', 'Safety Equipment'],
                brands: ['Bosch', 'Stanley', 'DeWalt', 'Black & Decker', 'Makita'],
                price_stats: { min: 0, max: 10000, avg: 1000 },
                stock_stats: { total: 100, in_stock: 80, low_stock: 15, out_of_stock: 5 }
            };
        }
    }

    // Simple specification detection
    function isSimpleSpecification(text) {
        const specPatterns = [
            /^\d+[\w]*$/,          // Numbers with units (100mm, 12V)
            /^\d+\/\d+/,           // Fractions (1/2, 3/4)
            /^\d+\.\d+/,           // Decimals (1.5V, 3.6A)
            /mm$|cm$|V$|W$|A$|kg$|g$/i, // Unit suffixes
            /^[A-Z]{2,4}\+?$/,     // Technical codes (SDS+, HSS)
            /^T\d+$/,              // TORX codes
        ];
        
        return specPatterns.some(pattern => pattern.test(text.trim()));
    }

    // Function to update search indicator
    function updateSearchIndicator() {
        const searchButton = document.querySelector('.searchbutton');
        if (!searchButton) return;
        
        // Check if search is active
        const searchInput = document.getElementById('product-search-input');
        const hasSearchText = searchInput && searchInput.value.trim();
        const hasSearchResults = window.searchResults && window.searchResults.length >= 0;
        const hasActiveFilters = document.querySelectorAll('input[name="price"]:checked, input[name="stock"]:checked, .brand-option input:checked, .category-option input:checked').length > 0;
        
        const isSearchActive = hasSearchText || hasSearchResults || hasActiveFilters;
        
        // Remove existing indicator
        const existingIndicator = searchButton.querySelector('.search-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }
        
        // Add indicator if search is active
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
            
            // Make sure the parent has relative positioning
            searchButton.style.position = 'relative';
            searchButton.appendChild(indicator);
        }
    }

    // Setup infinite scroll for filtered results
    function setupFilteredInfiniteScroll() {
        let ticking = false;
        
        function checkFilteredScrollPosition() {
            // Only work when we have search results or active filters
            const hasSearchResults = window.searchResults && window.searchResults.length >= 0;
            const hasActiveFilters = document.querySelectorAll('input[name="price"]:checked, input[name="stock"]:checked, .brand-option input:checked, .category-option input:checked').length > 0;
            const hasSearchText = document.getElementById('product-search-input') && document.getElementById('product-search-input').value.trim();
            
            if (!hasSearchResults && !hasActiveFilters && !hasSearchText) {
                ticking = false;
                return; // No filters active, don't load filtered products
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
        
        // Add the scroll listener
        window.addEventListener('scroll', onFilteredScroll, { passive: true });
        window.addEventListener('resize', onFilteredScroll, { passive: true });
        
        console.log('Filter infinite scroll enabled');
    }

    // Initialize the filter system
    function initializeFilterSystem() {
        filterSidebar = document.getElementById('filter-sidebar');
        filterOverlay = document.getElementById('filter-sidebar-overlay');
        
        if (!filterSidebar || !filterOverlay) {
            console.error('Filter sidebar elements not found');
            return;
        }

        setupEventListeners();
        setupFilteredInfiniteScroll();
        
        // Auto-test endpoints on load
        setTimeout(debugTestEndpoints, 1000);
    }

    // Setup all event listeners
    function setupEventListeners() {
        // Button to open filter
        const filterButton = document.getElementById('product-filter-search');
        if (filterButton) {
            filterButton.addEventListener('click', openFilterSidebar);
        } else {
            console.warn('Filter trigger button not found. Add: <button id="product-filter-search">Filter</button>');
        }

        // Close filter sidebar
        document.getElementById('close-filter-sidebar')?.addEventListener('click', closeFilterSidebar);
        filterOverlay?.addEventListener('click', closeFilterSidebar);

        // Search functionality
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
            });
        }
        
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', clearSearchInput);
        }

        // Brand search
        const brandSearch = document.getElementById('brand-search');
        if (brandSearch) {
            brandSearch.addEventListener('input', function(e) {
                filterBrandsInSidebar(e.target.value);
            });
        }

        // Apply and clear filters
        document.getElementById('apply-filters-btn')?.addEventListener('click', applyFiltersFromSidebar);
        document.getElementById('clear-filters-btn')?.addEventListener('click', clearAllFiltersFromSidebar);

        // Filter change listeners
        document.addEventListener('change', function(e) {
            if (e.target.matches('input[name="price"]') || 
                e.target.matches('input[name="stock"]') || 
                e.target.matches('.brand-option input') ||
                e.target.matches('.category-option input')) {
                updateFilterState();
                updateFilterUI();
            }
        });

        // Escape key to close sidebar
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && filterSidebar?.classList.contains('active')) {
                closeFilterSidebar();
            }
        });
    }

    // Check if any filters are currently active
    function hasActiveFilters() {
        return currentFilters.search || 
               currentFilters.price || 
               currentFilters.stock.length > 0 || 
               currentFilters.brands.length > 0 || 
               currentFilters.categories.length > 0;
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
                // CRITICAL: Merge with existing products and update global arrays
                const currentProducts = window.allProducts || [];
                const updatedProducts = [...currentProducts, ...newProducts];
                updateGlobalProductArrays(updatedProducts);
                
                // Get current products from the grid
                const productsGrid = document.getElementById('products-grid');
                if (productsGrid) {
                    // Create new product cards
                    const newProductCards = newProducts.map(product => {
                        return window.createProductCard ? window.createProductCard(product) : '';
                    }).join('');
                    
                    // Append to existing grid
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

    // Open filter sidebar and load options
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

    // Close filter sidebar
    function closeFilterSidebar() {
        if (filterSidebar && filterOverlay) {
            filterSidebar.classList.remove('active');
            filterOverlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    // Load filter options with enhanced error handling
    async function loadFilterOptions() {
        const categoryLoading = document.getElementById('category-loading');
        const brandLoading = document.getElementById('brand-loading');

        try {
            console.log('Loading filter options...');
            
            // Show loading state
            if (categoryLoading) {
                categoryLoading.style.display = 'block';
                categoryLoading.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading categories...';
            }
            if (brandLoading) {
                brandLoading.style.display = 'block'; 
                brandLoading.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading brands...';
            }

            // Try to get filter options
            let data;
            try {
                const response = await fetch(`${BASE_URL}/products/filter-options`);
                console.log('Filter options response:', response.status, response.statusText);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                data = await response.json();
                console.log('Filter options loaded successfully:', data);
                
            } catch (endpointError) {
                console.warn('Filter endpoint failed, using fallback:', endpointError.message);
                data = await fallbackExtractFilters();
            }
            
            // Process the data
            allUniqueCategories = data.categories || [];
            allUniqueBrands = data.brands || [];

            console.log(`Loaded ${allUniqueCategories.length} categories and ${allUniqueBrands.length} brands`);

            // Populate UI
            await populateCategories();
            await populateBrands();

            isFilterOptionsLoaded = true;

        } catch (error) {
            console.error('All filter loading methods failed:', error);
            showFilterLoadingError(categoryLoading, 'categories', error.message);
            showFilterLoadingError(brandLoading, 'brands', error.message);
        }
    }

    // Populate categories in UI
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
                console.log('✅ Categories populated:', allUniqueCategories.length);
            } else {
                categoryContainer.innerHTML = '<div style="text-align: center; color: #666; font-size: 14px;">No categories found</div>';
                categoryContainer.style.display = 'block';
            }
        } catch (error) {
            console.error('Error populating categories:', error);
            if (categoryLoading) {
                showFilterLoadingError(categoryLoading, 'categories', error.message);
            }
        }
    }

    // Populate brands in UI
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
                console.log('✅ Brands populated:', allUniqueBrands.length);
            } else {
                brandContainer.innerHTML = '<div style="text-align: center; color: #666; font-size: 14px;">No brands found</div>';
                brandContainer.style.display = 'block';
            }
        } catch (error) {
            console.error('Error populating brands:', error);
            if (brandLoading) {
                showFilterLoadingError(brandLoading, 'brands', error.message);
            }
        }
    }

    // Filter brands in sidebar
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

    // Show loading error with enhanced details and retry options
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

    // Clear search input
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

    // Perform search with fallback to regular search endpoint
    async function performSearch() {
        // IMMEDIATELY activate filter system to prevent main scroll interference
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
            
            // Try filtered endpoint first, fallback to regular search
            let response, endpoint;
            const params = buildFilterParams(1, 12);
            
            try {
                endpoint = `${BASE_URL}/products/filtered?${params.toString()}`;
                response = await fetch(endpoint);
            } catch (filteredError) {
                console.warn('Filtered endpoint failed, using basic search');
                endpoint = `${BASE_URL}/search?q=${encodeURIComponent(query)}&per_page=12`;
                response = await fetch(endpoint);
            }
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const results = data.products || [];

            // CRITICAL: Update global product arrays BEFORE displaying
            updateGlobalProductArrays(results);

            if (window.displayProductsInGrid) {
                window.displayProductsInGrid(results);
            }
            
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

    // Update filter state
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

    // Check if there are active non-search filters
    function hasActiveNonSearchFilters() {
        return currentFilters.price || 
               currentFilters.stock.length > 0 || 
               currentFilters.brands.length > 0 || 
               currentFilters.categories.length > 0;
    }

    // Apply filters from sidebar with fallbacks
    async function applyFiltersFromSidebar() {
        updateFilterState();
        
        currentFilteredPage = 1;
        hasMoreFilteredPages = true;
        
        try {
            const hasAnyFilters = hasActiveFilters();
            
            if (!hasAnyFilters) {
                // IMMEDIATELY deactivate filter system before clearing
                window.isFilterSystemActive = false;
                
                // No filters - load regular products
                window.searchResults = null;
                window.currentSearchQuery = '';
                
                if (window.onSearchClear) {
                    window.onSearchClear();
                }
                
                updateResultsDisplay(0, '', false, false);
                closeFilterSidebar();
                return;
            }
            
            // IMMEDIATELY activate filter system to prevent main scroll interference
            window.isFilterSystemActive = true;
            
            updateResultsDisplay(0, currentFilters.search, hasActiveNonSearchFilters(), true);
            
            // Try filtered endpoint with fallback
            let response, data;
            const params = buildFilterParams(1, 12);
            
            try {
                response = await fetch(`${BASE_URL}/products/filtered?${params.toString()}`);
                if (!response.ok) throw new Error(`Filtered endpoint failed: ${response.status}`);
                data = await response.json();
            } catch (filteredError) {
                console.warn('Using fallback filtering method');
                // Fallback: use basic search if available, otherwise products endpoint
                if (currentFilters.search) {
                    response = await fetch(`${BASE_URL}/search?q=${encodeURIComponent(currentFilters.search)}&per_page=50`);
                } else {
                    response = await fetch(`${BASE_URL}/products?per_page=50`);
                }
                
                if (!response.ok) throw new Error(`Fallback endpoint failed: ${response.status}`);
                data = await response.json();
                
                // Apply client-side filtering
                data.products = applyClientSideFilters(data.products || []);
                data.has_next = false; // Disable infinite scroll for client-side filtering
            }
            
            const filteredProducts = data.products || [];
            
            // CRITICAL: Update global product arrays BEFORE displaying
            updateGlobalProductArrays(filteredProducts);

            if (window.displayProductsInGrid) {
                window.displayProductsInGrid(filteredProducts);
            }

            hasMoreFilteredPages = data.has_next || false;
            window.hasMoreFilteredPages = hasMoreFilteredPages;
            
            // Update global state
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

    // Client-side filtering fallback
    function applyClientSideFilters(products) {
        let filtered = [...products];
        
        // Apply price filter
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

        // Apply stock filter
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

        // Apply brand filter
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

        // Apply category filter
        if (currentFilters.categories.length > 0) {
            filtered = filtered.filter(product => {
                return currentFilters.categories.includes(product.category);
            });
        }
        
        return filtered;
    }

    // Clear all filters
    function clearAllFiltersFromSidebar() {
        // IMMEDIATELY deactivate filter system
        window.isFilterSystemActive = false;
        
        // Clear all filter inputs
        document.querySelectorAll('input[name="price"]').forEach(input => input.checked = false);
        document.querySelectorAll('input[name="stock"]').forEach(input => input.checked = false);
        document.querySelectorAll('.brand-option input').forEach(input => input.checked = false);
        document.querySelectorAll('.category-option input').forEach(input => input.checked = false);
        
        clearSearchInput();
        
        // Reset filters
        currentFilters = {
            search: '',
            price: '',
            stock: [],
            brands: [],
            categories: []
        };
        
        // Reset pagination
        currentFilteredPage = 1;
        hasMoreFilteredPages = true;

        // Clear brand search
        const brandSearch = document.getElementById('brand-search');
        if (brandSearch) {
            brandSearch.value = '';
            filterBrandsInSidebar('');
        }

        // Reset to original state
        window.searchResults = null;
        window.currentSearchQuery = '';
        
        if (window.onSearchClear) {
            window.onSearchClear();
        }
        
        updateFilterUI();
        closeFilterSidebar();
        updateSearchIndicator();
    }

    // Update filter UI visual indicators
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

    // Update results display
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

    // Global functions for debugging and retry
    window.retryLoadFilterOptions = function() {
        console.log('🔄 Retrying filter options...');
        isFilterOptionsLoaded = false;
        loadFilterOptions();
    };

    window.debugTestEndpoints = debugTestEndpoints;
    
    // Store debug info globally for inspection
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

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeFilterSystem);
    } else {
        initializeFilterSystem();
    }

    window.openFilterSidebar = openFilterSidebar;
    window.closeFilterSidebar = closeFilterSidebar;
    
    // MOVED INSIDE IIFE - Make the problematic functions globally available
    window.updateSearchIndicator = updateSearchIndicator;
    window.setupFilteredInfiniteScroll = setupFilteredInfiniteScroll;

    // Console debugging info
    console.log(`
🔍 FILTER SYSTEM LOADED
Debug commands:
- window.debugTestEndpoints() - Test all endpoints
- window.filterDebugInfo.getFilterState() - Check filter state
- window.retryLoadFilterOptions() - Retry loading filters
    `);

    // FIXED: Move these event listeners INSIDE the IIFE to prevent reference errors
    document.addEventListener('DOMContentLoaded', function() {
        if (updateSearchIndicator) {
            updateSearchIndicator();
        }
    });

    document.addEventListener('input', function(e) {
        if (e.target && e.target.id === 'product-search-input') {
            setTimeout(() => {
                if (updateSearchIndicator) {
                    updateSearchIndicator();
                }
            }, 100);
        }
    });

    // Call it whenever checkboxes change
    document.addEventListener('change', function(e) {
        if (e.target && (e.target.name === 'price' || e.target.name === 'stock' || 
            e.target.closest('.brand-option') || e.target.closest('.category-option'))) {
            setTimeout(() => {
                if (updateSearchIndicator) {
                    updateSearchIndicator();
                }
            }, 100);
        }
    });

})();
