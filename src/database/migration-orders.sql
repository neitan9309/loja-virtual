-- ======================================================
-- MIGRATION: Sistema de Pedidos (Orders)
-- Rodar UMA VEZ no banco (local e Render):
--   psql -U postgres -d luxury_store -f src/database/migration-orders.sql
-- ======================================================

SET client_encoding = 'UTF8';

-- ======================================================
-- 1. TABELA: orders
-- ======================================================
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Status do pedido
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'paid', 'shipped', 'delivered', 'cancelled')),

    -- Valores
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    shipping_cost DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (shipping_cost >= 0),
    discount DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
    total DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (total >= 0),

    -- Pagamento
    payment_method VARCHAR(20) CHECK (payment_method IN ('pix', 'credit_card', 'boleto')),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),

    -- Snapshot do endereço (histórico do pedido)
    shipping_cep VARCHAR(9),
    shipping_street VARCHAR(150),
    shipping_number VARCHAR(20),
    shipping_complement VARCHAR(100),
    shipping_neighborhood VARCHAR(100),
    shipping_city VARCHAR(100),
    shipping_state VARCHAR(2),

    -- Observações
    notes TEXT,

    -- Cancelamento
    cancelled_at TIMESTAMP,
    cancel_reason VARCHAR(255),

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ======================================================
-- 2. TABELA: order_items
-- ======================================================
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,

    -- Snapshot do produto (histórico)
    product_name VARCHAR(150) NOT NULL,
    product_slug VARCHAR(150),
    product_image VARCHAR(255),

    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ======================================================
-- 3. TABELA: payments
-- ======================================================
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

    method VARCHAR(20) NOT NULL CHECK (method IN ('pix', 'credit_card', 'boleto')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),

    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    transaction_id VARCHAR(100),
    gateway_response JSONB,

    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ======================================================
-- 4. ÍNDICES
-- ======================================================
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- ======================================================
-- 5. TRIGGERS updated_at
-- ======================================================
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- ======================================================
-- 6. VERIFICAÇÃO
-- ======================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Migration de pedidos aplicada.';
    RAISE NOTICE '   Tabela: orders';
    RAISE NOTICE '   Tabela: order_items';
    RAISE NOTICE '   Tabela: payments';
    RAISE NOTICE '   9 índices criados';
    RAISE NOTICE '   2 triggers criados';
END $$;