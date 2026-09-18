// ======================================================
// PÁGINA DE PRODUTOS - Módulo encapsulado em IIFE
// para não conflitar com variáveis globais do script.js
// ======================================================
(function() {
    'use strict';

    // ==================================================
    // CONFIGURAÇÕES LOCAIS
    // ==================================================
    const PAGE_CONFIG = {
        api: { baseUrl: '/api' }
    };

    // ==================================================
    // UTILITÁRIOS LOCAIS
    // ==================================================
    const PageUtils = {
        formatPrice(value) {
            if (value === null || value === undefined) return 'R$ 0,00';
            return `R$ ${parseFloat(value).toFixed(2).replace('.', ',')}`;
        },

        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text || '';
            return div.innerHTML;
        },

        announce(message) {
            const announcer = document.getElementById('announcer');
            if (announcer) announcer.textContent = message;
        }
    };

    // ==================================================
    // API
    // ==================================================
    const PageAPI = {
        async request(path) {
            const response = await fetch(`${PAGE_CONFIG.api.baseUrl}${path}`);
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                const error = new Error(data.error || `Erro HTTP ${response.status}`);
                error.status = response.status;
                throw error;
            }
            return data;
        },

        get(path) { return this.request(path); }
    };

    // ==================================================
    // ÍCONES POR SLUG
    // ==================================================
    const ICONS = {
        'vestuario': 'fa-tshirt',
        'perfumaria': 'fa-spray-can',
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
        // Tipos
        'camisas': 'fa-tshirt',
        'camisetas': 'fa-tshirt',
        'blusas': 'fa-tshirt',
        'jaquetas': 'fa-tshirt',
        'calcas': 'fa-socks',
        'shorts': 'fa-socks',
        'saias': 'fa-tshirt',
        'vestidos': 'fa-tshirt',
        'acessorios': 'fa-gem',
        'tenis': 'fa-shoe-prints',
        'conjuntos': 'fa-tshirt',
        // Perfumaria
        'eau-de-parfum': 'fa-spray-can',
        'eau-de-toilette': 'fa-spray-can',
        'colonias': 'fa-spray-can',
        'kits': 'fa-gift'
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
    // APLICAÇÃO PRINCIPAL
    // ==================================================
    const ProductsPage = {
        tree: [],
        currentCategory: null,
        categoryPath: [],
        filter: null,

        async init() {
            this.parseQueryString();
            await this.loadCategoryTree();
            await this.render();
        },

        parseQueryString() {
            const params = new URLSearchParams(window.location.search);
            this.currentCategory = params.get('category') || null;
            this.filter = params.get('filter') || null;
        },

        async loadCategoryTree() {
            try {
                this.tree = await PageAPI.get('/categories/tree-full');
            } catch (error) {
                console.error('Erro ao carregar categorias:', error);
                this.tree = [];
            }
        },

        findCategoryBySlug(slug, nodes = null, path = []) {
            if (!nodes) nodes = this.tree;

            for (const node of nodes) {
                const newPath = [...path, node];
                if (node.slug === slug) {
                    return { node, path: newPath };
                }
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

            container.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i><span>Carregando...</span></div>';

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

        // ==============================================
        // RENDERIZADORES
        // ==============================================

        renderRootCategories() {
            this.updateBreadcrumb([{ name: 'Início', url: '/' }]);
            this.updatePageHeader('Produtos', 'Explore nossa coleção exclusiva');

            const container = document.getElementById('contentContainer');
            const grid = document.createElement('div');
            grid.className = 'categories-grid';

            grid.innerHTML = this.tree.map(cat => this.buildCategoryCard(cat)).join('');
            container.innerHTML = '';
            container.appendChild(grid);
            PageUtils.announce('Categorias carregadas');
        },

        renderCategoryChildren(category) {
            this.updateBreadcrumb(this.categoryPath);
            this.updatePageHeader(
                category.name,
                category.description || `Explore ${category.name}`
            );

            const container = document.getElementById('contentContainer');
            const grid = document.createElement('div');
            grid.className = 'categories-grid';

            grid.innerHTML = category.children.map(child => this.buildCategoryCard(child)).join('');
            container.innerHTML = '';
            container.appendChild(grid);
            PageUtils.announce(`${category.children.length} subcategorias encontradas`);
        },

        buildCategoryCard(category) {
            const icon = getIconForCategory(category.slug, category.name);
            const hasChildren = category.children && category.children.length > 0;
            const countLabel = hasChildren
                ? `${category.children.length} subcategorias`
                : 'Ver produtos';
            const arrowLabel = hasChildren ? 'Escolher' : 'Ver produtos';

            return `
                <a href="/produtos?category=${category.slug}" class="category-card" aria-label="Ver ${PageUtils.escapeHtml(category.name)}">
                    <div class="category-card-icon">
                        <i class="fas ${icon}"></i>
                    </div>
                    <div class="category-card-name">${PageUtils.escapeHtml(category.name)}</div>
                    ${category.description ? `<div class="category-card-description">${PageUtils.escapeHtml(category.description)}</div>` : ''}
                    <div class="category-card-count">${countLabel}</div>
                    <div class="category-card-arrow">
                        <i class="fas fa-arrow-right"></i> ${arrowLabel}
                    </div>
                </a>
            `;
        },

        async renderProductsOfCategory(category) {
            this.updateBreadcrumb(this.categoryPath);
            this.updatePageHeader(
                category.name,
                category.description || `Produtos em ${category.name}`
            );

            const container = document.getElementById('contentContainer');
            container.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i><span>Carregando produtos...</span></div>';

            try {
                const data = await PageAPI.get(`/products?category=${category.slug}&limit=100`);
                const products = data.products || [];

                container.innerHTML = '';

                if (products.length === 0) {
                    container.innerHTML = `
                        <div class="empty-state">
                            <i class="fas fa-box-open"></i>
                            <h3>Nenhum produto encontrado</h3>
                            <p>Ainda não temos produtos cadastrados nesta categoria. Volte em breve!</p>
                        </div>
                    `;
                    return;
                }

                const grid = document.createElement('div');
                grid.className = 'products-grid-page';
                grid.innerHTML = products.map(p => this.buildProductCard(p)).join('');
                container.appendChild(grid);
                PageUtils.announce(`${products.length} produtos encontrados`);
            } catch (error) {
                console.error('Erro ao carregar produtos:', error);
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h3>Erro ao carregar produtos</h3>
                        <p>Tente novamente em alguns instantes.</p>
                    </div>
                `;
            }
        },

        async renderFilteredProducts() {
            const filterLabels = {
                'new': { title: 'Lançamentos', subtitle: 'Os produtos mais recentes da coleção' },
                'best_seller': { title: 'Mais Vendidos', subtitle: 'Os favoritos dos nossos clientes' },
                'featured': { title: 'Em Promoção', subtitle: 'Aproveite os melhores descontos' }
            };

            const label = filterLabels[this.filter] || { title: 'Produtos', subtitle: 'Confira nossa coleção' };

            this.updateBreadcrumb([
                { name: 'Início', url: '/' },
                { name: label.title, url: null }
            ]);
            this.updatePageHeader(label.title, label.subtitle);

            const container = document.getElementById('contentContainer');
            container.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i><span>Carregando produtos...</span></div>';

            try {
                let url = '/products?limit=100';
                if (this.filter === 'new') url += '&new=true';
                if (this.filter === 'best_seller') url += '&best_seller=true';
                if (this.filter === 'featured') url += '&featured=true';

                const data = await PageAPI.get(url);
                const products = data.products || [];

                container.innerHTML = '';

                if (products.length === 0) {
                    container.innerHTML = `
                        <div class="empty-state">
                            <i class="fas fa-box-open"></i>
                            <h3>Nenhum produto encontrado</h3>
                            <p>Não há produtos nesta seleção no momento.</p>
                        </div>
                    `;
                    return;
                }

                const grid = document.createElement('div');
                grid.className = 'products-grid-page';
                grid.innerHTML = products.map(p => this.buildProductCard(p)).join('');
                container.appendChild(grid);
            } catch (error) {
                console.error('Erro ao carregar produtos:', error);
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h3>Erro ao carregar produtos</h3>
                        <p>Tente novamente em alguns instantes.</p>
                    </div>
                `;
            }
        },

        renderNotFound() {
            this.updateBreadcrumb([
                { name: 'Início', url: '/' },
                { name: 'Categoria não encontrada', url: null }
            ]);
            this.updatePageHeader('Categoria não encontrada', 'A categoria que você procura não existe');

            const container = document.getElementById('contentContainer');
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <h3>Categoria não encontrada</h3>
                    <p>A categoria que você procura não existe ou foi removida.</p>
                    <a href="/produtos" class="btn btn-primary" style="margin-top: 1rem;">
                        Ver todas as categorias
                    </a>
                </div>
            `;
        },

        buildProductCard(product) {
            const hasImage = product.images && product.images.length > 0 && product.images[0].url;
            const imageHtml = hasImage
                ? `<img class="product-image" src="${product.images[0].url}" alt="${PageUtils.escapeHtml(product.name)}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'product-image-placeholder\\'><i class=\\'fas fa-image\\'></i></div>'">`
                : `<div class="product-image-placeholder"><i class="fas fa-image"></i></div>`;

            const discountBadge = product.discount_percent > 0
                ? `<span class="product-badge discount">-${parseFloat(product.discount_percent).toFixed(0)}%</span>`
                : (product.is_new ? `<span class="product-badge">Novo</span>` : '');

            const originalPrice = parseFloat(product.price);
            const currentPrice = product.discount_percent > 0
                ? originalPrice * (1 - product.discount_percent / 100)
                : originalPrice;

            const oldPriceHtml = product.discount_percent > 0
                ? `<span class="product-old-price">R$ ${PageUtils.formatPrice(originalPrice)}</span>`
                : '';

            return `
                <article class="product-card">
                    <div class="product-image-wrapper">
                        ${discountBadge}
                        ${imageHtml}
                    </div>
                    <div class="product-info">
                        <h3 class="product-name">${PageUtils.escapeHtml(product.name)}</h3>
                        ${product.short_description ? `<p class="product-short-desc">${PageUtils.escapeHtml(product.short_description)}</p>` : ''}
                        <div class="product-price-wrapper">
                            <span class="product-price">R$ ${PageUtils.formatPrice(currentPrice)}</span>
                            ${oldPriceHtml}
                        </div>
                        <a href="/produto/${product.slug}" class="product-btn">Ver Produto</a>
                    </div>
                </article>
            `;
        },

        // ==============================================
        // UI HELPERS
        // ==============================================
        updateBreadcrumb(items) {
            const breadcrumb = document.getElementById('breadcrumb');
            if (!breadcrumb) return;

            const parts = [];

            items.forEach((item, index) => {
                const isLast = index === items.length - 1;

                if (isLast) {
                    parts.push(`<span class="current">${PageUtils.escapeHtml(item.name)}</span>`);
                } else if (item.url) {
                    parts.push(`<a href="${item.url}">${index === 0 ? '<i class="fas fa-home"></i>' : ''}<span>${PageUtils.escapeHtml(item.name)}</span></a>`);
                } else {
                    parts.push(`<span>${PageUtils.escapeHtml(item.name)}</span>`);
                }

                if (!isLast) {
                    parts.push('<i class="fas fa-chevron-right separator"></i>');
                }
            });

            breadcrumb.innerHTML = parts.join('');
        },

        updatePageHeader(title, subtitle) {
            const titleEl = document.getElementById('pageTitle');
            const subtitleEl = document.getElementById('pageSubtitle');
            if (titleEl) titleEl.textContent = title;
            if (subtitleEl) subtitleEl.textContent = subtitle;
            document.title = `${title} - Luxury Store`;
        }
    };

    // ==================================================
    // INICIALIZAÇÃO
    // ==================================================
    document.addEventListener('DOMContentLoaded', () => {
        ProductsPage.init();
        console.log('✅ Página de Produtos carregada');
    });
})();