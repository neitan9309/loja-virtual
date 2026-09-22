const { Category } = require('../models');

const categoryController = {
    // GET /api/categories
    async list(req, res) {
        try {
            const includeInactive = req.query.include_inactive === 'true';
            const categories = await Category.findAll(includeInactive);
            res.json(categories);
        } catch (error) {
            console.error('Erro ao listar categorias:', error);
            res.status(500).json({ error: 'Erro ao buscar categorias' });
        }
    },

    // GET /api/categories/tree-full - Árvore completa (3 níveis)
    async treeFull(req, res) {
        try {
            const tree = await Category.findTree();
            res.json(tree);
        } catch (error) {
            console.error('Erro ao buscar árvore de categorias:', error);
            res.status(500).json({ error: 'Erro ao buscar categorias' });
        }
    },

    // GET /api/categories/tree - Árvore com subcategories (legado)
    async tree(req, res) {
        try {
            const categories = await Category.findWithSubcategories();
            res.json(categories);
        } catch (error) {
            console.error('Erro ao listar árvore de categorias:', error);
            res.status(500).json({ error: 'Erro ao buscar categorias' });
        }
    },

    // GET /api/categories/:id
    async getById(req, res) {
        try {
            const { id } = req.params;
            if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

            const category = await Category.findById(id);
            if (!category) return res.status(404).json({ error: 'Categoria não encontrada' });

            res.json(category);
        } catch (error) {
            console.error('Erro ao buscar categoria:', error);
            res.status(500).json({ error: 'Erro ao buscar categoria' });
        }
    },

    // GET /api/categories/slug/:slug
    async getBySlug(req, res) {
        try {
            const { slug } = req.params;
            const category = await Category.findBySlug(slug);
            if (!category) return res.status(404).json({ error: 'Categoria não encontrada' });

            res.json(category);
        } catch (error) {
            console.error('Erro ao buscar categoria por slug:', error);
            res.status(500).json({ error: 'Erro ao buscar categoria' });
        }
    },

    // POST /api/categories
    async create(req, res) {
        try {
            const { name, slug } = req.body;
            if (!name || !slug) {
                return res.status(400).json({ error: 'Campos obrigatórios: name, slug' });
            }

            const category = await Category.create(req.body);
            res.status(201).json(category);
        } catch (error) {
            console.error('Erro ao criar categoria:', error);
            if (error.code === '23505') return res.status(400).json({ error: 'Slug já existe' });
            if (error.code === '23503') return res.status(400).json({ error: 'Categoria pai inválida' });
            res.status(500).json({ error: 'Erro ao criar categoria' });
        }
    },

    // PUT /api/categories/:id
    async update(req, res) {
        try {
            const { id } = req.params;
            if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

            const category = await Category.update(id, req.body);
            if (!category) return res.status(404).json({ error: 'Categoria não encontrada ou nenhum campo para atualizar' });

            res.json(category);
        } catch (error) {
            console.error('Erro ao atualizar categoria:', error);
            if (error.code === '23505') return res.status(400).json({ error: 'Slug já existe' });
            res.status(500).json({ error: 'Erro ao atualizar categoria' });
        }
    },

    // DELETE /api/categories/:id
    async delete(req, res) {
        try {
            const { id } = req.params;
            if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

            const result = await Category.delete(id);
            if (!result) return res.status(404).json({ error: 'Categoria não encontrada' });

            res.status(204).send();
        } catch (error) {
            console.error('Erro ao deletar categoria:', error);
            if (error.code === '23503') {
                return res.status(400).json({ error: 'Não é possível deletar: existem produtos ou subcategorias vinculadas' });
            }
            res.status(500).json({ error: 'Erro ao deletar categoria' });
        }
    }
};

module.exports = categoryController;