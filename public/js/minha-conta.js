// ======================================================
// PÁGINA MINHA CONTA - IIFE
// ======================================================
(function() {
    'use strict';

    const API_BASE = '/api';

    const Utils = {
        getToken() {
            return localStorage.getItem('luxury_token');
        },

        getUser() {
            try {
                return JSON.parse(localStorage.getItem('luxury_user') || 'null');
            } catch {
                return null;
            }
        },

        saveUser(user) {
            localStorage.setItem('luxury_user', JSON.stringify(user));
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
                if (response.status === 401) {
                    // Token expirado
                    this.clearSession();
                    window.location.href = '/login';
                    return;
                }
                const error = new Error(data.error || `Erro HTTP ${response.status}`);
                error.status = response.status;
                error.data = data;
                throw error;
            }
            return data;
        },

        get(path) { return this.request(path); },
        put(path, body) { return this.request(path, { method: 'PUT', body: JSON.stringify(body) }); },
        post(path, body) { return this.request(path, { method: 'POST', body: JSON.stringify(body) }); },

        maskCpf(value) {
            return value.replace(/\D/g, '').slice(0, 11)
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        },

        maskPhone(value) {
            const digits = value.replace(/\D/g, '').slice(0, 11);
            if (digits.length <= 10) {
                return digits.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
            }
            return digits.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
        },

        maskCep(value) {
            return value.replace(/\D/g, '').slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2');
        },

        feedback(message, type = 'success') {
            const existing = document.querySelector('.account-feedback');
            if (existing) existing.remove();

            const el = document.createElement('div');
            el.className = `account-feedback ${type}`;
            el.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-times-circle'}"></i> ${message}`;
            document.body.appendChild(el);

            setTimeout(() => el.classList.add('show'), 10);
            setTimeout(() => {
                el.classList.remove('show');
                setTimeout(() => el.remove(), 300);
            }, 3500);
        }
    };

    const AccountPage = {
        user: null,

                async init() {
            if (!Utils.getToken()) {
                window.location.href = '/login';
                return;
            }

            await this.loadUser();
            this.initTabs();
            this.initForms();
            this.initMasks();
            this.initCepLookup();
            this.initPasswordToggles();
            this.initDeleteAccount();   // ✅ NOVO
            this.initLogout();
        },

        async loadUser() {
            try {
                const user = await Utils.get('/auth/me');
                this.user = user;
                this.fillForms();
                this.renderSidebar();

                document.getElementById('accountLoading').style.display = 'none';
                document.getElementById('accountContent').style.display = 'grid';
            } catch (error) {
                console.error('Erro ao carregar usuário:', error);
                Utils.feedback('Erro ao carregar dados', 'error');
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
            document.getElementById('accBirthDate').value = user.birth_date ? user.birth_date.split('T')[0] : '';
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

        initTabs() {
            document.querySelectorAll('.account-nav-item[data-tab]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const tab = btn.dataset.tab;
                    document.querySelectorAll('.account-nav-item').forEach(b => b.classList.remove('active'));
                    document.querySelectorAll('.account-panel').forEach(p => p.classList.remove('active'));
                    btn.classList.add('active');
                    document.querySelector(`.account-panel[data-panel="${tab}"]`)?.classList.add('active');
                });
            });
        },

        initForms() {
            // Profile
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
                        phone: document.getElementById('accPhone').value || null
                    };
                    const result = await Utils.put('/users/me', data);
                    this.user = result.user;
                    Utils.saveUser(result.user);
                    this.renderSidebar();
                    Utils.feedback('Dados salvos com sucesso!', 'success');
                } catch (error) {
                    Utils.feedback(error.data?.error || 'Erro ao salvar dados', 'error');
                } finally {
                    btn.disabled = false;
                    btn.innerHTML = originalText;
                }
            });

            // Address
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
                        state: document.getElementById('accState').value || null
                    };
                    const result = await Utils.put('/users/me', data);
                    this.user = result.user;
                    Utils.saveUser(result.user);
                    Utils.feedback('Endereço salvo com sucesso!', 'success');
                } catch (error) {
                    Utils.feedback(error.data?.error || 'Erro ao salvar endereço', 'error');
                } finally {
                    btn.disabled = false;
                    btn.innerHTML = originalText;
                }
            });

            // Password
            document.getElementById('passwordForm')?.addEventListener('submit', async (e) => {
                e.preventDefault();
                const current = document.getElementById('accCurrentPassword').value;
                const newPass = document.getElementById('accNewPassword').value;
                const confirm = document.getElementById('accConfirmPassword').value;

                if (newPass.length < 6) {
                    Utils.feedback('Nova senha deve ter pelo menos 6 caracteres', 'error');
                    return;
                }
                if (newPass !== confirm) {
                    Utils.feedback('As senhas não conferem', 'error');
                    return;
                }

                const btn = document.getElementById('savePasswordBtn');
                const originalText = btn.innerHTML;
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Alterando...';

                try {
                    await Utils.put('/users/me/password', {
                        current_password: current,
                        new_password: newPass
                    });
                    Utils.feedback('Senha alterada com sucesso!', 'success');
                    document.getElementById('passwordForm').reset();
                } catch (error) {
                    Utils.feedback(error.data?.error || 'Erro ao alterar senha', 'error');
                } finally {
                    btn.disabled = false;
                    btn.innerHTML = originalText;
                }
            });
        },

        initMasks() {
            const cpf = document.getElementById('accCpf');
            const phone = document.getElementById('accPhone');
            const cep = document.getElementById('accCep');

            cpf?.addEventListener('input', (e) => { e.target.value = Utils.maskCpf(e.target.value); });
            phone?.addEventListener('input', (e) => { e.target.value = Utils.maskPhone(e.target.value); });
            cep?.addEventListener('input', (e) => { e.target.value = Utils.maskCep(e.target.value); });
        },

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
                    const data = await Utils.get(`/cep/${cep}`);
                    document.getElementById('accStreet').value = data.street || '';
                    document.getElementById('accNeighborhood').value = data.neighborhood || '';
                    document.getElementById('accCity').value = data.city || '';
                    document.getElementById('accState').value = data.state || '';
                    document.getElementById('accComplement').value = data.complement || '';
                    status.className = 'cep-status success';
                    document.getElementById('accNumber')?.focus();
                } catch (error) {
                    status.className = 'cep-status error';
                    ['accStreet', 'accNeighborhood', 'accCity', 'accState'].forEach(id => {
                        document.getElementById(id).value = '';
                    });
                }
            });
        },

        initPasswordToggles() {
            document.querySelectorAll('.toggle-password').forEach(btn => {
                btn.addEventListener('click', () => {
                    const input = document.getElementById(btn.dataset.target);
                    if (!input) return;
                    const isPassword = input.type === 'password';
                    input.type = isPassword ? 'text' : 'password';
                    btn.innerHTML = `<i class="fas fa-eye${isPassword ? '-slash' : ''}"></i>`;
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
            modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

            confirmBtn.addEventListener('click', async () => {
                const password = passwordInput.value;
                const confirmation = confirmInput.value;

                if (!password) {
                    Utils.feedback('Digite sua senha', 'error');
                    return;
                }

                confirmBtn.disabled = true;
                confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Excluindo...';

                try {
                    await Utils.request('/users/me', {
                        method: 'DELETE',
                        body: JSON.stringify({ password, confirmation })
                    });

                    Utils.clearSession();
                    Utils.feedback('Conta excluída. Redirecionando...', 'success');
                    setTimeout(() => { window.location.href = '/'; }, 1500);
                } catch (error) {
                    Utils.feedback(error.data?.error || 'Erro ao excluir conta', 'error');
                    confirmBtn.disabled = false;
                    confirmBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Excluir definitivamente';
                }
            });
        },

        initLogout() {
            document.getElementById('logoutBtn')?.addEventListener('click', async () => {
                try {
                    await Utils.post('/auth/logout', {});
                } catch (error) {
                    // ignora erro, apenas limpa local
                }
                Utils.clearSession();
                window.location.href = '/';
            });
        }
    };

    document.addEventListener('DOMContentLoaded', () => AccountPage.init());
})();