// ======================================================
// public/js/checkout.js
// Página de finalização de compra
// Depende de: core/utils.js, core/api.js, core/components.js
// ======================================================
(function () {
    'use strict';

    const U = window.LuxuryUtils;
    const API = window.LuxuryAPI;
    const C = window.LuxuryComponents;

    // ==================================================
    // ESTADO
    // ==================================================
    const state = {
        cart: null,
        subtotal: 0,
        shippingCost: 0,
        shippingFree: false,
        discount: 0,
        couponCode: null,
        total: 0,
        user: null,
    };

    // ==================================================
    // PÁGINA
    // ==================================================
    const CheckoutPage = {
        async init() {
            // Exige login
            if (!API.isLoggedIn()) {
                sessionStorage.setItem('luxury_redirect', '/checkout');
                window.location.href = '/login';
                return;
            }

            await this.loadUser();
            await this.loadCart();
            this.setupAddressForm();
            this.setupCepLookup();
            this.setupPaymentMethods();
            this.setupCoupon();
            this.setupSubmit();
        },

        // ==================================================
        // USUÁRIO
        // ==================================================
        async loadUser() {
            try {
                const user = await API.get('/auth/me');
                state.user = user;
                this.prefillAddress(user);
            } catch (error) {
                console.error('Erro ao carregar usuário:', error);
            }
        },

        prefillAddress(user) {
            const set = (id, value) => {
                const el = document.getElementById(id);
                if (el && value) el.value = value;
            };

            set('coCep', user.cep || '');
            set('coStreet', user.street || '');
            set('coNumber', user.number || '');
            set('coComplement', user.complement || '');
            set('coNeighborhood', user.neighborhood || '');
            set('coCity', user.city || '');
            set('coState', user.state || '');
        },

        // ==================================================
        // CARRINHO
        // ==================================================
        async loadCart() {
            try {
                const cart = await API.get('/cart');
                state.cart = cart;
                state.subtotal = parseFloat(cart.total) || 0;

                if (!cart.items || cart.items.length === 0) {
                    document.getElementById('checkoutLoading').style.display = 'none';
                    document.getElementById('checkoutContent').style.display = 'none';
                    document.getElementById('checkoutEmpty').style.display = 'flex';
                    return;
                }

                await this.calculateShipping();
                this.renderSummary();
                await this.loadAvailableCoupons();

                document.getElementById('checkoutLoading').style.display = 'none';
                document.getElementById('checkoutContent').style.display = 'grid';
            } catch (error) {
                console.error('Erro ao carregar carrinho:', error);
                C.createToast('Erro ao carregar carrinho', 'error');
            }
        },

        // ==================================================
        // CÁLCULO DE FRETE
        // ==================================================
        async calculateShipping() {
            const cep = document.getElementById('coCep').value.replace(/\D/g, '');

            if (cep.length !== 8) {
                state.shippingCost = state.subtotal >= 99.9 ? 0 : 19.9;
                state.shippingFree = state.shippingCost === 0;
                this.updateTotals();
                return;
            }

            try {
                const data = await API.get(
                    `/orders/shipping/quote?cep=${cep}&subtotal=${state.subtotal}`
                );
                state.shippingCost = data.shipping_cost;
                state.shippingFree = data.is_free;
                this.updateTotals();
            } catch (error) {
                console.warn('Erro ao calcular frete, usando padrão:', error);
                state.shippingCost = state.subtotal >= 99.9 ? 0 : 19.9;
                state.shippingFree = state.shippingCost === 0;
                this.updateTotals();
            }
        },

        // ==================================================
        // RESUMO
        // ==================================================
        renderSummary() {
            const cart = state.cart;
            const itemsContainer = document.getElementById('summaryItems');

            if (!itemsContainer || !cart.items) return;

            itemsContainer.innerHTML = cart.items.map((item) => {
                const img = item.image?.url
                    ? `<img src="${U.escapeAttr(item.image.url)}" alt="${U.escapeAttr(item.name)}">`
                    : `<i class="fas fa-image"></i>`;

                return `
                    <div class="checkout-summary-item">
                        <div class="checkout-summary-item-image">${img}</div>
                        <div class="checkout-summary-item-info">
                            <div class="checkout-summary-item-name">${U.escapeHtml(item.name)}</div>
                            <div class="checkout-summary-item-qty">${item.quantity}x</div>
                        </div>
                        <div class="checkout-summary-item-price">${U.formatPrice(item.subtotal)}</div>
                    </div>
                `;
            }).join('');

            this.updateTotals();
        },

        updateTotals() {
            const subtotalEl = document.getElementById('summarySubtotal');
            const shippingEl = document.getElementById('summaryShipping');
            const discountEl = document.getElementById('summaryDiscount');
            const totalEl = document.getElementById('summaryTotal');

            if (subtotalEl) subtotalEl.textContent = U.formatPrice(state.subtotal);

            if (shippingEl) {
                if (state.shippingFree) {
                    shippingEl.innerHTML = '<span style="color: var(--success-dark); font-weight: 700;">Grátis</span>';
                } else {
                    shippingEl.textContent = U.formatPrice(state.shippingCost);
                }
            }

            if (discountEl) {
                if (state.discount > 0) {
                    discountEl.innerHTML = `<span style="color: var(--success-dark); font-weight: 700;">- ${U.formatPrice(state.discount)}</span>`;
                } else {
                    discountEl.textContent = '—';
                }
            }

            state.total = state.subtotal + state.shippingCost - state.discount;

            if (totalEl) totalEl.textContent = U.formatPrice(state.total);
        },

        // ==================================================
        // ENDEREÇO
        // ==================================================
        setupAddressForm() {
            const fields = ['coCep', 'coNumber', 'coComplement'];
            fields.forEach((id) => {
                const input = document.getElementById(id);
                input?.addEventListener('input', () => this.calculateShipping());
            });
        },

        // ==================================================
        // CEP LOOKUP
        // ==================================================
        setupCepLookup() {
            const cepInput = document.getElementById('coCep');
            const status = document.getElementById('coCepStatus');
            if (!cepInput) return;

            cepInput.addEventListener('input', (e) => {
                e.target.value = U.maskCep(e.target.value);
            });

            let lastCep = '';

            cepInput.addEventListener('blur', async () => {
                const cep = cepInput.value.replace(/\D/g, '');
                if (cep.length !== 8 || cep === lastCep) return;
                lastCep = cep;

                status.className = 'cep-status loading';

                try {
                    const data = await API.get(`/cep/${cep}`);
                    document.getElementById('coStreet').value = data.street || '';
                    document.getElementById('coNeighborhood').value = data.neighborhood || '';
                    document.getElementById('coCity').value = data.city || '';
                    document.getElementById('coState').value = data.state || '';
                    document.getElementById('coComplement').value = data.complement || '';
                    status.className = 'cep-status success';
                    document.getElementById('coNumber')?.focus();

                    await this.calculateShipping();
                } catch (error) {
                    status.className = 'cep-status error';
                    ['coStreet', 'coNeighborhood', 'coCity', 'coState'].forEach((id) => {
                        const el = document.getElementById(id);
                        if (el) el.value = '';
                    });
                }
            });
        },

        // ==================================================
        // PAGAMENTO
        // ==================================================
        setupPaymentMethods() {
            // CSS já lida com o visual, só precisamos garantir que está OK
        },

        // ==================================================
        // CUPONS DISPONÍVEIS (automático)
        // ==================================================
        async loadAvailableCoupons() {
            const container = document.getElementById('availableCoupons');
            const list = document.getElementById('availableCouponsList');
            if (!container || !list) return;

            try {
                const data = await API.get(`/promotions/available?subtotal=${state.subtotal}`);
                const coupons = data.coupons || [];

                if (coupons.length === 0) {
                    container.style.display = 'none';
                    return;
                }

                // Oculta cupons que já foram aplicados
                const filtered = coupons.filter((c) => c.code !== state.couponCode);

                if (filtered.length === 0) {
                    container.style.display = 'none';
                    return;
                }

                container.style.display = 'block';

                list.innerHTML = filtered.map((c) => {
                    const minText = c.min_purchase
                        ? `Mínimo: ${U.formatPrice(c.min_purchase)}`
                        : 'Sem valor mínimo';

                    const typeLabel = c.discount_type === 'percentage'
                        ? `${c.discount_value}% OFF`
                        : `R$ ${c.discount_value.toFixed(2).replace('.', ',')} OFF`;

                    return `
                        <div class="coupon-card" data-coupon-code="${U.escapeAttr(c.code)}">
                            <div class="coupon-card-left">
                                <div class="coupon-card-code">
                                    <i class="fas fa-ticket-alt"></i>
                                    ${U.escapeHtml(c.code)}
                                </div>
                                <div class="coupon-card-name">${U.escapeHtml(c.name)}</div>
                                <div class="coupon-card-meta">
                                    <span class="coupon-card-type">${typeLabel}</span>
                                    <span class="coupon-card-sep">·</span>
                                    <span>${minText}</span>
                                </div>
                            </div>
                            <button type="button" class="coupon-card-apply"
                                    data-apply-coupon="${U.escapeAttr(c.code)}">
                                Aplicar
                            </button>
                        </div>
                    `;
                }).join('');

                // Bind "Aplicar" em cada cupom
                list.querySelectorAll('[data-apply-coupon]').forEach((btn) => {
                    btn.addEventListener('click', () => {
                        const code = btn.dataset.applyCoupon;
                        this.applyCouponByCode(code);
                    });
                });
            } catch (error) {
                console.error('Erro ao carregar cupons disponíveis:', error);
                container.style.display = 'none';
            }
        },

        // ==================================================
        // CUPOM (manual + auto)
        // ==================================================
        setupCoupon() {
            const btn = document.getElementById('applyCouponBtn');
            const input = document.getElementById('couponInput');
            const feedback = document.getElementById('couponFeedback');

            if (!btn) return;

            btn.addEventListener('click', async () => {
                const code = input.value.trim().toUpperCase();
                feedback.className = 'checkout-coupon-feedback';
                feedback.textContent = '';

                if (!code) {
                    feedback.className = 'checkout-coupon-feedback error';
                    feedback.textContent = 'Digite um código';
                    return;
                }

                await this.applyCouponByCode(code, { source: 'manual', feedbackEl: feedback, btnEl: btn });
            });
        },

        // ==================================================
        // APLICA CUPOM (usado por manual e auto)
        // ==================================================
        async applyCouponByCode(code, opts = {}) {
            const { source = 'auto', feedbackEl, btnEl } = opts;

            const feedback = feedbackEl || document.getElementById('couponFeedback');
            const input = document.getElementById('couponInput');

            if (source === 'manual' && btnEl) {
                btnEl.disabled = true;
                btnEl.textContent = '...';
            }

            feedback.className = 'checkout-coupon-feedback';
            feedback.textContent = '';

            try {
                const promo = await API.get(`/promotions/code/${encodeURIComponent(code)}`);

                // Valida min_purchase
                if (promo.min_purchase && state.subtotal < parseFloat(promo.min_purchase)) {
                    throw {
                        data: {
                            error: `Este cupom exige compra mínima de ${U.formatPrice(promo.min_purchase)}`,
                        },
                    };
                }

                // Calcula desconto
                let discount = 0;
                if (promo.discount_type === 'percentage') {
                    discount = (state.subtotal * parseFloat(promo.discount_value)) / 100;
                    if (promo.max_discount) {
                        discount = Math.min(discount, parseFloat(promo.max_discount));
                    }
                } else if (promo.discount_type === 'fixed') {
                    discount = parseFloat(promo.discount_value);
                }

                state.discount = Math.min(discount, state.subtotal);
                state.couponCode = code;
                this.updateTotals();

                // Preenche o input manual (para consistência visual)
                if (input) input.value = code;

                feedback.className = 'checkout-coupon-feedback success';
                feedback.textContent = `Cupom "${code}" aplicado! Desconto: ${U.formatPrice(state.discount)}`;

                C.createToast(`Cupom aplicado: ${U.formatPrice(state.discount)} de desconto`, 'success');

                // Recarrega a lista de cupons disponíveis (para excluir o aplicado)
                await this.loadAvailableCoupons();
            } catch (error) {
                feedback.className = 'checkout-coupon-feedback error';
                feedback.textContent = error.data?.error || 'Cupom inválido ou expirado';
                state.discount = 0;
                state.couponCode = null;
                this.updateTotals();

                if (source === 'auto') {
                    C.createToast(error.data?.error || 'Cupom inválido', 'error');
                }
            } finally {
                if (source === 'manual' && btnEl) {
                    btnEl.disabled = false;
                    btnEl.textContent = 'Aplicar';
                }
            }
        },

        // ==================================================
        // SUBMIT
        // ==================================================
        setupSubmit() {
            const btn = document.getElementById('checkoutSubmitBtn');
            if (!btn) return;

            btn.addEventListener('click', () => this.submitOrder());
        },

        async submitOrder() {
            const btn = document.getElementById('checkoutSubmitBtn');
            const originalHtml = btn.innerHTML;

            // Valida endereço
            const cep = document.getElementById('coCep').value.replace(/\D/g, '');
            const street = document.getElementById('coStreet').value.trim();
            const number = document.getElementById('coNumber').value.trim();
            const neighborhood = document.getElementById('coNeighborhood').value.trim();
            const city = document.getElementById('coCity').value.trim();
            const state = document.getElementById('coState').value.trim();

            if (!cep || cep.length !== 8) {
                C.createToast('Informe um CEP válido', 'error');
                document.getElementById('coCep').focus();
                return;
            }
            if (!street) {
                C.createToast('Informe a rua', 'error');
                document.getElementById('coStreet').focus();
                return;
            }
            if (!number) {
                C.createToast('Informe o número', 'error');
                document.getElementById('coNumber').focus();
                return;
            }
            if (!neighborhood || !city || !state) {
                C.createToast('Preencha o CEP para buscar o endereço', 'error');
                document.getElementById('coCep').focus();
                return;
            }

            // Método de pagamento
            const paymentMethod = document.querySelector('input[name="payment_method"]:checked')?.value;
            if (!paymentMethod) {
                C.createToast('Selecione uma forma de pagamento', 'error');
                return;
            }

            // Notas
            const notes = document.getElementById('checkoutNotes').value.trim();

            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';

            try {
                const response = await API.post('/orders', {
                    payment_method: paymentMethod,
                    shipping_address: {
                        cep,
                        street,
                        number,
                        complement: document.getElementById('coComplement').value.trim() || null,
                        neighborhood,
                        city,
                        state,
                    },
                    notes: notes || null,
                    coupon_code: state.couponCode,   // 👈 enviado ao backend
                });

                // Atualiza badge do carrinho
                if (window.LuxuryCart) {
                    window.LuxuryCart.updateBadge(0);
                }

                C.createToast('Pedido criado! Redirecionando...', 'success');

                setTimeout(() => {
                    window.location.href = `/pedido/${response.order.id}`;
                }, 800);
            } catch (error) {
                console.error('Erro ao criar pedido:', error);
                C.createToast(error.data?.error || 'Erro ao finalizar pedido', 'error');
                btn.disabled = false;
                btn.innerHTML = originalHtml;
            }
        },
    };

    // ======================================================
    // INICIALIZAÇÃO
    // ======================================================
    document.addEventListener('DOMContentLoaded', () => {
        CheckoutPage.init();
    });
})();