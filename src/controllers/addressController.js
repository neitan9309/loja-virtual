// ======================================================
// src/controllers/addressController.js
// ======================================================
const { Address } = require('../models');

const addressController = {
    // ==================================================
    // GET /api/addresses
    // ==================================================
    async list(req, res) {
        try {
            const addresses = await Address.findByUser(req.userId);
            res.json(addresses);
        } catch (error) {
            console.error('Erro ao listar endereços:', error);
            res.status(500).json({ error: 'Erro ao buscar endereços' });
        }
    },

    // ==================================================
    // POST /api/addresses
    // ==================================================
    async create(req, res) {
        try {
            const { label, cep, street, number, neighborhood, city, state } = req.body;

            if (!label || !cep || !street || !number || !neighborhood || !city || !state) {
                return res.status(400).json({ error: 'Preencha todos os campos obrigatórios' });
            }

            const address = await Address.create(req.userId, req.body);
            res.status(201).json(address);
        } catch (error) {
            console.error('Erro ao criar endereço:', error);
            res.status(500).json({ error: 'Erro ao criar endereço' });
        }
    },

    // ==================================================
    // PUT /api/addresses/:id
    // ==================================================
    async update(req, res) {
        try {
            const { id } = req.params;
            if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

            const address = await Address.update(id, req.userId, req.body);
            if (!address) return res.status(404).json({ error: 'Endereço não encontrado' });

            res.json(address);
        } catch (error) {
            console.error('Erro ao atualizar endereço:', error);
            res.status(500).json({ error: 'Erro ao atualizar endereço' });
        }
    },

    // ==================================================
    // DELETE /api/addresses/:id
    // ==================================================
    async delete(req, res) {
        try {
            const { id } = req.params;
            if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

            const result = await Address.delete(id, req.userId);
            if (!result) return res.status(404).json({ error: 'Endereço não encontrado' });

            res.json({ message: 'Endereço removido', ...result });
        } catch (error) {
            console.error('Erro ao remover endereço:', error);
            res.status(500).json({ error: 'Erro ao remover endereço' });
        }
    },

    // ==================================================
    // PATCH /api/addresses/:id/default
    // ==================================================
    async setDefault(req, res) {
        try {
            const { id } = req.params;
            if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

            const address = await Address.setDefault(id, req.userId);
            if (!address) return res.status(404).json({ error: 'Endereço não encontrado' });

            res.json(address);
        } catch (error) {
            console.error('Erro ao definir endereço padrão:', error);
            res.status(500).json({ error: 'Erro ao definir endereço padrão' });
        }
    }
};

module.exports = addressController;