// ======================================================
// CONFIGURAÇÕES
// ======================================================
const CONFIG = {
    api: { baseUrl: '/api' },
    lowStockThreshold: 10,
    recentLimit: 5
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
            minute: '2-digit'
        });
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    },

    truncate(text, max = 40) {
        if (!text) return '';
        return text.length > max ? text.substring(0, max) + '...' : text;
    },

        // ✅ Monta o breadcrumb de categoria a partir de category_path
    // category_path vem do banco ordenado por level DESC (mais específico primeiro)
    // Ex: [{name:'Calças', level:2}, {name:'Feminino', level:1}, {name:'Vestuário', level:0}]
    buildCategoryBreadcrumb(product, separator = ' › ') {
        if (product.category_path && Array.isArray(product.category_path) && product.category_path.length > 0) {
            // Ordena por level ASC (raiz primeiro) e depois pega os nomes
            const sorted = [...product.category_path].sort((a, b) => a.level - b.level);
            return sorted.map(c => Utils.escapeHtml(c.name)).join(separator);
        }
        return Utils.escapeHtml(product.category_name || '—');
    }
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
            info: 'fa-info-circle'
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
    info(msg) { this.show(msg, 'info'); }
};

// ======================================================
// API
// ======================================================
const API = {
    async request(path, options = {}) {
        const url = `${CONFIG.api.baseUrl}${path}`;
        const defaultOptions = {
            headers: { 'Content-Type': 'application/json' }
        };

        const response = await fetch(url, { ...defaultOptions, ...options });
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
    delete(path) { return this.request(path, { method: 'DELETE' }); }
};

// ======================================================
// MODAL DE DETALHES
// ======================================================
const DetailModal = {
    modal: null, body: null, loading: null,

    init() {
        this.modal = document.getElementById('detailModal');
        this.body = document.getElementById('detailBody');
        this.loading = document.getElementById('detailLoading');

        document.getElementById('closeDetailModal')?.addEventListener('click', () => this.close());
        this.modal?.addEventListener('click', (e) => {
            if (e.target === this.modal) this.close();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal?.classList.contains('active')) this.close();
        });
    },

    open() {
        this.loading.style.display = 'flex';
        this.body.style.display = 'none';
        this.body.innerHTML = '';
        this.modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    },

    close() {
        this.modal.classList.remove('active');
        document.body.style.overflow = '';
    },

    render(html) {
        this.loading.style.display = 'none';
        this.body.style.display = 'block';
        this.body.innerHTML = html;
    },

    showProduct(product) {
        this.open();
        setTimeout(() => {
            const flags = [];
            if (product.is_featured)    flags.push('<span class="detail-badge warning"><i class="fas fa-star"></i> Destaque</span>');
            if (product.is_new)         flags.push('<span class="detail-badge info"><i class="fas fa-certificate"></i> Novo</span>');
            if (product.is_best_seller) flags.push('<span class="detail-badge success"><i class="fas fa-trophy"></i> Mais Vendido</span>');
            if (product.is_active)      flags.push('<span class="detail-badge success"><i class="fas fa-check"></i> Ativo</span>');
            else                        flags.push('<span class="detail-badge danger"><i class="fas fa-times"></i> Inativo</span>');

            let stockClass = 'success';
            let stockLabel = 'Em estoque';
            if (product.stock_quantity === 0) { stockClass = 'danger'; stockLabel = 'Sem estoque'; }
            else if (product.stock_quantity <= CONFIG.lowStockThreshold) { stockClass = 'warning'; stockLabel = 'Estoque baixo'; }

            let categoryHtml = '—';
            if (product.category_path && product.category_path.length > 0) {
                const path = [...product.category_path].reverse();
                categoryHtml = path.map((c, i) => {
                    const isLast = i === path.length - 1;
                    return isLast
                        ? `<strong>${Utils.escapeHtml(c.name)}</strong>`
                        : `${Utils.escapeHtml(c.name)}`;
                }).join(' <i class="fas fa-chevron-right" style="font-size: 0.7em; color: var(--gray-400); margin: 0 0.25rem;"></i> ');
            } else if (product.category_name) {
                categoryHtml = Utils.escapeHtml(product.category_name);
            }

            const html = `
                <div class="detail-header">
                    <div class="detail-header-icon ${stockClass}"><i class="fas fa-box"></i></div>
                    <div class="detail-header-info">
                        <h2>${Utils.escapeHtml(product.name)}</h2>
                        <p>SKU: ${Utils.escapeHtml(product.sku)} · ID #${product.id}</p>
                    </div>
                </div>

                <div class="detail-badges">${flags.join('')}</div>

                <div class="detail-section" style="margin-top: 1.25rem;">
                    <h3>Categoria</h3>
                    <div class="detail-category-path">${categoryHtml}</div>
                </div>

                <div class="detail-section">
                    <h3>Informações</h3>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-item-label">Preço</span>
                            <span class="detail-item-value accent">${Utils.formatPrice(product.price)}</span>
                        </div>
                        ${product.discount_percent > 0 ? `
                        <div class="detail-item">
                            <span class="detail-item-label">Desconto</span>
                            <span class="detail-item-value">${product.discount_percent}%</span>
                        </div>` : ''}
                        <div class="detail-item">
                            <span class="detail-item-label">Estoque</span>
                            <span class="detail-item-value">${product.stock_quantity} (${stockLabel})</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-item-label">Marca</span>
                            <span class="detail-item-value">${Utils.escapeHtml(product.brand_name || '—')}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-item-label">Vendas</span>
                            <span class="detail-item-value">${product.sales_count || 0}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-item-label">Visualizações</span>
                            <span class="detail-item-value">${product.view_count || 0}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-item-label">Avaliação</span>
                            <span class="detail-item-value">${parseFloat(product.rating_avg || 0).toFixed(1)} ⭐ (${product.rating_count || 0})</span>
                        </div>
                    </div>
                </div>

                <div class="detail-section">
                    <h3>Descrição</h3>
                    <p>${Utils.escapeHtml(product.short_description || product.description || 'Sem descrição')}</p>
                </div>

                <div class="detail-section">
                    <h3>Datas</h3>
                    <div class="detail-list">
                        <div class="detail-list-item">
                            <span><i class="fas fa-plus-circle"></i> Criado em</span>
                            <span>${Utils.formatDate(product.created_at)}</span>
                        </div>
                        <div class="detail-list-item">
                            <span><i class="fas fa-edit"></i> Última atualização</span>
                            <span>${Utils.formatDate(product.updated_at)}</span>
                        </div>
                    </div>
                </div>
            `;
            this.render(html);
        }, 300);
    },

    showMovement(movement) {
        this.open();
        setTimeout(() => {
            const typeLabel = {
                in: 'Entrada', out: 'Saída', adjustment: 'Ajuste', return: 'Devolução'
            }[movement.movement_type] || movement.movement_type;

            const typeIcon = {
                in: 'fa-arrow-down', out: 'fa-arrow-up',
                adjustment: 'fa-sliders-h', return: 'fa-undo'
            }[movement.movement_type] || 'fa-exchange-alt';

            const iconClass = movement.movement_type === 'in' ? 'success'
                             : movement.movement_type === 'out' ? 'danger'
                             : movement.movement_type === 'return' ? 'warning' : '';

            const diff = movement.new_quantity - movement.previous_quantity;
            const diffLabel = diff > 0 ? `+${diff}` : `${diff}`;

            const html = `
                <div class="detail-header">
                    <div class="detail-header-icon ${iconClass}"><i class="fas ${typeIcon}"></i></div>
                    <div class="detail-header-info">
                        <h2>${typeLabel}</h2>
                        <p>ID #${movement.id} · ${Utils.formatDate(movement.created_at)}</p>
                    </div>
                </div>

                <div class="detail-section">
                    <h3>Produto</h3>
                    <div class="detail-list">
                        <div class="detail-list-item">
                            <span>Nome</span>
                            <span>${Utils.escapeHtml(movement.product_name || 'Produto #' + movement.product_id)}</span>
                        </div>
                    </div>
                </div>

                <div class="detail-section">
                    <h3>Movimentação</h3>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-item-label">Quantidade</span>
                            <span class="detail-item-value">${movement.quantity}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-item-label">Estoque Anterior</span>
                            <span class="detail-item-value">${movement.previous_quantity}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-item-label">Estoque Atual</span>
                            <span class="detail-item-value accent">${movement.new_quantity}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-item-label">Variação</span>
                            <span class="detail-item-value">${diffLabel}</span>
                        </div>
                    </div>
                </div>

                <div class="detail-section">
                    <h3>Detalhes Adicionais</h3>
                    <div class="detail-list">
                        <div class="detail-list-item">
                            <span>Motivo</span>
                            <span>${Utils.escapeHtml(movement.reason || '—')}</span>
                        </div>
                        <div class="detail-list-item">
                            <span>Tipo de Referência</span>
                            <span>${Utils.escapeHtml(movement.reference_type || '—')}</span>
                        </div>
                        <div class="detail-list-item">
                            <span>ID da Referência</span>
                            <span>${movement.reference_id || '—'}</span>
                        </div>
                        <div class="detail-list-item">
                            <span>Observações</span>
                            <span>${Utils.escapeHtml(movement.notes || '—')}</span>
                        </div>
                    </div>
                </div>
            `;
            this.render(html);
        }, 300);
    },

    showKPI(type, value, extra = '') {
        this.open();
        setTimeout(() => {
            const configs = {
                totalProducts: { icon: 'fa-box', iconClass: '', title: 'Total de Produtos',
                    description: 'Número total de produtos ativos cadastrados no catálogo da loja.' },
                totalStock: { icon: 'fa-warehouse', iconClass: 'success', title: 'Itens em Estoque',
                    description: 'Somatório de todas as unidades disponíveis em estoque, considerando todos os produtos ativos.' },
                lowStock: { icon: 'fa-exclamation-triangle', iconClass: 'warning', title: 'Estoque Baixo',
                    description: 'Produtos com quantidade em estoque igual ou abaixo do limite mínimo recomendado (10 unidades).' },
                outOfStock: { icon: 'fa-times-circle', iconClass: 'danger', title: 'Sem Estoque',
                    description: 'Produtos com quantidade zerada em estoque. Considere reabastecimento.' }
            };
            const cfg = configs[type] || configs.totalProducts;

            const html = `
                <div class="detail-header">
                    <div class="detail-header-icon ${cfg.iconClass}"><i class="fas ${cfg.icon}"></i></div>
                    <div class="detail-header-info">
                        <h2>${cfg.title}</h2>
                        <p>Indicador do dashboard</p>
                    </div>
                </div>

                <div class="detail-section">
                    <h3>Valor Atual</h3>
                    <div class="detail-grid">
                        <div class="detail-item" style="grid-column: 1 / -1;">
                            <span class="detail-item-label">Total</span>
                            <span class="detail-item-value accent" style="font-size: 2rem;">${value}</span>
                        </div>
                    </div>
                </div>

                <div class="detail-section">
                    <h3>Sobre este Indicador</h3>
                    <p>${cfg.description}</p>
                </div>

                ${extra ? `
                <div class="detail-section">
                    <h3>Detalhes</h3>
                    <p>${extra}</p>
                </div>` : ''}
            `;
            this.render(html);
        }, 300);
    }
};

