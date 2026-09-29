// ======================================================
// public/admin/login.js
// Login do painel administrativo
// ======================================================
(function () {
    'use strict';

    const API_BASE = '/api';
    const TOKEN_KEY = 'luxury_admin_token';
    const USER_KEY = 'luxury_admin_user';

    // ==================================================
    // HELPERS
    // ==================================================
    const $ = (sel) => document.querySelector(sel);

    function showFeedback(message, type = 'error') {
        const el = $('#loginFeedback');
        if (!el) return;

        const icon = type === 'error'
            ? '<i class="fas fa-exclamation-circle"></i>'
            : '<i class="fas fa-check-circle"></i>';

        el.className = `login-feedback show ${type}`;
        el.innerHTML = `${icon}<span>${escapeHtml(message)}</span>`;
    }

    function clearFeedback() {
        const el = $('#loginFeedback');
        if (!el) return;
        el.className = 'login-feedback';
        el.innerHTML = '';
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }

    // ==================================================
    // SE JÁ ESTIVER LOGADO, REDIRECIONA
    // ==================================================
    function checkAlreadyLoggedIn() {
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token) return;

        fetch(`${API_BASE}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => {
                if (res.ok) {
                    window.location.href = '/admin';
                } else {
                    localStorage.removeItem(TOKEN_KEY);
                    localStorage.removeItem(USER_KEY);
                }
            })
            .catch(() => {
                // Erro de rede: não redireciona (mostra login)
            });
    }

    // ==================================================
    // MOSTRAR MENSAGEM FLASH (se houver)
    // ==================================================
    function checkFlash() {
        const flash = sessionStorage.getItem('luxury_admin_flash');
        if (flash) {
            showFeedback(flash, 'error');
            sessionStorage.removeItem('luxury_admin_flash');
        }
    }

    // ==================================================
    // TOGGLE DE SENHA
    // ==================================================
    function initPasswordToggle() {
        const btn = $('#togglePassword');
        const input = $('#adminPassword');
        if (!btn || !input) return;

        btn.addEventListener('click', () => {
            const isPassword = input.type === 'password';
            input.type = isPassword ? 'text' : 'password';
            btn.innerHTML = `<i class="fas fa-eye${isPassword ? '-slash' : ''}"></i>`;
            btn.setAttribute('aria-label', isPassword ? 'Ocultar senha' : 'Mostrar senha');
        });
    }

    // ==================================================
    // SUBMIT
    // ==================================================
    function initForm() {
        const form = $('#adminLoginForm');
        const btn = $('#adminLoginSubmit');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearFeedback();

            const email = $('#adminEmail').value.trim();
            const password = $('#adminPassword').value;

            if (!email || !password) {
                showFeedback('Preencha e-mail e senha.');
                return;
            }

            const originalHtml = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Entrando...</span>';

            try {
                const response = await fetch(`${API_BASE}/auth/admin/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                });

                const data = await response.json().catch(() => ({}));

                if (!response.ok) {
                    if (response.status === 403) {
                        showFeedback('Esta conta não tem permissão de administrador.');
                    } else if (response.status === 401) {
                        showFeedback('E-mail ou senha incorretos.');
                    } else if (response.status === 429) {
                        showFeedback('Muitas tentativas. Aguarde alguns minutos.');
                    } else {
                        showFeedback(data.error || 'Erro ao fazer login.');
                    }
                    return;
                }

                // ✅ Sucesso
                if (!data.token || !data.user) {
                    showFeedback('Resposta inválida do servidor.');
                    return;
                }

                if (data.user.role !== 'admin') {
                    showFeedback('Esta conta não tem permissão de administrador.');
                    return;
                }

                localStorage.setItem(TOKEN_KEY, data.token);
                localStorage.setItem(USER_KEY, JSON.stringify(data.user));

                showFeedback('Login realizado! Redirecionando...', 'success');

                setTimeout(() => {
                    window.location.href = '/admin';
                }, 600);
            } catch (error) {
                console.error('Erro no login admin:', error);
                showFeedback('Erro de conexão. Verifique sua internet.');
            } finally {
                if (document.body.contains(btn)) {
                    btn.disabled = false;
                    btn.innerHTML = originalHtml;
                }
            }
        });
    }

    // ==================================================
    // INICIALIZAÇÃO
    // ==================================================
    document.addEventListener('DOMContentLoaded', () => {
        checkAlreadyLoggedIn();
        checkFlash();
        initPasswordToggle();
        initForm();
    });
})();