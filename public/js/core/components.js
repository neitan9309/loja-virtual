// ======================================================
// public/js/core/components.js
// Renderizadores reutilizáveis (retornam strings HTML)
// Uso: window.LuxuryComponents.renderProductCard(product)
// ======================================================
(function () {
    'use strict';

    // Dependência: LuxuryUtils
    const U = window.LuxuryUtils;

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

            const buttonHtml = showButton
                ? `<a href="${U.escapeAttr(href)}" class="product-btn">${U.escapeHtml(buttonText)}</a>`
                : '';

            return `
                <article class="product-card">
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
                </article>
            `;
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
        // TOAST (retorna elemento DOM, não string)
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

    // Expõe globalmente
    window.LuxuryComponents = Components;
})();