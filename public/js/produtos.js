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

    // ==================================================
    // ÍCONES POR CATEGORIA
    // ==================================================
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

    // ==================================================
    // PÁGINA
    // ==================================================
    const ProductsPage = {
        tree: [],
        currentCategory: null,
        categoryPath: [],
        filter: null,
        searchQuery: null,

        async init() {
            this.parseQueryString();
            await this.loadCategoryTree();
            await this.render();
        },

        parseQueryString() {
            const params = U.getQueryParams();
            this.currentCategory = params.category || null;
            this.filter = params.filter || null;
            this.searchQuery = params.search || null;
        },

        async loadCategoryTree() {
            try {
                // ✅ Cache compartilhado (mesmo do categoria.js)
                this.tree = await API.get('/categories/tree-full', {
                    useCache: true,
                    ttl: 5 * 60 * 1000,
                });
            } catch (error) {
                console.error('Erro ao carregar categorias:', error);
                this.tree = [];
            }
        },

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

        async render() {
            const container = document.getElementById('contentContainer');
            if (!container) return;

            container.innerHTML = C.renderLoading('Carregando...');

            // Busca por texto tem prioridade
            if (this.searchQuery && !this.currentCategory && !this.filter) {
                return this.renderSearchResults();
            }

            if (this.filter && !this.currentCategory) {
                return this.renderFilteredProducts();
            }

            if (!this.currentCategory) {
                return this.renderRootCategories();
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
        // CATEGORIAS RAIZ
        // ==================================================
        renderRootCategories() {
            this.updateBreadcrumb([{ name: 'Início', url: '/' }]);
            this.updatePageHeader('Produtos', 'Explore nossa coleção exclusiva');

            const container = document.getElementById('contentContainer');
            const grid = document.createElement('div');
            grid.className = 'categories-grid';

            grid.innerHTML = this.tree.map((cat) => this.buildCategoryCard(cat)).join('');
            container.innerHTML = '';
            container.appendChild(grid);
        },

        // ==================================================
        // FILHOS DE CATEGORIA
        // ==================================================
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
            this.updatePageHeader(
                category.name,
                category.description || `Explore ${category.name}`
            );

            const container = document.getElementById('contentContainer');
            const grid = document.createElement('div');
            grid.className = 'categories-grid';

            grid.innerHTML = category.children
                .map((child) => this.buildCategoryCard(child))
                .join('');
            container.innerHTML = '';
            container.appendChild(grid);
        },

        // ==================================================
        // CARD DE CATEGORIA (usa LuxuryComponents)
        // ==================================================
        buildCategoryCard(category) {
            return C.renderCategoryCard(category, {
                icon: getIconForCategory(category.slug, category.name),
                href: `/categoria?category=${category.slug}`,
                arrowLabel: category.children?.length > 0 ? 'Escolher' : 'Ver produtos',
            });
        },

        // ==================================================
        // PRODUTOS DE UMA CATEGORIA FOLHA
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
            this.updatePageHeader(
                category.name,
                category.description || `Produtos em ${category.name}`
            );

            const container = document.getElementById('contentContainer');
            container.innerHTML = C.renderLoading('Carregando produtos...');

            try {
                const data = await API.get(`/products?category=${category.slug}&limit=100`);
                const products = data.products || [];

                container.innerHTML = '';

                if (products.length === 0) {
                    container.innerHTML = C.renderEmptyState({
                        icon: 'fa-box-open',
                        title: 'Nenhum produto encontrado',
                        message: 'Ainda não temos produtos cadastrados nesta categoria. Volte em breve!',
                    });
                    return;
                }

                const grid = document.createElement('div');
                grid.className = 'products-grid-page';
                grid.innerHTML = products.map((p) => this.buildProductCard(p)).join('');
                container.appendChild(grid);
            } catch (error) {
                console.error('Erro ao carregar produtos:', error);
                container.innerHTML = C.renderEmptyState({
                    icon: 'fa-exclamation-triangle',
                    title: 'Erro ao carregar produtos',
                    message: 'Tente novamente em alguns instantes.',
                });
            }
        },

        // ==================================================
        // PRODUTOS FILTRADOS
        // ==================================================
        async renderFilteredProducts() {
            const filterLabels = {
                new: { title: 'Lançamentos', subtitle: 'Os produtos mais recentes da coleção' },
                best_seller: { title: 'Mais Vendidos', subtitle: 'Os produtos com maior número de vendas' },
                featured: { title: 'Em Promoção', subtitle: 'Produtos com desconto ativo' },
            };

            const label = filterLabels[this.filter] || { title: 'Produtos', subtitle: 'Confira nossa coleção' };

            this.updateBreadcrumb([
                { name: 'Início', url: '/' },
                { name: label.title, url: null },
            ]);
            this.updatePageHeader(label.title, label.subtitle);

            const container = document.getElementById('contentContainer');
            container.innerHTML = C.renderLoading('Carregando produtos...');

            try {
                let url = '/products?limit=100';
                if (this.filter === 'new') url += '&new=true&sort=created_at&order=DESC';
                if (this.filter === 'best_seller') url += '&best_seller=true&sort=sales_count&order=DESC';
                if (this.filter === 'featured') url += '&on_sale=true&sort=discount_percent&order=DESC';

                const data = await API.get(url);
                const products = data.products || [];

                container.innerHTML = '';

                if (products.length === 0) {
                    container.innerHTML = C.renderEmptyState({
                        icon: 'fa-box-open',
                        title: 'Nenhum produto encontrado',
                        message: 'Não há produtos nesta seleção no momento.',
                    });
                    return;
                }

                const grid = document.createElement('div');
                grid.className = 'products-grid-page';
                grid.innerHTML = products.map((p) => this.buildProductCard(p)).join('');
                container.appendChild(grid);
            } catch (error) {
                console.error('Erro ao carregar produtos:', error);
                container.innerHTML = C.renderEmptyState({
                    icon: 'fa-exclamation-triangle',
                    title: 'Erro ao carregar produtos',
                    message: 'Tente novamente em alguns instantes.',
                });
            }
        },

        // ==================================================
        // RESULTADOS DE BUSCA
        // ==================================================
        async renderSearchResults() {
            const query = this.searchQuery;

            this.updateBreadcrumb([
                { name: 'Início', url: '/' },
                { name: `Busca: "${query}"`, url: null },
            ]);
            this.updatePageHeader(
                `Resultados para "${query}"`,
                'Produtos encontrados com base na sua busca'
            );

            const container = document.getElementById('contentContainer');
            container.innerHTML = C.renderLoading('Buscando...');

            try {
                const data = await API.get(`/products?search=${encodeURIComponent(query)}&limit=100`);
                const products = data.products || [];

                container.innerHTML = '';

                if (products.length === 0) {
                    container.innerHTML = `
                        <div class="empty-state">
                            <i class="fas fa-search"></i>
                            <h3>Nenhum produto encontrado</h3>
                            <p>Não encontramos resultados para "<strong>${U.escapeHtml(query)}</strong>".</p>
                            <a href="/produtos" class="btn btn-primary" style="margin-top: 1rem;">Ver todos os produtos</a>
                        </div>
                    `;
                    return;
                }

                const grid = document.createElement('div');
                grid.className = 'products-grid-page';
                grid.innerHTML = products.map((p) => this.buildProductCard(p)).join('');
                container.appendChild(grid);
            } catch (error) {
                console.error('Erro ao buscar produtos:', error);
                container.innerHTML = C.renderEmptyState({
                    icon: 'fa-exclamation-triangle',
                    title: 'Erro ao buscar produtos',
                    message: 'Tente novamente em alguns instantes.',
                });
            }
        },

        // ==================================================
        // NOT FOUND
        // ==================================================
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

        // ==================================================
        // CARD DE PRODUTO (usa LuxuryComponents)
        // ==================================================
        buildProductCard(product) {
            return C.renderProductCard(product, {
                showShortDesc: true,
                showButton: true,
                buttonText: 'Ver Produto',
                href: `/produto/${product.slug}`,
            });
        },

        // ==================================================
        // UI HELPERS
        // ==================================================
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
    };

    // ======================================================
    // INICIALIZAÇÃO
    // ======================================================
    document.addEventListener('DOMContentLoaded', () => {
        ProductsPage.init();
    });
})();