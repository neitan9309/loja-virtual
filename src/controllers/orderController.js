// ======================================================
// src/controllers/orderController.js
// ======================================================
const { Order, Payment, Cart, Product, Promotion } = require('../models');

// ======================================================
// CONFIGURAÇÕES DE FRETE
// ======================================================
const FREE_SHIPPING_THRESHOLD = 99.90;
const SHIPPING_COST = 19.90;

const orderController = {
    // ==================================================
    // POST /api/orders
    // ==================================================
    async create(req, res) {
        try {
            const userId = req.userId;
            const { payment_method, shipping_address, notes, coupon_code } = req.body;

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

            // Calcula valores base
            const subtotal = cart.total;
            const shippingCost = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;

            // ==================================================
            // PROCESSA CUPOM (se enviado)
            // ==================================================
            let discount = 0;
            let couponApplied = null;

            if (coupon_code) {
                const promo = await Promotion.findByCode(coupon_code);

                if (!promo) {
                    return res.status(400).json({
                        error: 'Cupom inválido ou expirado',
                        code: 'INVALID_COUPON',
                    });
                }

                // Verifica limite de uso
                if (promo.usage_limit && promo.usage_count >= promo.usage_limit) {
                    return res.status(400).json({
                        error: 'Cupom atingiu o limite de uso',
                        code: 'COUPON_USAGE_LIMIT',
                    });
                }

                // Verifica valor mínimo
                if (promo.min_purchase && subtotal < parseFloat(promo.min_purchase)) {
                    return res.status(400).json({
                        error: `Este cupom exige compra mínima de R$ ${parseFloat(promo.min_purchase).toFixed(2).replace('.', ',')}`,
                        code: 'COUPON_MIN_PURCHASE',
                    });
                }

                // Calcula desconto
                if (promo.discount_type === 'percentage') {
                    discount = (subtotal * parseFloat(promo.discount_value)) / 100;
                    if (promo.max_discount) {
                        discount = Math.min(discount, parseFloat(promo.max_discount));
                    }
                } else if (promo.discount_type === 'fixed') {
                    discount = parseFloat(promo.discount_value);
                }
                // buy_x_get_y: desconto = 0 (não implementado)

                // Garante que não ultrapasse o subtotal
                discount = Math.min(discount, subtotal);
                discount = Math.round(discount * 100) / 100; // arredonda para 2 casas

                couponApplied = promo;
            }

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

            // ==================================================
            // INCREMENTA USO DO CUPOM (após sucesso)
            // ==================================================
            if (couponApplied) {
                try {
                    await Promotion.incrementUsage(couponApplied.id);
                } catch (err) {
                    // Não bloqueia a resposta se falhar (pedido já foi criado)
                    console.error('Erro ao incrementar uso do cupom:', err);
                }
            }

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
                coupon: couponApplied ? {
                    code: couponApplied.code,
                    discount,
                } : null,
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
    // GET /api/orders (meus pedidos — cliente)
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
    // POST /api/orders/:id/pay (mock)
    // ==================================================
    async pay(req, res) {
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

            // ✅ Pega APENAS o pagamento pendente (sem fallback)
            const payments = await Payment.findByOrder(id);
            const payment = payments.find((p) => p.status === 'pending');

            if (!payment) {
                return res.status(400).json({
                    error: 'Nenhum pagamento pendente encontrado',
                    code: 'NO_PENDING_PAYMENT',
                });
            }

            const result = Payment.simulatePayment(order.payment_method);

            let updatedPayment;
            let updatedOrder;

            if (result === 'paid') {
                updatedPayment = await Payment.markAsPaid(payment.id, {
                    simulated: true,
                    approved_at: new Date().toISOString(),
                });
                updatedOrder = await Order.markAsPaid(id);
            } else if (result === 'failed') {
                updatedPayment = await Payment.markAsFailed(payment.id, {
                    simulated: true,
                    reason: 'Pagamento recusado pela operadora (simulado)',
                });
                updatedOrder = order;
            } else {
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
    // ==================================================
    async cancel(req, res) {
        try {
            const { id } = req.params;
            const userId = req.userId;
            const { reason } = req.body;

            if (isNaN(id)) {
                return res.status(400).json({ error: 'ID inválido' });
            }

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
    // ==================================================
    async adminList(req, res) {
        try {
            const page = Math.max(1, parseInt(req.query.page) || 1);
            const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 20), 100);
            const offset = (page - 1) * limit;

            const filters = {
                q: (req.query.q || '').trim() || null,
                status: req.query.status || null,
                from: req.query.from || null,
                to: req.query.to || null,
                sort: req.query.sort || 'created_at',
                order: req.query.order || 'desc',
                limit,
                offset,
            };

            const [orders, total] = await Promise.all([
                Order.findAll(filters),
                Order.countAll(filters),
            ]);

            res.json({
                orders,
                pagination: {
                    page,
                    limit,
                    offset,
                    total,
                    pages: Math.ceil(total / limit) || 1,
                },
            });
        } catch (error) {
            console.error('Erro ao listar pedidos (admin):', error);
            res.status(500).json({ error: 'Erro ao listar pedidos' });
        }
    },

    // ==================================================
    // GET /api/orders/admin/stats
    // ==================================================
    async adminStats(req, res) {
        try {
            const from = req.query.from || null;
            const to = req.query.to || null;

            const stats = await Order.getStats({ from, to });

            res.json({
                total: stats.total,
                pending: stats.pending,
                paid: stats.paid,
                shipped: stats.shipped,
                delivered: stats.delivered,
                cancelled: stats.cancelled,
                revenue: parseFloat(stats.revenue),
            });
        } catch (error) {
            console.error('Erro ao buscar estatísticas:', error);
            res.status(500).json({ error: 'Erro ao buscar estatísticas' });
        }
    },

    // ==================================================
    // GET /api/orders/admin/:id
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
    // GET /api/orders/shipping/quote
    // ==================================================
    async shippingQuote(req, res) {
        try {
            const { cep, subtotal } = req.query;

            if (!cep || cep.replace(/\D/g, '').length !== 8) {
                return res.status(400).json({ error: 'CEP inválido' });
            }

            const subtotalNum = parseFloat(subtotal) || 0;
            const isFree = subtotalNum >= FREE_SHIPPING_THRESHOLD;

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