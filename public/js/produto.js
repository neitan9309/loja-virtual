// ======================================================
// public/js/produto.js
// Página de detalhe do produto
// Depende de: core/utils.js, core/api.js, core/components.js
// ======================================================
(function () {
    'use strict';

    const U = window.LuxuryUtils;
    const API = window.LuxuryAPI;
    const C = window.LuxuryComponents;

    // ======================================================
    // PÁGINA
    // ======================================================
    const ProductPage = {
        product: null,
        slug: null,

        async init() {
            const pathParts = window.location.pathname.split('/').filter(Boolean);
            this.slug = pathParts[1] || null;

            if (!this.slug) {
                return this.showNotFound();
            }

            await this.loadProduct();
        },

        async loadProduct() {
            try {
                const product = await API.get(`/products/slug/${this.slug}`);
                this.product = product;
                this.render();
            } catch (error) {
                console.error('Erro ao carregar produto:', error);
                this.showNotFound();
            }
        },

        showNotFound() {
            const loading = document.getElementById('productLoading');
            const content = document.getElementById('productContent');
            const notFound = document.getElementById('productNotFound');

            if (loading) loading.style.display = 'none';
            if (content) content.style.display = 'none';
            if (notFound) notFound.style.display = 'flex';
        },

        render() {
            const p = this.product;

            document.getElementById('productLoading').style.display = 'none';
            document.getElementById('productContent').style.display = 'block';

            document.title = `${p.name} - Luxury Store`;

            this.renderBreadcrumb();
            this.renderGallery();
            this.renderBadges();
            this.renderBasicInfo();
            this.renderRating();
            this.renderPrice();
            this.renderVariations();
            this.renderDescription();
            this.renderSpecs();
            this.loadReviews();  
            this.loadQnA(); // <-- ADICIONE ESTA LINHA      // ✅ async — carrega via API
            this.attachActions();
            this.loadRelated();
        },

        // ==================================================
        // BREADCRUMB
        // ==================================================
        renderBreadcrumb() {
            const breadcrumb = document.getElementById('breadcrumb');
            const p = this.product;
            if (!breadcrumb) return;

            const parts = [`<a href="/"><i class="fas fa-home"></i><span>Início</span></a>`];

            if (p.category_path && Array.isArray(p.category_path) && p.category_path.length > 0) {
                const sorted = [...p.category_path].sort((a, b) => a.level - b.level);
                sorted.forEach((item) => {
                    parts.push('<i class="fas fa-chevron-right separator"></i>');
                    parts.push(`<a href="/categoria?category=${U.escapeAttr(item.slug)}">${U.escapeHtml(item.name)}</a>`);
                });
            } else if (p.category_name) {
                parts.push('<i class="fas fa-chevron-right separator"></i>');
                parts.push(`<a href="/produtos">${U.escapeHtml(p.category_name)}</a>`);
            }

            parts.push('<i class="fas fa-chevron-right separator"></i>');
            parts.push(`<span class="current">${U.escapeHtml(p.name)}</span>`);

            breadcrumb.innerHTML = parts.join('');
        },

        // ==================================================
        // GALERIA
        // ==================================================
        renderGallery() {
            const p = this.product;
            const mainImg = document.getElementById('galleryMainImage');
            const thumbs = document.getElementById('galleryThumbs');

            const images = (p.images && p.images.length > 0)
                ? p.images
                : [{ url: 'https://placehold.co/600x600?text=Sem+Imagem', is_primary: true }];

            const primary = images.find((i) => i.is_primary) || images[0];
            mainImg.src = primary.url;
            mainImg.alt = p.name;

            thumbs.innerHTML = images.map((img, idx) => `
                <div class="gallery-thumb ${img.is_primary || idx === 0 ? 'active' : ''}" data-index="${idx}">
                    <img src="${U.escapeAttr(img.url)}" alt="${U.escapeAttr(p.name)} - imagem ${idx + 1}" loading="lazy">
                </div>
            `).join('');

            thumbs.querySelectorAll('.gallery-thumb').forEach((thumb) => {
                thumb.addEventListener('click', () => {
                    const idx = parseInt(thumb.dataset.index);
                    mainImg.src = images[idx].url;
                    thumbs.querySelectorAll('.gallery-thumb').forEach((t) => t.classList.remove('active'));
                    thumb.classList.add('active');
                });
            });

            document.getElementById('galleryZoom')?.addEventListener('click', () => {
                this.openZoom(mainImg.src);
            });

            mainImg.addEventListener('click', () => {
                this.openZoom(mainImg.src);
            });
        },

        openZoom(src) {
            const modal = document.createElement('div');
            modal.className = 'image-zoom-modal active';
            modal.innerHTML = `
                <button class="image-zoom-close" aria-label="Fechar">&times;</button>
                <img src="${U.escapeAttr(src)}" alt="Imagem ampliada">
            `;
            document.body.appendChild(modal);
            document.body.style.overflow = 'hidden';

            const close = () => {
                modal.remove();
                document.body.style.overflow = '';
            };

            modal.querySelector('.image-zoom-close').addEventListener('click', close);
            modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
            document.addEventListener('keydown', function escHandler(e) {
                if (e.key === 'Escape') {
                    close();
                    document.removeEventListener('keydown', escHandler);
                }
            });
        },

        // ==================================================
        // BADGES
        // ==================================================
        renderBadges() {
            const container = document.getElementById('productBadges');
            container.innerHTML = C.renderProductBadges(this.product);
        },

        // ==================================================
        // INFO BÁSICA
        // ==================================================
        renderBasicInfo() {
            const p = this.product;
            document.getElementById('productTitle').textContent = p.name;

            const metaParts = [];
            if (p.brand_name) metaParts.push(`Marca: <a href="/produtos?brand=${U.escapeAttr(p.brand_slug || '')}">${U.escapeHtml(p.brand_name)}</a>`);
            if (p.sku) metaParts.push(`SKU: ${U.escapeHtml(p.sku)}`);
            document.getElementById('productMeta').innerHTML = metaParts.join(' · ');
        },

        // ==================================================
        // AVALIAÇÃO (estrelas no header do produto)
        // ==================================================
        renderRating() {
            const p = this.product;
            const stars = document.getElementById('productStars');
            const count = document.getElementById('productRatingCount');

            const rating = parseFloat(p.rating_avg || 0);
            const total = parseInt(p.rating_count || 0);

            stars.innerHTML = C.renderStars(rating, { size: 0.95 });

            count.textContent = total > 0
                ? `${rating.toFixed(1)} (${total} ${total === 1 ? 'avaliação' : 'avaliações'})`
                : 'Nenhuma avaliação ainda';
        },

        // ==================================================
        // PREÇO
        // ==================================================
        renderPrice() {
            const p = this.product;
            const originalPrice = parseFloat(p.price);
            const discount = parseFloat(p.discount_percent || 0);
            const currentPrice = discount > 0 ? originalPrice * (1 - discount / 100) : originalPrice;

            const discountEl = document.getElementById('productDiscount');
            const oldPriceEl = document.getElementById('productOldPrice');
            const currentPriceEl = document.getElementById('productCurrentPrice');
            const installmentsEl = document.getElementById('productInstallments');

            if (discount > 0) {
                discountEl.textContent = `-${discount.toFixed(0)}%`;
                discountEl.style.display = 'inline-block';
                oldPriceEl.textContent = U.formatPrice(originalPrice);
                oldPriceEl.style.display = 'inline-block';
            } else {
                discountEl.style.display = 'none';
                oldPriceEl.style.display = 'none';
            }

            currentPriceEl.textContent = U.formatPrice(currentPrice);

            const maxInstallments = 12;
            const minInstallment = 5;
            const installmentsCount = Math.min(maxInstallments, Math.max(1, Math.floor(currentPrice / minInstallment)));
            const installmentValue = currentPrice / installmentsCount;

            if (installmentsCount > 1) {
                installmentsEl.innerHTML = `ou <strong>${installmentsCount}x de ${U.formatPrice(installmentValue)}</strong> sem juros`;
            } else {
                installmentsEl.innerHTML = `<strong>${U.formatPrice(currentPrice)}</strong> à vista`;
            }
        },

        // ==================================================
        // VARIAÇÕES
        // ==================================================
        renderVariations() {
            const p = this.product;
            const container = document.getElementById('productVariations');

            if (!p.variations || p.variations.length === 0) {
                container.style.display = 'none';
                return;
            }

            const grouped = {};
            p.variations.forEach((v) => {
                if (!grouped[v.type]) grouped[v.type] = [];
                grouped[v.type].push(v);
            });

            const labels = { size: 'Tamanho', color: 'Cor', material: 'Material', style: 'Estilo' };

            container.innerHTML = Object.entries(grouped).map(([type, vars]) => `
                <div class="variation-group">
                    <div class="variation-label">
                        ${labels[type] || type}:
                        <strong data-selected="${type}">${U.escapeHtml(vars[0].value)}</strong>
                    </div>
                    <div class="variation-options">
                        ${vars.map((v, idx) => `
                            <button class="variation-btn ${idx === 0 ? 'active' : ''}"
                                    data-type="${U.escapeAttr(type)}"
                                    data-value="${U.escapeAttr(v.value)}">
                                ${U.escapeHtml(v.value)}
                            </button>
                        `).join('')}
                    </div>
                </div>
            `).join('');

            container.style.display = 'flex';

            container.querySelectorAll('.variation-btn').forEach((btn) => {
                btn.addEventListener('click', () => {
                    const type = btn.dataset.type;
                    const value = btn.dataset.value;

                    container.querySelectorAll(`.variation-btn[data-type="${type}"]`).forEach((b) => b.classList.remove('active'));
                    btn.classList.add('active');

                    const selectedLabel = container.querySelector(`strong[data-selected="${type}"]`);
                    if (selectedLabel) selectedLabel.textContent = value;
                });
            });
        },

        // ==================================================
        // DESCRIÇÃO
        // ==================================================
        renderDescription() {
            const p = this.product;
            document.getElementById('productDescription').textContent =
                p.description || 'Sem descrição disponível.';
        },

        // ==================================================
        // ESPECIFICAÇÕES
        // ==================================================
        renderSpecs() {
            const p = this.product;
            const container = document.getElementById('productSpecs');
            const specs = [];

            if (p.sku) specs.push({ label: 'SKU', value: p.sku });
            if (p.brand_name) specs.push({ label: 'Marca', value: p.brand_name });
            if (p.category_name) specs.push({ label: 'Categoria', value: p.category_name });
            if (p.weight) specs.push({ label: 'Peso', value: `${p.weight} kg` });
            if (p.dimensions) specs.push({ label: 'Dimensões', value: p.dimensions });

            if (p.specifications && p.specifications.length > 0) {
                p.specifications.forEach((s) => specs.push({ label: s.name, value: s.value }));
            }

            if (specs.length === 0) {
                container.innerHTML = '<p class="review-empty">Nenhuma especificação disponível.</p>';
                return;
            }

            container.innerHTML = specs.map((s) => `
                <div class="spec-item">
                    <span class="spec-label">${U.escapeHtml(s.label)}</span>
                    <span class="spec-value">${U.escapeHtml(s.value)}</span>
                </div>
            `).join('');
        },

        // ==================================================
        // AVALIAÇÕES — carrega via API
        // ==================================================
        async loadReviews() {
            const statsEl = document.getElementById('reviewStats');
            const listEl = document.getElementById('productReviews');
            const formEl = document.getElementById('reviewForm');

            try {
                // Busca avaliações e (se logado) a avaliação do usuário
                const promises = [
                    API.get(`/products/${this.product.id}/reviews`),
                ];
                if (API.isLoggedIn()) {
                    promises.push(API.get(`/products/${this.product.id}/reviews/mine`));
                }

                const [listData, mineData] = await Promise.all(promises);
                const reviews = listData.reviews || [];
                const stats = listData.stats || { avg_rating: 0, total_reviews: 0 };
                const myReview = mineData?.review || null;

                // Stats
                if (statsEl) {
                    this.renderReviewStats(statsEl, stats);
                }

                // Formulário
                if (formEl) {
                    if (!API.isLoggedIn()) {
                        this.renderLoginPrompt(formEl);
                    } else if (myReview) {
                        this.renderMyReview(formEl, myReview);
                    } else {
                        this.renderReviewForm(formEl);
                    }
                }

                // Lista
                if (listEl) {
                    this.renderReviewList(listEl, reviews, myReview);
                }
            } catch (error) {
                console.error('Erro ao carregar avaliações:', error);
                if (listEl) {
                    listEl.innerHTML = '<p class="review-empty">Erro ao carregar avaliações.</p>';
                }
            }
        },

        async loadQnA() {
    const container = document.getElementById('productQnA');
    const formContainer = document.getElementById('qnaFormContainer');
    if (!container || !formContainer) return;

    try {
        const data = await API.get(`/qna/product/${this.product.id}`);
        const questions = data.questions || [];

        if (API.isLoggedIn()) {
            formContainer.innerHTML = `
                <div class="review-form">
                    <h3 class="review-form-title"><i class="fas fa-question-circle"></i> Faça uma pergunta</h3>
                    <div class="review-form-field">
                        <textarea id="newQuestion" rows="3" placeholder="Digite sua pergunta sobre o produto..." maxlength="1000"></textarea>
                    </div>
                    <div class="review-form-actions">
                        <button type="button" class="btn btn-primary" id="submitQuestionBtn">Enviar Pergunta</button>
                    </div>
                </div>
            `;
            formContainer.querySelector('#submitQuestionBtn')?.addEventListener('click', async () => {
                const q = formContainer.querySelector('#newQuestion').value.trim();
                if (!q || q.length < 5) return C.createToast('Pergunta muito curta', 'error');
                try {
                    await API.post(`/qna/product/${this.product.id}`, { question: q });
                    C.createToast('Pergunta enviada!', 'success');
                    this.loadQnA();
                } catch (err) {
                    C.createToast(err.data?.error || 'Erro ao enviar pergunta', 'error');
                }
            });
        } else {
            formContainer.innerHTML = `<p class="review-login-prompt">Faça <a href="/login">login</a> para fazer uma pergunta.</p>`;
        }

        if (questions.length === 0) {
            container.innerHTML = '<p class="review-empty">Nenhuma pergunta ainda. Seja o primeiro a perguntar!</p>';
            return;
        }

        container.innerHTML = questions.map(q => `
            <div class="review-card" style="background: var(--gray-50);">
                <div class="review-header">
                    <div class="review-author-block">
                        <div class="review-avatar">${U.escapeHtml((q.user_name || '?').charAt(0))}</div>
                        <div>
                            <div class="review-author">${U.escapeHtml(q.user_name || 'Cliente')}</div>
                            <div class="review-date">${U.formatDate(q.created_at)}</div>
                        </div>
                    </div>
                </div>
                <div class="review-comment" style="font-weight: 600; margin-bottom: 1rem;">${U.escapeHtml(q.question)}</div>
                ${q.answers && q.answers.length > 0 ? q.answers.map(a => `
                    <div class="order-detail-item" style="background: #fff; border-radius: 8px; padding: 1rem; border-left: 4px solid var(--accent);">
                        <div style="font-size: 0.9rem; color: var(--gray-600);">${U.escapeHtml(a.answer)}</div>
                        <div style="font-size: 0.75rem; color: var(--gray-400); margin-top: 0.5rem;">
                            Respondido por <strong>${U.escapeHtml(a.admin_name || 'Administrador')}</strong> em ${U.formatDate(a.created_at)}
                        </div>
                    </div>
                `).join('') : '<p class="review-empty" style="text-align: left; padding: 0;">Aguardando resposta da loja.</p>'}
            </div>
        `).join('');
    } catch (error) {
        console.error('Erro ao carregar Q&A:', error);
        container.innerHTML = '<p class="review-empty">Erro ao carregar perguntas.</p>';
    }
},

        // ==================================================
        // STATS
        // ==================================================
        renderReviewStats(el, stats) {
            if (stats.total_reviews === 0) {
                el.innerHTML = '';
                return;
            }

            el.innerHTML = `
                <div class="review-stats-summary">
                    <div class="review-stats-average">
                        <strong>${stats.avg_rating.toFixed(1)}</strong>
                        <div class="review-stats-stars">
                            ${C.renderStars(stats.avg_rating, { size: 1.1 })}
                        </div>
                        <span>${stats.total_reviews} ${stats.total_reviews === 1 ? 'avaliação' : 'avaliações'}</span>
                    </div>
                </div>
            `;
        },

        // ==================================================
        // FORMULÁRIO DE NOVA AVALIAÇÃO
        // ==================================================
        renderReviewForm(el) {
            el.innerHTML = `
                <div class="review-form">
                    <h3 class="review-form-title">
                        <i class="fas fa-star"></i>
                        Deixe sua avaliação
                    </h3>

                    <div class="review-form-field">
                        <label>Sua nota *</label>
                        <!-- Garante que a classe review-stars-input e os botões review-star estejam corretos -->
                        <div class="review-stars-input" id="reviewStarsInput" role="radiogroup" aria-label="Nota de 1 a 5 estrelas">
                            ${[1, 2, 3, 4, 5].map((n) => `
                                <button type="button" class="review-star" data-value="${n}" aria-label="${n} estrela${n > 1 ? 's' : ''}">
                                    <i class="far fa-star"></i>
                                </button>
                            `).join('')}
                        </div>
                        <input type="hidden" id="reviewRating" value="0">
                    </div>

                    <div class="review-form-field">
                        <label for="reviewTitle">Título da avaliação</label>
                        <input type="text" id="reviewTitle" maxlength="100" placeholder="Resuma sua experiência">
                    </div>

                    <div class="review-form-field">
                        <label for="reviewComment">Comentário</label>
                        <textarea id="reviewComment" rows="4" maxlength="1000" placeholder="O que você achou do produto?"></textarea>
                        <small class="review-form-hint">Máximo 1000 caracteres</small>
                    </div>

                    <div class="review-form-field">
                        <label for="reviewImage">Foto do produto (opcional)</label>
                        <input type="file" id="reviewImageInput" accept="image/*">
                        <div id="reviewImagePreview" style="margin-top: 1rem;"></div>
                    </div>

                    <div class="review-form-feedback" id="reviewFormFeedback"></div>

                    <div class="review-form-actions">
                        <button type="button" class="btn btn-primary" id="submitReviewBtn">
                            <i class="fas fa-paper-plane"></i>
                            Enviar avaliação
                        </button>
                    </div>
                </div>
            `;

            this.setupStarInput(el);

            let uploadedImageUrl = null;
            const fileInput = el.querySelector('#reviewImageInput');
            const preview = el.querySelector('#reviewImagePreview');

            fileInput?.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                preview.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
                try {
                    const url = await API.upload(file);
                    uploadedImageUrl = url;
                    preview.innerHTML = `<img src="${url}" style="max-width: 150px; border-radius: 8px;">`;
                } catch (err) {
                    preview.innerHTML = '<span style="color: red;">Erro no upload</span>';
                }
            });

            // Passa a função para pegar a imagem no momento do envio
            this.setupReviewSubmit(el, null, () => uploadedImageUrl);
        },

        // ==================================================
        // MINHA AVALIAÇÃO (modo leitura + botões)
        // ==================================================
        renderMyReview(el, review) {
            const stars = [1, 2, 3, 4, 5].map((i) =>
                i <= review.rating
                    ? '<i class="fas fa-star"></i>'
                    : '<i class="far fa-star"></i>'
            ).join('');

            const date = review.created_at
                ? new Date(review.created_at).toLocaleDateString('pt-BR')
                : '';

            el.innerHTML = `
                <div class="review-my-card">
                    <div class="review-my-header">
                        <h3 class="review-my-title">
                            <i class="fas fa-check-circle"></i>
                            Sua avaliação
                        </h3>
                        <div class="review-my-actions">
                            <button type="button" class="review-action-btn" id="editMyReviewBtn">
                                <i class="fas fa-pen"></i>
                                Editar
                            </button>
                            <button type="button" class="review-action-btn review-action-delete" id="deleteMyReviewBtn">
                                <i class="fas fa-trash-alt"></i>
                                Excluir
                            </button>
                        </div>
                    </div>

                    <div class="review-my-body">
                        <div class="review-stars">${stars}</div>
                        ${review.title ? `<div class="review-title">${U.escapeHtml(review.title)}</div>` : ''}
                        ${review.comment ? `<div class="review-comment">${U.escapeHtml(review.comment)}</div>` : ''}
                        <div class="review-date">Avaliado em ${U.escapeHtml(date)}</div>
                    </div>
                </div>
            `;

            // Bind dos botões
            el.querySelector('#editMyReviewBtn')?.addEventListener('click', () => {
                this.renderEditReviewForm(el, review);
            });

            el.querySelector('#deleteMyReviewBtn')?.addEventListener('click', () => {
                this.confirmDeleteReview(review.id);
            });
        },

        // ==================================================
        // FORM DE EDIÇÃO (só aparece ao clicar em Editar)
        // ==================================================
        renderEditReviewForm(el, review) {
            el.innerHTML = `
                <div class="review-form review-form-editing">
                    <h3 class="review-form-title">
                        <i class="fas fa-pen"></i>
                        Editando sua avaliação
                    </h3>

                    <div class="review-form-field">
                        <label>Sua nota *</label>
                        <div class="review-stars-input" id="reviewStarsInput" role="radiogroup" aria-label="Editar nota">
                            ${[1, 2, 3, 4, 5].map((n) => `
                                <button type="button" class="review-star ${n <= review.rating ? 'active' : ''}" data-value="${n}">
                                    <i class="${n <= review.rating ? 'fas' : 'far'} fa-star"></i>
                                </button>
                            `).join('')}
                        </div>
                        <input type="hidden" id="reviewRating" value="${review.rating}">
                    </div>

                    <div class="review-form-field">
                        <label for="reviewTitle">Título</label>
                        <input type="text" id="reviewTitle" maxlength="100" value="${U.escapeAttr(review.title || '')}">
                    </div>

                    <div class="review-form-field">
                        <label for="reviewComment">Comentário</label>
                        <textarea id="reviewComment" rows="4" maxlength="1000">${U.escapeHtml(review.comment || '')}</textarea>
                    </div>

                    <div class="review-form-feedback" id="reviewFormFeedback"></div>

                    <div class="review-form-actions">
                        <button type="button" class="btn btn-secondary" id="cancelEditBtn">
                            <i class="fas fa-times"></i>
                            Cancelar
                        </button>
                        <button type="button" class="btn btn-primary" id="submitReviewBtn">
                            <i class="fas fa-save"></i>
                            Salvar alterações
                        </button>
                    </div>
                </div>
            `;

            this.setupStarInput(el);
            this.setupReviewSubmit(el, review.id);

            el.querySelector('#cancelEditBtn')?.addEventListener('click', () => {
                this.renderMyReview(el, review);
            });
        },

        // ==================================================
        // CONFIRMAR EXCLUSÃO
        // ==================================================
        confirmDeleteReview(reviewId) {
            const modal = document.createElement('div');
            modal.className = 'modal active';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 420px;">
                    <button class="close-modal" aria-label="Fechar">&times;</button>
                    <div class="modal-icon" style="color: #dc2626;">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <h2 style="text-transform: uppercase; letter-spacing: 1px; margin-bottom: 0.75rem;">
                        Excluir avaliação?
                    </h2>
                    <p style="color: var(--gray-600); margin-bottom: 1.5rem;">
                        Esta ação não pode ser desfeita. Sua avaliação será permanentemente removida.
                    </p>
                    <div style="display: flex; gap: 0.75rem; justify-content: flex-end;">
                        <button type="button" class="btn btn-secondary" id="cancelDeleteReview">
                            Cancelar
                        </button>
                        <button type="button" class="btn" id="confirmDeleteReview"
                                style="background: #dc2626; color: white; border-color: #dc2626;">
                            <i class="fas fa-trash-alt"></i>
                            Excluir
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            document.body.style.overflow = 'hidden';

            const close = () => {
                modal.remove();
                document.body.style.overflow = '';
            };

            modal.querySelector('.close-modal').addEventListener('click', close);
            modal.querySelector('#cancelDeleteReview').addEventListener('click', close);
            modal.addEventListener('click', (e) => {
                if (e.target === modal) close();
            });

            modal.querySelector('#confirmDeleteReview').addEventListener('click', async () => {
                const btn = modal.querySelector('#confirmDeleteReview');
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Excluindo...';

                try {
                    await API.delete(`/products/${this.product.id}/reviews/${reviewId}`);
                    close();
                    C.createToast('Avaliação removida com sucesso!', 'success');

                    // Recarrega a lista + rating do header
                    setTimeout(() => {
                        this.loadReviews();
                        this.loadProduct();
                    }, 400);
                } catch (error) {
                    C.createToast(error.data?.error || 'Erro ao remover avaliação', 'error');
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-trash-alt"></i> Excluir';
                }
            });
        },

        // ==================================================
        // PROMPT DE LOGIN
        // ==================================================
        renderLoginPrompt(el) {
            el.innerHTML = `
                <div class="review-login-prompt">
                    <i class="fas fa-lock"></i>
                    <p>Faça login para avaliar este produto</p>
                    <a href="/login" class="btn btn-primary">
                        <i class="fas fa-sign-in-alt"></i>
                        Fazer login
                    </a>
                </div>
            `;
        },

        // ==================================================
        // ESTRELAS INTERATIVAS
        // ==================================================
        setupStarInput(container) {
            const starButtons = container.querySelectorAll('.review-star');
            const hidden = container.querySelector('#reviewRating');

            starButtons.forEach((btn) => {
                const value = parseInt(btn.dataset.value);

                btn.addEventListener('mouseenter', () => {
                    starButtons.forEach((b) => {
                        const v = parseInt(b.dataset.value);
                        const icon = b.querySelector('i');
                        if (v <= value) {
                            icon.className = 'fas fa-star';
                        } else {
                            icon.className = 'far fa-star';
                        }
                    });
                });

                btn.addEventListener('click', () => {
                    hidden.value = value;
                    starButtons.forEach((b) => {
                        const v = parseInt(b.dataset.value);
                        const icon = b.querySelector('i');
                        if (v <= value) {
                            icon.className = 'fas fa-star';
                            b.classList.add('active');
                        } else {
                            icon.className = 'far fa-star';
                            b.classList.remove('active');
                        }
                    });
                });
            });

            container.addEventListener('mouseleave', () => {
                const current = parseInt(hidden.value) || 0;
                starButtons.forEach((b) => {
                    const v = parseInt(b.dataset.value);
                    const icon = b.querySelector('i');
                    if (v <= current) {
                        icon.className = 'fas fa-star';
                        b.classList.add('active');
                    } else {
                        icon.className = 'far fa-star';
                        b.classList.remove('active');
                    }
                });
            });
        },

        // ==================================================
        // SUBMIT DA AVALIAÇÃO
        // ==================================================
        setupReviewSubmit(container, reviewId = null, getImageUrl = null) {
            const btn = container.querySelector('#submitReviewBtn');
            const feedback = container.querySelector('#reviewFormFeedback');

            if (!btn) return;

            btn.addEventListener('click', async () => {
                const rating = parseInt(container.querySelector('#reviewRating').value);
                const title = container.querySelector('#reviewTitle').value.trim();
                const comment = container.querySelector('#reviewComment').value.trim();

                // Validação
                if (!rating || rating < 1 || rating > 5) {
                    this.showFormFeedback(feedback, 'Selecione uma nota de 1 a 5 estrelas', 'error');
                    return;
                }

                const originalHtml = btn.innerHTML;
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

                try {
                    const payload = { rating, title: title || null, comment: comment || null };

                    let result;
                    if (reviewId) {
                        result = await API.put(`/products/${this.product.id}/reviews/${reviewId}`, payload);
                    } else {
                        result = await API.post(`/products/${this.product.id}/reviews`, payload);
                    }

                    this.showFormFeedback(feedback, result.message || 'Avaliação enviada!', 'success');

                    // Recarrega a lista e a média
                    setTimeout(() => {
                        this.loadReviews();
                        this.loadProduct();
                    }, 800);

                } catch (error) {
                    if (error.status === 409 && error.data?.code === 'ALREADY_REVIEWED') {
                        this.showFormFeedback(feedback, 'Você já avaliou este produto.', 'error');
                        setTimeout(() => this.loadReviews(), 1200);
                    } else {
                        this.showFormFeedback(feedback, error.data?.error || 'Erro ao enviar avaliação', 'error');
                    }
                    btn.disabled = false;
                    btn.innerHTML = originalHtml;
                }
            });
        },

        showFormFeedback(el, message, type) {
            if (!el) return;
            el.className = `review-form-feedback show ${type}`;
            el.textContent = message;
            setTimeout(() => {
                el.classList.remove('show');
            }, 4000);
        },

        // ==================================================
        // LISTA DE AVALIAÇÕES
        // ==================================================
        renderReviewList(el, reviews, myReview) {
            if (!reviews || reviews.length === 0) {
                el.innerHTML = `
                    <p class="review-empty">
                        Este produto ainda não tem avaliações. Seja o primeiro a avaliar!
                    </p>
                `;
                return;
            }

            el.innerHTML = reviews.map((review) => {
                const stars = [1, 2, 3, 4, 5].map((i) =>
                    i <= review.rating
                        ? '<i class="fas fa-star"></i>'
                        : '<i class="far fa-star"></i>'
                ).join('');

                const date = review.created_at
                    ? new Date(review.created_at).toLocaleDateString('pt-BR')
                    : '';

                const author = review.author_name || 'Cliente';
                const initials = author.charAt(0).toUpperCase();
                const isMine = myReview && myReview.id === review.id;

                // ✅ NOVO: Removemos o style inline e deixamos o CSS cuidar do formato
                const imageHtml = review.image_url
                    ? `<div class="review-image-wrapper">
                           <img src="${U.escapeAttr(review.image_url)}" 
                                alt="Foto da avaliação de ${U.escapeAttr(author)}"
                                class="review-image-zoom"
                                data-image-src="${U.escapeAttr(review.image_url)}">
                       </div>`
                    : '';

                return `
                    <div class="review-card ${isMine ? 'review-mine' : ''}">
                        <div class="review-header">
                            <div class="review-author-block">
                                <div class="review-avatar">${U.escapeHtml(initials)}</div>
                                <div>
                                    <div class="review-author">
                                        ${U.escapeHtml(author)}
                                        ${isMine ? '<span class="review-badge-mine">Sua</span>' : ''}
                                    </div>
                                    <div class="review-stars">${stars}</div>
                                </div>
                            </div>
                            <div class="review-date">${U.escapeHtml(date)}</div>
                        </div>
                        ${review.title ? `<div class="review-title">${U.escapeHtml(review.title)}</div>` : ''}
                        ${review.comment ? `<div class="review-comment">${U.escapeHtml(review.comment)}</div>` : ''}
                        ${imageHtml}
                    </div>
                `;
            }).join('');

            // ✅ NOVO: Vincula o evento de clique em todas as imagens de avaliação
            el.querySelectorAll('.review-image-zoom').forEach((img) => {
                img.addEventListener('click', (e) => {
                    e.preventDefault();
                    const src = img.dataset.imageSrc;
                    if (src) {
                        // Chama o método openZoom que já existe no ProductPage
                        this.openZoom(src);
                    }
                });
            });
        },

        // ==================================================
        // AÇÕES
        // ==================================================
        attachActions() {
            const qtyInput = document.getElementById('productQty');
            const decreaseBtn = document.getElementById('qtyDecrease');
            const increaseBtn = document.getElementById('qtyIncrease');
            const addCartBtn = document.getElementById('btnAddCart');
            const buyNowBtn = document.getElementById('btnBuyNow');
            const shippingBtn = document.getElementById('btnCalcShipping');

            decreaseBtn?.addEventListener('click', () => {
                const val = parseInt(qtyInput.value) || 1;
                if (val > 1) qtyInput.value = val - 1;
            });

            increaseBtn?.addEventListener('click', () => {
                const val = parseInt(qtyInput.value) || 1;
                const max = parseInt(qtyInput.max) || 99;
                if (val < max) qtyInput.value = val + 1;
            });

            addCartBtn?.addEventListener('click', () => {
                const qty = parseInt(qtyInput.value) || 1;
                this.addToCart(qty);
            });

            buyNowBtn?.addEventListener('click', () => {
                const qty = parseInt(qtyInput.value) || 1;
                this.buyNow(qty);
            });

            shippingBtn?.addEventListener('click', () => {
                this.calculateShipping();
            });

            // Botão de favoritar na página de produto
            this.attachWishlistButton();

            const cepInput = document.getElementById('shippingCep');
            cepInput?.addEventListener('input', (e) => {
                e.target.value = U.maskCep(e.target.value);
            });

            // Accordion
            document.querySelectorAll('.accordion-header').forEach((header) => {
                header.addEventListener('click', () => {
                    const item = header.closest('.accordion-item');
                    const isActive = item.classList.contains('active');

                    document.querySelectorAll('.accordion-item').forEach((el) => {
                        el.classList.remove('active');
                        const h = el.querySelector('.accordion-header');
                        if (h) h.setAttribute('aria-expanded', 'false');
                    });

                    if (!isActive) {
                        item.classList.add('active');
                        header.setAttribute('aria-expanded', 'true');
                    }
                });
            });
        },

        // ==================================================
        // BOTÃO DE FAVORITAR (página do produto)
        // ==================================================
        attachWishlistButton() {
            const container = document.getElementById('wishlistBtnContainer');
            if (!container || !this.product) return;

            const wishlist = window.LuxuryWishlist;
            const isFavorited = wishlist ? wishlist.has(this.product.id) : false;
            const heartIcon = isFavorited ? 'fas fa-heart' : 'far fa-heart';
            const heartLabel = isFavorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos';

            container.innerHTML = `
                <button type="button"
                        class="btn-wishlist-page ${isFavorited ? 'is-favorited' : ''}"
                        data-wishlist-btn
                        data-product-id="${this.product.id}"
                        aria-label="${heartLabel}"
                        title="${heartLabel}">
                    <i class="${heartIcon}"></i>
                    <span>Favoritar</span>
                </button>
            `;
        },

        async addToCart(quantity) {
            const p = this.product;

            if (!window.LuxuryCart) {
                C.createToast('Erro ao conectar com o carrinho. Recarregue a página.', 'error');
                return;
            }

            try {
                await window.LuxuryCart.addToCart(p.id, quantity);
                C.createToast(`"${p.name}" (${quantity}x) adicionado ao carrinho!`, 'success');
                U.announce(`${quantity} unidade(s) adicionada(s) ao carrinho`);
            } catch (error) {
                C.createToast(error.data?.error || 'Erro ao adicionar ao carrinho', 'error');
            }
        },

        buyNow(quantity) {
            const p = this.product;
            C.createToast(`Redirecionando para o checkout: "${p.name}" (${quantity}x)`, 'info');
            U.announce('Redirecionando para o checkout');
        },

        calculateShipping() {
            const cepInput = document.getElementById('shippingCep');
            const result = document.getElementById('shippingResult');
            const cep = cepInput?.value.replace(/\D/g, '');

            if (!cep || cep.length !== 8) {
                result.style.display = 'block';
                result.innerHTML = '<span style="color: #dc2626;">Por favor, informe um CEP válido (8 dígitos).</span>';
                return;
            }

            const region = parseInt(cep[0]);
            let price, days;

            if (region === 7 || region === 6) {
                price = 0; days = '2 a 4 dias úteis';
            } else if (region === 8 || region === 1) {
                price = 0; days = '3 a 6 dias úteis';
            } else {
                price = 19.90; days = '5 a 10 dias úteis';
            }

            const priceText = price === 0 ? '<strong>Frete GRÁTIS</strong>' : `Frete: ${U.formatPrice(price)}`;

            result.style.display = 'block';
            result.innerHTML = `
                <div>Entrega para <strong>${cep.substring(0, 5)}-${cep.substring(5)}</strong></div>
                <div style="margin-top: 0.35rem;">${priceText} · Prazo: ${days}</div>
            `;
        },

        // ==================================================
        // PRODUTOS RELACIONADOS
        // ==================================================
        async loadRelated() {
            const section = document.getElementById('relatedSection');
            const grid = document.getElementById('relatedGrid');
            const p = this.product;

            try {
                const data = await API.get(`/products?category=${p.category_id}&limit=4`);
                let products = (data.products || []).filter((prod) => prod.id !== p.id);

                if (products.length === 0) {
                    const fallback = await API.get('/products?featured=true&limit=4');
                    products = (fallback.products || []).filter((prod) => prod.id !== p.id);
                }

                if (products.length === 0) {
                    section.style.display = 'none';
                    return;
                }

                grid.innerHTML = products.slice(0, 4)
                    .map((prod) => C.renderProductCard(prod, {
                        showShortDesc: true,
                        showButton: false,
                        clickableCard: true,    // ✅ card inteiro clicável
                        href: `/produto/${prod.slug}`,
                    }))
                    .join('');

                section.style.display = 'block';
            } catch (error) {
                console.error('Erro ao carregar produtos relacionados:', error);
                section.style.display = 'none';
            }
        },
    };

    // ======================================================
    // INICIALIZAÇÃO
    // ======================================================
    document.addEventListener('DOMContentLoaded', () => {
        ProductPage.init();
    });
})();