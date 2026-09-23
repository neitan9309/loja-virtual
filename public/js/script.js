// ======================================================
// FIX DE SEGURANÇA: Corrige links do menu se estiverem com "#"
// Deve rodar ANTES de qualquer outra coisa
// ======================================================
(function() {
    'use strict';

    const MENU_LINKS = {
        'vestuario': '/categoria?category=vestuario',
        'perfumaria': '/categoria?category=perfumaria',
        'artigos-esportivos': '/categoria?category=artigos-esportivos'
    };

    function fixMenuLinks() {
        // Corrige links das categorias principais
        document.querySelectorAll('.dropdown[data-category] .nav-link.dropdown-toggle').forEach(link => {
            const dropdown = link.closest('.dropdown');
            const category = dropdown?.dataset.category;
            const correctHref = MENU_LINKS[category];
            const currentHref = link.getAttribute('href');

            if (correctHref && (currentHref === '#' || currentHref === '' || !currentHref)) {
                link.setAttribute('href', correctHref);
                console.log(`🔧 Corrigido: ${category} → ${correctHref}`);
            }
        });

        // Corrige "Novidades" (não tem data-category)
        document.querySelectorAll('.dropdown:not([data-category]) .nav-link.dropdown-toggle').forEach(link => {
            const label = link.querySelector('.dropdown-label')?.textContent?.trim();
            const currentHref = link.getAttribute('href');

            if (label === 'Novidades' && (currentHref === '#' || currentHref === '' || !currentHref)) {
                link.setAttribute('href', '/produtos?filter=featured');
                console.log('🔧 Corrigido: Novidades → /produtos?filter=featured');
            }
        });

        // Remove hash da URL atual (se houver)
        if (window.location.hash) {
            const cleanUrl = window.location.href.replace(/#.*$/, '');
            window.history.replaceState({}, '', cleanUrl);
        }
    }

    // Executa ao carregar
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fixMenuLinks);
    } else {
        fixMenuLinks();
    }

    // Reexecuta após o MegaMenu popular (por segurança)
    setTimeout(fixMenuLinks, 1500);
})();

// ======================================================
// CONFIGURAÇÕES
// ======================================================
const CONFIG = {
    carousel: { interval: 6000, transitionDuration: 600, swipeThreshold: 30 },
    scroll: { threshold: 0.15, rootMargin: '0px 0px -50px 0px' },
    promo: { mobileBreakpoint: 768, transitionDuration: 400 },
    newsletter: { couponCode: 'PRIMEIRA20', discount: '20%' }
};

// ======================================================
// UTILITÁRIOS
// ======================================================
const Utils = {
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => { clearTimeout(timeout); func(...args); };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    validateEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    },

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

    announce(message) {
        const announcer = document.getElementById('announcer');
        if (announcer) announcer.textContent = message;
    },

    formatPrice(value) {
        return parseFloat(value).toFixed(2).replace('.', ',');
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }
};

// ======================================================
// ANIMAÇÕES DE SCROLL
// ======================================================
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('visible');
    });
}, { threshold: CONFIG.scroll.threshold, rootMargin: CONFIG.scroll.rootMargin });

document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));

// ======================================================
// HEADER SCROLL
// ======================================================
const header = document.getElementById('header');
const hero = document.getElementById('heroCarousel');

function updateHeader() {
    if (!header) return;
    const scrollPosition = window.scrollY;

    if (hero) {
        const heroHeight = hero.offsetHeight;
        header.classList.toggle('scrolled', scrollPosition > heroHeight * 0.3);
        header.classList.toggle('at-top', scrollPosition < 50);
    }
}

const throttledUpdateHeader = Utils.throttle(updateHeader, 100);
window.addEventListener('scroll', throttledUpdateHeader);
window.addEventListener('resize', updateHeader);
updateHeader();

// ======================================================
// MENU MOBILE
// ======================================================
const menuToggle = document.getElementById('menuToggle');
const closeMenuBtn = document.getElementById('closeMenu');
const navMenu = document.getElementById('navMenu');
const menuOverlay = document.getElementById('menuOverlay');

function openMenu() {
    if (!navMenu || !menuOverlay || !menuToggle) return;
    navMenu.classList.add('active');
    menuOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    menuToggle.setAttribute('aria-expanded', 'true');
    Utils.announce('Menu aberto');
}

