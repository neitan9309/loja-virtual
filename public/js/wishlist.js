// ======================================================
// public/js/wishlist.js
// Módulo global de Favoritos (wishlist)
// Depende de: core/utils.js, core/api.js
// Expõe: window.LuxuryWishlist
// ======================================================
(function () {
    'use strict';

    const U = window.LuxuryUtils;
    const API = window.LuxuryAPI;

    const Wishlist = {
        // ==================================================
        // ESTADO
        // ==================================================
        items: [],          // IDs dos produtos favoritados
        count: 0,
        loaded: false,      // já buscou do backend?
        pendingRequests: {}, // dedupe de cliques rápidos

        // ==================================================
        // INIT — chamado no boot de toda página
        // ==================================================
        async init() {
            this.attachGlobalHandlers();

            if (API.isLoggedIn()) {
                await this.loadIds();
            }
            this.updateHeaderBadge();
        },

        // ==================================================
        // CARREGA OS IDs DO BACKEND
        // ==================================================
        async loadIds() {
            if (!API.isLoggedIn()) {
                this.items = [];
                this.count = 0;
                this.loaded = true;
                return;
            }

            try {
                const data = await API.get('/wishlist/ids');
                this.items = Array.isArray(data.ids) ? data.ids : [];
                this.count = this.items.length;
                this.loaded = true;
                this.updateHeaderBadge();
            } catch (error) {
                console.error('Erro ao carregar favoritos:', error);
                this.items = [];
                this.count = 0;
                this.loaded = true;
            }
        },

        // ==================================================
        // VERIFICAR SE UM PRODUTO É FAVORITO
        // ==================================================
        has(productId) {
            return this.items.includes(parseInt(productId));
        },

        // ==================================================
        // ADICIONAR OU REMOVER (TOGGLE)
        // ==================================================
        async toggle(productId) {
            // Se não está logado → toast + redirect
            if (!API.isLoggedIn()) {
                if (window.LuxuryComponents && window.LuxuryComponents.createToast) {
                    window.LuxuryComponents.createToast(
                        'Faça login para salvar favoritos',
                        'info'
                    );
                }
                setTimeout(() => {
                    sessionStorage.setItem('luxury_redirect', window.location.pathname + window.location.search);
                    window.location.href = '/login';
                }, 800);
                return false;
            }

            const id = parseInt(productId);

            // Dedupe: evita cliques múltiplos no mesmo produto
            if (this.pendingRequests[id]) return false;
            this.pendingRequests[id] = true;

            const wasInWishlist = this.has(id);

            try {
                if (wasInWishlist) {
                    // Remove
                    const res = await API.delete(`/wishlist/${id}`);
                    this.items = this.items.filter((x) => x !== id);
                    this.count = res.count ?? this.items.length;

                    if (window.LuxuryComponents && window.LuxuryComponents.createToast) {
                        window.LuxuryComponents.createToast('Removido dos favoritos', 'info');
                    }
                } else {
                    // Adiciona
                    const res = await API.post('/wishlist', { product_id: id });
                    if (!this.items.includes(id)) {
                        this.items.push(id);
                    }
                    this.count = res.count ?? this.items.length;

                    if (window.LuxuryComponents && window.LuxuryComponents.createToast) {
                        window.LuxuryComponents.createToast('Adicionado aos favoritos ♥', 'success');
                    }
                }

                this.syncAllButtons(id, !wasInWishlist);
                this.updateHeaderBadge();

                return !wasInWishlist;
            } catch (error) {
                console.error('Erro ao alternar favorito:', error);

                if (window.LuxuryComponents && window.LuxuryComponents.createToast) {
                    window.LuxuryComponents.createToast(
                        error.data?.error || 'Erro ao salvar favorito',
                        'error'
                    );
                }
                return wasInWishlist;
            } finally {
                delete this.pendingRequests[id];
            }
        },

        // ==================================================
        // SYNC VISUAL — atualiza todos os botões do mesmo produto
        // ==================================================
        syncAllButtons(productId, isFavorited) {
            const id = parseInt(productId);

            document.querySelectorAll(`[data-wishlist-btn][data-product-id="${id}"]`).forEach((btn) => {
                if (isFavorited) {
                    btn.classList.add('is-favorited');
                    btn.setAttribute('aria-label', 'Remover dos favoritos');
                    btn.setAttribute('title', 'Remover dos favoritos');
                    const icon = btn.querySelector('i');
                    if (icon) icon.className = 'fas fa-heart';
                } else {
                    btn.classList.remove('is-favorited');
                    btn.setAttribute('aria-label', 'Adicionar aos favoritos');
                    btn.setAttribute('title', 'Adicionar aos favoritos');
                    const icon = btn.querySelector('i');
                    if (icon) icon.className = 'far fa-heart';
                }
            });
        },

        // ==================================================
        // BADGE DO HEADER
        // ==================================================
        updateHeaderBadge() {
            const badges = document.querySelectorAll('.wishlist-badge');
            badges.forEach((badge) => {
                if (this.count > 0) {
                    badge.textContent = this.count > 99 ? '99+' : this.count;
                    badge.style.display = 'flex';
                } else {
                    badge.style.display = 'none';
                }
            });
        },

        // ==================================================
        // SYNC GERAL — marca todos os botões existentes no DOM
        // ==================================================
        syncAllVisible() {
            document.querySelectorAll('[data-wishlist-btn][data-product-id]').forEach((btn) => {
                const id = parseInt(btn.dataset.productId);
                this.syncAllButtons(id, this.has(id));
            });
        },

        // ==================================================
        // HANDLERS GLOBAIS (delegação de evento)
        // ==================================================
        attachGlobalHandlers() {
            if (this._handlersAttached) return;
            this._handlersAttached = true;

            // Clique no coração
            document.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-wishlist-btn]');
                if (!btn) return;

                e.preventDefault();
                e.stopPropagation();

                const id = btn.dataset.productId;
                if (id) this.toggle(id);
            });

            // Clique no ícone do header
            document.addEventListener('click', (e) => {
                const headerBtn = e.target.closest('#wishlistHeaderBtn');
                if (!headerBtn) return;

                e.preventDefault();

                if (!API.isLoggedIn()) {
                    if (window.LuxuryComponents && window.LuxuryComponents.createToast) {
                        window.LuxuryComponents.createToast('Faça login para ver seus favoritos', 'info');
                    }
                    setTimeout(() => {
                        window.location.href = '/login';
                    }, 600);
                } else {
                    window.location.href = '/minha-conta?tab=favorites';
                }
            });
        },

        // ==================================================
        // LIMPAR (chamado no logout)
        // ==================================================
        clear() {
            this.items = [];
            this.count = 0;
            this.loaded = false;
            this.updateHeaderBadge();
            this.syncAllVisible();
        },
    };

    // Expõe globalmente
    window.LuxuryWishlist = Wishlist;

    // Init automático no DOMContentLoaded
    document.addEventListener('DOMContentLoaded', () => {
        Wishlist.init();
    });
})();