// ======================================================
// NAVEGAÇÃO
// ======================================================
const Navigation = {
    init() {
        document.querySelectorAll('.nav-item:not(.nav-item-parent), .nav-subitem').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetId = btn.dataset.target;
                if (targetId) this.goTo(targetId, btn);
            });
        });

        const parentBtn = document.querySelector('.nav-item-parent');
        if (parentBtn) {
            parentBtn.addEventListener('click', () => {
                const group = parentBtn.closest('.nav-group');
                group.classList.toggle('open');
                parentBtn.setAttribute('aria-expanded', group.classList.contains('open'));
            });
        }

        const mobileToggle = document.getElementById('mobileToggle');
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');

        mobileToggle?.addEventListener('click', () => {
            sidebar.classList.add('open');
            overlay.classList.add('active');
        });

        overlay?.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        });

        document.querySelectorAll('.nav-item, .nav-subitem').forEach(btn => {
            btn.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('open');
                    overlay.classList.remove('active');
                }
            });
        });
    },

    goTo(sectionId, btnElement) {
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        const target = document.getElementById(sectionId);
        if (target) target.classList.add('active');

        document.querySelectorAll('.nav-item, .nav-subitem').forEach(b => b.classList.remove('active'));
        if (btnElement) btnElement.classList.add('active');
        else if (target) {
            const match = document.querySelector(`[data-target="${sectionId}"]`);
            if (match) match.classList.add('active');
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
        this.loadSectionData(sectionId);
    },

    loadSectionData(sectionId) {
        switch (sectionId) {
            case 'section-dashboard': Dashboard.loadAll(); break;
            case 'section-register-product': ProductForm.loadRecentProducts(); break;
            case 'section-register-movement': MovementForm.loadRecentMovements(); break;
        }
    }
};