function closeMenu() {
    if (!navMenu || !menuOverlay || !menuToggle) return;
    navMenu.classList.remove('active');
    menuOverlay.classList.remove('active');
    document.body.style.overflow = '';
    menuToggle.setAttribute('aria-expanded', 'false');
    document.querySelectorAll('.dropdown').forEach(d => {
        d.classList.remove('active');
        const icon = d.querySelector('.dropdown-icon');
        if (icon) icon.style.transform = 'rotate(0deg)';
    });
    Utils.announce('Menu fechado');
}

menuToggle?.addEventListener('click', openMenu);
closeMenuBtn?.addEventListener('click', closeMenu);
menuOverlay?.addEventListener('click', closeMenu);

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navMenu?.classList.contains('active')) closeMenu();
});

// ======================================================
// DROPDOWNS - apenas comportamento mobile
// ======================================================
document.querySelectorAll('.dropdown').forEach(dropdown => {
    const toggle = dropdown.querySelector('.dropdown-toggle');
    const icon = dropdown.querySelector('.dropdown-icon');

    if (!toggle) return;

    toggle.addEventListener('click', function(e) {
        const isMobile = window.innerWidth <= CONFIG.promo.mobileBreakpoint;
        const href = toggle.getAttribute('href') || '';
        const isHash = href === '#' || href === '';

        // Desktop: navegador cuida (não previne)
        if (!isMobile) return;

        // Mobile + href real: navega normalmente (não previne)
        if (!isHash) return;

        // Mobile + href '#': abre/fecha submenu
        e.preventDefault();
        e.stopPropagation();

        const isActive = dropdown.classList.contains('active');

        document.querySelectorAll('.dropdown').forEach(d => {
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

    // Fecha menu mobile ao clicar em links
    dropdown.querySelectorAll('.dropdown-content a, .mega-list a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.innerWidth <= CONFIG.promo.mobileBreakpoint) {
                closeMenu();
            }
        });
    });
});

// ======================================================
// HERO CAROUSEL
// ======================================================
const slides = document.querySelectorAll('.carousel-slide');
const dots = document.querySelectorAll('.carousel-dots .dot');
const prevBtn = document.querySelector('.prev-btn');
const nextBtn = document.querySelector('.next-btn');
let currentSlide = 0;
let autoPlayInterval;
let isTransitioning = false;

function showSlide(index) {
    if (isTransitioning || !slides.length) return;
    isTransitioning = true;
    slides.forEach(s => s.classList.remove('active'));
    dots.forEach(d => d.classList.remove('active'));
    slides[index].classList.add('active');
    dots[index].classList.add('active');
    currentSlide = index;
    dots.forEach((d, i) => d.setAttribute('aria-selected', i === index ? 'true' : 'false'));
    Utils.announce(`Slide ${index + 1} de ${slides.length}`);
    setTimeout(() => { isTransitioning = false; }, CONFIG.carousel.transitionDuration);
}

function nextSlideFunc() { if (slides.length) showSlide((currentSlide + 1) % slides.length); }
function prevSlideFunc() { if (slides.length) showSlide((currentSlide - 1 + slides.length) % slides.length); }

function startAutoPlay() {
    stopAutoPlay();
    if (slides.length > 1) autoPlayInterval = setInterval(nextSlideFunc, CONFIG.carousel.interval);
}

function stopAutoPlay() {
    if (autoPlayInterval) { clearInterval(autoPlayInterval); autoPlayInterval = null; }
}

prevBtn?.addEventListener('click', () => { prevSlideFunc(); startAutoPlay(); });
nextBtn?.addEventListener('click', () => { nextSlideFunc(); startAutoPlay(); });
dots.forEach((dot, i) => dot.addEventListener('click', () => { showSlide(i); startAutoPlay(); }));

const carousel = document.querySelector('.hero-carousel');
let touchStartX = 0, touchStartY = 0, isDragging = false, startPos = 0, currentTranslate = 0;

