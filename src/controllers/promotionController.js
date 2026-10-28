// ======================================================
// src/controllers/promotionController.js
// ======================================================
const { Promotion } = require('../models');

const promotionController = {
    // ==================================================
    // LISTAR (público)
    // ==================================================
    async list(req, res) {
        try {
            const promotions = await Promotion.findAll();
            res.json(promotions);
        } catch (error) {
            console.error('Erro ao listar promoções:', error);
            res.status(500).json({ error: 'Erro ao buscar promoções' });
        }
    },

    // ==================================================
    // ATIVAS (público)
    // ==================================================
    async active(req, res) {
        try {
            const promotions = await Promotion.findActive();
            res.json(promotions);
        } catch (error) {
            console.error('Erro ao buscar promoções ativas:', error);
            res.status(500).json({ error: 'Erro ao buscar promoções ativas' });
        }
    },

    // ==================================================
    // DISPONÍVEIS PARA O CARRINHO (público)
    // ==================================================
    async availableForCart(req, res) {
        try {
            const subtotal = parseFloat(req.query.subtotal) || 0;
            if (subtotal < 0) {
                return res.status(400).json({ error: 'Subtotal inválido' });
            }

            let cartItems = [];
            if (req.query.items) {
                try {
                    cartItems = JSON.parse(req.query.items);
                    if (!Array.isArray(cartItems)) cartItems = [];
                } catch {
                    cartItems = [];
                }
            }

            const userId = req.userId || null;

            const coupons = await Promotion.findAvailableForCart({
                subtotal,
                userId,
                cartItems,
            });

            res.json({ coupons });
        } catch (error) {
            console.error('Erro ao buscar cupons disponíveis:', error);
            res.status(500).json({ error: 'Erro ao buscar cupons disponíveis' });
        }
    },

    // ==================================================
    // BUSCAR POR ID
    // ==================================================
    async getById(req, res) {
        try {
            const { id } = req.params;
            if (isNaN(id)) {
                return res.status(400).json({ error: 'ID inválido' });
            }

            const promotion = await Promotion.findById(id);
            if (!promotion) {
                return res.status(404).json({ error: 'Promoção não encontrada' });
            }

            res.json(promotion);
        } catch (error) {
            console.error('Erro ao buscar promoção:', error);
            res.status(500).json({ error: 'Erro ao buscar promoção' });
        }
    },

    // ==================================================
    // BUSCAR POR CÓDIGO (validação no checkout)
    // ==================================================
    async getByCode(req, res) {
        try {
            const { code } = req.params;
            const promotion = await Promotion.findByCode(code);

            if (!promotion) {
                return res.status(404).json({
                    error: 'Cupom inválido ou expirado',
                });
            }

            if (promotion.usage_limit && promotion.usage_count >= promotion.usage_limit) {
                return res.status(400).json({
                    error: 'Cupom atingiu o limite de uso',
                });
            }

            if (req.userId) {
                const alreadyUsed = await Promotion.hasUserUsed(req.userId, promotion.id);
                if (alreadyUsed) {
                    return res.status(400).json({
                        error: 'Você já utilizou este cupom',
                        code: 'ALREADY_USED',
                    });
                }
            }

            res.json(promotion);
        } catch (error) {
            console.error('Erro ao validar cupom:', error);
            res.status(500).json({ error: 'Erro ao validar cupom' });
        }
    },

    // ==================================================
    // CRIAR
    // ==================================================
    async create(req, res) {
        try {
            const {
                name, discount_type, discount_value, start_date, end_date,
            } = req.body;

            const requiredFields = { name, discount_type, discount_value, start_date, end_date };
            const missingFields = Object.entries(requiredFields)
                .filter(([_, value]) => value === undefined || value === null || value === '')
                .map(([key]) => key);

            if (missingFields.length > 0) {
                return res.status(400).json({
                    error: 'Campos obrigatórios faltando',
                    fields: missingFields,
                });
            }

            const validTypes = ['percentage', 'fixed', 'buy_x_get_y'];
            if (!validTypes.includes(discount_type)) {
                return res.status(400).json({
                    error: 'discount_type deve ser: percentage, fixed ou buy_x_get_y',
                });
            }

            if (new Date(start_date) >= new Date(end_date)) {
                return res.status(400).json({
                    error: 'Data de início deve ser anterior à data de fim',
                });
            }

            if (req.body.applies_to_all === false) {
                if (!req.body.restricted_category_id) {
                    return res.status(400).json({
                        error: 'Quando "applies_to_all" é false, informe "restricted_category_id"',
                    });
                }
            }

            if (req.body.is_first_purchase_only === undefined) {
                req.body.is_first_purchase_only = false;
            }

            const promotion = await Promotion.create(req.body);
            res.status(201).json(promotion);
        } catch (error) {
            console.error('Erro ao criar promoção:', error);
            if (error.code === '23505') {
                return res.status(400).json({ error: 'Código de cupom já existe' });
            }
            if (error.code === '23503') {
                return res.status(400).json({ error: 'Categoria inválida' });
            }
            res.status(500).json({ error: 'Erro ao criar promoção' });
        }
    },

    // ==================================================
    // ATUALIZAR
    // ==================================================
    async update(req, res) {
        try {
            const { id } = req.params;
            if (isNaN(id)) {
                return res.status(400).json({ error: 'ID inválido' });
            }

            if (req.body.discount_type) {
                const validTypes = ['percentage', 'fixed', 'buy_x_get_y'];
                if (!validTypes.includes(req.body.discount_type)) {
                    return res.status(400).json({
                        error: 'discount_type deve ser: percentage, fixed ou buy_x_get_y',
                    });
                }
            }

            if (req.body.applies_to_all === true) {
                req.body.restricted_category_id = null;
            }

            const promotion = await Promotion.update(id, req.body);
            if (!promotion) {
                return res.status(404).json({
                    error: 'Promoção não encontrada ou nenhum campo para atualizar',
                });
            }

            res.json(promotion);
        } catch (error) {
            console.error('Erro ao atualizar promoção:', error);
            if (error.code === '23505') {
                return res.status(400).json({ error: 'Código de cupom já existe' });
            }
            res.status(500).json({ error: 'Erro ao atualizar promoção' });
        }
    },

    // ==================================================
    // DELETAR
    // ==================================================
    async delete(req, res) {
        try {
            const { id } = req.params;
            if (isNaN(id)) {
                return res.status(400).json({ error: 'ID inválido' });
            }

            const result = await Promotion.delete(id);
            if (!result) {
                return res.status(404).json({ error: 'Promoção não encontrada' });
            }

            res.status(204).send();
        } catch (error) {
            console.error('Erro ao deletar promoção:', error);
            res.status(500).json({ error: 'Erro ao deletar promoção' });
        }
    },

    // ==================================================
    // LISTAGEM ADMIN (com filtros)
    // ==================================================
    async adminList(req, res) {
        try {
            const promotions = await Promotion.findAll({
                q: req.query.q || '',
                status: req.query.status || 'all',
                sort: req.query.sort || 'created_at',
                order: req.query.order || 'desc',
            });
            res.json(promotions);
        } catch (error) {
            console.error('Erro ao listar promoções (admin):', error);
            res.status(500).json({ error: 'Erro ao listar promoções' });
        }
    },

    // ==================================================
    // TOGGLE ATIVO/INATIVO
    // ==================================================
    async adminToggle(req, res) {
        try {
            const { id } = req.params;
            if (isNaN(id)) {
                return res.status(400).json({ error: 'ID inválido' });
            }

            const current = await Promotion.findById(id);
            if (!current) {
                return res.status(404).json({ error: 'Promoção não encontrada' });
            }

            const updated = await Promotion.update(id, { is_active: !current.is_active });
            res.json({
                message: `Cupom ${updated.is_active ? 'ativado' : 'desativado'}`,
                promotion: updated,
            });
        } catch (error) {
            console.error('Erro ao alternar cupom:', error);
            res.status(500).json({ error: 'Erro ao alternar cupom' });
        }
    },

    // ==================================================
    // RESETAR CONTADOR GLOBAL
    // ==================================================
    async adminResetUsage(req, res) {
        try {
            const { id } = req.params;
            if (isNaN(id)) {
                return res.status(400).json({ error: 'ID inválido' });
            }

            const result = await Promotion.resetUsage(id);
            
            res.json({
                message: `Contador resetado com sucesso!`,
                new_usage_count: result.new_usage_count,
                history_kept: result.history_cleared
            });
        } catch (error) {
            console.error('Erro ao resetar uso:', error);
            res.status(500).json({ error: 'Erro ao resetar uso' });
        }
    },

    // ==================================================
    // LISTAR USUÁRIOS QUE USARAM
    // ==================================================
    async adminUsages(req, res) {
        try {
            const { id } = req.params;
            if (isNaN(id)) {
                return res.status(400).json({ error: 'ID inválido' });
            }

            const usages = await Promotion.findUsages(id);
            res.json({ usages });
        } catch (error) {
            console.error('Erro ao listar usos:', error);
            res.status(500).json({ error: 'Erro ao listar usos' });
        }
    },
};

module.exports = promotionController;