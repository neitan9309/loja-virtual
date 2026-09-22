const { Product } = require('../models');

const productController = {
    // GET /api/products - Listar produtos com filtros
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
                sort: req.query.sort || 'created_at',
                order: req.query.order || 'DESC',
                limit: parseInt(req.query.limit) || 20,
                offset: parseInt(req.query.offset) || 0
            };

            const [products, total] = await Promise.all([
                Product.findAll(filters),
                Product.count(filters)
            ]);

            res.json({
                products,
                pagination: {
                    total,
                    limit: filters.limit,
                    offset: filters.offset,
                    pages: Math.ceil(total / filters.limit)
                }
            });
        } catch (error) {
            console.error('Erro ao listar produtos:', error);
            res.status(500).json({ error: 'Erro ao buscar produtos' });
        }
    },

    // GET /api/products/:id - Obter produto específico
    async getById(req, res) {
        try {
            const { id } = req.params;

            // Valida se o ID é numérico
            if (isNaN(id)) {
                return res.status(400).json({ error: 'ID inválido' });
            }

            const product = await Product.findById(id);

            if (!product) {
                return res.status(404).json({ error: 'Produto não encontrado' });
            }

            // Incrementa visualização (não bloqueia resposta)
            Product.incrementViewCount(id).catch(err => 
                console.error('Erro ao incrementar views:', err)
            );

            res.json(product);
        } catch (error) {
            console.error('Erro ao buscar produto:', error);
            res.status(500).json({ error: 'Erro ao buscar produto' });
        }
    },

    // GET /api/products/slug/:slug - Obter produto por slug (URL amigável)
    async getBySlug(req, res) {
        try {
            const { slug } = req.params;
            const product = await Product.findBySlug(slug);

            if (!product) {
                return res.status(404).json({ error: 'Produto não encontrado' });
            }

            // Busca dados completos pelo ID
            const fullProduct = await Product.findById(product.id);

            Product.incrementViewCount(product.id).catch(err => 
                console.error('Erro ao incrementar views:', err)
            );

            res.json(fullProduct);
        } catch (error) {
            console.error('Erro ao buscar produto por slug:', error);
            res.status(500).json({ error: 'Erro ao buscar produto' });
        }
    },

    // POST /api/products - Criar produto
    async create(req, res) {
        try {
            const {
                name, slug, sku, description, category_id, price
            } = req.body;

            // Validação de campos obrigatórios
            const requiredFields = { name, slug, sku, description, category_id, price };
            const missingFields = Object.entries(requiredFields)
                .filter(([_, value]) => value === undefined || value === null || value === '')
                .map(([key]) => key);

            if (missingFields.length > 0) {
                return res.status(400).json({
                    error: 'Campos obrigatórios faltando',
                    fields: missingFields
                });
            }

            // Validações adicionais
            if (price < 0) {
                return res.status(400).json({ error: 'Preço não pode ser negativo' });
            }

            if (req.body.discount_percent && (req.body.discount_percent < 0 || req.body.discount_percent > 100)) {
                return res.status(400).json({ error: 'Desconto deve estar entre 0 e 100' });
            }

            const product = await Product.create(req.body);
            res.status(201).json(product);
        } catch (error) {
            console.error('Erro ao criar produto:', error);

            if (error.code === '23505') {
                const field = error.detail.includes('slug') ? 'slug' : 'sku';
                return res.status(400).json({ 
                    error: `O ${field} informado já existe`,
                    field 
                });
            }

            if (error.code === '23503') {
                return res.status(400).json({ 
                    error: 'Categoria, subcategoria ou marca inválida' 
                });
            }

            res.status(500).json({ error: 'Erro ao criar produto' });
        }
    },

    // PUT /api/products/:id - Atualizar produto
    async update(req, res) {
        try {
            const { id } = req.params;

            if (isNaN(id)) {
                return res.status(400).json({ error: 'ID inválido' });
            }

            // Validações
            if (req.body.price !== undefined && req.body.price < 0) {
                return res.status(400).json({ error: 'Preço não pode ser negativo' });
            }

            if (req.body.discount_percent !== undefined && 
                (req.body.discount_percent < 0 || req.body.discount_percent > 100)) {
                return res.status(400).json({ error: 'Desconto deve estar entre 0 e 100' });
            }

            const product = await Product.update(id, req.body);

            if (!product) {
                return res.status(404).json({ error: 'Produto não encontrado ou nenhum campo para atualizar' });
            }

            res.json(product);
        } catch (error) {
            console.error('Erro ao atualizar produto:', error);

            if (error.code === '23505') {
                const field = error.detail.includes('slug') ? 'slug' : 'sku';
                return res.status(400).json({ 
                    error: `O ${field} informado já existe`,
                    field 
                });
            }

            if (error.code === '23503') {
                return res.status(400).json({ 
                    error: 'Categoria, subcategoria ou marca inválida' 
                });
            }

            res.status(500).json({ error: 'Erro ao atualizar produto' });
        }
    },

    // DELETE /api/products/:id - Soft delete
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
    }
};

module.exports = productController;