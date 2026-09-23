// ======================================================
// CARRINHO GLOBAL - IIFE
// ======================================================
(function() {
    'use strict';

    const API_BASE = '/api';

    const CartUtils = {
        getToken() {
            return localStorage.getItem('luxury_token');
        },

        clearSession() {
            localStorage.removeItem('luxury_token');
            localStorage.removeItem('luxury_user');
        },

        async request(path, options = {}) {
            const token = this.getToken();
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const response = await fetch(`${API_BASE}${path}`, {
                ...options,
                headers: { ...headers, ...(options.headers || {}) }
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                // ✅ Se token é inválido / usuário não existe, limpa sessão
                if (response.status === 401) {
                    this.clearSession();
                }

                const error = new Error(data.error || `Erro HTTP ${response.status}`);
                error.status = response.status;
                error.data = data;
                throw error;
            }
            return data;
        },

        get(path) { return this.request(path); },
        post(path, body) { return this.request(path, { method: 'POST', body: JSON.stringify(body) }); },
        put(path, body) { return this.request(path, { method: 'PUT', body: JSON.stringify(body) }); },
        del(path, body) {
            return this.request(path, {
                method: 'DELETE',
                ...(body ? { body: JSON.stringify(body) } : {})
            });
        },

        formatPrice(value) {
            return `R$ ${parseFloat(value).toFixed(2).replace('.', ',')}`;
        },

        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text || '';
            return div.innerHTML;
        }
    };

    const Cart = {
        items: [],
        total: 0,
        totalItems: 0,

        async init() {
            this.attachHeaderHandlers();

            // Só atualiza se estiver logado
            if (CartUtils.getToken()) {
                await this.refreshBadge();
            } else {
                this.updateBadge(0);
            }
        },

        // ==================================================
        // HEADER: cliques do carrinho e do usuário
        // ==================================================
        attachHeaderHandlers() {
            const cartBtn = document.querySelector('.cart-btn');
            if (cartBtn) {
                cartBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.openModal();
                });
            }

            const accountBtn = document.getElementById('accountBtn') ||
                               document.querySelector('.icon-btn[aria-label*="Login"]') ||
                               document.querySelector('.icon-btn[aria-label*="Minha conta"]');
            if (accountBtn) {
                accountBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const token = CartUtils.getToken();
                    const currentPath = window.location.pathname;

                    if (token) {
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
            if (!CartUtils.getToken()) {
                this.updateBadge(0);
                return;
            }

            try {
                const { count } = await CartUtils.get('/cart/count');
                this.updateBadge(count);
            } catch (error) {
                if (error.status === 401) {
                    // Token inválido → limpa e zera badge
                    CartUtils.clearSession();
                    this.updateBadge(0);
                } else {
                    console.warn('Erro ao atualizar badge do carrinho:', error);
                    this.updateBadge(0);
                }
            }
        },

        updateBadge(count) {
            const badges = document.querySelectorAll('.cart-badge');
            badges.forEach(badge => {
                badge.textContent = count;
                badge.style.display = count > 0 ? 'flex' : 'none';
            });
        },

        // ==================================================
        // ADICIONAR AO CARRINHO
        // ==================================================
        async addToCart(productId, quantity = 1) {
            if (!CartUtils.getToken()) {
                // Não logado → salva intenção e redireciona
                sessionStorage.setItem('cart_pending', JSON.stringify({ productId, quantity }));
                window.location.href = '/login';
                return;
            }

            const result = await CartUtils.post('/cart', { product_id: productId, quantity });
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
            if (!CartUtils.getToken()) {
                return { items: [], total: 0, total_items: 0 };
            }
            const cart = await CartUtils.get('/cart');
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
            const result = await CartUtils.put(`/cart/${itemId}`, { quantity });
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
            const result = await CartUtils.del(`/cart/${itemId}`);
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
            const result = await CartUtils.del('/cart');
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

            const close = () => {
                modal.remove();
                document.body.style.overflow = '';
            };

            modal.querySelector('#closeCartModal').addEventListener('click', close);
            modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

            // Se não está logado
            if (!CartUtils.getToken()) {
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

            body.innerHTML = cart.items.map(item => {
                const img = item.image?.url
                    ? `<img src="${item.image.url}" alt="${CartUtils.escapeHtml(item.name)}">`
                    : `<div class="cart-item-placeholder"><i class="fas fa-image"></i></div>`;

                const unitPrice = item.unit_price;
                const subtotal = item.subtotal;

                return `
                    <div class="cart-item" data-item-id="${item.id}">
                        <div class="cart-item-image">${img}</div>
                        <div class="cart-item-info">
                            <h4>${CartUtils.escapeHtml(item.name)}</h4>
                            <div class="cart-item-price">${CartUtils.formatPrice(unitPrice)}</div>
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
                        <div class="cart-item-subtotal">${CartUtils.formatPrice(subtotal)}</div>
                    </div>
                `;
            }).join('');

            footer.style.display = 'block';
            modal.querySelector('#cartModalTotal').textContent = CartUtils.formatPrice(cart.total);

            // Handlers de qty
            body.querySelectorAll('.cart-qty-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const itemId = btn.dataset.itemId;
                    const action = btn.dataset.action;
                    const item = cart.items.find(i => i.id == itemId);
                    if (!item) return;

                    const newQty = action === 'increase' ? item.quantity + 1 : item.quantity - 1;

                    if (newQty < 1) return;

                    try {
                        const result = await this.updateQuantity(itemId, newQty);
                        this.renderCartItems(modal, result.cart);
                    } catch (error) {
                        alert(error.data?.error || 'Erro ao atualizar quantidade');
                    }
                });
            });

            // Handlers de remover
            body.querySelectorAll('.cart-item-remove').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const itemId = btn.dataset.itemId;
                    try {
                        const result = await this.removeItem(itemId);
                        this.renderCartItems(modal, result.cart);
                    } catch (error) {
                        alert(error.data?.error || 'Erro ao remover item');
                    }
                });
            });

            // Botão finalizar
            const checkoutBtn = modal.querySelector('#cartCheckoutBtn');
            checkoutBtn.addEventListener('click', () => {
                alert('Checkout será implementado em breve!');
            });
        }
    };

    // ==================================================
    // ESTILOS DO MODAL (injetados via JS)
    // ==================================================
    const style = document.createElement('style');
    style.textContent = `
        .cart-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            z-index: 5000;
            display: flex;
            justify-content: flex-end;
            animation: fadeIn 0.2s ease;
        }

        .cart-modal-content {
            background: var(--white, #fff);
            width: 100%;
            max-width: 440px;
            height: 100vh;
            display: flex;
            flex-direction: column;
            box-shadow: -8px 0 40px rgba(0, 0, 0, 0.15);
            animation: slideInRight 0.3s ease;
        }

        .cart-modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1.5rem;
            border-bottom: 1px solid var(--gray-200, #e5e5e5);
            background: var(--white, #fff);
        }

        .cart-modal-header h2 {
            font-size: 1.1rem;
            font-weight: 700;
            color: var(--gray-900, #171717);
            display: flex;
            align-items: center;
            gap: 0.5rem;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .cart-modal-header h2 i {
            color: var(--accent, #c9a96e);
        }

        .cart-modal-close {
            background: none;
            border: none;
            font-size: 1.6rem;
            color: var(--gray-500, #737373);
            cursor: pointer;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
        }

        .cart-modal-close:hover {
            background: var(--gray-100, #f5f5f5);
            color: var(--gray-900, #171717);
        }

        .cart-modal-body {
            flex: 1;
            overflow-y: auto;
            padding: 1.5rem;
        }

        .cart-loading {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.75rem;
            padding: 3rem 0;
            color: var(--gray-500, #737373);
        }

        .cart-loading i {
            color: var(--accent, #c9a96e);
        }

        .cart-empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            padding: 3rem 1rem;
            gap: 0.75rem;
        }

        .cart-empty i {
            font-size: 3rem;
            color: var(--gray-300, #d4d4d4);
            margin-bottom: 0.5rem;
        }

        .cart-empty h3 {
            font-size: 1.1rem;
            color: var(--gray-800, #262626);
        }

        .cart-empty p {
            font-size: 0.9rem;
            color: var(--gray-500, #737373);
        }

        .cart-login-btn {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.75rem 1.5rem;
            background: var(--accent, #c9a96e);
            color: #fff;
            text-decoration: none;
            border-radius: 6px;
            font-size: 0.9rem;
            font-weight: 600;
            margin-top: 1rem;
            transition: all 0.2s ease;
        }

        .cart-login-btn:hover {
            background: var(--accent-hover, #b8944f);
        }

        .cart-item {
            display: grid;
            grid-template-columns: 72px 1fr auto;
            gap: 0.85rem;
            padding: 1rem 0;
            border-bottom: 1px solid var(--gray-100, #f5f5f5);
            align-items: flex-start;
        }

        .cart-item:last-child {
            border-bottom: none;
        }

        .cart-item-image {
            width: 72px;
            height: 72px;
            border-radius: 8px;
            overflow: hidden;
            background: var(--gray-100, #f5f5f5);
        }

        .cart-item-image img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .cart-item-placeholder {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--gray-400, #a3a3a3);
        }

        .cart-item-info {
            min-width: 0;
        }

        .cart-item-info h4 {
            font-size: 0.9rem;
            font-weight: 600;
            color: var(--gray-900, #171717);
            margin-bottom: 0.25rem;
            line-height: 1.3;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }

        .cart-item-price {
            font-size: 0.85rem;
            color: var(--gray-500, #737373);
            margin-bottom: 0.5rem;
        }

        .cart-item-qty {
            display: flex;
            align-items: center;
            gap: 0.25rem;
        }

        .cart-qty-btn {
            width: 28px;
            height: 28px;
            border: 1px solid var(--gray-300, #d4d4d4);
            background: var(--white, #fff);
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.7rem;
            color: var(--gray-700, #404040);
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .cart-qty-btn:hover {
            border-color: var(--accent, #c9a96e);
            color: var(--accent, #c9a96e);
        }

        .cart-qty-value {
            min-width: 32px;
            text-align: center;
            font-size: 0.85rem;
            font-weight: 600;
            color: var(--gray-900, #171717);
        }

        .cart-item-remove {
            margin-left: 0.5rem;
            background: none;
            border: none;
            color: var(--gray-400, #a3a3a3);
            cursor: pointer;
            padding: 0.25rem;
            font-size: 0.85rem;
            transition: all 0.2s ease;
        }

        .cart-item-remove:hover {
            color: #dc2626;
        }

        .cart-item-subtotal {
            font-size: 0.95rem;
            font-weight: 700;
            color: var(--accent, #c9a96e);
            text-align: right;
            white-space: nowrap;
        }

        .cart-modal-footer {
            padding: 1.5rem;
            border-top: 1px solid var(--gray-200, #e5e5e5);
            background: var(--gray-50, #fafafa);
        }

        .cart-total-row {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            margin-bottom: 1rem;
            font-size: 0.95rem;
            color: var(--gray-600, #525252);
        }

        .cart-total-row strong {
            font-size: 1.4rem;
            font-weight: 700;
            color: var(--gray-900, #171717);
        }

        .cart-checkout-btn {
            width: 100%;
            padding: 1rem;
            background: var(--accent, #c9a96e);
            color: #fff;
            border: none;
            border-radius: 8px;
            font-family: inherit;
            font-size: 0.95rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
        }

        .cart-checkout-btn:hover {
            background: var(--accent-hover, #b8944f);
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        @keyframes slideInRight {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
        }

        @media (max-width: 500px) {
            .cart-modal-content {
                max-width: 100%;
            }

            .cart-item {
                grid-template-columns: 60px 1fr;
            }

            .cart-item-image {
                width: 60px;
                height: 60px;
            }

            .cart-item-subtotal {
                grid-column: 2;
                text-align: left;
                margin-top: 0.25rem;
            }
        }
    `;
    document.head.appendChild(style);

    // ==================================================
    // INICIALIZAÇÃO + EXPOSIÇÃO GLOBAL
    // ==================================================
    window.LuxuryCart = Cart;

    document.addEventListener('DOMContentLoaded', () => {
        Cart.init();
    });
})();