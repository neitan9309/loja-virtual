// ======================================================
// src/controllers/orderController.js
// ======================================================
const { Order, Payment, Cart, Product } = require('../models');

// ======================================================
// CONFIGURAÇÕES DE FRETE
// ======================================================
const FREE_SHIPPING_THRESHOLD = 99.90;
const SHIPPING_COST = 19.90;

const orderController = {
    // ==================================================
    // POST /api/orders
    // Cria um pedido a partir do carrinho do usuário
    // ==================================================
    async create(req, res) {
        try {
            const userId = req.userId;
            const { payment_method, shipping_address, notes } = req.body;

            // Valida método de pagamento
            const validMethods = ['pix', 'credit_card', 'boleto'];
            if (!validMethods.includes(payment_method)) {
                return res.status(400).json({
                    error: 'Método de pagamento inválido',
                    valid_methods: validMethods,
                });
            }

            // Valida endereço
            const requiredAddress = ['cep', 'street', 'number', 'neighborhood', 'city', 'state'];
            const missing = requiredAddress.filter((field) => !shipping_address?.[field]);
            if (missing.length > 0) {
                return res.status(400).json({
                    error: 'Endereço de entrega incompleto',
                    missing_fields: missing,
                });
            }

            // Busca o carrinho atual
            const cart = await Cart.getItems(userId);

            if (!cart.items || cart.items.length === 0) {
                return res.status(400).json({
                    error: 'Carrinho vazio',
                    code: 'EMPTY_CART',
                });
            }

            // Calcula valores
            const subtotal = cart.total;
            const shippingCost = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
            const discount = 0; // futuramente cupom de desconto
            const total = subtotal + shippingCost - discount;

            // Prepara itens (com snapshot)
            const items = cart.items.map((item) => ({
                product_id: item.product_id,
                name: item.name,
                slug: item.slug,
                image_url: item.image?.url || null,
                quantity: item.quantity,
                unit_price: item.unit_price,
                subtotal: item.subtotal,
            }));

            // Cria o pedido (com transação no model)
            const order = await Order.create({
                userId,
                items,
                shippingAddress: shipping_address,
                paymentMethod: payment_method,
                subtotal,
                shippingCost,
                discount,
                total,
                notes: notes || null,
            });

            // Cria o registro de pagamento (pending inicialmente)
            const payment = await Payment.create({
                order_id: order.id,
                method: payment_method,
                amount: total,
                status: 'pending',
            });

            res.status(201).json({
                message: 'Pedido criado com sucesso!',
                order,
                payment: {
                    id: payment.id,
                    transaction_id: payment.transaction_id,
                    method: payment.method,
                    status: payment.status,
                    amount: payment.amount,
                },
            });
        } catch (error) {
            console.error('Erro ao criar pedido:', error);

            if (error.status === 400) {
                return res.status(400).json({ error: error.message });
            }

            res.status(500).json({ error: 'Erro ao criar pedido' });
        }
    },

    // ==================================================
    // GET /api/orders
    // Lista pedidos do usuário autenticado
    // ==================================================
    async listMine(req, res) {
        try {
            const userId = req.userId;
            const page = parseInt(req.query.page) || 1;
            const limit = Math.min(parseInt(req.query.limit) || 10, 50);
            const offset = (page - 1) * limit;

            const [orders, total] = await Promise.all([
                Order.findByUser(userId, { limit, offset }),
                Order.countByUser(userId),
            ]);

            res.json({
                orders,
                pagination: {
                    total,
                    limit,
                    offset,
                    page,
                    pages: Math.ceil(total / limit),
                },
            });
        } catch (error) {
            console.error('Erro ao listar pedidos:', error);
            res.status(500).json({ error: 'Erro ao buscar pedidos' });
        }
    },

    // ==================================================
    // GET /api/orders/:id
    // Busca um pedido específico do usuário
    // ==================================================
    async getById(req, res) {
        try {
            const { id } = req.params;
            const userId = req.userId;

            if (isNaN(id)) {
                return res.status(400).json({ error: 'ID inválido' });
            }

            const order = await Order.findById(id, userId);

            if (!order) {
                return res.status(404).json({ error: 'Pedido não encontrado' });
            }

            res.json(order);
        } catch (error) {
            console.error('Erro ao buscar pedido:', error);
            res.status(500).json({ error: 'Erro ao buscar pedido' });
        }
    },

    // ==================================================
    // POST /api/orders/:id/pay
    // Simula o pagamento (mock)
    // ==================================================
    async pay(req, res) {
        try {
            const { id } = req.params;
            const userId = req.userId;

            if (isNaN(id)) {
                return res.status(400).json({ error: 'ID inválido' });
            }

            // Busca o pedido
            const order = await Order.findById(id, userId);

            if (!order) {
                return res.status(404).json({ error: 'Pedido não encontrado' });
            }

            if (order.status !== 'pending') {
                return res.status(400).json({
                    error: `Pedido já está com status "${order.status}"`,
                    code: 'INVALID_STATUS',
                });
            }

            if (order.payment_status === 'paid') {
                return res.status(400).json({
                    error: 'Pedido já foi pago',
                    code: 'ALREADY_PAID',
                });
            }

            // Pega o último pagamento pendente
            const payments = await Payment.findByOrder(id);
            const payment = payments.find((p) => p.status === 'pending') || payments[0];

            if (!payment) {
                return res.status(404).json({ error: 'Pagamento não encontrado' });
            }

            // Simula o resultado
            const result = Payment.simulatePayment(order.payment_method);

            let updatedPayment;
            let updatedOrder;

            if (result === 'paid') {
                // Marca pagamento como pago
                updatedPayment = await Payment.markAsPaid(payment.id, {
                    simulated: true,
                    approved_at: new Date().toISOString(),
                });
                // Marca pedido como pago
                updatedOrder = await Order.markAsPaid(id);
            } else if (result === 'failed') {
                updatedPayment = await Payment.markAsFailed(payment.id, {
                    simulated: true,
                    reason: 'Pagamento recusado pela operadora (simulado)',
                });
                updatedOrder = order;
            } else {
                // pending
                updatedPayment = payment;
                updatedOrder = order;
            }

            const messages = {
                paid: 'Pagamento aprovado com sucesso!',
                failed: 'Pagamento recusado. Tente novamente ou escolha outro método.',
                pending: 'Pagamento em processamento. Aguarde a confirmação.',
            };

            res.json({
                message: messages[result],
                result,
                payment: {
                    id: updatedPayment.id,
                    method: updatedPayment.method,
                    status: updatedPayment.status,
                    amount: updatedPayment.amount,
                    transaction_id: updatedPayment.transaction_id,
                    paid_at: updatedPayment.paid_at,
                },
                order: {
                    id: updatedOrder.id,
                    status: updatedOrder.status,
                    payment_status: updatedOrder.payment_status,
                    total: updatedOrder.total,
                },
            });
        } catch (error) {
            console.error('Erro ao processar pagamento:', error);
            res.status(500).json({ error: 'Erro ao processar pagamento' });
        }
    },

    // ==================================================
    // POST /api/orders/:id/cancel
    // Cancela o pedido (devolve estoque)
    // ==================================================
    async cancel(req, res) {
        try {
            const { id } = req.params;
            const userId = req.userId;
            const { reason } = req.body;

            if (isNaN(id)) {
                return res.status(400).json({ error: 'ID inválido' });
            }

            // Busca o pedido
            const order = await Order.findById(id, userId);

            if (!order) {
                return res.status(404).json({ error: 'Pedido não encontrado' });
            }

            if (order.status === 'cancelled') {
                return res.status(400).json({ error: 'Pedido já está cancelado' });
            }

            if (['shipped', 'delivered'].includes(order.status)) {
                return res.status(400).json({
                    error: 'Pedidos já enviados ou entregues não podem ser cancelados',
                });
            }

            const updated = await Order.cancel(id, reason || 'Cancelado pelo cliente');

            res.json({
                message: 'Pedido cancelado com sucesso',
                order: updated,
            });
        } catch (error) {
            console.error('Erro ao cancelar pedido:', error);
            res.status(500).json({ error: 'Erro ao cancelar pedido' });
        }
    },

    // ==================================================
    // GET /api/orders/admin/list
    // Lista todos os pedidos (admin)
    // ==================================================
    async adminList(req, res) {
        try {
            const status = req.query.status;
            const page = parseInt(req.query.page) || 1;
            const limit = Math.min(parseInt(req.query.limit) || 20, 100);
            const offset = (page - 1) * limit;

            const orders = await Order.findAll({ status, limit, offset });
            const stats = await Order.getStats();

            res.json({
                orders,
                stats,
                pagination: {
                    limit,
                    offset,
                    page,
                    total: stats.total,
                    pages: Math.ceil(stats.total / limit),
                },
            });
        } catch (error) {
            console.error('Erro ao listar pedidos (admin):', error);
            res.status(500).json({ error: 'Erro ao listar pedidos' });
        }
    },

    // ==================================================
    // GET /api/orders/admin/:id
    // Detalhe completo do pedido (admin)
    // ==================================================
    async adminGetById(req, res) {
        try {
            const { id } = req.params;

            if (isNaN(id)) {
                return res.status(400).json({ error: 'ID inválido' });
            }

            const order = await Order.findById(id);

            if (!order) {
                return res.status(404).json({ error: 'Pedido não encontrado' });
            }

            res.json(order);
        } catch (error) {
            console.error('Erro ao buscar pedido (admin):', error);
            res.status(500).json({ error: 'Erro ao buscar pedido' });
        }
    },

    // ==================================================
    // PATCH /api/orders/admin/:id/status
    // Altera status do pedido (admin)
    // ==================================================
    async adminUpdateStatus(req, res) {
        try {
            const { id } = req.params;
            const { status, reason } = req.body;

            if (isNaN(id)) {
                return res.status(400).json({ error: 'ID inválido' });
            }

            const validStatuses = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({
                    error: 'Status inválido',
                    valid_statuses: validStatuses,
                });
            }

            let updated;

            if (status === 'cancelled') {
                updated = await Order.cancel(id, reason || 'Cancelado pelo administrador');
            } else {
                updated = await Order.updateStatus(id, status, reason);
            }

            if (!updated) {
                return res.status(404).json({ error: 'Pedido não encontrado' });
            }

            res.json({
                message: `Status atualizado para "${status}"`,
                order: updated,
            });
        } catch (error) {
            console.error('Erro ao atualizar status:', error);
            res.status(500).json({ error: 'Erro ao atualizar status' });
        }
    },

    // ==================================================
    // GET /api/orders/shipping/quote?cep=XXXXX&subtotal=XXX
    // Calcula frete (mock)
    // ==================================================
    async shippingQuote(req, res) {
        try {
            const { cep, subtotal } = req.query;

            if (!cep || cep.replace(/\D/g, '').length !== 8) {
                return res.status(400).json({ error: 'CEP inválido' });
            }

            const subtotalNum = parseFloat(subtotal) || 0;
            const isFree = subtotalNum >= FREE_SHIPPING_THRESHOLD;

            // Simula por região (primeiro dígito do CEP)
            const region = parseInt(cep[0]);
            let days;

            if ([6, 7].includes(region)) days = '2 a 4 dias úteis';
            else if ([8, 1].includes(region)) days = '3 a 6 dias úteis';
            else days = '5 a 10 dias úteis';

            res.json({
                cep: cep.replace(/\D/g, ''),
                shipping_cost: isFree ? 0 : SHIPPING_COST,
                is_free: isFree,
                free_threshold: FREE_SHIPPING_THRESHOLD,
                delivery_estimate: days,
            });
        } catch (error) {
            console.error('Erro ao calcular frete:', error);
            res.status(500).json({ error: 'Erro ao calcular frete' });
        }
    },
};

module.exports = orderController;