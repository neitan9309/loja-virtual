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
        selectedAddressId: null,
    };

    // ==================================================
    // PÁGINA
    // ==================================================
    const CheckoutPage = {
        async init() {
            if (!API.isLoggedIn()) {
                sessionStorage.setItem('luxury_redirect', '/checkout');
                window.location.href = '/login';
                return;
            }

            // Carrega dados essenciais
            await this.loadUser();
            await this.loadCart();
            
            // Carrega endereços salvos e configura formulários
            await this.loadSavedAddresses();
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
                // Não preenche mais automaticamente o endereço do perfil aqui,
                // pois vamos usar a lista de endereços salvos.
            } catch (error) {
                console.error('Erro ao carregar usuário:', error);
            }
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
                    const loadingEl = document.getElementById('checkoutLoading');
                    const contentEl = document.getElementById('checkoutContent');
                    const emptyEl = document.getElementById('checkoutEmpty');

                    if (loadingEl) loadingEl.style.display = 'none';
                    if (contentEl) contentEl.style.display = 'none';
                    if (emptyEl) emptyEl.style.display = 'flex';
                    return;
                }

                await this.calculateShipping();
                this.renderSummary();
                await this.loadAvailableCoupons();

                const loadingEl = document.getElementById('checkoutLoading');
                const contentEl = document.getElementById('checkoutContent');
                if (loadingEl) loadingEl.style.display = 'none';
                if (contentEl) contentEl.style.display = 'grid';
            } catch (error) {
                console.error('Erro ao carregar carrinho:', error);
                C.createToast('Erro ao carregar carrinho', 'error');
            }
        },

        // ==================================================
        // CÁLCULO DE FRETE (BLINDADO)
        // ==================================================
        async calculateShipping() {
            const cepInput = document.getElementById('coCep');
            if (!cepInput) return; // Se o input não existe, aborta silenciosamente

            const cep = cepInput.value.replace(/\D/g, '');

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
        // ENDEREÇOS SALVOS
        // ==================================================
        async loadSavedAddresses() {
            try {
                const addresses = await API.get('/addresses');
                const container = document.getElementById('savedAddressesList');
                const formContainer = document.getElementById('newAddressFormContainer');
                
                if (!container || !formContainer) return;

                if (addresses.length === 0) {
                    container.style.display = 'none';
                    formContainer.style.display = 'block';
                    return;
                }

                container.style.display = 'block';
                formContainer.style.display = 'none';

                container.innerHTML = `
                    <div class="checkout-address-list">
                        ${addresses.map(addr => `
                            <label class="checkout-address-option">
                                <input type="radio" name="saved_address" value="${addr.id}" ${addr.is_default ? 'checked' : ''}>
                                <div class="checkout-address-box">
                                    <strong>${U.escapeHtml(addr.label)}</strong>
                                    <span>${U.escapeHtml(addr.street)}, ${U.escapeHtml(addr.number)} ${addr.complement ? '· ' + U.escapeHtml(addr.complement) : ''}</span>
                                    <span>${U.escapeHtml(addr.neighborhood)} · ${U.escapeHtml(addr.city)} - ${U.escapeHtml(addr.state)}</span>
                                    <span>CEP: ${U.escapeHtml(addr.cep)}</span>
                                </div>
                            </label>
                        `).join('')}
                    </div>
                `;

                // Se tem padrão, já preenche o form
                const defaultAddress = addresses.find(a => a.is_default);
                if (defaultAddress) {
                    state.selectedAddressId = defaultAddress.id;
                    this.fillAddressFields(defaultAddress);
                }

                // Listener para selecionar endereço
                container.querySelectorAll('input[name="saved_address"]').forEach(radio => {
                    radio.addEventListener('change', () => {
                        const selectedId = radio.value;
                        state.selectedAddressId = selectedId;
                        const addr = addresses.find(a => a.id == selectedId);
                        if (addr) this.fillAddressFields(addr);
                    });
                });

                // Toggle para novo endereço
                const toggleBtn = document.getElementById('btnToggleNewAddress');
                if (toggleBtn && !toggleBtn.dataset.bound) {
                    toggleBtn.dataset.bound = 'true';
                    toggleBtn.addEventListener('click', () => {
                        const isHidden = formContainer.style.display === 'none';
                        formContainer.style.display = isHidden ? 'block' : 'none';
                        container.style.display = isHidden ? 'none' : 'block';
                        
                        if (isHidden) {
                            state.selectedAddressId = null;
                            container.querySelectorAll('input[name="saved_address"]').forEach(r => r.checked = false);
                            this.fillAddressFields({ cep: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '' });
                        } else {
                            if (defaultAddress) {
                                state.selectedAddressId = defaultAddress.id;
                                this.fillAddressFields(defaultAddress);
                                const radio = container.querySelector(`input[value="${defaultAddress.id}"]`);
                                if (radio) radio.checked = true;
                            }
                        }
                    });
                }

            } catch (error) {
                console.error('Erro ao carregar endereços salvos:', error);
            }
        },

        fillAddressFields(addr) {
            const setVal = (id, value) => {
                const el = document.getElementById(id);
                if (el) el.value = value;
            };

            setVal('coCep', addr.cep || '');
            setVal('coStreet', addr.street || '');
            setVal('coNumber', addr.number || '');
            setVal('coComplement', addr.complement || '');
            setVal('coNeighborhood', addr.neighborhood || '');
            setVal('coCity', addr.city || '');
            setVal('coState', addr.state || '');
            
            // Recalcula o frete ao trocar de endereço
            this.calculateShipping();
        },

        // ==================================================
        // FORMULÁRIO DE ENDEREÇO
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
            if (!cepInput || !status) return;

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
            // CSS já lida com o visual
        },

        // ==================================================
        // CUPONS DISPONÍVEIS
        // ==================================================
        async loadAvailableCoupons() {
            const container = document.getElementById('availableCoupons');
            const list = document.getElementById('availableCouponsList');
            if (!container || !list) return;

            try {
                const cartItems = state.cart.items || [];
                const itemsParam = encodeURIComponent(JSON.stringify(cartItems));
                
                const data = await API.get(`/promotions/available?subtotal=${state.subtotal}&items=${itemsParam}`);
                const coupons = data.coupons || [];

                if (coupons.length === 0) {
                    container.style.display = 'none';
                    return;
                }

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

            if (!btn || !input || !feedback) return;

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
        // APLICA CUPOM
        // ==================================================
        async applyCouponByCode(code, opts = {}) {
            const { source = 'auto', feedbackEl, btnEl } = opts;

            const feedback = feedbackEl || document.getElementById('couponFeedback');
            const input = document.getElementById('couponInput');

            if (source === 'manual' && btnEl) {
                btnEl.disabled = true;
                btnEl.textContent = '...';
            }

            if (feedback) {
                feedback.className = 'checkout-coupon-feedback';
                feedback.textContent = '';
            }

            try {
                const promo = await API.get(`/promotions/code/${encodeURIComponent(code)}`);

                // Validação de categoria
                if (promo.restricted_category_id && !promo.applies_to_all) {
                    const cartItems = state.cart.items || [];
                    const itemsParam = encodeURIComponent(JSON.stringify(cartItems));
                    const availableData = await API.get(`/promotions/available?subtotal=${state.subtotal}&items=${itemsParam}`);
                    const availableCoupons = availableData.coupons || [];
                    const isAvailable = availableCoupons.some(c => c.code === code);

                    if (!isAvailable) {
                        throw {
                            data: {
                                error: 'Este cupom não se aplica aos produtos do seu carrinho',
                            },
                        };
                    }
                }

                // Calcula desconto
                let discount = 0;
                if (promo.discount_type === 'percentage') {
                    const cartItems = state.cart.items || [];
                    const itemsParam = encodeURIComponent(JSON.stringify(cartItems));
                    const availableData = await API.get(`/promotions/available?subtotal=${state.subtotal}&items=${itemsParam}`);
                    const couponData = (availableData.coupons || []).find(c => c.code === code);
                    if (couponData) {
                        discount = couponData.savings;
                    } else {
                        discount = (state.subtotal * parseFloat(promo.discount_value)) / 100;
                        if (promo.max_discount) {
                            discount = Math.min(discount, parseFloat(promo.max_discount));
                        }
                    }
                } else if (promo.discount_type === 'fixed') {
                    discount = parseFloat(promo.discount_value);
                }

                state.discount = Math.min(discount, state.subtotal);
                state.couponCode = code;
                this.updateTotals();

                if (input) input.value = code;

                if (feedback) {
                    feedback.className = 'checkout-coupon-feedback success';
                    feedback.textContent = `Cupom "${code}" aplicado! Desconto: ${U.formatPrice(state.discount)}`;
                }

                C.createToast(`Cupom aplicado: ${U.formatPrice(state.discount)} de desconto`, 'success');

                await this.loadAvailableCoupons();
            } catch (error) {
                if (feedback) {
                    feedback.className = 'checkout-coupon-feedback error';
                    if (error.data?.code === 'FIRST_PURCHASE_ONLY') {
                        feedback.textContent = 'Este cupom é válido apenas para a primeira compra.';
                    } else {
                        feedback.textContent = error.data?.error || 'Cupom inválido ou expirado';
                    }
                }
                
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
            document.addEventListener('click', (e) => {
                const btn = e.target.closest('#checkoutSubmitBtn');
                if (btn) {
                    e.preventDefault();
                    this.submitOrder();
                }
            });
        },

        async submitOrder() {
            const btn = document.getElementById('checkoutSubmitBtn');
            if (!btn) return;
            if (btn.disabled) return;

            const originalHtml = btn.innerHTML;

            // Lê o cupom do input
            const couponCodeInput = document.getElementById('couponInput');
            const currentCoupon = couponCodeInput ? couponCodeInput.value.trim().toUpperCase() : null;

            // Validações de endereço
            const cepEl = document.getElementById('coCep');
            const streetEl = document.getElementById('coStreet');
            const numberEl = document.getElementById('coNumber');
            const neighborhoodEl = document.getElementById('coNeighborhood');
            const cityEl = document.getElementById('coCity');
            const stateEl = document.getElementById('coState');

            if (!cepEl || !streetEl || !numberEl || !neighborhoodEl || !cityEl || !stateEl) {
                C.createToast('Erro no formulário de endereço', 'error');
                return;
            }

            const cep = cepEl.value.replace(/\D/g, '');
            const street = streetEl.value.trim();
            const number = numberEl.value.trim();
            const neighborhood = neighborhoodEl.value.trim();
            const city = cityEl.value.trim();
            const stateVal = stateEl.value.trim();

            if (!cep || cep.length !== 8) {
                C.createToast('Informe um CEP válido', 'error');
                cepEl.focus();
                return;
            }
            if (!street) {
                C.createToast('Informe a rua', 'error');
                streetEl.focus();
                return;
            }
            if (!number) {
                C.createToast('Informe o número', 'error');
                numberEl.focus();
                return;
            }
            if (!neighborhood || !city || !stateVal) {
                C.createToast('Preencha o CEP para buscar o endereço', 'error');
                cepEl.focus();
                return;
            }

            const paymentMethod = document.querySelector('input[name="payment_method"]:checked')?.value;
            if (!paymentMethod) {
                C.createToast('Selecione uma forma de pagamento', 'error');
                return;
            }

            const notesEl = document.getElementById('checkoutNotes');
            const notes = notesEl ? notesEl.value.trim() : '';

            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';

            try {
                const response = await API.post('/orders', {
                    payment_method: paymentMethod,
                    shipping_address: {
                        cep,
                        street,
                        number,
                        complement: document.getElementById('coComplement')?.value.trim() || null,
                        neighborhood,
                        city,
                        state: stateVal,
                    },
                    notes: notes || null,
                    coupon_code: currentCoupon,
                });

                if (window.LuxuryCart) {
                    window.LuxuryCart.updateBadge(0);
                }

                C.createToast('Pedido criado! Redirecionando...', 'success');

                setTimeout(() => {
                    window.location.href = `/pedido/${response.order.id}`;
                }, 800);
            } catch (error) {
                console.error('❌ Erro ao criar pedido:', error);
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