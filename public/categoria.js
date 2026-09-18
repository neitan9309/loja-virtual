// ======================================================
// PÁGINA DE CATEGORIA - Módulo encapsulado em IIFE
// ======================================================
(function() {
    'use strict';

    const PAGE_CONFIG = {
        api: { baseUrl: '/api' }
    };

    // ==================================================
    // IMAGENS POR SLUG
    // ==================================================
    const CATEGORY_IMAGES = {
        'vestuario': 'https://images.pexels.com/photos/996329/pexels-photo-996329.jpeg?auto=compress&cs=tinysrgb&w=1600',
        'perfumaria': 'https://images.pexels.com/photos/9659891/pexels-photo-9659891.jpeg?auto=compress&cs=tinysrgb&w=1600',
        'artigos-esportivos': 'https://images.pexels.com/photos/1552252/pexels-photo-1552252.jpeg?auto=compress&cs=tinysrgb&w=1600',
        'vestuario-masculino': 'https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=1200',
        'vestuario-feminino': 'https://images.pexels.com/photos/985635/pexels-photo-985635.jpeg?auto=compress&cs=tinysrgb&w=1200',
        'vestuario-infantil': 'https://images.pexels.com/photos/35537/child-children-girl-happy.jpg?auto=compress&cs=tinysrgb&w=1200',
        'perfumaria-masculino': 'https://images.pexels.com/photos/1961795/pexels-photo-1961795.jpeg?auto=compress&cs=tinysrgb&w=1200',
        'perfumaria-feminino': 'https://images.pexels.com/photos/9659891/pexels-photo-9659891.jpeg?auto=compress&cs=tinysrgb&w=1200',
        'perfumaria-unissex': 'https://images.pexels.com/photos/3059609/pexels-photo-3059609.jpeg?auto=compress&cs=tinysrgb&w=1200',
        'esportivos-masculino': 'https://images.pexels.com/photos/2294361/pexels-photo-2294361.jpeg?auto=compress&cs=tinysrgb&w=1200',
        'esportivos-feminino': 'https://images.pexels.com/photos/3757952/pexels-photo-3757952.jpeg?auto=compress&cs=tinysrgb&w=1200',
        'esportivos-infantil': 'https://images.pexels.com/photos/296301/pexels-photo-296301.jpeg?auto=compress&cs=tinysrgb&w=1200',
        'default': 'https://images.pexels.com/photos/996329/pexels-photo-996329.jpeg?auto=compress&cs=tinysrgb&w=1600'
    };

    const TYPE_ICONS = {
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
        'eau-de-parfum': 'fa-spray-can',
        'eau-de-toilette': 'fa-spray-can',
        'colonias': 'fa-spray-can',
        'kits': 'fa-gift'
    };

    function getTypeIcon(slug, name) {
        if (TYPE_ICONS[slug]) return TYPE_ICONS[slug];
        const lower = (name || '').toLowerCase();
        if (lower.includes('camis')) return 'fa-tshirt';
        if (lower.includes('calç')) return 'fa-socks';
        if (lower.includes('tênis') || lower.includes('tenis')) return 'fa-shoe-prints';
        if (lower.includes('perfum') || lower.includes('colôn')) return 'fa-spray-can';
        if (lower.includes('acess')) return 'fa-gem';
        if (lower.includes('kit')) return 'fa-gift';
        return 'fa-tag';
    }

    function getCategoryImage(slug) {
        return CATEGORY_IMAGES[slug] || CATEGORY_IMAGES['default'];
    }

    // ==================================================
    // UTILITÁRIOS
    // ==================================================
    const PageUtils = {
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
    // APLICAÇÃO
    // ==================================================
    const CategoryPage = {
        tree: [],
        currentCategory: null,
        categoryPath: [],

        async init() {
            this.parseQueryString();
            console.log('🔍 Slug buscado:', this.currentCategory);

            await this.loadCategoryTree();
            await this.render();

            // ✅ Detecta mudança na URL (back/forward do navegador)
            window.addEventListener('popstate', () => {
                this.parseQueryString();
                this.render();
            });
        },

        parseQueryString() {
            const params = new URLSearchParams(window.location.search);
            this.currentCategory = params.get('category') || null;
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

            if (!this.currentCategory) {
                return this.renderNotFound();
            }

            const found = this.findCategoryBySlug(this.currentCategory);
            if (!found) {
                return this.renderNotFound();
            }

            this.categoryPath = found.path;
            const { node } = found;

            this.renderHero(node);

            if (!node.children || node.children.length === 0) {
                window.location.href = `/produtos?category=${node.slug}`;
                return;
            }

            const firstChild = node.children[0];
            const isLeafLevel = !firstChild.children || firstChild.children.length === 0;

            if (isLeafLevel) {
                return this.renderTypes(node);
            }

            return this.renderSubcategories(node);
        },

        renderHero(category) {
            const hero = document.getElementById('categoryHero');
            const heroBg = document.getElementById('categoryHeroBg');
            const heroTitle = document.getElementById('heroTitle');
            const heroSubtitle = document.getElementById('heroSubtitle');
            const breadcrumbHero = document.getElementById('breadcrumbHero');

            if (!hero || !heroBg) return;

            heroBg.style.backgroundImage = `url('${getCategoryImage(category.slug)}')`;
            hero.classList.add('loaded');

            heroTitle.textContent = category.name;
            heroSubtitle.textContent = category.description || `Explore nossa seleção de ${category.name.toLowerCase()}`;

            const breadcrumbParts = [`<a href="/">Início</a>`];
            this.categoryPath.forEach((item, idx) => {
                const isLast = idx === this.categoryPath.length - 1;
                breadcrumbParts.push('<i class="fas fa-chevron-right separator"></i>');
                if (isLast) {
                    breadcrumbParts.push(`<span class="current">${PageUtils.escapeHtml(item.name)}</span>`);
                } else {
                    breadcrumbParts.push(`<a href="/categoria?category=${item.slug}">${PageUtils.escapeHtml(item.name)}</a>`);
                }
            });
            breadcrumbHero.innerHTML = breadcrumbParts.join('');
        },

        renderSubcategories(category) {
            const container = document.getElementById('contentContainer');

            const html = `
                <div class="section-intro">
                    <h2>Escolha uma categoria</h2>
                    <p>Selecione o público-alvo para ver os produtos disponíveis</p>
                    <div class="section-divider"></div>
                </div>

                <div class="subcategories-grid">
                    ${category.children.map(child => this.buildSubcategoryCard(child)).join('')}
                </div>
            `;

            container.innerHTML = html;
            PageUtils.announce(`${category.children.length} subcategorias disponíveis`);
        },

        renderTypes(category) {
            const container = document.getElementById('contentContainer');

            const html = `
                <div class="section-intro">
                    <h2>Tipos de produto</h2>
                    <p>Escolha uma categoria para ver os produtos disponíveis</p>
                    <div class="section-divider"></div>
                </div>

                <div class="types-grid">
                    ${category.children.map(child => this.buildTypeCard(child)).join('')}
                </div>
            `;

            container.innerHTML = html;
            PageUtils.announce(`${category.children.length} tipos de produto disponíveis`);
        },

        buildSubcategoryCard(category) {
            const image = getCategoryImage(category.slug);
            const hasChildren = category.children && category.children.length > 0;
            const countLabel = hasChildren
                ? `${category.children.length} categorias`
                : 'Ver produtos';

            return `
                <a href="/categoria?category=${category.slug}" class="subcategory-card" aria-label="Ver ${PageUtils.escapeHtml(category.name)}">
                    <div class="subcategory-card-image">
                        <span class="subcategory-card-badge">${PageUtils.escapeHtml(category.name)}</span>
                        <img 
                            src="${image}" 
                            alt="${PageUtils.escapeHtml(category.name)}" 
                            loading="lazy"
                            onerror="this.style.display='none'; this.parentElement.style.background='linear-gradient(135deg, var(--accent), var(--accent-hover))';">
                    </div>
                    <div class="subcategory-card-body">
                        <h3 class="subcategory-card-title">${PageUtils.escapeHtml(category.name)}</h3>
                        <p class="subcategory-card-description">
                            ${PageUtils.escapeHtml(category.description || `Explore nossa coleção de ${category.name.toLowerCase()}`)}
                        </p>
                        <div class="subcategory-card-meta">
                            <span class="subcategory-card-count">${countLabel}</span>
                            <span class="subcategory-card-arrow">
                                <i class="fas fa-arrow-right"></i>
                            </span>
                        </div>
                    </div>
                </a>
            `;
        },

        buildTypeCard(category) {
            const icon = getTypeIcon(category.slug, category.name);
            return `
                <a href="/produtos?category=${category.slug}" class="type-card" aria-label="Ver ${PageUtils.escapeHtml(category.name)}">
                    <div class="type-card-icon">
                        <i class="fas ${icon}"></i>
                    </div>
                    <div class="type-card-name">${PageUtils.escapeHtml(category.name)}</div>
                    <div class="type-card-count">Ver produtos</div>
                </a>
            `;
        },

        renderNotFound() {
            const hero = document.getElementById('categoryHero');
            const container = document.getElementById('contentContainer');

            if (hero) hero.style.display = 'none';

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
        }
    };

    // ==================================================
    // INICIALIZAÇÃO
    // ==================================================
    document.addEventListener('DOMContentLoaded', () => {
        CategoryPage.init();
        console.log('✅ Página de Categoria carregada');
    });
})();