if (carousel) {
    carousel.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
        stopAutoPlay();
    }, { passive: true });

    carousel.addEventListener('touchmove', (e) => {
        const diffX = e.changedTouches[0].screenX - touchStartX;
        const diffY = e.changedTouches[0].screenY - touchStartY;
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) e.preventDefault();
    }, { passive: false });

    carousel.addEventListener('touchend', (e) => {
        const diffX = e.changedTouches[0].screenX - touchStartX;
        const diffY = e.changedTouches[0].screenY - touchStartY;
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > CONFIG.carousel.swipeThreshold) {
            if (diffX < 0) nextSlideFunc(); else prevSlideFunc();
        }
        startAutoPlay();
    });

    carousel.addEventListener('mousedown', (e) => {
        isDragging = true; startPos = e.pageX; stopAutoPlay();
        carousel.style.cursor = 'grabbing';
    });

    carousel.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        currentTranslate = e.pageX - startPos;
    });

    carousel.addEventListener('mouseup', () => {
        if (!isDragging) return;
        isDragging = false; carousel.style.cursor = '';
        if (Math.abs(currentTranslate) > CONFIG.carousel.swipeThreshold) {
            if (currentTranslate < 0) nextSlideFunc(); else prevSlideFunc();
        }
        currentTranslate = 0; startAutoPlay();
    });

    carousel.addEventListener('mouseleave', () => {
        if (isDragging) { isDragging = false; carousel.style.cursor = ''; startAutoPlay(); }
    });

    carousel.addEventListener('mouseenter', stopAutoPlay);
    carousel.addEventListener('mouseleave', startAutoPlay);
    startAutoPlay();
}

// ======================================================
// PROMOÇÕES MOBILE
// ======================================================
(function() {
    const track = document.getElementById('promoTrack');
    const promos = document.querySelectorAll('.promo-slide');
    const promoDots = document.querySelectorAll('#promoDots .promo-dot');
    const prevB = document.getElementById('prevPromo');
    const nextB = document.getElementById('nextPromo');

    if (!track || !promos.length) return;

    let currentIndex = 0, isTransitioning = false, touchStartX = 0, touchStartY = 0, isSwiping = false;
    const total = promos.length;

    function isMobile() { return window.innerWidth <= CONFIG.promo.mobileBreakpoint; }

    function updateCarousel(animate = true) {
        if (!isMobile()) {
            track.style.transition = 'none';
            track.style.transform = 'translateX(0)';
            currentIndex = 0;
            updateDots(0); updateButtons();
            return;
        }
        track.style.transition = animate ? `transform ${CONFIG.promo.transitionDuration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)` : 'none';
        track.style.transform = `translateX(-${currentIndex * 100}%)`;
        updateDots(currentIndex); updateButtons();
    }

    function updateDots(activeIndex) {
        promoDots.forEach((dot, i) => dot.classList.toggle('active', i === activeIndex));
    }

    function updateButtons() {
        if (!prevB || !nextB) return;
        prevB.style.opacity = currentIndex === 0 ? '0.3' : '1';
        prevB.style.pointerEvents = currentIndex === 0 ? 'none' : 'auto';
        nextB.style.opacity = currentIndex === total - 1 ? '0.3' : '1';
        nextB.style.pointerEvents = currentIndex === total - 1 ? 'none' : 'auto';
    }

    function goToSlide(index) {
        if (isTransitioning || index < 0 || index >= total || index === currentIndex) return;
        isTransitioning = true;
        currentIndex = index;
        updateCarousel(true);
        setTimeout(() => { isTransitioning = false; }, CONFIG.promo.transitionDuration + 50);
    }

    prevB?.addEventListener('click', (e) => { e.preventDefault(); goToSlide(currentIndex - 1); });
    nextB?.addEventListener('click', (e) => { e.preventDefault(); goToSlide(currentIndex + 1); });
    promoDots.forEach((dot, i) => dot.addEventListener('click', (e) => { e.preventDefault(); goToSlide(i); }));

    track.addEventListener('touchstart', (e) => {
        if (!isMobile() || isTransitioning) return;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        isSwiping = false;
        track.style.transition = 'none';
    }, { passive: true });

    track.addEventListener('touchmove', (e) => {
        if (!isMobile() || isTransitioning) return;
        const deltaX = e.touches[0].clientX - touchStartX;
        const deltaY = e.touches[0].clientY - touchStartY;
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 5) {
            isSwiping = true;
            e.preventDefault();
            const offset = -currentIndex * 100 + (deltaX / track.offsetWidth) * 100;
            const maxOffset = -(total - 1) * 100;
            const clampedOffset = Math.max(maxOffset, Math.min(0, offset));
            track.style.transform = `translateX(${clampedOffset}%)`;
        }
    }, { passive: false });

    track.addEventListener('touchend', (e) => {
        if (!isMobile() || isTransitioning) return;
        if (isSwiping) {
            const deltaX = e.changedTouches[0].clientX - touchStartX;
            if (Math.abs(deltaX) > 30) {
                deltaX < 0 ? goToSlide(currentIndex + 1) : goToSlide(currentIndex - 1);
            } else {
                updateCarousel(true);
            }
        }
        isSwiping = false;
    });

    const debouncedResize = Utils.debounce(() => updateCarousel(false), 150);
    window.addEventListener('resize', debouncedResize);
    updateCarousel(false);
})();

