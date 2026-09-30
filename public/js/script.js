// ======================================================
// public/js/script.js
// Home / páginas públicas
// Depende de: core/utils.js, core/api.js, core/components.js
// ======================================================
(function () {
    'use strict';

    const U = window.LuxuryUtils;
    const API = window.LuxuryAPI;
    const C = window.LuxuryComponents;

    // ======================================================
    // CONFIGURAÇÕES
    // ======================================================
    const CONFIG = {
        carousel: { interval: 6000, transitionDuration: 600, swipeThreshold: 30 },
        scroll: { threshold: 0.15, rootMargin: '0px 0px -50px 0px' },
        promo: { mobileBreakpoint: 768, transitionDuration: 400 },
        newsletter: { couponCode: 'PRIMEIRA20', discount: '20%' },
    };

    // ======================================================
    // ANIMAÇÕES DE SCROLL
    // ======================================================
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) entry.target.classList.add('visible');
            });
        },
        { threshold: CONFIG.scroll.threshold, rootMargin: CONFIG.scroll.rootMargin }
    );

    function observeAnimateOnScroll() {
        document.querySelectorAll('.animate-on-scroll').forEach((el) => observer.observe(el));
    }

    // ======================================================
    // HEADER SCROLL
    // ======================================================
    const Header = {
        init() {
            this.el = document.getElementById('header');
            this.hero = document.getElementById('heroCarousel');
            if (!this.el) return;

            this.update = this.update.bind(this);
            const throttledUpdate = U.throttle(this.update, 100);

            window.addEventListener('scroll', throttledUpdate);
            window.addEventListener('resize', this.update);
            this.update();
        },

        update() {
            if (!this.el) return;
            const scrollPosition = window.scrollY;

            if (this.hero) {
                const heroHeight = this.hero.offsetHeight;
                this.el.classList.toggle('scrolled', scrollPosition > heroHeight * 0.3);
                this.el.classList.toggle('at-top', scrollPosition < 50);
            }
        },
    };

    // ======================================================
    // MENU MOBILE
    // ======================================================