// ======================================================
// DASHBOARD
// ======================================================
const Dashboard = {
    _kpiValues: {},
    _products: [],

    async loadAll() {
        await Promise.all([this.loadKPIs(), this.loadTopProducts(), this.loadRecentMovements()]);
    },

    async loadKPIs() {
        try {
            const data = await API.get('/products?limit=1000');
            const products = data.products || [];

            const totalProducts = products.length;
            const totalStock = products.reduce((sum, p) => sum + (parseInt(p.stock_quantity) || 0), 0);
            const lowStock = products.filter(p => p.stock_quantity > 0 && p.stock_quantity <= CONFIG.lowStockThreshold).length;
            const outOfStock = products.filter(p => p.stock_quantity === 0).length;

            document.getElementById('kpiTotalProducts').textContent = totalProducts;
            document.getElementById('kpiTotalStock').textContent = totalStock.toLocaleString('pt-BR');
            document.getElementById('kpiLowStock').textContent = lowStock;
            document.getElementById('kpiOutOfStock').textContent = outOfStock;

            this._kpiValues = { totalProducts, totalStock, lowStock, outOfStock };
            this._products = products;
            this.attachKPIClicks();
        } catch (error) {
            console.error('Erro ao carregar KPIs:', error);
            Toast.error('Erro ao carregar indicadores');
        }
    },

    attachKPIClicks() {
        const kpiMap = [
            { type: 'totalProducts', key: 'totalProducts' },
            { type: 'totalStock',    key: 'totalStock' },
            { type: 'lowStock',      key: 'lowStock' },
            { type: 'outOfStock',    key: 'outOfStock' }
        ];

        document.querySelectorAll('.kpi-card').forEach((card, idx) => {
            const cfg = kpiMap[idx];
            if (!cfg) return;

            card.onclick = () => {
                const value = this._kpiValues[cfg.key] ?? '—';
                let extra = '';

                if (cfg.type === 'lowStock' && this._products.length) {
                    const low = this._products.filter(p => p.stock_quantity > 0 && p.stock_quantity <= CONFIG.lowStockThreshold);
                    if (low.length > 0) {
                        extra = '<ul style="padding-left: 1rem; margin: 0;">' +
                            low.slice(0, 5).map(p => `<li>${Utils.escapeHtml(p.name)} — ${p.stock_quantity} un.</li>`).join('') +
                            (low.length > 5 ? `<li>... e mais ${low.length - 5}</li>` : '') + '</ul>';
                    }
                }

                if (cfg.type === 'outOfStock' && this._products.length) {
                    const out = this._products.filter(p => p.stock_quantity === 0);
                    if (out.length > 0) {
                        extra = '<ul style="padding-left: 1rem; margin: 0;">' +
                            out.slice(0, 5).map(p => `<li>${Utils.escapeHtml(p.name)}</li>`).join('') +
                            (out.length > 5 ? `<li>... e mais ${out.length - 5}</li>` : '') + '</ul>';
                    }
                }

                DetailModal.showKPI(cfg.type, value, extra);
            };
        });
    },

    async loadTopProducts() {
        const container = document.getElementById('topProductsList');
        if (!container) return;
        container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i><span>Carregando...</span></div>';

        try {
            const data = await API.get('/products?sort=sales_count&order=DESC&limit=5');
            const products = data.products || [];

            if (products.length === 0) {
                container.innerHTML = '<p class="table-empty">Nenhum produto cadastrado ainda.</p>';
                return;
            }

            const html = products.map((p, i) => {
                const positionClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
                const catLabel = Utils.buildCategoryBreadcrumb(p);
                return `
                    <div class="ranking-item" data-product-id="${p.id}" title="Clique para ver detalhes">
                        <div class="ranking-position ${positionClass}">${i + 1}</div>
                        <div class="ranking-info">
                            <div class="ranking-name">${Utils.escapeHtml(p.name)}</div>
                            <div class="ranking-meta">${catLabel} · ${p.sales_count || 0} vendas</div>
                        </div>
                        <div class="ranking-value">${Utils.formatPrice(p.price)}</div>
                    </div>
                `;
            }).join('');

            container.innerHTML = `<div class="ranking-list">${html}</div>`;

            container.querySelectorAll('.ranking-item').forEach(item => {
                item.addEventListener('click', async () => {
                    const id = item.dataset.productId;
                    DetailModal.open();
                    try {
                        const product = await API.get(`/products/${id}`);
                        DetailModal.showProduct(product);
                    } catch (err) {
                        console.error(err);
                        Toast.error('Erro ao carregar detalhes do produto');
                        DetailModal.close();
                    }
                });
            });
        } catch (error) {
            console.error('Erro ao carregar top produtos:', error);
            container.innerHTML = '<p class="table-empty">Erro ao carregar ranking.</p>';
        }
    },

    async loadRecentMovements() {
        const container = document.getElementById('recentMovementsList');
        if (!container) return;
        container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i><span>Carregando...</span></div>';

        try {
            const productsData = await API.get('/products?limit=1000');
            const products = productsData.products || [];

            if (products.length === 0) {
                container.innerHTML = '<p class="table-empty">Nenhum produto cadastrado ainda.</p>';
                return;
            }

            const movementsPromises = products.slice(0, 10).map(p =>
                API.get(`/inventory/product/${p.id}/movements?limit=5`)
                    .then(movs => movs.map(m => ({ ...m, product_name: p.name })))
                    .catch(() => [])
            );

            const movementsArrays = await Promise.all(movementsPromises);
            const allMovements = movementsArrays
                .flat()
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .slice(0, CONFIG.recentLimit);

            if (allMovements.length === 0) {
                container.innerHTML = '<p class="table-empty">Nenhuma movimentação registrada ainda.</p>';
                return;
            }

            const iconMap = {
                in: 'fa-arrow-down', out: 'fa-arrow-up',
                adjustment: 'fa-sliders-h', return: 'fa-undo'
            };

            const html = allMovements.map(m => {
                const type = m.movement_type || 'adjustment';
                const typeLabel = {
                    in: 'Entrada', out: 'Saída', adjustment: 'Ajuste', return: 'Devolução'
                }[type] || type;
                const valueSign = type === 'in' || type === 'return' ? '+' : type === 'out' ? '-' : '';

                return `
                    <div class="movement-item ${type}" title="Clique para ver detalhes">
                        <div class="movement-icon ${type}"><i class="fas ${iconMap[type]}"></i></div>
                        <div class="movement-info">
                            <div class="movement-title">${Utils.escapeHtml(m.product_name)}</div>
                            <div class="movement-meta">${typeLabel} · ${Utils.formatDate(m.created_at)}</div>
                        </div>
                        <div class="movement-value ${type}">${valueSign}${m.quantity}</div>
                    </div>
                `;
            }).join('');

            container.innerHTML = `<div class="movement-list">${html}</div>`;

            container.querySelectorAll('.movement-item').forEach((item, idx) => {
                item.addEventListener('click', () => DetailModal.showMovement(allMovements[idx]));
            });
        } catch (error) {
            console.error('Erro ao carregar movimentações:', error);
            container.innerHTML = '<p class="table-empty">Erro ao carregar movimentações.</p>';
        }
    }
};

