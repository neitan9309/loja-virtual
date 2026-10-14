// ======================================================
// public/js/core/components.js
// Renderizadores reutilizáveis (retornam strings HTML)
// + ResponsiveCarousel (grid desktop / carrossel mobile)
// Uso: window.LuxuryComponents.renderProductCard(product)
//      window.LuxuryResponsiveCarousel.setup({ grid, ... })
// ======================================================
(function () {
    'use strict';

    // Dependência: LuxuryUtils
    const U = window.LuxuryUtils;

    // ==================================================
    // COMPONENTS (renderizadores de HTML)
    // ==================================================
    const Components = {
        // ==================================================
        // PRODUTO (card padrão)
        // ==================================================
        renderProductCard(product, options = {}) {
            const {
                showShortDesc = true,
                showButton = true,
                buttonText = 'Ver Produto',
                href = `/produto/${product.slug || ''}`,
                clickableCard = false,
            } = options;

            const hasImage =
                product.images && product.images.length > 0 && product.images[0].url;

            const imageHtml = hasImage
                ? `<img class="product-image"
                        src="${U.escapeAttr(product.images[0].url)}"
                        alt="${U.escapeAttr(product.name)}"
                        loading="lazy"
                        onerror="this.parentElement.innerHTML='<div class=\\'product-image-placeholder\\'><i class=\\'fas fa-image\\'></i></div>'">`
                : `<div class="product-image-placeholder"><i class="fas fa-image"></i></div>`;

            const discount = parseFloat(product.discount_percent || 0);
            const originalPrice = parseFloat(product.price);
            const currentPrice = discount > 0
                ? originalPrice * (1 - discount / 100)
                : originalPrice;

            const discountBadge = discount > 0
                ? `<span class="product-badge discount">-${discount.toFixed(0)}%</span>`
                : product.is_new
                  ? '<span class="product-badge">Novo</span>'
                  : '';

            const oldPriceHtml = discount > 0
                ? `<span class="product-old-price">${U.formatPrice(originalPrice)}</span>`
                : '';

            const shortDescHtml =
                showShortDesc && product.short_description
                    ? `<p class="product-short-desc">${U.escapeHtml(product.short_description)}</p>`
                    : '';

            const shouldShowButton = showButton && !clickableCard;

            const buttonHtml = shouldShowButton
                ? `<span class="product-btn">${U.escapeHtml(buttonText)}</span>`
                : '';

            const innerHtml = `
                <div class="product-image-wrapper">
                    ${discountBadge}
                    ${imageHtml}
                </div>
                <div class="product-info">
                    <h3 class="product-name">${U.escapeHtml(product.name)}</h3>
                    ${shortDescHtml}
                    <div class="product-price-wrapper">
                        <span class="product-price">${U.formatPrice(currentPrice)}</span>
                        ${oldPriceHtml}
                    </div>
                    ${buttonHtml}
                </div>
            `;

            if (clickableCard) {
                return `
                    <a href="${U.escapeAttr(href)}"
                       class="product-card product-card-link"
                       aria-label="Ver ${U.escapeAttr(product.name)}">
                        ${innerHtml}
                    </a>
                `;
            }

            return `<article class="product-card">${innerHtml}</article>`;
        },

        // ==================================================
        // CATEGORIA (card padrão)
        // ==================================================
        renderCategoryCard(category, options = {}) {
            const {
                icon = 'fa-tag',
                href = `/categoria?category=${category.slug || ''}`,
                countLabel = null,
                arrowLabel = 'Escolher',
            } = options;

            const childrenCount = category.children?.length || 0;
            const finalCountLabel =
                countLabel ||
                (childrenCount === 0
                    ? 'Ver produtos'
                    : childrenCount === 1
                      ? '1 subcategoria'
                      : `${childrenCount} subcategorias`);

            return `
                <a href="${U.escapeAttr(href)}" class="category-card"
                   aria-label="Ver ${U.escapeAttr(category.name)}">
                    <div class="category-card-icon">
                        <i class="fas ${U.escapeAttr(icon)}"></i>
                    </div>
                    <div class="category-card-name">${U.escapeHtml(category.name)}</div>
                    ${
                        category.description
                            ? `<div class="category-card-description">${U.escapeHtml(category.description)}</div>`
                            : ''
                    }
                    <div class="category-card-count">${U.escapeHtml(finalCountLabel)}</div>
                    <div class="category-card-arrow">
                        <i class="fas fa-arrow-right"></i> ${U.escapeHtml(arrowLabel)}
                    </div>
                </a>
            `;
        },

        // ==================================================
        // ESTRELAS DE AVALIAÇÃO
        // ==================================================
        renderStars(rating, options = {}) {
            const {
                size = 0.95,
                showEmpty = true,
            } = options;

            const r = parseFloat(rating) || 0;
            let html = '';
            for (let i = 1; i <= 5; i++) {
                if (i <= Math.floor(r)) {
                    html += '<i class="fas fa-star"></i>';
                } else if (i - 0.5 <= r) {
                    html += '<i class="fas fa-star-half-alt"></i>';
                } else if (showEmpty) {
                    html += '<i class="fas fa-star star-empty"></i>';
                } else {
                    html += '<i class="far fa-star"></i>';
                }
            }
            return `<span class="stars" style="font-size: ${size}rem">${html}</span>`;
        },

        // ==================================================
        // BADGES DE PRODUTO
        // ==================================================
        renderProductBadges(product) {
            const badges = [];
            const discount = parseFloat(product.discount_percent || 0);

            if (product.is_new) {
                badges.push('<span class="product-badge new"><i class="fas fa-certificate"></i> Novo</span>');
            }
            if (product.is_best_seller) {
                badges.push('<span class="product-badge bestseller"><i class="fas fa-trophy"></i> Mais Vendido</span>');
            }
            if (product.is_featured) {
                badges.push('<span class="product-badge featured"><i class="fas fa-star"></i> Destaque</span>');
            }
            if (discount > 0) {
                badges.push(`<span class="product-badge sale">-${discount.toFixed(0)}% OFF</span>`);
            }

            return badges.join('');
        },

        // ==================================================
        // EMPTY STATE
        // ==================================================
        renderEmptyState({ icon = 'fa-box-open', title, message, cta }) {
            const ctaHtml = cta
                ? `<a href="${U.escapeAttr(cta.href)}" class="btn btn-primary" style="margin-top: 1rem;">
                       ${U.escapeHtml(cta.label)}
                   </a>`
                : '';

            return `
                <div class="empty-state">
                    <i class="fas ${U.escapeAttr(icon)}"></i>
                    <h3>${U.escapeHtml(title)}</h3>
                    <p>${U.escapeHtml(message)}</p>
                    ${ctaHtml}
                </div>
            `;
        },

        // ==================================================
        // LOADING
        // ==================================================
        renderLoading(message = 'Carregando...') {
            return `
                <div class="loading-state">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>${U.escapeHtml(message)}</span>
                </div>
            `;
        },

        // ==================================================
        // BREADCRUMB
        // ==================================================
        renderBreadcrumb(items, options = {}) {
            const { separator = '<i class="fas fa-chevron-right separator"></i>' } = options;

            const parts = [];
            items.forEach((item, index) => {
                const isLast = index === items.length - 1;
                const isFirst = index === 0;

                if (isLast) {
                    parts.push(`<span class="current">${U.escapeHtml(item.name)}</span>`);
                } else {
                    const icon = isFirst ? '<i class="fas fa-home"></i>' : '';
                    parts.push(
                        `<a href="${U.escapeAttr(item.url)}">${icon}<span>${U.escapeHtml(item.name)}</span></a>`
                    );
                }

                if (!isLast) parts.push(separator);
            });

            return parts.join('');
        },

        // ==================================================
        // TOAST (retorna elemento DOM)
        // ==================================================
        createToast(message, type = 'info', duration = 3500) {
            const icons = {
                success: 'fa-check-circle',
                error: 'fa-times-circle',
                warning: 'fa-exclamation-triangle',
                info: 'fa-info-circle',
            };

            const toast = document.createElement('div');
            toast.className = `product-toast ${type}`;
            toast.innerHTML = `
                <i class="fas ${icons[type] || icons.info}"></i>
                <span>${U.escapeHtml(message)}</span>
            `;

            document.body.appendChild(toast);
            setTimeout(() => toast.classList.add('show'), 10);
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, duration);

            return toast;
        },
    };

    // ==================================================
    // RESPONSIVE CAROUSEL
    // Grid no desktop / Carrossel no mobile
    // Uso:
    //   window.LuxuryResponsiveCarousel.setup({
    //     grid, dotsContainer, prevBtn, nextBtn, total
    //   })
    // ==================================================
    const ResponsiveCarousel = {
        MOBILE_BREAKPOINT: 768,

        setup({ grid, dotsContainer, prevBtn, nextBtn, total }) {
            if (!grid || total === 0) return;

            let currentIndex = 0;
            let isTransitioning = false;

            const isMobile = () => window.innerWidth <= this.MOBILE_BREAKPOINT;

            // ---------- LAYOUT ----------
            const applyLayout = () => {
                const btns = [prevBtn, nextBtn].filter(Boolean);
                const dots = dotsContainer;

                if (isMobile()) {
                    grid.classList.add('is-carousel');
                    btns.forEach((b) => b.removeAttribute('hidden'));
                    dots?.removeAttribute('hidden');
                } else {
                    grid.classList.remove('is-carousel');
                    btns.forEach((b) => b.setAttribute('hidden', ''));
                    dots?.setAttribute('hidden', '');
                }

                grid.style.transform = '';
                updateCarousel(false);
            };

            // ---------- UPDATE ----------
            const updateCarousel = (animate = true) => {
                if (!isMobile()) {
                    grid.style.transition = 'none';
                    grid.style.transform = '';
                    return;
                }

                if (total === 0) return;

                currentIndex = Math.max(0, Math.min(currentIndex, total - 1));

                const card = grid.querySelector('.category-card, .product-card');
                if (!card) return;

                const cardWidth = card.offsetWidth;
                const gap = parseFloat(getComputedStyle(grid).gap) || 0;
                const offset = -(cardWidth + gap) * currentIndex;

                grid.style.transition = animate
                    ? 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
                    : 'none';
                grid.style.transform = `translateX(${offset}px)`;

                if (dotsContainer) {
                    dotsContainer.querySelectorAll('.carousel-dot').forEach((dot, i) => {
                        dot.classList.toggle('active', i === currentIndex);
                    });
                }

                if (prevBtn) prevBtn.disabled = currentIndex === 0;
                if (nextBtn) nextBtn.disabled = currentIndex >= total - 1;
            };

            // ---------- DOTS ----------
            const renderDots = () => {
                if (!dotsContainer) return;
                dotsContainer.innerHTML = '';

                if (!isMobile() || total <= 1) return;

                for (let i = 0; i < total; i++) {
                    const dot = document.createElement('button');
                    dot.className = 'carousel-dot';
                    dot.setAttribute('aria-label', `Ir para item ${i + 1}`);
                    dot.addEventListener('click', () => {
                        currentIndex = i;
                        updateCarousel(true);
                    });
                    dotsContainer.appendChild(dot);
                }
                updateCarousel(false);
            };

            // ---------- NAV ----------
            const goTo = (index) => {
                if (isTransitioning) return;
                if (index < 0 || index >= total || index === currentIndex) return;

                isTransitioning = true;
                currentIndex = index;
                updateCarousel(true);
                setTimeout(() => {
                    isTransitioning = false;
                }, 450);
            };

            prevBtn?.addEventListener('click', () => goTo(currentIndex - 1));
            nextBtn?.addEventListener('click', () => goTo(currentIndex + 1));

            // ---------- TOUCH ----------
            let touchStartX = 0;
            let touchStartY = 0;
            let isSwiping = false;

            grid.addEventListener(
                'touchstart',
                (e) => {
                    if (!isMobile() || isTransitioning) return;
                    touchStartX = e.touches[0].clientX;
                    touchStartY = e.touches[0].clientY;
                    isSwiping = false;
                },
                { passive: true }
            );

            grid.addEventListener(
                'touchmove',
                (e) => {
                    if (!isMobile() || isTransitioning) return;
                    const deltaX = e.touches[0].clientX - touchStartX;
                    const deltaY = e.touches[0].clientY - touchStartY;
                    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 5) {
                        isSwiping = true;
                        e.preventDefault();
                    }
                },
                { passive: false }
            );

            grid.addEventListener('touchend', (e) => {
                if (!isMobile() || isTransitioning) return;
                if (isSwiping) {
                    const deltaX = e.changedTouches[0].clientX - touchStartX;
                    if (Math.abs(deltaX) > 40) {
                        if (deltaX < 0) goTo(currentIndex + 1);
                        else goTo(currentIndex - 1);
                    }
                }
                isSwiping = false;
            });

            // ---------- RESIZE ----------
            const debouncedResize = U.debounce(() => {
                applyLayout();
                renderDots();
            }, 200);

            window.addEventListener('resize', debouncedResize);

            // ---------- INIT ----------
            applyLayout();
            renderDots();
        },
    };

    // ==================================================
    // EXPOR GLOBAL
    // ==================================================
    window.LuxuryComponents = Components;
    window.LuxuryResponsiveCarousel = ResponsiveCarousel;
})();