const MobileMenu = {
    init() {
        this.toggle = document.getElementById('menuToggle');
        this.closeBtn = document.getElementById('closeMenu');
        this.menu = document.getElementById('navMenu');
        this.overlay = document.getElementById('menuOverlay');

        this.toggle?.addEventListener('click', () => this.open());
        this.closeBtn?.addEventListener('click', () => this.close());
        this.overlay?.addEventListener('click', () => this.close());

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.menu?.classList.contains('active')) this.close();
        });
    },

    open() {
        if (!this.menu || !this.overlay || !this.toggle) return;
        this.menu.classList.add('active');
        this.overlay.classList.add('active');
        document.body.classList.add('menu-open');        // ← ADICIONAR ESTA LINHA
        document.body.style.overflow = 'hidden';
        this.toggle.setAttribute('aria-expanded', 'true');
        U.announce('Menu aberto');
    },

    close() {
        if (!this.menu || !this.overlay || !this.toggle) return;
        this.menu.classList.remove('active');
        this.overlay.classList.remove('active');
        document.body.classList.remove('menu-open');     // ← ADICIONAR ESTA LINHA
        document.body.style.overflow = '';
        this.toggle.setAttribute('aria-expanded', 'false');
        document.querySelectorAll('.dropdown').forEach((d) => {
            d.classList.remove('active');
            const icon = d.querySelector('.dropdown-icon');
            if (icon) icon.style.transform = 'rotate(0deg)';
        });
        U.announce('Menu fechado');
    },
};

    // ======================================================
    // DROPDOWNS (mobile abre submenu, desktop navega)
    // ======================================================
    const Dropdowns = {
        init() {
            document.querySelectorAll('.dropdown').forEach((dropdown) => {
                const toggle = dropdown.querySelector('.dropdown-toggle');
                const icon = dropdown.querySelector('.dropdown-icon');

                if (!toggle) return;

                toggle.addEventListener('click', (e) => {
                    const isMobile = window.innerWidth <= CONFIG.promo.mobileBreakpoint;

                    // ✅ Desktop: deixa navegar normalmente
                    if (!isMobile) return;

                    // ✅ Mobile: SEMPRE previne, sempre abre/fecha
                    e.preventDefault();
                    e.stopPropagation();

                    const isActive = dropdown.classList.contains('active');

                    document.querySelectorAll('.dropdown').forEach((d) => {
                        if (d !== dropdown) {
                            d.classList.remove('active');
                            const otherIcon = d.querySelector('.dropdown-icon');
                            if (otherIcon) otherIcon.style.transform = 'rotate(0deg)';
                        }
                    });

                    if (!isActive) {
                        dropdown.classList.add('active');
                        if (icon) icon.style.transform = 'rotate(180deg)';
                    } else {
                        dropdown.classList.remove('active');
                        if (icon) icon.style.transform = 'rotate(0deg)';
                    }
                });

                dropdown.querySelectorAll('.dropdown-content a, .mega-list a').forEach((link) => {
                    link.addEventListener('click', () => {
                        if (window.innerWidth <= CONFIG.promo.mobileBreakpoint) {
                            MobileMenu.close();
                        }
                    });
                });
            });
        },
    };

    // ======================================================
    // HERO CAROUSEL
    // ======================================================
    const HeroCarousel = {
        currentSlide: 0,
        autoPlayInterval: null,
        isTransitioning: false,

        init() {
            this.slides = document.querySelectorAll('.carousel-slide');
            this.dots = document.querySelectorAll('.carousel-dots .dot');
            this.prevBtn = document.querySelector('.prev-btn');
            this.nextBtn = document.querySelector('.next-btn');
            this.carousel = document.querySelector('.hero-carousel');

            if (!this.carousel || !this.slides.length) return;

            this.prevBtn?.addEventListener('click', () => {
                this.prev();
                this.startAutoPlay();
            });
            this.nextBtn?.addEventListener('click', () => {
                this.next();
                this.startAutoPlay();
            });
            this.dots.forEach((dot, i) =>
                dot.addEventListener('click', () => {
                    this.show(i);
                    this.startAutoPlay();
                })
            );

            this.initTouch();
            this.startAutoPlay();
        },

        show(index) {
            if (this.isTransitioning || !this.slides.length) return;
            this.isTransitioning = true;

            this.slides.forEach((s) => s.classList.remove('active'));
            this.dots.forEach((d) => d.classList.remove('active'));

            this.slides[index].classList.add('active');
            this.dots[index]?.classList.add('active');

            this.currentSlide = index;

            this.dots.forEach((d, i) =>
                d.setAttribute('aria-selected', i === index ? 'true' : 'false')
            );

            U.announce(`Slide ${index + 1} de ${this.slides.length}`);

            setTimeout(() => {
                this.isTransitioning = false;
            }, CONFIG.carousel.transitionDuration);
        },

        next() {
            if (this.slides.length) this.show((this.currentSlide + 1) % this.slides.length);
        },

        prev() {
            if (this.slides.length)
                this.show((this.currentSlide - 1 + this.slides.length) % this.slides.length);
        },

        startAutoPlay() {
            this.stopAutoPlay();
            if (this.slides.length > 1) {
                this.autoPlayInterval = setInterval(() => this.next(), CONFIG.carousel.interval);
            }
        },

        stopAutoPlay() {
            if (this.autoPlayInterval) {
                clearInterval(this.autoPlayInterval);
                this.autoPlayInterval = null;
            }
        },

        initTouch() {
            let touchStartX = 0;
            let touchStartY = 0;
            let isDragging = false;
            let startPos = 0;
            let currentTranslate = 0;

            this.carousel.addEventListener(
                'touchstart',
                (e) => {
                    touchStartX = e.changedTouches[0].screenX;
                    touchStartY = e.changedTouches[0].screenY;
                    this.stopAutoPlay();
                },
                { passive: true }
            );

            this.carousel.addEventListener(
                'touchmove',
                (e) => {
                    const diffX = e.changedTouches[0].screenX - touchStartX;
                    const diffY = e.changedTouches[0].screenY - touchStartY;
                    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) e.preventDefault();
                },
                { passive: false }
            );

            this.carousel.addEventListener('touchend', (e) => {
                const diffX = e.changedTouches[0].screenX - touchStartX;
                const diffY = e.changedTouches[0].screenY - touchStartY;
                if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > CONFIG.carousel.swipeThreshold) {
                    if (diffX < 0) this.next();
                    else this.prev();
                }
                this.startAutoPlay();
            });

            this.carousel.addEventListener('mousedown', (e) => {
                isDragging = true;
                startPos = e.pageX;
                this.stopAutoPlay();
                this.carousel.style.cursor = 'grabbing';
            });

            this.carousel.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                currentTranslate = e.pageX - startPos;
            });

            this.carousel.addEventListener('mouseup', () => {
                if (!isDragging) return;
                isDragging = false;
                this.carousel.style.cursor = '';
                if (Math.abs(currentTranslate) > CONFIG.carousel.swipeThreshold) {
                    if (currentTranslate < 0) this.next();
                    else this.prev();
                }
                currentTranslate = 0;
                this.startAutoPlay();
            });

            this.carousel.addEventListener('mouseleave', () => {
                if (isDragging) {
                    isDragging = false;
                    this.carousel.style.cursor = '';
                    this.startAutoPlay();
                }
            });

            this.carousel.addEventListener('mouseenter', () => this.stopAutoPlay());
        },
    };

    // ======================================================
    // PROMOÇÕES MOBILE
    // ======================================================
    const PromoCarousel = {
        currentIndex: 0,
        isTransitioning: false,

        init() {
            this.track = document.getElementById('promoTrack');
            this.slides = document.querySelectorAll('.promo-slide');
            this.dots = document.querySelectorAll('#promoDots .promo-dot');
            this.prevBtn = document.getElementById('prevPromo');
            this.nextBtn = document.getElementById('nextPromo');

            if (!this.track || !this.slides.length) return;

            this.total = this.slides.length;

            this.prevBtn?.addEventListener('click', (e) => {
                e.preventDefault();
                this.goTo(this.currentIndex - 1);
            });
            this.nextBtn?.addEventListener('click', (e) => {
                e.preventDefault();
                this.goTo(this.currentIndex + 1);
            });
            this.dots.forEach((dot, i) =>
                dot.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.goTo(i);
                })
            );

            this.initTouch();

            const debouncedResize = U.debounce(() => this.update(false), 150);
            window.addEventListener('resize', debouncedResize);
            this.update(false);
        },

        isMobile() {
            return window.innerWidth <= CONFIG.promo.mobileBreakpoint;
        },

        update(animate = true) {
            if (!this.isMobile()) {
                this.track.style.transition = 'none';
                this.track.style.transform = 'translateX(0)';
                this.currentIndex = 0;
                this.updateDots(0);
                this.updateButtons();
                return;
            }
            this.track.style.transition = animate
                ? `transform ${CONFIG.promo.transitionDuration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`
                : 'none';
            this.track.style.transform = `translateX(-${this.currentIndex * 100}%)`;
            this.updateDots(this.currentIndex);
            this.updateButtons();
        },

        updateDots(activeIndex) {
            this.dots.forEach((dot, i) => dot.classList.toggle('active', i === activeIndex));
        },

        updateButtons() {
            if (!this.prevBtn || !this.nextBtn) return;
            this.prevBtn.style.opacity = this.currentIndex === 0 ? '0.3' : '1';
            this.prevBtn.style.pointerEvents = this.currentIndex === 0 ? 'none' : 'auto';
            this.nextBtn.style.opacity = this.currentIndex === this.total - 1 ? '0.3' : '1';
            this.nextBtn.style.pointerEvents = this.currentIndex === this.total - 1 ? 'none' : 'auto';
        },

        goTo(index) {
            if (this.isTransitioning || index < 0 || index >= this.total || index === this.currentIndex)
                return;
            this.isTransitioning = true;
            this.currentIndex = index;
            this.update(true);
            setTimeout(() => {
                this.isTransitioning = false;
            }, CONFIG.promo.transitionDuration + 50);
        },

        initTouch() {
            let touchStartX = 0;
            let touchStartY = 0;
            let isSwiping = false;

            this.track.addEventListener(
                'touchstart',
                (e) => {
                    if (!this.isMobile() || this.isTransitioning) return;
                    touchStartX = e.touches[0].clientX;
                    touchStartY = e.touches[0].clientY;
                    isSwiping = false;
                    this.track.style.transition = 'none';
                },
                { passive: true }
            );

            this.track.addEventListener(
                'touchmove',
                (e) => {
                    if (!this.isMobile() || this.isTransitioning) return;
                    const deltaX = e.touches[0].clientX - touchStartX;
                    const deltaY = e.touches[0].clientY - touchStartY;
                    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 5) {
                        isSwiping = true;
                        e.preventDefault();
                        const offset = -this.currentIndex * 100 + (deltaX / this.track.offsetWidth) * 100;
                        const maxOffset = -(this.total - 1) * 100;
                        const clampedOffset = Math.max(maxOffset, Math.min(0, offset));
                        this.track.style.transform = `translateX(${clampedOffset}%)`;
                    }
                },
                { passive: false }
            );

            this.track.addEventListener('touchend', (e) => {
                if (!this.isMobile() || this.isTransitioning) return;
                if (isSwiping) {
                    const deltaX = e.changedTouches[0].clientX - touchStartX;
                    if (Math.abs(deltaX) > 30) {
                        deltaX < 0 ? this.goTo(this.currentIndex + 1) : this.goTo(this.currentIndex - 1);
                    } else {
                        this.update(true);
                    }
                }
                isSwiping = false;
            });
        },
    };

    // ======================================================
    // MODAL DE CUPOM
    // ======================================================
    const CouponModal = {
        init() {
            this.modal = document.getElementById('couponModal');
            this.desc = document.getElementById('modalDescription');
            this.code = document.getElementById('couponCode');
            this.closeBtn = document.getElementById('closeModal');
            this.copyBtn = document.getElementById('copyBtn');

            if (!this.modal) return;

            document.querySelectorAll('.promo-card').forEach((card) => {
                card.addEventListener('click', function () {
                    const code = this.dataset.coupon;
                    const desc = this.dataset.description;
                    if (code && desc) CouponModal.open(code, desc);
                });
            });

            this.closeBtn?.addEventListener('click', () => this.close());
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) this.close();
            });
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.modal.classList.contains('active')) this.close();
            });

            this.copyBtn?.addEventListener('click', async () => {
                const code = this.code?.textContent;
                if (!code) return;
                const success = await U.copyToClipboard(code);
                if (success) {
                    this.copyBtn.classList.add('copied');
                    this.copyBtn.innerHTML = '<i class="fas fa-check"></i> Copiado!';
                    U.announce('Cupom copiado para a área de transferência');
                    setTimeout(() => {
                        this.copyBtn.classList.remove('copied');
                        this.copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copiar';
                    }, 2000);
                }
            });
        },

        open(code, desc) {
            if (!this.modal) return;
            this.code.textContent = code;
            this.desc.textContent = desc;
            this.modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            U.announce(`Cupom ${code} disponível para copiar`);
        },

        close() {
            if (!this.modal) return;
            this.modal.classList.remove('active');
            document.body.style.overflow = '';
        },
    };

    // ======================================================
    // MODAL SAIBA MAIS
    // ======================================================
    const InfoModal = {
        init() {
            this.modal = document.getElementById('infoModal');
            this.closeBtn = document.getElementById('closeInfoModal');
            this.openBtn = document.getElementById('btnSaibaMais');

            if (!this.modal) return;

            this.openBtn?.addEventListener('click', (e) => {
                e.preventDefault();
                this.open();
            });
            this.closeBtn?.addEventListener('click', () => this.close());
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) this.close();
            });
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.modal.classList.contains('active')) this.close();
            });
        },

        open() {
            this.modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            U.announce('Modal de benefícios aberto');
        },

        close() {
            this.modal.classList.remove('active');
            document.body.style.overflow = '';
        },
    };

    // ======================================================
    // MODAL LOCALIZAÇÃO
    // ======================================================
    const LocationModal = {
        maps: {
            'asa-sul': 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3839.1!2d-47.89!3d-15.82!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x935a3b3d3a1e5e2b%3A0x8d4e0a5c5a5e5e5e!2sAsa+Sul%2C+Bras%C3%ADlia!5e0!3m2!1spt-BR!2sbr',
            'asa-norte': 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3839.2!2d-47.87!3d-15.76!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x935a3b3d3a1e5e2b%3A0x8d4e0a5c5a5e5e5e!2sAsa+Norte%2C+Bras%C3%ADlia!5e0!3m2!1spt-BR!2sbr',
            esplanada:
                'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3839.263572809456!2d-47.882516!3d-15.789356!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x935a3b3d3a1e5e2b%3A0x8d4e0a5c5a5e5e5e!2sEsplanada+dos+Minist%C3%A9rios%2C+Bras%C3%ADlia!5e0!3m2!1spt-BR!2sbr',
        },

        init() {
            this.modal = document.getElementById('locationModal');
            this.closeBtn = document.getElementById('closeLocationModal');
            this.openBtn = document.getElementById('btnVerLocalizacoes');
            this.map = document.getElementById('locationMap');
            this.buttons = document.querySelectorAll('.location-btn');

            if (!this.modal) return;

            this.openBtn?.addEventListener('click', (e) => {
                e.preventDefault();
                this.open();
            });
            this.closeBtn?.addEventListener('click', () => this.close());
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) this.close();
            });
            this.buttons.forEach((btn) =>
                btn.addEventListener('click', function () {
                    const location = this.getAttribute('data-location');
                    if (location) LocationModal.activate(location);
                })
            );
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.modal.classList.contains('active')) this.close();
            });
        },

        open() {
            this.modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            this.activate('asa-sul');
            U.announce('Modal de localizações aberto');
        },

        close() {
            this.modal.classList.remove('active');
            document.body.style.overflow = '';
        },

        activate(location) {
            if (!this.maps[location]) return;
            this.buttons.forEach((btn) => {
                const isActive = btn.getAttribute('data-location') === location;
                btn.classList.toggle('active', isActive);
                btn.setAttribute('aria-checked', isActive ? 'true' : 'false');
            });
            if (this.map) this.map.src = this.maps[location];
            U.announce(`Localização: ${location.replace('-', ' ').toUpperCase()}`);
        },
    };

    // ======================================================
    // NEWSLETTER
    // ======================================================
    const Newsletter = {
        init() {
            this.form = document.getElementById('newsletterForm');
            this.feedback = document.getElementById('newsletterFeedback');

            if (!this.form) return;

            this.buildModal();

            this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        },

        buildModal() {
            this.modal = document.createElement('div');
            this.modal.className = 'modal';
            this.modal.id = 'newsletterModal';
            this.modal.setAttribute('role', 'dialog');
            this.modal.setAttribute('aria-modal', 'true');
            this.modal.setAttribute('aria-labelledby', 'newsletterModalTitle');
            this.modal.innerHTML = `
                <div class="modal-content newsletter-modal-content">
                    <button class="close-modal" id="closeNewsletterModal" aria-label="Fechar modal">&times;</button>
                    <div class="modal-icon success-icon"><i class="fas fa-check-circle"></i></div>
                    <h2 id="newsletterModalTitle">🎉 Cadastro Realizado!</h2>
                    <p id="newsletterModalMessage">Cupom de ${CONFIG.newsletter.discount} enviado para o seu e-mail!</p>
                    <div class="newsletter-modal-extra">
                        <p><i class="fas fa-envelope"></i> <span id="newsletterEmailDisplay"></span></p>
                        <p><i class="fas fa-gift"></i> Use o cupom: <strong>${CONFIG.newsletter.couponCode}</strong></p>
                    </div>
                    <button class="btn btn-primary" id="newsletterModalBtn">Continuar Comprando</button>
                </div>
            `;
            document.body.appendChild(this.modal);

            this.closeBtn = document.getElementById('closeNewsletterModal');
            this.modalBtn = document.getElementById('newsletterModalBtn');
            this.emailDisplay = document.getElementById('newsletterEmailDisplay');
            this.messageEl = document.getElementById('newsletterModalMessage');

            const close = () => this.close();
            this.closeBtn?.addEventListener('click', close);
            this.modalBtn?.addEventListener('click', close);
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) close();
            });
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.modal.classList.contains('active')) close();
            });
        },

        openModal(email) {
            this.modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            if (this.emailDisplay) this.emailDisplay.textContent = email;
            if (this.messageEl) {
                this.messageEl.textContent = `Cupom de ${CONFIG.newsletter.discount} enviado para: ${email}`;
            }
            U.announce(`Cadastro realizado! Cupom enviado para ${email}`);
        },

        close() {
            this.modal.classList.remove('active');
            document.body.style.overflow = '';
        },

        handleSubmit(e) {
            e.preventDefault();
            const emailInput = this.form.querySelector('.newsletter-input');
            const btn = this.form.querySelector('.newsletter-btn');
            const originalText = btn.textContent;
            const email = emailInput.value.trim();

            if (!U.validateEmail(email)) {
                emailInput.style.borderColor = '#dc3545';
                emailInput.style.boxShadow = '0 0 0 3px rgba(220, 53, 69, 0.25)';
                if (this.feedback) {
                    this.feedback.textContent = '⚠️ Por favor, insira um e-mail válido.';
                    this.feedback.style.color = '#dc3545';
                }
                setTimeout(() => {
                    emailInput.style.borderColor = '';
                    emailInput.style.boxShadow = '';
                    if (this.feedback) this.feedback.textContent = '';
                }, 3000);
                emailInput.focus();
                return;
            }

            btn.textContent = 'Enviando...';
            btn.disabled = true;
            emailInput.disabled = true;

            setTimeout(() => {
                this.openModal(email);
                this.form.reset();
                btn.textContent = originalText;
                btn.disabled = false;
                emailInput.disabled = false;
                emailInput.style.borderColor = '';
                emailInput.style.boxShadow = '';
                if (this.feedback) this.feedback.textContent = '';
            }, 1200);
        },
    };

    // ======================================================
    // PRODUTOS EM DESTAQUE
    // ======================================================
    const FeaturedProducts = {
        async load() {
            const track = document.getElementById('featuredTrack');
            const dotsContainer = document.getElementById('featuredDots');
            if (!track) return;

            track.innerHTML = C.renderLoading('Carregando produtos...');
            if (dotsContainer) dotsContainer.innerHTML = '';

            try {
                const data = await API.get('/products?featured=true&limit=20');
                const products = data.products || [];

                if (products.length === 0) {
                    track.innerHTML = `
                        <div class="featured-error">
                            <i class="fas fa-box-open"></i>
                            <h3>Nenhum produto em destaque</h3>
                            <p>Em breve novidades por aqui.</p>
                        </div>
                    `;
                    return;
                }

                track.innerHTML = products
                    .map((product) => C.renderProductCard(product, {
                        showShortDesc: true,
                        showButton: true,
                        buttonText: 'Ver Produto',
                        href: `/produto/${product.slug}`,
                    }))
                    .join('');

                FeaturedCarousel.init({
                    track,
                    dotsContainer,
                    prevBtn: document.querySelector('.featured-prev'),
                    nextBtn: document.querySelector('.featured-next'),
                });
            } catch (error) {
                console.error('Erro ao carregar produtos em destaque:', error);
                track.innerHTML = `
                    <div class="featured-error">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h3>Ops! Produtos indisponíveis</h3>
                        <p>Não foi possível carregar os produtos. Tente novamente.</p>
                    </div>
                `;
            }
        },
    };

    // ======================================================
    // CARROSSEL DE DESTAQUES
    // ======================================================
    const FeaturedCarousel = {
        track: null,
        dotsContainer: null,
        prevBtn: null,
        nextBtn: null,
        slides: 0,
        currentIndex: 0,
        itemsPerView: 5,
        maxIndex: 0,

        init({ track, dotsContainer, prevBtn, nextBtn }) {
            this.track = track;
            this.dotsContainer = dotsContainer;
            this.prevBtn = prevBtn;
            this.nextBtn = nextBtn;
            this.slides = track.querySelectorAll('.product-card').length;
            this.currentIndex = 0;

            if (this.slides === 0) return;

            this.calculateItemsPerView();
            this.calculateMaxIndex();
            this.renderDots();
            this.attachEvents();
            this.update();

            const debouncedResize = U.debounce(() => {
                this.calculateItemsPerView();
                this.calculateMaxIndex();
                this.currentIndex = Math.min(this.currentIndex, this.maxIndex);
                this.renderDots();
                this.update();
            }, 200);

            window.addEventListener('resize', debouncedResize);
        },

        calculateItemsPerView() {
            const width = window.innerWidth;
            if (width <= 480) this.itemsPerView = 1;
            else if (width <= 768) this.itemsPerView = 2;
            else if (width <= 1024) this.itemsPerView = 3;
            else if (width <= 1200) this.itemsPerView = 4;
            else this.itemsPerView = 5;
        },

        calculateMaxIndex() {
            this.maxIndex = Math.max(0, this.slides - this.itemsPerView);
        },

        get totalPages() {
            if (this.slides <= this.itemsPerView) return 1;
            return this.maxIndex + 1;
        },

        renderDots() {
            if (!this.dotsContainer) return;
            this.dotsContainer.innerHTML = '';
            if (this.totalPages <= 1) return;

            for (let i = 0; i < this.totalPages; i++) {
                const dot = document.createElement('button');
                dot.className = 'featured-dot';
                dot.setAttribute('aria-label', `Ir para produto ${i + 1}`);
                dot.dataset.index = i;
                dot.addEventListener('click', () => this.goTo(i));
                this.dotsContainer.appendChild(dot);
            }
        },

        attachEvents() {
            this.prevBtn?.addEventListener('click', () => this.prev());
            this.nextBtn?.addEventListener('click', () => this.next());

            let touchStartX = 0;
            let touchEndX = 0;

            this.track.addEventListener(
                'touchstart',
                (e) => {
                    touchStartX = e.changedTouches[0].screenX;
                },
                { passive: true }
            );

            this.track.addEventListener('touchend', (e) => {
                touchEndX = e.changedTouches[0].screenX;
                const diff = touchStartX - touchEndX;
                if (Math.abs(diff) > 40) {
                    if (diff > 0) this.next();
                    else this.prev();
                }
            });
        },

        goTo(index) {
            this.currentIndex = Math.max(0, Math.min(index, this.maxIndex));
            this.update();
        },

        next() {
            if (this.currentIndex < this.maxIndex) {
                this.currentIndex++;
                this.update();
            }
        },

        prev() {
            if (this.currentIndex > 0) {
                this.currentIndex--;
                this.update();
            }
        },

        update() {
            const cards = this.track.querySelectorAll('.product-card');
            if (cards.length === 0) return;

            const card = cards[0];
            const cardWidth = card.offsetWidth;
            const gap = parseFloat(getComputedStyle(this.track).gap) || 0;
            const offset = -(cardWidth + gap) * this.currentIndex;

            this.track.style.transform = `translateX(${offset}px)`;

            if (this.dotsContainer) {
                this.dotsContainer.querySelectorAll('.featured-dot').forEach((dot, i) => {
                    dot.classList.toggle('active', i === this.currentIndex);
                });
            }

            if (this.prevBtn) this.prevBtn.disabled = this.currentIndex === 0;
            if (this.nextBtn) this.nextBtn.disabled = this.currentIndex >= this.maxIndex;
        },
    };

    // ======================================================
    // CATEGORIAS NA HOME (grid desktop / carrossel mobile)
    // ======================================================
    const HomeCategories = {
        ICONS: {
            vestuario: 'fa-tshirt',
            perfumaria: 'fa-spray-can',
            'artigos-esportivos': 'fa-running',
        },

        categories: [],

        async init() {
            const grid = document.getElementById('homeCategoriesGrid');
            const dotsContainer = document.getElementById('homeCategoriesDots');
            const prevBtn = document.getElementById('homeCategoriesPrev');
            const nextBtn = document.getElementById('homeCategoriesNext');

            if (!grid) return;

            try {
                this.categories = await API.get('/categories/tree-full', {
                    useCache: true,
                    ttl: 5 * 60 * 1000,
                });

                if (!this.categories || this.categories.length === 0) {
                    grid.innerHTML = `
                        <div class="home-categories-error">
                            <i class="fas fa-box-open"></i>
                            <p>Nenhuma categoria disponível</p>
                        </div>
                    `;
                    return;
                }

                grid.innerHTML = this.categories
                    .map((cat) => C.renderCategoryCard(cat, {
                        icon: this.ICONS[cat.slug] || 'fa-tag',
                        href: `/categoria?category=${cat.slug}`,
                        arrowLabel: 'Escolher',
                    }))
                    .join('');

                this.setupCarousel(grid, dotsContainer, prevBtn, nextBtn);
            } catch (error) {
                console.error('Erro ao carregar categorias da home:', error);
                grid.innerHTML = `
                    <div class="home-categories-error">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Erro ao carregar categorias</p>
                    </div>
                `;
            }
        },

        setupCarousel(grid, dotsContainer, prevBtn, nextBtn) {
            if (dotsContainer) dotsContainer.innerHTML = '';

            let currentIndex = 0;
            let isTransitioning = false;

            const isMobile = () => window.innerWidth <= CONFIG.promo.mobileBreakpoint;

            const applyLayout = () => {
                const btns = document.querySelectorAll('.home-categories-btn');
                const dots = document.getElementById('homeCategoriesDots');

                if (isMobile()) {
                    grid.classList.add('is-carousel');
                    btns.forEach((b) => b.removeAttribute('hidden'));
                    dots?.removeAttribute('hidden');
                } else {
                    grid.classList.remove('is-carousel');
                    btns.forEach((b) => b.setAttribute('hidden', ''));
                    dots?.setAttribute('hidden', '');
                }
                updateCarousel(false);
            };

            const updateCarousel = (animate = true) => {
                if (!isMobile()) {
                    grid.style.transition = 'none';
                    grid.style.transform = '';
                    return;
                }

                const total = this.categories.length;
                if (total === 0) return;

                currentIndex = Math.max(0, Math.min(currentIndex, total - 1));

                const card = grid.querySelector('.category-card');
                if (!card) return;

                const cardWidth = card.offsetWidth;
                const gap = parseFloat(getComputedStyle(grid).gap) || 0;
                const offset = -(cardWidth + gap) * currentIndex;

                grid.style.transition = animate
                    ? 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
                    : 'none';
                grid.style.transform = `translateX(${offset}px)`;

                if (dotsContainer) {
                    dotsContainer.querySelectorAll('.home-categories-dot').forEach((dot, i) => {
                        dot.classList.toggle('active', i === currentIndex);
                    });
                }

                if (prevBtn) prevBtn.disabled = currentIndex === 0;
                if (nextBtn) nextBtn.disabled = currentIndex >= total - 1;
            };

            const renderDots = () => {
                if (!dotsContainer) return;
                dotsContainer.innerHTML = '';

                if (!isMobile() || this.categories.length <= 1) return;

                this.categories.forEach((_, i) => {
                    const dot = document.createElement('button');
                    dot.className = 'home-categories-dot';
                    dot.setAttribute('aria-label', `Ir para categoria ${i + 1}`);
                    dot.addEventListener('click', () => {
                        currentIndex = i;
                        updateCarousel(true);
                    });
                    dotsContainer.appendChild(dot);
                });
                updateCarousel(false);
            };

            const goTo = (index) => {
                if (isTransitioning) return;
                const total = this.categories.length;
                if (index < 0 || index >= total || index === currentIndex) return;

                isTransitioning = true;
                currentIndex = index;
                updateCarousel(true);
                setTimeout(() => {
                    isTransitioning = false;
                }, 450);
            };

            prevBtn?.addEventListener('click', () => goTo(currentIndex - 1));
            nextBtn?.addEventListener('click', () => goTo(currentIndex + 1));

            let touchStartX = 0;
            let touchStartY = 0;
            let isSwiping = false;

            grid.addEventListener(
                'touchstart',
                (e) => {
                    if (!isMobile() || isTransitioning) return;
                    touchStartX = e.touches[0].clientX;
                    touchStartY = e.touches[0].clientY;
                    isSwiping = false;
                },
                { passive: true }
            );

            grid.addEventListener(
                'touchmove',
                (e) => {
                    if (!isMobile() || isTransitioning) return;
                    const deltaX = e.touches[0].clientX - touchStartX;
                    const deltaY = e.touches[0].clientY - touchStartY;
                    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 5) {
                        isSwiping = true;
                        e.preventDefault();
                    }
                },
                { passive: false }
            );

            grid.addEventListener('touchend', (e) => {
                if (!isMobile() || isTransitioning) return;
                if (isSwiping) {
                    const deltaX = e.changedTouches[0].clientX - touchStartX;
                    if (Math.abs(deltaX) > 40) {
                        if (deltaX < 0) goTo(currentIndex + 1);
                        else goTo(currentIndex - 1);
                    }
                }
                isSwiping = false;
            });

            const debouncedResize = U.debounce(() => {
                applyLayout();
                renderDots();
            }, 200);

            window.addEventListener('resize', debouncedResize);

            applyLayout();
            renderDots();
        },
    };

    // ======================================================
    // MEGA MENU
    // ======================================================
    const MegaMenu = {
        async init() {
            try {
                const tree = await API.get('/categories/tree-full', {
                    useCache: true,
                    ttl: 5 * 60 * 1000,
                });

                tree.forEach((category) => {
                    try {
                        const dropdown = document.querySelector(`.dropdown[data-category="${category.slug}"]`);
                        if (!dropdown) return;

                        const content = dropdown.querySelector('.dropdown-content');
                        if (!content) return;

                        content.innerHTML = '';

                        if (category.children && category.children.length > 0) {
                            const grid = document.createElement('div');
                            grid.className = 'mega-grid';

                            category.children.forEach((gender) => {
                                const column = document.createElement('div');
                                column.className = 'mega-column';

                                const genderTitle = document.createElement('h4');
                                genderTitle.className = 'mega-title';
                                const genderLink = document.createElement('a');
                                genderLink.href = `/categoria?category=${gender.slug}`;
                                genderLink.textContent = gender.name;
                                genderTitle.appendChild(genderLink);
                                column.appendChild(genderTitle);

                                if (gender.children && gender.children.length > 0) {
                                    const list = document.createElement('ul');
                                    list.className = 'mega-list';

                                    gender.children.forEach((type) => {
                                        const li = document.createElement('li');
                                        const a = document.createElement('a');
                                        a.href = `/categoria?category=${type.slug}`;
                                        a.textContent = type.name;
                                        a.setAttribute('role', 'menuitem');
                                        li.appendChild(a);
                                        list.appendChild(li);
                                    });

                                    column.appendChild(list);
                                } else {
                                    const empty = document.createElement('p');
                                    empty.className = 'mega-empty';
                                    empty.textContent = 'Em breve';
                                    column.appendChild(empty);
                                }

                                grid.appendChild(column);
                            });

                            content.appendChild(grid);
                        } else {
                            content.innerHTML = '<p class="mega-empty">Em breve</p>';
                        }
                    } catch (catError) {
                        console.error(`Erro ao processar categoria ${category.slug}:`, catError);
                    }
                });

                console.log('✅ Menu de categorias carregado');
            } catch (error) {
                console.error('Erro ao carregar menu de categorias:', error);
            }
        },
    };

    // ======================================================
    // MODAL DE BUSCA
    // ======================================================
    const SearchModal = {
        modal: null,
        input: null,
        resultsEl: null,
        debounceTimer: null,
        lastQuery: '',
        limit: 8,

        init() {
            const searchBtn = document.getElementById('searchBtn');
            if (!searchBtn) return;

            this.buildModal();
            searchBtn.addEventListener('click', () => this.open());

            document.addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                    e.preventDefault();
                    this.open();
                } else if (e.key === '/' && !this.isInputFocused()) {
                    e.preventDefault();
                    this.open();
                } else if (e.key === 'Escape' && this.modal.classList.contains('active')) {
                    this.close();
                }
            });
        },

        isInputFocused() {
            const tag = document.activeElement?.tagName?.toLowerCase();
            return tag === 'input' || tag === 'textarea' || tag === 'select';
        },

        buildModal() {
            this.modal = document.createElement('div');
            this.modal.className = 'search-modal';
            this.modal.id = 'searchModal';
            this.modal.setAttribute('role', 'dialog');
            this.modal.setAttribute('aria-modal', 'true');
            this.modal.setAttribute('aria-label', 'Buscar produtos');
            this.modal.innerHTML = `
                <div class="search-modal-backdrop"></div>
                <div class="search-modal-content">
                    <button class="search-modal-close" id="closeSearchModal" aria-label="Fechar busca">
                        <i class="fas fa-times"></i>
                    </button>
                    <div class="search-modal-header">
                        <div class="search-modal-input-wrapper">
                            <i class="fas fa-search"></i>
                            <input type="text" id="searchModalInput" class="search-modal-input"
                                placeholder="Buscar por nome ou descrição do produto..."
                                autocomplete="off" aria-label="Campo de busca">
                            <button class="search-modal-clear" id="searchModalClear" aria-label="Limpar busca" style="display:none;">
                                <i class="fas fa-times-circle"></i>
                            </button>
                        </div>
                        <p class="search-modal-hint">
                            <i class="fas fa-lightbulb"></i> Dica: use <kbd>Ctrl</kbd> + <kbd>K</kbd> para abrir a busca
                        </p>
                    </div>
                    <div class="search-modal-results" id="searchModalResults"></div>
                </div>
            `;
            document.body.appendChild(this.modal);

            this.input = this.modal.querySelector('#searchModalInput');
            this.resultsEl = this.modal.querySelector('#searchModalResults');
            const closeBtn = this.modal.querySelector('#closeSearchModal');
            const clearBtn = this.modal.querySelector('#searchModalClear');
            const backdrop = this.modal.querySelector('.search-modal-backdrop');

            closeBtn.addEventListener('click', () => this.close());
            backdrop.addEventListener('click', () => this.close());
            clearBtn.addEventListener('click', () => {
                this.input.value = '';
                this.input.focus();
                clearBtn.style.display = 'none';
                this.showEmpty();
            });

            this.input.addEventListener('input', (e) => {
                const val = e.target.value.trim();
                clearBtn.style.display = val ? 'flex' : 'none';
                clearTimeout(this.debounceTimer);
                this.debounceTimer = setTimeout(() => this.search(val), 300);
            });

            this.input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const val = this.input.value.trim();
                    if (val) window.location.href = `/produtos?search=${encodeURIComponent(val)}`;
                }
            });

            this.showEmpty();
        },

        open() {
            this.modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            setTimeout(() => this.input.focus(), 50);
        },

        close() {
            this.modal.classList.remove('active');
            document.body.style.overflow = '';
            this.input.value = '';
            this.modal.querySelector('#searchModalClear').style.display = 'none';
            this.showEmpty();
        },

        showEmpty() {
            this.resultsEl.innerHTML = `
                <div class="search-modal-empty">
                    <i class="fas fa-search"></i>
                    <h3>O que você está procurando?</h3>
                    <p>Digite o nome do produto para começar</p>
                </div>
            `;
        },

        showLoading() {
            this.resultsEl.innerHTML = `
                <div class="search-modal-loading">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>Buscando produtos...</span>
                </div>
            `;
        },

        showNoResults(query) {
            this.resultsEl.innerHTML = `
                <div class="search-modal-empty">
                    <i class="fas fa-box-open"></i>
                    <h3>Nenhum produto encontrado</h3>
                    <p>Não encontramos resultados para "<strong>${U.escapeHtml(query)}</strong>"</p>
                    <p class="search-modal-hint-sub">Tente buscar por outra palavra</p>
                </div>
            `;
        },

        showError() {
            this.resultsEl.innerHTML = `
                <div class="search-modal-empty">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Erro ao buscar produtos</h3>
                    <p>Tente novamente em alguns instantes</p>
                </div>
            `;
        },

        async search(query) {
            if (!query || query.length < 2) {
                this.showEmpty();
                return;
            }
            if (query === this.lastQuery) return;
            this.lastQuery = query;

            this.showLoading();

            try {
                const data = await API.get(
                    `/products?search=${encodeURIComponent(query)}&limit=${this.limit}&sort=name&order=ASC`
                );
                const products = data.products || [];

                if (products.length === 0) {
                    this.showNoResults(query);
                    return;
                }

                this.renderResults(products, data.pagination);
            } catch (error) {
                console.error('Erro ao buscar:', error);
                this.showError();
            }
        },

        renderResults(products, pagination) {
            const itemsHtml = products.map((p) => {
                const hasImage = p.images && p.images.length > 0 && p.images[0].url;
                const imageHtml = hasImage
                    ? `<img src="${U.escapeAttr(p.images[0].url)}" alt="${U.escapeAttr(p.name)}" onerror="this.parentElement.innerHTML='<i class=\\'fas fa-image\\'></i>'">`
                    : `<i class="fas fa-image"></i>`;

                const category = p.category_name || '';
                const brand = p.brand_name ? ` · ${U.escapeHtml(p.brand_name)}` : '';

                const originalPrice = parseFloat(p.price);
                const discount = parseFloat(p.discount_percent || 0);
                const currentPrice = discount > 0 ? originalPrice * (1 - discount / 100) : originalPrice;

                const discountBadge = discount > 0
                    ? `<span class="search-result-discount">-${discount.toFixed(0)}%</span>`
                    : '';

                const oldPrice = discount > 0
                    ? `<span class="search-result-old-price">${U.formatPrice(originalPrice)}</span>`
                    : '';

                return `
                    <a href="/produto/${U.escapeAttr(p.slug)}" class="search-result-card">
                        <div class="search-result-image">${imageHtml}</div>
                        <div class="search-result-info">
                            <h4 class="search-result-name">${U.escapeHtml(p.name)}</h4>
                            <p class="search-result-category">${U.escapeHtml(category)}${brand}</p>
                            <div class="search-result-price-row">
                                ${discountBadge}
                                <span class="search-result-price">${U.formatPrice(currentPrice)}</span>
                                ${oldPrice}
                            </div>
                        </div>
                        <i class="fas fa-arrow-right search-result-arrow"></i>
                    </a>
                `;
            }).join('');

            const total = pagination?.total || products.length;
            const hasMore = total > products.length;

            const footerHtml = hasMore
                ? `
                    <div class="search-modal-footer">
                        <a href="/produtos?search=${encodeURIComponent(this.lastQuery)}" class="search-modal-view-all">
                            Ver todos os ${total} resultados
                            <i class="fas fa-arrow-right"></i>
                        </a>
                    </div>
                `
                : '';

            this.resultsEl.innerHTML = `
                <div class="search-modal-count">
                    <strong>${total}</strong> ${total === 1 ? 'resultado' : 'resultados'} para "${U.escapeHtml(this.lastQuery)}"
                </div>
                <div class="search-modal-list">${itemsHtml}</div>
                ${footerHtml}
            `;
        },
    };

    // ======================================================
    // ATENDIMENTO AO CLIENTE
    // ======================================================
    const CustomerService = {
        init() {
            const btn = document.querySelector('.customer-service-btn');
            btn?.addEventListener('click', () => this.open());
        },

        open() {
            const modal = document.createElement('div');
            modal.className = 'modal active';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 400px;">
                    <button class="close-modal" onclick="this.closest('.modal').remove()">&times;</button>
                    <div class="modal-icon"><i class="fas fa-headset"></i></div>
                    <h2>Atendimento ao Cliente</h2>
                    <p style="color: var(--gray-600); margin-bottom: 1.5rem;">Em breve um de nossos atendentes entrará em contato.</p>
                    <p style="color: var(--gray-500); font-size: 0.9rem;">
                        <i class="fas fa-phone"></i> (11) 9999-9999<br>
                        <i class="fas fa-envelope"></i> contato@luxurystore.com
                    </p>
                    <button class="btn btn-primary" onclick="this.closest('.modal').remove()" style="margin-top: 1.5rem; width: 100%;">Fechar</button>
                </div>
            `;
            document.body.appendChild(modal);
            U.announce('Atendimento ao cliente aberto');
        },
    };

    // ======================================================
    // INICIALIZAÇÃO
    // ======================================================
    document.addEventListener('DOMContentLoaded', async () => {
        observeAnimateOnScroll();

        Header.init();
        MobileMenu.init();
        Dropdowns.init();
        HeroCarousel.init();
        PromoCarousel.init();
        CouponModal.init();
        InfoModal.init();
        LocationModal.init();
        Newsletter.init();
        CustomerService.init();

        await Promise.all([
            FeaturedProducts.load(),
            MegaMenu.init(),
        ]);

        await HomeCategories.init();

        SearchModal.init();

        console.log('✅ Luxury Store - Sistema carregado com sucesso!');
    });
})();