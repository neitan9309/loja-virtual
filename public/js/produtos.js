// ======================================================
// public/js/produtos.js
// Página de listagem/busca/filtros
// Depende de: core/utils.js, core/api.js, core/components.js
// ======================================================
(function () {
    'use strict';

    const U = window.LuxuryUtils;
    const API = window.LuxuryAPI;
    const C = window.LuxuryComponents;
    const Carousel = window.LuxuryResponsiveCarousel;

    // ==================================================
    // CONFIGURAÇÕES
    // ==================================================
    const PAGE_SIZE = 20;

    const ICONS = {
        vestuario: 'fa-tshirt',
        perfumaria: 'fa-spray-can',
        'artigos-esportivos': 'fa-running',
        'vestuario-masculino': 'fa-male',
        'vestuario-feminino': 'fa-female',
        'vestuario-infantil': 'fa-child',
        'perfumaria-masculino': 'fa-male',
        'perfumaria-feminino': 'fa-female',
        'perfumaria-unissex': 'fa-venus-mars',
        'esportivos-masculino': 'fa-male',
        'esportivos-feminino': 'fa-female',
        'esportivos-infantil': 'fa-child',
        camisas: 'fa-tshirt',
        camisetas: 'fa-tshirt',
        blusas: 'fa-tshirt',
        jaquetas: 'fa-tshirt',
        calcas: 'fa-socks',
        shorts: 'fa-socks',
        saias: 'fa-tshirt',
        vestidos: 'fa-tshirt',
        acessorios: 'fa-gem',
        tenis: 'fa-shoe-prints',
        conjuntos: 'fa-tshirt',
        'eau-de-parfum': 'fa-spray-can',
        'eau-de-toilette': 'fa-spray-can',
        colonias: 'fa-spray-can',
        kits: 'fa-gift',
    };

    function getIconForCategory(slug, name) {
        if (ICONS[slug]) return ICONS[slug];
        const lowerName = (name || '').toLowerCase();
        if (lowerName.includes('masculin')) return 'fa-male';
        if (lowerName.includes('feminin')) return 'fa-female';
        if (lowerName.includes('infantil')) return 'fa-child';
        if (lowerName.includes('unissex')) return 'fa-venus-mars';
        if (lowerName.includes('camis')) return 'fa-tshirt';
        if (lowerName.includes('calç')) return 'fa-socks';
        if (lowerName.includes('tênis') || lowerName.includes('tenis')) return 'fa-shoe-prints';
        if (lowerName.includes('perfum') || lowerName.includes('colôn')) return 'fa-spray-can';
        return 'fa-tag';
    }

    // ======================================================
    // HELPERS DE URL
    // ======================================================
    function currentQuery() {
        return U.getQueryParams();
    }

    function buildFilterState(q) {
        // Aceita múltiplos brands separados por vírgula
        const brands = (q.brand || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);

        // Aceita múltiplas flags separadas por vírgula OU booleanos
        const flagsStr = (q.flags || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);

        // Compatibilidade: se vierem como flags individuais na URL (ex: ?on_sale=true)
        const individualFlags = [];
        if (q.on_sale === 'true') individualFlags.push('on_sale');
        if (q.is_new === 'true') individualFlags.push('is_new');
        if (q.featured === 'true') individualFlags.push('featured');
        if (q.best_seller === 'true') individualFlags.push('best_seller');

        const allFlags = Array.from(new Set([...flagsStr, ...individualFlags]));

        return {
            category: q.category || null,
            brands,
            flags: allFlags, // array: ['on_sale', 'is_new', ...]
            min_price: q.min_price || '',
            max_price: q.max_price || '',
            sort: q.sort || 'created_at_desc',
            search: q.search || null,
            filter: q.filter || null,
        };
    }

    function stateToQuery(state) {
        const q = {};

        if (state.category) q.category = state.category;
        if (state.brands && state.brands.length > 0) q.brand = state.brands.join(',');
        if (state.flags && state.flags.length > 0) q.flags = state.flags.join(',');
        if (state.min_price) q.min_price = state.min_price;
        if (state.max_price) q.max_price = state.max_price;
        if (state.sort && state.sort !== 'created_at_desc') q.sort = state.sort;
        if (state.search) q.search = state.search;
        if (state.filter) q.filter = state.filter;

        return q;
    }

    function updateURL(state, replace = false) {
        const q = stateToQuery(state);
        const search = new URLSearchParams(q).toString();
        const newURL = `/produtos${search ? '?' + search : ''}`;

        if (replace) {
            window.history.replaceState({}, '', newURL);
        } else {
            window.history.pushState({}, '', newURL);
        }
    }

    function parseSort(sortValue) {
        // 'price_asc' → { sort: 'price', order: 'asc' }
        const parts = (sortValue || 'created_at_desc').split('_');
        const order = parts.pop();
        const sort = parts.join('_');
        return { sort, order: order.toUpperCase() };
    }

    // ======================================================
    // FILTROS (UI + estado + URL)
    // ======================================================
    const ProductsFilters = {
        state: null,
        categoriesTree: [],
        brands: [],
        expandedCategories: new Set(), // IDs de categorias expandidas

        // ==================================================
        // INIT
        // ==================================================
        async init(state) {
            this.state = state;

            this.bindEvents();
            await Promise.all([
                this.loadCategoriesTree(),
                this.loadBrands(),
            ]);

            this.renderCategoryTree();
            this.renderBrands();
            this.renderBadges();          // ← ADICIONAR
            this.syncPriceInputs();
            this.syncSortSelect();
            this.renderActiveChips();
            this.updateFiltersBadge();
        },

        // ==================================================
        // CARREGAR DADOS
        // ==================================================
        async loadCategoriesTree() {
            try {
                this.categoriesTree = await API.get('/categories/tree-full', {
                    useCache: true,
                    ttl: 5 * 60 * 1000,
                });
            } catch (error) {
                console.error('Erro ao carregar categorias:', error);
                this.categoriesTree = [];
            }
        },

        async loadBrands() {
            try {
                this.brands = await API.get('/brands', {
                    useCache: true,
                    ttl: 5 * 60 * 1000,
                });
            } catch (error) {
                console.error('Erro ao carregar marcas:', error);
                this.brands = [];
            }
        },

        // ==================================================
        // RENDER — Árvore de categorias
        // ==================================================
        renderCategoryTree() {
            const container = document.getElementById('filterCategories');
            if (!container) return;

            if (this.categoriesTree.length === 0) {
                container.innerHTML = '<div class="filter-loading">Nenhuma categoria</div>';
                return;
            }

            const html = this.categoriesTree
                .map((root) => this.renderCategoryNode(root, 0))
                .join('');

            container.innerHTML = html;
        },

        renderCategoryNode(node, level) {
            const hasChildren = node.children && node.children.length > 0;
            const isExpanded = this.expandedCategories.has(node.id);
            const isActive = this.state.category === node.slug;

            const toggleHtml = hasChildren
                ? `<button type="button" class="cat-toggle ${isExpanded ? 'open' : ''}"
                          data-category-id="${node.id}"
                          aria-label="${isExpanded ? 'Recolher' : 'Expandir'}">
                      <i class="fas fa-chevron-right"></i>
                   </button>`
                : '<span class="cat-toggle-placeholder"></span>';

            const childrenHtml = hasChildren && isExpanded
                ? `<div class="filter-category-children">
                       ${node.children.map((c) => this.renderCategoryNode(c, level + 1)).join('')}
                   </div>`
                : '';

            return `
                <div class="filter-category-item">
                    <div class="filter-category-label ${isActive ? 'active' : ''}">
                        ${toggleHtml}
                        <span class="cat-name" data-category-slug="${U.escapeAttr(node.slug)}" role="button" tabindex="0">
                            ${U.escapeHtml(node.name)}
                        </span>
                    </div>
                    ${childrenHtml}
                </div>
            `;
        },

        // ==================================================
        // RENDER — Checklist de marcas
        // ==================================================
        renderBrands() {
            const container = document.getElementById('filterBrands');
            if (!container) return;

            if (this.brands.length === 0) {
                container.innerHTML = '<div class="filter-loading">Nenhuma marca</div>';
                return;
            }

            container.innerHTML = this.brands
                .map((b) => {
                    const checked = this.state.brands.includes(String(b.id));
                    return `
                        <label class="filter-check-item">
                            <input type="checkbox" value="${b.id}" ${checked ? 'checked' : ''}
                                   data-brand-id="${b.id}">
                            <span class="check-label">${U.escapeHtml(b.name)}</span>
                        </label>
                    `;
                })
                .join('');
        },

                // ==================================================
        // RENDER — Checkboxes de Destaques
        // ==================================================
        renderBadges() {
            const container = document.getElementById('filterBadges');
            if (!container) return;

            container.querySelectorAll('input[data-badge-flag]').forEach((cb) => {
                const flag = cb.dataset.badgeFlag;
                cb.checked = this.state.flags.includes(flag);
            });
        },

        // ==================================================
        // RENDER — Chips de filtros ativos
        // ==================================================
        // ==================================================
        // RENDER — Chips de filtros ativos
        // ==================================================
        renderActiveChips() {
            const container = document.getElementById('activeFilters');
            if (!container) return;

            const chips = [];

            // Categoria
            if (this.state.category) {
                const found = this.findCategoryBySlug(this.state.category);
                const label = found?.name || this.state.category;
                chips.push({
                    type: 'category',
                    value: this.state.category,
                    label: `Categoria: <strong>${U.escapeHtml(label)}</strong>`,
                });
            }

            // Marcas
            this.state.brands.forEach((brandId) => {
                const brand = this.brands.find((b) => String(b.id) === String(brandId));
                if (brand) {
                    chips.push({
                        type: 'brand',
                        value: brandId,
                        label: `Marca: <strong>${U.escapeHtml(brand.name)}</strong>`,
                    });
                }
            });

            // Destaques (flags)
            const FLAG_LABELS = {
                on_sale: 'Em promoção',
                is_new: 'Novidades',
                featured: 'Em destaque',
                best_seller: 'Mais vendidos',
            };
            this.state.flags.forEach((flag) => {
                if (FLAG_LABELS[flag]) {
                    chips.push({
                        type: 'flag',
                        value: flag,
                        label: `<strong>${FLAG_LABELS[flag]}</strong>`,
                    });
                }
            });

            // Preço
            if (this.state.min_price && this.state.max_price) {
                chips.push({
                    type: 'price',
                    value: 'range',
                    label: `Preço: <strong>R$ ${this.state.min_price} – R$ ${this.state.max_price}</strong>`,
                });
            } else if (this.state.min_price) {
                chips.push({
                    type: 'price',
                    value: 'min',
                    label: `Preço: <strong>≥ R$ ${this.state.min_price}</strong>`,
                });
            } else if (this.state.max_price) {
                chips.push({
                    type: 'price',
                    value: 'max',
                    label: `Preço: <strong>≤ R$ ${this.state.max_price}</strong>`,
                });
            }

            // Busca
            if (this.state.search) {
                chips.push({
                    type: 'search',
                    value: this.state.search,
                    label: `Busca: <strong>"${U.escapeHtml(this.state.search)}"</strong>`,
                });
            }

            // Filtro especial (new, best_seller, featured)
            if (this.state.filter) {
                const labels = {
                    new: 'Lançamentos',
                    best_seller: 'Mais vendidos',
                    featured: 'Em promoção',
                };
                chips.push({
                    type: 'filter',
                    value: this.state.filter,
                    label: `Filtro: <strong>${labels[this.state.filter] || this.state.filter}</strong>`,
                });
            }

            if (chips.length === 0) {
                container.style.display = 'none';
                container.innerHTML = '';
                return;
            }

            container.style.display = 'flex';
            container.innerHTML =
                chips.map((c) =>
                    `<span class="filter-chip">${c.label}
                        <button type="button" data-remove-chip="${c.type}" data-chip-value="${U.escapeAttr(c.value)}"
                                aria-label="Remover filtro">
                            <i class="fas fa-times"></i>
                        </button>
                     </span>`
                ).join('') +
                `<button type="button" class="active-filters-clear" id="clearAllFilters">
                    Limpar tudo
                 </button>`;
        },

        // ==================================================
        // SYNC UI com estado
        // ==================================================
        syncPriceInputs() {
            const minInput = document.getElementById('filterPriceMin');
            const maxInput = document.getElementById('filterPriceMax');
            if (minInput) minInput.value = this.state.min_price || '';
            if (maxInput) maxInput.value = this.state.max_price || '';
        },

        syncSortSelect() {
            const select = document.getElementById('sortSelect');
            if (select) select.value = this.state.sort || 'created_at_desc';
        },

        updateFiltersBadge() {
            const badge = document.getElementById('filtersCountBadge');
            if (!badge) return;

            let count = 0;
            if (this.state.category) count++;
            count += this.state.brands.length;
            count += this.state.flags.length;
            if (this.state.min_price || this.state.max_price) count++;
            if (this.state.filter) count++;

            if (count > 0) {
                badge.textContent = count;
                badge.hidden = false;
            } else {
                badge.hidden = true;
            }
        },

        // ==================================================
        // HELPERS
        // ==================================================
        findCategoryBySlug(slug, nodes = null) {
            if (!nodes) nodes = this.categoriesTree;
            for (const node of nodes) {
                if (node.slug === slug) return node;
                if (node.children) {
                    const found = this.findCategoryBySlug(slug, node.children);
                    if (found) return found;
                }
            }
            return null;
        },

        // ==================================================
        // EVENTOS
        // ==================================================
        bindEvents() {
            // Filtros accordion (expandir/recolher grupos)
            document.querySelectorAll('.filter-group-toggle').forEach((btn) => {
                btn.addEventListener('click', () => {
                    const expanded = btn.getAttribute('aria-expanded') === 'true';
                    btn.setAttribute('aria-expanded', expanded ? 'false' : 'true');
                });
            });

            // Árvore de categorias — expandir/recolher + selecionar
            document.getElementById('filterCategories')?.addEventListener('click', (e) => {
                // Expandir/recolher
                const toggle = e.target.closest('.cat-toggle');
                if (toggle) {
                    const id = parseInt(toggle.dataset.categoryId);
                    if (this.expandedCategories.has(id)) {
                        this.expandedCategories.delete(id);
                    } else {
                        this.expandedCategories.add(id);
                    }
                    this.renderCategoryTree();
                    return;
                }

                // Selecionar categoria
                const name = e.target.closest('.cat-name');
                if (name) {
                    const slug = name.dataset.categorySlug;
                    this.selectCategory(slug);
                }
            });

            // Marcas
            document.getElementById('filterBrands')?.addEventListener('change', (e) => {
                const cb = e.target.closest('input[type="checkbox"][data-brand-id]');
                if (!cb) return;

                const brandId = cb.dataset.brandId;
                const idx = this.state.brands.indexOf(brandId);
                if (cb.checked && idx === -1) {
                    this.state.brands.push(brandId);
                } else if (!cb.checked && idx !== -1) {
                    this.state.brands.splice(idx, 1);
                }
                this.commit();
            });

                        // Destaques (flags)
            document.getElementById('filterBadges')?.addEventListener('change', (e) => {
                const cb = e.target.closest('input[data-badge-flag]');
                if (!cb) return;

                const flag = cb.dataset.badgeFlag;
                const idx = this.state.flags.indexOf(flag);
                if (cb.checked && idx === -1) {
                    this.state.flags.push(flag);
                } else if (!cb.checked && idx !== -1) {
                    this.state.flags.splice(idx, 1);
                }
                this.commit();
            });

            // Aplicar preço
            document.getElementById('btnApplyPrice')?.addEventListener('click', () => {
                const min = document.getElementById('filterPriceMin')?.value || '';
                const max = document.getElementById('filterPriceMax')?.value || '';
                this.state.min_price = min;
                this.state.max_price = max;
                this.commit();
            });

            // Ordenação
            document.getElementById('sortSelect')?.addEventListener('change', (e) => {
                this.state.sort = e.target.value;
                this.commit();
            });

            // Chips — remover individual
            document.getElementById('activeFilters')?.addEventListener('click', (e) => {
                const removeBtn = e.target.closest('[data-remove-chip]');
                if (removeBtn) {
                    this.removeChip(removeBtn.dataset.removeChip, removeBtn.dataset.chipValue);
                    return;
                }
                if (e.target.closest('#clearAllFilters')) {
                    this.clearAll();
                }
            });

            // Limpar tudo
            document.getElementById('btnClearFilters')?.addEventListener('click', () => {
                this.clearAll();
            });

            // Drawer mobile
            document.getElementById('btnFiltersToggle')?.addEventListener('click', () => {
                this.openDrawer();
            });
            document.getElementById('filtersClose')?.addEventListener('click', () => {
                this.closeDrawer();
            });
            document.getElementById('filtersOverlay')?.addEventListener('click', () => {
                this.closeDrawer();
            });
        },

        // ==================================================
        // AÇÕES
        // ==================================================
        selectCategory(slug) {
            // Se já está selecionada, remove
            this.state.category = this.state.category === slug ? null : slug;
            this.commit();
        },

        removeChip(type, value) {
            if (type === 'category') {
                this.state.category = null;
            } else if (type === 'brand') {
                const idx = this.state.brands.indexOf(value);
                if (idx !== -1) this.state.brands.splice(idx, 1);
            } else if (type === 'flag') {
                const idx = this.state.flags.indexOf(value);
                if (idx !== -1) this.state.flags.splice(idx, 1);
            } else if (type === 'price') {
                this.state.min_price = '';
                this.state.max_price = '';
            } else if (type === 'search') {
                this.state.search = null;
            } else if (type === 'filter') {
                this.state.filter = null;
            }
            this.commit();
        },

        clearAll() {
            // Preserva o "contexto" da página (categoria, busca, filtro especial)
            // Só limpa o que o usuário aplicou manualmente via sidebar
            this.state.brands = [];
            this.state.flags = [];
            this.state.min_price = '';
            this.state.max_price = '';
            this.state.sort = 'created_at_desc';
            this.commit();
        },

        /**
         * Aplica o estado atual: atualiza URL + UI + produtos
         */
        commit() {
            updateURL(this.state, false);
            this.renderCategoryTree();
            this.renderBrands();
            this.renderBadges();          // ← ADICIONAR
            this.syncPriceInputs();
            this.syncSortSelect();
            this.renderActiveChips();
            this.updateFiltersBadge();

            ProductsPage.onFiltersChange(this.state);
        },

        openDrawer() {
            document.getElementById('filtersSidebar')?.classList.add('open');
            document.getElementById('filtersOverlay')?.classList.add('active');
            document.body.style.overflow = 'hidden';
        },

        closeDrawer() {
            document.getElementById('filtersSidebar')?.classList.remove('open');
            document.getElementById('filtersOverlay')?.classList.remove('active');
            document.body.style.overflow = '';
        },
    };

    // ======================================================
    // PÁGINA PRINCIPAL
    // ======================================================
    const ProductsPage = {
        tree: [],
        currentCategory: null,
        categoryPath: [],
        filter: null,
        searchQuery: null,
        filterState: null,
        currentPage: 1,
        currentProducts: [],
        totalProducts: 0,
        loadingMore: false,

        // ==================================================
        // INIT
        // ==================================================
        async init() {
            this.parseQueryString();
            await this.loadCategoryTree();

            // Preenche ProductsFilters depois de carregar categorias
            await ProductsFilters.init(this.filterState);

            await this.render();
            this.bindLoadMore();
            this.bindPopState();
        },

        parseQueryString() {
            const params = U.getQueryParams();
            this.currentCategory = params.category || null;
            this.filter = params.filter || null;
            this.searchQuery = params.search || null;
            this.filterState = buildFilterState(params);
        },

        async loadCategoryTree() {
            try {
                this.tree = await API.get('/categories/tree-full', {
                    useCache: true,
                    ttl: 5 * 60 * 1000,
                });
            } catch (error) {
                console.error('Erro ao carregar categorias:', error);
                this.tree = [];
            }
        },

        // ==================================================
        // CONTEXTO — o que mostrar?
        // ==================================================
        /**
         * Decide se está no modo "categorias" (só listando categorias)
         * ou no modo "produtos" (listando produtos com filtros).
         */
        isProductsMode() {
            // Se tem busca ou filtro → modo produtos
            if (this.searchQuery) return true;
            if (this.filter) return true;

            // Se tem categoria: precisa ver se é folha
            if (this.currentCategory) {
                const found = this.findCategoryBySlug(this.currentCategory);
                if (!found) return false; // categoria inválida → modo categorias (not found)
                return !found.node.children || found.node.children.length === 0;
            }

            // Sem categoria, sem busca, sem filtro → home de categorias
            return false;
        },

        updateToolbarVisibility() {
            const toolbar = document.getElementById('productsToolbar');
            const layout = document.getElementById('productsLayout');
            const activeFilters = document.getElementById('activeFilters');
            const loadMoreWrapper = document.getElementById('loadMoreWrapper');
            const inProductsMode = this.isProductsMode();

            if (inProductsMode) {
                toolbar.style.display = 'flex';
                layout.classList.remove('no-sidebar');
                activeFilters.style.display = 'flex';
            } else {
                toolbar.style.display = 'none';
                layout.classList.add('no-sidebar');
                activeFilters.style.display = 'none';
                loadMoreWrapper.style.display = 'none';
            }
        },

        // ==================================================
        // RENDER
        // ==================================================
        async render() {
            const container = document.getElementById('contentContainer');
            if (!container) return;

            container.innerHTML = C.renderLoading('Carregando...');
            this.currentPage = 1;
            this.currentProducts = [];
            this.totalProducts = 0;

            this.updateToolbarVisibility();

            if (this.searchQuery && !this.currentCategory && !this.filter) {
                return this.renderSearchResults();
            }

            if (this.filter && !this.currentCategory) {
                return this.renderFilteredProducts();
            }

            if (!this.currentCategory && this.filterState.brands.length === 0 &&
                !this.filterState.min_price && !this.filterState.max_price) {
                return this.renderRootCategories();
            }

            if (!this.currentCategory) {
                // Tem filtros (marca/preço) mas nenhuma categoria → mostra produtos filtrados
                return this.renderProductsWithFilters();
            }

            const found = this.findCategoryBySlug(this.currentCategory);
            if (!found) {
                return this.renderNotFound();
            }

            this.categoryPath = found.path;
            const { node } = found;

            if (node.children && node.children.length > 0) {
                return this.renderCategoryChildren(node);
            }

            return this.renderProductsOfCategory(node);
        },

        // ==================================================
        // MODO CATEGORIAS (não usa filtros)
        // ==================================================
        renderRootCategories() {
            this.updateBreadcrumb([{ name: 'Início', url: '/' }]);
            this.updatePageHeader('Produtos', 'Explore nossa coleção exclusiva');

            const container = document.getElementById('contentContainer');
            const wrapper = this.buildCarouselWrapper('categories-grid');
            const grid = wrapper.querySelector('.categories-grid');
            grid.innerHTML = this.tree.map((cat) => this.buildCategoryCard(cat)).join('');
            container.innerHTML = '';
            container.appendChild(wrapper);

            Carousel.setup({
                grid,
                dotsContainer: wrapper.querySelector('.carousel-dots-generic'),
                prevBtn: wrapper.querySelector('.carousel-prev-generic'),
                nextBtn: wrapper.querySelector('.carousel-next-generic'),
                total: this.tree.length,
            });
        },

        renderCategoryChildren(category) {
            const breadcrumbItems = [{ name: 'Início', url: '/' }];
            this.categoryPath.forEach((item, idx) => {
                const isLast = idx === this.categoryPath.length - 1;
                breadcrumbItems.push({
                    name: item.name,
                    url: isLast ? null : `/categoria?category=${item.slug}`,
                });
            });

            this.updateBreadcrumb(breadcrumbItems);
            this.updatePageHeader(category.name, category.description || `Explore ${category.name}`);

            const container = document.getElementById('contentContainer');
            const wrapper = this.buildCarouselWrapper('categories-grid');
            const grid = wrapper.querySelector('.categories-grid');
            grid.innerHTML = category.children
                .map((child) => this.buildCategoryCard(child))
                .join('');
            container.innerHTML = '';
            container.appendChild(wrapper);

            Carousel.setup({
                grid,
                dotsContainer: wrapper.querySelector('.carousel-dots-generic'),
                prevBtn: wrapper.querySelector('.carousel-prev-generic'),
                nextBtn: wrapper.querySelector('.carousel-next-generic'),
                total: category.children.length,
            });
        },

        buildCategoryCard(category) {
            return C.renderCategoryCard(category, {
                icon: getIconForCategory(category.slug, category.name),
                href: `/categoria?category=${category.slug}`,
                arrowLabel: category.children?.length > 0 ? 'Escolher' : 'Ver produtos',
            });
        },

        // ==================================================
        // MODO PRODUTOS (usa filtros)
        // ==================================================
        async renderProductsOfCategory(category) {
            const breadcrumbItems = [{ name: 'Início', url: '/' }];
            this.categoryPath.forEach((item, idx) => {
                const isLast = idx === this.categoryPath.length - 1;
                breadcrumbItems.push({
                    name: item.name,
                    url: isLast ? null : `/categoria?category=${item.slug}`,
                });
            });

            this.updateBreadcrumb(breadcrumbItems);
            this.updatePageHeader(category.name, category.description || `Produtos em ${category.name}`);

            await this.fetchAndRenderProducts({ category: category.slug }, true);
        },

        async renderSearchResults() {
            const query = this.searchQuery;

            this.updateBreadcrumb([
                { name: 'Início', url: '/' },
                { name: `Busca: "${query}"`, url: null },
            ]);
            this.updatePageHeader(`Resultados para "${query}"`, 'Produtos encontrados com base na sua busca');

            await this.fetchAndRenderProducts({ search: query }, true);
        },

        async renderFilteredProducts() {
            const filterLabels = {
                new: { title: 'Lançamentos', subtitle: 'Os produtos mais recentes da coleção', params: { new: true } },
                best_seller: { title: 'Mais Vendidos', subtitle: 'Os produtos com maior número de vendas', params: { best_seller: true } },
                featured: { title: 'Em Promoção', subtitle: 'Produtos com desconto ativo', params: { on_sale: true } },
            };

            const label = filterLabels[this.filter] || { title: 'Produtos', subtitle: 'Confira nossa coleção', params: {} };

            this.updateBreadcrumb([
                { name: 'Início', url: '/' },
                { name: label.title, url: null },
            ]);
            this.updatePageHeader(label.title, label.subtitle);

            await this.fetchAndRenderProducts(label.params, true);
        },

        async renderProductsWithFilters() {
            // Está na home mas com filtros (marca, preço)
            this.updateBreadcrumb([
                { name: 'Início', url: '/' },
                { name: 'Produtos filtrados', url: null },
            ]);
            this.updatePageHeader('Produtos filtrados', 'Resultados com base nos filtros aplicados');

            await this.fetchAndRenderProducts({}, true);
        },

        // ==================================================
        // FETCH DE PRODUTOS
        // ==================================================
        async fetchAndRenderProducts(extraParams = {}, reset = true) {
            const container = document.getElementById('contentContainer');
            const loadMoreWrapper = document.getElementById('loadMoreWrapper');
            if (!container) return;

            if (reset) {
                container.innerHTML = C.renderLoading('Carregando produtos...');
                loadMoreWrapper.style.display = 'none';
            } else {
                this.loadingMore = true;
                const btn = document.getElementById('btnLoadMore');
                if (btn) {
                    btn.disabled = true;
                    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Carregando...';
                }
            }

            try {
                const offset = (this.currentPage - 1) * PAGE_SIZE;
                const { sort, order } = parseSort(this.filterState.sort);

                const params = {
                    limit: PAGE_SIZE,
                    offset,
                    sort,
                    order,
                    ...extraParams,
                };

                if (this.filterState.brands.length > 0) {
                    // Backend aceita 1 marca; se tiver várias, vamos fazer múltiplas requisições?
                    // Por simplicidade, se tiver múltiplas, passamos só a primeira e avisamos
                    if (this.filterState.brands.length === 1) {
                        params.brand = this.filterState.brands[0];
                    } else {
                        // Múltiplas marcas: busca cada uma e combina (client-side)
                        // Simplificação: só envia a primeira por enquanto
                        params.brand = this.filterState.brands[0];
                    }
                }
                // Destaques (flags)
                if (this.filterState.flags && this.filterState.flags.length > 0) {
                    if (this.filterState.flags.includes('on_sale')) params.on_sale = true;
                    if (this.filterState.flags.includes('is_new')) params.is_new = true;
                    if (this.filterState.flags.includes('featured')) params.featured = true;
                    if (this.filterState.flags.includes('best_seller')) params.best_seller = true;
                }
                if (this.filterState.min_price) params.min_price = this.filterState.min_price;
                if (this.filterState.max_price) params.max_price = this.filterState.max_price;

                const data = await API.get(`/products?${new URLSearchParams(params).toString()}`);
                const products = data.products || [];
                const total = data.pagination?.total || 0;

                if (reset) {
                    this.currentProducts = products;
                    this.totalProducts = total;
                    this.renderProducts(products, true);
                } else {
                    this.currentProducts = [...this.currentProducts, ...products];
                    this.renderProducts(this.currentProducts, false);
                }

                // Contador
                document.getElementById('resultsCount').textContent = this.totalProducts;

                // Botão "Carregar mais"
                const hasMore = this.currentProducts.length < this.totalProducts;
                if (hasMore) {
                    loadMoreWrapper.style.display = 'flex';
                } else {
                    loadMoreWrapper.style.display = 'none';
                }
            } catch (error) {
                console.error('Erro ao carregar produtos:', error);
                if (reset) {
                    container.innerHTML = C.renderEmptyState({
                        icon: 'fa-exclamation-triangle',
                        title: 'Erro ao carregar produtos',
                        message: 'Tente novamente em alguns instantes.',
                    });
                }
            } finally {
                this.loadingMore = false;
                const btn = document.getElementById('btnLoadMore');
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-plus"></i> Carregar mais';
                }
            }
        },

        renderProducts(products, reset) {
            const container = document.getElementById('contentContainer');
            if (!container) return;

            if (products.length === 0) {
                if (reset) {
                    container.innerHTML = C.renderEmptyState({
                        icon: 'fa-box-open',
                        title: 'Nenhum produto encontrado',
                        message: 'Tente ajustar os filtros ou explorar outras categorias.',
                    });
                }
                return;
            }

            if (reset) {
                container.innerHTML = '<div class="products-grid-page"></div>';
            }

            const grid = container.querySelector('.products-grid-page');
            if (!grid) return;

            if (reset) {
                grid.innerHTML = products.map((p) => this.buildProductCard(p)).join('');
            } else {
                // Append apenas os novos
                const existing = grid.querySelectorAll('.product-card').length;
                const newProducts = products.slice(existing);
                grid.insertAdjacentHTML('beforeend', newProducts.map((p) => this.buildProductCard(p)).join(''));
            }
        },

        buildProductCard(product) {
            return C.renderProductCard(product, {
                showShortDesc: true,
                showButton: true,
                buttonText: 'Ver Produto',
                clickableCard: true,
                href: `/produto/${product.slug}`,
            });
        },

        // ==================================================
        // PAGINAÇÃO
        // ==================================================
        bindLoadMore() {
            const btn = document.getElementById('btnLoadMore');
            if (!btn || btn.dataset.bound === 'true') return;
            btn.dataset.bound = 'true';

            btn.addEventListener('click', async () => {
                if (this.loadingMore) return;
                this.currentPage++;
                await this.onLoadMore();
            });
        },

        async onLoadMore() {
            // Repete o contexto atual com a próxima página
            if (this.searchQuery && !this.currentCategory && !this.filter) {
                await this.fetchAndRenderProducts({ search: this.searchQuery }, false);
            } else if (this.filter && !this.currentCategory) {
                const filterLabels = {
                    new: { params: { new: true } },
                    best_seller: { params: { best_seller: true } },
                    featured: { params: { on_sale: true } },
                };
                const p = filterLabels[this.filter]?.params || {};
                await this.fetchAndRenderProducts(p, false);
            } else if (this.currentCategory) {
                const found = this.findCategoryBySlug(this.currentCategory);
                if (found) {
                    await this.fetchAndRenderProducts({ category: this.currentCategory }, false);
                }
            } else {
                await this.fetchAndRenderProducts({}, false);
            }
        },

        // ==================================================
        // CALLBACK DE MUDANÇA DE FILTRO
        // ==================================================
        onFiltersChange(newState) {
            this.filterState = newState;
            this.currentCategory = newState.category;
            this.searchQuery = newState.search;
            this.filter = newState.filter;
            this.currentPage = 1;

            // Re-render
            this.render();
        },

        // ==================================================
        // HISTORY (back/forward do navegador)
        // ==================================================
        bindPopState() {
            if (this._popBound) return;
            this._popBound = true;

            window.addEventListener('popstate', () => {
                this.parseQueryString();
                ProductsFilters.state = this.filterState;
                ProductsFilters.renderCategoryTree();
                ProductsFilters.renderBrands();
                ProductsFilters.syncPriceInputs();
                ProductsFilters.syncSortSelect();
                ProductsFilters.renderActiveChips();
                ProductsFilters.updateFiltersBadge();
                this.currentPage = 1;
                this.render();
            });
        },

        // ==================================================
        // HELPERS
        // ==================================================
        findCategoryBySlug(slug, nodes = null, path = []) {
            if (!nodes) nodes = this.tree;
            for (const node of nodes) {
                const newPath = [...path, node];
                if (node.slug === slug) return { node, path: newPath };
                if (node.children && node.children.length > 0) {
                    const found = this.findCategoryBySlug(slug, node.children, newPath);
                    if (found) return found;
                }
            }
            return null;
        },

        buildCarouselWrapper(gridClass = 'products-grid-page') {
            const wrapper = document.createElement('div');
            wrapper.className = 'carousel-wrapper-generic';
            wrapper.innerHTML = `
                <button type="button" class="carousel-btn-generic carousel-prev-generic" aria-label="Anterior" hidden>
                    <i class="fas fa-arrow-left"></i>
                </button>
                <div class="carousel-viewport-generic">
                    <div class="${gridClass}"></div>
                </div>
                <button type="button" class="carousel-btn-generic carousel-next-generic" aria-label="Próximo" hidden>
                    <i class="fas fa-arrow-right"></i>
                </button>
                <div class="carousel-dots-generic" role="tablist" hidden></div>
            `;
            return wrapper;
        },

        updateBreadcrumb(items) {
            const breadcrumb = document.getElementById('breadcrumb');
            if (!breadcrumb) return;
            breadcrumb.innerHTML = C.renderBreadcrumb(items);
        },

        updatePageHeader(title, subtitle) {
            const titleEl = document.getElementById('pageTitle');
            const subtitleEl = document.getElementById('pageSubtitle');
            if (titleEl) titleEl.textContent = title;
            if (subtitleEl) subtitleEl.textContent = subtitle;
            document.title = `${title} - Luxury Store`;
        },

        renderNotFound() {
            this.updateBreadcrumb([
                { name: 'Início', url: '/' },
                { name: 'Categoria não encontrada', url: null },
            ]);
            this.updatePageHeader('Categoria não encontrada', 'A categoria que você procura não existe');

            const container = document.getElementById('contentContainer');
            container.innerHTML = C.renderEmptyState({
                icon: 'fa-search',
                title: 'Categoria não encontrada',
                message: 'A categoria que você procura não existe ou foi removida.',
                cta: { href: '/produtos', label: 'Ver todas as categorias' },
            });
        },
    };

    // ======================================================
    // INICIALIZAÇÃO
    // ======================================================
    document.addEventListener('DOMContentLoaded', () => {
        ProductsPage.init();
    });
})();