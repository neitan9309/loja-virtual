// ======================================================
// PÁGINA DE PRODUTO - Módulo encapsulado em IIFE
// ======================================================
(function() {
    'use strict';

    const PAGE_CONFIG = { api: { baseUrl: '/api' } };

    const PageUtils = {
        formatPrice(value) {
            if (value === null || value === undefined) return '0,00';
            return parseFloat(value).toFixed(2).replace('.', ',');
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

    const ProductPage = {
        product: null,
        slug: null,

        async init() {
            // Extrai slug da URL: /produto/<slug>
            const pathParts = window.location.pathname.split('/').filter(Boolean);
            this.slug = pathParts[1] || null;

            if (!this.slug) {
                return this.showNotFound();
            }

            await this.loadProduct();
        },

        async loadProduct() {
            try {
                const product = await PageAPI.get(`/products/slug/${this.slug}`);
                this.product = product;
                this.render();
            } catch (error) {
                console.error('Erro ao carregar produto:', error);
                this.showNotFound();
            }
        },

        showNotFound() {
            document.getElementById('productLoading').style.display = 'none';
            document.getElementById('productContent').style.display = 'none';
            document.getElementById('productNotFound').style.display = 'flex';
        },

        render() {
            const p = this.product;

            document.getElementById('productLoading').style.display = 'none';
            document.getElementById('productContent').style.display = 'block';

            document.title = `${p.name} - Luxury Store`;

            this.renderBreadcrumb();
            this.renderGallery();
            this.renderBadges();
            this.renderBasicInfo();
            this.renderRating();
            this.renderPrice();
            this.renderVariations();
            this.renderDescription();
            this.renderSpecs();
            this.renderReviews();
            this.attachActions();
            this.loadRelated();
        },

        // ==================================================
        // BREADCRUMB
        // ==================================================
        renderBreadcrumb() {
            const breadcrumb = document.getElementById('breadcrumb');
            const p = this.product;
            if (!breadcrumb) return;

            const parts = [`<a href="/"><i class="fas fa-home"></i><span>Início</span></a>`];

            // Categoria (com hierarquia se disponível)
            if (p.category_path && Array.isArray(p.category_path) && p.category_path.length > 0) {
                const sorted = [...p.category_path].sort((a, b) => a.level - b.level);
                sorted.forEach(item => {
                    parts.push('<i class="fas fa-chevron-right separator"></i>');
                    parts.push(`<a href="/categoria?category=${item.slug}">${PageUtils.escapeHtml(item.name)}</a>`);
                });
            } else if (p.category_name) {
                parts.push('<i class="fas fa-chevron-right separator"></i>');
                parts.push(`<a href="/produtos">${PageUtils.escapeHtml(p.category_name)}</a>`);
            }

            // Nome do produto (atual)
            parts.push('<i class="fas fa-chevron-right separator"></i>');
            parts.push(`<span class="current">${PageUtils.escapeHtml(p.name)}</span>`);

            breadcrumb.innerHTML = parts.join('');
        },

        // ==================================================
        // GALERIA
        // ==================================================
        renderGallery() {
            const p = this.product;
            const mainImg = document.getElementById('galleryMainImage');
            const thumbs = document.getElementById('galleryThumbs');

            const images = (p.images && p.images.length > 0)
                ? p.images
                : [{ url: 'https://placehold.co/600x600?text=Sem+Imagem', is_primary: true }];

            // Imagem principal (a primária ou a primeira)
            const primary = images.find(i => i.is_primary) || images[0];
            mainImg.src = primary.url;
            mainImg.alt = p.name;

            // Miniaturas
            thumbs.innerHTML = images.map((img, idx) => `
                <div class="gallery-thumb ${img.is_primary || idx === 0 ? 'active' : ''}" data-index="${idx}">
                    <img src="${img.url}" alt="${PageUtils.escapeHtml(p.name)} - imagem ${idx + 1}" loading="lazy">
                </div>
            `).join('');

            // Click nas miniaturas
            thumbs.querySelectorAll('.gallery-thumb').forEach(thumb => {
                thumb.addEventListener('click', () => {
                    const idx = parseInt(thumb.dataset.index);
                    mainImg.src = images[idx].url;
                    thumbs.querySelectorAll('.gallery-thumb').forEach(t => t.classList.remove('active'));
                    thumb.classList.add('active');
                });
            });

            // Zoom
            document.getElementById('galleryZoom')?.addEventListener('click', () => {
                this.openZoom(mainImg.src);
            });

            // Click na imagem principal também abre zoom
            mainImg.addEventListener('click', () => {
                this.openZoom(mainImg.src);
            });
        },

        openZoom(src) {
            const modal = document.createElement('div');
            modal.className = 'image-zoom-modal active';
            modal.innerHTML = `
                <button class="image-zoom-close" aria-label="Fechar">&times;</button>
                <img src="${src}" alt="Imagem ampliada">
            `;
            document.body.appendChild(modal);
            document.body.style.overflow = 'hidden';

            const close = () => {
                modal.remove();
                document.body.style.overflow = '';
            };

            modal.querySelector('.image-zoom-close').addEventListener('click', close);
            modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
            document.addEventListener('keydown', function escHandler(e) {
                if (e.key === 'Escape') { close(); document.removeEventListener('keydown', escHandler); }
            });
        },

        // ==================================================
        // BADGES
        // ==================================================
        renderBadges() {
            const p = this.product;
            const container = document.getElementById('productBadges');
            const badges = [];

            if (p.is_new) badges.push('<span class="product-badge new"><i class="fas fa-certificate"></i> Novo</span>');
            if (p.is_best_seller) badges.push('<span class="product-badge bestseller"><i class="fas fa-trophy"></i> Mais Vendido</span>');
            if (p.is_featured) badges.push('<span class="product-badge featured"><i class="fas fa-star"></i> Destaque</span>');
            if (p.discount_percent > 0) badges.push(`<span class="product-badge sale">-${parseFloat(p.discount_percent).toFixed(0)}% OFF</span>`);

            container.innerHTML = badges.join('');
        },

        // ==================================================
        // INFO BÁSICA
        // ==================================================
        renderBasicInfo() {
            const p = this.product;
            document.getElementById('productTitle').textContent = p.name;

            const metaParts = [];
            if (p.brand_name) metaParts.push(`Marca: <a href="/produtos?brand=${p.brand_slug || ''}">${PageUtils.escapeHtml(p.brand_name)}</a>`);
            if (p.sku) metaParts.push(`SKU: ${PageUtils.escapeHtml(p.sku)}`);
            document.getElementById('productMeta').innerHTML = metaParts.join(' · ');
        },

        // ==================================================
        // AVALIAÇÃO
        // ==================================================
        renderRating() {
            const p = this.product;
            const stars = document.getElementById('productStars');
            const count = document.getElementById('productRatingCount');

            const rating = parseFloat(p.rating_avg || 0);
            const total = parseInt(p.rating_count || 0);

            let starsHtml = '';
            for (let i = 1; i <= 5; i++) {
                if (i <= Math.floor(rating)) starsHtml += '<i class="fas fa-star"></i>';
                else if (i - 0.5 <= rating) starsHtml += '<i class="fas fa-star-half-alt"></i>';
                else starsHtml += '<i class="fas fa-star star-empty"></i>';
            }

            stars.innerHTML = starsHtml;
            count.textContent = total > 0
                ? `${rating.toFixed(1)} (${total} ${total === 1 ? 'avaliação' : 'avaliações'})`
                : 'Nenhuma avaliação ainda';
        },

        // ==================================================
        // PREÇO
        // ==================================================
        renderPrice() {
            const p = this.product;
            const originalPrice = parseFloat(p.price);
            const discount = parseFloat(p.discount_percent || 0);
            const currentPrice = discount > 0
                ? originalPrice * (1 - discount / 100)
                : originalPrice;

            const discountEl = document.getElementById('productDiscount');
            const oldPriceEl = document.getElementById('productOldPrice');
            const currentPriceEl = document.getElementById('productCurrentPrice');
            const installmentsEl = document.getElementById('productInstallments');

            if (discount > 0) {
                discountEl.textContent = `-${discount.toFixed(0)}%`;
                discountEl.style.display = 'inline-block';
                oldPriceEl.textContent = `R$ ${PageUtils.formatPrice(originalPrice)}`;
                oldPriceEl.style.display = 'inline-block';
            } else {
                discountEl.style.display = 'none';
                oldPriceEl.style.display = 'none';
            }

            currentPriceEl.textContent = `R$ ${PageUtils.formatPrice(currentPrice)}`;

            // Parcelamento (simulado: até 12x sem juros, com parcela mínima de R$5)
            const maxInstallments = 12;
            const minInstallment = 5;
            const installmentsCount = Math.min(maxInstallments, Math.max(1, Math.floor(currentPrice / minInstallment)));
            const installmentValue = currentPrice / installmentsCount;

            if (installmentsCount > 1) {
                installmentsEl.innerHTML = `ou <strong>${installmentsCount}x de R$ ${PageUtils.formatPrice(installmentValue)}</strong> sem juros`;
            } else {
                installmentsEl.innerHTML = `<strong>R$ ${PageUtils.formatPrice(currentPrice)}</strong> à vista`;
            }
        },

        // ==================================================
        // VARIAÇÕES
        // ==================================================
        renderVariations() {
            const p = this.product;
            const container = document.getElementById('productVariations');

            if (!p.variations || p.variations.length === 0) {
                container.style.display = 'none';
                return;
            }

            // Agrupa por tipo
            const grouped = {};
            p.variations.forEach(v => {
                if (!grouped[v.type]) grouped[v.type] = [];
                grouped[v.type].push(v);
            });

            const labels = {
                size: 'Tamanho',
                color: 'Cor',
                material: 'Material',
                style: 'Estilo'
            };

            container.innerHTML = Object.entries(grouped).map(([type, vars]) => `
                <div class="variation-group">
                    <div class="variation-label">${labels[type] || type}: <strong data-selected="${type}">${PageUtils.escapeHtml(vars[0].value)}</strong></div>
                    <div class="variation-options">
                        ${vars.map((v, idx) => `
                            <button class="variation-btn ${idx === 0 ? 'active' : ''}" data-type="${type}" data-value="${PageUtils.escapeHtml(v.value)}">
                                ${PageUtils.escapeHtml(v.value)}
                            </button>
                        `).join('')}
                    </div>
                </div>
            `).join('');

            container.style.display = 'flex';

            // Click nas variações
            container.querySelectorAll('.variation-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const type = btn.dataset.type;
                    const value = btn.dataset.value;

                    container.querySelectorAll(`.variation-btn[data-type="${type}"]`).forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');

                    const selectedLabel = container.querySelector(`strong[data-selected="${type}"]`);
                    if (selectedLabel) selectedLabel.textContent = value;
                });
            });
        },

        // ==================================================
        // DESCRIÇÃO
        // ==================================================
        renderDescription() {
            const p = this.product;
            document.getElementById('productDescription').textContent = p.description || 'Sem descrição disponível.';
        },

        // ==================================================
        // ESPECIFICAÇÕES
        // ==================================================
        renderSpecs() {
            const p = this.product;
            const container = document.getElementById('productSpecs');
            const specs = [];

            if (p.sku) specs.push({ label: 'SKU', value: p.sku });
            if (p.brand_name) specs.push({ label: 'Marca', value: p.brand_name });
            if (p.category_name) specs.push({ label: 'Categoria', value: p.category_name });
            if (p.weight) specs.push({ label: 'Peso', value: `${p.weight} kg` });
            if (p.dimensions) specs.push({ label: 'Dimensões', value: p.dimensions });

            // Especificações técnicas adicionais
            if (p.specifications && p.specifications.length > 0) {
                p.specifications.forEach(s => specs.push({ label: s.name, value: s.value }));
            }

            if (specs.length === 0) {
                container.innerHTML = '<p class="review-empty">Nenhuma especificação disponível.</p>';
                return;
            }

            container.innerHTML = specs.map(s => `
                <div class="spec-item">
                    <span class="spec-label">${PageUtils.escapeHtml(s.label)}</span>
                    <span class="spec-value">${PageUtils.escapeHtml(s.value)}</span>
                </div>
            `).join('');
        },

        // ==================================================
        // AVALIAÇÕES
        // ==================================================
        renderReviews() {
            const p = this.product;
            const container = document.getElementById('productReviews');

            if (!p.reviews || p.reviews.length === 0) {
                container.innerHTML = '<p class="review-empty">Este produto ainda não tem avaliações. Seja o primeiro a avaliar!</p>';
                return;
            }

            container.innerHTML = p.reviews.map(review => {
                const stars = Array(5).fill(0).map((_, i) =>
                    i < review.rating ? '<i class="fas fa-star"></i>' : '<i class="far fa-star"></i>'
                ).join('');

                const date = review.created_at
                    ? new Date(review.created_at).toLocaleDateString('pt-BR')
                    : '';

                return `
                    <div class="review-card">
                        <div class="review-header">
                            <div>
                                <div class="review-author">Cliente verificado</div>
                                <div class="review-stars">${stars}</div>
                            </div>
                            <div class="review-date">${date}</div>
                        </div>
                        ${review.title ? `<div class="review-title">${PageUtils.escapeHtml(review.title)}</div>` : ''}
                        ${review.comment ? `<div class="review-comment">${PageUtils.escapeHtml(review.comment)}</div>` : ''}
                    </div>
                `;
            }).join('');
        },

        // ==================================================
        // AÇÕES
        // ==================================================
        attachActions() {
            const qtyInput = document.getElementById('productQty');
            const decreaseBtn = document.getElementById('qtyDecrease');
            const increaseBtn = document.getElementById('qtyIncrease');
            const addCartBtn = document.getElementById('btnAddCart');
            const buyNowBtn = document.getElementById('btnBuyNow');
            const shippingBtn = document.getElementById('btnCalcShipping');

            decreaseBtn?.addEventListener('click', () => {
                const val = parseInt(qtyInput.value) || 1;
                if (val > 1) qtyInput.value = val - 1;
            });

            increaseBtn?.addEventListener('click', () => {
                const val = parseInt(qtyInput.value) || 1;
                const max = parseInt(qtyInput.max) || 99;
                if (val < max) qtyInput.value = val + 1;
            });

            addCartBtn?.addEventListener('click', () => {
                const qty = parseInt(qtyInput.value) || 1;
                this.addToCart(qty);
            });

            buyNowBtn?.addEventListener('click', () => {
                const qty = parseInt(qtyInput.value) || 1;
                this.buyNow(qty);
            });

            shippingBtn?.addEventListener('click', () => {
                this.calculateShipping();
            });

            // Máscara de CEP
            const cepInput = document.getElementById('shippingCep');
            cepInput?.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '').slice(0, 8);
                if (value.length > 5) {
                    value = value.replace(/(\d{5})(\d+)/, '$1-$2');
                }
                e.target.value = value;
            });

            // Tabs
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const tab = btn.dataset.tab;
                    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                    btn.classList.add('active');
                    document.getElementById(`tab-${tab}`)?.classList.add('active');
                });
            });
        },

                async addToCart(quantity) {
            const p = this.product;

            try {
                await window.LuxuryCart.addToCart(p.id, quantity);
                this.showToast(`"${p.name}" (${quantity}x) adicionado ao carrinho!`, 'success');
                PageUtils.announce(`${quantity} unidade(s) adicionada(s) ao carrinho`);
            } catch (error) {
                this.showToast(error.data?.error || 'Erro ao adicionar ao carrinho', 'error');
            }
        },

        buyNow(quantity) {
            const p = this.product;
            this.showToast(`Redirecionando para o checkout: "${p.name}" (${quantity}x)`, 'info');
            PageUtils.announce('Redirecionando para o checkout');
            // Futuramente: redirecionar para /checkout?product=<id>&qty=<quantity>
        },

        showToast(message, type = 'info') {
            const toast = document.createElement('div');
            toast.className = `product-toast ${type}`;
            toast.innerHTML = `
                <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i>
                <span>${PageUtils.escapeHtml(message)}</span>
            `;
            document.body.appendChild(toast);

            setTimeout(() => toast.classList.add('show'), 10);
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, 3500);
        },

        // ==================================================
        // FRETE
        // ==================================================
        calculateShipping() {
            const cepInput = document.getElementById('shippingCep');
            const result = document.getElementById('shippingResult');
            const cep = cepInput?.value.replace(/\D/g, '');

            if (!cep || cep.length !== 8) {
                result.style.display = 'block';
                result.innerHTML = '<span style="color: #dc2626;">Por favor, informe um CEP válido (8 dígitos).</span>';
                return;
            }

            // Simulação de cálculo (futuramente integrar com API dos Correios)
            const region = parseInt(cep[0]);
            let price, days;

            if (region === 7 || region === 6) {
                price = 0;
                days = '2 a 4 dias úteis';
            } else if (region === 8 || region === 1) {
                price = 0;
                days = '3 a 6 dias úteis';
            } else {
                price = 19.90;
                days = '5 a 10 dias úteis';
            }

            const priceText = price === 0
                ? '<strong>Frete GRÁTIS</strong>'
                : `Frete: R$ ${PageUtils.formatPrice(price)}`;

            result.style.display = 'block';
            result.innerHTML = `
                <div>Entrega para <strong>${cep.substring(0, 5)}-${cep.substring(5)}</strong></div>
                <div style="margin-top: 0.35rem;">${priceText} · Prazo: ${days}</div>
            `;
        },

        // ==================================================
        // PRODUTOS RELACIONADOS
        // ==================================================
        async loadRelated() {
            const section = document.getElementById('relatedSection');
            const grid = document.getElementById('relatedGrid');
            const p = this.product;

            try {
                // Busca produtos da mesma categoria
                const data = await PageAPI.get(`/products?category=${p.category_id}&limit=4`);
                let products = (data.products || []).filter(prod => prod.id !== p.id);

                // Se não houver relacionados na mesma categoria, busca os em destaque
                if (products.length === 0) {
                    const fallback = await PageAPI.get('/products?featured=true&limit=4');
                    products = (fallback.products || []).filter(prod => prod.id !== p.id);
                }

                if (products.length === 0) {
                    section.style.display = 'none';
                    return;
                }

                grid.innerHTML = products.slice(0, 4).map(prod => {
                    const hasImage = prod.images && prod.images.length > 0 && prod.images[0].url;
                    const imageHtml = hasImage
                        ? `<img class="product-image" src="${prod.images[0].url}" alt="${PageUtils.escapeHtml(prod.name)}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'product-image-placeholder\\'><i class=\\'fas fa-image\\'></i></div>'">`
                        : `<div class="product-image-placeholder"><i class="fas fa-image"></i></div>`;

                    const discountBadge = prod.discount_percent > 0
                        ? `<span class="product-badge discount">-${parseFloat(prod.discount_percent).toFixed(0)}%</span>`
                        : (prod.is_new ? `<span class="product-badge">Novo</span>` : '');

                    const originalPrice = parseFloat(prod.price);
                    const currentPrice = prod.discount_percent > 0
                        ? originalPrice * (1 - prod.discount_percent / 100)
                        : originalPrice;

                    const oldPriceHtml = prod.discount_percent > 0
                        ? `<span class="product-old-price">R$ ${PageUtils.formatPrice(originalPrice)}</span>`
                        : '';

                    return `
                        <a href="/produto/${prod.slug}" class="product-card">
                            <div class="product-image-wrapper">
                                ${discountBadge}
                                ${imageHtml}
                            </div>
                            <div class="product-info">
                                <h3 class="product-name">${PageUtils.escapeHtml(prod.name)}</h3>
                                ${prod.short_description ? `<p class="product-short-desc">${PageUtils.escapeHtml(prod.short_description)}</p>` : ''}
                                <div class="product-price-wrapper">
                                    <span class="product-price">R$ ${PageUtils.formatPrice(currentPrice)}</span>
                                    ${oldPriceHtml}
                                </div>
                            </div>
                        </a>
                    `;
                }).join('');

                section.style.display = 'block';
            } catch (error) {
                console.error('Erro ao carregar produtos relacionados:', error);
                section.style.display = 'none';
            }
        }
    };

    // ==================================================
    // TOAST (adiciona CSS dinamicamente)
    // ==================================================
    const style = document.createElement('style');
    style.textContent = `
        .product-toast {
            position: fixed;
            bottom: 2rem;
            left: 50%;
            transform: translateX(-50%) translateY(100px);
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 1rem 1.5rem;
            background: var(--gray-900);
            color: var(--white);
            border-radius: 8px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
            z-index: 9999;
            opacity: 0;
            transition: all 0.3s ease;
            font-size: 0.9rem;
            max-width: 90vw;
        }

        .product-toast.show {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }

        .product-toast.success {
            background: var(--success-dark, #22c55e);
        }

        .product-toast i {
            font-size: 1.1rem;
        }
    `;
    document.head.appendChild(style);

    document.addEventListener('DOMContentLoaded', () => {
        ProductPage.init();
    });
})();