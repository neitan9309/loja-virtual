// ======================================================
// ADMIN.JS - Painel administrativo
// ======================================================
(function () {
    'use strict';

    // ======================================================
    // CONFIGURAÇÕES
    // ======================================================
    const CONFIG = {
        api: { baseUrl: '/api' },
        lowStockThreshold: 10,
        recentLimit: 5,
        searchLimit: 20,
        modalZBase: 3000,
        modalZStep: 10,
    };

    // ======================================================
    // AUTENTICAÇÃO DO ADMIN
    // ======================================================
    const AdminAuth = {
        TOKEN_KEY: 'luxury_admin_token',
        USER_KEY: 'luxury_admin_user',

        getToken() {
            return localStorage.getItem(this.TOKEN_KEY);
        },

        getUser() {
            try {
                return JSON.parse(localStorage.getItem(this.USER_KEY) || 'null');
            } catch {
                return null;
            }
        },

        save(token, user) {
            localStorage.setItem(this.TOKEN_KEY, token);
            localStorage.setItem(this.USER_KEY, JSON.stringify(user));
        },

        clear() {
            localStorage.removeItem(this.TOKEN_KEY);
            localStorage.removeItem(this.USER_KEY);
        },

        requireAuth() {
            if (!this.getToken()) {
                window.location.replace('/admin/login');
                return false;
            }
            return true;
        },

        handleAuthError(status) {
            if (status === 401) {
                this.clear();
                sessionStorage.setItem(
                    'luxury_admin_flash',
                    'Sua sessão expirou. Faça login novamente.'
                );
                window.location.replace('/admin/login');
                return true;
            }
            return false;
        },

        async logout() {
            const token = this.getToken();
            try {
                if (token) {
                    await fetch('/api/auth/logout', {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${token}` },
                    });
                }
            } catch {
                // Ignora erro de rede
            }
            this.clear();
            window.location.replace('/admin/login');
        },
    };

    // ======================================================
    // UTILITÁRIOS
    // ======================================================
    const Utils = {
        formatPrice(value) {
            if (value === null || value === undefined) return 'R$ 0,00';
            return `R$ ${parseFloat(value).toFixed(2).replace('.', ',')}`;
        },

        formatDate(dateString) {
            if (!dateString) return '—';
            const date = new Date(dateString);
            return date.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        },

        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text || '';
            return div.innerHTML;
        },

        // 👇 ADICIONAR: escapa aspas e caracteres especiais para usar dentro de atributos HTML
        escapeAttr(text) {
            if (text === null || text === undefined) return '';
            return String(text)
                .replace(/&/g, '&amp;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
        },

        buildCategoryBreadcrumb(product, separator = ' › ') {
            if (product.category_path && Array.isArray(product.category_path) && product.category_path.length > 0) {
                const sorted = [...product.category_path].sort((a, b) => a.level - b.level);
                return sorted.map((c) => Utils.escapeHtml(c.name)).join(separator);
            }
            return Utils.escapeHtml(product.category_name || '—');
        },
    };

    // ======================================================
    // TOASTS
    // ======================================================
    const Toast = {
        container: null,
        init() {
            this.container = document.getElementById('toastContainer');
        },

        show(message, type = 'info', duration = 3500) {
            if (!this.container) this.init();
            const icons = {
                success: 'fa-check-circle',
                error: 'fa-times-circle',
                warning: 'fa-exclamation-triangle',
                info: 'fa-info-circle',
            };
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            toast.innerHTML = `
                <div class="toast-icon"><i class="fas ${icons[type] || icons.info}"></i></div>
                <div class="toast-message">${Utils.escapeHtml(message)}</div>
            `;
            this.container.appendChild(toast);
            setTimeout(() => {
                toast.classList.add('hiding');
                setTimeout(() => toast.remove(), 300);
            }, duration);
        },

        success(msg) { this.show(msg, 'success'); },
        error(msg) { this.show(msg, 'error'); },
        warning(msg) { this.show(msg, 'warning'); },
        info(msg) { this.show(msg, 'info'); },
    };

    // ======================================================
    // API
    // ======================================================
    const API = {
        async request(path, options = {}) {
            const url = `${CONFIG.api.baseUrl}${path}`;

            const token = AdminAuth.getToken();
            const headers = {
                'Content-Type': 'application/json',
                ...(options.headers || {}),
            };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const response = await fetch(url, { ...options, headers });

            if (response.status === 401) {
                AdminAuth.handleAuthError(401);
                throw new Error('Sessão expirada');
            }

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
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
        patch(path, body) { return this.request(path, { method: 'PATCH', body: JSON.stringify(body) }); },
        delete(path) { return this.request(path, { method: 'DELETE' }); },
    };

    // ======================================================
    // UPLOADER
    // ======================================================
    const Uploader = {
        async upload(file) {
            const formData = new FormData();
            formData.append('image', file);

            const token = AdminAuth.getToken();
            const headers = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const response = await fetch(`${CONFIG.api.baseUrl}/upload`, {
                method: 'POST',
                headers,
                body: formData,
            });

            if (response.status === 401) {
                AdminAuth.handleAuthError(401);
                throw new Error('Sessão expirada');
            }

            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || 'Erro no upload');
            return data.url;
        },
    };

    // ======================================================
    // MODAL STACK
    // ======================================================
    const ModalStack = {
        items: [],

        push(name, element) {
            this.items = this.items.filter((it) => it.name !== name);
            this.items.push({ name, element });
            this.reflow();
            document.dispatchEvent(new CustomEvent('modalstack:change'));
        },

        pop() {
            const item = this.items.pop();
            this.reflow();
            document.dispatchEvent(new CustomEvent('modalstack:change'));
            return item;
        },

        /**
         * Volta um nível: fecha o modal atual e devolve o anterior como topo.
         * Retorna o nome do modal que virou topo, ou null se a pilha ficou vazia.
         */
        back() {
            if (this.items.length < 2) {
                this.items = [];
                this.reflow();
                document.dispatchEvent(new CustomEvent('modalstack:change'));
                return null;
            }
            this.items.pop();
            this.reflow();
            document.dispatchEvent(new CustomEvent('modalstack:change'));
            return this.top()?.name || null;
        },

        /**
         * Fecha tudo a partir de `name` (inclusive). Usado quando o X é clicado.
         */
        closeFrom(name) {
            const idx = this.items.findIndex((it) => it.name === name);
            if (idx < 0) {
                this.items = [];
            } else {
                this.items = this.items.slice(0, idx);
            }
            this.reflow();
            document.dispatchEvent(new CustomEvent('modalstack:change'));
        },

        remove(name) {
            this.items = this.items.filter((it) => it.name !== name);
            this.reflow();
            document.dispatchEvent(new CustomEvent('modalstack:change'));
        },

        /**
         * Reaplica z-index crescente conforme posição na pilha.
         */
        reflow() {
            this.items.forEach((item, idx) => {
                if (item.element) {
                    item.element.style.zIndex = String(
                        CONFIG.modalZBase + idx * CONFIG.modalZStep
                    );
                }
            });
        },

        top() {
            return this.items[this.items.length - 1] || null;
        },

        size() {
            return this.items.length;
        },

        isTop(name) {
            return this.top()?.name === name;
        },
    };

    // ======================================================
    // SORTABLE TABLE
    // ======================================================
    const SortableTable = {
        apply(table, state, onSort) {
            if (!table) return;
            const thead = table.querySelector('thead');
            if (!thead) return;

            const ths = thead.querySelectorAll('th[data-sort]');

            ths.forEach((th) => {
                const key = th.dataset.sort;
                if (!key) return;

                th.classList.add('sortable');
                if (th.dataset.sortBound === 'true') return;
                th.dataset.sortBound = 'true';

                th.addEventListener('click', () => {
                    if (state.sort === key) {
                        state.order = state.order === 'asc' ? 'desc' : 'asc';
                    } else {
                        state.sort = key;
                        state.order = 'asc';
                    }
                    ths.forEach((other) => {
                        other.classList.remove('sort-asc', 'sort-desc');
                        if (other.dataset.sort === state.sort) {
                            other.classList.add(state.order === 'asc' ? 'sort-asc' : 'sort-desc');
                        }
                    });
                    if (typeof onSort === 'function') onSort(state);
                });
            });

            // Estado inicial
            ths.forEach((th) => {
                th.classList.remove('sort-asc', 'sort-desc');
                if (th.dataset.sort === state.sort) {
                    th.classList.add(state.order === 'asc' ? 'sort-asc' : 'sort-desc');
                }
            });
        },
    };

    // ======================================================
    // TABLE LOADER (overlay discreto)
    // ======================================================
    const TableLoader = {
        start(container) {
            if (!container) return;
            container.classList.add('loading-overlay', 'is-loading');
        },

        stop(container) {
            if (!container) return;
            container.classList.remove('is-loading');
            setTimeout(() => {
                if (!container.classList.contains('is-loading')) {
                    container.classList.remove('loading-overlay');
                }
            }, 200);
        },
    };

    // ======================================================
    // FILTROS COLAPSÁVEIS — helpers reutilizáveis
    // ======================================================
    const FilterBar = {
        /**
         * Cria o HTML do toggle + painel.
         * @param {Object} opts
         *  - id: identificador único
         *  - activeCount: número de filtros ativos (badge)
         *  - isOpen: se o painel deve iniciar aberto
         *  - body: HTML dos inputs dentro do painel
         */
        render({ id, activeCount = 0, isOpen = false, body = '' }) {
            const badge = activeCount > 0
                ? `<span class="table-filters-badge">${activeCount}</span>`
                : '';
            const openClass = isOpen ? 'open' : '';
            const panelOpenClass = isOpen ? 'open' : '';
            return `
                <button type="button" class="table-filters-toggle ${openClass}" data-filters-toggle="${id}">
                    <span>
                        <i class="fas fa-filter"></i>
                        Filtros
                    </span>
                    ${badge}
                    <i class="fas fa-chevron-down table-filters-arrow"></i>
                </button>
                <div class="table-filters-panel ${panelOpenClass}" data-filters-panel="${id}">
                    ${body}
                </div>
            `;
        },

        /**
         * Vincula o toggle + contador de filtros ativos.
         * @param {HTMLElement} root - container onde o toggle/panel foram inseridos
         * @param {string} id
         * @param {Object} state - referência a um objeto com filtros (para contar)
         * @param {Object} filterKeys - quais chaves contam como "filtro ativo"
         * @param {Object} defaults - valores default dos filtros
         */
        bind(root, id, state, filterKeys, defaults = {}) {
            if (!root) return;

            const toggle = root.querySelector(`[data-filters-toggle="${id}"]`);
            const panel = root.querySelector(`[data-filters-panel="${id}"]`);
            const badge = toggle?.querySelector('.table-filters-badge');

            if (toggle && panel) {
                toggle.addEventListener('click', () => {
                    const isOpen = toggle.classList.toggle('open');
                    panel.classList.toggle('open', isOpen);
                });
            }

            // Função para atualizar o badge
            const refreshBadge = () => {
                if (!badge) return;
                const count = this.countActive(state, filterKeys, defaults);
                if (count > 0) {
                    badge.textContent = count;
                    badge.style.display = '';
                } else {
                    badge.textContent = '0';
                    badge.style.display = 'none';
                }
            };

            root._refreshFilterBadge = refreshBadge;
            refreshBadge();

            return refreshBadge;
        },

        countActive(state, keys, defaults = {}) {
            let count = 0;
            keys.forEach((k) => {
                const val = state[k];
                const def = defaults[k];
                if (val === undefined || val === null || val === '') return;
                if (def !== undefined && val === def) return;
                count++;
            });
            return count;
        },
    };

    // ======================================================
    // MODAL DE DETALHES (produto)
    // ======================================================
    const DetailModal = {
        ctrl: null,

        init() {
            this.ctrl = {
                modal: document.getElementById('detailModal'),
                body: document.getElementById('detailBody'),
                closeBtn: document.getElementById('closeDetailModal'),
                loading: document.getElementById('detailLoading'),
            };

            const { modal, closeBtn } = this.ctrl;

            closeBtn?.addEventListener('click', () => this.close());
            modal?.addEventListener('click', (e) => {
                if (e.target === modal) this.close();
            });
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && modal?.classList.contains('active')) this.close();
            });

            document.addEventListener('modalstack:change', () => this.updateBackVisibility());
        },

        /**
         * A seta aparece APENAS se este modal for o topo da pilha E houver um pai.
         */
        updateBackVisibility() {
            const { modal } = this.ctrl;
            if (!modal || !modal.classList.contains('active')) return;

            const isTop = ModalStack.isTop('detail');
            const hasParent = ModalStack.size() > 1;
            // Atualiza no HTML do body (a seta é injetada dentro do detail-header)
            const backBtn = this.ctrl.body?.querySelector('.back-modal');
            if (backBtn) {
                backBtn.classList.toggle('visible', isTop && hasParent);
            }
        },

        open() {
            const { modal } = this.ctrl;
            if (!modal) return;

            ModalStack.push('detail', modal);
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        },

        _deactivate() {
            const { modal } = this.ctrl;
            if (!modal) return;
            modal.classList.remove('active');
            if (ModalStack.size() > 0) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
        },

        close() {
            const { modal } = this.ctrl;
            ModalStack.closeFrom('detail');
            if (modal) modal.classList.remove('active');
            document.body.style.overflow = '';
        },

        render(html) {
            const { loading, body } = this.ctrl;
            if (loading) loading.style.display = 'none';
            if (body) {
                body.style.display = 'block';
                body.innerHTML = html;
            }
        },

        showProduct(product) {
            this.open();

            const { loading, body } = this.ctrl;
            if (loading) loading.style.display = 'flex';
            if (body) {
                body.style.display = 'none';
                body.innerHTML = '';
            }

            setTimeout(() => {
                const html = `
                    <div class="detail-header">
                        <button class="back-modal" aria-label="Voltar" data-action="back">
                            <i class="fas fa-arrow-left"></i>
                        </button>
                        <div class="detail-header-icon"><i class="fas fa-box"></i></div>
                        <div class="detail-header-info">
                            <h2>${Utils.escapeHtml(product.name)}</h2>
                            <p>SKU: ${Utils.escapeHtml(product.sku)} · ID #${product.id}</p>
                        </div>
                    </div>
                    <div class="detail-section">
                        <h3>Informações</h3>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <span class="detail-item-label">Preço</span>
                                <span class="detail-item-value accent">${Utils.formatPrice(product.price)}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-item-label">Estoque</span>
                                <span class="detail-item-value">${product.stock_quantity}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-item-label">Categoria</span>
                                <span class="detail-item-value">${Utils.escapeHtml(product.category_name || '—')}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-item-label">Marca</span>
                                <span class="detail-item-value">${Utils.escapeHtml(product.brand_name || '—')}</span>
                            </div>
                        </div>
                    </div>
                `;
                this.render(html);

                // Liga o botão back
                body.querySelector('[data-action="back"]')?.addEventListener('click', () => {
                    this.handleBack();
                });

                // Atualiza visibilidade imediatamente
                this.updateBackVisibility();
            }, 250);
        },

        handleBack() {
            // Fecha este modal e devolve o foco ao pai (se houver)
            ModalStack.back();
            this._deactivate();
            // O pai perceberá via evento e poderá se reativar visualmente (já está visível)
        },
    };

    // ======================================================
    // NAVEGAÇÃO
    // ======================================================
    // ======================================================
    // NAVEGAÇÃO (com hash na URL para sobreviver a F5)
    // ======================================================
    const Navigation = {
        // Mapa: seção → slug do hash
        SECTION_SLUGS: {
            'section-dashboard': 'inicio',
            'section-orders': 'pedidos',
            'section-metrics': 'metricas',
            'section-register-product': 'registrar-produto',
            'section-register-movement': 'registrar-movimentacao',
            'section-edit-product': 'alterar-produto',
        },

        // Mapa invertido: slug → seção
        SLUG_SECTIONS: null, // populado no init

        init() {
            // Popula o mapa inverso
            this.SLUG_SECTIONS = {};
            Object.entries(this.SECTION_SLUGS).forEach(([section, slug]) => {
                this.SLUG_SECTIONS[slug] = section;
            });

            // 1) Navegação: só em botões que TÊM data-target
            document.querySelectorAll('.nav-item[data-target], .nav-subitem[data-target]').forEach((btn) => {
                if (btn.dataset.navBound === 'true') return;
                btn.dataset.navBound = 'true';

                btn.addEventListener('click', () => {
                    const targetId = btn.dataset.target;
                    if (targetId) this.goTo(targetId, btn);
                });
            });

            // 2) Toggle do grupo "Registros"
            const parentBtn = document.querySelector('.nav-item-parent');
            if (parentBtn && parentBtn.dataset.toggleBound !== 'true') {
                parentBtn.dataset.toggleBound = 'true';

                parentBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    const group = parentBtn.closest('.nav-group');
                    if (!group) return;

                    group.classList.toggle('open');
                    parentBtn.setAttribute('aria-expanded', group.classList.contains('open'));
                });
            }

            // 3) Sidebar mobile
            const mobileToggle = document.getElementById('mobileToggle');
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('sidebarOverlay');

            const openSidebar = () => {
                sidebar.classList.add('open');
                overlay.classList.add('active');
                document.body.classList.add('sidebar-open');
            };

            const closeSidebar = () => {
                sidebar.classList.remove('open');
                overlay.classList.remove('active');
                document.body.classList.remove('sidebar-open');
            };

            mobileToggle?.addEventListener('click', () => {
                if (sidebar.classList.contains('open')) {
                    closeSidebar();
                } else {
                    openSidebar();
                }
            });

            overlay?.addEventListener('click', closeSidebar);

            // 4) Fechar sidebar em navegação de verdade (mobile)
            document.querySelectorAll('.nav-item[data-target], .nav-subitem[data-target]').forEach((btn) => {
                if (btn.dataset.closeBound === 'true') return;
                btn.dataset.closeBound = 'true';

                btn.addEventListener('click', () => {
                    if (window.innerWidth <= 768) {
                        closeSidebar();
                    }
                });
            });

            // ============================================
            // 5) NOVO: restaurar seção do hash ao carregar
            // ============================================
            this.restoreFromHash();

            // ============================================
            // 6) NOVO: escutar mudanças no hash (botão voltar/avançar)
            // ============================================
            if (!this._hashBound) {
                this._hashBound = true;

                window.addEventListener('hashchange', () => {
                    const slug = this.currentSlug();
                    const sectionId = this.SLUG_SECTIONS[slug];
                    if (sectionId) {
                        this.goTo(sectionId, null, { updateHash: false });
                    }
                });
            }
        },

        // ==================================================
        // HELPERS DE HASH
        // ==================================================
        currentSlug() {
            // Remove o "#/" ou "#" inicial
            const hash = window.location.hash || '';
            return hash.replace(/^#\/?/, '');
        },

        restoreFromHash() {
            const slug = this.currentSlug();
            const sectionId = this.SLUG_SECTIONS[slug];

            if (sectionId) {
                // Restaura a seção do hash (sem atualizar o hash de novo)
                this.goTo(sectionId, null, { updateHash: false });
            } else {
                // Sem hash válido: usa a dashboard como padrão
                // e seta o hash dela (para futuras navegações)
                this.setHash('section-dashboard', true);
            }
        },

        setHash(sectionId, replace = false) {
            const slug = this.SECTION_SLUGS[sectionId];
            if (!slug) return;

            const newHash = `#/${slug}`;
            if (window.location.hash === newHash) return;

            if (replace) {
                // Não empilha no histórico do navegador
                window.history.replaceState(null, '', newHash);
            } else {
                window.location.hash = newHash;
            }
        },

        // ==================================================
        // NAVEGAR
        // ==================================================
        goTo(sectionId, btnElement, options = {}) {
            const { updateHash = true } = options;

            // Ativa a seção
            document.querySelectorAll('.section').forEach((s) => s.classList.remove('active'));
            const target = document.getElementById(sectionId);
            if (target) target.classList.add('active');

            // Ativa o botão correspondente
            document.querySelectorAll('.nav-item, .nav-subitem').forEach((b) => b.classList.remove('active'));
            let activeBtn = btnElement;

            // Se não veio um botão (ex: veio do hash), procura um
            if (!activeBtn) {
                activeBtn = document.querySelector(`.nav-item[data-target="${sectionId}"], .nav-subitem[data-target="${sectionId}"]`);
            }
            if (activeBtn) activeBtn.classList.add('active');

            // Se for um subitem (registro), abre o grupo pai
            if (activeBtn && activeBtn.classList.contains('nav-subitem')) {
                const group = activeBtn.closest('.nav-group');
                if (group) {
                    group.classList.add('open');
                    const parentBtn = group.querySelector('.nav-item-parent');
                    if (parentBtn) parentBtn.setAttribute('aria-expanded', 'true');
                }
            }

            // Atualiza o hash (para F5 e compartilhamento)
            if (updateHash) {
                this.setHash(sectionId);
            }

            window.scrollTo({ top: 0, behavior: 'smooth' });
            this.loadSectionData(sectionId);
        },

        loadSectionData(sectionId) {
            switch (sectionId) {
                case 'section-dashboard': Dashboard.loadAll(); break;
                case 'section-orders': OrdersPage.init(); break;
                case 'section-metrics': MetricsPage.init(); break;
                case 'section-register-product': ProductForm.loadRecentProducts(); break;
                case 'section-register-movement': MovementForm.loadRecentMovements(); break;
                case 'section-edit-product': EditProduct.onEnter(); break;
            }
        },
    };

    // ======================================================
    // DASHBOARD
    // ======================================================
    const Dashboard = {
        async loadAll() {
            await Promise.all([this.loadKPIs(), this.loadTopProducts(), this.loadRecentMovements()]);
        },

        async loadKPIs() {
            try {
                const [total, inStock, lowStock, outOfStock] = await Promise.all([
                    API.get('/products/admin/stats?type=total&limit=1'),
                    API.get('/products/admin/stats?type=in_stock&limit=1'),
                    API.get('/products/admin/stats?type=low_stock&limit=1'),
                    API.get('/products/admin/stats?type=out_of_stock&limit=1'),
                ]);

                document.getElementById('kpiTotalProducts').textContent = total.pagination.total;
                document.getElementById('kpiTotalStock').textContent = (inStock.summary.total_items || 0).toLocaleString('pt-BR');
                document.getElementById('kpiLowStock').textContent = lowStock.pagination.total;
                document.getElementById('kpiOutOfStock').textContent = outOfStock.pagination.total;
            } catch (error) {
                console.error('Erro ao carregar KPIs:', error);
                Toast.error('Erro ao carregar indicadores');
            }
        },

        async loadTopProducts() {
            const container = document.getElementById('topProductsList');
            if (!container) return;
            container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i><span>Carregando...</span></div>';
            try {
                const data = await API.get('/products/admin/top-sellers?limit=5');
                const products = data.products || [];
                if (products.length === 0) {
                    container.innerHTML = '<p class="table-empty">Nenhum produto vendido ainda.</p>';
                    return;
                }
                container.innerHTML = `<div class="ranking-list">${products.map((p, i) => {
                    const positionClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
                    return `
                        <div class="ranking-item" data-product-id="${p.id}">
                            <div class="ranking-position ${positionClass}">${i + 1}</div>
                            <div class="ranking-info">
                                <div class="ranking-name">${Utils.escapeHtml(p.name)}</div>
                                <div class="ranking-meta">${Utils.buildCategoryBreadcrumb(p)} · ${p.sales_count || 0} vendas</div>
                            </div>
                            <div class="ranking-value">${Utils.formatPrice(p.price)}</div>
                        </div>
                    `;
                }).join('')}</div>`;
            } catch (error) {
                console.error(error);
                container.innerHTML = '<p class="table-empty">Erro ao carregar ranking.</p>';
            }
        },

        async loadRecentMovements() {
            const container = document.getElementById('recentMovementsList');
            if (!container) return;

            container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i><span>Carregando...</span></div>';

            try {
                const movements = await API.get(`/inventory/movements/recent?limit=${CONFIG.recentLimit}`);

                if (!movements || movements.length === 0) {
                    container.innerHTML = '<p class="table-empty">Nenhuma movimentação registrada ainda.</p>';
                    return;
                }

                const iconMap = {
                    in: 'fa-arrow-down',
                    out: 'fa-arrow-up',
                    adjustment: 'fa-sliders-h',
                    return: 'fa-undo',
                };

                container.innerHTML = `<div class="movement-list">${movements.map((m) => {
                    const type = m.movement_type || 'adjustment';
                    const typeLabel = {
                        in: 'Entrada',
                        out: 'Saída',
                        adjustment: 'Ajuste',
                        return: 'Devolução',
                    }[type] || type;
                    const valueSign = type === 'in' || type === 'return' ? '+' : type === 'out' ? '-' : '';

                    return `
                        <div class="movement-item ${type}" data-movement-id="${m.id}">
                            <div class="movement-icon ${type}">
                                <i class="fas ${iconMap[type]}"></i>
                            </div>
                            <div class="movement-info">
                                <div class="movement-title">${Utils.escapeHtml(m.product_name)}</div>
                                <div class="movement-meta">${typeLabel} · ${Utils.formatDate(m.created_at)}</div>
                            </div>
                            <div class="movement-value ${type}">${valueSign}${m.quantity}</div>
                        </div>
                    `;
                }).join('')}</div>`;
            } catch (error) {
                console.error('Erro ao carregar movimentações:', error);
                container.innerHTML = '<p class="table-empty">Erro ao carregar movimentações.</p>';
            }
        },
    };

    // ======================================================
    // FORMULÁRIO DE PRODUTO (cadastro)
    // ======================================================
    const ProductForm = {
        treeData: [],
        sortState: { sort: 'created_at', order: 'desc' },

        async init() {
            const form = document.getElementById('productForm');
            if (!form) return;

            await Promise.all([this.loadCategoriesTree(), this.loadBrands()]);

            const nameInput = document.getElementById('prodName');
            const slugInput = document.getElementById('prodSlug');
            nameInput?.addEventListener('input', () => {
                if (!slugInput.dataset.manual) slugInput.value = this.slugify(nameInput.value);
            });
            slugInput?.addEventListener('input', () => { slugInput.dataset.manual = 'true'; });

            const rootSelect = document.getElementById('prodCategoryRoot');
            const genderSelect = document.getElementById('prodCategoryGender');
            const typeSelect = document.getElementById('prodCategoryType');

            rootSelect?.addEventListener('change', () => {
                const rootId = parseInt(rootSelect.value);
                const root = this.treeData.find((c) => c.id === rootId);
                genderSelect.innerHTML = '<option value="">Selecione o gênero</option>';
                typeSelect.innerHTML = '<option value="">Selecione o gênero primeiro</option>';
                typeSelect.disabled = true;

                if (root && root.children?.length) {
                    root.children.forEach((g) => {
                        const opt = document.createElement('option');
                        opt.value = g.id; opt.textContent = g.name;
                        genderSelect.appendChild(opt);
                    });
                    genderSelect.disabled = false;
                } else {
                    genderSelect.disabled = true;
                }
            });

            genderSelect?.addEventListener('change', () => {
                const rootId = parseInt(rootSelect.value);
                const genderId = parseInt(genderSelect.value);
                const root = this.treeData.find((c) => c.id === rootId);
                const gender = root?.children?.find((g) => g.id === genderId);

                typeSelect.innerHTML = '<option value="">Selecione o tipo</option>';
                if (gender && gender.children?.length) {
                    gender.children.forEach((t) => {
                        const opt = document.createElement('option');
                        opt.value = t.id; opt.textContent = t.name;
                        typeSelect.appendChild(opt);
                    });
                    typeSelect.disabled = false;
                } else {
                    typeSelect.disabled = true;
                }
            });

            this.setupImageInputs();
            form.addEventListener('submit', (e) => this.handleSubmit(e));
            document.getElementById('refreshRecentProducts')?.addEventListener('click', () => this.loadRecentProducts());
        },

        slugify(text) {
            return text.toString().toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9\s-]/g, '').trim()
                .replace(/\s+/g, '-').replace(/-+/g, '-');
        },

        setupImageInputs() {
            const urlInput = document.getElementById('prodImageUrl');
            const fileInput = document.getElementById('prodImageFile');
            const previewBtn = document.getElementById('btnPreviewUrl');
            const uploadBtn = document.getElementById('btnUploadImage');
            const clearBtn = document.getElementById('btnClearImage');
            const hidden = document.getElementById('prodImageFinal');
            const preview = document.getElementById('newProductPreview');
            const status = document.getElementById('uploadStatus');

            const setPreview = (url) => {
                if (url) {
                    preview.classList.add('has-image');
                    preview.innerHTML = `<img src="${url}" alt="Preview">`;
                    hidden.value = url;
                } else {
                    preview.classList.remove('has-image');
                    preview.innerHTML = '<i class="fas fa-image"></i><span>Sem imagem</span>';
                    hidden.value = '';
                }
            };

            previewBtn?.addEventListener('click', () => {
                const url = urlInput.value.trim();
                if (url) setPreview(url);
            });

            uploadBtn?.addEventListener('click', async () => {
                const file = fileInput.files?.[0];
                if (!file) {
                    status.textContent = 'Selecione um arquivo primeiro.';
                    status.style.color = '#dc2626';
                    return;
                }
                status.textContent = 'Enviando...';
                status.style.color = '#737373';
                try {
                    const url = await Uploader.upload(file);
                    setPreview(url);
                    status.textContent = 'Upload concluído!';
                    status.style.color = '#22c55e';
                } catch (err) {
                    status.textContent = err.message;
                    status.style.color = '#dc2626';
                }
            });

            clearBtn?.addEventListener('click', () => {
                setPreview('');
                urlInput.value = '';
                fileInput.value = '';
                status.textContent = '';
            });
        },

        async loadCategoriesTree() {
            const rootSelect = document.getElementById('prodCategoryRoot');
            if (!rootSelect) return;
            try {
                const tree = await API.get('/categories/tree-full');
                this.treeData = tree;
                rootSelect.innerHTML = '<option value="">Selecione...</option>';
                tree.forEach((c) => {
                    const opt = document.createElement('option');
                    opt.value = c.id; opt.textContent = c.name;
                    rootSelect.appendChild(opt);
                });
            } catch (error) { console.error(error); }
        },

        async loadBrands() {
            const select = document.getElementById('prodBrand');
            if (!select) return;
            try {
                const brands = await API.get('/brands');
                select.innerHTML = '<option value="">Sem marca</option>' +
                    brands.map((b) => `<option value="${b.id}">${Utils.escapeHtml(b.name)}</option>`).join('');
            } catch (error) { console.error(error); }
        },

        async handleSubmit(e) {
            e.preventDefault();
            const form = e.target;
            const btn = document.getElementById('submitProduct');
            const originalText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cadastrando...';

            try {
                const formData = new FormData(form);
                const imageUrl = formData.get('uploaded_image_url') || formData.get('image_url');

                const data = {
                    name: formData.get('name'),
                    slug: formData.get('slug'),
                    sku: formData.get('sku'),
                    description: formData.get('description'),
                    short_description: formData.get('short_description') || null,
                    category_id: parseInt(formData.get('category_id')),
                    brand_id: formData.get('brand_id') ? parseInt(formData.get('brand_id')) : null,
                    price: parseFloat(formData.get('price')),
                    cost_price: formData.get('cost_price') ? parseFloat(formData.get('cost_price')) : null,
                    stock_quantity: parseInt(formData.get('stock_quantity')) || 0,
                    weight: formData.get('weight') ? parseFloat(formData.get('weight')) : null,
                    dimensions: formData.get('dimensions') || null,
                    is_featured: formData.get('is_featured') === 'on',
                    is_new: formData.get('is_new') === 'on',
                    is_best_seller: formData.get('is_best_seller') === 'on',
                    is_active: formData.get('is_active') === 'on',
                    image_url: imageUrl || null,
                };

                const product = await API.post('/products', data);

                if (data.stock_quantity > 0) {
                    try {
                        await API.post('/inventory', {
                            product_id: product.id,
                            quantity: data.stock_quantity,
                            min_quantity: 5,
                        });
                    } catch (err) { console.warn(err); }
                }

                Toast.success(`Produto "${product.name}" cadastrado!`);
                form.reset();
                document.getElementById('prodSlug').dataset.manual = '';
                document.getElementById('newProductPreview').innerHTML = '<i class="fas fa-image"></i><span>Sem imagem</span>';
                document.getElementById('newProductPreview').classList.remove('has-image');
                document.getElementById('prodImageFinal').value = '';
                document.getElementById('prodCategoryGender').disabled = true;
                document.getElementById('prodCategoryType').disabled = true;

                await this.loadRecentProducts();
            } catch (error) {
                Toast.error(error.data?.error || 'Erro ao cadastrar produto');
            } finally {
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        },

        async loadRecentProducts() {
            const tbody = document.querySelector('#recentProductsTable tbody');
            const wrapper = document.querySelector('#recentProductsTable')?.closest('.table-wrapper');
            if (!tbody) return;

            TableLoader.start(wrapper);

            try {
                const params = new URLSearchParams({
                    sort: this.sortState.sort || 'created_at',
                    order: this.sortState.order || 'desc',
                    limit: 10,
                });

                const data = await API.get(`/products?${params.toString()}`);
                const products = data.products || [];

                if (products.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="7" class="table-empty">Nenhum produto cadastrado ainda.</td></tr>';
                } else {
                    tbody.innerHTML = products.map((p) => {
                        let stockClass = 'ok', stockIcon = 'fa-check-circle';
                        if (p.stock_quantity === 0) { stockClass = 'out'; stockIcon = 'fa-times-circle'; }
                        else if (p.stock_quantity <= CONFIG.lowStockThreshold) { stockClass = 'low'; stockIcon = 'fa-exclamation-triangle'; }
                        return `
                            <tr data-product-id="${p.id}">
                                <td>#${p.id}</td>
                                <td>${Utils.escapeHtml(p.name)}</td>
                                <td><code>${Utils.escapeHtml(p.sku)}</code></td>
                                <td>${Utils.formatPrice(p.price)}</td>
                                <td><span class="stock-indicator ${stockClass}"><i class="fas ${stockIcon}"></i> ${p.stock_quantity}</span></td>
                                <td class="category-cell">${Utils.buildCategoryBreadcrumb(p)}</td>
                                <td>${Utils.formatDate(p.created_at)}</td>
                            </tr>
                        `;
                    }).join('');

                    tbody.querySelectorAll('tr[data-product-id]').forEach((row) => {
                        row.addEventListener('click', async () => {
                            const id = row.dataset.productId;
                            try {
                                const product = await API.get(`/products/admin/${id}`);
                                DetailModal.showProduct(product);
                            } catch (err) {
                                Toast.error('Erro ao carregar produto');
                            }
                        });
                    });
                }
            } catch (error) {
                console.error(error);
                tbody.innerHTML = '<tr><td colspan="7" class="table-empty">Erro ao carregar produtos.</td></tr>';
            } finally {
                TableLoader.stop(wrapper);
            }
        },
    };

    // ======================================================
    // FORMULÁRIO DE MOVIMENTAÇÃO
    // ======================================================
    const MovementForm = {
        sortState: { sort: 'created_at', order: 'desc' },

        async init() {
            const form = document.getElementById('movementForm');
            if (!form) return;

            const display = document.getElementById('movProductDisplay');
            if (display) {
                display.addEventListener('click', (e) => {
                    if (e.target.closest('.product-picker-btn')) return;
                    this.openProductPicker();
                });

                display.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (e.target.closest('.product-picker-btn')) return;
                        this.openProductPicker();
                    }
                });
            }

            const selectBtn = document.getElementById('movSelectProductBtn');
            if (selectBtn) {
                selectBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.openProductPicker();
                });
            }

            form.addEventListener('submit', (e) => this.handleSubmit(e));
            document.getElementById('refreshRecentMovements')?.addEventListener('click', () => this.loadRecentMovements());
        },

        openProductPicker() {
            ProductPicker.openSelectMode((product) => {
                document.getElementById('movProduct').value = product.id;
                document.getElementById('movProductName').textContent = product.name;
                document.getElementById('movProductDisplay').classList.add('selected');
                document.getElementById('movProductStock').innerHTML =
                    `Estoque atual: <strong>${product.stock_quantity}</strong> unidade(s)`;
            });
        },

        async handleSubmit(e) {
            e.preventDefault();
            const form = e.target;
            const btn = document.getElementById('submitMovement');
            const originalText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando...';

            try {
                const formData = new FormData(form);
                const productId = parseInt(formData.get('product_id'));

                if (!productId) {
                    Toast.error('Selecione um produto primeiro');
                    btn.disabled = false;
                    btn.innerHTML = originalText;
                    return;
                }

                const inventoryList = await API.get(`/inventory/product/${productId}`);

                if (!inventoryList || inventoryList.length === 0) {
                    await API.post('/inventory', { product_id: productId, quantity: 0, min_quantity: 5 });
                    const newList = await API.get(`/inventory/product/${productId}`);
                    if (!newList || newList.length === 0) throw new Error('Não foi possível criar estoque');
                    return this.registerMovement(newList[0].id, formData, btn, originalText);
                }
                await this.registerMovement(inventoryList[0].id, formData, btn, originalText);
            } catch (error) {
                Toast.error(error.message || 'Erro ao registrar movimentação');
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        },

        async registerMovement(inventoryId, formData, btn, originalText) {
            try {
                const data = {
                    movement_type: formData.get('movement_type'),
                    quantity: parseInt(formData.get('quantity')),
                    reason: formData.get('reason') || null,
                    reference_type: formData.get('reference_type') || null,
                    reference_id: formData.get('reference_id') ? parseInt(formData.get('reference_id')) : null,
                    notes: formData.get('notes') || null,
                };

                await API.post(`/inventory/${inventoryId}/movement`, data);
                const typeLabel = { in: 'Entrada', out: 'Saída', adjustment: 'Ajuste', return: 'Devolução' }[data.movement_type];
                Toast.success(`${typeLabel} de ${data.quantity} unidade(s) registrada!`);

                document.getElementById('movementForm').reset();
                document.getElementById('movProduct').value = '';
                document.getElementById('movProductName').textContent = 'Nenhum produto selecionado';
                document.getElementById('movProductDisplay').classList.remove('selected');
                document.getElementById('movProductStock').textContent = '';

                await this.loadRecentMovements();
            } catch (error) {
                Toast.error(error.message || 'Erro ao registrar movimentação');
            } finally {
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        },

        async loadRecentMovements() {
            const tbody = document.querySelector('#recentMovementsTable tbody');
            const wrapper = document.querySelector('#recentMovementsTable')?.closest('.table-wrapper');
            if (!tbody) return;

            TableLoader.start(wrapper);

            try {
                const params = new URLSearchParams({
                    page: 1,
                    limit: 15,
                    sort: this.sortState.sort || 'created_at',
                    order: this.sortState.order || 'desc',
                });

                const data = await API.get(`/inventory/movements?${params.toString()}`);
                const movements = data.movements || [];

                if (movements.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="7" class="table-empty">Nenhuma movimentação registrada.</td></tr>';
                } else {
                    tbody.innerHTML = movements.map((m) => {
                        const typeLabel = { in: 'Entrada', out: 'Saída', adjustment: 'Ajuste', return: 'Devolução' }[m.movement_type] || m.movement_type;
                        return `
                            <tr data-movement-id="${m.id}">
                                <td>${Utils.formatDate(m.created_at)}</td>
                                <td>${Utils.escapeHtml(m.product_name)}</td>
                                <td><span class="badge badge-${m.movement_type}">${typeLabel}</span></td>
                                <td>${m.quantity}</td>
                                <td>${m.previous_quantity}</td>
                                <td><strong>${m.new_quantity}</strong></td>
                                <td>${Utils.escapeHtml(m.reason || '—')}</td>
                            </tr>
                        `;
                    }).join('');

                    tbody.querySelectorAll('tr[data-movement-id]').forEach((row) => {
                        row.addEventListener('click', () => {
                            MovementsModal.openDetail(row.dataset.movementId);
                        });
                    });
                }
            } catch (error) {
                console.error(error);
                tbody.innerHTML = '<tr><td colspan="7" class="table-empty">Erro ao carregar movimentações.</td></tr>';
            } finally {
                TableLoader.stop(wrapper);
            }
        },
    };

    // ======================================================
    // EDITAR PRODUTO
    // ======================================================
    const EditProduct = {
        currentProduct: null,
        searchPage: 1,
        searchQuery: '',

        onEnter() {
            this.resetView();
            this.setupSearchHandlers();
            this.setupBackButton();
            this.setupDeleteButton();
            this.setupViewAllButton();
        },

        setupViewAllButton() {
            const viewAllBtn = document.getElementById('editViewAllBtn');
            if (viewAllBtn && !viewAllBtn.dataset.bound) {
                viewAllBtn.addEventListener('click', () => {
                    ProductPicker.openEditMode();
                });
                viewAllBtn.dataset.bound = 'true';
            }
        },

        resetView() {
            document.getElementById('editSearchView').style.display = 'block';
            document.getElementById('editProductView').style.display = 'none';
            document.getElementById('editSearchInput').value = '';
            document.getElementById('editSearchResults').innerHTML = `
                <p class="search-hint">
                    <i class="fas fa-info-circle"></i>
                    Digite o nome, SKU ou ID de um produto e clique em buscar, ou clique em "Ver Todos"
                </p>
            `;
            document.getElementById('editPagination').innerHTML = '';
        },

        setupSearchHandlers() {
            const input = document.getElementById('editSearchInput');
            const btn = document.getElementById('editSearchBtn');

            if (input && !input.dataset.bound) {
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') { e.preventDefault(); this.search(1); }
                });
                input.dataset.bound = 'true';
            }
            if (btn && !btn.dataset.bound) {
                btn.addEventListener('click', () => this.search(1));
                btn.dataset.bound = 'true';
            }
        },

        setupBackButton() {
            const btn = document.getElementById('backToSearchBtn');
            if (btn && !btn.dataset.bound) {
                btn.addEventListener('click', () => {
                    document.getElementById('editSearchView').style.display = 'block';
                    document.getElementById('editProductView').style.display = 'none';
                });
                btn.dataset.bound = 'true';
            }
        },

        setupDeleteButton() {
            const btn = document.getElementById('editDeleteProductBtn');
            if (btn && !btn.dataset.bound) {
                btn.addEventListener('click', () => this.confirmDelete());
                btn.dataset.bound = 'true';
            }
        },

        async search(page = 1) {
            const input = document.getElementById('editSearchInput');
            const query = input.value.trim();
            if (!query) { Toast.warning('Digite algo para buscar'); return; }

            this.searchQuery = query;
            this.searchPage = page;

            const results = document.getElementById('editSearchResults');
            results.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i><span>Buscando...</span></div>';
            document.getElementById('editPagination').innerHTML = '';

            try {
                const data = await API.get(`/products/search?q=${encodeURIComponent(query)}&page=${page}&limit=${CONFIG.searchLimit}`);
                this.renderSearchResults(data);
            } catch (error) {
                console.error(error);
                results.innerHTML = '<p class="table-empty">Erro ao buscar produtos</p>';
            }
        },

        renderSearchResults(data) {
            const results = document.getElementById('editSearchResults');
            const { products, pagination } = data;
            if (!products || products.length === 0) {
                results.innerHTML = '<p class="table-empty">Nenhum produto encontrado.</p>';
                return;
            }
            results.innerHTML = products.map((p) => `
                <div class="search-result-item" data-product-id="${p.id}">
                    <div class="search-result-info">
                        <div class="search-result-name">
                            <span class="search-result-id">#${p.id}</span>
                            ${Utils.escapeHtml(p.name)}
                        </div>
                        <div class="search-result-meta">
                            SKU: ${Utils.escapeHtml(p.sku)} · Estoque: ${p.stock_quantity} · ${Utils.escapeHtml(p.category_name || '—')}
                        </div>
                    </div>
                    <div class="search-result-price">${Utils.formatPrice(p.price)}</div>
                    <i class="fas fa-arrow-right search-result-arrow"></i>
                </div>
            `).join('');

            results.querySelectorAll('.search-result-item').forEach((item) => {
                item.addEventListener('click', () => this.openProduct(parseInt(item.dataset.productId)));
            });

            this.renderPagination(pagination);
        },

        renderPagination(pagination) {
            const container = document.getElementById('editPagination');
            if (!pagination || pagination.pages <= 1) {
                container.innerHTML = '';
                return;
            }
            const { page, pages } = pagination;
            const buttons = [];
            buttons.push(`<button ${page === 1 ? 'disabled' : ''} data-page="${page - 1}">« Anterior</button>`);
            const start = Math.max(1, page - 2);
            const end = Math.min(pages, page + 2);
            if (start > 1) {
                buttons.push(`<button data-page="1">1</button>`);
                if (start > 2) buttons.push(`<span style="padding: 0 .5rem; color: var(--gray-400);">...</span>`);
            }
            for (let i = start; i <= end; i++) {
                buttons.push(`<button class="${i === page ? 'active' : ''}" data-page="${i}">${i}</button>`);
            }
            if (end < pages) {
                if (end < pages - 1) buttons.push(`<span style="padding: 0 .5rem; color: var(--gray-400);">...</span>`);
                buttons.push(`<button data-page="${pages}">${pages}</button>`);
            }
            buttons.push(`<button ${page === pages ? 'disabled' : ''} data-page="${page + 1}">Próxima »</button>`);
            container.innerHTML = buttons.join('');
            container.querySelectorAll('button[data-page]').forEach((btn) => {
                btn.addEventListener('click', () => this.search(parseInt(btn.dataset.page)));
            });
        },

        async openProduct(productId) {
            try {
                const product = await API.get(`/products/admin/${productId}`);
                this.currentProduct = product;

                document.getElementById('editSearchView').style.display = 'none';
                document.getElementById('editProductView').style.display = 'block';
                document.getElementById('editProductName').textContent = product.name;

                this.renderImages(product);
                this.renderFieldEditors(product);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } catch (error) {
                Toast.error('Erro ao carregar produto');
                console.error(error);
            }
        },

        renderImages(product) {
            const gallery = document.getElementById('editImageGallery');
            const images = product.images || [];

            if (images.length === 0) {
                gallery.innerHTML = `
                    <div class="image-gallery-empty">
                        <i class="fas fa-image"></i>
                        <p>Nenhuma imagem cadastrada</p>
                    </div>
                `;
                this.setupAddImageHandlers();
                return;
            }

            gallery.innerHTML = images.map((img) => `
                <div class="image-gallery-item ${img.primary ? 'primary' : ''}" data-image-id="${img.id}">
                    ${img.primary ? '<span class="image-gallery-badge">Principal</span>' : ''}
                    <img src="${img.url}" alt="${Utils.escapeHtml(img.alt || product.name)}">
                    <div class="image-gallery-actions">
                        ${!img.primary ? `<button data-action="primary" data-image-id="${img.id}" title="Definir como principal"><i class="fas fa-star"></i></button>` : ''}
                        <button class="delete" data-action="delete" data-image-id="${img.id}" title="Remover"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </div>
            `).join('');

            gallery.querySelectorAll('button[data-action]').forEach((btn) => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const action = btn.dataset.action;
                    const imageId = btn.dataset.imageId;

                    if (action === 'delete') {
                        if (!confirm('Remover esta imagem?')) return;
                        try {
                            await API.delete(`/products/${product.id}/images/${imageId}`);
                            Toast.success('Imagem removida');
                            this.openProduct(product.id);
                        } catch (err) { Toast.error('Erro ao remover imagem'); }
                    } else if (action === 'primary') {
                        try {
                            await API.put(`/products/${product.id}/images/${imageId}/primary`, {});
                            Toast.success('Imagem principal atualizada');
                            this.openProduct(product.id);
                        } catch (err) { Toast.error('Erro ao atualizar imagem'); }
                    }
                });
            });

            this.setupAddImageHandlers();
        },

        setupAddImageHandlers() {
            const addBtn = document.getElementById('editAddImageBtn');
            const uploadBtn = document.getElementById('editUploadImageBtn');
            const fileInput = document.getElementById('editNewImageFile');
            const urlInput = document.getElementById('editNewImageUrl');
            const status = document.getElementById('editUploadStatus');

            if (addBtn && !addBtn.dataset.bound) {
                addBtn.addEventListener('click', async () => {
                    const url = urlInput.value.trim();
                    if (!url) { Toast.warning('Informe a URL ou envie um arquivo'); return; }
                    try {
                        await API.post(`/products/${this.currentProduct.id}/images`, {
                            image_url: url,
                            alt_text: this.currentProduct.name,
                        });
                        Toast.success('Imagem adicionada');
                        urlInput.value = '';
                        this.openProduct(this.currentProduct.id);
                    } catch (err) { Toast.error('Erro ao adicionar imagem'); }
                });
                addBtn.dataset.bound = 'true';
            }

            if (uploadBtn && !uploadBtn.dataset.bound) {
                uploadBtn.addEventListener('click', async () => {
                    const file = fileInput.files?.[0];
                    if (!file) {
                        status.textContent = 'Selecione um arquivo';
                        status.style.color = '#dc2626';
                        return;
                    }
                    status.textContent = 'Enviando...';
                    status.style.color = '#737373';
                    try {
                        const url = await Uploader.upload(file);
                        urlInput.value = url;
                        status.textContent = 'Upload concluído! Clique em "Adicionar imagem"';
                        status.style.color = '#22c55e';
                    } catch (err) {
                        status.textContent = err.message;
                        status.style.color = '#dc2626';
                    }
                });
                uploadBtn.dataset.bound = 'true';
            }
        },

        renderFieldEditors(product) {
            const container = document.getElementById('fieldEditorList');
            const fields = [
                { key: 'name', label: 'Nome', type: 'text', value: product.name },
                { key: 'slug', label: 'Slug', type: 'text', value: product.slug },
                { key: 'sku', label: 'SKU', type: 'text', value: product.sku },
                { key: 'short_description', label: 'Descrição Curta', type: 'text', value: product.short_description || '' },
                { key: 'description', label: 'Descrição Completa', type: 'textarea', value: product.description || '' },
                { key: 'price', label: 'Preço (R$)', type: 'number', step: '0.01', value: product.price },
                { key: 'cost_price', label: 'Preço de Custo (R$)', type: 'number', step: '0.01', value: product.cost_price || '' },
                { key: 'discount_percent', label: 'Desconto (%)', type: 'number', step: '0.01', value: product.discount_percent || 0 },
                { key: 'stock_quantity', label: 'Estoque', type: 'number', value: product.stock_quantity },
                { key: 'weight', label: 'Peso (kg)', type: 'number', step: '0.01', value: product.weight || '' },
                { key: 'dimensions', label: 'Dimensões', type: 'text', value: product.dimensions || '' },
                { key: 'is_active', label: 'Produto Ativo', type: 'checkbox', value: product.is_active },
                { key: 'is_featured', label: 'Em Destaque', type: 'checkbox', value: product.is_featured },
                { key: 'is_new', label: 'Novo', type: 'checkbox', value: product.is_new },
                { key: 'is_best_seller', label: 'Mais Vendido', type: 'checkbox', value: product.is_best_seller },
            ];

            container.innerHTML = fields.map((f) => this.buildFieldEditor(f)).join('');

            container.querySelectorAll('.btn-save-field').forEach((btn) => {
                btn.addEventListener('click', () => this.saveField(btn.dataset.field));
            });

            container.querySelectorAll('input[type="text"], input[type="number"]').forEach((input) => {
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') { e.preventDefault(); this.saveField(input.dataset.field); }
                });
            });
        },

        buildFieldEditor(field) {
            const id = `edit-field-${field.key}`;
            let inputHtml = '';
            if (field.type === 'checkbox') {
                inputHtml = `<input type="checkbox" id="${id}" data-field="${field.key}" ${field.value ? 'checked' : ''}>`;
            } else if (field.type === 'textarea') {
                inputHtml = `<textarea id="${id}" data-field="${field.key}" rows="3">${Utils.escapeHtml(field.value)}</textarea>`;
            } else if (field.type === 'number') {
                inputHtml = `<input type="number" id="${id}" data-field="${field.key}" step="${field.step || '1'}" value="${field.value}">`;
            } else {
                inputHtml = `<input type="text" id="${id}" data-field="${field.key}" value="${Utils.escapeHtml(field.value)}">`;
            }
            return `
                <div class="field-editor" data-field-container="${field.key}">
                    <div class="field-editor-label">
                        ${field.label}
                        <small>ID do campo: ${field.key}</small>
                    </div>
                    <div class="field-editor-input">${inputHtml}</div>
                    <button class="btn-save-field" data-field="${field.key}">
                        <i class="fas fa-save"></i> Salvar
                    </button>
                </div>
            `;
        },

        async saveField(field) {
            const input = document.querySelector(`[data-field="${field}"]`);
            if (!input) return;

            let value;
            if (input.type === 'checkbox') value = input.checked;
            else if (input.type === 'number') value = input.value === '' ? null : parseFloat(input.value);
            else value = input.value;

            const btn = document.querySelector(`.btn-save-field[data-field="${field}"]`);
            const originalText = btn.innerHTML;
            btn.disabled = true;
            btn.classList.add('saving');
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

            const container = document.querySelector(`[data-field-container="${field}"]`);

            try {
                await API.patch(`/products/${this.currentProduct.id}`, { field, value });
                Toast.success(`Campo "${field}" atualizado`);
                container.classList.add('saved');
                setTimeout(() => container.classList.remove('saved'), 1500);
                await this.openProduct(this.currentProduct.id);
            } catch (error) {
                console.error(error);
                Toast.error(error.data?.error || `Erro ao salvar "${field}"`);
                container.classList.add('error');
                setTimeout(() => container.classList.remove('error'), 2000);
            } finally {
                btn.disabled = false;
                btn.classList.remove('saving');
                btn.innerHTML = originalText;
            }
        },

        async confirmDelete() {
            if (!this.currentProduct) return;
            const confirmed = confirm(
                `Tem certeza que deseja deletar o produto "${this.currentProduct.name}"?\n\nEsta ação remove o produto da loja (soft delete).`
            );
            if (!confirmed) return;
            try {
                await API.delete(`/products/${this.currentProduct.id}`);
                Toast.success('Produto deletado com sucesso');
                this.resetView();
            } catch (error) {
                Toast.error('Erro ao deletar produto');
            }
        },
    };

    // ======================================================
    // MODAL DE SELEÇÃO DE PRODUTOS
    // ======================================================
    const ProductPicker = {
        modal: null,
        mode: 'select',
        onSelect: null,
        filters: { q: '', min_price: '', max_price: '', stock: 'all', sort: 'date_desc', page: 1 },
        limit: 20,

        init() {
            this.modal = document.getElementById('productPickerModal');
            if (!this.modal) return;

            document.getElementById('closeProductPicker')?.addEventListener('click', () => this.close());
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) this.close();
            });
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.modal.classList.contains('active')) this.close();
            });

            const toggleBtn = document.getElementById('pickerToggleFilters');
            const filtersPanel = document.getElementById('pickerFilters');
            toggleBtn?.addEventListener('click', () => {
                const isOpen = toggleBtn.classList.contains('open');
                toggleBtn.classList.toggle('open', !isOpen);
                filtersPanel.style.display = isOpen ? 'none' : 'flex';
            });

            document.getElementById('pickerApplyFilters')?.addEventListener('click', () => {
                this.readFilters();
                this.filters.page = 1;
                this.load();
                this.updateFiltersBadge();
            });

            document.getElementById('pickerClearFilters')?.addEventListener('click', () => {
                this.clearFilters();
                this.updateFiltersBadge();
                this.load();
            });

            document.getElementById('pickerSearch')?.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.readFilters();
                    this.filters.page = 1;
                    this.load();
                    this.updateFiltersBadge();
                }
            });

            document.getElementById('pickerStock')?.addEventListener('change', () => {
                this.readFilters();
                this.filters.page = 1;
                this.load();
                this.updateFiltersBadge();
            });

            document.getElementById('pickerSort')?.addEventListener('change', () => {
                this.readFilters();
                this.filters.page = 1;
                this.load();
                this.updateFiltersBadge();
            });
        },

        readFilters() {
            this.filters.q = document.getElementById('pickerSearch').value.trim();
            this.filters.min_price = document.getElementById('pickerMinPrice').value;
            this.filters.max_price = document.getElementById('pickerMaxPrice').value;
            this.filters.stock = document.getElementById('pickerStock').value;
            this.filters.sort = document.getElementById('pickerSort').value;
        },

        clearFilters() {
            document.getElementById('pickerSearch').value = '';
            document.getElementById('pickerMinPrice').value = '';
            document.getElementById('pickerMaxPrice').value = '';
            document.getElementById('pickerStock').value = 'all';
            document.getElementById('pickerSort').value = 'date_desc';
            this.filters = { q: '', min_price: '', max_price: '', stock: 'all', sort: 'date_desc', page: 1 };
        },

        updateFiltersBadge() {
            let count = 0;
            if (this.filters.q) count++;
            if (this.filters.min_price) count++;
            if (this.filters.max_price) count++;
            if (this.filters.stock && this.filters.stock !== 'all') count++;
            if (this.filters.sort && this.filters.sort !== 'date_desc') count++;

            const badge = document.getElementById('pickerFiltersBadge');
            if (badge) {
                if (count > 0) {
                    badge.textContent = count;
                    badge.style.display = 'inline-block';
                } else {
                    badge.style.display = 'none';
                }
            }
        },

        openSelectMode(callback) {
            this.mode = 'select';
            this.onSelect = callback;
            document.getElementById('pickerTitle').textContent = 'Selecionar Produto';
            document.getElementById('pickerSubtitle').textContent = 'Clique em um produto para selecioná-lo';
            this.filters.page = 1;
            this.open();
        },

        openEditMode() {
            this.mode = 'edit';
            this.onSelect = null;
            document.getElementById('pickerTitle').textContent = 'Todos os Produtos';
            document.getElementById('pickerSubtitle').textContent = 'Clique em um produto para editá-lo';
            this.filters.page = 1;
            this.open();
        },

        open() {
            this.modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            this.readFilters();
            this.load();
            this.updateFiltersBadge();

            const toggleBtn = document.getElementById('pickerToggleFilters');
            const filtersPanel = document.getElementById('pickerFilters');
            if (toggleBtn && filtersPanel) {
                toggleBtn.classList.remove('open');
                filtersPanel.style.display = 'none';
            }
        },

        close() {
            this.modal.classList.remove('active');
            document.body.style.overflow = '';
        },

        async load() {
            const list = document.getElementById('pickerList');
            list.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i><span>Carregando...</span></div>';
            document.getElementById('pickerPagination').innerHTML = '';

            try {
                const params = new URLSearchParams({
                    q: this.filters.q,
                    min_price: this.filters.min_price,
                    max_price: this.filters.max_price,
                    stock: this.filters.stock,
                    sort: this.filters.sort,
                    page: this.filters.page,
                    limit: this.limit,
                });
                const data = await API.get(`/products/admin/list?${params.toString()}`);
                this.render(data);
            } catch (error) {
                console.error(error);
                list.innerHTML = '<div class="picker-empty"><i class="fas fa-exclamation-triangle"></i>Erro ao carregar produtos</div>';
            }
        },

        render(data) {
            const list = document.getElementById('pickerList');
            const { products, pagination } = data;

            if (!products || products.length === 0) {
                list.innerHTML = '<div class="picker-empty"><i class="fas fa-box-open"></i>Nenhum produto encontrado</div>';
                document.getElementById('pickerPagination').innerHTML = '';
                return;
            }

            list.innerHTML = products.map((p) => {
                let stockClass = 'ok';
                let stockLabel = 'Em estoque';
                if (p.stock_quantity === 0) { stockClass = 'out'; stockLabel = 'Sem estoque'; }
                else if (p.stock_quantity <= CONFIG.lowStockThreshold) { stockClass = 'low'; stockLabel = 'Estoque baixo'; }

                return `
                    <div class="picker-item" data-product-id="${p.id}">
                        <span class="picker-item-id">#${p.id}</span>
                        <div class="picker-item-info">
                            <div class="picker-item-name">${Utils.escapeHtml(p.name)}</div>
                            <div class="picker-item-meta">
                                SKU: ${Utils.escapeHtml(p.sku)} · ${Utils.formatPrice(p.price)}
                                ${p.category_name ? ' · ' + Utils.escapeHtml(p.category_name) : ''}
                            </div>
                        </div>
                        <span class="picker-item-stock ${stockClass}">${stockLabel}: ${p.stock_quantity}</span>
                        <i class="fas fa-arrow-right picker-item-action"></i>
                    </div>
                `;
            }).join('');

            list.querySelectorAll('.picker-item').forEach((item) => {
                item.addEventListener('click', () => {
                    const id = parseInt(item.dataset.productId);
                    const product = products.find((p) => p.id === id);
                    this.handleSelect(product);
                });
            });

            this.renderPagination(pagination);
        },

        renderPagination(pagination) {
            const container = document.getElementById('pickerPagination');
            const { page, pages } = pagination;
            if (pages <= 1) { container.innerHTML = ''; return; }

            const buttons = [];
            buttons.push(`<button ${page === 1 ? 'disabled' : ''} data-page="${page - 1}">«</button>`);

            const start = Math.max(1, page - 2);
            const end = Math.min(pages, page + 2);

            if (start > 1) {
                buttons.push(`<button data-page="1">1</button>`);
                if (start > 2) buttons.push('<span style="padding: 0 .3rem; color: var(--gray-400); align-self: center;">...</span>');
            }
            for (let i = start; i <= end; i++) {
                buttons.push(`<button class="${i === page ? 'active' : ''}" data-page="${i}">${i}</button>`);
            }
            if (end < pages) {
                if (end < pages - 1) buttons.push('<span style="padding: 0 .3rem; color: var(--gray-400); align-self: center;">...</span>');
                buttons.push(`<button data-page="${pages}">${pages}</button>`);
            }
            buttons.push(`<button ${page === pages ? 'disabled' : ''} data-page="${page + 1}">»</button>`);

            container.innerHTML = buttons.join('');
            container.querySelectorAll('button[data-page]').forEach((btn) => {
                btn.addEventListener('click', () => {
                    this.filters.page = parseInt(btn.dataset.page);
                    this.load();
                    document.getElementById('pickerList').scrollTop = 0;
                });
            });
        },

        handleSelect(product) {
            if (this.mode === 'select') {
                if (typeof this.onSelect === 'function') this.onSelect(product);
                this.close();
            } else {
                this.close();
                document.getElementById('editSearchView').style.display = 'none';
                document.getElementById('editProductView').style.display = 'block';
                EditProduct.openProduct(product.id);
            }
        },
    };

    // ======================================================
    // MODAL DE DETALHES DO DASHBOARD (KPIs)
    // ======================================================
    const DashboardDetailModal = {
        ctrl: null,
        currentType: 'total',
        currentPage: 1,
        sortState: { sort: null, order: 'asc' },
        filters: { q: '', category: '', stock: 'all', min_price: '', max_price: '' },
        filterKeys: ['q', 'category', 'stock', 'min_price', 'max_price'],
        filterDefaults: { stock: 'all' },
        filtersOpen: false,
        limit: 20,

        KPI_CONFIG: {
            totalProducts: { type: 'total',        title: 'Total de Produtos',  icon: 'fa-box',                  color: 'blue' },
            totalStock:    { type: 'in_stock',     title: 'Itens em Estoque',   icon: 'fa-warehouse',            color: 'green' },
            lowStock:      { type: 'low_stock',    title: 'Estoque Baixo',      icon: 'fa-exclamation-triangle', color: 'orange' },
            outOfStock:    { type: 'out_of_stock', title: 'Sem Estoque',        icon: 'fa-times-circle',         color: 'red' },
        },

        init() {
            this.ctrl = {
                modal: document.getElementById('dashboardDetailModal'),
                body: document.getElementById('dashboardDetailBody'),
                closeBtn: document.getElementById('closeDashboardDetail'),
            };

            const { modal, closeBtn } = this.ctrl;

            closeBtn?.addEventListener('click', () => this.close());
            modal?.addEventListener('click', (e) => {
                if (e.target === modal) this.close();
            });
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && modal?.classList.contains('active')) this.close();
            });

            document.querySelectorAll('.kpi-card[data-kpi]').forEach((card) => {
                card.addEventListener('click', () => this.open(card.dataset.kpi));
            });

            document.addEventListener('modalstack:change', () => this.updateBackVisibility());
        },

        updateBackVisibility() {
            const { modal, body } = this.ctrl;
            if (!modal || !modal.classList.contains('active')) return;

            const isTop = ModalStack.isTop('dashboardDetail');
            const hasParent = ModalStack.size() > 1;
            const backBtn = body?.querySelector('.back-modal');
            if (backBtn) {
                backBtn.classList.toggle('visible', isTop && hasParent);
            }
        },

        async open(kpiKey) {
            const cfg = this.KPI_CONFIG[kpiKey];
            if (!cfg) return;

            this.currentType = cfg.type;
            this.currentPage = 1;
            this.sortState = { sort: null, order: 'asc' };
            this.filters = { q: '', category: '', stock: 'all', min_price: '', max_price: '' };

            const { modal } = this.ctrl;

            ModalStack.push('dashboardDetail', modal);
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            this.updateBackVisibility();

            await this.load();
        },

        async load() {
            const { body } = this.ctrl;
            if (!body) return;

            TableLoader.start(body);

            try {
                const cfg = Object.values(this.KPI_CONFIG).find(c => c.type === this.currentType);
                const params = new URLSearchParams({
                    type: this.currentType,
                    page: this.currentPage,
                    limit: this.limit,
                });
                if (this.sortState.sort) {
                    params.set('sort', this.sortState.sort);
                    params.set('order', this.sortState.order);
                }
                if (this.filters.q) params.set('q', this.filters.q);
                if (this.filters.category) params.set('category', this.filters.category);
                if (this.filters.stock && this.filters.stock !== 'all') params.set('stock', this.filters.stock);
                if (this.filters.min_price) params.set('min_price', this.filters.min_price);
                if (this.filters.max_price) params.set('max_price', this.filters.max_price);

                const data = await API.get(`/products/admin/stats?${params.toString()}`);
                this.render(cfg, data);
            } catch (error) {
                console.error(error);
                body.innerHTML = '<div class="table-empty">Erro ao carregar detalhes</div>';
            } finally {
                TableLoader.stop(body);
            }
        },

        render(cfg, data) {
            const { body } = this.ctrl;
            const { products, pagination, summary } = data;

            let summaryHtml = '';
            if (this.currentType === 'total') {
                summaryHtml = `
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-item-label">Total</span>
                            <span class="detail-item-value accent">${summary.total}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-item-label">Ativos</span>
                            <span class="detail-item-value">${summary.active}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-item-label">Inativos</span>
                            <span class="detail-item-value">${summary.inactive}</span>
                        </div>
                    </div>
                `;
            } else if (this.currentType === 'in_stock') {
                summaryHtml = `
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-item-label">Total em Estoque</span>
                            <span class="detail-item-value accent">${(summary.total_items || 0).toLocaleString('pt-BR')}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-item-label">Produtos com Estoque</span>
                            <span class="detail-item-value">${summary.products_with_stock || 0}</span>
                        </div>
                    </div>
                `;
            } else if (this.currentType === 'low_stock') {
                summaryHtml = `
                    <p class="detail-hint">
                        <i class="fas fa-info-circle"></i>
                        Produtos com estoque entre 1 e ${summary.threshold} unidades.
                    </p>
                `;
            } else if (this.currentType === 'out_of_stock') {
                summaryHtml = `
                    <p class="detail-hint">
                        <i class="fas fa-info-circle"></i>
                        Produtos sem unidades disponíveis.
                    </p>
                `;
            }

            let listHtml = '';
            if (products.length === 0) {
                listHtml = `
                    <div class="table-empty">
                        <i class="fas fa-check-circle" style="color: var(--success); font-size: 2rem; display: block; margin-bottom: 0.5rem;"></i>
                        ${this.currentType === 'out_of_stock'
                            ? 'Nenhum produto sem estoque. Ótimo!'
                            : 'Nenhum produto encontrado.'}
                    </div>
                `;
            } else {
                listHtml = `
                    <div class="table-wrapper">
                        <table class="data-table" id="dashboardDetailTable">
                            <thead>
                                <tr>
                                    <th data-sort="id">ID</th>
                                    <th data-sort="name">Nome</th>
                                    <th data-sort="sku">SKU</th>
                                    <th data-sort="price">Preço</th>
                                    <th data-sort="stock_quantity">Estoque</th>
                                    <th data-sort="category_name">Categoria</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${products.map((p) => `
                                    <tr data-product-id="${p.id}">
                                        <td>#${p.id}</td>
                                        <td>${Utils.escapeHtml(p.name)}</td>
                                        <td><code>${Utils.escapeHtml(p.sku)}</code></td>
                                        <td>${Utils.formatPrice(p.price)}</td>
                                        <td>
                                            <span class="stock-indicator ${
                                                p.stock_quantity === 0 ? 'out'
                                                : p.stock_quantity <= CONFIG.lowStockThreshold ? 'low'
                                                : 'ok'
                                            }">
                                                ${p.stock_quantity}
                                            </span>
                                        </td>
                                        <td class="category-cell">${Utils.escapeHtml(p.category_name || '—')}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            }

            let paginationHtml = '';
            if (pagination.pages > 1) {
                paginationHtml = '<div class="pagination">';
                paginationHtml += `<button ${pagination.page === 1 ? 'disabled' : ''} data-page="${pagination.page - 1}">« Anterior</button>`;
                for (let i = 1; i <= pagination.pages; i++) {
                    paginationHtml += `<button class="${i === pagination.page ? 'active' : ''}" data-page="${i}">${i}</button>`;
                }
                paginationHtml += `<button ${pagination.page === pagination.pages ? 'disabled' : ''} data-page="${pagination.page + 1}">Próxima »</button>`;
                paginationHtml += '</div>';
            }

            // ---------- Filtros colapsáveis ----------
            const filterBody = `
                <div class="table-filters-row">
                    <input type="text" class="table-filter-input table-filter-input--md"
                        data-filter="q" placeholder="Buscar nome/SKU..." value="${Utils.escapeHtml(this.filters.q)}">
                    <input type="text" class="table-filter-input table-filter-input--md"
                        data-filter="category" placeholder="Categoria..." value="${Utils.escapeHtml(this.filters.category)}">
                </div>
                <div class="table-filters-row">
                    <select class="table-filter-select" data-filter="stock">
                        <option value="all" ${this.filters.stock === 'all' ? 'selected' : ''}>Estoque: Todos</option>
                        <option value="in" ${this.filters.stock === 'in' ? 'selected' : ''}>Em estoque</option>
                        <option value="low" ${this.filters.stock === 'low' ? 'selected' : ''}>Baixo</option>
                        <option value="out" ${this.filters.stock === 'out' ? 'selected' : ''}>Sem estoque</option>
                    </select>
                    <input type="number" class="table-filter-input table-filter-input--sm"
                        data-filter="min_price" placeholder="Min R$" value="${Utils.escapeHtml(this.filters.min_price)}">
                    <input type="number" class="table-filter-input table-filter-input--sm"
                        data-filter="max_price" placeholder="Max R$" value="${Utils.escapeHtml(this.filters.max_price)}">
                </div>
                <div class="table-filters-row">
                    <div class="table-filter-actions">
                        <button class="table-filter-btn table-filter-btn--apply" data-action="apply">
                            <i class="fas fa-search"></i> Aplicar
                        </button>
                        <button class="table-filter-btn table-filter-btn--clear" data-action="clear">
                            <i class="fas fa-times"></i> Limpar
                        </button>
                    </div>
                </div>
            `;

            const activeCount = FilterBar.countActive(this.filters, this.filterKeys, this.filterDefaults);
            const filtersHtml = FilterBar.render({
                id: 'dashboardDetail',
                activeCount,
                isOpen: this.filtersOpen,
                body: filterBody,
            });

            body.innerHTML = `
                <div class="detail-header">
                    <button class="back-modal" aria-label="Voltar" data-action="back">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    <div class="detail-header-icon kpi-icon-${cfg.color}">
                        <i class="fas ${cfg.icon}"></i>
                    </div>
                    <div class="detail-header-info">
                        <h2>${cfg.title}</h2>
                        <p>${pagination.total} ${pagination.total === 1 ? 'registro' : 'registros'}</p>
                    </div>
                </div>

                ${summaryHtml}
                ${filtersHtml}
                ${listHtml}
                ${paginationHtml}
            `;

            // ---------- Vincula filtros ----------
            FilterBar.bind(
                body,
                'dashboardDetail',
                this.filters,
                this.filterKeys,
                this.filterDefaults
            );

            // Setar `open` no painel se estava aberto
            if (this.filtersOpen) {
                body.querySelector('[data-filters-toggle="dashboardDetail"]')?.classList.add('open');
                body.querySelector('[data-filters-panel="dashboardDetail"]')?.classList.add('open');
            }

            // ---------- Sortable ----------
            const table = body.querySelector('#dashboardDetailTable');
            if (table) {
                SortableTable.apply(table, this.sortState, () => {
                    this.currentPage = 1;
                    this.load();
                });
            }

            // ---------- Aplica filtros ----------
            body.querySelectorAll('[data-action="apply"]').forEach((btn) => {
                btn.addEventListener('click', () => {
                    this.readFiltersFromBody(body);
                    this.currentPage = 1;
                    this.load();
                });
            });

            body.querySelectorAll('[data-action="clear"]').forEach((btn) => {
                btn.addEventListener('click', () => {
                    this.filters = { q: '', category: '', stock: 'all', min_price: '', max_price: '' };
                    this.currentPage = 1;
                    this.load();
                });
            });

            body.querySelectorAll('.table-filter-input').forEach((input) => {
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.readFiltersFromBody(body);
                        this.currentPage = 1;
                        this.load();
                    }
                });
            });

            body.querySelectorAll('.table-filter-select').forEach((sel) => {
                sel.addEventListener('change', () => {
                    this.readFiltersFromBody(body);
                    this.currentPage = 1;
                    this.load();
                });
            });

            // Guarda estado aberto/fechado
            const toggle = body.querySelector('[data-filters-toggle="dashboardDetail"]');
            toggle?.addEventListener('click', () => {
                this.filtersOpen = !this.filtersOpen;
            });

            // ---------- Back button ----------
            body.querySelector('[data-action="back"]')?.addEventListener('click', () => {
                this.handleBack();
            });

            // ---------- Clique em linha ----------
            body.querySelectorAll('tr[data-product-id]').forEach((row) => {
                row.addEventListener('click', async () => {
                    const id = row.dataset.productId;
                    try {
                        const product = await API.get(`/products/admin/${id}`);
                        DetailModal.showProduct(product);
                    } catch (err) {
                        Toast.error('Erro ao carregar produto');
                    }
                });
            });

            // ---------- Paginação ----------
            body.querySelectorAll('button[data-page]').forEach((btn) => {
                btn.addEventListener('click', () => {
                    this.currentPage = parseInt(btn.dataset.page);
                    this.load();
                });
            });

            // ---------- Atualiza visibilidade da seta ----------
            this.updateBackVisibility();
        },

        readFiltersFromBody(body) {
            const getVal = (name) => {
                const el = body.querySelector(`[data-filter="${name}"]`);
                return el ? el.value : '';
            };
            this.filters.q = getVal('q').trim();
            this.filters.category = getVal('category').trim();
            this.filters.stock = getVal('stock') || 'all';
            this.filters.min_price = getVal('min_price');
            this.filters.max_price = getVal('max_price');
        },

        handleBack() {
            // Fecha este modal e volta ao pai, se houver
            ModalStack.back();
            this._deactivate();
        },

        _deactivate() {
            const { modal } = this.ctrl;
            if (!modal) return;
            modal.classList.remove('active');
            if (ModalStack.size() > 0) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
        },

        close() {
            const { modal } = this.ctrl;
            ModalStack.closeFrom('dashboardDetail');
            if (modal) modal.classList.remove('active');
            document.body.style.overflow = '';
        },
    };

    // ======================================================
    // MODAL DE PRODUTOS MAIS VENDIDOS
    // ======================================================
    const TopSellersModal = {
        ctrl: null,
        mode: 'list',
        currentProductId: null,
        currentPage: 1,
        limit: 20,
        filters: { q: '' },
        filterKeys: ['q'],
        filtersOpen: false,

        init() {
            this.ctrl = {
                modal: document.getElementById('topSellersModal'),
                body: document.getElementById('topSellersBody'),
                closeBtn: document.getElementById('closeTopSellers'),
            };

            const { modal, closeBtn } = this.ctrl;

            closeBtn?.addEventListener('click', () => this.close());
            modal?.addEventListener('click', (e) => {
                if (e.target === modal) this.close();
            });
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && modal?.classList.contains('active')) this.close();
            });

            document.getElementById('viewAllTopSellers')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openFullList();
            });

            document.getElementById('topProductsList')?.addEventListener('click', (e) => {
                const item = e.target.closest('.ranking-item');
                if (!item) return;
                const productId = item.dataset.productId;
                if (productId) this.openDetail(productId);
            });

            document.addEventListener('modalstack:change', () => this.updateBackVisibility());
        },

        updateBackVisibility() {
            const { modal, body } = this.ctrl;
            if (!modal || !modal.classList.contains('active')) return;

            const isTop = ModalStack.isTop('topSellers');
            const backBtn = body?.querySelector('.back-modal');
            // Só mostra a seta no modo `detail`
            if (backBtn) {
                backBtn.classList.toggle('visible', isTop && this.mode === 'detail');
            }
        },

        async openDetail(productId) {
            this.mode = 'detail';
            this.currentProductId = productId;

            const { modal } = this.ctrl;

            if (!ModalStack.items.some((it) => it.name === 'topSellers')) {
                ModalStack.push('topSellers', modal);
            } else {
                // Reordena o modal para topo da pilha
                ModalStack.items = ModalStack.items.filter((it) => it.name !== 'topSellers');
                ModalStack.push('topSellers', modal);
            }

            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            this.updateBackVisibility();

            const { body } = this.ctrl;
            body.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i><span>Carregando...</span></div>';

            try {
                const stats = await API.get(`/products/admin/top-sellers/${productId}/stats`);
                this.renderDetail(stats);
            } catch (error) {
                console.error(error);
                body.innerHTML = '<div class="table-empty">Erro ao carregar detalhes</div>';
            }
        },

        async openFullList(page = 1) {
            this.mode = 'list';
            this.currentPage = page;

            const { modal } = this.ctrl;

            if (!ModalStack.items.some((it) => it.name === 'topSellers')) {
                ModalStack.push('topSellers', modal);
            }

            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            this.updateBackVisibility();

            const { body } = this.ctrl;
            body.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i><span>Carregando...</span></div>';

            try {
                const offset = (page - 1) * this.limit;
                const params = new URLSearchParams({
                    limit: this.limit,
                    offset,
                });
                if (this.filters.q) params.set('q', this.filters.q);

                const data = await API.get(`/products/admin/top-sellers?${params.toString()}`);

                const products = data.products || [];
                const hasMore = products.length === this.limit;
                const totalPages = hasMore ? this.currentPage + 1 : this.currentPage;

                this.renderList(products, { page: this.currentPage, pages: totalPages });
            } catch (error) {
                console.error(error);
                body.innerHTML = '<div class="table-empty">Erro ao carregar lista</div>';
            }
        },

        renderDetail(p) {
            const { body } = this.ctrl;
            const lastSaleText = p.last_sale_at
                ? Utils.formatDate(p.last_sale_at)
                : 'Nenhuma venda registrada';

            body.innerHTML = `
                <div class="detail-header">
                    <button class="back-modal" aria-label="Voltar" data-action="back">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    <div class="detail-header-icon" style="background: #fef3c7; color: #f59e0b;">
                        <i class="fas fa-trophy"></i>
                    </div>
                    <div class="detail-header-info">
                        <h2>${Utils.escapeHtml(p.name)}</h2>
                        <p>#${p.id} · SKU: ${Utils.escapeHtml(p.sku)}</p>
                    </div>
                </div>

                <div class="detail-section">
                    <h3>📊 Vendas</h3>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-item-label">Unidades vendidas</span>
                            <span class="detail-item-value accent">${p.sales_count}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-item-label">Receita total</span>
                            <span class="detail-item-value accent">${Utils.formatPrice(p.revenue)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-item-label">Preço unitário</span>
                            <span class="detail-item-value">${Utils.formatPrice(p.price)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-item-label">Estoque atual</span>
                            <span class="detail-item-value">${p.stock_quantity}</span>
                        </div>
                    </div>
                </div>

                <div class="detail-section">
                    <h3>🏷️ Ranking</h3>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-item-label">Posição</span>
                            <span class="detail-item-value accent">#${p.rank} de ${p.total_ranked}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-item-label">Última venda</span>
                            <span class="detail-item-value">${lastSaleText}</span>
                        </div>
                    </div>
                </div>

                <div class="detail-actions">
                    <a href="/produto/${Utils.escapeHtml(p.slug)}" target="_blank" rel="noopener" class="btn btn-secondary btn-sm">
                        <i class="fas fa-external-link-alt"></i> Ver na loja
                    </a>
                </div>
            `;

            body.querySelector('[data-action="back"]')?.addEventListener('click', () => {
                this.handleBack();
            });

            this.updateBackVisibility();
        },

        renderList(products, pagination) {
            const { body } = this.ctrl;

            const itemsHtml = products.length === 0
                ? '<div class="table-empty">Nenhum produto vendido ainda.</div>'
                : products.map((p, i) => {
                    const position = (pagination.page - 1) * this.limit + i + 1;
                    const positionClass = position === 1 ? 'gold' : position === 2 ? 'silver' : position === 3 ? 'bronze' : '';
                    return `
                        <div class="ranking-item" data-product-id="${p.id}">
                            <div class="ranking-position ${positionClass}">${position}</div>
                            <div class="ranking-info">
                                <div class="ranking-name">${Utils.escapeHtml(p.name)}</div>
                                <div class="ranking-meta">SKU: ${Utils.escapeHtml(p.sku)} · ${p.sales_count} vendas</div>
                            </div>
                            <div class="ranking-value">${Utils.formatPrice(p.revenue)}</div>
                            <i class="fas fa-arrow-right" style="color: var(--gray-300); margin-left: 0.5rem;"></i>
                        </div>
                    `;
                }).join('');

            let paginationHtml = '';
            if (pagination.pages > 1) {
                paginationHtml = '<div class="pagination">';
                paginationHtml += `<button ${pagination.page === 1 ? 'disabled' : ''} data-page="${pagination.page - 1}">«</button>`;
                for (let i = 1; i <= pagination.pages; i++) {
                    paginationHtml += `<button class="${i === pagination.page ? 'active' : ''}" data-page="${i}">${i}</button>`;
                }
                paginationHtml += `<button ${pagination.page === pagination.pages ? 'disabled' : ''} data-page="${pagination.page + 1}">»</button>`;
                paginationHtml += '</div>';
            }

            // ---------- Filtros colapsáveis ----------
            const filterBody = `
                <div class="table-filters-row">
                    <input type="text" class="table-filter-input table-filter-input--md"
                        data-filter="q" placeholder="Buscar por nome..." value="${Utils.escapeHtml(this.filters.q)}">
                </div>
                <div class="table-filters-row">
                    <div class="table-filter-actions">
                        <button class="table-filter-btn table-filter-btn--apply" data-action="apply">
                            <i class="fas fa-search"></i> Aplicar
                        </button>
                        <button class="table-filter-btn table-filter-btn--clear" data-action="clear">
                            <i class="fas fa-times"></i> Limpar
                        </button>
                    </div>
                </div>
            `;

            const activeCount = FilterBar.countActive(this.filters, this.filterKeys);
            const filtersHtml = FilterBar.render({
                id: 'topSellers',
                activeCount,
                isOpen: this.filtersOpen,
                body: filterBody,
            });

            body.innerHTML = `
                <div class="detail-header">
                    <button class="back-modal" aria-label="Voltar" data-action="back">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    <div class="detail-header-icon" style="background: #fef3c7; color: #f59e0b;">
                        <i class="fas fa-trophy"></i>
                    </div>
                    <div class="detail-header-info">
                        <h2>Produtos Mais Vendidos</h2>
                        <p>Ordenados por total de vendas</p>
                    </div>
                </div>

                ${filtersHtml}
                <div class="ranking-list">${itemsHtml}</div>
                ${paginationHtml}
            `;

            // Filtros: bind + open
            FilterBar.bind(body, 'topSellers', this.filters, this.filterKeys);
            if (this.filtersOpen) {
                body.querySelector('[data-filters-toggle="topSellers"]')?.classList.add('open');
                body.querySelector('[data-filters-panel="topSellers"]')?.classList.add('open');
            }
            const toggle = body.querySelector('[data-filters-toggle="topSellers"]');
            toggle?.addEventListener('click', () => {
                this.filtersOpen = !this.filtersOpen;
            });

            body.querySelector('[data-action="back"]')?.addEventListener('click', () => {
                this.handleBack();
            });

            body.querySelectorAll('.ranking-item').forEach((item) => {
                item.addEventListener('click', () => {
                    const id = item.dataset.productId;
                    if (id) this.openDetail(id);
                });
            });

            body.querySelectorAll('button[data-page]').forEach((btn) => {
                btn.addEventListener('click', () => {
                    this.openFullList(parseInt(btn.dataset.page));
                });
            });

            body.querySelectorAll('[data-action="apply"]').forEach((btn) => {
                btn.addEventListener('click', () => {
                    const inp = body.querySelector('[data-filter="q"]');
                    this.filters.q = inp ? inp.value.trim() : '';
                    this.openFullList(1);
                });
            });

            body.querySelectorAll('[data-action="clear"]').forEach((btn) => {
                btn.addEventListener('click', () => {
                    this.filters.q = '';
                    this.openFullList(1);
                });
            });

            const inp = body.querySelector('[data-filter="q"]');
            inp?.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.filters.q = inp.value.trim();
                    this.openFullList(1);
                }
            });

            this.updateBackVisibility();
        },

        handleBack() {
            // No modo detail → volta pra list
            if (this.mode === 'detail') {
                this.openFullList();
                // Reordena a pilha: topSellers continua no topo
                ModalStack.items = ModalStack.items.filter((it) => it.name !== 'topSellers');
                ModalStack.push('topSellers', this.ctrl.modal);
                return;
            }
            // Na lista → apenas fecha
            ModalStack.back();
            this._deactivate();
        },

        _deactivate() {
            const { modal } = this.ctrl;
            if (!modal) return;
            modal.classList.remove('active');
            if (ModalStack.size() > 0) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
        },

        close() {
            const { modal } = this.ctrl;
            ModalStack.closeFrom('topSellers');
            if (modal) modal.classList.remove('active');
            document.body.style.overflow = '';
        },
    };

    // ======================================================
    // MODAL DE MOVIMENTAÇÕES
    // ======================================================
    const MovementsModal = {
        ctrl: null,
        mode: 'list',
        currentMovementId: null,
        currentPage: 1,
        limit: 20,
        sortState: { sort: 'created_at', order: 'desc' },
        filters: { q: '', type: '', from: '', to: '' },
        filterKeys: ['q', 'type', 'from', 'to'],
        filtersOpen: false,

        TYPE_LABELS: {
            in: { label: 'Entrada', icon: 'fa-arrow-down', color: 'success' },
            out: { label: 'Saída', icon: 'fa-arrow-up', color: 'danger' },
            adjustment: { label: 'Ajuste', icon: 'fa-sliders-h', color: 'info' },
            return: { label: 'Devolução', icon: 'fa-undo', color: 'warning' },
        },

        init() {
            this.ctrl = {
                modal: document.getElementById('movementsModal'),
                body: document.getElementById('movementsBody'),
                closeBtn: document.getElementById('closeMovements'),
            };

            const { modal, closeBtn } = this.ctrl;

            closeBtn?.addEventListener('click', () => this.close());
            modal?.addEventListener('click', (e) => {
                if (e.target === modal) this.close();
            });
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && modal?.classList.contains('active')) this.close();
            });

            document.getElementById('viewAllMovements')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openFullList();
            });

            document.getElementById('recentMovementsList')?.addEventListener('click', (e) => {
                const item = e.target.closest('.movement-item');
                if (!item) return;
                const movementId = item.dataset.movementId;
                if (movementId) this.openDetail(movementId);
            });

            document.addEventListener('modalstack:change', () => this.updateBackVisibility());
        },

        updateBackVisibility() {
            const { modal, body } = this.ctrl;
            if (!modal || !modal.classList.contains('active')) return;

            const isTop = ModalStack.isTop('movements');
            const backBtn = body?.querySelector('.back-modal');
            if (backBtn) {
                backBtn.classList.toggle('visible', isTop && this.mode === 'detail');
            }
        },

        async openDetail(movementId) {
            this.mode = 'detail';
            this.currentMovementId = movementId;

            const { modal } = this.ctrl;

            if (!ModalStack.items.some((it) => it.name === 'movements')) {
                ModalStack.push('movements', modal);
            } else {
                ModalStack.items = ModalStack.items.filter((it) => it.name !== 'movements');
                ModalStack.push('movements', modal);
            }

            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            this.updateBackVisibility();

            const { body } = this.ctrl;
            body.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i><span>Carregando...</span></div>';

            try {
                const m = await API.get(`/inventory/movements/${movementId}`);
                this.renderDetail(m);
            } catch (error) {
                console.error(error);
                body.innerHTML = '<div class="table-empty">Erro ao carregar detalhes</div>';
            }
        },

        async openFullList(page = 1) {
            this.mode = 'list';
            this.currentPage = page;

            const { modal } = this.ctrl;

            if (!ModalStack.items.some((it) => it.name === 'movements')) {
                ModalStack.push('movements', modal);
            }

            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            this.updateBackVisibility();

            const { body } = this.ctrl;
            body.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i><span>Carregando...</span></div>';

            try {
                const params = new URLSearchParams({
                    page,
                    limit: this.limit,
                    sort: this.sortState.sort,
                    order: this.sortState.order,
                });
                if (this.filters.q) params.set('q', this.filters.q);
                if (this.filters.type) params.set('type', this.filters.type);
                if (this.filters.from) params.set('from', this.filters.from);
                if (this.filters.to) params.set('to', this.filters.to);

                const data = await API.get(`/inventory/movements?${params.toString()}`);
                this.renderList(data.movements, data.pagination);
            } catch (error) {
                console.error(error);
                body.innerHTML = '<div class="table-empty">Erro ao carregar movimentações</div>';
            }
        },

        renderDetail(m) {
            const { body } = this.ctrl;
            const typeInfo = this.TYPE_LABELS[m.movement_type] || this.TYPE_LABELS.adjustment;
            const valueSign = m.movement_type === 'in' || m.movement_type === 'return'
                ? `+${m.quantity}`
                : m.movement_type === 'out'
                    ? `-${m.quantity}`
                    : m.quantity;

            const refText = m.reference_type && m.reference_id
                ? `${m.reference_type} #${m.reference_id}`
                : '—';

            body.innerHTML = `
                <div class="detail-header">
                    <button class="back-modal" aria-label="Voltar" data-action="back">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    <div class="detail-header-icon" style="background: var(--${typeInfo.color}-bg); color: var(--${typeInfo.color});">
                        <i class="fas ${typeInfo.icon}"></i>
                    </div>
                    <div class="detail-header-info">
                        <h2>${typeInfo.label} ${valueSign} unidade(s)</h2>
                        <p>${Utils.escapeHtml(m.product_name)}</p>
                    </div>
                </div>

                <div class="detail-section">
                    <h3>📅 Data</h3>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-item-label">Quando</span>
                            <span class="detail-item-value">${Utils.formatDate(m.created_at)}</span>
                        </div>
                    </div>
                </div>

                <div class="detail-section">
                    <h3>📦 Estoque</h3>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-item-label">Quantidade anterior</span>
                            <span class="detail-item-value">${m.previous_quantity}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-item-label">Quantidade atual</span>
                            <span class="detail-item-value accent">${m.new_quantity}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-item-label">Variação</span>
                            <span class="detail-item-value">${valueSign}</span>
                        </div>
                    </div>
                </div>

                <div class="detail-section">
                    <h3>📝 Detalhes</h3>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-item-label">Motivo</span>
                            <span class="detail-item-value">${Utils.escapeHtml(m.reason || '—')}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-item-label">Referência</span>
                            <span class="detail-item-value">${Utils.escapeHtml(refText)}</span>
                        </div>
                        ${m.user_name ? `
                            <div class="detail-item">
                                <span class="detail-item-label">Registrado por</span>
                                <span class="detail-item-value">${Utils.escapeHtml(m.user_name)}</span>
                            </div>
                        ` : ''}
                    </div>
                    ${m.notes ? `
                        <div class="detail-item" style="margin-top: 1rem;">
                            <span class="detail-item-label">Observações</span>
                            <span class="detail-item-value">${Utils.escapeHtml(m.notes)}</span>
                        </div>
                    ` : ''}
                </div>

                <div class="detail-actions">
                    <button class="btn btn-secondary btn-sm" id="viewProductFromMovementBtn" type="button">
                        <i class="fas fa-box"></i> Ver produto
                    </button>
                </div>
            `;

            body.querySelector('[data-action="back"]')?.addEventListener('click', () => {
                this.handleBack();
            });

            body.querySelector('#viewProductFromMovementBtn')?.addEventListener('click', async () => {
                try {
                    const product = await API.get(`/products/admin/${m.product_id}`);
                    DetailModal.showProduct(product);
                } catch (err) {
                    Toast.error('Erro ao carregar produto');
                }
            });

            this.updateBackVisibility();
        },

        renderList(movements, pagination) {
            const { body } = this.ctrl;

            const itemsHtml = movements.length === 0
                ? '<div class="table-empty">Nenhuma movimentação encontrada.</div>'
                : movements.map((m) => {
                    const typeInfo = this.TYPE_LABELS[m.movement_type] || this.TYPE_LABELS.adjustment;
                    const valueSign = m.movement_type === 'in' || m.movement_type === 'return' ? '+' : '-';
                    return `
                        <div class="movement-item ${m.movement_type}" data-movement-id="${m.id}">
                            <div class="movement-icon ${m.movement_type}">
                                <i class="fas ${typeInfo.icon}"></i>
                            </div>
                            <div class="movement-info">
                                <div class="movement-title">${Utils.escapeHtml(m.product_name)}</div>
                                <div class="movement-meta">${typeInfo.label} · ${Utils.formatDate(m.created_at)}</div>
                            </div>
                            <div class="movement-value ${m.movement_type}">${valueSign}${m.quantity}</div>
                        </div>
                    `;
                }).join('');

            let paginationHtml = '';
            if (pagination.pages > 1) {
                paginationHtml = '<div class="pagination">';
                paginationHtml += `<button ${pagination.page === 1 ? 'disabled' : ''} data-page="${pagination.page - 1}">«</button>`;
                for (let i = 1; i <= pagination.pages; i++) {
                    paginationHtml += `<button class="${i === pagination.page ? 'active' : ''}" data-page="${i}">${i}</button>`;
                }
                paginationHtml += `<button ${pagination.page === pagination.pages ? 'disabled' : ''} data-page="${pagination.page + 1}">»</button>`;
                paginationHtml += '</div>';
            }

            const filterBody = `
                <div class="table-filters-row">
                    <input type="text" class="table-filter-input table-filter-input--md"
                        data-filter="q" placeholder="Buscar produto/SKU..." value="${Utils.escapeHtml(this.filters.q)}">
                    <select class="table-filter-select" data-filter="type">
                        <option value="" ${!this.filters.type ? 'selected' : ''}>Tipo: Todos</option>
                        <option value="in" ${this.filters.type === 'in' ? 'selected' : ''}>Entrada</option>
                        <option value="out" ${this.filters.type === 'out' ? 'selected' : ''}>Saída</option>
                        <option value="adjustment" ${this.filters.type === 'adjustment' ? 'selected' : ''}>Ajuste</option>
                        <option value="return" ${this.filters.type === 'return' ? 'selected' : ''}>Devolução</option>
                    </select>
                </div>
                <div class="table-filters-row">
                    <input type="date" class="table-filter-input table-filter-input--date"
                        data-filter="from" value="${Utils.escapeHtml(this.filters.from)}" title="A partir de">
                    <input type="date" class="table-filter-input table-filter-input--date"
                        data-filter="to" value="${Utils.escapeHtml(this.filters.to)}" title="Até">
                </div>
                <div class="table-filters-row">
                    <div class="table-filter-actions">
                        <button class="table-filter-btn table-filter-btn--apply" data-action="apply">
                            <i class="fas fa-search"></i> Aplicar
                        </button>
                        <button class="table-filter-btn table-filter-btn--clear" data-action="clear">
                            <i class="fas fa-times"></i> Limpar
                        </button>
                    </div>
                </div>
            `;

            const activeCount = FilterBar.countActive(this.filters, this.filterKeys);
            const filtersHtml = FilterBar.render({
                id: 'movements',
                activeCount,
                isOpen: this.filtersOpen,
                body: filterBody,
            });

            body.innerHTML = `
                <div class="detail-header">
                    <button class="back-modal" aria-label="Voltar" data-action="back">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    <div class="detail-header-icon" style="background: var(--info-bg); color: var(--info);">
                        <i class="fas fa-history"></i>
                    </div>
                    <div class="detail-header-info">
                        <h2>Movimentações de Estoque</h2>
                        <p>${pagination.total} ${pagination.total === 1 ? 'registro' : 'registros'}</p>
                    </div>
                </div>

                ${filtersHtml}
                <div class="movement-list">${itemsHtml}</div>
                ${paginationHtml}
            `;

            FilterBar.bind(body, 'movements', this.filters, this.filterKeys);
            if (this.filtersOpen) {
                body.querySelector('[data-filters-toggle="movements"]')?.classList.add('open');
                body.querySelector('[data-filters-panel="movements"]')?.classList.add('open');
            }
            const toggle = body.querySelector('[data-filters-toggle="movements"]');
            toggle?.addEventListener('click', () => {
                this.filtersOpen = !this.filtersOpen;
            });

            body.querySelector('[data-action="back"]')?.addEventListener('click', () => {
                this.handleBack();
            });

            body.querySelectorAll('.movement-item').forEach((item) => {
                item.addEventListener('click', () => {
                    const id = item.dataset.movementId;
                    if (id) this.openDetail(id);
                });
            });

            body.querySelectorAll('button[data-page]').forEach((btn) => {
                btn.addEventListener('click', () => {
                    this.openFullList(parseInt(btn.dataset.page));
                });
            });

            body.querySelectorAll('[data-action="apply"]').forEach((btn) => {
                btn.addEventListener('click', () => {
                    this.readFiltersFromBody(body);
                    this.openFullList(1);
                });
            });

            body.querySelectorAll('[data-action="clear"]').forEach((btn) => {
                btn.addEventListener('click', () => {
                    this.filters = { q: '', type: '', from: '', to: '' };
                    this.openFullList(1);
                });
            });

            body.querySelectorAll('.table-filter-input').forEach((inp) => {
                inp.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.readFiltersFromBody(body);
                        this.openFullList(1);
                    }
                });
            });

            body.querySelectorAll('.table-filter-select').forEach((sel) => {
                sel.addEventListener('change', () => {
                    this.readFiltersFromBody(body);
                    this.openFullList(1);
                });
            });

            this.updateBackVisibility();
        },

        readFiltersFromBody(body) {
            const getVal = (name) => {
                const el = body.querySelector(`[data-filter="${name}"]`);
                return el ? el.value : '';
            };
            this.filters.q = getVal('q').trim();
            this.filters.type = getVal('type');
            this.filters.from = getVal('from');
            this.filters.to = getVal('to');
        },

        handleBack() {
            if (this.mode === 'detail') {
                this.openFullList();
                ModalStack.items = ModalStack.items.filter((it) => it.name !== 'movements');
                ModalStack.push('movements', this.ctrl.modal);
                return;
            }
            ModalStack.back();
            this._deactivate();
        },

        _deactivate() {
            const { modal } = this.ctrl;
            if (!modal) return;
            modal.classList.remove('active');
            if (ModalStack.size() > 0) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
        },

        close() {
            const { modal } = this.ctrl;
            ModalStack.closeFrom('movements');
            if (modal) modal.classList.remove('active');
            document.body.style.overflow = '';
        },
    };

    // ======================================================
    // MÉTRICAS — Dashboard analítico com Chart.js
    // Gráficos em accordeon: usuário expande o que quer ver
    // ======================================================
    const MetricsPage = {
        // Estado
        period: '30d',
        loading: false,
        data: null,
        charts: {},        // referência das instâncias Chart.js
        renderedCharts: {}, // marca quais gráficos já foram renderizados
        expandedCards: {}, // estado aberto/fechado por id do card
        initialized: false,

        // Mapeamento: id do card → chave do gráfico
        CARD_MAP: {
            'metrics-card-revenue':         'revenue',
            'metrics-card-orders-status':   'ordersStatus',
            'metrics-card-payment-methods': 'paymentMethods',
            'metrics-card-top-categories':  'topCategories',
            'metrics-card-stock-movements': 'stockMovements',
            'metrics-card-new-customers':   'newCustomers',
            'metrics-card-price-dist':      'priceDistribution',
            'metrics-card-top-customers':   'topCustomers', // tabela, não Chart.js
        },

        // Paleta para os gráficos
        COLORS: {
            accent: '#c9a96e',
            accentSoft: 'rgba(201, 169, 110, 0.15)',
            success: '#22c55e',
            successSoft: 'rgba(34, 197, 94, 0.15)',
            danger: '#ef4444',
            dangerSoft: 'rgba(239, 68, 68, 0.15)',
            info: '#3b82f6',
            infoSoft: 'rgba(59, 130, 246, 0.15)',
            warning: '#f59e0b',
            warningSoft: 'rgba(245, 158, 11, 0.15)',
            purple: '#8b5cf6',
            purpleSoft: 'rgba(139, 92, 246, 0.15)',
            gray: '#737373',
            graySoft: 'rgba(115, 115, 115, 0.15)',
        },

        DONUT_PALETTE: [
            '#c9a96e', '#3b82f6', '#22c55e', '#f59e0b',
            '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899',
        ],

        // ==================================================
        // INIT
        // ==================================================
        init() {
            this.setupAccordions();
            this.bindPeriodSelector();
            this.bindRefresh();
            this.load();
            this.initialized = true;
        },

        // ==================================================
        // ACCORDIONS — dá IDs aos cards e liga os headers
        // ==================================================
        setupAccordions() {
            const section = document.getElementById('section-metrics');
            if (!section) return;

            // Localiza todos os cards de métrica (dentro do grid E o de top clientes)
            const cards = section.querySelectorAll('.metrics-card');

            cards.forEach((card, index) => {
                // Pula se já processado
                if (card.dataset.accordionReady === 'true') return;
                card.dataset.accordionReady = 'true';

                // Descobre o id lógico com base na posição/conteúdo
                const id = this.inferCardId(card, index);
                if (!id) return;

                card.dataset.cardId = id;

                // Top clientes precisa de altura maior
                if (id === 'metrics-card-top-customers') {
                    card.classList.add('metrics-card-tall');
                }

                // Header clicável
                const header = card.querySelector('.card-header');
                if (header) {
                    header.setAttribute('role', 'button');
                    header.setAttribute('tabindex', '0');
                    header.setAttribute('aria-expanded', 'false');

                    header.addEventListener('click', () => this.toggleCard(id));
                    header.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            this.toggleCard(id);
                        }
                    });
                }
            });
        },

        // Descobre qual card é pelo conteúdo (canvas id ou título)
        inferCardId(card, fallbackIndex) {
            const canvas = card.querySelector('canvas');
            if (canvas && canvas.id) {
                const map = {
                    chartRevenue:          'metrics-card-revenue',
                    chartOrdersStatus:     'metrics-card-orders-status',
                    chartPaymentMethods:   'metrics-card-payment-methods',
                    chartTopCategories:    'metrics-card-top-categories',
                    chartStockMovements:   'metrics-card-stock-movements',
                    chartNewCustomers:     'metrics-card-new-customers',
                    chartPriceDistribution:'metrics-card-price-dist',
                };
                if (map[canvas.id]) return map[canvas.id];
            }

            // Se não tem canvas, é a tabela
            if (card.querySelector('#topCustomersTable')) {
                return 'metrics-card-top-customers';
            }

            return `metrics-card-${fallbackIndex}`;
        },

        // ==================================================
        // TOGGLE — abre/fecha um card
        // ==================================================
        toggleCard(id) {
            const card = document.querySelector(`[data-card-id="${id}"]`);
            if (!card) return;

            const header = card.querySelector('.card-header');
            const isExpanded = card.classList.contains('expanded');

            if (isExpanded) {
                card.classList.remove('expanded');
                header?.setAttribute('aria-expanded', 'false');
                this.expandedCards[id] = false;
            } else {
                card.classList.add('expanded');
                header?.setAttribute('aria-expanded', 'true');
                this.expandedCards[id] = true;

                // Lazy render: só renderiza o gráfico se ainda não foi renderizado
                // Neste ciclo de dados (period atual)
                const chartKey = this.CARD_MAP[id];
                if (chartKey && !this.renderedCharts[chartKey] && this.data) {
                    // Pequeno delay para a animação do max-height começar
                    setTimeout(() => this.renderOneChart(chartKey), 80);
                }
            }
        },

        // ==================================================
        // BIND — Período
        // ==================================================
        bindPeriodSelector() {
            const selector = document.getElementById('periodSelector');
            if (!selector || selector.dataset.bound === 'true') return;
            selector.dataset.bound = 'true';

            selector.querySelectorAll('.period-btn').forEach((btn) => {
                btn.addEventListener('click', () => {
                    const period = btn.dataset.period;
                    if (!period || period === this.period) return;

                    selector.querySelectorAll('.period-btn').forEach((b) => b.classList.remove('active'));
                    btn.classList.add('active');

                    this.period = period;
                    this.load();
                });
            });
        },

        // ==================================================
        // BIND — Botão Atualizar
        // ==================================================
        bindRefresh() {
            const btn = document.getElementById('refreshMetrics');
            if (!btn || btn.dataset.bound === 'true') return;
            btn.dataset.bound = 'true';

            btn.addEventListener('click', async () => {
                if (this.loading) return;
                btn.classList.add('loading');
                await this.load();
                btn.classList.remove('loading');
                Toast.info('Métricas atualizadas');
            });
        },

        // ==================================================
        // LOAD
        // ==================================================
        async load() {
            if (this.loading) return;
            this.loading = true;

            try {
                const data = await API.get(`/metrics?period=${this.period}`);
                this.data = data;

                // Reset dos gráficos renderizados — ao mudar período, todos devem
                // ser re-renderizados quando o usuário expandir
                this.renderedCharts = {};
                this.destroyAllCharts();

                this.render();
            } catch (error) {
                console.error('Erro ao carregar métricas:', error);
                Toast.error('Erro ao carregar métricas');
            } finally {
                this.loading = false;
            }
        },

        // ==================================================
        // RENDER — Popula KPIs, tabela e renderiza gráficos abertos
        // ==================================================
        render() {
            const d = this.data;
            if (!d) return;

            // KPIs e tabela sempre renderizam (são leves)
            this.renderKPIs(d.overview);
            this.renderTopCustomersTable(d.top_customers);
            this.renderFooter(d);

            // Para cada card expandido, renderiza o gráfico correspondente
            Object.keys(this.expandedCards).forEach((id) => {
                if (this.expandedCards[id]) {
                    const chartKey = this.CARD_MAP[id];
                    if (chartKey && chartKey !== 'topCustomers') {
                        this.renderOneChart(chartKey);
                    }
                }
            });
        },

        // ==================================================
        // RENDER — despacha para o gráfico específico
        // ==================================================
        renderOneChart(key) {
            const d = this.data;
            if (!d) return;

            switch (key) {
                case 'revenue':
                    this.renderRevenueChart(d.revenue_timeseries);
                    break;
                case 'ordersStatus':
                    this.renderOrdersStatusChart(d.orders_by_status);
                    break;
                case 'paymentMethods':
                    this.renderPaymentMethodsChart(d.payment_methods);
                    break;
                case 'topCategories':
                    this.renderTopCategoriesChart(d.top_categories);
                    break;
                case 'stockMovements':
                    this.renderStockMovementsChart(d.stock_movements);
                    break;
                case 'newCustomers':
                    this.renderNewCustomersChart(d.new_customers);
                    break;
                case 'priceDistribution':
                    this.renderPriceDistributionChart(d.price_distribution);
                    break;
            }

            this.renderedCharts[key] = true;
        },

        // ==================================================
        // HELPERS
        // ==================================================
        destroyChart(key) {
            if (this.charts[key]) {
                this.charts[key].destroy();
                this.charts[key] = null;
            }
        },

        destroyAllCharts() {
            Object.keys(this.charts).forEach((k) => this.destroyChart(k));
        },

        formatShortDate(dateStr) {
            if (!dateStr) return '';
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        },

        formatShortMonth(dateStr) {
            if (!dateStr) return '';
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            return d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
        },

        formatLabel(dateStr) {
            if (this.period === '12m') return this.formatShortMonth(dateStr);
            return this.formatShortDate(dateStr);
        },

        ensureChartAvailable() {
            if (typeof Chart === 'undefined') {
                console.warn('Chart.js não carregado — gráficos não serão renderizados');
                return false;
            }
            Chart.defaults.font.family = "'Segoe UI', system-ui, -apple-system, sans-serif";
            Chart.defaults.font.size = 12;
            Chart.defaults.color = '#737373';
            return true;
        },

        // ==================================================
        // KPIs
        // ==================================================
        renderKPIs(overview) {
            if (!overview) return;

            const fmtCurrency = (v) => Utils.formatPrice(v);
            const fmtNumber = (v) => Number(v || 0).toLocaleString('pt-BR');
            const fmtPct = (v) => {
                const n = parseFloat(v) || 0;
                const sign = n > 0 ? '+' : '';
                return `${sign}${n.toFixed(1)}%`;
            };

            const applyDelta = (el, pct) => {
                if (!el) return;
                el.classList.remove('positive', 'negative');
                const n = parseFloat(pct) || 0;
                if (n > 0) {
                    el.classList.add('positive');
                    el.innerHTML = `<i class="fas fa-arrow-up"></i> ${fmtPct(n)}`;
                } else if (n < 0) {
                    el.classList.add('negative');
                    el.innerHTML = `<i class="fas fa-arrow-down"></i> ${fmtPct(n)}`;
                } else {
                    el.innerHTML = `<i class="fas fa-minus"></i> 0%`;
                }
            };

            document.getElementById('metricsRevenue').textContent = fmtCurrency(overview.revenue.value);
            document.getElementById('metricsOrders').textContent = fmtNumber(overview.orders.value);
            document.getElementById('metricsTicketAvg').textContent = fmtCurrency(overview.ticket_avg.value);
            document.getElementById('metricsCustomers').textContent = fmtNumber(overview.customers.value);

            applyDelta(document.getElementById('metricsRevenueDelta'), overview.revenue.delta_pct);
            applyDelta(document.getElementById('metricsOrdersDelta'), overview.orders.delta_pct);
            applyDelta(document.getElementById('metricsTicketAvgDelta'), overview.ticket_avg.delta_pct);
            applyDelta(document.getElementById('metricsCustomersDelta'), overview.customers.delta_pct);

            // ================================================
            // Bind dos cliques nos KPIs (drill-down)
            // ================================================
            this.bindKpiClick('metricsRevenue', 'revenue');
            
            this.bindKpiClick('metricsOrders', 'orders');             // ← ADICIONAR
            this.bindKpiClick('metricsTicketAvg', 'ticket');
            this.bindKpiClick('metricsCustomers', 'customers');
        },

        /**
         * Adiciona clique drill-down a um valor de KPI.
         * O id passado é do elemento `<span class="metrics-kpi-value">`.
         */
        bindKpiClick(valueId, type) {
            const el = document.getElementById(valueId);
            if (!el) return;

            // Sobe até o card para aplicar cursor/hover
            const card = el.closest('.metrics-kpi-card');
            if (!card) return;

            card.classList.add('metrics-kpi-clickable');
            card.setAttribute('role', 'button');
            card.setAttribute('tabindex', '0');
            card.setAttribute('title', 'Ver detalhes');

            const trigger = () => {
                MetricsDetailModal.open(type, this.period);
            };

            // Evita binds duplicados
            if (card.dataset.kpiClickBound === 'true') return;
            card.dataset.kpiClickBound = 'true';

            card.addEventListener('click', trigger);
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    trigger();
                }
            });
        },

        // ==================================================
        // GRÁFICO — Receita (line)
        // ==================================================
        renderRevenueChart(data) {
            if (!this.ensureChartAvailable()) return;
            const canvas = document.getElementById('chartRevenue');
            if (!canvas) return;

            this.destroyChart('revenue');

            const labels = data.map((d) => this.formatLabel(d.date));
            const values = data.map((d) => d.revenue);

            const ctx = canvas.getContext('2d');
            const gradient = ctx.createLinearGradient(0, 0, 0, 300);
            gradient.addColorStop(0, 'rgba(201, 169, 110, 0.35)');
            gradient.addColorStop(1, 'rgba(201, 169, 110, 0)');

            this.charts.revenue = new Chart(ctx, {
                type: 'line',
                data: {
                    labels,
                    datasets: [{
                        label: 'Receita (R$)',
                        data: values,
                        borderColor: this.COLORS.accent,
                        backgroundColor: gradient,
                        borderWidth: 2.5,
                        tension: 0.35,
                        fill: true,
                        pointRadius: 3,
                        pointHoverRadius: 6,
                        pointBackgroundColor: this.COLORS.accent,
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                    }],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: '#171717',
                            padding: 12,
                            callbacks: {
                                label: (ctx) => `Receita: ${Utils.formatPrice(ctx.parsed.y)}`,
                            },
                        },
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(0,0,0,0.05)' },
                            ticks: { callback: (v) => `R$ ${Number(v).toLocaleString('pt-BR')}` },
                        },
                        x: { grid: { display: false } },
                    },
                },
            });
        },

        // ==================================================
        // GRÁFICO — Pedidos por status (doughnut)
        // ==================================================
        renderOrdersStatusChart(data) {
            if (!this.ensureChartAvailable()) return;
            const canvas = document.getElementById('chartOrdersStatus');
            if (!canvas) return;

            this.destroyChart('ordersStatus');

            const LABELS = {
                pending: 'Pendente', paid: 'Pago', shipped: 'Enviado',
                delivered: 'Entregue', cancelled: 'Cancelado',
            };

            const labels = data.map((d) => LABELS[d.status] || d.status);
            const values = data.map((d) => d.count);

            if (values.length === 0) {
                this.renderEmptyChart(canvas, 'Nenhum pedido no período');
                return;
            }

            this.charts.ordersStatus = new Chart(canvas.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels,
                    datasets: [{
                        data: values,
                        backgroundColor: this.DONUT_PALETTE,
                        borderWidth: 2,
                        borderColor: '#fff',
                    }],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '65%',
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { padding: 12, usePointStyle: true, pointStyle: 'circle', font: { size: 12 } },
                        },
                        tooltip: {
                            backgroundColor: '#171717',
                            padding: 12,
                            callbacks: {
                                label: (ctx) => {
                                    const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                    const pct = ((ctx.parsed / total) * 100).toFixed(1);
                                    return `${ctx.label}: ${ctx.parsed} (${pct}%)`;
                                },
                            },
                        },
                    },
                },
            });
        },

        // ==================================================
        // GRÁFICO — Formas de pagamento (doughnut)
        // ==================================================
        renderPaymentMethodsChart(data) {
            if (!this.ensureChartAvailable()) return;
            const canvas = document.getElementById('chartPaymentMethods');
            if (!canvas) return;

            this.destroyChart('paymentMethods');

            const LABELS = { pix: 'PIX', credit_card: 'Cartão', boleto: 'Boleto' };
            const labels = data.map((d) => LABELS[d.method] || d.method);
            const values = data.map((d) => d.count);

            if (values.length === 0) {
                this.renderEmptyChart(canvas, 'Nenhum pagamento no período');
                return;
            }

            this.charts.paymentMethods = new Chart(canvas.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels,
                    datasets: [{
                        data: values,
                        backgroundColor: this.DONUT_PALETTE.slice().reverse(),
                        borderWidth: 2,
                        borderColor: '#fff',
                    }],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '65%',
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { padding: 12, usePointStyle: true, pointStyle: 'circle', font: { size: 12 } },
                        },
                        tooltip: {
                            backgroundColor: '#171717',
                            padding: 12,
                            callbacks: {
                                label: (ctx) => {
                                    const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                    const pct = ((ctx.parsed / total) * 100).toFixed(1);
                                    return `${ctx.label}: ${ctx.parsed} (${pct}%)`;
                                },
                            },
                        },
                    },
                },
            });
        },

        // ==================================================
        // GRÁFICO — Top categorias (barra horizontal)
        // ==================================================
        renderTopCategoriesChart(data) {
            if (!this.ensureChartAvailable()) return;
            const canvas = document.getElementById('chartTopCategories');
            if (!canvas) return;

            this.destroyChart('topCategories');

            if (!data || data.length === 0) {
                this.renderEmptyChart(canvas, 'Nenhuma venda no período');
                return;
            }

            const labels = data.map((d) => d.name);
            const values = data.map((d) => d.revenue);

            this.charts.topCategories = new Chart(canvas.getContext('2d'), {
                type: 'bar',
                data: {
                    labels,
                    datasets: [{
                        label: 'Receita (R$)',
                        data: values,
                        backgroundColor: this.COLORS.accent,
                        hoverBackgroundColor: '#b8944f',
                        borderRadius: 6,
                        barThickness: 22,
                    }],
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: '#171717',
                            padding: 12,
                            callbacks: { label: (ctx) => `Receita: ${Utils.formatPrice(ctx.parsed.x)}` },
                        },
                    },
                    scales: {
                        x: {
                            beginAtZero: true,
                            grid: { color: 'rgba(0,0,0,0.05)' },
                            ticks: { callback: (v) => `R$ ${Number(v).toLocaleString('pt-BR')}` },
                        },
                        y: { grid: { display: false } },
                    },
                },
            });
        },

        // ==================================================
        // GRÁFICO — Movimentações de estoque (barra empilhada)
        // ==================================================
        renderStockMovementsChart(data) {
            if (!this.ensureChartAvailable()) return;
            const canvas = document.getElementById('chartStockMovements');
            if (!canvas) return;

            this.destroyChart('stockMovements');

            if (!data || data.length === 0) {
                this.renderEmptyChart(canvas, 'Nenhuma movimentação no período');
                return;
            }

            const labels = data.map((d) => this.formatLabel(d.date));
            const inQty = data.map((d) => d.in_qty);
            const outQty = data.map((d) => d.out_qty);

            this.charts.stockMovements = new Chart(canvas.getContext('2d'), {
                type: 'bar',
                data: {
                    labels,
                    datasets: [
                        {
                            label: 'Entradas',
                            data: inQty,
                            backgroundColor: this.COLORS.success,
                            borderRadius: 4,
                            stack: 'stock',
                        },
                        {
                            label: 'Saídas',
                            data: outQty,
                            backgroundColor: this.COLORS.danger,
                            borderRadius: 4,
                            stack: 'stock',
                        },
                    ],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { padding: 12, usePointStyle: true, pointStyle: 'circle' },
                        },
                        tooltip: { backgroundColor: '#171717', padding: 12, mode: 'index', intersect: false },
                    },
                    scales: {
                        x: { stacked: true, grid: { display: false } },
                        y: {
                            stacked: true,
                            beginAtZero: true,
                            grid: { color: 'rgba(0,0,0,0.05)' },
                            ticks: { precision: 0 },
                        },
                    },
                },
            });
        },

        // ==================================================
        // GRÁFICO — Novos clientes (barras verticais)
        // ==================================================
        renderNewCustomersChart(data) {
            if (!this.ensureChartAvailable()) return;
            const canvas = document.getElementById('chartNewCustomers');
            if (!canvas) return;

            this.destroyChart('newCustomers');

            if (!data || data.length === 0) {
                this.renderEmptyChart(canvas, 'Nenhum cliente no período');
                return;
            }

            const labels = data.map((d) => this.formatLabel(d.date));
            const values = data.map((d) => d.count);

            this.charts.newCustomers = new Chart(canvas.getContext('2d'), {
                type: 'bar',
                data: {
                    labels,
                    datasets: [{
                        label: 'Novos clientes',
                        data: values,
                        backgroundColor: this.COLORS.info,
                        hoverBackgroundColor: '#2563eb',
                        borderRadius: 6,
                    }],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: { backgroundColor: '#171717', padding: 12 },
                    },
                    scales: {
                        x: { grid: { display: false } },
                        y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(0,0,0,0.05)' },
                            ticks: { precision: 0 },
                        },
                    },
                },
            });
        },

        // ==================================================
        // GRÁFICO — Distribuição de preços
        // ==================================================
        renderPriceDistributionChart(data) {
            if (!this.ensureChartAvailable()) return;
            const canvas = document.getElementById('chartPriceDistribution');
            if (!canvas) return;

            this.destroyChart('priceDistribution');

            if (!data || data.length === 0) {
                this.renderEmptyChart(canvas, 'Nenhum produto cadastrado');
                return;
            }

            const labels = data.map((d) => `R$ ${d.range}`);
            const values = data.map((d) => d.count);

            this.charts.priceDistribution = new Chart(canvas.getContext('2d'), {
                type: 'bar',
                data: {
                    labels,
                    datasets: [{
                        label: 'Produtos',
                        data: values,
                        backgroundColor: this.COLORS.purple,
                        hoverBackgroundColor: '#7c3aed',
                        borderRadius: 6,
                    }],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: '#171717',
                            padding: 12,
                            callbacks: { label: (ctx) => `${ctx.parsed.y} produto(s)` },
                        },
                    },
                    scales: {
                        x: { grid: { display: false } },
                        y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(0,0,0,0.05)' },
                            ticks: { precision: 0 },
                        },
                    },
                },
            });
        },

        // ==================================================
        // TABELA — Top clientes
        // ==================================================
        renderTopCustomersTable(customers) {
            const tbody = document.querySelector('#topCustomersTable tbody');
            if (!tbody) return;

            if (!customers || customers.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="table-empty">Nenhum cliente com compras no período.</td></tr>';
                return;
            }

            tbody.innerHTML = customers.map((c, i) => `
                <tr>
                    <td>${i + 1}º</td>
                    <td>${Utils.escapeHtml(c.full_name)}</td>
                    <td>${Utils.escapeHtml(c.email)}</td>
                    <td>${c.orders_count}</td>
                    <td>${Utils.formatPrice(c.revenue)}</td>
                </tr>
            `).join('');
        },

        // ==================================================
        // FOOTER
        // ==================================================
        renderFooter(data) {
            const el = document.getElementById('metricsGeneratedAt');
            if (!el || !data.generated_at) return;

            const date = new Date(data.generated_at);
            const formatted = date.toLocaleString('pt-BR', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
            });
            el.textContent = `Gerado em ${formatted} · Período: ${data.overview.label}`;
        },

        // ==================================================
        // HELPERS
        // ==================================================
        renderEmptyChart(canvas, message) {
            const ctx = canvas.getContext('2d');
            const w = canvas.width = canvas.offsetWidth || 300;
            const h = canvas.height = canvas.offsetHeight || 200;

            ctx.clearRect(0, 0, w, h);
            ctx.fillStyle = '#a3a3a3';
            ctx.font = '14px "Segoe UI", system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(message, w / 2, h / 2);
        },
    };

        // ======================================================
    // MÉTRICAS — Modal de detalhe (drill-down dos KPIs)
    // ======================================================
    const MetricsDetailModal = {
        ctrl: null,
        currentType: null,
        currentPeriod: '30d',
        currentPage: 1,
        limit: 20,
        onlyBuyers: false,
        currentStatus: null,

        // Mapeamento: tipo do KPI → configuração de render
        CONFIG: {
            revenue: {
                title: 'Detalhe da Receita',
                icon: 'fa-dollar-sign',
                iconColor: 'accent',
                endpoint: 'revenue',
                paginated: true,
            },
            orders: {
                title: 'Todos os Pedidos',
                icon: 'fa-shopping-bag',
                iconColor: 'blue',
                endpoint: 'orders',
                paginated: true,
            },
            ticket: {
                title: 'Distribuição do Ticket Médio',
                icon: 'fa-receipt',
                iconColor: 'green',
                endpoint: 'ticket',
                paginated: false,
            },
            customers: {
                title: 'Novos Clientes',
                icon: 'fa-user-plus',
                iconColor: 'purple',
                endpoint: 'customers',
                paginated: true,
            },
        },

        init() {
            this.ctrl = {
                modal: document.getElementById('metricsDetailModal'),
                body: document.getElementById('metricsDetailBody'),
                closeBtn: document.getElementById('closeMetricsDetail'),
            };

            const { modal, closeBtn } = this.ctrl;
            if (!modal) return;

            closeBtn?.addEventListener('click', () => this.close());
            modal?.addEventListener('click', (e) => {
                if (e.target === modal) this.close();
            });
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && modal?.classList.contains('active')) this.close();
            });

            document.addEventListener('modalstack:change', () => this.updateBackVisibility());
        },

        // ==================================================
        // ABRE O MODAL — chamado pelo clique no KPI
        // ==================================================
        async open(type, period) {
            const cfg = this.CONFIG[type];
            if (!cfg) return;

            this.currentType = type;
            this.currentPeriod = period || MetricsPage.period || '30d';
            this.currentPage = 1;
            this.onlyBuyers = false;
            this.currentStatus = null;

            const { modal } = this.ctrl;

            // Registra no ModalStack (habilita z-index correto e botão voltar)
            ModalStack.push('metricsDetail', modal);

            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            this.updateBackVisibility();

            await this.load();
        },

        // ==================================================
        // LOAD — busca os dados do tipo atual
        // ==================================================
        async load() {
            const { body } = this.ctrl;
            if (!body) return;

            TableLoader.start(body);

            try {
                const cfg = this.CONFIG[this.currentType];
                const params = new URLSearchParams({
                    type: cfg.endpoint,
                    period: this.currentPeriod,
                    page: this.currentPage,
                    limit: this.limit,
                });
                if (this.currentType === 'customers' && this.onlyBuyers) {
                    params.set('only_buyers', 'true');
                }
                if (this.currentType === 'orders' && this.currentStatus) {
                    params.set('status', this.currentStatus);
                }

                const data = await API.get(`/metrics/detail?${params.toString()}`);
                this.render(data);
            } catch (error) {
                console.error('Erro ao carregar detalhe:', error);
                body.innerHTML = '<div class="table-empty">Erro ao carregar detalhes</div>';
            } finally {
                TableLoader.stop(body);
            }
        },

        // ==================================================
        // RENDER — distribui para o tipo certo
        // ==================================================
        render(data) {
            const { body } = this.ctrl;
            const cfg = this.CONFIG[this.currentType];

            const headerHtml = `
                <div class="detail-header">
                    <button class="back-modal" aria-label="Voltar" data-action="back">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    <div class="detail-header-icon kpi-icon-${cfg.iconColor}">
                        <i class="fas ${cfg.icon}"></i>
                    </div>
                    <div class="detail-header-info">
                        <h2>${cfg.title}</h2>
                        <p>${
                            cfg.paginated
                                ? `${data.pagination.total} ${data.pagination.total === 1 ? 'registro' : 'registros'}`
                                : `${data.summary.total_orders || 0} pedidos analisados`
                        } · Período: ${this.labelForPeriod(this.currentPeriod)}</p>
                    </div>
                </div>
            `;

            let contentHtml = '';
            switch (this.currentType) {
                case 'revenue':   contentHtml = this.renderRevenue(data); break;
                case 'orders':    contentHtml = this.renderOrders(data); break;
                case 'ticket':    contentHtml = this.renderTicket(data); break;
                case 'customers': contentHtml = this.renderCustomers(data); break;
            }

            const paginationHtml = cfg.paginated ? this.renderPagination(data.pagination) : '';

            body.innerHTML = headerHtml + contentHtml + paginationHtml;

            // ===== BINDS =====
            body.querySelector('[data-action="back"]')?.addEventListener('click', () => this.handleBack());

            // Filtro de status (só orders)
            if (this.currentType === 'orders') {
                const sel = body.querySelector('#metricsOrderStatus');
                sel?.addEventListener('change', () => {
                    this.currentStatus = sel.value || null;
                    this.currentPage = 1;
                    this.load();
                });
            }

            // Checkbox (só customers)
            if (this.currentType === 'customers') {
                const cb = body.querySelector('#metricsOnlyBuyers');
                cb?.addEventListener('change', () => {
                    this.onlyBuyers = cb.checked;
                    this.currentPage = 1;
                    this.load();
                });
            }

            // ===== SORTABLE em todas as tabelas =====
            // Toda tabela com a classe .metrics-detail-table ganha sort client-side
            body.querySelectorAll('.metrics-detail-table').forEach((table) => {
                this.setupClientSort(table);
            });

            // ===== Cliques em linhas de pedido =====
            body.querySelectorAll('tr[data-order-id]').forEach((row) => {
                row.addEventListener('click', () => {
                    window.open(`/pedido/${row.dataset.orderId}`, '_blank');
                });
            });

            // ===== Paginação =====
            body.querySelectorAll('button[data-page]').forEach((btn) => {
                btn.addEventListener('click', () => {
                    this.currentPage = parseInt(btn.dataset.page);
                    this.load();
                });
            });

            this.updateBackVisibility();
        },

        // ==================================================
        // RENDER — Receita (tabela de pedidos)
        // ==================================================
        // ==================================================
        // RENDER — Receita (tabela de pedidos)
        // ==================================================
        renderRevenue(data) {
            const fmtCur = (v) => Utils.formatPrice(v);
            const fmtDate = (d) => Utils.formatDate(d);

            const STATUS_LABEL = {
                pending: 'Pendente',
                paid: 'Pago',
                shipped: 'Enviado',
                delivered: 'Entregue',
                cancelled: 'Cancelado',
            };

            const PAYMENT_LABEL = {
                pix: 'PIX',
                credit_card: 'Cartão',
                boleto: 'Boleto',
            };

            const summaryHtml = `
                <div class="metrics-detail-summary">
                    <div class="detail-item">
                        <span class="detail-item-label">Pedidos</span>
                        <span class="detail-item-value accent">${data.summary.total}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-item-label">Receita Total</span>
                        <span class="detail-item-value accent">${fmtCur(data.summary.total_revenue)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-item-label">Ticket Médio</span>
                        <span class="detail-item-value">${fmtCur(data.summary.avg_ticket)}</span>
                    </div>
                </div>
            `;

            if (data.items.length === 0) {
                return summaryHtml + `
                    <div class="table-empty">
                        <i class="fas fa-receipt" style="color: var(--gray-300); font-size: 2rem; display: block; margin-bottom: 0.5rem;"></i>
                        Nenhum pedido no período.
                    </div>
                `;
            }

            const tableHtml = `
                <div class="table-wrapper">
                    <table class="data-table metrics-detail-table" data-sortable>
                        <thead>
                            <tr>
                                <th data-sort="id" data-type="number">Pedido</th>
                                <th data-sort="user_name" data-type="string">Cliente</th>
                                <th data-sort="created_at" data-type="date" class="col-center">Data</th>
                                <th data-sort="status" data-type="string" class="col-center">Status</th>
                                <th data-sort="payment_method" data-type="string" class="col-center">Pagamento</th>
                                <th data-sort="total" data-type="number" class="col-money">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.items.map((o) => `
                                <tr data-order-id="${o.id}">
                                    <td data-value="${o.id}"><strong>#${o.id}</strong></td>
                                    <td data-value="${Utils.escapeHtml(o.user_name || '')}">
                                        <div class="metrics-detail-customer-name">${Utils.escapeHtml(o.user_name || '—')}</div>
                                        <div class="metrics-detail-customer-email">${Utils.escapeHtml(o.user_email || '')}</div>
                                    </td>
                                    <td data-value="${o.created_at}" class="col-center">${fmtDate(o.created_at)}</td>
                                    <td data-value="${o.status}" class="col-status">
                                        <span class="badge-status ${o.status}">${STATUS_LABEL[o.status] || o.status}</span>
                                    </td>
                                    <td data-value="${o.payment_method || ''}" class="col-center">${PAYMENT_LABEL[o.payment_method] || o.payment_method || '—'}</td>
                                    <td data-value="${o.total}" class="col-money"><strong>${fmtCur(o.total)}</strong></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;

            return summaryHtml + tableHtml;
        },

        // ==================================================
        // RENDER — Clientes (tabela nominal)
        // ==================================================
        // ==================================================
        // RENDER — Clientes (tabela nominal)
        // ==================================================
        renderCustomers(data) {
            const fmtCur = (v) => Utils.formatPrice(v);
            const fmtDate = (d) => Utils.formatDate(d);

            const summaryHtml = `
                <div class="metrics-detail-summary">
                    <div class="detail-item">
                        <span class="detail-item-label">Total de novos</span>
                        <span class="detail-item-value accent">${data.summary.total}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-item-label">Já compraram</span>
                        <span class="detail-item-value">${data.summary.buyers}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-item-label">Taxa de conversão</span>
                        <span class="detail-item-value">
                            ${data.summary.total > 0
                                ? Math.round((data.summary.buyers / data.summary.total) * 100) + '%'
                                : '—'}
                        </span>
                    </div>
                </div>
            `;

            const filterHtml = `
                <div class="metrics-detail-filters">
                    <label>
                        <input type="checkbox" id="metricsOnlyBuyers" ${this.onlyBuyers ? 'checked' : ''}>
                        Mostrar apenas clientes que já compraram
                    </label>
                </div>
            `;

            if (data.items.length === 0) {
                return summaryHtml + filterHtml + `
                    <div class="table-empty">
                        <i class="fas fa-users" style="color: var(--gray-300); font-size: 2rem; display: block; margin-bottom: 0.5rem;"></i>
                        Nenhum cliente ${this.onlyBuyers ? 'comprador ' : ''}no período.
                    </div>
                `;
            }

            const tableHtml = `
                <div class="table-wrapper">
                    <table class="data-table metrics-detail-table" data-sortable>
                        <thead>
                            <tr>
                                <th data-sort="full_name" data-type="string">Cliente</th>
                                <th data-sort="email" data-type="string">E-mail</th>
                                <th data-sort="registered_at" data-type="date" class="col-center">Cadastro</th>
                                <th data-sort="orders_count" data-type="number" class="col-center">Pedidos</th>
                                <th data-sort="total_spent" data-type="number" class="col-money">Total Gasto</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.items.map((c) => `
                                <tr>
                                    <td data-value="${Utils.escapeHtml(c.full_name)}">
                                        <div class="metrics-detail-customer-name">${Utils.escapeHtml(c.full_name)}</div>
                                    </td>
                                    <td data-value="${Utils.escapeHtml(c.email)}">
                                        <div class="metrics-detail-customer-email">${Utils.escapeHtml(c.email)}</div>
                                    </td>
                                    <td data-value="${c.registered_at}" class="col-center">${fmtDate(c.registered_at)}</td>
                                    <td data-value="${c.orders_count}" class="col-center">${c.orders_count}</td>
                                    <td data-value="${c.total_spent}" class="col-money"><strong>${fmtCur(c.total_spent)}</strong></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;

            return summaryHtml + filterHtml + tableHtml;
        },

        // ==================================================
        // RENDER — Paginação
        // ==================================================
        renderPagination(pagination) {
            if (!pagination || pagination.pages <= 1) return '';

            const { page, pages } = pagination;
            let html = '<div class="pagination">';

            html += `<button ${page === 1 ? 'disabled' : ''} data-page="${page - 1}">« Anterior</button>`;

            const start = Math.max(1, page - 2);
            const end = Math.min(pages, page + 2);

            if (start > 1) {
                html += `<button data-page="1">1</button>`;
                if (start > 2) html += '<span style="padding: 0 .5rem; color: var(--gray-400);">...</span>';
            }
            for (let i = start; i <= end; i++) {
                html += `<button class="${i === page ? 'active' : ''}" data-page="${i}">${i}</button>`;
            }
            if (end < pages) {
                if (end < pages - 1) html += '<span style="padding: 0 .5rem; color: var(--gray-400);">...</span>';
                html += `<button data-page="${pages}">${pages}</button>`;
            }

            html += `<button ${page === pages ? 'disabled' : ''} data-page="${page + 1}">Próxima »</button>`;
            html += '</div>';

            return html;
        },

                // ==================================================
        // RENDER — Pedidos (tabela completa, todos os status)
        // ==================================================
        renderOrders(data) {
            const fmtCur = (v) => Utils.formatPrice(v);
            const fmtDate = (d) => Utils.formatDate(d);

            const STATUS_LABEL = {
                pending: 'Pendente',
                paid: 'Pago',
                shipped: 'Enviado',
                delivered: 'Entregue',
                cancelled: 'Cancelado',
            };
            const PAYMENT_LABEL = {
                pix: 'PIX',
                credit_card: 'Cartão',
                boleto: 'Boleto',
            };

            const summaryHtml = `
                <div class="metrics-detail-summary">
                    <div class="detail-item">
                        <span class="detail-item-label">Total</span>
                        <span class="detail-item-value accent">${data.summary.total}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-item-label">Pendentes</span>
                        <span class="detail-item-value">${data.summary.pending}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-item-label">Pagos</span>
                        <span class="detail-item-value">${data.summary.paid}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-item-label">Enviados</span>
                        <span class="detail-item-value">${data.summary.shipped}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-item-label">Entregues</span>
                        <span class="detail-item-value">${data.summary.delivered}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-item-label">Cancelados</span>
                        <span class="detail-item-value">${data.summary.cancelled}</span>
                    </div>
                </div>
            `;

            const filterHtml = `
                <div class="metrics-detail-filters">
                    <label for="metricsOrderStatus">Filtrar por status:</label>
                    <select id="metricsOrderStatus" class="table-filter-select">
                        <option value="">Todos</option>
                        <option value="pending" ${this.currentStatus === 'pending' ? 'selected' : ''}>Pendente</option>
                        <option value="paid" ${this.currentStatus === 'paid' ? 'selected' : ''}>Pago</option>
                        <option value="shipped" ${this.currentStatus === 'shipped' ? 'selected' : ''}>Enviado</option>
                        <option value="delivered" ${this.currentStatus === 'delivered' ? 'selected' : ''}>Entregue</option>
                        <option value="cancelled" ${this.currentStatus === 'cancelled' ? 'selected' : ''}>Cancelado</option>
                    </select>
                </div>
            `;

            if (data.items.length === 0) {
                return summaryHtml + filterHtml + `
                    <div class="table-empty">
                        <i class="fas fa-shopping-bag" style="color: var(--gray-300); font-size: 2rem; display: block; margin-bottom: 0.5rem;"></i>
                        Nenhum pedido encontrado.
                    </div>
                `;
            }

            const tableHtml = `
                <div class="table-wrapper">
                    <table class="data-table metrics-detail-table" data-sortable>
                        <thead>
                            <tr>
                                <th data-sort="id" data-type="number">Pedido</th>
                                <th data-sort="user_name" data-type="string">Cliente</th>
                                <th data-sort="created_at" data-type="date" class="col-center">Data</th>
                                <th data-sort="status" data-type="string" class="col-center">Status</th>
                                <th data-sort="payment_method" data-type="string" class="col-center">Pagamento</th>
                                <th data-sort="total" data-type="number" class="col-money">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.items.map((o) => `
                                <tr data-order-id="${o.id}">
                                    <td data-value="${o.id}"><strong>#${o.id}</strong></td>
                                    <td data-value="${Utils.escapeHtml(o.user_name || '')}">
                                        <div class="metrics-detail-customer-name">${Utils.escapeHtml(o.user_name || '—')}</div>
                                        <div class="metrics-detail-customer-email">${Utils.escapeHtml(o.user_email || '')}</div>
                                    </td>
                                    <td data-value="${o.created_at}" class="col-center">${fmtDate(o.created_at)}</td>
                                    <td data-value="${o.status}" class="col-status">
                                        <span class="badge-status ${o.status}">${STATUS_LABEL[o.status] || o.status}</span>
                                    </td>
                                    <td data-value="${o.payment_method || ''}" class="col-center">${PAYMENT_LABEL[o.payment_method] || o.payment_method || '—'}</td>
                                    <td data-value="${o.total}" class="col-money"><strong>${fmtCur(o.total)}</strong></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;

            return summaryHtml + filterHtml + tableHtml;
        },

        // ==================================================
        // RENDER — Ticket Médio (distribuição + top acima da média)
        // ==================================================
        renderTicket(data) {
            const fmtCur = (v) => Utils.formatPrice(v);
            const fmtDate = (d) => Utils.formatDate(d);
            const s = data.summary;

            const summaryHtml = `
                <div class="metrics-detail-summary">
                    <div class="detail-item">
                        <span class="detail-item-label">Ticket Médio</span>
                        <span class="detail-item-value accent">${fmtCur(s.avg_ticket)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-item-label">Mediana</span>
                        <span class="detail-item-value">${fmtCur(s.median_ticket)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-item-label">Menor pedido</span>
                        <span class="detail-item-value">${fmtCur(s.min_ticket)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-item-label">Maior pedido</span>
                        <span class="detail-item-value">${fmtCur(s.max_ticket)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-item-label">Pedidos</span>
                        <span class="detail-item-value">${s.total_orders}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-item-label">Receita Total</span>
                        <span class="detail-item-value">${fmtCur(s.total_revenue)}</span>
                    </div>
                </div>
            `;

            // ---------- Distribuição (barras) ----------
            const maxCount = Math.max(...data.distribution.map((d) => d.count), 1);

            const distributionHtml = `
                <div class="detail-section">
                    <h3>📊 Distribuição por faixa de valor</h3>
                    <div class="ticket-bars">
                        ${data.distribution.map((d) => {
                            const pct = Math.round((d.count / maxCount) * 100);
                            return `
                                <div class="ticket-bar-row">
                                    <div class="ticket-bar-label">R$ ${d.range}</div>
                                    <div class="ticket-bar-track">
                                        <div class="ticket-bar-fill" style="width: ${pct}%"></div>
                                    </div>
                                    <div class="ticket-bar-value">${d.count} <small>(${Utils.formatPrice(d.revenue)})</small></div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;

            // ---------- Top acima da média ----------
            const topAbove = data.top_above_avg || [];

            if (topAbove.length === 0) {
                return summaryHtml + distributionHtml + `
                    <div class="detail-section">
                        <h3>🏆 Pedidos acima da média</h3>
                        <div class="table-empty">Nenhum pedido acima da média no período.</div>
                    </div>
                `;
            }

            const topHtml = `
                <div class="detail-section">
                    <h3>🏆 Top 5 pedidos acima da média</h3>
                    <div class="table-wrapper">
                        <table class="data-table metrics-detail-table" data-sortable>
                            <thead>
                                <tr>
                                    <th data-sort="id" data-type="number">Pedido</th>
                                    <th data-sort="user_name" data-type="string">Cliente</th>
                                    <th data-sort="created_at" data-type="date" class="col-center">Data</th>
                                    <th data-sort="total" data-type="number" class="col-money">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${topAbove.map((o) => `
                                    <tr data-order-id="${o.id}">
                                        <td data-value="${o.id}"><strong>#${o.id}</strong></td>
                                        <td data-value="${Utils.escapeHtml(o.user_name || '')}">${Utils.escapeHtml(o.user_name || '—')}</td>
                                        <td data-value="${o.created_at}" class="col-center">${fmtDate(o.created_at)}</td>
                                        <td data-value="${o.total}" class="col-money"><strong>${fmtCur(o.total)}</strong></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;

            return summaryHtml + distributionHtml + topHtml;
        },

        // ==================================================
        // VISIBILIDADE DA SETA DE VOLTAR
        // ==================================================
        updateBackVisibility() {
            const { modal, body } = this.ctrl;
            if (!modal || !modal.classList.contains('active')) return;

            const isTop = ModalStack.isTop('metricsDetail');
            const hasParent = ModalStack.size() > 1;
            const backBtn = body?.querySelector('.back-modal');
            if (backBtn) {
                backBtn.classList.toggle('visible', isTop && hasParent);
            }
        },

        // ==================================================
        // BACK — fecha este modal, volta ao anterior
        // ==================================================
        handleBack() {
            ModalStack.back();
            this._deactivate();
        },

        _deactivate() {
            const { modal } = this.ctrl;
            if (!modal) return;
            modal.classList.remove('active');
            document.body.style.overflow = ModalStack.size() > 0 ? 'hidden' : '';
        },

        close() {
            const { modal } = this.ctrl;
            ModalStack.remove('metricsDetail');
            if (modal) modal.classList.remove('active');
            document.body.style.overflow = ModalStack.size() > 0 ? 'hidden' : '';
        },

        // ==================================================
        // HELPER — label amigável do período
        // ==================================================
        labelForPeriod(p) {
            const map = {
                '7d': 'Últimos 7 dias',
                '30d': 'Últimos 30 dias',
                '90d': 'Últimos 90 dias',
                '12m': 'Últimos 12 meses',
            };
            return map[p] || p;
        },

                // ==================================================
        // SORT CLIENT-SIDE — qualquer tabela .metrics-detail-table[data-sortable]
        // ==================================================
        setupClientSort(table) {
            const thead = table.querySelector('thead');
            const tbody = table.querySelector('tbody');
            if (!thead || !tbody) return;

            const ths = thead.querySelectorAll('th[data-sort]');

            ths.forEach((th) => {
                const key = th.dataset.sort;
                const type = th.dataset.type || 'string';
                if (!key) return;

                th.classList.add('sortable');
                if (th.dataset.sortBound === 'true') return;
                th.dataset.sortBound = 'true';

                th.addEventListener('click', () => {
                    // Determina direção: se já ordena por esta coluna, inverte
                    const currentSort = th.dataset.currentSort === 'asc' ? 'asc' : th.dataset.currentSort === 'desc' ? 'desc' : null;
                    const newDir = currentSort === 'asc' ? 'desc' : 'asc';

                    // Limpa estado de todas
                    ths.forEach((other) => {
                        other.classList.remove('sort-asc', 'sort-desc');
                        delete other.dataset.currentSort;
                    });

                    th.classList.add(newDir === 'asc' ? 'sort-asc' : 'sort-desc');
                    th.dataset.currentSort = newDir;

                    // Pega os índices das colunas
                    const headers = Array.from(thead.querySelectorAll('th'));
                    const colIndex = headers.indexOf(th);

                    // Ordena as linhas
                    const rows = Array.from(tbody.querySelectorAll('tr'));

                    rows.sort((a, b) => {
                        const aCell = a.children[colIndex];
                        const bCell = b.children[colIndex];
                        const aRaw = aCell?.dataset.value ?? aCell?.textContent?.trim() ?? '';
                        const bRaw = bCell?.dataset.value ?? bCell?.textContent?.trim() ?? '';

                        let comparison = 0;
                        if (type === 'number') {
                            comparison = (parseFloat(aRaw) || 0) - (parseFloat(bRaw) || 0);
                        } else if (type === 'date') {
                            comparison = new Date(aRaw).getTime() - new Date(bRaw).getTime();
                        } else {
                            comparison = String(aRaw).localeCompare(String(bRaw), 'pt-BR', { sensitivity: 'base' });
                        }

                        return newDir === 'asc' ? comparison : -comparison;
                    });

                    // Reinsere
                    rows.forEach((row) => tbody.appendChild(row));
                });
            });
        },
    };

    // ======================================================
    // PEDIDOS — Página de listagem + gestão
    // ======================================================
    const OrdersPage = {
        // Estado
        filters: {
            q: '',
            status: null,
            from: '',
            to: '',
        },
        sortState: { sort: 'created_at', order: 'desc' },
        currentPage: 1,
        limit: 20,
        stats: null,
        initialized: false,

        // ==================================================
        // INIT
        // ==================================================
        init() {
            this.bindKpiCards();
            this.bindRefresh();
            this.bindTableSort();
            this.bindPaginationDelegation();

            // Só carrega se ainda não inicializou (evita recarregar a cada troca de seção)
            if (!this.initialized) {
                this.initialized = true;
                this.loadAll();
            } else {
                // Refresh leve quando volta pra seção
                this.loadStats();
            }
        },

        // ==================================================
        // CARREGA TUDO — stats + lista
        // ==================================================
        async loadAll() {
            await Promise.all([this.loadStats(), this.loadOrders()]);
        },

        // ==================================================
        // STATS — popula os mini-cards
        // ==================================================
        async loadStats() {
            try {
                const data = await API.get('/orders/admin/stats');
                this.stats = data;

                document.getElementById('ordersKpiTotal').textContent = data.total ?? '—';
                document.getElementById('ordersKpiPending').textContent = data.pending ?? '—';
                document.getElementById('ordersKpiPaid').textContent = data.paid ?? '—';
                document.getElementById('ordersKpiShipped').textContent = data.shipped ?? '—';
                document.getElementById('ordersKpiDelivered').textContent = data.delivered ?? '—';   // ← ADICIONADO
                document.getElementById('ordersKpiCancelled').textContent = data.cancelled ?? '—';
            } catch (error) {
                console.error('Erro ao carregar stats de pedidos:', error);
                Toast.error('Erro ao carregar resumo de pedidos');
            }
        },

        // ==================================================
        // LISTA — carrega a tabela com filtros atuais
        // ==================================================
        async loadOrders() {
            const tbody = document.querySelector('#ordersTable tbody');
            const wrapper = document.querySelector('#ordersTable')?.closest('.table-wrapper');
            const countHint = document.getElementById('ordersCountHint');
            if (!tbody) return;

            TableLoader.start(wrapper);

            try {
                const params = new URLSearchParams({
                    page: this.currentPage,
                    limit: this.limit,
                    sort: this.sortState.sort,
                    order: this.sortState.order,
                });
                if (this.filters.q) params.set('q', this.filters.q);
                if (this.filters.status) params.set('status', this.filters.status);
                if (this.filters.from) params.set('from', this.filters.from);
                if (this.filters.to) params.set('to', this.filters.to);

                const data = await API.get(`/orders/admin/list?${params.toString()}`);
                const orders = data.orders || [];

                if (orders.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="7" class="table-empty">Nenhum pedido encontrado com os filtros atuais.</td></tr>';
                } else {
                    tbody.innerHTML = orders.map((o) => this.buildOrderRow(o)).join('');

                    // Bind dos cliques nas linhas
                    tbody.querySelectorAll('tr[data-order-id]').forEach((row) => {
                        row.addEventListener('click', () => {
                            OrderDetailModal.open(row.dataset.orderId);
                        });
                    });
                }

                // Hint do count
                if (countHint) {
                    countHint.textContent = `${data.pagination.total} pedido${data.pagination.total === 1 ? '' : 's'}`;
                }

                // Paginação
                this.renderPagination(data.pagination);
            } catch (error) {
                console.error('Erro ao carregar pedidos:', error);
                tbody.innerHTML = '<tr><td colspan="7" class="table-empty">Erro ao carregar pedidos.</td></tr>';
                Toast.error('Erro ao carregar pedidos');
            } finally {
                TableLoader.stop(wrapper);
            }
        },

        // ==================================================
        // CONSTRÓI UMA LINHA DA TABELA
        // ==================================================
        buildOrderRow(o) {
            const STATUS_LABEL = {
                pending: 'Pendente',
                paid: 'Pago',
                shipped: 'Enviado',
                delivered: 'Entregue',
                cancelled: 'Cancelado',
            };

            const SHIPPING_LABEL = {
                not_applicable:  { label: '—',                  icon: 'fa-minus',           color: 'gray' },
                awaiting_shipment: { label: 'Aguardando envio', icon: 'fa-box',             color: 'warning' },
                in_transit:      { label: 'Em transporte',      icon: 'fa-truck',           color: 'info' },
                delivered:       { label: 'Entregue',           icon: 'fa-check-circle',    color: 'success' },
                cancelled:       { label: '—',                  icon: 'fa-times-circle',    color: 'danger' },
            };

            const PAYMENT_LABEL = {
                pix: 'PIX',
                credit_card: 'Cartão',
                boleto: 'Boleto',
            };

            const fmtCur = (v) => Utils.formatPrice(v);
            const fmtDate = (d) => Utils.formatDate(d);

            const shipping = SHIPPING_LABEL[o.shipping_status] || SHIPPING_LABEL.not_applicable;

            return `
                <tr data-order-id="${o.id}">
                    <td data-value="${o.id}"><strong>#${o.id}</strong></td>
                    <td data-value="${o.created_at}" class="col-center">${fmtDate(o.created_at)}</td>
                    <td data-value="${Utils.escapeHtml(o.user_name || '')}">
                        <div class="metrics-detail-customer-name">${Utils.escapeHtml(o.user_name || '—')}</div>
                        <div class="metrics-detail-customer-email">${Utils.escapeHtml(o.user_email || '')}</div>
                    </td>
                    <td data-value="${o.items_count}" class="col-center">${o.items_count}</td>
                    <td data-value="${o.status}" class="col-center">
                        <span class="badge-status ${o.status}">${STATUS_LABEL[o.status] || o.status}</span>
                    </td>
                    <td data-value="${o.shipping_status}" class="col-center">
                        <span class="shipping-pill shipping-${shipping.color}">
                            <i class="fas ${shipping.icon}"></i> ${shipping.label}
                        </span>
                    </td>
                    <td data-value="${o.payment_method || ''}" class="col-center">
                        ${PAYMENT_LABEL[o.payment_method] || o.payment_method || '—'}
                    </td>
                    <td data-value="${o.total}" class="col-money">
                        <strong>${fmtCur(o.total)}</strong>
                    </td>
                </tr>
            `;
        },

        // ==================================================
        // PAGINAÇÃO
        // ==================================================
        renderPagination(pagination) {
            const container = document.getElementById('ordersPagination');
            if (!container) return;

            if (!pagination || pagination.pages <= 1) {
                container.innerHTML = '';
                return;
            }

            const { page, pages } = pagination;
            const buttons = [];

            buttons.push(`<button ${page === 1 ? 'disabled' : ''} data-page="${page - 1}">« Anterior</button>`);

            const start = Math.max(1, page - 2);
            const end = Math.min(pages, page + 2);

            if (start > 1) {
                buttons.push(`<button data-page="1">1</button>`);
                if (start > 2) buttons.push('<span style="padding: 0 .5rem; color: var(--gray-400);">...</span>');
            }
            for (let i = start; i <= end; i++) {
                buttons.push(`<button class="${i === page ? 'active' : ''}" data-page="${i}">${i}</button>`);
            }
            if (end < pages) {
                if (end < pages - 1) buttons.push('<span style="padding: 0 .5rem; color: var(--gray-400);">...</span>');
                buttons.push(`<button data-page="${pages}">${pages}</button>`);
            }

            buttons.push(`<button ${page === pages ? 'disabled' : ''} data-page="${page + 1}">Próxima »</button>`);

            container.innerHTML = buttons.join('');
        },

        // ==================================================
        // BINDS
        // ==================================================

        // Mini-cards de resumo (filtram por status)
        bindKpiCards() {
            document.querySelectorAll('.orders-kpi-card[data-order-filter]').forEach((card) => {
                if (card.dataset.bound === 'true') return;
                card.dataset.bound = 'true';

                card.addEventListener('click', () => {
                    const filter = card.dataset.orderFilter;

                    // Atualiza UI
                    document.querySelectorAll('.orders-kpi-card').forEach((c) => c.classList.remove('active'));
                    card.classList.add('active');

                    // Aplica filtro
                    this.filters.status = filter === 'all' ? null : filter;
                    this.currentPage = 1;
                    this.loadOrders();
                });
            });
        },

        // Botão "Atualizar"
        bindRefresh() {
            const btn = document.getElementById('refreshOrders');
            if (!btn || btn.dataset.bound === 'true') return;
            btn.dataset.bound = 'true';

            btn.addEventListener('click', async () => {
                btn.classList.add('loading');
                await this.loadAll();
                btn.classList.remove('loading');
                Toast.info('Pedidos atualizados');
            });
        },

        // Ordenação server-side via clique no header
        bindTableSort() {
            const table = document.getElementById('ordersTable');
            if (!table) return;

            const thead = table.querySelector('thead');
            if (!thead) return;

            const ths = thead.querySelectorAll('th[data-sort]');

            ths.forEach((th) => {
                const key = th.dataset.sort;
                if (!key) return;

                th.classList.add('sortable');
                if (th.dataset.sortBound === 'true') return;
                th.dataset.sortBound = 'true';

                th.addEventListener('click', () => {
                    if (this.sortState.sort === key) {
                        this.sortState.order = this.sortState.order === 'asc' ? 'desc' : 'asc';
                    } else {
                        this.sortState.sort = key;
                        this.sortState.order = 'asc';
                    }

                    // Atualiza visual
                    ths.forEach((other) => {
                        other.classList.remove('sort-asc', 'sort-desc');
                        if (other.dataset.sort === this.sortState.sort) {
                            other.classList.add(this.sortState.order === 'asc' ? 'sort-asc' : 'sort-desc');
                        }
                    });

                    this.currentPage = 1;
                    this.loadOrders();
                });
            });

            // Estado visual inicial
            ths.forEach((th) => {
                if (th.dataset.sort === this.sortState.sort) {
                    th.classList.add(this.sortState.order === 'asc' ? 'sort-asc' : 'sort-desc');
                }
            });
        },

        // Delegação para botões de paginação (recriados a cada render)
        bindPaginationDelegation() {
            const container = document.getElementById('ordersPagination');
            if (!container || container.dataset.bound === 'true') return;
            container.dataset.bound = 'true';

            container.addEventListener('click', (e) => {
                const btn = e.target.closest('button[data-page]');
                if (!btn || btn.disabled) return;

                this.currentPage = parseInt(btn.dataset.page);
                this.loadOrders();
            });
        },
    };

    // ======================================================
    // PEDIDOS — Modal de detalhe / gestão
    // ======================================================
    const OrderDetailModal = {
        ctrl: null,
        currentOrderId: null,

        STATUS_LABEL: {
            pending: 'Pendente',
            paid: 'Pago',
            shipped: 'Enviado',
            delivered: 'Entregue',
            cancelled: 'Cancelado',
        },

        PAYMENT_LABEL: {
            pix: 'PIX',
            credit_card: 'Cartão',
            boleto: 'Boleto',
        },

        init() {
            this.ctrl = {
                modal: document.getElementById('orderDetailModal'),
                body: document.getElementById('orderDetailBody'),
                closeBtn: document.getElementById('closeOrderDetail'),
            };

            const { modal, closeBtn } = this.ctrl;
            if (!modal) return;

            closeBtn?.addEventListener('click', () => this.close());
            modal?.addEventListener('click', (e) => {
                if (e.target === modal) this.close();
            });
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && modal?.classList.contains('active')) this.close();
            });

            document.addEventListener('modalstack:change', () => this.updateBackVisibility());
        },

        // ==================================================
        // ABRE O MODAL
        // ==================================================
        async open(orderId) {
            this.currentOrderId = orderId;

            const { modal } = this.ctrl;

            ModalStack.push('orderDetail', modal);
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            this.updateBackVisibility();

            await this.load();
        },

        // ==================================================
        // LOAD
        // ==================================================
        async load() {
            const { body } = this.ctrl;
            if (!body) return;

            TableLoader.start(body);

            try {
                const data = await API.get(`/orders/admin/${this.currentOrderId}`);
                this.render(data);
            } catch (error) {
                console.error('Erro ao carregar pedido:', error);
                body.innerHTML = '<div class="table-empty">Erro ao carregar pedido</div>';
            } finally {
                TableLoader.stop(body);
            }
        },

        // ==================================================
        // RENDER
        // ==================================================
        render(o) {
            const { body } = this.ctrl;
            const fmtCur = (v) => Utils.formatPrice(v);
            const fmtDate = (d) => Utils.formatDate(d);

            const statusLabel = this.STATUS_LABEL[o.status] || o.status;
            const paymentLabel = this.PAYMENT_LABEL[o.payment_method] || o.payment_method || '—';

            // ---------- Endereço ----------
            const addressLines = [
                [o.shipping_street, o.shipping_number, o.shipping_complement].filter(Boolean).join(', '),
                o.shipping_neighborhood,
                [o.shipping_city, o.shipping_state].filter(Boolean).join(' - '),
                o.shipping_cep ? `CEP: ${o.shipping_cep}` : null,
            ].filter(Boolean);

            // ---------- Itens ----------
            const itemsHtml = (o.items || []).length === 0
                ? '<div class="table-empty">Nenhum item</div>'
                : `<div class="order-detail-items">
                    ${o.items.map((it) => {
                        const img = it.image_url
                            ? `<img src="${Utils.escapeAttr(it.image_url)}" alt="${Utils.escapeAttr(it.name)}">`
                            : '<i class="fas fa-image"></i>';
                        return `
                            <div class="order-detail-item">
                                <div class="order-detail-item-image">${img}</div>
                                <div class="order-detail-item-info">
                                    <div class="order-detail-item-name">${Utils.escapeHtml(it.name)}</div>
                                    <div class="order-detail-item-qty">${it.quantity}x ${fmtCur(it.unit_price)}</div>
                                </div>
                                <div class="order-detail-item-subtotal">${fmtCur(it.subtotal)}</div>
                            </div>
                        `;
                    }).join('')}
                </div>`;

            // ---------- Header ----------
            const headerHtml = `
                <div class="detail-header">
                    <button class="back-modal" aria-label="Voltar" data-action="back">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    <div class="detail-header-icon">
                        <i class="fas fa-receipt"></i>
                    </div>
                    <div class="detail-header-info">
                        <h2>Pedido #${o.id}</h2>
                        <p>${fmtDate(o.created_at)} · ${Utils.escapeHtml(o.user_name || '—')} (${Utils.escapeHtml(o.user_email || '—')})</p>
                    </div>
                </div>
            `;

            // ---------- Barra de status ----------
            const statusBarHtml = `
                <div class="order-detail-status-bar">
                    <span class="label">Status atual:</span>
                    <span class="badge-status ${o.status}">${statusLabel}</span>
                    <span style="margin-left: auto; color: var(--gray-500); font-size: 0.85rem;">
                        Pagamento: <strong>${paymentLabel}</strong>
                    </span>
                </div>
            `;

            // ---------- Itens + resumo ----------
            const itemsSectionHtml = `
                <div class="detail-section">
                    <h3>📦 Itens (${(o.items || []).length})</h3>
                    ${itemsHtml}
                </div>
            `;

            const summaryHtml = `
                <div class="detail-section">
                    <h3>💰 Resumo</h3>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-item-label">Subtotal</span>
                            <span class="detail-item-value">${fmtCur(o.subtotal)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-item-label">Frete</span>
                            <span class="detail-item-value">${parseFloat(o.shipping_cost) === 0 ? 'Grátis' : fmtCur(o.shipping_cost)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-item-label">Desconto</span>
                            <span class="detail-item-value">${fmtCur(o.discount || 0)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-item-label">Total</span>
                            <span class="detail-item-value accent">${fmtCur(o.total)}</span>
                        </div>
                    </div>
                </div>
            `;

            // ---------- Endereço ----------
            const addressHtml = addressLines.length > 0
                ? `
                    <div class="detail-section">
                        <h3>📍 Endereço de entrega</h3>
                        <div class="order-detail-address">
                            <strong>${Utils.escapeHtml(o.user_name || '—')}</strong>
                            ${addressLines.map((l) => `<div>${Utils.escapeHtml(l)}</div>`).join('')}
                        </div>
                    </div>
                `
                : '';

            // ---------- Observações ----------
            const notesHtml = o.notes
                ? `
                    <div class="detail-section">
                        <h3>📝 Observações</h3>
                        <p style="color: var(--gray-700); font-size: 0.9rem; line-height: 1.6;">${Utils.escapeHtml(o.notes)}</p>
                    </div>
                `
                : '';

            // ---------- Ações ----------
            const actionsHtml = this.buildActionsHtml(o);

            // ---------- Render final ----------
            body.innerHTML = headerHtml + statusBarHtml + itemsSectionHtml + summaryHtml + addressHtml + notesHtml + actionsHtml;

            // ---------- Binds ----------
            body.querySelector('[data-action="back"]')?.addEventListener('click', () => this.handleBack());

            this.bindActions(o);

            this.updateBackVisibility();
        },

        // ==================================================
        // BOTÕES DE AÇÃO (status changer + cancelar)
        // ==================================================
        buildActionsHtml(o) {
            // Pedido cancelado ou entregue → não permite mais alterar status via UI
            const isFinal = o.status === 'cancelled' || o.status === 'delivered';

            // Opções de status por estado atual
            const STATUS_TRANSITIONS = {
                pending: [
                    { value: 'paid', label: 'Marcar como Pago' },
                    { value: 'cancelled', label: 'Cancelar' },
                ],
                paid: [
                    { value: 'shipped', label: 'Marcar como Enviado' },
                    { value: 'cancelled', label: 'Cancelar' },
                ],
                shipped: [
                    { value: 'delivered', label: 'Marcar como Entregue' },
                ],
                delivered: [],
                cancelled: [],
            };

            const transitions = STATUS_TRANSITIONS[o.status] || [];

            if (isFinal || transitions.length === 0) {
                return `
                    <div class="order-detail-actions">
                        <h4>Ações</h4>
                        <p style="color: var(--gray-500); font-size: 0.85rem; margin: 0;">
                            ${o.status === 'cancelled' ? 'Este pedido foi cancelado. Nenhuma ação disponível.' : ''}
                            ${o.status === 'delivered' ? 'Este pedido foi entregue. Nenhuma ação disponível.' : ''}
                        </p>
                    </div>
                `;
            }

            const optionsHtml = transitions
                .map((t) => `<option value="${t.value}">${t.label}</option>`)
                .join('');

            // Botão de cancelar aparece destacado só se houver opção de cancelar
            const hasCancelOption = transitions.some((t) => t.value === 'cancelled');

            const cancelBtnHtml = hasCancelOption
                ? `<button type="button" class="order-detail-cancel-btn" id="orderDetailCancelBtn">
                       <i class="fas fa-times"></i> Cancelar pedido
                   </button>`
                : '';

            return `
                <div class="order-detail-actions">
                    <h4>Ações</h4>
                    <div class="order-detail-status-changer">
                        <select id="orderStatusSelect" aria-label="Novo status">
                            ${optionsHtml}
                        </select>
                        <button type="button" id="orderStatusApplyBtn">
                            <i class="fas fa-check"></i> Aplicar
                        </button>
                    </div>
                    ${cancelBtnHtml}
                </div>
            `;
        },

        // ==================================================
        // BIND DAS AÇÕES
        // ==================================================
        bindActions(o) {
            const { body } = this.ctrl;

            const applyBtn = body.querySelector('#orderStatusApplyBtn');
            const statusSelect = body.querySelector('#orderStatusSelect');

            if (applyBtn && statusSelect) {
                applyBtn.addEventListener('click', async () => {
                    const newStatus = statusSelect.value;

                    if (newStatus === 'cancelled') {
                        // Roteia para o handler de cancelamento
                        this.confirmCancel();
                        return;
                    }

                    await this.changeStatus(newStatus);
                });
            }

            const cancelBtn = body.querySelector('#orderDetailCancelBtn');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => this.confirmCancel());
            }
        },

        // ==================================================
        // ALTERAR STATUS
        // ==================================================
        async changeStatus(newStatus) {
            const { body } = this.ctrl;
            const btn = body.querySelector('#orderStatusApplyBtn');
            const originalText = btn?.innerHTML;

            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Aplicando...';
            }

            try {
                await API.patch(`/orders/admin/${this.currentOrderId}/status`, {
                    status: newStatus,
                });

                Toast.success('Status atualizado com sucesso!');

                // Recarrega o modal + a lista da tela
                await this.load();
                if (OrdersPage.initialized) {
                    await OrdersPage.loadAll();
                }
            } catch (error) {
                console.error('Erro ao alterar status:', error);
                Toast.error(error.data?.error || 'Erro ao alterar status');
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = originalText;
                }
            }
        },

        // ==================================================
        // CANCELAR PEDIDO (com confirmação)
        // ==================================================
        confirmCancel() {
            const modal = document.createElement('div');
            modal.className = 'modal active';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 460px;">
                    <button class="close-modal" aria-label="Fechar">&times;</button>
                    <div class="modal-icon" style="color: #dc2626;">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <h2 style="text-transform: uppercase; letter-spacing: 1px; margin-bottom: 0.75rem;">
                        Cancelar pedido #${this.currentOrderId}?
                    </h2>
                    <p style="color: var(--gray-600); margin-bottom: 1.25rem;">
                        Esta ação <strong>não pode ser desfeita</strong>. Os itens voltarão ao estoque e o pagamento (se pago) será marcado como reembolsado.
                    </p>

                    <div class="form-group" style="margin-bottom: 1rem;">
                        <label for="cancelReason" style="display:block; margin-bottom: 0.4rem; font-size: 0.85rem; font-weight: 600; color: var(--gray-700);">
                            Motivo do cancelamento (opcional)
                        </label>
                        <input type="text" id="cancelReason" maxlength="255" placeholder="ex: Cliente solicitou, produto indisponível..."
                            style="width: 100%; padding: 0.7rem 0.9rem; border: 1px solid var(--gray-300); border-radius: 6px; font-family: inherit; font-size: 0.9rem;">
                    </div>

                    <div style="display: flex; gap: 0.75rem; justify-content: flex-end;">
                        <button type="button" class="btn btn-secondary" id="keepOrderBtn">
                            Manter pedido
                        </button>
                        <button type="button" class="btn" id="confirmCancelBtn"
                                style="background: #dc2626; color: white; border-color: #dc2626;">
                            <i class="fas fa-times"></i> Cancelar pedido
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            document.body.style.overflow = 'hidden';

            const close = () => {
                modal.remove();
                // Restaura overflow para o modal anterior (se houver)
                document.body.style.overflow = ModalStack.size() > 0 ? 'hidden' : '';
            };

            modal.querySelector('.close-modal').addEventListener('click', close);
            modal.querySelector('#keepOrderBtn').addEventListener('click', close);
            modal.addEventListener('click', (e) => {
                if (e.target === modal) close();
            });

            modal.querySelector('#confirmCancelBtn').addEventListener('click', async () => {
                const btn = modal.querySelector('#confirmCancelBtn');
                const reasonInput = modal.querySelector('#cancelReason');
                const reason = reasonInput.value.trim();

                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cancelando...';

                try {
                    await API.patch(`/orders/admin/${this.currentOrderId}/status`, {
                        status: 'cancelled',
                        reason: reason || 'Cancelado pelo administrador',
                    });

                    close();
                    Toast.success('Pedido cancelado');
                    await this.load();
                    if (OrdersPage.initialized) {
                        await OrdersPage.loadAll();
                    }
                } catch (error) {
                    console.error('Erro ao cancelar:', error);
                    Toast.error(error.data?.error || 'Erro ao cancelar pedido');
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-times"></i> Cancelar pedido';
                }
            });
        },

        // ==================================================
        // VISIBILIDADE DA SETA DE VOLTAR
        // ==================================================
        updateBackVisibility() {
            const { modal, body } = this.ctrl;
            if (!modal || !modal.classList.contains('active')) return;

            const isTop = ModalStack.isTop('orderDetail');
            const hasParent = ModalStack.size() > 1;
            const backBtn = body?.querySelector('.back-modal');
            if (backBtn) {
                backBtn.classList.toggle('visible', isTop && hasParent);
            }
        },

        // ==================================================
        // BACK
        // ==================================================
        handleBack() {
            ModalStack.back();
            this._deactivate();
        },

        _deactivate() {
            const { modal } = this.ctrl;
            if (!modal) return;
            modal.classList.remove('active');
            document.body.style.overflow = ModalStack.size() > 0 ? 'hidden' : '';
        },

        close() {
            const { modal } = this.ctrl;
            ModalStack.remove('orderDetail');
            if (modal) modal.classList.remove('active');
            document.body.style.overflow = ModalStack.size() > 0 ? 'hidden' : '';
        },
    };

    // ======================================================
    // INICIALIZAÇÃO
    // ======================================================
    document.addEventListener('DOMContentLoaded', async () => {
        if (!AdminAuth.requireAuth()) return;

        document.getElementById('adminLogoutBtn')?.addEventListener('click', () => {
            if (confirm('Deseja realmente sair?')) {
                AdminAuth.logout();
            }
        });

Toast.init();
Navigation.init();
DetailModal.init();
ProductPicker.init();
DashboardDetailModal.init();
TopSellersModal.init();
MovementsModal.init();
MetricsPage.init();
MetricsDetailModal.init();
OrdersPage.init();
OrderDetailModal.init();

        await ProductForm.init();
        await MovementForm.init();

        // Sortable nas tabelas fixas
        const recentProductsTable = document.getElementById('recentProductsTable');
        if (recentProductsTable) {
            SortableTable.apply(recentProductsTable, ProductForm.sortState, () => {
                ProductForm.loadRecentProducts();
            });
        }

        const recentMovementsTable = document.getElementById('recentMovementsTable');
        if (recentMovementsTable) {
            SortableTable.apply(recentMovementsTable, MovementForm.sortState, () => {
                MovementForm.loadRecentMovements();
            });
        }

        EditProduct.onEnter();

        document.getElementById('refreshDashboard')?.addEventListener('click', async (e) => {
            const btn = e.currentTarget;
            btn.classList.add('loading');
            await Dashboard.loadAll();
            setTimeout(() => btn.classList.remove('loading'), 500);
            Toast.info('Dashboard atualizado');
        });

        Dashboard.loadAll();

        const flash = sessionStorage.getItem('luxury_admin_flash');
        if (flash) {
            Toast.warning(flash);
            sessionStorage.removeItem('luxury_admin_flash');
        }

        console.log('✅ Admin - Sistema carregado com sucesso!');
    });
})();