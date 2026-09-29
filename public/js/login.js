// ======================================================
// public/js/login.js
// Página de login / cadastro
// Depende de: core/utils.js, core/api.js, core/components.js
// ======================================================
(function () {
    'use strict';

    const U = window.LuxuryUtils;
    const API = window.LuxuryAPI;

    // ==================================================
    // HELPERS LOCAIS (só dessa página)
    // ==================================================
    function showFeedback(form, message, type = 'error') {
        let feedback = form.querySelector('.auth-feedback');
        if (!feedback) {
            feedback = document.createElement('div');
            feedback.className = 'auth-feedback';
            form.insertBefore(feedback, form.firstChild);
        }
        feedback.textContent = message;
        feedback.className = `auth-feedback show ${type}`;
        setTimeout(() => feedback.classList.remove('show'), 6000);
    }

    // ==================================================
    // PÁGINA
    // ==================================================
    const LoginPage = {
        init() {
            // Se já está logado, redireciona
            if (API.isLoggedIn()) {
                window.location.href = '/minha-conta';
                return;
            }

            this.initTabs();
            this.initMasks();
            this.initPasswordToggles();
            this.initLoginForm();
            this.initRegisterForm();
            this.initCepLookup();
        },

        // ==================================================
        // TABS
        // ==================================================
        initTabs() {
            const tabs = document.querySelectorAll('.auth-tab');
            const forms = document.querySelectorAll('.auth-form');

            const switchTo = (tabName) => {
                tabs.forEach((t) => t.classList.toggle('active', t.dataset.tab === tabName));
                forms.forEach((f) => f.classList.toggle('active', f.dataset.form === tabName));
                window.scrollTo({ top: 0, behavior: 'smooth' });
            };

            tabs.forEach((tab) => {
                tab.addEventListener('click', () => switchTo(tab.dataset.tab));
            });

            document.querySelectorAll('[data-switch]').forEach((btn) => {
                btn.addEventListener('click', () => switchTo(btn.dataset.switch));
            });
        },

        // ==================================================
        // MÁSCARAS (via LuxuryUtils)
        // ==================================================
        initMasks() {
            const cpf = document.getElementById('regCpf');
            const phone = document.getElementById('regPhone');
            const cep = document.getElementById('regCep');

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
        // CONSULTA DE CEP
        // ==================================================
        initCepLookup() {
            const cepInput = document.getElementById('regCep');
            const status = document.getElementById('cepStatus');

            if (!cepInput) return;

            let lastCep = '';

            cepInput.addEventListener('blur', async () => {
                const cep = cepInput.value.replace(/\D/g, '');
                if (cep.length !== 8 || cep === lastCep) return;
                lastCep = cep;

                status.className = 'cep-status loading';

                try {
                    const data = await API.get(`/cep/${cep}`);
                    document.getElementById('regStreet').value = data.street || '';
                    document.getElementById('regNeighborhood').value = data.neighborhood || '';
                    document.getElementById('regCity').value = data.city || '';
                    document.getElementById('regState').value = data.state || '';
                    document.getElementById('regComplement').value = data.complement || '';

                    status.className = 'cep-status success';
                    document.getElementById('regNumber')?.focus();
                } catch (error) {
                    status.className = 'cep-status error';
                    ['regStreet', 'regNeighborhood', 'regCity', 'regState'].forEach((id) => {
                        const el = document.getElementById(id);
                        if (el) el.value = '';
                    });
                }
            });
        },

        // ==================================================
        // LOGIN
        // ==================================================
        initLoginForm() {
            const form = document.getElementById('loginForm');
            const btn = document.getElementById('loginSubmit');

            form?.addEventListener('submit', async (e) => {
                e.preventDefault();

                const email = form.querySelector('#loginEmail').value.trim();
                const password = form.querySelector('#loginPassword').value;

                if (!email || !password) {
                    showFeedback(form, 'Preencha email e senha.');
                    return;
                }

                const originalText = btn.innerHTML;
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';

                try {
                    const result = await API.post('/auth/login', { email, password });

                    // ✅ Salva sessão (LuxuryAPI lê dos mesmos lugares)
                    API.setToken(result.token);
                    API.setUser(result.user);

                    showFeedback(form, 'Login realizado! Redirecionando...', 'success');
                    setTimeout(() => {
                        window.location.href = '/minha-conta';
                    }, 800);
                } catch (error) {
                    showFeedback(
                        form,
                        error.data?.error || 'Erro ao fazer login. Verifique suas credenciais.'
                    );
                    btn.disabled = false;
                    btn.innerHTML = originalText;
                }
            });
        },

        // ==================================================
        // REGISTRO
        // ==================================================
        initRegisterForm() {
            const form = document.getElementById('registerForm');
            const btn = document.getElementById('registerSubmit');

            form?.addEventListener('submit', async (e) => {
                e.preventDefault();

                const data = {
                    full_name: form.querySelector('#regFullName').value.trim(),
                    email: form.querySelector('#regEmail').value.trim(),
                    password: form.querySelector('#regPassword').value,
                    confirm_password: form.querySelector('#regConfirmPassword').value,
                    birth_date: form.querySelector('#regBirthDate').value || null,
                    gender: form.querySelector('#regGender').value || null,
                    phone: form.querySelector('#regPhone').value || null,
                    cpf: form.querySelector('#regCpf').value || null,
                    cep: form.querySelector('#regCep').value || null,
                    street: form.querySelector('#regStreet').value || null,
                    number: form.querySelector('#regNumber').value || null,
                    complement: form.querySelector('#regComplement').value || null,
                    neighborhood: form.querySelector('#regNeighborhood').value || null,
                    city: form.querySelector('#regCity').value || null,
                    state: form.querySelector('#regState').value || null,
                };

                // ==================== VALIDAÇÕES LOCAIS ====================
                if (!data.full_name || data.full_name.length < 3) {
                    showFeedback(form, 'Nome completo é obrigatório (mínimo 3 caracteres).');
                    return;
                }
                if (!data.email || !U.validateEmail(data.email)) {
                    showFeedback(form, 'Informe um e-mail válido.');
                    return;
                }
                if (data.password.length < 6) {
                    showFeedback(form, 'Senha deve ter pelo menos 6 caracteres.');
                    return;
                }
                if (data.password !== data.confirm_password) {
                    showFeedback(form, 'As senhas não conferem.');
                    return;
                }
                if (!data.cep || data.cep.replace(/\D/g, '').length !== 8) {
                    showFeedback(form, 'CEP é obrigatório (8 dígitos).');
                    return;
                }
                if (!data.number) {
                    showFeedback(form, 'Número do endereço é obrigatório.');
                    return;
                }

                // Remove o confirm_password (não vai pro backend)
                delete data.confirm_password;

                const originalText = btn.innerHTML;
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Criando conta...';

                try {
                    const result = await API.post('/auth/register', data);

                    // ✅ Salva sessão
                    API.setToken(result.token);
                    API.setUser(result.user);

                    showFeedback(form, 'Conta criada com sucesso! Redirecionando...', 'success');
                    setTimeout(() => {
                        window.location.href = '/minha-conta';
                    }, 800);
                } catch (error) {
                    const msg = error.data?.error || 'Erro ao criar conta. Tente novamente.';
                    showFeedback(form, msg);
                    btn.disabled = false;
                    btn.innerHTML = originalText;
                }
            });
        },
    };

    // ======================================================
    // INICIALIZAÇÃO
    // ======================================================
    document.addEventListener('DOMContentLoaded', () => LoginPage.init());
})();