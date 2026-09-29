// ======================================================
// public/js/categoria.js
// Página de categoria (hero + subcategorias/tipos)
// Depende de: core/utils.js, core/api.js, core/components.js
// ======================================================
(function () {
    'use strict';

    const U = window.LuxuryUtils;
    const API = window.LuxuryAPI;

    // ==================================================
    // IMAGENS E ÍCONES POR CATEGORIA
    // (poderiam vir do backend no futuro)
    // ==================================================
    const CATEGORY_IMAGES = {
        vestuario: 'https://images.pexels.com/photos/996329/pexels-photo-996329.jpeg?auto=compress&cs=tinysrgb&w=1600',
        perfumaria: 'https://images.pexels.com/photos/9659891/pexels-photo-9659891.jpeg?auto=compress&cs=tinysrgb&w=1600',
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
        default: 'https://images.pexels.com/photos/996329/pexels-photo-996329.jpeg?auto=compress&cs=tinysrgb&w=1600',
    };

    const TYPE_ICONS = {
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
        return CATEGORY_IMAGES[slug] || CATEGORY_IMAGES.default;
    }

    // ==================================================
    // PÁGINA
    // ==================================================
    const CategoryPage = {
        tree: [],

        async init() {
            const params = U.getQueryParams();
            const slug = params.category;

            try {
                // ✅ Cache de 5 min — a árvore raramente muda
                this.tree = await API.get('/categories/tree-full', {
                    useCache: true,
                    ttl: 5 * 60 * 1000,
                });
            } catch (error) {
                console.error('Erro ao carregar categorias:', error);
                this.renderNotFound();
                return;
            }

            const found = this.findCategoryBySlug(slug);
            if (!found) {
                this.renderNotFound();
                return;
            }

            this.render(found.node, found.path);
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

        render(category, path) {
            this.renderHero(category, path);

            // Categoria folha (nível 3) → redireciona pra listagem
            if (!category.children || category.children.length === 0) {
                window.location.href = `/produtos?category=${category.slug}`;
                return;
            }

            const isLeafLevel = !category.children[0].children || category.children[0].children.length === 0;

            if (isLeafLevel) {
                this.renderTypes(category);
            } else {
                this.renderSubcategories(category);
            }
        },

        // ==================================================
        // HERO
        // ==================================================
        renderHero(category, path) {
            const hero = document.getElementById('categoryHero');
            const heroBg = document.getElementById('categoryHeroBg');
            const heroTitle = document.getElementById('heroTitle');
            const heroSubtitle = document.getElementById('heroSubtitle');
            const breadcrumbHero = document.getElementById('breadcrumbHero');

            if (hero && heroBg) {
                heroBg.style.backgroundImage = `url('${getCategoryImage(category.slug)}')`;
                hero.classList.add('loaded');
            }
            if (heroTitle) heroTitle.textContent = category.name;
            if (heroSubtitle) {
                heroSubtitle.textContent =
                    category.description || `Explore nossa seleção de ${category.name.toLowerCase()}`;
            }

            document.title = `${category.name} - Luxury Store`;

            // Breadcrumb do hero
            if (breadcrumbHero) {
                const breadcrumbParts = [`<a href="/">Início</a>`];
                path.forEach((item, idx) => {
                    const isLast = idx === path.length - 1;
                    breadcrumbParts.push('<i class="fas fa-chevron-right separator"></i>');
                    if (isLast) {
                        breadcrumbParts.push(`<span class="current">${U.escapeHtml(item.name)}</span>`);
                    } else {
                        breadcrumbParts.push(
                            `<a href="/categoria?category=${U.escapeAttr(item.slug)}">${U.escapeHtml(item.name)}</a>`
                        );
                    }
                });
                breadcrumbHero.innerHTML = breadcrumbParts.join('');
            }

            this.updateBreadcrumb(path);
        },

        updateBreadcrumb(path) {
            const breadcrumb = document.getElementById('breadcrumb');
            if (!breadcrumb) return;

            const parts = [];

            parts.push(`<a href="/"><i class="fas fa-home"></i><span>Início</span></a>`);

            path.forEach((item, idx) => {
                const isLast = idx === path.length - 1;

                parts.push('<i class="fas fa-chevron-right separator"></i>');

                if (isLast) {
                    parts.push(`<span class="current">${U.escapeHtml(item.name)}</span>`);
                } else {
                    parts.push(
                        `<a href="/categoria?category=${U.escapeAttr(item.slug)}">${U.escapeHtml(item.name)}</a>`
                    );
                }
            });

            breadcrumb.innerHTML = parts.join('');
        },

        // ==================================================
        // SUBCATEGORIAS (cards grandes com imagem)
        // ==================================================
        renderSubcategories(category) {
            const container = document.getElementById('contentContainer');
            container.innerHTML = `
                <div class="section-intro">
                    <h2>Escolha uma categoria</h2>
                    <p>Selecione o público-alvo para ver os produtos disponíveis</p>
                    <div class="section-divider"></div>
                </div>
                <div class="subcategories-grid">
                    ${category.children.map((child) => this.buildSubcategoryCard(child)).join('')}
                </div>
            `;
        },

        // ==================================================
        // TIPOS (cards pequenos com ícone)
        // ==================================================
        renderTypes(category) {
            const container = document.getElementById('contentContainer');
            container.innerHTML = `
                <div class="section-intro">
                    <h2>Tipos de produto</h2>
                    <p>Escolha uma categoria para ver os produtos disponíveis</p>
                    <div class="section-divider"></div>
                </div>
                <div class="types-grid">
                    ${category.children.map((child) => this.buildTypeCard(child)).join('')}
                </div>
            `;
        },

        // ==================================================
        // CARD DE SUBCATEGORIA
        // ==================================================
        buildSubcategoryCard(category) {
            const image = getCategoryImage(category.slug);
            const hasChildren = category.children && category.children.length > 0;
            const countLabel = hasChildren ? `${category.children.length} categorias` : 'Ver produtos';

            return `
                <a href="/categoria?category=${U.escapeAttr(category.slug)}" class="subcategory-card">
                    <div class="subcategory-card-image">
                        <span class="subcategory-card-badge">${U.escapeHtml(category.name)}</span>
                        <img src="${U.escapeAttr(image)}"
                             alt="${U.escapeAttr(category.name)}"
                             loading="lazy"
                             onerror="this.style.display='none'; this.parentElement.style.background='linear-gradient(135deg, var(--accent), var(--accent-hover))';">
                    </div>
                    <div class="subcategory-card-body">
                        <h3 class="subcategory-card-title">${U.escapeHtml(category.name)}</h3>
                        <p class="subcategory-card-description">
                            ${U.escapeHtml(
                                category.description ||
                                `Explore nossa coleção de ${category.name.toLowerCase()}`
                            )}
                        </p>
                        <div class="subcategory-card-meta">
                            <span class="subcategory-card-count">${U.escapeHtml(countLabel)}</span>
                            <span class="subcategory-card-arrow"><i class="fas fa-arrow-right"></i></span>
                        </div>
                    </div>
                </a>
            `;
        },

        // ==================================================
        // CARD DE TIPO
        // ==================================================
        buildTypeCard(category) {
            const icon = getTypeIcon(category.slug, category.name);
            return `
                <a href="/produtos?category=${U.escapeAttr(category.slug)}" class="type-card">
                    <div class="type-card-icon"><i class="fas ${U.escapeAttr(icon)}"></i></div>
                    <div class="type-card-name">${U.escapeHtml(category.name)}</div>
                    <div class="type-card-count">Ver produtos</div>
                </a>
            `;
        },

        // ==================================================
        // NOT FOUND
        // ==================================================
        renderNotFound() {
            const hero = document.getElementById('categoryHero');
            const breadcrumb = document.getElementById('breadcrumb');
            const container = document.getElementById('contentContainer');

            if (hero) hero.style.display = 'none';

            if (breadcrumb) {
                breadcrumb.innerHTML = `
                    <a href="/"><i class="fas fa-home"></i><span>Início</span></a>
                    <i class="fas fa-chevron-right separator"></i>
                    <span class="current">Categoria não encontrada</span>
                `;
            }

            if (container) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-search"></i>
                        <h3>Categoria não encontrada</h3>
                        <p>A categoria que você procura não existe ou foi removida.</p>
                        <a href="/produtos" class="btn btn-primary" style="margin-top: 1rem;">Ver todas as categorias</a>
                    </div>
                `;
            }
        },
    };

    // ======================================================
    // INICIALIZAÇÃO
    // ======================================================
    document.addEventListener('DOMContentLoaded', () => {
        CategoryPage.init();
    });
})();