// ======================================================
// FORMULÁRIO DE PRODUTO
// ======================================================
const ProductForm = {
    treeData: [],

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
            const root = this.treeData.find(c => c.id === rootId);

            genderSelect.innerHTML = '<option value="">Selecione o gênero</option>';
            typeSelect.innerHTML = '<option value="">Selecione o gênero primeiro</option>';
            typeSelect.disabled = true;

            if (root && root.children?.length) {
                root.children.forEach(g => {
                    const opt = document.createElement('option');
                    opt.value = g.id;
                    opt.textContent = g.name;
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
            const root = this.treeData.find(c => c.id === rootId);
            const gender = root?.children?.find(g => g.id === genderId);

            typeSelect.innerHTML = '<option value="">Selecione o tipo</option>';

            if (gender && gender.children?.length) {
                gender.children.forEach(t => {
                    const opt = document.createElement('option');
                    opt.value = t.id;
                    opt.textContent = t.name;
                    typeSelect.appendChild(opt);
                });
                typeSelect.disabled = false;
            } else {
                typeSelect.disabled = true;
            }
        });

        form.addEventListener('submit', (e) => this.handleSubmit(e));
        document.getElementById('refreshRecentProducts')
            ?.addEventListener('click', () => this.loadRecentProducts());
    },

    slugify(text) {
        return text.toString().toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s-]/g, '').trim()
            .replace(/\s+/g, '-').replace(/-+/g, '-');
    },

    async loadCategoriesTree() {
        const rootSelect = document.getElementById('prodCategoryRoot');
        if (!rootSelect) return;
        try {
            const tree = await API.get('/categories/tree-full');
            this.treeData = tree;
            rootSelect.innerHTML = '<option value="">Selecione...</option>';
            tree.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = c.name;
                rootSelect.appendChild(opt);
            });
        } catch (error) {
            console.error('Erro ao carregar categorias:', error);
            rootSelect.innerHTML = '<option value="">Erro ao carregar</option>';
        }
    },

    async loadBrands() {
        const select = document.getElementById('prodBrand');
        if (!select) return;
        try {
            const brands = await API.get('/brands');
            select.innerHTML = '<option value="">Sem marca</option>' +
                brands.map(b => `<option value="${b.id}">${Utils.escapeHtml(b.name)}</option>`).join('');
        } catch (error) {
            console.error('Erro ao carregar marcas:', error);
            select.innerHTML = '<option value="">Erro ao carregar</option>';
        }
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
                discount_percent: parseFloat(formData.get('discount_percent')) || 0,
                stock_quantity: parseInt(formData.get('stock_quantity')) || 0,
                weight: formData.get('weight') ? parseFloat(formData.get('weight')) : null,
                dimensions: formData.get('dimensions') || null,
                is_featured: formData.get('is_featured') === 'on',
                is_new: formData.get('is_new') === 'on',
                is_best_seller: formData.get('is_best_seller') === 'on',
                is_active: formData.get('is_active') === 'on'
            };

            const product = await API.post('/products', data);

            if (data.stock_quantity > 0) {
                try {
                    await API.post('/inventory', {
                        product_id: product.id,
                        quantity: data.stock_quantity,
                        min_quantity: 5
                    });
                } catch (invErr) {
                    console.warn('Produto criado, mas falha ao registrar estoque:', invErr);
                }
            }

            Toast.success(`Produto "${product.name}" cadastrado com sucesso!`);
            form.reset();

            const genderSelect = document.getElementById('prodCategoryGender');
            const typeSelect = document.getElementById('prodCategoryType');
            if (genderSelect) {
                genderSelect.innerHTML = '<option value="">Selecione a categoria primeiro</option>';
                genderSelect.disabled = true;
            }
            if (typeSelect) {
                typeSelect.innerHTML = '<option value="">Selecione o gênero primeiro</option>';
                typeSelect.disabled = true;
            }
            document.getElementById('prodSlug').dataset.manual = '';

            await this.loadRecentProducts();
        } catch (error) {
            console.error('Erro ao cadastrar produto:', error);
            if (error.data?.fields) {
                Toast.error(`Campos obrigatórios faltando: ${error.data.fields.join(', ')}`);
            } else if (error.status === 400 && error.message.includes('já existe')) {
                Toast.error(error.message);
            } else {
                Toast.error(error.message || 'Erro ao cadastrar produto');
            }
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    },

    async loadRecentProducts() {
        const tbody = document.querySelector('#recentProductsTable tbody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="7" class="table-empty">Carregando...</td></tr>';

        try {
            const data = await API.get('/products?sort=created_at&order=DESC&limit=10');
            const products = data.products || [];

            if (products.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="table-empty">Nenhum produto cadastrado ainda.</td></tr>';
                return;
            }

            tbody.innerHTML = products.map(p => {
                let stockClass = 'ok', stockIcon = 'fa-check-circle';
                if (p.stock_quantity === 0) { stockClass = 'out'; stockIcon = 'fa-times-circle'; }
                else if (p.stock_quantity <= CONFIG.lowStockThreshold) { stockClass = 'low'; stockIcon = 'fa-exclamation-triangle'; }

                const categoryLabel = Utils.buildCategoryBreadcrumb(p);

                return `
                    <tr data-product-id="${p.id}" title="Clique para ver detalhes">
                        <td>#${p.id}</td>
                        <td>${Utils.escapeHtml(p.name)}</td>
                        <td><code>${Utils.escapeHtml(p.sku)}</code></td>
                        <td>${Utils.formatPrice(p.price)}</td>
                        <td><span class="stock-indicator ${stockClass}"><i class="fas ${stockIcon}"></i> ${p.stock_quantity}</span></td>
                        <td class="category-cell">${categoryLabel}</td>
                        <td>${Utils.formatDate(p.created_at)}</td>
                    </tr>
                `;
            }).join('');

            tbody.querySelectorAll('tr[data-product-id]').forEach(row => {
                row.addEventListener('click', async () => {
                    const id = row.dataset.productId;
                    DetailModal.open();
                    try {
                        const product = await API.get(`/products/${id}`);
                        DetailModal.showProduct(product);
                    } catch (err) {
                        console.error(err);
                        Toast.error('Erro ao carregar detalhes do produto');
                        DetailModal.close();
                    }
                });
            });
        } catch (error) {
            console.error('Erro ao carregar produtos recentes:', error);
            tbody.innerHTML = '<tr><td colspan="7" class="table-empty">Erro ao carregar produtos.</td></tr>';
        }
    }
};

