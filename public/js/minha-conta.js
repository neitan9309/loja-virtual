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

    const FAVORITES_SORT_KEY = 'luxury_favorites_sort';

    // ==================================================
    // PÁGINA
    // ==================================================
    const AccountPage = {
        user: null,
        favoritesSort: 'recent',
        favoritesCache: [],
        addingAllInProgress: false,

        async init() {
            if (!API.isLoggedIn()) {
                window.location.href = '/login';
                return;
            }

            const savedSort = sessionStorage.getItem(FAVORITES_SORT_KEY);
            if (savedSort) this.favoritesSort = savedSort;

            await this.loadUser();
            this.initTabs();
            this.initForms();
            this.initMasks();
            this.initPasswordToggles();
            this.initDeleteAccount();
            this.initLogout();
            this.initFavoritesToolbar();
            
            // Novas inicializações de endereço
            this.initAddressSection();
            await this.loadAddresses();

            this.loadOrders();
            this.loadFavorites();
        },

        // ==================================================
        // USUÁRIO
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

            document.getElementById('accFullName').value = user.full_name || '';
            document.getElementById('accBirthDate').value = user.birth_date
                ? user.birth_date.split('T')[0]
                : '';
            document.getElementById('accGender').value = user.gender || '';
            document.getElementById('accCpf').value = user.cpf || '';
            document.getElementById('accPhone').value = user.phone || '';
            document.getElementById('accEmail').value = user.email || '';
        },

        // ==================================================
        // TABS
        // ==================================================
        initTabs() {
            // Sidebar (desktop) e Accordion (mobile)
            document.querySelectorAll('.account-nav-item[data-tab]').forEach((btn) => {
                btn.addEventListener('click', (e) => {
                    // Verifica se o clique foi originado pelo usuário ou pelo código (isTrusted)
                    const isUserClick = e.isTrusted;
                    const tab = btn.dataset.tab;

                    // 1. Atualiza classes ativas do menu
                    document.querySelectorAll('.account-nav-item').forEach((b) => b.classList.remove('active'));
                    btn.classList.add('active');

                    // 2. Atualiza classes ativas dos painéis
                    document.querySelectorAll('.account-accordion-item').forEach((item) => {
                        item.classList.remove('active');
                    });

                    const target = document.querySelector(`.account-accordion-item[data-accordion="${tab}"]`);
                    if (target) {
                        target.classList.add('active');
                        const header = target.querySelector('.account-accordion-header');
                        if (header) header.setAttribute('aria-expanded', 'true');
                    }

                    // ==================================================
                    // ✅ CORREÇÃO DEFINITIVA DA ROLAGEM
                    // ==================================================
                    // Só rola se for um clique do usuário E se estiver no mobile
                    if (isUserClick && window.innerWidth <= 900) {
                        // Pequeno atraso para garantir que o DOM foi atualizado
                        setTimeout(() => {
                            const elementPosition = target.getBoundingClientRect().top;
                            // Subtrai a altura do header fixo (aprox. 100px) para não esconder atrás dele
                            const offsetPosition = elementPosition + window.pageYOffset - 100;

                            window.scrollTo({
                                top: offsetPosition,
                                behavior: 'smooth'
                            });
                        }, 50);
                    }

                    // 3. Carrega dados sob demanda
                    if (tab === 'favorites') this.loadFavorites();
                    if (tab === 'address') this.loadAddresses();
                });
            });

            // Accordion (mobile) - Clique direto no cabeçalho do accordion
            document.querySelectorAll('.account-accordion-header').forEach((header) => {
                header.addEventListener('click', () => {
                    const item = header.closest('.account-accordion-item');
                    const isActive = item.classList.contains('active');

                    document.querySelectorAll('.account-accordion-item').forEach((el) => {
                        el.classList.remove('active');
                        const h = el.querySelector('.account-accordion-header');
                        if (h) h.setAttribute('aria-expanded', 'false');
                    });

                    if (!isActive) {
                        item.classList.add('active');
                        header.setAttribute('aria-expanded', 'true');
                        if (item.dataset.accordion === 'favorites') this.loadFavorites();
                        if (item.dataset.accordion === 'address') this.loadAddresses();
                    }

                    const tab = item.dataset.accordion;
                    document.querySelectorAll('.account-nav-item').forEach((b) => {
                        b.classList.toggle('active', b.dataset.tab === tab);
                    });
                });
            });

            // Logout mobile
            document.getElementById('logoutBtnMobile')?.addEventListener('click', async () => {
                try {
                    await API.post('/auth/logout', {});
                } catch { /* ignora */ }
                API.clearSession();
                if (window.LuxuryWishlist) window.LuxuryWishlist.clear();
                window.location.href = '/';
            });

            // URL ?tab=favorites
            const params = new URLSearchParams(window.location.search);
            if (params.get('tab') === 'favorites') {
                const favBtn = document.querySelector('.account-nav-item[data-tab="favorites"]');
                if (favBtn) {
                    // O setTimeout 100ms garante que o carregamento inicial da página
                    // (que às vezes restaura a posição do scroll) já tenha terminado.
                    setTimeout(() => {
                        // Como o clique é programático, o 'isTrusted' será false, 
                        // então a rolagem do mobile NÃO será ativada.
                        favBtn.click();
                    }, 100);
                }
            }
        },

        // ==================================================
        // FORMS (Perfil e Senha)
        // ==================================================
        initForms() {
            // Perfil
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

            // Senha
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

            cpf?.addEventListener('input', (e) => {
                e.target.value = U.maskCpf(e.target.value);
            });
            phone?.addEventListener('input', (e) => {
                e.target.value = U.maskPhone(e.target.value);
            });
        },

        // ==================================================
        // TOGGLE SENHA
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
                    await API.deleteWithBody('/users/me', { password, confirmation });

                    API.clearSession();
                    if (window.LuxuryWishlist) window.LuxuryWishlist.clear();
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
        // ENDEREÇOS
        // ==================================================
        initAddressSection() {
            document.getElementById('btnNewAddress')?.addEventListener('click', () => this.openAddressModal());
        },

        async loadAddresses() {
            const container = document.getElementById('addressListContainer');
            if (!container) return;

            container.innerHTML = `
                <div class="loading-state">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>Carregando endereços...</span>
                </div>
            `;

            try {
                const addresses = await API.get('/addresses');
                if (addresses.length === 0) {
                    container.innerHTML = `
                        <div class="orders-empty">
                            <i class="fas fa-map-marker-alt"></i>
                            <h3>Nenhum endereço cadastrado</h3>
                            <p>Cadastre um endereço para agilizar suas compras.</p>
                        </div>
                    `;
                    return;
                }

                container.innerHTML = addresses.map(addr => this.buildAddressCard(addr)).join('');

                // ✅ CORREÇÃO: Vinculando os eventos corretamente, capturando o ID numérico
                container.querySelectorAll('[data-address-action]').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const action = btn.dataset.addressAction;
                        const id = parseInt(btn.dataset.addressId, 10); // Garante que é um número

                        if (action === 'delete') this.deleteAddress(id);
                        if (action === 'default') this.setDefaultAddress(id);
                        if (action === 'edit') this.openAddressModal(id);
                    });
                });
            } catch (error) {
                container.innerHTML = '<p class="table-empty">Erro ao carregar endereços.</p>';
            }
        },

        buildAddressCard(addr) {
            return `
                <div class="address-card ${addr.is_default ? 'is-default' : ''}">
                    <div class="address-card-info">
                        <div class="address-card-label">
                            ${U.escapeHtml(addr.label)}
                            ${addr.is_default ? '<span class="badge-default">Padrão</span>' : ''}
                        </div>
                        <div class="address-card-text">
                            ${U.escapeHtml(addr.street)}, ${U.escapeHtml(addr.number)} ${addr.complement ? '· ' + U.escapeHtml(addr.complement) : ''}<br>
                            ${U.escapeHtml(addr.neighborhood)} · ${U.escapeHtml(addr.city)} - ${U.escapeHtml(addr.state)}<br>
                            CEP: ${U.escapeHtml(addr.cep)}
                        </div>
                    </div>
                    <div class="address-card-actions">
                        ${!addr.is_default ? `<button class="btn-icon" data-address-action="default" data-address-id="${addr.id}" title="Tornar padrão"><i class="fas fa-star"></i></button>` : ''}
                        <button class="btn-icon" data-address-action="edit" data-address-id="${addr.id}" title="Editar"><i class="fas fa-edit"></i></button>
                        <button class="btn-icon delete" data-address-action="delete" data-address-id="${addr.id}" title="Remover"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </div>
            `;
        },

        openAddressModal(addressId = null) {
            const modal = document.createElement('div');
            modal.className = 'modal active';
            modal.innerHTML = `
                <div class="modal-content modal-address" style="max-width: 500px; padding: 2rem;">
                    <button class="close-modal" aria-label="Fechar">&times;</button>
                    <h2 style="margin-bottom: 1.5rem; text-transform: uppercase; font-size: 1.2rem; text-align: center;">
                        ${addressId ? 'Editar Endereço' : 'Novo Endereço'}
                    </h2>
                    
                    <form id="addressModalForm" class="address-form">
                        <div class="address-form-field">
                            <label>Identificação (Ex: Casa, Trabalho) *</label>
                            <input type="text" name="label" required maxlength="50" placeholder="Ex: Minha Casa">
                        </div>
                        
                        <div class="address-form-field">
                            <label>CEP *</label>
                            <input type="text" name="cep" id="modalCep" required maxlength="9" inputmode="numeric" placeholder="00000-000">
                        </div>
                        
                        <div class="address-form-field">
                            <label>Rua *</label>
                            <input type="text" name="street" id="modalStreet" required readonly placeholder="Preenchido pelo CEP">
                        </div>
                        
                        <div class="address-form-row">
                            <div class="address-form-field">
                                <label>Número *</label>
                                <input type="text" name="number" id="modalNumber" required placeholder="123">
                            </div>
                            <div class="address-form-field">
                                <label>Complemento</label>
                                <input type="text" name="complement" id="modalComplement" placeholder="Apto, bloco...">
                            </div>
                        </div>
                        
                        <div class="address-form-field">
                            <label>Bairro *</label>
                            <input type="text" name="neighborhood" id="modalNeighborhood" required readonly placeholder="Preenchido pelo CEP">
                        </div>
                        
                        <div class="address-form-row">
                            <div class="address-form-field">
                                <label>Cidade *</label>
                                <input type="text" name="city" id="modalCity" required readonly placeholder="Preenchido pelo CEP">
                            </div>
                            <div class="address-form-field">
                                <label>Estado *</label>
                                <input type="text" name="state" id="modalState" required readonly maxlength="2" placeholder="UF">
                            </div>
                        </div>
                        
                        <div class="address-form-field checkbox-field">
                            <label class="checkbox-label">
                                <input type="checkbox" name="is_default"> Definir como endereço padrão
                            </label>
                        </div>
                        
                        <div class="address-form-actions">
                            <button type="button" class="btn btn-secondary" id="cancelAddressBtn">Cancelar</button>
                            <button type="submit" class="btn btn-primary">Salvar</button>
                        </div>
                    </form>
                </div>
            `;
            document.body.appendChild(modal);
            document.body.style.overflow = 'hidden';

            const form = modal.querySelector('#addressModalForm');
            const cepInput = modal.querySelector('#modalCep');
            const closeBtn = modal.querySelector('.close-modal');
            const cancelBtn = modal.querySelector('#cancelAddressBtn');

            const closeModal = () => {
                modal.remove();
                document.body.style.overflow = '';
                document.removeEventListener('keydown', handleEsc);
            };

            const handleEsc = (e) => {
                if (e.key === 'Escape') closeModal();
            };
            document.addEventListener('keydown', handleEsc);

            closeBtn.addEventListener('click', closeModal);
            cancelBtn.addEventListener('click', closeModal);

            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeModal();
            });

            cepInput.addEventListener('input', (e) => {
                e.target.value = U.maskCep(e.target.value);
            });

            cepInput.addEventListener('blur', async () => {
                const cep = cepInput.value.replace(/\D/g, '');
                if (cep.length !== 8) return;
                try {
                    const data = await API.get(`/cep/${cep}`);
                    modal.querySelector('#modalStreet').value = data.street || '';
                    modal.querySelector('#modalNeighborhood').value = data.neighborhood || '';
                    modal.querySelector('#modalCity').value = data.city || '';
                    modal.querySelector('#modalState').value = data.state || '';
                    modal.querySelector('#modalNumber').focus();
                } catch (e) { /* ignora */ }
            });

            // ✅ CORREÇÃO: Preencher dados para edição usando o ID correto
            if (addressId) {
                API.get(`/addresses`).then(list => {
                    const addr = list.find(a => a.id === addressId);
                    if (addr) {
                        form.querySelector('[name="label"]').value = addr.label;
                        form.querySelector('[name="cep"]').value = addr.cep;
                        form.querySelector('[name="street"]').value = addr.street;
                        form.querySelector('[name="number"]').value = addr.number;
                        form.querySelector('[name="complement"]').value = addr.complement || '';
                        form.querySelector('[name="neighborhood"]').value = addr.neighborhood;
                        form.querySelector('[name="city"]').value = addr.city;
                        form.querySelector('[name="state"]').value = addr.state;
                        form.querySelector('[name="is_default"]').checked = addr.is_default;
                    }
                }).catch(err => {
                    console.error("Erro ao buscar endereço para edição:", err);
                    C.createToast('Erro ao carregar dados do endereço', 'error');
                    closeModal();
                });
            }

            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());
                data.is_default = formData.get('is_default') === 'on';

                try {
                    if (addressId) {
                        await API.put(`/addresses/${addressId}`, data);
                        C.createToast('Endereço atualizado!', 'success');
                    } else {
                        await API.post('/addresses', data);
                        C.createToast('Endereço criado!', 'success');
                    }
                    closeModal();
                    this.loadAddresses();
                } catch (error) {
                    C.createToast(error.data?.error || 'Erro ao salvar', 'error');
                }
            });
        },

        async deleteAddress(id) {
            if (!confirm('Remover este endereço?')) return;
            try {
                await API.delete(`/addresses/${id}`);
                C.createToast('Endereço removido', 'success');
                this.loadAddresses();
            } catch (error) {
                C.createToast('Erro ao remover', 'error');
            }
        },

        async setDefaultAddress(id) {
            try {
                await API.patch(`/addresses/${id}/default`, {});
                C.createToast('Endereço padrão atualizado', 'success');
                this.loadAddresses();
            } catch (error) {
                C.createToast('Erro ao definir padrão', 'error');
            }
        },

        // ==================================================
        // PEDIDOS
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

                container.querySelectorAll('.order-card').forEach((card) => {
                    card.addEventListener('click', () => {
                        window.location.href = `/pedido/${card.dataset.orderId}`;
                    });
                });

                if (pagination) this.renderOrdersPagination(pagination, data.pagination);
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
            const itemsLabel = order.items_count === 1 ? '1 item' : `${order.items_count} itens`;

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
                        <div class="order-card-meta">${itemsLabel} · ${date}</div>
                    </div>
                    <div class="order-card-price">
                        <strong>${U.formatPrice(order.total)}</strong>
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </div>
            `;
        },

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
                    if (p >= 1 && p <= pages && p !== page) this.loadOrders(p);
                });
            });
        },

        // ==================================================
        // FAVORITOS — Toolbar
        // ==================================================
        initFavoritesToolbar() {
            const sortSelect = document.getElementById('favoritesSort');
            if (sortSelect && !sortSelect.dataset.bound) {
                sortSelect.dataset.bound = 'true';
                sortSelect.value = this.favoritesSort;

                sortSelect.addEventListener('change', (e) => {
                    this.favoritesSort = e.target.value;
                    sessionStorage.setItem(FAVORITES_SORT_KEY, this.favoritesSort);
                    this.renderFavoritesGrid();
                });
            }

            const addAllBtn = document.getElementById('btnFavoritesAddAll');
            if (addAllBtn && !addAllBtn.dataset.bound) {
                addAllBtn.dataset.bound = 'true';
                addAllBtn.addEventListener('click', () => this.addAllToCart());
            }
        },

        // ==================================================
        // FAVORITOS — Load
        // ==================================================
        async loadFavorites() {
            const container = document.getElementById('favoritesContainer');
            if (!container) return;

            container.innerHTML = `
                <div class="favorites-skeleton">
                    <div class="favorites-skeleton-card"></div>
                    <div class="favorites-skeleton-card"></div>
                    <div class="favorites-skeleton-card"></div>
                    <div class="favorites-skeleton-card"></div>
                </div>
            `;

            try {
                const data = await API.get('/wishlist');
                this.favoritesCache = data.products || [];

                const toolbar = document.getElementById('favoritesToolbar');
                if (toolbar) toolbar.style.display = this.favoritesCache.length > 0 ? 'flex' : 'none';

                this.updateFavoritesCounters(this.favoritesCache.length);
                this.updatePriceAlert(this.favoritesCache);

                if (this.favoritesCache.length === 0) {
                    container.innerHTML = `
                        <div class="orders-empty">
                            <i class="far fa-heart"></i>
                            <h3>Nenhum favorito ainda</h3>
                            <p>Explore nossa coleção e salve os produtos que você amou.</p>
                            <a href="/produtos" class="btn btn-primary">
                                <i class="fas fa-shopping-basket"></i>
                                Explorar produtos
                            </a>
                        </div>
                    `;
                    return;
                }

                this.renderFavoritesGrid();
            } catch (error) {
                console.error('Erro ao carregar favoritos:', error);
                container.innerHTML = `
                    <div class="orders-empty">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h3>Erro ao carregar favoritos</h3>
                        <p>Tente novamente em alguns instantes.</p>
                    </div>
                `;
            }
        },

        // ==================================================
        // FAVORITOS — Render
        // ==================================================
        renderFavoritesGrid() {
            const container = document.getElementById('favoritesContainer');
            if (!container) return;

            const products = this.sortFavorites([...this.favoritesCache]);

            container.innerHTML = `<div class="favorites-grid" id="favoritesGrid"></div>`;
            const grid = container.querySelector('#favoritesGrid');

            grid.innerHTML = products.map((p) => {
                const cardHtml = C.renderProductCard(p, {
                    showShortDesc: false,
                    showButton: false,
                    clickableCard: false,
                    showWishlistButton: false,
                });

                const priceDroppedBadge = p.wishlist?.price_dropped
                    ? `<span class="price-dropped-badge">
                           <i class="fas fa-tag"></i>
                           Preço caiu
                       </span>`
                    : '';

                const extras = `
                    <div class="favorite-actions">
                        <button type="button" class="favorite-add-cart"
                                data-favorite-add-cart="${p.id}">
                            <i class="fas fa-shopping-bag"></i>
                            Adicionar ao carrinho
                        </button>
                        <button type="button" class="favorite-remove"
                                data-favorite-remove="${p.id}"
                                title="Remover dos favoritos"
                                aria-label="Remover dos favoritos">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                `;

                const href = `/produto/${p.slug}`;

                let finalCardHtml = cardHtml;
                if (priceDroppedBadge) {
                    finalCardHtml = finalCardHtml.replace(
                        /(<div class="product-image-wrapper">)/,
                        `$1${priceDroppedBadge}`
                    );
                }

                return finalCardHtml.replace(
                    /<article class="product-card">([\s\S]*?)<\/article>/,
                    `<div class="favorite-card-wrapper">
                        <a href="${U.escapeAttr(href)}" class="favorite-card-link"
                           aria-label="Ver ${U.escapeAttr(p.name)}">
                            <article class="product-card">$1</article>
                        </a>
                        ${extras}
                    </div>`
                );
            }).join('');

            grid.querySelectorAll('[data-favorite-remove]').forEach((btn) => {
                btn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const id = btn.dataset.favoriteRemove;
                    if (!window.LuxuryWishlist) return;
                    await window.LuxuryWishlist.toggle(id);
                    await this.loadFavorites();
                });
            });

            grid.querySelectorAll('[data-favorite-add-cart]').forEach((btn) => {
                btn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const id = parseInt(btn.dataset.favoriteAddCart);
                    if (!window.LuxuryCart) return;
                    try {
                        await window.LuxuryCart.addToCart(id, 1);
                        C.createToast('Adicionado ao carrinho', 'success');
                    } catch (err) {
                        C.createToast(err.data?.error || 'Erro ao adicionar', 'error');
                    }
                });
            });
        },

        // ==================================================
        // FAVORITOS — Ordenação
        // ==================================================
        sortFavorites(products) {
            const sort = this.favoritesSort;

            switch (sort) {
                case 'price_asc':
                    return products.sort((a, b) => {
                        const pa = parseFloat(a.price) * (1 - (a.discount_percent || 0) / 100);
                        const pb = parseFloat(b.price) * (1 - (b.discount_percent || 0) / 100);
                        return pa - pb;
                    });

                case 'price_desc':
                    return products.sort((a, b) => {
                        const pa = parseFloat(a.price) * (1 - (a.discount_percent || 0) / 100);
                        const pb = parseFloat(b.price) * (1 - (b.discount_percent || 0) / 100);
                        return pb - pa;
                    });

                case 'name_asc':
                    return products.sort((a, b) =>
                        String(a.name).localeCompare(String(b.name), 'pt-BR', { sensitivity: 'base' })
                    );

                case 'recent':
                default:
                    return products.sort((a, b) => {
                        const da = new Date(a.wishlist?.added_at || 0).getTime();
                        const db = new Date(b.wishlist?.added_at || 0).getTime();
                        return db - da;
                    });
            }
        },

        // ==================================================
        // FAVORITOS — Contadores
        // ==================================================
        updateFavoritesCounters(count) {
            const tabCount = document.getElementById('favoritesTabCount');
            if (tabCount) {
                if (count > 0) {
                    tabCount.textContent = count;
                    tabCount.hidden = false;
                } else {
                    tabCount.hidden = true;
                }
            }

            const panelCount = document.getElementById('favoritesPanelCount');
            if (panelCount) {
                if (count > 0) {
                    panelCount.textContent = `(${count})`;
                    panelCount.hidden = false;
                } else {
                    panelCount.hidden = true;
                }
            }
        },

        // ==================================================
        // FAVORITOS — Banner de queda de preço
        // ==================================================
        updatePriceAlert(products) {
            const alertEl = document.getElementById('favoritesPriceAlert');
            const alertText = document.getElementById('favoritesPriceAlertText');
            if (!alertEl || !alertText) return;

            const droppedCount = products.filter((p) => p.wishlist?.price_dropped).length;

            if (droppedCount === 0) {
                alertEl.style.display = 'none';
                return;
            }

            const totalSaved = products
                .filter((p) => p.wishlist?.price_dropped)
                .reduce((sum, p) => {
                    const oldPrice = parseFloat(p.wishlist.price_when_added);
                    const newPrice = parseFloat(p.price) * (1 - (p.discount_percent || 0) / 100);
                    return sum + Math.max(0, oldPrice - newPrice);
                }, 0);

            alertEl.style.display = 'flex';

            const productWord = droppedCount === 1 ? 'produto' : 'produtos';
            alertText.innerHTML = `
                <strong>${droppedCount} ${productWord}</strong>
                ${droppedCount === 1 ? 'baixou' : 'baixaram'} de preço!
                Você economizaria até <strong>${U.formatPrice(totalSaved)}</strong>.
            `;
        },

        // ==================================================
        // FAVORITOS — Adicionar todos ao carrinho
        // ==================================================
        async addAllToCart() {
            if (this.addingAllInProgress) return;

            if (!window.LuxuryCart) {
                C.createToast('Carrinho não disponível', 'error');
                return;
            }

            if (this.favoritesCache.length === 0) {
                C.createToast('Nenhum favorito para adicionar', 'info');
                return;
            }

            this.addingAllInProgress = true;
            const btn = document.getElementById('btnFavoritesAddAll');
            const originalHtml = btn?.innerHTML;

            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adicionando...';
            }

            const total = this.favoritesCache.length;
            let successCount = 0;
            const failures = [];

            for (const product of this.favoritesCache) {
                try {
                    await window.LuxuryCart.addToCart(product.id, 1);
                    successCount++;
                } catch (err) {
                    failures.push({
                        name: product.name,
                        reason: err.data?.error || err.message || 'Erro desconhecido',
                    });
                }

                if (btn) {
                    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${successCount + failures.length}/${total}`;
                }
            }

            this.addingAllInProgress = false;

            if (btn) {
                btn.disabled = false;
                btn.innerHTML = originalHtml;
            }

            if (failures.length === 0) {
                C.createToast(`${successCount} ${successCount === 1 ? 'produto adicionado' : 'produtos adicionados'} ao carrinho!`, 'success');
            } else if (successCount === 0) {
                C.createToast(`Nenhum produto foi adicionado. ${failures[0].reason}`, 'error');
            } else {
                const failureSummary = failures
                    .slice(0, 3)
                    .map((f) => `• ${f.name}: ${f.reason}`)
                    .join('\n');
                const moreCount = failures.length > 3 ? `\n...e mais ${failures.length - 3}` : '';

                C.createToast(
                    `${successCount} ${successCount === 1 ? 'adicionado' : 'adicionados'}, ${failures.length} falhou.\n\n${failureSummary}${moreCount}`,
                    'warning',
                    8000
                );
            }
        },

        // ==================================================
        // LOGOUT
        // ==================================================
        initLogout() {
            document.getElementById('logoutBtn')?.addEventListener('click', async () => {
                try {
                    await API.post('/auth/logout', {});
                } catch { /* ignora */ }
                API.clearSession();
                if (window.LuxuryWishlist) window.LuxuryWishlist.clear();
                window.location.href = '/';
            });
        },
    };

    // ======================================================
    // INICIALIZAÇÃO
    // ======================================================
    document.addEventListener('DOMContentLoaded', () => AccountPage.init());
})();