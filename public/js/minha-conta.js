// ======================================================
// public/js/minha-conta.js
// Página de conta do usuário
// Depende de: core/utils.js, core/api.js, core/components.js
// ======================================================
(function () {
    'use strict';

    const U = window.LuxuryUtils;
    const API = window.LuxuryAPI;
    const C = window.LuxuryComponents;

    // ==================================================
    // PÁGINA
    // ==================================================
    const AccountPage = {
        user: null,

        async init() {
            // Exige login
            if (!API.isLoggedIn()) {
                window.location.href = '/login';
                return;
            }

            await this.loadUser();
            this.initTabs();
            this.initForms();
            this.initMasks();
            this.initCepLookup();
            this.initPasswordToggles();
            this.initDeleteAccount();
            this.initLogout();
            this.loadOrders();

        },

        // ==================================================
        // CARREGAR USUÁRIO
        // ==================================================
        async loadUser() {
            try {
                const user = await API.get('/auth/me');
                this.user = user;
                this.fillForms();
                this.renderSidebar();

                document.getElementById('accountLoading').style.display = 'none';
                document.getElementById('accountContent').style.display = 'grid';
            } catch (error) {
                console.error('Erro ao carregar usuário:', error);
                C.createToast('Erro ao carregar dados', 'error');
            }
        },

        renderSidebar() {
            const user = this.user;
            const initial = (user.full_name || 'U').charAt(0).toUpperCase();
            document.getElementById('accountAvatar').textContent = initial;
            document.getElementById('sidebarName').textContent = user.full_name || '—';
            document.getElementById('sidebarEmail').textContent = user.email || '—';
        },

        fillForms() {
            const user = this.user;

            // Profile
            document.getElementById('accFullName').value = user.full_name || '';
            document.getElementById('accBirthDate').value = user.birth_date
                ? user.birth_date.split('T')[0]
                : '';
            document.getElementById('accGender').value = user.gender || '';
            document.getElementById('accCpf').value = user.cpf || '';
            document.getElementById('accPhone').value = user.phone || '';
            document.getElementById('accEmail').value = user.email || '';

            // Address
            document.getElementById('accCep').value = user.cep || '';
            document.getElementById('accStreet').value = user.street || '';
            document.getElementById('accNumber').value = user.number || '';
            document.getElementById('accComplement').value = user.complement || '';
            document.getElementById('accNeighborhood').value = user.neighborhood || '';
            document.getElementById('accCity').value = user.city || '';
            document.getElementById('accState').value = user.state || '';
        },

        // ==================================================
        // TABS
        // ==================================================
        initTabs() {
            // ==================================================
            // Sidebar (desktop) — troca painel ativo
            // ==================================================
            document.querySelectorAll('.account-nav-item[data-tab]').forEach((btn) => {
                btn.addEventListener('click', () => {
                    const tab = btn.dataset.tab;

                    // Marca o botão ativo
                    document.querySelectorAll('.account-nav-item').forEach((b) => b.classList.remove('active'));
                    btn.classList.add('active');

                    // Fecha todos os accordions
                    document.querySelectorAll('.account-accordion-item').forEach((item) => {
                        item.classList.remove('active');
                    });

                    // Abre o accordion correspondente
                    const target = document.querySelector(`.account-accordion-item[data-accordion="${tab}"]`);
                    if (target) {
                        target.classList.add('active');
                        const header = target.querySelector('.account-accordion-header');
                        if (header) header.setAttribute('aria-expanded', 'true');
                    }

                    // Rola até o painel
                    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                });
            });

            // ==================================================
            // Accordion (mobile) — abre/fecha ao clicar no header
            // ==================================================
            document.querySelectorAll('.account-accordion-header').forEach((header) => {
                header.addEventListener('click', () => {
                    const item = header.closest('.account-accordion-item');
                    const isActive = item.classList.contains('active');

                    // Fecha todos
                    document.querySelectorAll('.account-accordion-item').forEach((el) => {
                        el.classList.remove('active');
                        const h = el.querySelector('.account-accordion-header');
                        if (h) h.setAttribute('aria-expanded', 'false');
                    });

                    // Se não estava ativo, abre
                    if (!isActive) {
                        item.classList.add('active');
                        header.setAttribute('aria-expanded', 'true');
                    }

                    // Marca o botão correspondente na sidebar (se existir)
                    const tab = item.dataset.accordion;
                    document.querySelectorAll('.account-nav-item').forEach((b) => {
                        b.classList.toggle('active', b.dataset.tab === tab);
                    });
                });
            });

            // ==================================================
            // Botão "Sair" (mobile)
            // ==================================================
            document.getElementById('logoutBtnMobile')?.addEventListener('click', async () => {
                try {
                    await API.post('/auth/logout', {});
                } catch {
                    // ignora
                }
                API.clearSession();
                window.location.href = '/';
            });
        },

        // ==================================================
        // FORMS
        // ==================================================
        initForms() {
            // ===== Perfil =====
            document.getElementById('profileForm')?.addEventListener('submit', async (e) => {
                e.preventDefault();
                const btn = document.getElementById('saveProfileBtn');
                const originalText = btn.innerHTML;
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';

                try {
                    const data = {
                        full_name: document.getElementById('accFullName').value.trim(),
                        birth_date: document.getElementById('accBirthDate').value || null,
                        gender: document.getElementById('accGender').value || null,
                        cpf: document.getElementById('accCpf').value || null,
                        phone: document.getElementById('accPhone').value || null,
                    };
                    const result = await API.put('/users/me', data);
                    this.user = result.user;
                    API.setUser(result.user);
                    this.renderSidebar();
                    C.createToast('Dados salvos com sucesso!', 'success');
                } catch (error) {
                    C.createToast(error.data?.error || 'Erro ao salvar dados', 'error');
                } finally {
                    btn.disabled = false;
                    btn.innerHTML = originalText;
                }
            });

            // ===== Endereço =====
            document.getElementById('addressForm')?.addEventListener('submit', async (e) => {
                e.preventDefault();
                const btn = document.getElementById('saveAddressBtn');
                const originalText = btn.innerHTML;
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';

                try {
                    const data = {
                        cep: document.getElementById('accCep').value || null,
                        street: document.getElementById('accStreet').value || null,
                        number: document.getElementById('accNumber').value || null,
                        complement: document.getElementById('accComplement').value || null,
                        neighborhood: document.getElementById('accNeighborhood').value || null,
                        city: document.getElementById('accCity').value || null,
                        state: document.getElementById('accState').value || null,
                    };
                    const result = await API.put('/users/me', data);
                    this.user = result.user;
                    API.setUser(result.user);
                    C.createToast('Endereço salvo com sucesso!', 'success');
                } catch (error) {
                    C.createToast(error.data?.error || 'Erro ao salvar endereço', 'error');
                } finally {
                    btn.disabled = false;
                    btn.innerHTML = originalText;
                }
            });

            // ===== Senha =====
            document.getElementById('passwordForm')?.addEventListener('submit', async (e) => {
                e.preventDefault();
                const current = document.getElementById('accCurrentPassword').value;
                const newPass = document.getElementById('accNewPassword').value;
                const confirm = document.getElementById('accConfirmPassword').value;

                if (newPass.length < 6) {
                    C.createToast('Nova senha deve ter pelo menos 6 caracteres', 'error');
                    return;
                }
                if (newPass !== confirm) {
                    C.createToast('As senhas não conferem', 'error');
                    return;
                }

                const btn = document.getElementById('savePasswordBtn');
                const originalText = btn.innerHTML;
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Alterando...';

                try {
                    await API.put('/users/me/password', {
                        current_password: current,
                        new_password: newPass,
                    });
                    C.createToast('Senha alterada com sucesso!', 'success');
                    document.getElementById('passwordForm').reset();
                } catch (error) {
                    C.createToast(error.data?.error || 'Erro ao alterar senha', 'error');
                } finally {
                    btn.disabled = false;
                    btn.innerHTML = originalText;
                }
            });
        },

        // ==================================================
        // MÁSCARAS
        // ==================================================
        initMasks() {
            const cpf = document.getElementById('accCpf');
            const phone = document.getElementById('accPhone');
            const cep = document.getElementById('accCep');

            cpf?.addEventListener('input', (e) => {
                e.target.value = U.maskCpf(e.target.value);
            });
            phone?.addEventListener('input', (e) => {
                e.target.value = U.maskPhone(e.target.value);
            });
            cep?.addEventListener('input', (e) => {
                e.target.value = U.maskCep(e.target.value);
            });
        },

        // ==================================================
        // CONSULTA DE CEP
        // ==================================================
        initCepLookup() {
            const cepInput = document.getElementById('accCep');
            const status = document.getElementById('accCepStatus');

            if (!cepInput) return;

            let lastCep = '';

            cepInput.addEventListener('blur', async () => {
                const cep = cepInput.value.replace(/\D/g, '');
                if (cep.length !== 8 || cep === lastCep) return;
                lastCep = cep;

                status.className = 'cep-status loading';

                try {
                    const data = await API.get(`/cep/${cep}`);
                    document.getElementById('accStreet').value = data.street || '';
                    document.getElementById('accNeighborhood').value = data.neighborhood || '';
                    document.getElementById('accCity').value = data.city || '';
                    document.getElementById('accState').value = data.state || '';
                    document.getElementById('accComplement').value = data.complement || '';
                    status.className = 'cep-status success';
                    document.getElementById('accNumber')?.focus();
                } catch (error) {
                    status.className = 'cep-status error';
                    ['accStreet', 'accNeighborhood', 'accCity', 'accState'].forEach((id) => {
                        const el = document.getElementById(id);
                        if (el) el.value = '';
                    });
                }
            });
        },

        // ==================================================
        // TOGGLE DE SENHA
        // ==================================================
        initPasswordToggles() {
            document.querySelectorAll('.toggle-password').forEach((btn) => {
                btn.addEventListener('click', () => {
                    const input = document.getElementById(btn.dataset.target);
                    if (!input) return;
                    const isPassword = input.type === 'password';
                    input.type = isPassword ? 'text' : 'password';
                    btn.innerHTML = `<i class="fas fa-eye${isPassword ? '-slash' : ''}"></i>`;
                    btn.setAttribute('aria-label', isPassword ? 'Ocultar senha' : 'Mostrar senha');
                });
            });
        },

        // ==================================================
        // EXCLUIR CONTA
        // ==================================================
        initDeleteAccount() {
            const deleteBtn = document.getElementById('deleteAccountBtn');
            if (!deleteBtn) return;

            deleteBtn.addEventListener('click', () => {
                this.openDeleteModal();
            });
        },

        openDeleteModal() {
            const modal = document.createElement('div');
            modal.className = 'danger-modal active';
            modal.id = 'deleteAccountModal';
            modal.innerHTML = `
                <div class="danger-modal-content">
                    <h2><i class="fas fa-exclamation-triangle"></i> Excluir conta</h2>
                    <p>Tem certeza que deseja excluir sua conta? Esta ação <strong>não pode ser desfeita</strong>. Todos os seus dados de perfil serão desativados.</p>

                    <div class="form-field">
                        <label for="deletePassword">Confirme sua senha</label>
                        <input type="password" id="deletePassword" placeholder="Sua senha atual">
                    </div>

                    <div class="form-field">
                        <label for="deleteConfirmation">Digite <strong>EXCLUIR</strong> para confirmar</label>
                        <input type="text" id="deleteConfirmation" placeholder="EXCLUIR">
                    </div>

                    <div class="danger-modal-actions">
                        <button type="button" class="btn-cancel" id="cancelDelete">Cancelar</button>
                        <button type="button" class="btn-confirm-delete" id="confirmDelete" disabled>
                            <i class="fas fa-trash-alt"></i> Excluir definitivamente
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            document.body.style.overflow = 'hidden';

            const passwordInput = modal.querySelector('#deletePassword');
            const confirmInput = modal.querySelector('#deleteConfirmation');
            const confirmBtn = modal.querySelector('#confirmDelete');
            const cancelBtn = modal.querySelector('#cancelDelete');

            // Habilita botão só se confirmação estiver correta
            confirmInput.addEventListener('input', () => {
                confirmBtn.disabled = confirmInput.value !== 'EXCLUIR';
            });

            const close = () => {
                modal.remove();
                document.body.style.overflow = '';
            };

            cancelBtn.addEventListener('click', close);
            modal.addEventListener('click', (e) => {
                if (e.target === modal) close();
            });

            confirmBtn.addEventListener('click', async () => {
                const password = passwordInput.value;
                const confirmation = confirmInput.value;

                if (!password) {
                    C.createToast('Digite sua senha', 'error');
                    return;
                }

                confirmBtn.disabled = true;
                confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Excluindo...';

try {
    await API.deleteWithBody('/users/me', {
        password,
        confirmation,
    });

    API.clearSession();
                    C.createToast('Conta excluída. Redirecionando...', 'success');
                    setTimeout(() => {
                        window.location.href = '/';
                    }, 1500);
                } catch (error) {
                    C.createToast(error.data?.error || 'Erro ao excluir conta', 'error');
                    confirmBtn.disabled = false;
                    confirmBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Excluir definitivamente';
                }
            });
        },

                // ==================================================
        // MEUS PEDIDOS — listar
        // ==================================================
        async loadOrders(page = 1) {
            const container = document.getElementById('ordersListContainer');
            const pagination = document.getElementById('ordersPagination');
            if (!container) return;

            container.innerHTML = `
                <div class="loading-state">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>Carregando pedidos...</span>
                </div>
            `;
            if (pagination) pagination.innerHTML = '';

            try {
                const data = await API.get(`/orders?page=${page}&limit=5`);
                const orders = data.orders || [];

                if (orders.length === 0) {
                    container.innerHTML = `
                        <div class="orders-empty">
                            <i class="fas fa-shopping-bag"></i>
                            <h3>Nenhum pedido ainda</h3>
                            <p>Você ainda não fez nenhuma compra.</p>
                            <a href="/produtos" class="btn btn-primary">
                                <i class="fas fa-shopping-basket"></i>
                                Começar a comprar
                            </a>
                        </div>
                    `;
                    return;
                }

                container.innerHTML = orders.map((order) => this.buildOrderCard(order)).join('');

                // Bind clicks
                container.querySelectorAll('.order-card').forEach((card) => {
                    card.addEventListener('click', () => {
                        const id = card.dataset.orderId;
                        window.location.href = `/pedido/${id}`;
                    });
                });

                if (pagination) {
                    this.renderOrdersPagination(pagination, data.pagination);
                }
            } catch (error) {
                console.error('Erro ao carregar pedidos:', error);
                container.innerHTML = `
                    <div class="orders-empty">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h3>Erro ao carregar pedidos</h3>
                        <p>Tente novamente em alguns instantes.</p>
                    </div>
                `;
            }
        },

        // ==================================================
        // MEUS PEDIDOS — card
        // ==================================================
        buildOrderCard(order) {
            const statusMap = {
                pending: { label: 'Aguardando pagamento', class: 'warning', icon: 'fa-hourglass-half' },
                paid: { label: 'Pagamento aprovado', class: 'success', icon: 'fa-check-circle' },
                shipped: { label: 'Em transporte', class: 'info', icon: 'fa-truck' },
                delivered: { label: 'Entregue', class: 'success', icon: 'fa-box-open' },
                cancelled: { label: 'Cancelado', class: 'danger', icon: 'fa-times-circle' },
            };
            const status = statusMap[order.status] || statusMap.pending;

            const firstItem = order.first_item || {};
            const img = firstItem.url
                ? `<img src="${U.escapeAttr(firstItem.url)}" alt="${U.escapeAttr(firstItem.name || '')}">`
                : `<i class="fas fa-image"></i>`;

            const date = U.formatDate(order.created_at);
            const itemsLabel = order.items_count === 1
                ? '1 item'
                : `${order.items_count} itens`;

            return `
                <div class="order-card" data-order-id="${order.id}">
                    <div class="order-card-image">${img}</div>
                    <div class="order-card-info">
                        <div class="order-card-header">
                            <strong>Pedido #${order.id}</strong>
                            <span class="order-card-status status-${status.class}">
                                <i class="fas ${status.icon}"></i>
                                ${status.label}
                            </span>
                        </div>
                        <div class="order-card-meta">
                            ${itemsLabel} · ${date}
                        </div>
                    </div>
                    <div class="order-card-price">
                        <strong>${U.formatPrice(order.total)}</strong>
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </div>
            `;
        },

        // ==================================================
        // MEUS PEDIDOS — paginação
        // ==================================================
        renderOrdersPagination(container, pagination) {
            const { page, pages } = pagination;
            if (pages <= 1) {
                container.innerHTML = '';
                return;
            }

            const buttons = [];
            buttons.push(`<button ${page === 1 ? 'disabled' : ''} data-page="${page - 1}">«</button>`);
            for (let i = 1; i <= pages; i++) {
                buttons.push(`<button class="${i === page ? 'active' : ''}" data-page="${i}">${i}</button>`);
            }
            buttons.push(`<button ${page === pages ? 'disabled' : ''} data-page="${page + 1}">»</button>`);

            container.innerHTML = buttons.join('');

            container.querySelectorAll('button[data-page]').forEach((btn) => {
                btn.addEventListener('click', () => {
                    const p = parseInt(btn.dataset.page);
                    if (p >= 1 && p <= pages && p !== page) {
                        this.loadOrders(p);
                    }
                });
            });
        },

        // ==================================================
        // LOGOUT
        // ==================================================
        initLogout() {
            document.getElementById('logoutBtn')?.addEventListener('click', async () => {
                try {
                    await API.post('/auth/logout', {});
                } catch {
                    // ignora erro, apenas limpa local
                }
                API.clearSession();
                window.location.href = '/';
            });
        },
    };

    // ======================================================
    // INICIALIZAÇÃO
    // ======================================================
    document.addEventListener('DOMContentLoaded', () => AccountPage.init());
})();