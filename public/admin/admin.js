// ======================================================
// ADMIN.JS - Painel administrativo (Parte 1/2)
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
            } catch { /* ignora */ }
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

        formatDateShort(dateString) {
            if (!dateString) return '—';
            const date = new Date(dateString);
            return date.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
            });
        },

        toInputDate(dateString) {
            if (!dateString) return '';
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '';
            return date.toISOString().split('T')[0];
        },

        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text || '';
            return div.innerHTML;
        },

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

            ths.forEach((th) => {
                th.classList.remove('sort-asc', 'sort-desc');
                if (th.dataset.sort === state.sort) {
                    th.classList.add(state.order === 'asc' ? 'sort-asc' : 'sort-desc');
                }
            });
        },
    };

    // ======================================================
    // TABLE LOADER
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
    // FILTROS COLAPSÁVEIS
    // ======================================================
    const FilterBar = {
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

        updateBackVisibility() {
            const { modal } = this.ctrl;
            if (!modal || !modal.classList.contains('active')) return;

            const isTop = ModalStack.isTop('detail');
            const hasParent = ModalStack.size() > 1;
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

                body.querySelector('[data-action="back"]')?.addEventListener('click', () => {
                    this.handleBack();
                });

                this.updateBackVisibility();
            }, 250);
        },

        handleBack() {
            ModalStack.back();
            this._deactivate();
        },
    };

    // ======================================================
    // NAVEGAÇÃO
    // ======================================================
    const Navigation = {
        SECTION_SLUGS: {
            'section-dashboard': 'inicio',
            'section-orders': 'pedidos',
            'section-coupons': 'cupons',
            'section-metrics': 'metricas',
            'section-register-product': 'registrar-produto',
            'section-register-movement': 'registrar-movimentacao',
            'section-edit-product': 'alterar-produto',
        },

        SLUG_SECTIONS: null,

        init() {
            this.SLUG_SECTIONS = {};
            Object.entries(this.SECTION_SLUGS).forEach(([section, slug]) => {
                this.SLUG_SECTIONS[slug] = section;
            });

            document.querySelectorAll('.nav-item[data-target], .nav-subitem[data-target]').forEach((btn) => {
                if (btn.dataset.navBound === 'true') return;
                btn.dataset.navBound = 'true';

                btn.addEventListener('click', () => {
                    const targetId = btn.dataset.target;
                    if (targetId) this.goTo(targetId, btn);
                });
            });

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

            document.querySelectorAll('.nav-item[data-target], .nav-subitem[data-target]').forEach((btn) => {
                if (btn.dataset.closeBound === 'true') return;
                btn.dataset.closeBound = 'true';

                btn.addEventListener('click', () => {
                    if (window.innerWidth <= 768) {
                        closeSidebar();
                    }
                });
            });

            this.restoreFromHash();

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

        currentSlug() {
            const hash = window.location.hash || '';
            return hash.replace(/^#\/?/, '');
        },

        restoreFromHash() {
            const slug = this.currentSlug();
            const sectionId = this.SLUG_SECTIONS[slug];

            if (sectionId) {
                this.goTo(sectionId, null, { updateHash: false });
            } else {
                this.setHash('section-dashboard', true);
            }
        },

        setHash(sectionId, replace = false) {
            const slug = this.SECTION_SLUGS[sectionId];
            if (!slug) return;

            const newHash = `#/${slug}`;
            if (window.location.hash === newHash) return;

            if (replace) {
                window.history.replaceState(null, '', newHash);
            } else {
                window.location.hash = newHash;
            }
        },

        goTo(sectionId, btnElement, options = {}) {
            const { updateHash = true } = options;

            document.querySelectorAll('.section').forEach((s) => s.classList.remove('active'));
            const target = document.getElementById(sectionId);
            if (target) target.classList.add('active');

            document.querySelectorAll('.nav-item, .nav-subitem').forEach((b) => b.classList.remove('active'));
            let activeBtn = btnElement;

            if (!activeBtn) {
                activeBtn = document.querySelector(`.nav-item[data-target="${sectionId}"], .nav-subitem[data-target="${sectionId}"]`);
            }
            if (activeBtn) activeBtn.classList.add('active');

            if (activeBtn && activeBtn.classList.contains('nav-subitem')) {
                const group = activeBtn.closest('.nav-group');
                if (group) {
                    group.classList.add('open');
                    const parentBtn = group.querySelector('.nav-item-parent');
                    if (parentBtn) parentBtn.setAttribute('aria-expanded', 'true');
                }
            }

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
                case 'section-coupons': CouponsPage.init(); break;
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
    // CUPONS
    // ======================================================
    const CouponsPage = {
        filters: {
            q: '',
            status: 'all',
            sort: 'created_at',
        },
        initialized: false,

        init() {
            this.bindFilters();
            this.bindNewCoupon();

            if (!this.initialized) {
                this.initialized = true;
                this.load();
            } else {
                this.load();
            }
        },

        bindFilters() {
            const searchInput = document.getElementById('couponsSearch');
            const statusSelect = document.getElementById('couponsStatusFilter');
            const sortSelect = document.getElementById('couponsSort');
            const clearBtn = document.getElementById('clearCouponsFilters');
            const refreshBtn = document.getElementById('refreshCoupons');

            if (searchInput && !searchInput.dataset.bound) {
                searchInput.dataset.bound = 'true';
                let debounceTimer;

                searchInput.addEventListener('input', (e) => {
                    clearTimeout(debounceTimer);
                    debounceTimer = setTimeout(() => {
                        this.filters.q = e.target.value.trim();
                        this.load();
                    }, 400);
                });

                searchInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        clearTimeout(debounceTimer);
                        this.filters.q = e.target.value.trim();
                        this.load();
                    }
                });
            }

            if (statusSelect && !statusSelect.dataset.bound) {
                statusSelect.dataset.bound = 'true';
                statusSelect.addEventListener('change', (e) => {
                    this.filters.status = e.target.value;
                    this.load();
                });
            }

            if (sortSelect && !sortSelect.dataset.bound) {
                sortSelect.dataset.bound = 'true';
                sortSelect.addEventListener('change', (e) => {
                    this.filters.sort = e.target.value;
                    this.load();
                });
            }

            if (clearBtn && !clearBtn.dataset.bound) {
                clearBtn.dataset.bound = 'true';
                clearBtn.addEventListener('click', () => {
                    this.filters = { q: '', status: 'all', sort: 'created_at' };
                    if (searchInput) searchInput.value = '';
                    if (statusSelect) statusSelect.value = 'all';
                    if (sortSelect) sortSelect.value = 'created_at';
                    this.load();
                });
            }

            if (refreshBtn && !refreshBtn.dataset.bound) {
                refreshBtn.dataset.bound = 'true';
                refreshBtn.addEventListener('click', async () => {
                    refreshBtn.classList.add('loading');
                    await this.load();
                    refreshBtn.classList.remove('loading');
                    Toast.info('Cupons atualizados');
                });
            }
        },

        bindNewCoupon() {
            const btn = document.getElementById('btnNewCoupon');
            if (btn && !btn.dataset.bound) {
                btn.dataset.bound = 'true';
                btn.addEventListener('click', () => {
                    CouponModal.openNew();
                });
            }
        },

        async load() {
            const container = document.getElementById('couponsList');
            const countHint = document.getElementById('couponsCountHint');
            if (!container) return;

            container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i><span>Carregando...</span></div>';

            try {
                const params = new URLSearchParams({
                    q: this.filters.q || '',
                    status: this.filters.status || 'all',
                    sort: this.filters.sort || 'created_at',
                    order: 'desc',
                });

                const promotions = await API.get(`/promotions/admin/list?${params.toString()}`);
                const list = promotions || [];

                if (countHint) {
                    countHint.textContent = `${list.length} ${list.length === 1 ? 'cupom' : 'cupons'}`;
                }

                if (list.length === 0) {
                    container.innerHTML = `
                        <div class="coupons-empty">
                            <i class="fas fa-ticket-alt"></i>
                            <h3>Nenhum cupom encontrado</h3>
                            <p>Crie seu primeiro cupom clicando em "Novo Cupom".</p>
                        </div>
                    `;
                    return;
                }

                container.innerHTML = list.map((p) => this.buildCouponItem(p)).join('');

                container.querySelectorAll('[data-coupon-action]').forEach((btn) => {
                    btn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const action = btn.dataset.couponAction;
                        const id = btn.dataset.couponId;

                        if (action === 'edit') this.handleEdit(id);
                        else if (action === 'toggle') this.handleToggle(id);
                        else if (action === 'reset') this.handleReset(id);
                        else if (action === 'usages') this.handleUsages(id);
                        else if (action === 'delete') this.handleDelete(id);
                    });
                });
            } catch (error) {
                console.error('Erro ao carregar cupons:', error);
                container.innerHTML = '<div class="table-empty">Erro ao carregar cupons.</div>';
            }
        },

        computeStatus(p) {
            if (p.is_active === false) return 'inactive';
            const now = new Date();
            if (new Date(p.end_date) < now) return 'expired';
            if (new Date(p.start_date) > now) return 'scheduled';
            return 'active';
        },

        buildCouponItem(p) {
            const status = this.computeStatus(p);

            const STATUS_LABEL = {
                active: 'Ativo',
                inactive: 'Inativo',
                expired: 'Expirado',
                scheduled: 'Agendado',
            };

            let discountText = '';
            if (p.discount_type === 'percentage') {
                discountText = `${p.discount_value}% OFF`;
            } else if (p.discount_type === 'fixed') {
                discountText = `${Utils.formatPrice(p.discount_value)} OFF`;
            } else {
                discountText = 'Leve mais, pague menos';
            }

            const chips = [];
            chips.push(`<span class="coupon-meta-chip"><i class="fas fa-tag"></i> ${discountText}</span>`);

            if (p.min_purchase) {
                chips.push(`<span class="coupon-meta-chip"><i class="fas fa-shopping-cart"></i> Mín. ${Utils.formatPrice(p.min_purchase)}</span>`);
            }

            if (p.max_discount) {
                chips.push(`<span class="coupon-meta-chip"><i class="fas fa-arrow-down"></i> Máx. ${Utils.formatPrice(p.max_discount)}</span>`);
            }

            if (p.usage_limit) {
                chips.push(`<span class="coupon-meta-chip usage"><i class="fas fa-chart-bar"></i> ${p.usage_count || 0}/${p.usage_limit} usos</span>`);
            } else {
                chips.push(`<span class="coupon-meta-chip usage"><i class="fas fa-chart-bar"></i> ${p.usage_count || 0} usos</span>`);
            }

            if (p.unique_users_used > 0) {
                chips.push(`<span class="coupon-meta-chip"><i class="fas fa-users"></i> ${p.unique_users_used} usuário(s)</span>`);
            }

            if (p.restricted_category_name) {
                chips.push(`<span class="coupon-meta-chip category"><i class="fas fa-layer-group"></i> ${Utils.escapeHtml(p.restricted_category_name)}</span>`);
            } else if (p.applies_to_all) {
                chips.push(`<span class="coupon-meta-chip"><i class="fas fa-globe"></i> Todos os produtos</span>`);
            }

            if (p.is_first_purchase_only) {
                chips.push(`<span class="coupon-meta-chip" style="background: #fef3c7; color: #b45309;"><i class="fas fa-star"></i> 1ª Compra</span>`);
            }

            chips.push(`<span class="coupon-meta-chip"><i class="fas fa-calendar"></i> Até ${Utils.formatDateShort(p.end_date)}</span>`);

            return `
                <div class="coupon-item">
                    <div class="coupon-item-left">
                        <div class="coupon-code-display">
                            <i class="fas fa-ticket-alt"></i>
                            ${Utils.escapeHtml(p.code || '—')}
                        </div>
                        <span class="coupon-badge ${status}">${STATUS_LABEL[status]}</span>
                    </div>

                    <div class="coupon-item-center">
                        <h4 class="coupon-title">${Utils.escapeHtml(p.name)}</h4>
                        ${p.description ? `<p class="coupon-description">${Utils.escapeHtml(p.description)}</p>` : ''}
                        <div class="coupon-meta">${chips.join('')}</div>
                    </div>

                    <div class="coupon-item-right">
                        <button class="coupon-action-btn coupon-action-btn--edit"
                                data-coupon-action="edit" data-coupon-id="${p.id}"
                                title="Editar">
                            <i class="fas fa-edit"></i>
                            <span class="btn-label">Editar</span>
                        </button>
                        <button class="coupon-action-btn coupon-action-btn--toggle"
                                data-coupon-action="toggle" data-coupon-id="${p.id}"
                                title="${p.is_active ? 'Desativar' : 'Ativar'}">
                            <i class="fas ${p.is_active ? 'fa-toggle-on' : 'fa-toggle-off'}"></i>
                            <span class="btn-label">${p.is_active ? 'Desativar' : 'Ativar'}</span>
                        </button>
                        <button class="coupon-action-btn coupon-action-btn--usage"
                                data-coupon-action="usages" data-coupon-id="${p.id}"
                                title="Ver usos">
                            <i class="fas fa-users"></i>
                            <span class="btn-label">Usos</span>
                        </button>
                        <button class="coupon-action-btn coupon-action-btn--reset"
                                data-coupon-action="reset" data-coupon-id="${p.id}"
                                title="Resetar contador de uso">
                            <i class="fas fa-redo"></i>
                            <span class="btn-label">Reset</span>
                        </button>
                        <button class="coupon-action-btn coupon-action-btn--delete"
                                data-coupon-action="delete" data-coupon-id="${p.id}"
                                title="Deletar">
                            <i class="fas fa-trash-alt"></i>
                            <span class="btn-label">Deletar</span>
                        </button>
                    </div>
                </div>
            `;
        },

        async handleEdit(id) {
            try {
                const promotion = await API.get(`/promotions/${id}`);
                CouponModal.openEdit(promotion);
            } catch (error) {
                Toast.error('Erro ao carregar cupom');
            }
        },

        async handleToggle(id) {
            try {
                await API.patch(`/promotions/admin/${id}/toggle`, {});
                Toast.success('Status alterado');
                await this.load();
            } catch (error) {
                Toast.error(error.data?.error || 'Erro ao alterar status');
            }
        },

        async handleReset(id) {
            if (!confirm('Resetar o contador de uso deste cupom?\n\nO histórico de quem usou será mantido, mas o contador voltará a zero para permitir novos usos.')) {
                return;
            }

            try {
                const result = await API.post(`/promotions/admin/${id}/reset`, {});
                
                Toast.success(
                    `Contador zerado! ${result.history_kept} registro(s) de histórico mantidos.`
                );
                await this.load();
            } catch (error) {
                Toast.error(error.data?.error || 'Erro ao resetar contador');
            }
        },

        async handleUsages(id) {
            CouponUsagesModal.open(id);
        },

        async handleDelete(id) {
            if (!confirm('Deletar este cupom permanentemente?\n\nEsta ação não pode ser desfeita. Se quiser apenas desativar, use o botão "Desativar".')) {
                return;
            }

            try {
                await API.delete(`/promotions/${id}`);
                Toast.success('Cupom deletado');
                await this.load();
            } catch (error) {
                Toast.error(error.data?.error || 'Erro ao deletar');
            }
        },
    };

    // ======================================================
    // CUPOM — MODAL (criar/editar)
    // ======================================================
    const CouponModal = {
        ctrl: null,
        isNew: true,
        currentId: null,
        categories: [],
        categoriesLoaded: false,

        init() {
            this.ctrl = {
                modal: document.getElementById('couponModal'),
                body: document.getElementById('couponModalBody'),
                closeBtn: document.getElementById('closeCouponModal'),
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
        },

        async loadCategories() {
            if (this.categoriesLoaded) return;
            try {
                const tree = await API.get('/categories/tree-full', { useCache: true });
                this.categories = this.flattenCategories(tree);
                this.categoriesLoaded = true;
            } catch (error) {
                console.error('Erro ao carregar categorias:', error);
                this.categories = [];
            }
        },

        flattenCategories(nodes, level = 0) {
            const result = [];
            const walk = (items, lvl) => {
                items.forEach((c) => {
                    result.push({ ...c, level: lvl });
                    if (c.children && c.children.length > 0) {
                        walk(c.children, lvl + 1);
                    }
                });
            };
            walk(nodes, 0);
            return result;
        },

        async openNew() {
            this.isNew = true;
            this.currentId = null;

            await this.loadCategories();
            this.renderForm(null);
            this.open();
        },

        async openEdit(promotion) {
            this.isNew = false;
            this.currentId = promotion.id;

            await this.loadCategories();
            this.renderForm(promotion);
            this.open();
        },

        open() {
            const { modal } = this.ctrl;
            if (!modal) return;

            ModalStack.push('coupon', modal);
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        },

        close() {
            const { modal } = this.ctrl;
            if (!modal) return;

            ModalStack.remove('coupon');
            modal.classList.remove('active');
            document.body.style.overflow = ModalStack.size() > 0 ? 'hidden' : '';
        },

        renderForm(promo) {
            const { body } = this.ctrl;
            const isEdit = !!promo;

            const p = promo || {
                name: '',
                description: '',
                code: '',
                discount_type: 'percentage',
                discount_value: '',
                min_purchase: '',
                max_discount: '',
                usage_limit: '',
                start_date: new Date().toISOString(),
                end_date: '',
                is_active: true,
                applies_to_all: true,
                restricted_category_id: null,
                is_first_purchase_only: false,
            };

            const categoryOptions = this.categories
                .map((c) => {
                    const indent = '— '.repeat(c.level);
                    const selected = p.restricted_category_id === c.id ? 'selected' : '';
                    return `<option value="${c.id}" ${selected}>${indent}${Utils.escapeHtml(c.name)}</option>`;
                })
                .join('');

            body.innerHTML = `
                <div class="detail-header" style="margin-bottom: 1.25rem;">
                    <div class="detail-header-icon"><i class="fas fa-ticket-alt"></i></div>
                    <div class="detail-header-info">
                        <h2>${isEdit ? 'Editar cupom' : 'Novo cupom'}</h2>
                        <p>${isEdit ? `Editando: ${Utils.escapeHtml(p.code || '')}` : 'Preencha os dados do novo cupom'}</p>
                    </div>
                </div>

                <form class="coupon-form" id="couponForm">
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="couponCode">Código <span class="required">*</span></label>
                            <input type="text" id="couponCode" name="code" required maxlength="50"
                                   placeholder="ESPORTE20" value="${Utils.escapeAttr(p.code || '')}"
                                   style="text-transform: uppercase;">
                            <small class="form-hint">Será convertido para maiúsculas automaticamente</small>
                        </div>

                        <div class="form-group">
                            <label for="couponName">Nome <span class="required">*</span></label>
                            <input type="text" id="couponName" name="name" required maxlength="100"
                                   placeholder="20% OFF em artigos esportivos" value="${Utils.escapeAttr(p.name || '')}">
                        </div>

                        <div class="form-group form-group-full">
                            <label for="couponDescription">Descrição</label>
                            <input type="text" id="couponDescription" name="description" maxlength="255"
                                   placeholder="Cupom exclusivo para artigos esportivos" value="${Utils.escapeAttr(p.description || '')}">
                        </div>

                        <div class="form-group">
                            <label for="couponType">Tipo de desconto <span class="required">*</span></label>
                            <select id="couponType" name="discount_type" required>
                                <option value="percentage" ${p.discount_type === 'percentage' ? 'selected' : ''}>% Percentual</option>
                                <option value="fixed" ${p.discount_type === 'fixed' ? 'selected' : ''}>R$ Valor fixo</option>
                                <option value="buy_x_get_y" disabled>Compre X leve Y (em breve)</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label for="couponValue">Valor do desconto <span class="required">*</span></label>
                            <input type="number" id="couponValue" name="discount_value" required step="0.01" min="0"
                                   placeholder="20" value="${p.discount_value || ''}">
                            <small class="form-hint">Percentual (ex: 20) ou valor em R$ (ex: 25.00)</small>
                        </div>

                        <div class="form-group">
                            <label for="couponMinPurchase">Compra mínima (R$)</label>
                            <input type="number" id="couponMinPurchase" name="min_purchase" step="0.01" min="0"
                                   placeholder="0,00" value="${p.min_purchase || ''}">
                            <small class="form-hint">Deixe vazio para não ter mínimo</small>
                        </div>

                        <div class="form-group">
                            <label for="couponMaxDiscount">Desconto máximo (R$)</label>
                            <input type="number" id="couponMaxDiscount" name="max_discount" step="0.01" min="0"
                                   placeholder="0,00" value="${p.max_discount || ''}">
                            <small class="form-hint">Teto do desconto (útil para %)</small>
                        </div>

                        <div class="form-group">
                            <label for="couponUsageLimit">Limite total de usos</label>
                            <input type="number" id="couponUsageLimit" name="usage_limit" min="1" step="1"
                                   placeholder="1000" value="${p.usage_limit || ''}">
                            <small class="form-hint">Quantas vezes o cupom pode ser usado no total</small>
                        </div>

                        <div class="form-group">
                            <label for="couponStartDate">Válido de <span class="required">*</span></label>
                            <input type="date" id="couponStartDate" name="start_date" required
                                   value="${Utils.toInputDate(p.start_date)}">
                        </div>

                        <div class="form-group">
                            <label for="couponEndDate">Válido até <span class="required">*</span></label>
                            <input type="date" id="couponEndDate" name="end_date" required
                                   value="${Utils.toInputDate(p.end_date)}">
                        </div>

                        <div class="form-group form-group-full">
                            <div class="coupon-toggle-row">
                                <div class="coupon-toggle-label">
                                    <strong>Cupom ativo</strong>
                                    <span>Se desativado, não pode ser aplicado no checkout</span>
                                </div>
                                <label class="coupon-toggle-switch">
                                    <input type="checkbox" id="couponActive" name="is_active" ${p.is_active ? 'checked' : ''}>
                                    <span class="coupon-toggle-slider"></span>
                                </label>
                            </div>
                        </div>

                        <div class="form-group form-group-full">
                            <div class="coupon-toggle-row">
                                <div class="coupon-toggle-label">
                                    <strong>Aplica a todos os produtos</strong>
                                    <span>Se desativado, restringe o cupom a uma categoria</span>
                                </div>
                                <label class="coupon-toggle-switch">
                                    <input type="checkbox" id="couponAppliesAll" name="applies_to_all" ${p.applies_to_all ? 'checked' : ''}>
                                    <span class="coupon-toggle-slider"></span>
                                </label>
                            </div>
                        </div>

                        <div class="form-group form-group-full coupon-category-field ${p.applies_to_all ? 'hidden' : ''}" id="couponCategoryField">
                            <label for="couponCategory">Categoria restrita <span class="required">*</span></label>
                            <select id="couponCategory" name="restricted_category_id">
                                <option value="">Selecione uma categoria...</option>
                                ${categoryOptions}
                            </select>
                            <small class="form-hint">O cupom só será aplicável a produtos desta categoria</small>
                        </div>

                        <div class="form-group form-group-full">
                            <div class="coupon-toggle-row">
                                <div class="coupon-toggle-label">
                                    <strong>Apenas primeira compra</strong>
                                    <span>Se ativado, o cupom só funciona para clientes que nunca compraram</span>
                                </div>
                                <label class="coupon-toggle-switch">
                                    <input type="checkbox" id="couponFirstPurchase" name="is_first_purchase_only" ${p.is_first_purchase_only ? 'checked' : ''}>
                                    <span class="coupon-toggle-slider"></span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div class="form-actions" style="margin-top: 1.5rem;">
                        <button type="button" class="btn btn-secondary" id="cancelCouponBtn">
                            <i class="fas fa-times"></i> Cancelar
                        </button>
                        <button type="submit" class="btn btn-primary" id="saveCouponBtn">
                            <i class="fas fa-check"></i> ${isEdit ? 'Salvar alterações' : 'Criar cupom'}
                        </button>
                    </div>
                </form>
            `;

            const appliesAllCb = body.querySelector('#couponAppliesAll');
            const categoryField = body.querySelector('#couponCategoryField');
            appliesAllCb?.addEventListener('change', () => {
                categoryField?.classList.toggle('hidden', appliesAllCb.checked);
            });

            const codeInput = body.querySelector('#couponCode');
            codeInput?.addEventListener('input', (e) => {
                const start = e.target.selectionStart;
                e.target.value = e.target.value.toUpperCase();
                e.target.setSelectionRange(start, start);
            });

            body.querySelector('#cancelCouponBtn')?.addEventListener('click', () => this.close());

            body.querySelector('#couponForm')?.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSubmit();
            });
        },

        async handleSubmit() {
            const { body } = this.ctrl;
            const form = body.querySelector('#couponForm');
            if (!form) return;

            const btn = body.querySelector('#saveCouponBtn');
            const originalHtml = btn.innerHTML;

            const formData = new FormData(form);

            const data = {
                code: (formData.get('code') || '').toString().trim().toUpperCase(),
                name: (formData.get('name') || '').toString().trim(),
                description: formData.get('description')?.toString().trim() || null,
                discount_type: formData.get('discount_type'),
                discount_value: parseFloat(formData.get('discount_value')),
                min_purchase: formData.get('min_purchase') ? parseFloat(formData.get('min_purchase')) : null,
                max_discount: formData.get('max_discount') ? parseFloat(formData.get('max_discount')) : null,
                usage_limit: formData.get('usage_limit') ? parseInt(formData.get('usage_limit')) : null,
                start_date: formData.get('start_date'),
                end_date: formData.get('end_date'),
                is_active: formData.get('is_active') === 'on',
                applies_to_all: formData.get('applies_to_all') === 'on',
                restricted_category_id: formData.get('applies_to_all') === 'on'
                    ? null
                    : (formData.get('restricted_category_id') ? parseInt(formData.get('restricted_category_id')) : null),
                is_first_purchase_only: formData.get('is_first_purchase_only') === 'on',
            };

            if (!data.code || data.code.length < 2) {
                Toast.error('Código deve ter ao menos 2 caracteres');
                return;
            }
            if (!data.name) {
                Toast.error('Nome é obrigatório');
                return;
            }
            if (isNaN(data.discount_value) || data.discount_value <= 0) {
                Toast.error('Valor do desconto inválido');
                return;
            }
            if (!data.start_date || !data.end_date) {
                Toast.error('Datas de início e fim são obrigatórias');
                return;
            }
            if (new Date(data.start_date) >= new Date(data.end_date)) {
                Toast.error('Data de início deve ser anterior à data de fim');
                return;
            }
            if (!data.applies_to_all && !data.restricted_category_id) {
                Toast.error('Selecione a categoria restrita');
                return;
            }

            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';

            try {
                if (this.isNew) {
                    await API.post('/promotions', data);
                    Toast.success('Cupom criado com sucesso!');
                } else {
                    await API.put(`/promotions/${this.currentId}`, data);
                    Toast.success('Cupom atualizado com sucesso!');
                }

                this.close();
                await CouponsPage.load();
            } catch (error) {
                console.error('Erro ao salvar cupom:', error);
                Toast.error(error.data?.error || 'Erro ao salvar cupom');
                btn.disabled = false;
                btn.innerHTML = originalHtml;
            }
        },
    };

    // ======================================================
    // CUPOM — MODAL DE USOS (HISTÓRICO COMPLETO)
    // ======================================================
    const CouponUsagesModal = {
        ctrl: null,

        init() {
            this.ctrl = {
                modal: document.getElementById('couponUsagesModal'),
                body: document.getElementById('couponUsagesBody'),
                closeBtn: document.getElementById('closeCouponUsages'),
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
        },

        async open(promotionId) {
            const { modal, body } = this.ctrl;
            if (!modal || !body) return;

            ModalStack.push('couponUsages', modal);
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';

            body.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i><span>Carregando...</span></div>';

            try {
                const [promo, usagesData] = await Promise.all([
                    API.get(`/promotions/${promotionId}`),
                    API.get(`/promotions/admin/${promotionId}/usages`),
                ]);

                this.render(promo, usagesData.usages || []);
            } catch (error) {
                console.error('Erro ao carregar usos:', error);
                body.innerHTML = '<div class="table-empty">Erro ao carregar usos</div>';
            }
        },

        render(promo, usages) {
            const { body } = this.ctrl;

            const totalUsages = usages.length;
            const uniqueUsers = new Set(usages.map(u => u.user_id)).size;

            const headerHtml = `
                <div class="detail-header">
                    <div class="detail-header-icon" style="background: var(--info-bg); color: var(--info);">
                        <i class="fas fa-users"></i>
                    </div>
                    <div class="detail-header-info">
                        <h2>Histórico de Usos</h2>
                        <p>${Utils.escapeHtml(promo.code)} · ${Utils.escapeHtml(promo.name)}</p>
                    </div>
                </div>

                <div class="coupon-usages-summary">
                    <div class="detail-item">
                        <span class="detail-item-label">Total de Usos</span>
                        <span class="detail-item-value accent">${totalUsages}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-item-label">Usuários Únicos</span>
                        <span class="detail-item-value">${uniqueUsers}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-item-label">Contador Atual (Teto)</span>
                        <span class="detail-item-value">
                            ${promo.usage_count || 0} / ${promo.usage_limit || '∞'}
                        </span>
                    </div>
                </div>
            `;

            if (usages.length === 0) {
                body.innerHTML = headerHtml + `
                    <div class="table-empty">
                        <i class="fas fa-inbox" style="color: var(--gray-300); font-size: 2rem; display: block; margin-bottom: 0.5rem;"></i>
                        Nenhum uso registrado para este cupom.
                    </div>
                `;
                return;
            }

            const listHtml = `
                <div class="table-wrapper">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Usuário</th>
                                <th>E-mail</th>
                                <th class="col-center">Pedido</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${usages.map((u) => `
                                <tr>
                                    <td>${Utils.formatDate(u.used_at)}</td>
                                    <td>${Utils.escapeHtml(u.full_name || '—')}</td>
                                    <td>${Utils.escapeHtml(u.email || '—')}</td>
                                    <td class="col-center">
                                        ${u.order_id 
                                            ? `<a href="#/pedidos" onclick="event.preventDefault(); document.querySelector('[data-target=section-orders]').click();">#${u.order_id}</a>` 
                                            : '—'}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;

            body.innerHTML = headerHtml + listHtml;
        },

        close() {
            const { modal } = this.ctrl;
            if (!modal) return;

            ModalStack.remove('couponUsages');
            modal.classList.remove('active');
            document.body.style.overflow = ModalStack.size() > 0 ? 'hidden' : '';
        },
    };

        // ======================================================
    // PEDIDOS — Página de listagem + gestão
    // ======================================================
    const OrdersPage = {
        filters: { q: '', status: null, from: '', to: '' },
        sortState: { sort: 'created_at', order: 'desc' },
        currentPage: 1,
        limit: 20,
        stats: null,
        initialized: false,

        init() {
            this.bindKpiCards();
            this.bindRefresh();
            this.bindTableSort();
            this.bindPaginationDelegation();

            if (!this.initialized) {
                this.initialized = true;
                this.loadAll();
            } else {
                this.loadStats();
            }
        },

        async loadAll() {
            await Promise.all([this.loadStats(), this.loadOrders()]);
        },

        async loadStats() {
            try {
                const data = await API.get('/orders/admin/stats');
                this.stats = data;

                document.getElementById('ordersKpiTotal').textContent = data.total ?? '—';
                document.getElementById('ordersKpiPending').textContent = data.pending ?? '—';
                document.getElementById('ordersKpiPaid').textContent = data.paid ?? '—';
                document.getElementById('ordersKpiShipped').textContent = data.shipped ?? '—';
                document.getElementById('ordersKpiDelivered').textContent = data.delivered ?? '—';
                document.getElementById('ordersKpiCancelled').textContent = data.cancelled ?? '—';
            } catch (error) {
                console.error('Erro ao carregar stats de pedidos:', error);
                Toast.error('Erro ao carregar resumo de pedidos');
            }
        },

        async loadOrders() {
            const table = document.getElementById('ordersTable');
            if (!table) return;

            const tbodies = table.querySelectorAll('tbody');
            tbodies.forEach((tb, i) => {
                if (i > 0) tb.remove();
            });

            const tbody = table.querySelector('tbody');
            const wrapper = table.closest('.table-wrapper');
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
                    tbody.innerHTML = '<tr><td colspan="8" class="table-empty">Nenhum pedido encontrado com os filtros atuais.</td></tr>';
                } else {
                    tbody.innerHTML = orders.map((o) => this.buildOrderRow(o)).join('');

                    tbody.querySelectorAll('tr[data-order-id]').forEach((row) => {
                        row.addEventListener('click', () => {
                            OrderDetailModal.open(row.dataset.orderId);
                        });
                    });
                }

                if (countHint) {
                    countHint.textContent = `${data.pagination.total} pedido${data.pagination.total === 1 ? '' : 's'}`;
                }

                this.renderPagination(data.pagination);
            } catch (error) {
                console.error('Erro ao carregar pedidos:', error);
                tbody.innerHTML = '<tr><td colspan="8" class="table-empty">Erro ao carregar pedidos.</td></tr>';
                Toast.error('Erro ao carregar pedidos');
            } finally {
                TableLoader.stop(wrapper);
            }
        },

        buildOrderRow(o) {
            const STATUS_LABEL = {
                pending: 'Pendente', paid: 'Pago', shipped: 'Enviado',
                delivered: 'Entregue', cancelled: 'Cancelado',
            };

            const SHIPPING_LABEL = {
                not_applicable:  { label: '—',                  icon: 'fa-minus',           color: 'gray' },
                awaiting_shipment: { label: 'Aguardando envio', icon: 'fa-box',             color: 'warning' },
                in_transit:      { label: 'Em transporte',      icon: 'fa-truck',           color: 'info' },
                delivered:       { label: 'Entregue',           icon: 'fa-check-circle',    color: 'success' },
                cancelled:       { label: '—',                  icon: 'fa-times-circle',    color: 'danger' },
            };

            const PAYMENT_LABEL = { pix: 'PIX', credit_card: 'Cartão', boleto: 'Boleto' };

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

        bindKpiCards() {
            document.querySelectorAll('.orders-kpi-card[data-order-filter]').forEach((card) => {
                if (card.dataset.bound === 'true') return;
                card.dataset.bound = 'true';

                card.addEventListener('click', () => {
                    const filter = card.dataset.orderFilter;

                    document.querySelectorAll('.orders-kpi-card').forEach((c) => c.classList.remove('active'));
                    card.classList.add('active');

                    this.filters.status = filter === 'all' ? null : filter;
                    this.currentPage = 1;
                    this.loadOrders();
                });
            });
        },

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

            ths.forEach((th) => {
                if (th.dataset.sort === this.sortState.sort) {
                    th.classList.add(this.sortState.order === 'asc' ? 'sort-asc' : 'sort-desc');
                }
            });
        },

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
    // PEDIDO — Modal de detalhe
    // ======================================================
    const OrderDetailModal = {
        ctrl: null,
        currentOrderId: null,

        STATUS_LABEL: {
            pending: 'Pendente', paid: 'Pago', shipped: 'Enviado',
            delivered: 'Entregue', cancelled: 'Cancelado',
        },

        PAYMENT_LABEL: { pix: 'PIX', credit_card: 'Cartão', boleto: 'Boleto' },

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

        async open(orderId) {
            this.currentOrderId = orderId;

            const { modal } = this.ctrl;

            ModalStack.push('orderDetail', modal);
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
                const data = await API.get(`/orders/admin/${this.currentOrderId}`);
                this.render(data);
            } catch (error) {
                console.error('Erro ao carregar pedido:', error);
                body.innerHTML = '<div class="table-empty">Erro ao carregar pedido</div>';
            } finally {
                TableLoader.stop(body);
            }
        },

        render(o) {
            const { body } = this.ctrl;
            const fmtCur = (v) => Utils.formatPrice(v);
            const fmtDate = (d) => Utils.formatDate(d);

            const statusLabel = this.STATUS_LABEL[o.status] || o.status;
            const paymentLabel = this.PAYMENT_LABEL[o.payment_method] || o.payment_method || '—';

            const addressLines = [
                [o.shipping_street, o.shipping_number, o.shipping_complement].filter(Boolean).join(', '),
                o.shipping_neighborhood,
                [o.shipping_city, o.shipping_state].filter(Boolean).join(' - '),
                o.shipping_cep ? `CEP: ${o.shipping_cep}` : null,
            ].filter(Boolean);

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

            const statusBarHtml = `
                <div class="order-detail-status-bar">
                    <span class="label">Status atual:</span>
                    <span class="badge-status ${o.status}">${statusLabel}</span>
                    <span style="margin-left: auto; color: var(--gray-500); font-size: 0.85rem;">
                        Pagamento: <strong>${paymentLabel}</strong>
                    </span>
                </div>
            `;

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

            const notesHtml = o.notes
                ? `
                    <div class="detail-section">
                        <h3>📝 Observações</h3>
                        <p style="color: var(--gray-700); font-size: 0.9rem; line-height: 1.6;">${Utils.escapeHtml(o.notes)}</p>
                    </div>
                `
                : '';

            const actionsHtml = this.buildActionsHtml(o);

            body.innerHTML = headerHtml + statusBarHtml + itemsSectionHtml + summaryHtml + addressHtml + notesHtml + actionsHtml;

            body.querySelector('[data-action="back"]')?.addEventListener('click', () => this.handleBack());

            this.bindActions(o);

            this.updateBackVisibility();
        },

        buildActionsHtml(o) {
            const isFinal = o.status === 'cancelled' || o.status === 'delivered';

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

        bindActions(o) {
            const { body } = this.ctrl;

            const applyBtn = body.querySelector('#orderStatusApplyBtn');
            const statusSelect = body.querySelector('#orderStatusSelect');

            if (applyBtn && statusSelect) {
                applyBtn.addEventListener('click', async () => {
                    const newStatus = statusSelect.value;

                    if (newStatus === 'cancelled') {
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
        OrdersPage.init();
        OrderDetailModal.init();
        CouponModal.init();
        CouponUsagesModal.init();

        await ProductForm.init();
        await MovementForm.init();

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