// ======================================================
// MODAL DE CUPONS
// ======================================================
const couponModal = document.getElementById('couponModal');
const couponDesc = document.getElementById('modalDescription');
const couponCode = document.getElementById('couponCode');
const closeCouponBtn = document.getElementById('closeModal');
const copyBtn = document.getElementById('copyBtn');

function openCouponModal(code, desc) {
    if (!couponModal) return;
    couponCode.textContent = code;
    couponDesc.textContent = desc;
    couponModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    couponModal.focus();
    Utils.announce(`Cupom ${code} disponível para copiar`);
}

function closeCouponModalFunc() {
    if (!couponModal) return;
    couponModal.classList.remove('active');
    document.body.style.overflow = '';
}

document.querySelectorAll('.promo-card').forEach(card => {
    card.addEventListener('click', function() {
        const code = this.dataset.coupon;
        const desc = this.dataset.description;
        if (code && desc) openCouponModal(code, desc);
    });
});

closeCouponBtn?.addEventListener('click', closeCouponModalFunc);
couponModal?.addEventListener('click', (e) => { if (e.target === couponModal) closeCouponModalFunc(); });
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && couponModal?.classList.contains('active')) closeCouponModalFunc();
});

copyBtn?.addEventListener('click', async () => {
    const code = couponCode?.textContent;
    if (!code) return;
    const success = await Utils.copyToClipboard(code);
    if (success) {
        copyBtn.classList.add('copied');
        copyBtn.innerHTML = '<i class="fas fa-check"></i> Copiado!';
        Utils.announce('Cupom copiado para a área de transferência');
        setTimeout(() => {
            copyBtn.classList.remove('copied');
            copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copiar';
        }, 2000);
    }
});

// ======================================================
// MODAL SAIBA MAIS
// ======================================================
const infoModal = document.getElementById('infoModal');
const closeInfoBtn = document.getElementById('closeInfoModal');
const btnSaibaMais = document.getElementById('btnSaibaMais');

function openInfoModalFunc() {
    if (!infoModal) return;
    infoModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    Utils.announce('Modal de benefícios aberto');
}

function closeInfoModalFunc() {
    if (!infoModal) return;
    infoModal.classList.remove('active');
    document.body.style.overflow = '';
}

btnSaibaMais?.addEventListener('click', (e) => { e.preventDefault(); openInfoModalFunc(); });
closeInfoBtn?.addEventListener('click', closeInfoModalFunc);
infoModal?.addEventListener('click', (e) => { if (e.target === infoModal) closeInfoModalFunc(); });
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && infoModal?.classList.contains('active')) closeInfoModalFunc();
});

// ======================================================
// MODAL LOCALIZAÇÃO
// ======================================================
const locationModal = document.getElementById('locationModal');
const closeLocationBtn = document.getElementById('closeLocationModal');
const btnVerLocalizacoes = document.getElementById('btnVerLocalizacoes');
const locationMap = document.getElementById('locationMap');
const locationBtns = document.querySelectorAll('.location-btn');

