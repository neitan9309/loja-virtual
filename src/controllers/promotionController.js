const { Promotion } = require('../models');

const promotionController = {
    // GET /api/promotions - Listar todas as promoções
    async list(req, res) {
        try {
            const promotions = await Promotion.findAll();
            res.json(promotions);
        } catch (error) {
            console.error('Erro ao listar promoções:', error);
            res.status(500).json({ error: 'Erro ao buscar promoções' });
        }
    },

    // GET /api/promotions/active - Promoções ativas no momento
    async active(req, res) {
        try {
            const promotions = await Promotion.findActive();
            res.json(promotions);
        } catch (error) {
            console.error('Erro ao buscar promoções ativas:', error);
            res.status(500).json({ error: 'Erro ao buscar promoções ativas' });
        }
    },

    // GET /api/promotions/:id
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

    // GET /api/promotions/code/:code - Validar cupom
    async getByCode(req, res) {
        try {
            const { code } = req.params;
            const promotion = await Promotion.findByCode(code);

            if (!promotion) {
                return res.status(404).json({ 
                    error: 'Cupom inválido ou expirado' 
                });
            }

            // Verifica limite de uso
            if (promotion.usage_limit && promotion.usage_count >= promotion.usage_limit) {
                return res.status(400).json({ 
                    error: 'Cupom atingiu o limite de uso' 
                });
            }

            res.json(promotion);
        } catch (error) {
            console.error('Erro ao validar cupom:', error);
            res.status(500).json({ error: 'Erro ao validar cupom' });
        }
    },

    // POST /api/promotions - Criar promoção
    async create(req, res) {
        try {
            const {
                name, discount_type, discount_value, start_date, end_date
            } = req.body;

            // Validação
            const requiredFields = { name, discount_type, discount_value, start_date, end_date };
            const missingFields = Object.entries(requiredFields)
                .filter(([_, value]) => value === undefined || value === null || value === '')
                .map(([key]) => key);

            if (missingFields.length > 0) {
                return res.status(400).json({
                    error: 'Campos obrigatórios faltando',
                    fields: missingFields
                });
            }

            // Valida tipo de desconto
            const validTypes = ['percentage', 'fixed', 'buy_x_get_y'];
            if (!validTypes.includes(discount_type)) {
                return res.status(400).json({ 
                    error: 'discount_type deve ser: percentage, fixed ou buy_x_get_y' 
                });
            }

            // Valida datas
            if (new Date(start_date) >= new Date(end_date)) {
                return res.status(400).json({ 
                    error: 'Data de início deve ser anterior à data de fim' 
                });
            }

            const promotion = await Promotion.create(req.body);
            res.status(201).json(promotion);
        } catch (error) {
            console.error('Erro ao criar promoção:', error);

            if (error.code === '23505') {
                return res.status(400).json({ error: 'Código de cupom já existe' });
            }

            res.status(500).json({ error: 'Erro ao criar promoção' });
        }
    },

    // PUT /api/promotions/:id
    async update(req, res) {
        try {
            const { id } = req.params;

            if (isNaN(id)) {
                return res.status(400).json({ error: 'ID inválido' });
            }

            // Valida tipo de desconto se fornecido
            if (req.body.discount_type) {
                const validTypes = ['percentage', 'fixed', 'buy_x_get_y'];
                if (!validTypes.includes(req.body.discount_type)) {
                    return res.status(400).json({ 
                        error: 'discount_type deve ser: percentage, fixed ou buy_x_get_y' 
                    });
                }
            }

            const promotion = await Promotion.update(id, req.body);

            if (!promotion) {
                return res.status(404).json({ 
                    error: 'Promoção não encontrada ou nenhum campo para atualizar' 
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

    // DELETE /api/promotions/:id
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
    }
};

module.exports = promotionController;