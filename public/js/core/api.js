// ======================================================
// public/js/core/api.js
// Cliente HTTP centralizado com:
//   - Token automático
//   - Tratamento de 401 (redireciona pro login)
//   - Cache opcional em memória
// Uso: window.LuxuryAPI.get('/products', { useCache: true })
// ======================================================
(function () {
    'use strict';

    const API_BASE = '/api';
    const TOKEN_KEY = 'luxury_token';
    const USER_KEY = 'luxury_user';

    // ==================================================
    // CACHE SIMPLES EM MEMÓRIA (TTL configurável)
    // ==================================================
    const cache = new Map();
    const DEFAULT_TTL = 60 * 1000; // 60s

    // ==================================================
    // API
    // ==================================================
    const API = {
        // ==================================================
        // TOKEN / SESSÃO
        // ==================================================
        getToken() {
            return localStorage.getItem(TOKEN_KEY);
        },

        setToken(token) {
            localStorage.setItem(TOKEN_KEY, token);
        },

        getUser() {
            try {
                return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
            } catch {
                return null;
            }
        },

        setUser(user) {
            localStorage.setItem(USER_KEY, JSON.stringify(user));
        },

        clearSession() {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
        },

        isLoggedIn() {
            return !!this.getToken();
        },

        // ==================================================
        // REQUEST BASE
        // ==================================================
        async request(path, options = {}) {
            const url = `${API_BASE}${path}`;
            const token = this.getToken();

            // ⚠️ Separar as opções da API das opções do fetch
            // (evita conflito com `cache` nativo do fetch)
            const {
                useCache = false,
                ttl = DEFAULT_TTL,
                headers: extraHeaders,
                ...fetchOptions
            } = options;

            const headers = {
                'Content-Type': 'application/json',
                ...(extraHeaders || {}),
            };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            // Cache só pra GET sem opções especiais
            const isGet = !fetchOptions.method || fetchOptions.method === 'GET';
            const shouldCache = useCache && isGet;
            const cacheKey = shouldCache ? `${url}|${token || ''}` : null;

            if (shouldCache && cache.has(cacheKey)) {
                const cached = cache.get(cacheKey);
                if (cached.expiresAt > Date.now()) {
                    return cached.data;
                }
                cache.delete(cacheKey);
            }

            const response = await fetch(url, { ...fetchOptions, headers });

            // 401 — token inválido ou expirado
            if (response.status === 401) {
                this.clearSession();
                if (!window.location.pathname.includes('/login')) {
                    sessionStorage.setItem('luxury_redirect', window.location.pathname);
                    window.location.href = '/login';
                }
                const err = new Error('Sessão expirada');
                err.status = 401;
                throw err;
            }

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                const error = new Error(data.error || `Erro HTTP ${response.status}`);
                error.status = response.status;
                error.data = data;
                throw error;
            }

            if (shouldCache && cacheKey) {
                cache.set(cacheKey, {
                    data,
                    expiresAt: Date.now() + ttl,
                });
            }

            return data;
        },

        // ==================================================
        // MÉTODOS
        // ==================================================
        get(path, options = {}) {
            return this.request(path, { ...options, method: 'GET' });
        },

        post(path, body, options = {}) {
            return this.request(path, {
                ...options,
                method: 'POST',
                body: JSON.stringify(body || {}),
            });
        },

        put(path, body, options = {}) {
            return this.request(path, {
                ...options,
                method: 'PUT',
                body: JSON.stringify(body || {}),
            });
        },

        patch(path, body, options = {}) {
            return this.request(path, {
                ...options,
                method: 'PATCH',
                body: JSON.stringify(body || {}),
            });
        },

        /**
         * DELETE sem body (caso mais comum).
         * Uso: API.delete('/cart/1')
         */
        delete(path, options = {}) {
            return this.request(path, { ...options, method: 'DELETE' });
        },

        /**
         * DELETE com body (ex: excluir conta que exige senha).
         * Uso: API.deleteWithBody('/users/me', { password, confirmation })
         */
        deleteWithBody(path, body, options = {}) {
            return this.request(path, {
                ...options,
                method: 'DELETE',
                body: JSON.stringify(body || {}),
            });
        },

        // ==================================================
        // CACHE
        // ==================================================
        clearCache() {
            cache.clear();
        },

        invalidate(path) {
            for (const key of cache.keys()) {
                if (key.includes(path)) cache.delete(key);
            }
        },

        // ==================================================
        // UPLOAD (multipart)
        // ==================================================
        async upload(file, fieldName = 'image') {
            const formData = new FormData();
            formData.append(fieldName, file);

            const token = this.getToken();
            const headers = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const response = await fetch(`${API_BASE}/upload`, {
                method: 'POST',
                headers,
                body: formData,
            });

            if (response.status === 401) {
                this.clearSession();
                window.location.href = '/login';
                throw new Error('Sessão expirada');
            }

            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || 'Erro no upload');
            return data.url;
        },
    };

    // Expõe globalmente
    window.LuxuryAPI = API;
})();