const locationMapsData = {
    'asa-sul': 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3839.1!2d-47.89!3d-15.82!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x935a3b3d3a1e5e2b%3A0x8d4e0a5c5a5e5e5e!2sAsa+Sul%2C+Bras%C3%ADlia!5e0!3m2!1spt-BR!2sbr',
    'asa-norte': 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3839.2!2d-47.87!3d-15.76!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x935a3b3d3a1e5e2b%3A0x8d4e0a5c5a5e5e5e!2sAsa+Norte%2C+Bras%C3%ADlia!5e0!3m2!1spt-BR!2sbr',
    'esplanada': 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3839.263572809456!2d-47.882516!3d-15.789356!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x935a3b3d3a1e5e2b%3A0x8d4e0a5c5a5e5e5e!2sEsplanada+dos+Minist%C3%A9rios%2C+Bras%C3%ADlia!5e0!3m2!1spt-BR!2sbr'
};

function openLocationModalFunc() {
    if (!locationModal) return;
    locationModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    activateLocation('asa-sul');
    Utils.announce('Modal de localizações aberto');
}

function closeLocationModalFunc() {
    if (!locationModal) return;
    locationModal.classList.remove('active');
    document.body.style.overflow = '';
}

function activateLocation(location) {
    if (!locationMapsData[location]) return;
    locationBtns.forEach(btn => {
        const isActive = btn.getAttribute('data-location') === location;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-checked', isActive ? 'true' : 'false');
    });
    if (locationMap) locationMap.src = locationMapsData[location];
    Utils.announce(`Localização: ${location.replace('-', ' ').toUpperCase()}`);
}

btnVerLocalizacoes?.addEventListener('click', (e) => { e.preventDefault(); openLocationModalFunc(); });
closeLocationBtn?.addEventListener('click', closeLocationModalFunc);
locationModal?.addEventListener('click', (e) => { if (e.target === locationModal) closeLocationModalFunc(); });
locationBtns.forEach(btn => btn.addEventListener('click', function() {
    const location = this.getAttribute('data-location');
    if (location) activateLocation(location);
}));
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && locationModal?.classList.contains('active')) closeLocationModalFunc();
});

// ======================================================
// NEWSLETTER
// ======================================================
const newsletterForm = document.getElementById('newsletterForm');
const newsletterModal = document.createElement('div');
newsletterModal.className = 'modal';
newsletterModal.id = 'newsletterModal';
newsletterModal.setAttribute('role', 'dialog');
newsletterModal.setAttribute('aria-modal', 'true');
newsletterModal.setAttribute('aria-labelledby', 'newsletterModalTitle');

