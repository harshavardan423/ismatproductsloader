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

    let currentFilteredPage = 1;
    let hasMoreFilteredPages = false;
    let isLoadingFiltered = false;

    const BASE_URL = 'https://admin.ismatindia.com:7000';

    function updateGlobalProductArrays(products) {
        window.allProducts = products;
        if (typeof window.originalProducts !== 'undefined') {
            window.originalProducts = products;
        }
        if (typeof window.filteredProducts !== 'undefined') {
            window.filteredProducts = products;
        }
        console.log(`Updated global product arrays with ${products.length} products`);
    }

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

    function initializeFilterSystem() {
        filterSidebar = document.getElementById('filter-sidebar');
        filterOverlay = document.getElementById('filter-sidebar-overlay');
        
        if (!filterSidebar || !filterOverlay) {
            console.error('Filter sidebar elements not found');
            return;
        }

        setupEventListeners(); 
        setupFilteredInfiniteScroll();
        
        setTimeout(debugTestEndpoints, 1000);
        setTimeout(updateSearchIndicator, 500);
        
        console.log('✅ Filter system initialized');
    }

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

        console.log('✅ All event listeners attached');
    }

    function hasActiveFilters() {
        return currentFilters.search || 
               currentFilters.price || 
               currentFilters.stock.length > 0 || 
               currentFilters.brands.length > 0 || 
               currentFilters.categories.length > 0;
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
                
                const productsGrid = document.getElementById('products-grid');
                if (productsGrid) {
                    const newProductCards = newProducts.map(product => {
                        return window.createProductCard ? window.createProductCard(product) : '';
                    }).join('');
                    
                    productsGrid.innerHTML += newProductCards;
                    
                    // CRITICAL: Ensure event listeners are attached to new cards
                    if (window.ensureEventListenersAttached) {
                        window.ensureEventListenersAttached();
                    }
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

    function hasActiveNonSearchFilters() {
        return currentFilters.price || 
               currentFilters.stock.length > 0 || 
               currentFilters.brands.length > 0 || 
               currentFilters.categories.length > 0;
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

            if (window.displayProductsInGrid) {
                window.displayProductsInGrid(filteredProducts);
            }

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

    // Export all functions to window - NO FUNCTION CALLS HERE
    window.openFilterSidebar = openFilterSidebar;
    window.closeFilterSidebar = closeFilterSidebar;
    window.updateSearchIndicator = updateSearchIndicator;
    window.setupFilteredInfiniteScroll = setupFilteredInfiniteScroll;

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

    console.log('🔍 Filter system functions exported');

    // Initialize after all functions are defined and exported
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeFilterSystem);
    } else {
        setTimeout(initializeFilterSystem, 100);
    }

})();
