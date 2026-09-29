// ======================================================
// public/js/core/utils.js
// Utilitários globais (sem dependências)
// Uso: window.LuxuryUtils.formatPrice(19.9)
// ======================================================
(function () {
    'use strict';

    const Utils = {
        // ==================================================
        // FORMATAÇÃO
        // ==================================================

        /**
         * Formata número como preço brasileiro.
         * 19.9 → "R$ 19,90"
         * null/undefined → "R$ 0,00"
         */
        formatPrice(value) {
            const n = parseFloat(value);
            if (!isFinite(n)) return 'R$ 0,00';
            return `R$ ${n.toFixed(2).replace('.', ',')}`;
        },

        /**
         * Formata número "cru" (sem R$).
         * 19.9 → "19,90"
         */
        formatNumber(value) {
            const n = parseFloat(value);
            if (!isFinite(n)) return '0,00';
            return n.toFixed(2).replace('.', ',');
        },

        /**
         * Formata data pt-BR com hora.
         */
        formatDate(dateString, options = {}) {
            if (!dateString) return '—';
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '—';

            const defaults = {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            };
            return date.toLocaleDateString('pt-BR', { ...defaults, ...options });
        },

        /**
         * Formata data curta (só dia/mês/ano).
         */
        formatDateShort(dateString) {
            return this.formatDate(dateString, {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: undefined,
                minute: undefined,
            });
        },

        // ==================================================
        // SEGURANÇA
        // ==================================================

        /**
         * Escapa HTML pra prevenir XSS.
         * Usar SEMPRE que injetar dados do usuário no DOM.
         */
        escapeHtml(text) {
            if (text === null || text === undefined) return '';
            const div = document.createElement('div');
            div.textContent = String(text);
            return div.innerHTML;
        },

        /**
         * Escapa atributo (pra usar dentro de aspas HTML).
         */
        escapeAttr(text) {
            if (text === null || text === undefined) return '';
            return String(text)
                .replace(/&/g, '&amp;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
        },

        // ==================================================
        // SLUG
        // ==================================================

        /**
         * Gera slug a partir de texto.
         * "Camisa Social" → "camisa-social"
         */
        slugify(text) {
            return String(text || '')
                .toString()
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9\s-]/g, '')
                .trim()
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-');
        },

        // ==================================================
        // MÁSCARAS
        // ==================================================

        maskCpf(value) {
            return String(value || '')
                .replace(/\D/g, '')
                .slice(0, 11)
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        },

        maskPhone(value) {
            const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
            if (digits.length <= 10) {
                return digits
                    .replace(/(\d{2})(\d)/, '($1) $2')
                    .replace(/(\d{4})(\d)/, '$1-$2');
            }
            return digits
                .replace(/(\d{2})(\d)/, '($1) $2')
                .replace(/(\d{5})(\d)/, '$1-$2');
        },

        maskCep(value) {
            return String(value || '')
                .replace(/\D/g, '')
                .slice(0, 8)
                .replace(/(\d{5})(\d)/, '$1-$2');
        },

        /**
         * Valida email.
         */
        validateEmail(email) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ''));
        },

        // ==================================================
        // PERFORMANCE
        // ==================================================

        /**
         * Debounce: só executa depois de X ms sem chamadas.
         */
        debounce(func, wait = 300) {
            let timeout;
            return function (...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func.apply(this, args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },

        /**
         * Throttle: executa no máximo 1x por X ms.
         */
        throttle(func, limit = 100) {
            let inThrottle;
            return function (...args) {
                if (!inThrottle) {
                    func.apply(this, args);
                    inThrottle = true;
                    setTimeout(() => (inThrottle = false), limit);
                }
            };
        },

        // ==================================================
        // ACESSIBILIDADE
        // ==================================================

        /**
         * Anuncia mensagem pra leitores de tela.
         * Requer <div id="announcer" class="sr-only" aria-live="polite">.
         */
        announce(message) {
            const announcer = document.getElementById('announcer');
            if (announcer) {
                announcer.textContent = '';
                // Força o leitor a re-ler
                setTimeout(() => {
                    announcer.textContent = message;
                }, 100);
            }
        },

        // ==================================================
        // DOM
        // ==================================================

        /**
         * Atalho pra querySelector.
         */
        $(selector, context = document) {
            return context.querySelector(selector);
        },

        /**
         * Atalho pra querySelectorAll (retorna array).
         */
        $$(selector, context = document) {
            return Array.from(context.querySelectorAll(selector));
        },

        /**
         * Cria elemento com atributos e filhos.
         * Ex: createEl('div', { class: 'box' }, 'Olá')
         */
        createEl(tag, attrs = {}, children = []) {
            const el = document.createElement(tag);
            Object.entries(attrs).forEach(([k, v]) => {
                if (k === 'class') el.className = v;
                else if (k === 'dataset') Object.assign(el.dataset, v);
                else if (k.startsWith('on') && typeof v === 'function') {
                    el.addEventListener(k.slice(2).toLowerCase(), v);
                } else {
                    el.setAttribute(k, v);
                }
            });
            const kids = Array.isArray(children) ? children : [children];
            kids.forEach((c) => {
                if (typeof c === 'string') el.appendChild(document.createTextNode(c));
                else if (c instanceof Node) el.appendChild(c);
            });
            return el;
        },

        // ==================================================
        // URL / QUERY
        // ==================================================

        /**
         * Pega querystring como objeto.
         */
        getQueryParams() {
            const params = new URLSearchParams(window.location.search);
            const obj = {};
            for (const [k, v] of params.entries()) obj[k] = v;
            return obj;
        },

        /**
         * Monta URL com query string.
         */
        buildUrl(path, params = {}) {
            const qs = new URLSearchParams();
            Object.entries(params).forEach(([k, v]) => {
                if (v !== undefined && v !== null && v !== '') qs.append(k, v);
            });
            const q = qs.toString();
            return q ? `${path}?${q}` : path;
        },

        // ==================================================
        // CLIPBOARD
        // ==================================================

        async copyToClipboard(text) {
            try {
                await navigator.clipboard.writeText(text);
                return true;
            } catch {
                const textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                return true;
            }
        },
    };

    // Expõe globalmente
    window.LuxuryUtils = Utils;
})();