// ======================================================
// FORMULÁRIO DE MOVIMENTAÇÃO
// ======================================================
const MovementForm = {
    async init() {
        const form = document.getElementById('movementForm');
        if (!form) return;

        await this.loadProducts();

        const productSelect = document.getElementById('movProduct');
        productSelect?.addEventListener('change', () => this.showProductStock());

        form.addEventListener('submit', (e) => this.handleSubmit(e));
        document.getElementById('refreshRecentMovements')
            ?.addEventListener('click', () => this.loadRecentMovements());
    },

    async loadProducts() {
        const select = document.getElementById('movProduct');
        if (!select) return;
        try {
            const data = await API.get('/products?sort=name&order=ASC&limit=1000');
            const products = data.products || [];

            if (products.length === 0) {
                select.innerHTML = '<option value="">Nenhum produto cadastrado</option>';
                return;
            }

            select.innerHTML = '<option value="">Selecione um produto</option>' +
                products.map(p => `
                    <option value="${p.id}" data-stock="${p.stock_quantity}">
                        ${Utils.escapeHtml(p.name)} (SKU: ${Utils.escapeHtml(p.sku)}) — Estoque: ${p.stock_quantity}
                    </option>
                `).join('');
        } catch (error) {
            console.error('Erro ao carregar produtos:', error);
            select.innerHTML = '<option value="">Erro ao carregar</option>';
        }
    },

    showProductStock() {
        const select = document.getElementById('movProduct');
        const hint = document.getElementById('movProductStock');
        if (!select || !hint) return;

        const option = select.options[select.selectedIndex];
        const stock = option?.dataset.stock;

        if (stock !== undefined && stock !== '') {
            hint.innerHTML = `Estoque atual: <strong>${stock}</strong> unidade(s)`;
        } else {
            hint.textContent = '';
        }
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

            const inventoryList = await API.get(`/inventory/product/${productId}`);

            if (!inventoryList || inventoryList.length === 0) {
                await API.post('/inventory', {
                    product_id: productId,
                    quantity: 0,
                    min_quantity: 5
                });
                const newList = await API.get(`/inventory/product/${productId}`);
                if (!newList || newList.length === 0) {
                    throw new Error('Não foi possível criar registro de estoque');
                }
                return this.registerMovementOnInventory(newList[0].id, formData, btn, originalText);
            }

            await this.registerMovementOnInventory(inventoryList[0].id, formData, btn, originalText);
        } catch (error) {
            console.error('Erro ao registrar movimentação:', error);
            Toast.error(error.message || 'Erro ao registrar movimentação');
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    },

    async registerMovementOnInventory(inventoryId, formData, btn, originalText) {
        try {
            const data = {
                movement_type: formData.get('movement_type'),
                quantity: parseInt(formData.get('quantity')),
                reason: formData.get('reason') || null,
                reference_type: formData.get('reference_type') || null,
                reference_id: formData.get('reference_id') ? parseInt(formData.get('reference_id')) : null,
                notes: formData.get('notes') || null
            };

            const result = await API.post(`/inventory/${inventoryId}/movement`, data);

            const typeLabel = {
                in: 'Entrada', out: 'Saída', adjustment: 'Ajuste', return: 'Devolução'
            }[data.movement_type];

            Toast.success(`${typeLabel} de ${data.quantity} unidade(s) registrada! Novo estoque: ${result.current_stock}`);

            document.getElementById('movementForm').reset();
            document.getElementById('movProductStock').textContent = '';

            await this.loadProducts();
            await this.loadRecentMovements();
        } catch (error) {
            console.error('Erro ao registrar movimentação:', error);
            Toast.error(error.message || 'Erro ao registrar movimentação');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    },

    async loadRecentMovements() {
        const tbody = document.querySelector('#recentMovementsTable tbody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="7" class="table-empty">Carregando...</td></tr>';

        try {
            const productsData = await API.get('/products?limit=1000');
            const products = productsData.products || [];

            if (products.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="table-empty">Nenhum produto cadastrado ainda.</td></tr>';
                return;
            }

            const movementsPromises = products.slice(0, 20).map(p =>
                API.get(`/inventory/product/${p.id}/movements?limit=10`)
                    .then(movs => movs.map(m => ({ ...m, product_name: p.name })))
                    .catch(() => [])
            );

            const movementsArrays = await Promise.all(movementsPromises);
            const allMovements = movementsArrays
                .flat()
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .slice(0, 15);

            if (allMovements.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="table-empty">Nenhuma movimentação registrada ainda.</td></tr>';
                return;
            }

            tbody.innerHTML = allMovements.map((m, idx) => {
                const typeLabel = {
                    in: 'Entrada', out: 'Saída', adjustment: 'Ajuste', return: 'Devolução'
                }[m.movement_type] || m.movement_type;

                return `
                    <tr data-movement-idx="${idx}" title="Clique para ver detalhes">
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

            tbody.querySelectorAll('tr[data-movement-idx]').forEach(row => {
                row.addEventListener('click', () => {
                    const idx = parseInt(row.dataset.movementIdx);
                    DetailModal.showMovement(allMovements[idx]);
                });
            });
        } catch (error) {
            console.error('Erro ao carregar movimentações:', error);
            tbody.innerHTML = '<tr><td colspan="7" class="table-empty">Erro ao carregar movimentações.</td></tr>';
        }
    }
};

// ======================================================
// BOTÃO ATUALIZAR DASHBOARD
// ======================================================
document.getElementById('refreshDashboard')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.classList.add('loading');
    await Dashboard.loadAll();
    setTimeout(() => btn.classList.remove('loading'), 500);
    Toast.info('Dashboard atualizado');
});

// ======================================================
// INICIALIZAÇÃO
// ======================================================
document.addEventListener('DOMContentLoaded', async () => {
    Toast.init();
    Navigation.init();
    DetailModal.init();

    await ProductForm.init();
    await MovementForm.init();

    Dashboard.loadAll();

    const hash = window.location.hash.replace('#', '');
    if (hash) {
        const btn = document.querySelector(`[data-section="${hash}"]`);
        if (btn) Navigation.goTo(btn.dataset.target, btn);
    }

    console.log('✅ Admin - Sistema carregado com sucesso!');
});