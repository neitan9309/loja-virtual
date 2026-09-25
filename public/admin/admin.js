// ======================================================
// CONFIGURAÇÕES
// ======================================================
const CONFIG = {
    api: { baseUrl: '/api' },
    lowStockThreshold: 10,
    recentLimit: 5,
    searchLimit: 20
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
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    },

    buildCategoryBreadcrumb(product, separator = ' › ') {
        if (product.category_path && Array.isArray(product.category_path) && product.category_path.length > 0) {
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
    init() { this.container = document.getElementById('toastContainer'); },

    show(message, type = 'info', duration = 3500) {
        if (!this.container) this.init();
        const icons = {
            success: 'fa-check-circle', error: 'fa-times-circle',
            warning: 'fa-exclamation-triangle', info: 'fa-info-circle'
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
        const defaultOptions = { headers: { 'Content-Type': 'application/json' } };
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
    patch(path, body) { return this.request(path, { method: 'PATCH', body: JSON.stringify(body) }); },
    delete(path) { return this.request(path, { method: 'DELETE' }); }
};

// ======================================================
// UPLOADER
// ======================================================
const Uploader = {
    async upload(file) {
        const formData = new FormData();
        formData.append('image', file);
        const response = await fetch(`${CONFIG.api.baseUrl}/upload`, {
            method: 'POST', body: formData
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Erro no upload');
        return data.url;
    }
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
            const html = `
                <div class="detail-header">
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

        window.scrollTo({ top: 0, behavior: 'smooth' });
        this.loadSectionData(sectionId);
    },

    loadSectionData(sectionId) {
        switch (sectionId) {
            case 'section-dashboard': Dashboard.loadAll(); break;
            case 'section-register-product': ProductForm.loadRecentProducts(); break;
            case 'section-register-movement': MovementForm.loadRecentMovements(); break;
            case 'section-edit-product': EditProduct.onEnter(); break;
        }
    }
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
            const data = await API.get('/products?sort=sales_count&order=DESC&limit=5');
            const products = data.products || [];
            if (products.length === 0) {
                container.innerHTML = '<p class="table-empty">Nenhum produto cadastrado ainda.</p>';
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
            const allMovements = movementsArrays.flat()
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
            container.innerHTML = `<div class="movement-list">${allMovements.map(m => {
                const type = m.movement_type || 'adjustment';
                const typeLabel = { in: 'Entrada', out: 'Saída', adjustment: 'Ajuste', return: 'Devolução' }[type] || type;
                const valueSign = type === 'in' || type === 'return' ? '+' : type === 'out' ? '-' : '';
                return `
                    <div class="movement-item ${type}">
                        <div class="movement-icon ${type}"><i class="fas ${iconMap[type]}"></i></div>
                        <div class="movement-info">
                            <div class="movement-title">${Utils.escapeHtml(m.product_name)}</div>
                            <div class="movement-meta">${typeLabel} · ${Utils.formatDate(m.created_at)}</div>
                        </div>
                        <div class="movement-value ${type}">${valueSign}${m.quantity}</div>
                    </div>
                `;
            }).join('')}</div>`;
        } catch (error) {
            console.error(error);
            container.innerHTML = '<p class="table-empty">Erro ao carregar movimentações.</p>';
        }
    }
};

// ======================================================
// FORMULÁRIO DE PRODUTO (cadastro)
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
            const root = this.treeData.find(c => c.id === rootId);
            const gender = root?.children?.find(g => g.id === genderId);

            typeSelect.innerHTML = '<option value="">Selecione o tipo</option>';
            if (gender && gender.children?.length) {
                gender.children.forEach(t => {
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
            tree.forEach(c => {
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
                brands.map(b => `<option value="${b.id}">${Utils.escapeHtml(b.name)}</option>`).join('');
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
                image_url: imageUrl || null
            };

            const product = await API.post('/products', data);

            if (data.stock_quantity > 0) {
                try {
                    await API.post('/inventory', {
                        product_id: product.id,
                        quantity: data.stock_quantity,
                        min_quantity: 5
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

            tbody.querySelectorAll('tr[data-product-id]').forEach(row => {
                row.addEventListener('click', async () => {
                    const id = row.dataset.productId;
                    DetailModal.open();
                    try {
                        const product = await API.get(`/products/${id}`);
                        DetailModal.showProduct(product);
                    } catch (err) {
                        Toast.error('Erro ao carregar produto');
                        DetailModal.close();
                    }
                });
            });
        } catch (error) {
            console.error(error);
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

        // ✅ Toda a linha do campo de produto abre o picker
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

        // Botão "Selecionar" também abre
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
                notes: formData.get('notes') || null
            };

            const result = await API.post(`/inventory/${inventoryId}/movement`, data);
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
            const allMovements = movementsArrays.flat()
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .slice(0, 15);
            if (allMovements.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="table-empty">Nenhuma movimentação registrada.</td></tr>';
                return;
            }
            tbody.innerHTML = allMovements.map(m => {
                const typeLabel = { in: 'Entrada', out: 'Saída', adjustment: 'Ajuste', return: 'Devolução' }[m.movement_type] || m.movement_type;
                return `
                    <tr>
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
        } catch (error) {
            console.error(error);
            tbody.innerHTML = '<tr><td colspan="7" class="table-empty">Erro ao carregar movimentações.</td></tr>';
        }
    }
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
        results.innerHTML = products.map(p => `
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

        results.querySelectorAll('.search-result-item').forEach(item => {
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
        container.querySelectorAll('button[data-page]').forEach(btn => {
            btn.addEventListener('click', () => this.search(parseInt(btn.dataset.page)));
        });
    },

    async openProduct(productId) {
        try {
            const product = await API.get(`/products/${productId}`);
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

        gallery.innerHTML = images.map(img => `
            <div class="image-gallery-item ${img.primary ? 'primary' : ''}" data-image-id="${img.id}">
                ${img.primary ? '<span class="image-gallery-badge">Principal</span>' : ''}
                <img src="${img.url}" alt="${Utils.escapeHtml(img.alt || product.name)}">
                <div class="image-gallery-actions">
                    ${!img.primary ? `<button data-action="primary" data-image-id="${img.id}" title="Definir como principal"><i class="fas fa-star"></i></button>` : ''}
                    <button class="delete" data-action="delete" data-image-id="${img.id}" title="Remover"><i class="fas fa-trash-alt"></i></button>
                </div>
            </div>
        `).join('');

        gallery.querySelectorAll('button[data-action]').forEach(btn => {
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
                        alt_text: this.currentProduct.name
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
            { key: 'is_best_seller', label: 'Mais Vendido', type: 'checkbox', value: product.is_best_seller }
        ];

        container.innerHTML = fields.map(f => this.buildFieldEditor(f)).join('');

        container.querySelectorAll('.btn-save-field').forEach(btn => {
            btn.addEventListener('click', () => this.saveField(btn.dataset.field));
        });

        container.querySelectorAll('input[type="text"], input[type="number"]').forEach(input => {
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
    }
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

        // ✅ Toggle de filtros
        const toggleBtn = document.getElementById('pickerToggleFilters');
        const filtersPanel = document.getElementById('pickerFilters');
        toggleBtn?.addEventListener('click', () => {
            const isOpen = toggleBtn.classList.contains('open');
            toggleBtn.classList.toggle('open', !isOpen);
            filtersPanel.style.display = isOpen ? 'none' : 'flex';
        });

        // Aplicar filtros
        document.getElementById('pickerApplyFilters')?.addEventListener('click', () => {
            this.readFilters();
            this.filters.page = 1;
            this.load();
            this.updateFiltersBadge();
        });

        // Limpar filtros
        document.getElementById('pickerClearFilters')?.addEventListener('click', () => {
            this.clearFilters();
            this.updateFiltersBadge();
            this.load();
        });

        // Enter no campo de busca aplica
        document.getElementById('pickerSearch')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.readFilters();
                this.filters.page = 1;
                this.load();
                this.updateFiltersBadge();
            }
        });

        // Selects aplicam automaticamente
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

        // Por padrão, filtros ficam fechados ao abrir
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
                limit: this.limit
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

        list.innerHTML = products.map(p => {
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

        list.querySelectorAll('.picker-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = parseInt(item.dataset.productId);
                const product = products.find(p => p.id === id);
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
        container.querySelectorAll('button[data-page]').forEach(btn => {
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
    }
};

// ======================================================
// INICIALIZAÇÃO
// ======================================================
document.addEventListener('DOMContentLoaded', async () => {
    Toast.init();
    Navigation.init();
    DetailModal.init();
    ProductPicker.init();

    await ProductForm.init();
    await MovementForm.init();

    EditProduct.onEnter();

    document.querySelectorAll('.kpi-card').forEach(card => {
        card.addEventListener('click', () => {
            const type = card.dataset.kpi;
            if (type) Toast.info(`Detalhes de ${type} — em breve`);
        });
    });

    document.getElementById('refreshDashboard')?.addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        btn.classList.add('loading');
        await Dashboard.loadAll();
        setTimeout(() => btn.classList.remove('loading'), 500);
        Toast.info('Dashboard atualizado');
    });

    Dashboard.loadAll();
    console.log('✅ Admin - Sistema carregado com sucesso!');
});