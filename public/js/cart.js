// ======================================================
// public/js/cart.js
// Carrinho de compras global
// Depende de: core/utils.js, core/api.js, core/components.js
// Expõe: window.LuxuryCart
// ======================================================
(function () {
    'use strict';

    const U = window.LuxuryUtils;
    const API = window.LuxuryAPI;
    const C = window.LuxuryComponents;

    // ==================================================
    // CARRINHO
    // ==================================================
    const Cart = {
        items: [],
        total: 0,
        totalItems: 0,
        modal: null,   // Referência ao modal aberto

        // ==================================================
        // INICIALIZAÇÃO
        // ==================================================
        async init() {
            this.attachHeaderHandlers();

            if (API.isLoggedIn()) {
                await this.refreshBadge();
            } else {
                this.updateBadge(0);
            }
        },

        // ==================================================
        // HEADER: cliques no carrinho e na conta
        // ==================================================
        attachHeaderHandlers() {
            document.querySelectorAll('.cart-btn').forEach((btn) => {
                // Evita duplicar listener se rodar 2x
                if (btn.dataset.cartBound) return;
                btn.dataset.cartBound = 'true';

                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    // ✅ Se já tem modal aberto, fecha
                    if (this.modal) {
                        this.closeModal();
                        return;
                    }
                    this.openModal();
                });
            });

            // Botão de conta
            const accountBtn =
                document.getElementById('accountBtn') ||
                document.querySelector('.icon-btn[aria-label*="Login"]') ||
                document.querySelector('.icon-btn[aria-label*="Minha conta"]');

            if (accountBtn && !accountBtn.dataset.accountBound) {
                accountBtn.dataset.accountBound = 'true';

                accountBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const currentPath = window.location.pathname;

                    if (API.isLoggedIn()) {
                        if (currentPath !== '/minha-conta') {
                            window.location.href = '/minha-conta';
                        }
                    } else {
                        if (currentPath !== '/login') {
                            window.location.href = '/login';
                        }
                    }
                });
            }
        },

        // ==================================================
        // BADGE (contador no header)
        // ==================================================
        async refreshBadge() {
            if (!API.isLoggedIn()) {
                this.updateBadge(0);
                return;
            }

            try {
                const { count } = await API.get('/cart/count');
                this.updateBadge(count);
            } catch (error) {
                if (error.status === 401) {
                    API.clearSession();
                    this.updateBadge(0);
                } else {
                    console.warn('Erro ao atualizar badge do carrinho:', error);
                    this.updateBadge(0);
                }
            }
        },

        updateBadge(count) {
            const badges = document.querySelectorAll('.cart-badge');
            badges.forEach((badge) => {
                badge.textContent = count;
                badge.style.display = count > 0 ? 'flex' : 'none';
            });
        },

        // ==================================================
        // ADICIONAR AO CARRINHO
        // ==================================================
        async addToCart(productId, quantity = 1) {
            if (!API.isLoggedIn()) {
                // Não logado → salva intenção e redireciona
                sessionStorage.setItem('cart_pending', JSON.stringify({ productId, quantity }));
                window.location.href = '/login';
                return;
            }

            const result = await API.post('/cart', { product_id: productId, quantity });
            this.items = result.cart.items;
            this.total = result.cart.total;
            this.totalItems = result.cart.total_items;
            this.updateBadge(this.totalItems);
            return result;
        },

        // ==================================================
        // BUSCAR CARRINHO COMPLETO
        // ==================================================
        async fetchCart() {
            if (!API.isLoggedIn()) {
                return { items: [], total: 0, total_items: 0 };
            }
            const cart = await API.get('/cart');
            this.items = cart.items;
            this.total = cart.total;
            this.totalItems = cart.total_items;
            this.updateBadge(this.totalItems);
            return cart;
        },

        // ==================================================
        // ATUALIZAR QUANTIDADE
        // ==================================================
        async updateQuantity(itemId, quantity) {
            const result = await API.put(`/cart/${itemId}`, { quantity });
            this.items = result.cart.items;
            this.total = result.cart.total;
            this.totalItems = result.cart.total_items;
            this.updateBadge(this.totalItems);
            return result;
        },

        // ==================================================
        // REMOVER ITEM
        // ==================================================
        async removeItem(itemId) {
            const result = await API.delete(`/cart/${itemId}`);
            this.items = result.cart.items;
            this.total = result.cart.total;
            this.totalItems = result.cart.total_items;
            this.updateBadge(this.totalItems);
            return result;
        },

        // ==================================================
        // LIMPAR CARRINHO
        // ==================================================
        async clear() {
            const result = await API.delete('/cart');
            this.items = result.cart.items;
            this.total = result.cart.total;
            this.totalItems = result.cart.total_items;
            this.updateBadge(0);
            return result;
        },

        // ==================================================
        // MODAL DO CARRINHO
        // ==================================================
        async openModal() {
            // ✅ Evita abrir 2 modais
            if (this.modal) return;

            const modal = document.createElement('div');
            modal.className = 'cart-modal active';
            modal.id = 'cartModal';
            modal.innerHTML = `
                <div class="cart-modal-content">
                    <header class="cart-modal-header">
                        <h2><i class="fas fa-shopping-bag"></i> Meu carrinho</h2>
                        <button class="cart-modal-close" id="closeCartModal" aria-label="Fechar">&times;</button>
                    </header>

                    <div class="cart-modal-body" id="cartModalBody">
                        <div class="cart-loading">
                            <i class="fas fa-spinner fa-spin"></i>
                            <span>Carregando...</span>
                        </div>
                    </div>

                    <footer class="cart-modal-footer" id="cartModalFooter" style="display:none;">
                        <div class="cart-total-row">
                            <span>Total</span>
                            <strong id="cartModalTotal">R$ 0,00</strong>
                        </div>
                        <button class="cart-checkout-btn" id="cartCheckoutBtn">
                            <i class="fas fa-credit-card"></i>
                            Finalizar compra
                        </button>
                    </footer>
                </div>
            `;
            document.body.appendChild(modal);
            document.body.style.overflow = 'hidden';

            this.modal = modal;

            // ✅ Fecha ao clicar no X ou no backdrop
            modal.querySelector('#closeCartModal').addEventListener('click', () => this.closeModal());
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeModal();
            });

            // ✅ Fecha ao apertar ESC (registrado ao abrir)
            this.handleEscape = (e) => {
                if (e.key === 'Escape') this.closeModal();
            };
            document.addEventListener('keydown', this.handleEscape);

            // Se não está logado
            if (!API.isLoggedIn()) {
                this.renderNotLoggedIn(modal);
                return;
            }

            try {
                const cart = await this.fetchCart();
                this.renderCartItems(modal, cart);
            } catch (error) {
                if (error.status === 401) {
                    this.renderNotLoggedIn(modal);
                } else {
                    modal.querySelector('#cartModalBody').innerHTML = `
                        <div class="cart-empty">
                            <i class="fas fa-exclamation-triangle"></i>
                            <h3>Erro ao carregar carrinho</h3>
                            <p>Tente novamente em alguns instantes</p>
                        </div>
                    `;
                }
            }
        },

        closeModal() {
            if (!this.modal) return;

            this.modal.remove();
            document.body.style.overflow = '';
            this.modal = null;

            // ✅ Remove o listener de ESC
            if (this.handleEscape) {
                document.removeEventListener('keydown', this.handleEscape);
                this.handleEscape = null;
            }
        },

        // ==================================================
        // RENDER: NÃO LOGADO
        // ==================================================
        renderNotLoggedIn(modal) {
            const body = modal.querySelector('#cartModalBody');
            body.innerHTML = `
                <div class="cart-empty">
                    <i class="fas fa-user-lock"></i>
                    <h3>Você não está logado</h3>
                    <p>Entre na sua conta para ver seu carrinho</p>
                    <a href="/login" class="cart-login-btn">
                        <i class="fas fa-sign-in-alt"></i> Fazer login
                    </a>
                </div>
            `;
            modal.querySelector('#cartModalFooter').style.display = 'none';
        },

        // ==================================================
        // RENDER: ITENS DO CARRINHO
        // ==================================================
        renderCartItems(modal, cart) {
            const body = modal.querySelector('#cartModalBody');
            const footer = modal.querySelector('#cartModalFooter');

            if (!cart.items || cart.items.length === 0) {
                body.innerHTML = `
                    <div class="cart-empty">
                        <i class="fas fa-shopping-bag"></i>
                        <h3>Seu carrinho está vazio</h3>
                        <p>Explore nossos produtos e adicione itens</p>
                        <a href="/produtos" class="cart-login-btn">
                            <i class="fas fa-shopping-basket"></i> Ver produtos
                        </a>
                    </div>
                `;
                footer.style.display = 'none';
                return;
            }

            body.innerHTML = cart.items.map((item) => {
                const img = item.image?.url
                    ? `<img src="${U.escapeAttr(item.image.url)}" alt="${U.escapeAttr(item.name)}">`
                    : `<div class="cart-item-placeholder"><i class="fas fa-image"></i></div>`;

                const unitPrice = item.unit_price;
                const subtotal = item.subtotal;

                return `
                    <div class="cart-item" data-item-id="${item.id}">
                        <div class="cart-item-image">${img}</div>
                        <div class="cart-item-info">
                            <h4>${U.escapeHtml(item.name)}</h4>
                            <div class="cart-item-price">${U.formatPrice(unitPrice)}</div>
                            <div class="cart-item-qty">
                                <button class="cart-qty-btn" data-action="decrease" data-item-id="${item.id}">
                                    <i class="fas fa-minus"></i>
                                </button>
                                <span class="cart-qty-value">${item.quantity}</span>
                                <button class="cart-qty-btn" data-action="increase" data-item-id="${item.id}">
                                    <i class="fas fa-plus"></i>
                                </button>
                                <button class="cart-item-remove" data-item-id="${item.id}" aria-label="Remover">
                                    <i class="fas fa-trash-alt"></i>
                                </button>
                            </div>
                        </div>
                        <div class="cart-item-subtotal">${U.formatPrice(subtotal)}</div>
                    </div>
                `;
            }).join('');

            footer.style.display = 'block';
            modal.querySelector('#cartModalTotal').textContent = U.formatPrice(cart.total);

            // Handlers de quantidade
            body.querySelectorAll('.cart-qty-btn').forEach((btn) => {
                btn.addEventListener('click', async () => {
                    const itemId = btn.dataset.itemId;
                    const action = btn.dataset.action;
                    const item = cart.items.find((i) => i.id == itemId);
                    if (!item) return;

                    const newQty = action === 'increase' ? item.quantity + 1 : item.quantity - 1;
                    if (newQty < 1) return;

                    try {
                        const result = await this.updateQuantity(itemId, newQty);
                        this.renderCartItems(modal, result.cart);
                    } catch (error) {
                        // ✅ Toast em vez de alert
                        if (C && C.createToast) {
                            C.createToast(error.data?.error || 'Erro ao atualizar quantidade', 'error');
                        } else {
                            console.error(error);
                        }
                    }
                });
            });

            // Handlers de remover
            body.querySelectorAll('.cart-item-remove').forEach((btn) => {
                btn.addEventListener('click', async () => {
                    const itemId = btn.dataset.itemId;
                    try {
                        const result = await this.removeItem(itemId);
                        this.renderCartItems(modal, result.cart);
                    } catch (error) {
                        if (C && C.createToast) {
                            C.createToast(error.data?.error || 'Erro ao remover item', 'error');
                        } else {
                            console.error(error);
                        }
                    }
                });
            });

            // Botão finalizar
            const checkoutBtn = modal.querySelector('#cartCheckoutBtn');
            checkoutBtn.addEventListener('click', () => {
                if (C && C.createToast) {
                    C.createToast('Checkout será implementado em breve!', 'info');
                }
            });
        },
    };

    // ======================================================
    // EXPÕE GLOBAL
    // ======================================================
    window.LuxuryCart = Cart;

    // ======================================================
    // INICIALIZAÇÃO
    // ======================================================
    document.addEventListener('DOMContentLoaded', () => {
        Cart.init();
    });
})();