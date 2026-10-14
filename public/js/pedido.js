// ======================================================
// public/js/pedido.js
// Página de detalhe/confirmação do pedido
// Depende de: core/utils.js, core/api.js, core/components.js
// ======================================================
(function () {
    'use strict';

    const U = window.LuxuryUtils;
    const API = window.LuxuryAPI;
    const C = window.LuxuryComponents;

    // ==================================================
    // HELPERS
    // ==================================================
    const ORDER_STATUS = {
        pending: { label: 'Aguardando pagamento', icon: 'fa-hourglass-half', color: 'warning' },
        paid: { label: 'Pagamento aprovado', icon: 'fa-check-circle', color: 'success' },
        shipped: { label: 'Em transporte', icon: 'fa-truck', color: 'info' },
        delivered: { label: 'Entregue', icon: 'fa-box-open', color: 'success' },
        cancelled: { label: 'Cancelado', icon: 'fa-times-circle', color: 'danger' },
    };

    const PAYMENT_METHODS = {
        pix: { label: 'PIX', icon: 'fa-qrcode' },
        credit_card: { label: 'Cartão de Crédito', icon: 'fa-credit-card' },
        boleto: { label: 'Boleto Bancário', icon: 'fa-barcode' },
    };

    // ==================================================
    // PÁGINA
    // ==================================================
    const OrderPage = {
        order: null,
        orderId: null,

        async init() {
            // Exige login
            if (!API.isLoggedIn()) {
                sessionStorage.setItem('luxury_redirect', window.location.pathname);
                window.location.href = '/login';
                return;
            }

            // Extrai ID da URL
            const pathParts = window.location.pathname.split('/').filter(Boolean);
            this.orderId = pathParts[1] || null;

            if (!this.orderId || isNaN(this.orderId)) {
                return this.showNotFound();
            }

            await this.loadOrder();
        },

        async loadOrder() {
            try {
                const order = await API.get(`/orders/${this.orderId}`);
                this.order = order;
                this.render();
            } catch (error) {
                console.error('Erro ao carregar pedido:', error);
                this.showNotFound();
            }
        },

        showNotFound() {
            document.getElementById('orderLoading').style.display = 'none';
            document.getElementById('orderContent').style.display = 'none';
            document.getElementById('orderNotFound').style.display = 'flex';
        },

        render() {
            const o = this.order;

            document.getElementById('orderLoading').style.display = 'none';
            document.getElementById('orderContent').style.display = 'block';

            document.title = `Pedido #${o.id} - Luxury Store`;

            this.renderHeader();
            this.renderPayment();
            this.renderItems();
            this.renderAddress();
            this.renderSummary();
            this.renderInfo();
            this.attachActions();
        },

        // ==================================================
        // HEADER (SUCESSO + STATUS)
        // ==================================================
        renderHeader() {
            const o = this.order;
            const status = ORDER_STATUS[o.status] || ORDER_STATUS.pending;

            document.getElementById('orderId').textContent = o.id;

            // Esconde o bloco de "sucesso" se o pedido não é recente
            const successBlock = document.getElementById('orderSuccess');
            if (o.status === 'cancelled') {
                successBlock.innerHTML = `
                    <div class="order-success-icon order-cancelled-icon">
                        <i class="fas fa-times-circle"></i>
                    </div>
                    <h1>Pedido cancelado</h1>
                    <p class="order-success-subtitle">
                        O pedido <strong>#${o.id}</strong> foi cancelado.
                    </p>
                    <div class="order-success-status" id="orderStatusBadge"></div>
                `;
            }

            const badge = document.getElementById('orderStatusBadge');
            if (badge) {
                badge.className = `order-status-badge order-status-${status.color}`;
                badge.innerHTML = `<i class="fas ${status.icon}"></i> ${status.label}`;
            }
        },

        // ==================================================
        // PAGAMENTO
        // ==================================================
        renderPayment() {
            const o = this.order;
            const section = document.getElementById('paymentSection');
            const content = document.getElementById('paymentContent');

            // Só mostra a seção de pagamento se o status for 'pending'
            if (o.status !== 'pending') {
                section.style.display = 'none';
                return;
            }

            section.style.display = 'block';

            const method = PAYMENT_METHODS[o.payment_method] || { label: o.payment_method, icon: 'fa-money-bill' };

            content.innerHTML = `
                <div class="order-payment-method">
                    <i class="fas ${method.icon}"></i>
                    <div>
                        <strong>${U.escapeHtml(method.label)}</strong>
                        <span>Aguardando confirmação de pagamento</span>
                    </div>
                </div>
                <button type="button" class="order-pay-btn" id="payOrderBtn">
                    <i class="fas fa-check-circle"></i>
                    Pagar agora (simulado)
                </button>
                <p class="order-payment-hint">
                    <i class="fas fa-info-circle"></i>
                    Este é um pagamento de teste. Nenhuma cobrança real será feita.
                </p>
            `;

            content.querySelector('#payOrderBtn')?.addEventListener('click', () => this.payOrder());
        },

        async payOrder() {
            const btn = document.getElementById('payOrderBtn');
            const originalHtml = btn.innerHTML;

            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';

            try {
                const result = await API.post(`/orders/${this.orderId}/pay`, {});

                if (result.result === 'paid') {
                    C.createToast('Pagamento aprovado!', 'success');
                    setTimeout(() => this.loadOrder(), 600);
                } else if (result.result === 'failed') {
                    C.createToast('Pagamento recusado. Tente novamente.', 'error');
                    btn.disabled = false;
                    btn.innerHTML = originalHtml;
                } else {
                    C.createToast('Pagamento em processamento.', 'info');
                    setTimeout(() => this.loadOrder(), 1500);
                }
            } catch (error) {
                console.error('Erro ao pagar:', error);
                C.toast ? C.createToast(error.data?.error || 'Erro ao processar pagamento', 'error') : null;
                btn.disabled = false;
                btn.innerHTML = originalHtml;
            }
        },

        // ==================================================
        // ITENS
        // ==================================================
        renderItems() {
            const container = document.getElementById('orderItems');
            const items = this.order.items || [];

            if (items.length === 0) {
                container.innerHTML = '<p class="order-empty-text">Nenhum item</p>';
                return;
            }

            container.innerHTML = items.map((item) => {
                const img = item.image_url
                    ? `<img src="${U.escapeAttr(item.image_url)}" alt="${U.escapeAttr(item.name)}">`
                    : `<i class="fas fa-image"></i>`;

                const href = item.slug ? `/produto/${item.slug}` : '#';

                return `
                    <a class="order-item" href="${U.escapeAttr(href)}">
                        <div class="order-item-image">${img}</div>
                        <div class="order-item-info">
                            <div class="order-item-name">${U.escapeHtml(item.name)}</div>
                            <div class="order-item-qty">
                                ${item.quantity}x ${U.formatPrice(item.unit_price)}
                            </div>
                        </div>
                        <div class="order-item-subtotal">${U.formatPrice(item.subtotal)}</div>
                    </a>
                `;
            }).join('');
        },

        // ==================================================
        // ENDEREÇO
        // ==================================================
        renderAddress() {
            const o = this.order;
            const container = document.getElementById('orderAddress');

            const parts = [
                o.shipping_street,
                o.shipping_number,
                o.shipping_complement,
            ].filter(Boolean).join(', ');

            const line2 = [
                o.shipping_neighborhood,
                `${o.shipping_city || ''} - ${o.shipping_state || ''}`,
                o.shipping_cep ? `CEP: ${o.shipping_cep}` : null,
            ].filter(Boolean).join(' · ');

            container.innerHTML = `
                <div class="order-address-line"><strong>${U.escapeHtml(o.user_name || '—')}</strong></div>
                <div class="order-address-line">${U.escapeHtml(parts || '—')}</div>
                <div class="order-address-line">${U.escapeHtml(line2)}</div>
            `;
        },

        // ==================================================
        // RESUMO
        // ==================================================
        renderSummary() {
            const o = this.order;

            document.getElementById('orderSubtotal').textContent = U.formatPrice(o.subtotal);

            const shippingEl = document.getElementById('orderShipping');
            if (parseFloat(o.shipping_cost) === 0) {
                shippingEl.innerHTML = '<span style="color: var(--success-dark); font-weight: 700;">Grátis</span>';
            } else {
                shippingEl.textContent = U.formatPrice(o.shipping_cost);
            }

            if (parseFloat(o.discount) > 0) {
                document.getElementById('orderDiscountRow').style.display = 'flex';
                document.getElementById('orderDiscount').textContent = `- ${U.formatPrice(o.discount)}`;
            }

            document.getElementById('orderTotal').textContent = U.formatPrice(o.total);
        },

        // ==================================================
        // INFO
        // ==================================================
        renderInfo() {
            const o = this.order;
            const method = PAYMENT_METHODS[o.payment_method] || { label: o.payment_method };

            document.getElementById('orderInfoId').textContent = o.id;
            document.getElementById('orderInfoDate').textContent = U.formatDate(o.created_at);
            document.getElementById('orderInfoPayment').textContent = method.label;
        },

        // ==================================================
        // AÇÕES
        // ==================================================
        attachActions() {
            const o = this.order;
            const cancelBtn = document.getElementById('cancelOrderBtn');

            // Só mostra cancelar se o pedido está pendente ou pago
            if (['pending', 'paid'].includes(o.status)) {
                cancelBtn.style.display = 'flex';
                cancelBtn.addEventListener('click', () => this.confirmCancel());
            }
        },

        confirmCancel() {
            const modal = document.createElement('div');
            modal.className = 'modal active';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 420px;">
                    <button class="close-modal" aria-label="Fechar">&times;</button>
                    <div class="modal-icon" style="color: #dc2626;">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <h2 style="text-transform: uppercase; letter-spacing: 1px; margin-bottom: 0.75rem;">
                        Cancelar pedido?
                    </h2>
                    <p style="color: var(--gray-600); margin-bottom: 1.5rem;">
                        Esta ação não pode ser desfeita. Os itens voltarão ao estoque.
                    </p>
                    <div style="display: flex; gap: 0.75rem; justify-content: flex-end;">
                        <button type="button" class="btn btn-secondary" id="keepOrder">
                            Manter pedido
                        </button>
                        <button type="button" class="btn" id="confirmCancelOrder"
                                style="background: #dc2626; color: white; border-color: #dc2626;">
                            <i class="fas fa-times"></i>
                            Cancelar
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            document.body.style.overflow = 'hidden';

            const close = () => {
                modal.remove();
                document.body.style.overflow = '';
            };

            modal.querySelector('.close-modal').addEventListener('click', close);
            modal.querySelector('#keepOrder').addEventListener('click', close);
            modal.addEventListener('click', (e) => {
                if (e.target === modal) close();
            });

            modal.querySelector('#confirmCancelOrder').addEventListener('click', async () => {
                const btn = modal.querySelector('#confirmCancelOrder');
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cancelando...';

                try {
                    await API.post(`/orders/${this.orderId}/cancel`, {
                        reason: 'Cancelado pelo cliente',
                    });
                    close();
                    C.createToast('Pedido cancelado', 'success');
                    setTimeout(() => this.loadOrder(), 500);
                } catch (error) {
                    C.createToast(error.data?.error || 'Erro ao cancelar', 'error');
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-times"></i> Cancelar';
                }
            });
        },
    };

    // ======================================================
    // INICIALIZAÇÃO
    // ======================================================
    document.addEventListener('DOMContentLoaded', () => {
        OrderPage.init();
    });
})();