newsletterModal.innerHTML = `
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

document.body.appendChild(newsletterModal);

const closeNewsletterModal = document.getElementById('closeNewsletterModal');
const newsletterModalBtn = document.getElementById('newsletterModalBtn');
const newsletterEmailDisplay = document.getElementById('newsletterEmailDisplay');
const newsletterModalMessage = document.getElementById('newsletterModalMessage');

function openNewsletterModal(email) {
    newsletterModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    if (newsletterEmailDisplay) newsletterEmailDisplay.textContent = email;
    if (newsletterModalMessage) newsletterModalMessage.textContent = `Cupom de ${CONFIG.newsletter.discount} enviado para: ${email}`;
    Utils.announce(`Cadastro realizado! Cupom enviado para ${email}`);
}

function closeNewsletterModalFunc() {
    newsletterModal.classList.remove('active');
    document.body.style.overflow = '';
}

closeNewsletterModal?.addEventListener('click', closeNewsletterModalFunc);
newsletterModalBtn?.addEventListener('click', closeNewsletterModalFunc);
newsletterModal?.addEventListener('click', (e) => { if (e.target === newsletterModal) closeNewsletterModalFunc(); });
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && newsletterModal?.classList.contains('active')) closeNewsletterModalFunc();
});

const newsletterFeedback = document.getElementById('newsletterFeedback');

newsletterForm?.addEventListener('submit', function(e) {
    e.preventDefault();
    const emailInput = this.querySelector('.newsletter-input');
    const btn = this.querySelector('.newsletter-btn');
    const originalText = btn.textContent;
    const email = emailInput.value.trim();

    if (!Utils.validateEmail(email)) {
        emailInput.style.borderColor = '#dc3545';
        emailInput.style.boxShadow = '0 0 0 3px rgba(220, 53, 69, 0.25)';
        if (newsletterFeedback) {
            newsletterFeedback.textContent = '⚠️ Por favor, insira um e-mail válido.';
            newsletterFeedback.style.color = '#dc3545';
        }
        setTimeout(() => {
            emailInput.style.borderColor = '';
            emailInput.style.boxShadow = '';
            if (newsletterFeedback) newsletterFeedback.textContent = '';
        }, 3000);
        emailInput.focus();
        return;
    }

    btn.textContent = 'Enviando...';
    btn.disabled = true;
    emailInput.disabled = true;

    setTimeout(() => {
        openNewsletterModal(email);
        this.reset();
        btn.textContent = originalText;
        btn.disabled = false;
        emailInput.disabled = false;
        emailInput.style.borderColor = '';
        emailInput.style.boxShadow = '';
        if (newsletterFeedback) newsletterFeedback.textContent = '';
    }, 1200);
});

// ======================================================
// PRODUTOS EM DESTAQUE (CARROSSEL)
// ======================================================
async function loadFeaturedProducts() {
    const track = document.getElementById('featuredTrack');
    const dotsContainer = document.getElementById('featuredDots');
    if (!track) return;

    // Estado limpo
    track.innerHTML = '<div class="featured-loading"><i class="fas fa-spinner fa-spin"></i><span>Carregando produtos...</span></div>';
    if (dotsContainer) dotsContainer.innerHTML = '';

    try {
        const response = await fetch('/api/products?featured=true&limit=20');
        if (!response.ok) throw new Error('Erro ao buscar produtos');

        const data = await response.json();
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

        // Renderiza os cards
        track.innerHTML = products.map(product => buildFeaturedCard(product)).join('');

        // Inicializa o carrossel
        FeaturedCarousel.init({
            track,
            dotsContainer,
            prevBtn: document.querySelector('.featured-prev'),
            nextBtn: document.querySelector('.featured-next')
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
}

// ======================================================
// CARD DO CARROSSEL DE DESTAQUES
// ======================================================
function buildFeaturedCard(product) {
    const hasImage = product.images && product.images.length > 0 && product.images[0].url;
    const imageHtml = hasImage
        ? `<img class="product-image" src="${product.images[0].url}" alt="${Utils.escapeHtml(product.name)}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'product-image-placeholder\\'><i class=\\'fas fa-image\\'></i></div>'">`
        : `<div class="product-image-placeholder"><i class="fas fa-image"></i></div>`;

    const discountBadge = product.discount_percent > 0
        ? `<span class="product-badge discount">-${parseFloat(product.discount_percent).toFixed(0)}%</span>`
        : (product.is_new ? `<span class="product-badge">Novo</span>` : '');

    const originalPrice = parseFloat(product.price);
    const currentPrice = product.discount_percent > 0
        ? originalPrice * (1 - product.discount_percent / 100)
        : originalPrice;

    const oldPriceHtml = product.discount_percent > 0
        ? `<span class="product-old-price">R$ ${Utils.formatPrice(originalPrice)}</span>`
        : '';

    return `
        <article class="product-card">
            <div class="product-image-wrapper">
                ${discountBadge}
                ${imageHtml}
            </div>
            <div class="product-info">
                <h3 class="product-name">${Utils.escapeHtml(product.name)}</h3>
                ${product.short_description ? `<p class="product-short-desc">${Utils.escapeHtml(product.short_description)}</p>` : ''}
                <div class="product-price-wrapper">
                    <span class="product-price">R$ ${Utils.formatPrice(currentPrice)}</span>
                    ${oldPriceHtml}
                </div>
                <a href="/produto/${product.slug}" class="product-btn">Ver Produto</a>
            </div>
        </article>
    `;
}

// ======================================================
// CARROSSEL DE DESTAQUES - MÓDULO
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

        // Recalcula em resize
        const debouncedResize = Utils.debounce(() => {
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

    // Quantidade de "páginas" (dots)
    get totalPages() {
        // Se o número de slides for menor que o itemsPerView, só 1 página
        if (this.slides <= this.itemsPerView) return 1;
        // Cada dot representa uma posição possível (avanço de 1 card por vez)
        return this.maxIndex + 1;
    },

    renderDots() {
        if (!this.dotsContainer) return;
        this.dotsContainer.innerHTML = '';

        // Não mostra dots se não há paginação
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
        // Setas
        this.prevBtn?.addEventListener('click', () => this.prev());
        this.nextBtn?.addEventListener('click', () => this.next());

        // Teclado
        this.track.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') this.prev();
            if (e.key === 'ArrowRight') this.next();
        });

        // Swipe touch
        let touchStartX = 0;
        let touchEndX = 0;

        this.track.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        this.track.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            const diff = touchStartX - touchEndX;
            if (Math.abs(diff) > 40) {
                if (diff > 0) this.next();
                else this.prev();
            }
        });

        // Drag com mouse
        let isDragging = false;
        let startX = 0;
        let currentTranslate = 0;

        this.track.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.pageX;
            this.track.style.transition = 'none';
        });

        this.track.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            currentTranslate = e.pageX - startX;
        });

        const endDrag = () => {
            if (!isDragging) return;
            isDragging = false;
            this.track.style.transition = '';
            if (Math.abs(currentTranslate) > 50) {
                if (currentTranslate < 0) this.next();
                else this.prev();
            }
            currentTranslate = 0;
        };

        this.track.addEventListener('mouseup', endDrag);
        this.track.addEventListener('mouseleave', endDrag);
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
        // Calcula o deslocamento
        const cards = this.track.querySelectorAll('.product-card');
        if (cards.length === 0) return;

        const card = cards[0];
        const cardWidth = card.offsetWidth;
        const gap = parseFloat(getComputedStyle(this.track).gap) || 0;
        const offset = -(cardWidth + gap) * this.currentIndex;

        this.track.style.transform = `translateX(${offset}px)`;

        // Atualiza dots
        if (this.dotsContainer) {
            this.dotsContainer.querySelectorAll('.featured-dot').forEach((dot, i) => {
                dot.classList.toggle('active', i === this.currentIndex);
            });
        }

        // Habilita/desabilita setas
        if (this.prevBtn) this.prevBtn.disabled = this.currentIndex === 0;
        if (this.nextBtn) this.nextBtn.disabled = this.currentIndex >= this.maxIndex;

        Utils.announce(`Produto ${this.currentIndex + 1} de ${this.track.querySelectorAll('.product-card').length}`);
    }
};

// ======================================================
// MENU PÚBLICO - CATEGORIAS DINÂMICAS (MEGA MENU)
// ======================================================
const MegaMenu = {
    async init() {
        try {
            const response = await fetch('/api/categories/tree-full');
            if (!response.ok) throw new Error('Erro ao buscar categorias');

            const tree = await response.json();

            tree.forEach(category => {
                try {
                    const slugRoot = category.slug;
                    const dropdown = document.querySelector(`.dropdown[data-category="${slugRoot}"]`);

                    if (!dropdown) return;

                    const content = dropdown.querySelector('.dropdown-content');
                    if (!content) return;

                    content.innerHTML = '';

                    if (category.children && category.children.length > 0) {
                        const grid = document.createElement('div');
                        grid.className = 'mega-grid';

                        category.children.forEach(gender => {
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

                                gender.children.forEach(type => {
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
    }
};

// ======================================================
// ÍCONE DE USUÁRIO (login / minha conta)
// ======================================================
(function() {
    'use strict';

    const accountBtn = document.getElementById('accountBtn') ||
                       document.querySelector('.icon-btn[aria-label*="Login"]') ||
                       document.querySelector('.icon-btn[aria-label*="Minha conta"]');

    if (!accountBtn) return;

    accountBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const token = localStorage.getItem('luxury_token');
        if (token) {
            window.location.href = '/minha-conta';
        } else {
            window.location.href = '/login';
        }
    });
})();

// ======================================================
// ATENDIMENTO AO CLIENTE
// ======================================================
const customerServiceBtn = document.querySelector('.customer-service-btn');
customerServiceBtn?.addEventListener('click', () => {
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
    Utils.announce('Atendimento ao cliente aberto');
});

// ======================================================
// INICIALIZAÇÃO
// ======================================================
document.addEventListener('DOMContentLoaded', () => {
    loadFeaturedProducts();
    MegaMenu.init();
    console.log('✅ Luxury Store - Sistema carregado com sucesso!');
});