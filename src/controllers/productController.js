// ======================================================
// src/controllers/productController.js
// ======================================================
const { Product } = require('../models');

const productController = {
    // ==================================================
    // GET /api/products
    // Listagem pública com filtros + paginação
    // ==================================================
    async list(req, res) {
        try {
            const filters = {
                category: req.query.category,
                brand: req.query.brand,
                min_price: req.query.min_price,
                max_price: req.query.max_price,
                search: req.query.search,
                featured: req.query.featured,
                is_new: req.query.new,
                best_seller: req.query.best_seller,
                on_sale: req.query.on_sale,
                sort: req.query.sort || 'created_at',
                order: req.query.order || 'DESC',
                limit: Math.min(Math.max(1, parseInt(req.query.limit) || 20), 100),
                offset: Math.max(0, parseInt(req.query.offset) || 0),
            };

            const [products, total] = await Promise.all([
                Product.findAll(filters),
                Product.count(filters),
            ]);

            res.json({
                products,
                pagination: {
                    total,
                    limit: filters.limit,
                    offset: filters.offset,
                    pages: Math.ceil(total / filters.limit),
                },
            });
        } catch (error) {
            console.error('Erro ao listar produtos:', error);
            res.status(500).json({ error: 'Erro ao buscar produtos' });
        }
    },

    // ==================================================
    // GET /api/products/:id
    // Público: esconde sku, cost_price, meta_keywords
    // Admin (token válido): retorna tudo
    // ==================================================
    async getById(req, res) {
        try {
            const { id } = req.params;

            if (isNaN(id)) {
                return res.status(400).json({ error: 'ID inválido' });
            }

            const product = await Product.findById(id);

            if (!product) {
                return res.status(404).json({ error: 'Produto não encontrado' });
            }

            // ✅ Se NÃO for admin, esconde campos sensíveis
            if (req.userRole !== 'admin') {
                delete product.sku;
                delete product.cost_price;
                delete product.meta_keywords;
            }

            // Incrementa view count de forma assíncrona (não bloqueia resposta)
            Product.incrementViewCount(id).catch((err) =>
                console.error('Erro ao incrementar views:', err)
            );

            res.json(product);
        } catch (error) {
            console.error('Erro ao buscar produto:', error);
            res.status(500).json({ error: 'Erro ao buscar produto' });
        }
    },

    // ==================================================
    // GET /api/products/admin/:id
    // Retorna TODOS os campos (incluindo sku, cost_price)
    // Protegido por requireAdmin na rota
    // ==================================================
    async getByIdAdmin(req, res) {
        try {
            const { id } = req.params;

            if (isNaN(id)) {
                return res.status(400).json({ error: 'ID inválido' });
            }

            const product = await Product.findById(id);

            if (!product) {
                return res.status(404).json({ error: 'Produto não encontrado' });
            }

            // ✅ NÃO deleta nenhum campo — admin vê tudo
            res.json(product);
        } catch (error) {
            console.error('Erro ao buscar produto (admin):', error);
            res.status(500).json({ error: 'Erro ao buscar produto' });
        }
    },

    // ==================================================
    // GET /api/products/slug/:slug
    // Público: esconde sku, cost_price, meta_keywords
    // Admin: retorna tudo
    // ==================================================
    async getBySlug(req, res) {
        try {
            const { slug } = req.params;
            const product = await Product.findBySlug(slug);

            if (!product) {
                return res.status(404).json({ error: 'Produto não encontrado' });
            }

            const fullProduct = await Product.findById(product.id);

            if (req.userRole !== 'admin') {
                delete fullProduct.sku;
                delete fullProduct.cost_price;
                delete fullProduct.meta_keywords;
            }

            Product.incrementViewCount(product.id).catch((err) =>
                console.error('Erro ao incrementar views:', err)
            );

            res.json(fullProduct);
        } catch (error) {
            console.error('Erro ao buscar produto por slug:', error);
            res.status(500).json({ error: 'Erro ao buscar produto' });
        }
    },

    // ==================================================
    // POST /api/products
    // ==================================================
    async create(req, res) {
        try {
            const { name, slug, sku, description, category_id, price } = req.body;

            const requiredFields = { name, slug, sku, description, category_id, price };
            const missingFields = Object.entries(requiredFields)
                .filter(([_, value]) => value === undefined || value === null || value === '')
                .map(([key]) => key);

            if (missingFields.length > 0) {
                return res.status(400).json({
                    error: 'Campos obrigatórios faltando',
                    fields: missingFields,
                });
            }

            if (price < 0) {
                return res.status(400).json({ error: 'Preço não pode ser negativo' });
            }

            if (
                req.body.discount_percent &&
                (req.body.discount_percent < 0 || req.body.discount_percent > 100)
            ) {
                return res.status(400).json({ error: 'Desconto deve estar entre 0 e 100' });
            }

            const product = await Product.create(req.body);

            const imageUrl = req.body.image_url || req.body.uploaded_image_url;
            if (imageUrl) {
                try {
                    await Product.addImage(product.id, {
                        image_url: imageUrl,
                        alt_text: product.name,
                        is_primary: true,
                    });
                } catch (imgErr) {
                    console.warn('Produto criado, mas falha ao adicionar imagem:', imgErr);
                }
            }

            res.status(201).json(product);
        } catch (error) {
            console.error('Erro ao criar produto:', error);

            if (error.code === '23505') {
                const field = error.detail.includes('slug') ? 'slug' : 'sku';
                return res.status(400).json({
                    error: `O ${field} informado já existe`,
                    field,
                });
            }

            if (error.code === '23503') {
                return res.status(400).json({
                    error: 'Categoria, subcategoria ou marca inválida',
                });
            }

            res.status(500).json({ error: 'Erro ao criar produto' });
        }
    },

    // ==================================================
    // PUT /api/products/:id
    // ==================================================
    async update(req, res) {
        try {
            const { id } = req.params;

            if (isNaN(id)) {
                return res.status(400).json({ error: 'ID inválido' });
            }

            if (req.body.price !== undefined && req.body.price < 0) {
                return res.status(400).json({ error: 'Preço não pode ser negativo' });
            }

            if (
                req.body.discount_percent !== undefined &&
                (req.body.discount_percent < 0 || req.body.discount_percent > 100)
            ) {
                return res.status(400).json({ error: 'Desconto deve estar entre 0 e 100' });
            }

            const product = await Product.update(id, req.body);

            if (!product) {
                return res
                    .status(404)
                    .json({ error: 'Produto não encontrado ou nenhum campo para atualizar' });
            }

            res.json(product);
        } catch (error) {
            console.error('Erro ao atualizar produto:', error);

            if (error.code === '23505') {
                const field = error.detail.includes('slug') ? 'slug' : 'sku';
                return res.status(400).json({
                    error: `O ${field} informado já existe`,
                    field,
                });
            }

            if (error.code === '23503') {
                return res.status(400).json({
                    error: 'Categoria, subcategoria ou marca inválida',
                });
            }

            res.status(500).json({ error: 'Erro ao atualizar produto' });
        }
    },

    // ==================================================
    // DELETE /api/products/:id (soft delete)
    // ==================================================
    async delete(req, res) {
        try {
            const { id } = req.params;

            if (isNaN(id)) {
                return res.status(400).json({ error: 'ID inválido' });
            }

            const result = await Product.softDelete(id);

            if (!result) {
                return res.status(404).json({ error: 'Produto não encontrado' });
            }

            res.status(204).send();
        } catch (error) {
            console.error('Erro ao deletar produto:', error);
            res.status(500).json({ error: 'Erro ao deletar produto' });
        }
    },

    // ==================================================
    // GET /api/products/search?q=...
    // ==================================================
    async search(req, res) {
        try {
            const q = (req.query.q || '').trim();
            const page = parseInt(req.query.page) || 1;
            const limit = Math.min(parseInt(req.query.limit) || 20, 50);
            const offset = (page - 1) * limit;

            if (!q) {
                return res.status(400).json({ error: 'Parâmetro "q" é obrigatório' });
            }

            const { products, total } = await Product.search(q, limit, offset);

            res.json({
                products,
                pagination: {
                    total,
                    limit,
                    offset,
                    page,
                    pages: Math.ceil(total / limit),
                },
            });
        } catch (error) {
            console.error('Erro ao buscar produtos:', error);
            res.status(500).json({ error: 'Erro ao buscar produtos' });
        }
    },

    // ==================================================
    // GET /api/products/admin/list
    // ==================================================
    async adminList(req, res) {
        try {
            const filters = {
                q: (req.query.q || '').trim(),
                min_price: req.query.min_price,
                max_price: req.query.max_price,
                stock: req.query.stock || 'all',
                sort: req.query.sort || 'date_desc',
                page: parseInt(req.query.page) || 1,
                limit: Math.min(parseInt(req.query.limit) || 20, 50),
            };

            const { products, total } = await Product.adminList(filters);

            res.json({
                products,
                pagination: {
                    total,
                    limit: filters.limit,
                    page: filters.page,
                    pages: Math.ceil(total / filters.limit),
                },
            });
        } catch (error) {
            console.error('Erro ao listar produtos (admin):', error);
            res.status(500).json({ error: 'Erro ao listar produtos' });
        }
    },

    // ==================================================
    // PATCH /api/products/:id
    // Body: { field: "price", value: 199.90 }
    // ==================================================
    async patchField(req, res) {
        try {
            const { id } = req.params;
            const { field, value } = req.body;

            if (isNaN(id)) {
                return res.status(400).json({ error: 'ID inválido' });
            }

            if (!field) {
                return res.status(400).json({ error: 'Campo "field" é obrigatório' });
            }

            let parsedValue = value;

            if (
                ['price', 'cost_price', 'discount_percent', 'stock_quantity', 'weight'].includes(
                    field
                )
            ) {
                if (value === null || value === '') {
                    parsedValue = null;
                } else {
                    parsedValue = parseFloat(value);
                    if (isNaN(parsedValue)) {
                        return res.status(400).json({ error: `Valor inválido para "${field}"` });
                    }
                }
            }

            if (['is_active', 'is_featured', 'is_new', 'is_best_seller'].includes(field)) {
                parsedValue = value === true || value === 'true';
            }

            if (['category_id', 'brand_id', 'subcategory_id'].includes(field)) {
                if (value === null || value === '') {
                    parsedValue = null;
                } else {
                    parsedValue = parseInt(value);
                    if (isNaN(parsedValue)) {
                        return res.status(400).json({ error: `Valor inválido para "${field}"` });
                    }
                }
            }

            const product = await Product.updateField(id, field, parsedValue);

            if (!product) {
                return res.status(404).json({ error: 'Produto não encontrado' });
            }

            res.json({
                message: `Campo "${field}" atualizado com sucesso`,
                product,
            });
        } catch (error) {
            console.error('Erro ao atualizar campo:', error);

            if (error.code === '23505') {
                return res.status(400).json({ error: 'Slug ou SKU já existe' });
            }

            if (error.message.includes('não pode ser editado')) {
                return res.status(400).json({ error: error.message });
            }

            res.status(500).json({ error: 'Erro ao atualizar campo' });
        }
    },

    // ==================================================
    // POST /api/products/:id/images
    // ==================================================
    async addImage(req, res) {
        try {
            const { id } = req.params;
            const { image_url, alt_text, is_primary } = req.body;

            if (isNaN(id)) {
                return res.status(400).json({ error: 'ID inválido' });
            }

            if (!image_url) {
                return res.status(400).json({ error: 'image_url é obrigatória' });
            }

            const image = await Product.addImage(id, {
                image_url,
                alt_text: alt_text || null,
                is_primary: is_primary === true,
            });

            res.status(201).json({
                message: 'Imagem adicionada com sucesso',
                image,
            });
        } catch (error) {
            console.error('Erro ao adicionar imagem:', error);
            res.status(500).json({ error: 'Erro ao adicionar imagem' });
        }
    },

    // ==================================================
    // DELETE /api/products/:id/images/:imageId
    // ==================================================
    async removeImage(req, res) {
        try {
            const { id, imageId } = req.params;

            if (isNaN(id) || isNaN(imageId)) {
                return res.status(400).json({ error: 'IDs inválidos' });
            }

            const result = await Product.removeImage(id, imageId);

            if (!result) {
                return res.status(404).json({ error: 'Imagem não encontrada' });
            }

            res.json({ message: 'Imagem removida com sucesso', ...result });
        } catch (error) {
            console.error('Erro ao remover imagem:', error);
            res.status(500).json({ error: 'Erro ao remover imagem' });
        }
    },

    // ==================================================
    // PUT /api/products/:id/images/:imageId/primary
    // ==================================================
    async setPrimaryImage(req, res) {
        try {
            const { id, imageId } = req.params;

            if (isNaN(id) || isNaN(imageId)) {
                return res.status(400).json({ error: 'IDs inválidos' });
            }

            const image = await Product.setPrimaryImage(id, imageId);

            if (!image) {
                return res.status(404).json({ error: 'Imagem não encontrada' });
            }

            res.json({ message: 'Imagem definida como principal', image });
        } catch (error) {
            console.error('Erro ao definir imagem principal:', error);
            res.status(500).json({ error: 'Erro ao definir imagem principal' });
        }
    },
};

module.exports = productController;