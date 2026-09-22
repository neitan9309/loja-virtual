const { Brand } = require('../models');

const brandController = {
    // GET /api/brands - Listar todas as marcas
    async list(req, res) {
        try {
            const includeInactive = req.query.include_inactive === 'true';
            const brands = await Brand.findAll(includeInactive);
            res.json(brands);
        } catch (error) {
            console.error('Erro ao listar marcas:', error);
            res.status(500).json({ error: 'Erro ao buscar marcas' });
        }
    },

    // GET /api/brands/:id
    async getById(req, res) {
        try {
            const { id } = req.params;

            if (isNaN(id)) {
                return res.status(400).json({ error: 'ID inválido' });
            }

            const brand = await Brand.findById(id);

            if (!brand) {
                return res.status(404).json({ error: 'Marca não encontrada' });
            }

            res.json(brand);
        } catch (error) {
            console.error('Erro ao buscar marca:', error);
            res.status(500).json({ error: 'Erro ao buscar marca' });
        }
    },

    // GET /api/brands/slug/:slug
    async getBySlug(req, res) {
        try {
            const { slug } = req.params;
            const brand = await Brand.findBySlug(slug);

            if (!brand) {
                return res.status(404).json({ error: 'Marca não encontrada' });
            }

            res.json(brand);
        } catch (error) {
            console.error('Erro ao buscar marca por slug:', error);
            res.status(500).json({ error: 'Erro ao buscar marca' });
        }
    },

    // POST /api/brands
    async create(req, res) {
        try {
            const { name, slug } = req.body;

            if (!name || !slug) {
                return res.status(400).json({ 
                    error: 'Campos obrigatórios: name, slug' 
                });
            }

            const brand = await Brand.create(req.body);
            res.status(201).json(brand);
        } catch (error) {
            console.error('Erro ao criar marca:', error);

            if (error.code === '23505') {
                return res.status(400).json({ error: 'Slug já existe' });
            }

            res.status(500).json({ error: 'Erro ao criar marca' });
        }
    },

    // PUT /api/brands/:id
    async update(req, res) {
        try {
            const { id } = req.params;

            if (isNaN(id)) {
                return res.status(400).json({ error: 'ID inválido' });
            }

            const brand = await Brand.update(id, req.body);

            if (!brand) {
                return res.status(404).json({ 
                    error: 'Marca não encontrada ou nenhum campo para atualizar' 
                });
            }

            res.json(brand);
        } catch (error) {
            console.error('Erro ao atualizar marca:', error);

            if (error.code === '23505') {
                return res.status(400).json({ error: 'Slug já existe' });
            }

            res.status(500).json({ error: 'Erro ao atualizar marca' });
        }
    },

    // DELETE /api/brands/:id
    async delete(req, res) {
        try {
            const { id } = req.params;

            if (isNaN(id)) {
                return res.status(400).json({ error: 'ID inválido' });
            }

            const result = await Brand.delete(id);

            if (!result) {
                return res.status(404).json({ error: 'Marca não encontrada' });
            }

            res.status(204).send();
        } catch (error) {
            console.error('Erro ao deletar marca:', error);

            if (error.code === '23503') {
                return res.status(400).json({ 
                    error: 'Não é possível deletar: existem produtos vinculados' 
                });
            }

            res.status(500).json({ error: 'Erro ao deletar marca' });
        }
    }
};

module.exports = brandController;