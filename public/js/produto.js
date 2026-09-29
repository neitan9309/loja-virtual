// ======================================================
// public/js/produto.js
// Página de detalhe do produto
// Depende de: core/utils.js, core/api.js, core/components.js
// ======================================================
(function () {
    'use strict';

    // Aliases pros módulos globais
    const U = window.LuxuryUtils;
    const API = window.LuxuryAPI;
    const C = window.LuxuryComponents;

    // ======================================================
    // PÁGINA
    // ======================================================
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
                const product = await API.get(`/products/slug/${this.slug}`);
                this.product = product;
                this.render();
            } catch (error) {
                console.error('Erro ao carregar produto:', error);
                this.showNotFound();
            }
        },

        showNotFound() {
            const loading = document.getElementById('productLoading');
            const content = document.getElementById('productContent');
            const notFound = document.getElementById('productNotFound');

            if (loading) loading.style.display = 'none';
            if (content) content.style.display = 'none';
            if (notFound) notFound.style.display = 'flex';
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

            if (p.category_path && Array.isArray(p.category_path) && p.category_path.length > 0) {
                const sorted = [...p.category_path].sort((a, b) => a.level - b.level);
                sorted.forEach((item) => {
                    parts.push('<i class="fas fa-chevron-right separator"></i>');
                    parts.push(`<a href="/categoria?category=${U.escapeAttr(item.slug)}">${U.escapeHtml(item.name)}</a>`);
                });
            } else if (p.category_name) {
                parts.push('<i class="fas fa-chevron-right separator"></i>');
                parts.push(`<a href="/produtos">${U.escapeHtml(p.category_name)}</a>`);
            }

            parts.push('<i class="fas fa-chevron-right separator"></i>');
            parts.push(`<span class="current">${U.escapeHtml(p.name)}</span>`);

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

            const primary = images.find((i) => i.is_primary) || images[0];
            mainImg.src = primary.url;
            mainImg.alt = p.name;

            thumbs.innerHTML = images.map((img, idx) => `
                <div class="gallery-thumb ${img.is_primary || idx === 0 ? 'active' : ''}" data-index="${idx}">
                    <img src="${U.escapeAttr(img.url)}" alt="${U.escapeAttr(p.name)} - imagem ${idx + 1}" loading="lazy">
                </div>
            `).join('');

            thumbs.querySelectorAll('.gallery-thumb').forEach((thumb) => {
                thumb.addEventListener('click', () => {
                    const idx = parseInt(thumb.dataset.index);
                    mainImg.src = images[idx].url;
                    thumbs.querySelectorAll('.gallery-thumb').forEach((t) => t.classList.remove('active'));
                    thumb.classList.add('active');
                });
            });

            document.getElementById('galleryZoom')?.addEventListener('click', () => {
                this.openZoom(mainImg.src);
            });

            mainImg.addEventListener('click', () => {
                this.openZoom(mainImg.src);
            });
        },

        openZoom(src) {
            const modal = document.createElement('div');
            modal.className = 'image-zoom-modal active';
            modal.innerHTML = `
                <button class="image-zoom-close" aria-label="Fechar">&times;</button>
                <img src="${U.escapeAttr(src)}" alt="Imagem ampliada">
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
                if (e.key === 'Escape') {
                    close();
                    document.removeEventListener('keydown', escHandler);
                }
            });
        },

        // ==================================================
        // BADGES (agora usando component)
        // ==================================================
        renderBadges() {
            const container = document.getElementById('productBadges');
            container.innerHTML = C.renderProductBadges(this.product);
        },

        // ==================================================
        // INFO BÁSICA
        // ==================================================
        renderBasicInfo() {
            const p = this.product;
            document.getElementById('productTitle').textContent = p.name;

            const metaParts = [];
            if (p.brand_name) metaParts.push(`Marca: <a href="/produtos?brand=${U.escapeAttr(p.brand_slug || '')}">${U.escapeHtml(p.brand_name)}</a>`);
            if (p.sku) metaParts.push(`SKU: ${U.escapeHtml(p.sku)}`);
            document.getElementById('productMeta').innerHTML = metaParts.join(' · ');
        },

        // ==================================================
        // AVALIAÇÃO (agora usando component)
        // ==================================================
        renderRating() {
            const p = this.product;
            const stars = document.getElementById('productStars');
            const count = document.getElementById('productRatingCount');

            const rating = parseFloat(p.rating_avg || 0);
            const total = parseInt(p.rating_count || 0);

            stars.innerHTML = C.renderStars(rating, { size: 0.95 });

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
                oldPriceEl.textContent = U.formatPrice(originalPrice);
                oldPriceEl.style.display = 'inline-block';
            } else {
                discountEl.style.display = 'none';
                oldPriceEl.style.display = 'none';
            }

            currentPriceEl.textContent = U.formatPrice(currentPrice);

            // Parcelamento
            const maxInstallments = 12;
            const minInstallment = 5;
            const installmentsCount = Math.min(
                maxInstallments,
                Math.max(1, Math.floor(currentPrice / minInstallment))
            );
            const installmentValue = currentPrice / installmentsCount;

            if (installmentsCount > 1) {
                installmentsEl.innerHTML = `ou <strong>${installmentsCount}x de ${U.formatPrice(installmentValue)}</strong> sem juros`;
            } else {
                installmentsEl.innerHTML = `<strong>${U.formatPrice(currentPrice)}</strong> à vista`;
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

            const grouped = {};
            p.variations.forEach((v) => {
                if (!grouped[v.type]) grouped[v.type] = [];
                grouped[v.type].push(v);
            });

            const labels = {
                size: 'Tamanho',
                color: 'Cor',
                material: 'Material',
                style: 'Estilo',
            };

            container.innerHTML = Object.entries(grouped).map(([type, vars]) => `
                <div class="variation-group">
                    <div class="variation-label">
                        ${labels[type] || type}:
                        <strong data-selected="${type}">${U.escapeHtml(vars[0].value)}</strong>
                    </div>
                    <div class="variation-options">
                        ${vars.map((v, idx) => `
                            <button class="variation-btn ${idx === 0 ? 'active' : ''}"
                                    data-type="${U.escapeAttr(type)}"
                                    data-value="${U.escapeAttr(v.value)}">
                                ${U.escapeHtml(v.value)}
                            </button>
                        `).join('')}
                    </div>
                </div>
            `).join('');

            container.style.display = 'flex';

            container.querySelectorAll('.variation-btn').forEach((btn) => {
                btn.addEventListener('click', () => {
                    const type = btn.dataset.type;
                    const value = btn.dataset.value;

                    container.querySelectorAll(`.variation-btn[data-type="${type}"]`).forEach((b) => b.classList.remove('active'));
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
            document.getElementById('productDescription').textContent =
                p.description || 'Sem descrição disponível.';
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

            if (p.specifications && p.specifications.length > 0) {
                p.specifications.forEach((s) => specs.push({ label: s.name, value: s.value }));
            }

            if (specs.length === 0) {
                container.innerHTML = '<p class="review-empty">Nenhuma especificação disponível.</p>';
                return;
            }

            container.innerHTML = specs.map((s) => `
                <div class="spec-item">
                    <span class="spec-label">${U.escapeHtml(s.label)}</span>
                    <span class="spec-value">${U.escapeHtml(s.value)}</span>
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

            container.innerHTML = p.reviews.map((review) => {
                const stars = Array(5).fill(0).map((_, i) =>
                    i < review.rating
                        ? '<i class="fas fa-star"></i>'
                        : '<i class="far fa-star"></i>'
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
                            <div class="review-date">${U.escapeHtml(date)}</div>
                        </div>
                        ${review.title ? `<div class="review-title">${U.escapeHtml(review.title)}</div>` : ''}
                        ${review.comment ? `<div class="review-comment">${U.escapeHtml(review.comment)}</div>` : ''}
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

            // Máscara de CEP (via Utils)
            const cepInput = document.getElementById('shippingCep');
            cepInput?.addEventListener('input', (e) => {
                e.target.value = U.maskCep(e.target.value);
            });

            // Tabs
            document.querySelectorAll('.tab-btn').forEach((btn) => {
                btn.addEventListener('click', () => {
                    const tab = btn.dataset.tab;
                    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
                    document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));
                    btn.classList.add('active');
                    document.getElementById(`tab-${tab}`)?.classList.add('active');
                });
            });
        },

        // ==================================================
        // CARRINHO
        // ==================================================
        async addToCart(quantity) {
            const p = this.product;

            if (!window.LuxuryCart) {
                C.createToast('Erro ao conectar com o carrinho. Recarregue a página.', 'error');
                return;
            }

            try {
                await window.LuxuryCart.addToCart(p.id, quantity);
                C.createToast(`"${p.name}" (${quantity}x) adicionado ao carrinho!`, 'success');
                U.announce(`${quantity} unidade(s) adicionada(s) ao carrinho`);
            } catch (error) {
                C.createToast(error.data?.error || 'Erro ao adicionar ao carrinho', 'error');
            }
        },

        buyNow(quantity) {
            const p = this.product;
            C.createToast(`Redirecionando para o checkout: "${p.name}" (${quantity}x)`, 'info');
            U.announce('Redirecionando para o checkout');
            // Futuramente: redirecionar para /checkout?product=<id>&qty=<quantity>
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

            // Simulação (futuramente: integrar com API dos Correios)
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
                : `Frete: ${U.formatPrice(price)}`;

            result.style.display = 'block';
            result.innerHTML = `
                <div>Entrega para <strong>${cep.substring(0, 5)}-${cep.substring(5)}</strong></div>
                <div style="margin-top: 0.35rem;">${priceText} · Prazo: ${days}</div>
            `;
        },

        // ==================================================
        // PRODUTOS RELACIONADOS (usando component)
        // ==================================================
        async loadRelated() {
            const section = document.getElementById('relatedSection');
            const grid = document.getElementById('relatedGrid');
            const p = this.product;

            try {
                const data = await API.get(`/products?category=${p.category_id}&limit=4`);
                let products = (data.products || []).filter((prod) => prod.id !== p.id);

                if (products.length === 0) {
                    const fallback = await API.get('/products?featured=true&limit=4');
                    products = (fallback.products || []).filter((prod) => prod.id !== p.id);
                }

                if (products.length === 0) {
                    section.style.display = 'none';
                    return;
                }

                // ✅ Usa o component
                grid.innerHTML = products.slice(0, 4)
                    .map((prod) => C.renderProductCard(prod, {
                        showShortDesc: true,
                        showButton: false,   // related cards só linkam o card inteiro
                        href: `/produto/${prod.slug}`,
                    }))
                    .join('');

                section.style.display = 'block';
            } catch (error) {
                console.error('Erro ao carregar produtos relacionados:', error);
                section.style.display = 'none';
            }
        },
    };

    // ======================================================
    // INICIALIZAÇÃO
    // ======================================================
    document.addEventListener('DOMContentLoaded', () => {
        ProductPage.init();
    });
})();