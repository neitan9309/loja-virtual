// ======================================================
// src/controllers/metricsController.js
// Endpoints de métricas agregadas para o dashboard
// ======================================================
const { Metrics } = require('../models');

const VALID_PERIODS = ['7d', '30d', '90d', '12m'];

const metricsController = {
    // ==================================================
    // GET /api/admin/metrics?period=30d
    // Retorna TODAS as métricas em uma única chamada
    // ==================================================
    async getAll(req, res) {
        try {
            const period = req.query.period || '30d';
            if (!VALID_PERIODS.includes(period)) {
                return res.status(400).json({
                    error: 'Período inválido',
                    valid_periods: VALID_PERIODS,
                });
            }

            const data = await Metrics.getAll(period);
            res.json(data);
        } catch (error) {
            console.error('Erro ao buscar métricas:', error);
            res.status(500).json({ error: 'Erro ao buscar métricas' });
        }
    },

    // ==================================================
    // GET /api/admin/metrics/overview?period=30d
    // Apenas os 4 KPIs do topo (útil para refresh parcial)
    // ==================================================
    async getOverview(req, res) {
        try {
            const period = req.query.period || '30d';
            if (!VALID_PERIODS.includes(period)) {
                return res.status(400).json({
                    error: 'Período inválido',
                    valid_periods: VALID_PERIODS,
                });
            }

            const data = await Metrics.getOverview(period);
            res.json(data);
        } catch (error) {
            console.error('Erro ao buscar overview:', error);
            res.status(500).json({ error: 'Erro ao buscar overview' });
        }
    },

        // ==================================================
    // GET /api/metrics/detail?type=revenue|customers
    // Drill-down dos KPIs (lista detalhada)
    // ==================================================
    async getDetail(req, res) {
        try {
            const type = req.query.type || '';
            const validTypes = ['revenue', 'customers', 'orders', 'ticket'];
            if (!validTypes.includes(type)) {
                return res.status(400).json({
                    error: 'Tipo inválido',
                    valid_types: validTypes,
                });
            }

            const period = req.query.period || '30d';
            if (!VALID_PERIODS.includes(period)) {
                return res.status(400).json({
                    error: 'Período inválido',
                    valid_periods: VALID_PERIODS,
                });
            }

            const page = Math.max(1, parseInt(req.query.page) || 1);
            const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 20), 100);

            let data;
            if (type === 'revenue') {
                data = await Metrics.getRevenueDetail({ period, page, limit });
            } else if (type === 'customers') {
                const only_buyers = req.query.only_buyers === 'true';
                data = await Metrics.getNewCustomersDetail({ period, page, limit, only_buyers });
            } else if (type === 'orders') {
                const status = req.query.status || null;
                data = await Metrics.getOrdersDetail({ period, page, limit, status });
            } else if (type === 'ticket') {
                data = await Metrics.getTicketDetail({ period });
            }

            res.json(data);
        } catch (error) {
            console.error('Erro ao buscar detalhes:', error);
            res.status(500).json({ error: 'Erro ao buscar detalhes' });
        }
    },
};

module.exports = metricsController;