-- ======================================================
-- LUXURY STORE - SEEDS (DADOS INICIAIS)
-- ======================================================
-- Este arquivo popula o banco com dados de exemplo.
-- Pode ser executado múltiplas vezes com segurança (usa ON CONFLICT).
--
-- Uso:
--   psql -U postgres -d luxury_store -f src/database/seeds.sql
-- ======================================================

SET client_encoding = 'UTF8';

-- ======================================================
-- CATEGORIAS EM 3 NÍVEIS
-- ======================================================

-- ---------- NÍVEL 1: Categorias principais ----------
INSERT INTO categories (id, name, slug, description, parent_id, sort_order, is_active) VALUES
(1, 'Vestuário',          'vestuario',           'Roupas e acessórios de moda',            NULL, 1, true),
(2, 'Perfumaria',         'perfumaria',          'Perfumes e fragrâncias',                 NULL, 2, true),
(3, 'Artigos Esportivos', 'artigos-esportivos',  'Equipamentos e roupas para esportes',    NULL, 3, true)
ON CONFLICT (id) DO NOTHING;

-- ---------- NÍVEL 2: Gênero ----------
INSERT INTO categories (id, name, slug, description, parent_id, sort_order, is_active) VALUES
-- Vestuário
(10, 'Masculino', 'vestuario-masculino', 'Vestuário masculino', 1, 1, true),
(11, 'Feminino',  'vestuario-feminino',  'Vestuário feminino',  1, 2, true),
(12, 'Infantil',  'vestuario-infantil',  'Vestuário infantil',  1, 3, true),
-- Perfumaria
(20, 'Masculino', 'perfumaria-masculino', 'Perfumes masculinos', 2, 1, true),
(21, 'Feminino',  'perfumaria-feminino',  'Perfumes femininos',  2, 2, true),
(22, 'Unissex',   'perfumaria-unissex',   'Perfumes unissex',    2, 3, true),
-- Esportivos
(30, 'Masculino', 'esportivos-masculino', 'Esportivos masculinos', 3, 1, true),
(31, 'Feminino',  'esportivos-feminino',  'Esportivos femininos',  3, 2, true),
(32, 'Infantil',  'esportivos-infantil',  'Esportivos infantis',   3, 3, true)
ON CONFLICT (id) DO NOTHING;

-- ---------- NÍVEL 3: Tipos de produto ----------
INSERT INTO categories (id, name, slug, description, parent_id, sort_order, is_active) VALUES
-- Vestuário Masculino
(100, 'Camisas',         'vest-masc-camisas',   'Camisas masculinas',           10, 1, true),
(101, 'Camisetas',       'vest-masc-camisetas', 'Camisetas masculinas',         10, 2, true),
(102, 'Blusas',          'vest-masc-blusas',    'Blusas masculinas',            10, 3, true),
(103, 'Jaquetas',        'vest-masc-jaquetas',  'Jaquetas masculinas',          10, 4, true),
(104, 'Calças',          'vest-masc-calcas',    'Calças masculinas',            10, 5, true),
(105, 'Shorts/Bermudas', 'vest-masc-shorts',    'Shorts e bermudas masculinas', 10, 6, true),
(106, 'Acessórios',      'vest-masc-acessorios','Acessórios masculinos',        10, 7, true),
-- Vestuário Feminino
(110, 'Camisas',         'vest-fem-camisas',    'Camisas femininas',            11, 1, true),
(111, 'Camisetas',       'vest-fem-camisetas',  'Camisetas femininas',          11, 2, true),
(112, 'Blusas',          'vest-fem-blusas',     'Blusas femininas',             11, 3, true),
(113, 'Jaquetas',        'vest-fem-jaquetas',   'Jaquetas femininas',           11, 4, true),
(114, 'Calças',          'vest-fem-calcas',     'Calças femininas',             11, 5, true),
(115, 'Shorts/Bermudas', 'vest-fem-shorts',     'Shorts e bermudas femininas',  11, 6, true),
(116, 'Saias',           'vest-fem-saias',      'Saias femininas',              11, 7, true),
(117, 'Vestidos',        'vest-fem-vestidos',   'Vestidos femininos',           11, 8, true),
(118, 'Acessórios',      'vest-fem-acessorios', 'Acessórios femininos',         11, 9, true),
-- Vestuário Infantil
(120, 'Camisetas',       'vest-inf-camisetas',  'Camisetas infantis',           12, 1, true),
(121, 'Blusas',          'vest-inf-blusas',     'Blusas infantis',              12, 2, true),
(122, 'Jaquetas',        'vest-inf-jaquetas',   'Jaquetas infantis',            12, 3, true),
(123, 'Calças',          'vest-inf-calcas',     'Calças infantis',              12, 4, true),
(124, 'Shorts/Bermudas', 'vest-inf-shorts',     'Shorts e bermudas infantis',   12, 5, true),
(125, 'Vestidos',        'vest-inf-vestidos',   'Vestidos infantis',            12, 6, true),
(126, 'Conjuntos',       'vest-inf-conjuntos',  'Conjuntos infantis',           12, 7, true),
-- Perfumaria Masculina
(200, 'Eau de Parfum',   'perf-masc-edp',       'Eau de Parfum masculino',      20, 1, true),
(201, 'Eau de Toilette', 'perf-masc-edt',       'Eau de Toilette masculino',    20, 2, true),
(202, 'Colônias',        'perf-masc-colonias',  'Colônias masculinas',          20, 3, true),
(203, 'Kits',            'perf-masc-kits',      'Kits masculinos',              20, 4, true),
-- Perfumaria Feminina
(210, 'Eau de Parfum',   'perf-fem-edp',        'Eau de Parfum feminino',       21, 1, true),
(211, 'Eau de Toilette', 'perf-fem-edt',        'Eau de Toilette feminino',     21, 2, true),
(212, 'Colônias',        'perf-fem-colonias',   'Colônias femininas',           21, 3, true),
(213, 'Kits',            'perf-fem-kits',       'Kits femininos',               21, 4, true),
-- Perfumaria Unissex
(220, 'Eau de Parfum',   'perf-uni-edp',        'Eau de Parfum unissex',        22, 1, true),
(221, 'Eau de Toilette', 'perf-uni-edt',        'Eau de Toilette unissex',      22, 2, true),
(222, 'Colônias',        'perf-uni-colonias',   'Colônias unissex',             22, 3, true),
-- Esportivos Masculino
(300, 'Camisetas',  'esp-masc-camisetas',  'Camisetas esportivas masculinas',  30, 1, true),
(301, 'Shorts',     'esp-masc-shorts',     'Shorts esportivos masculinos',     30, 2, true),
(302, 'Calças',     'esp-masc-calcas',     'Calças esportivas masculinas',     30, 3, true),
(303, 'Tênis',      'esp-masc-tenis',      'Tênis esportivos masculinos',      30, 4, true),
(304, 'Acessórios', 'esp-masc-acessorios', 'Acessórios esportivos masculinos', 30, 5, true),
-- Esportivos Feminino
(310, 'Camisetas',  'esp-fem-camisetas',  'Camisetas esportivas femininas',   31, 1, true),
(311, 'Shorts',     'esp-fem-shorts',     'Shorts esportivos femininos',      31, 2, true),
(312, 'Calças',     'esp-fem-calcas',     'Calças esportivas femininas',      31, 3, true),
(313, 'Tênis',      'esp-fem-tenis',      'Tênis esportivos femininos',       31, 4, true),
(314, 'Acessórios', 'esp-fem-acessorios', 'Acessórios esportivos femininos',  31, 5, true),
-- Esportivos Infantil
(320, 'Camisetas',  'esp-inf-camisetas',  'Camisetas esportivas infantis',    32, 1, true),
(321, 'Shorts',     'esp-inf-shorts',     'Shorts esportivos infantis',       32, 2, true),
(322, 'Tênis',      'esp-inf-tenis',      'Tênis esportivos infantis',        32, 3, true),
(323, 'Acessórios', 'esp-inf-acessorios', 'Acessórios esportivos infantis',   32, 4, true)
ON CONFLICT (id) DO NOTHING;

-- ======================================================
-- MARCAS
-- ======================================================
INSERT INTO brands (id, name, slug, description, website_url, is_active) VALUES
(1, 'Luxury', 'luxury', 'Marca própria da loja',                 NULL,                     true),
(2, 'Chanel', 'chanel', 'Marca de luxo francesa',                'https://www.chanel.com', true),
(3, 'Dior',   'dior',   'Casa de moda francesa',                 'https://www.dior.com',   true),
(4, 'Nike',   'nike',   'Marca esportiva internacional',         'https://www.nike.com',   true)
ON CONFLICT (id) DO NOTHING;

-- ======================================================
-- PRODUTOS DE EXEMPLO
-- ======================================================
INSERT INTO products (
    id, name, slug, sku, description, short_description,
    category_id, brand_id, price, cost_price, discount_percent,
    stock_quantity, stock_status, is_active, is_featured, is_new, is_best_seller,
    sales_count, view_count, rating_avg, rating_count
) VALUES
(1, 'Camisa Social Slim', 'camisa-social-slim', 'CAM-SOC-001',
 'Camisa social slim fit de alta qualidade, perfeita para o ambiente de trabalho. Confeccionada em algodão egípcio com acabamento premium.',
 'Camisa social slim fit',
 100, 1, 199.90, 90.00, 10, 50, 'in_stock', true, true, true, false,
 15, 120, 4.5, 8),

(2, 'Perfume Chanel Nº5', 'perfume-chanel-n5', 'PER-CHA-005',
 'O clássico atemporal da Chanel. Fragrância floral aldeídica icônica, criada em 1921 e eternizada por Marilyn Monroe.',
 'Perfume clássico Chanel',
 210, 2, 899.90, 500.00, 0, 20, 'in_stock', true, true, false, true,
 42, 380, 4.9, 25),

(3, 'Tênis de Corrida Pro', 'tenis-corrida-pro', 'TEN-COR-010',
 'Tênis de corrida com amortecimento de última geração e leveza extrema. Ideal para treinos de longa distância.',
 'Tênis de corrida profissional',
 303, 4, 349.90, 180.00, 0, 30, 'in_stock', true, false, true, false,
 28, 210, 4.7, 15),

(4, 'Vestido Midi Floral', 'vestido-midi-floral', 'VES-MID-020',
 'Vestido midi com estampa floral exclusiva. Tecido leve e confortável, perfeito para o verão. Comprimento midi elegante.',
 'Vestido midi floral',
 117, 1, 259.90, 120.00, 15, 25, 'in_stock', true, true, true, false,
 12, 95, 4.6, 6),

(5, 'Jaqueta Jeans Masculina', 'jaqueta-jeans-masculina', 'JAQ-JEA-015',
 'Jaqueta jeans masculina clássica com lavagem média. Atemporal e versátil, combina com qualquer look casual.',
 'Jaqueta jeans clássica',
 103, 1, 299.90, 140.00, 0, 15, 'in_stock', true, false, false, false,
 8, 60, 4.4, 4),

(6, 'Sérum Facial Premium', 'serum-facial-premium', 'SER-FAC-099',
 'Sérum facial com vitamina C e ácido hialurônico. Revitaliza, hidrata e uniformiza o tom da pele. Uso diário.',
 'Sérum facial premium',
 21, 3, 189.90, 80.00, 20, 40, 'in_stock', true, true, false, false,
 22, 175, 4.8, 12)
ON CONFLICT (id) DO NOTHING;

-- ======================================================
-- IMAGENS DOS PRODUTOS
-- ======================================================
INSERT INTO product_images (id, product_id, image_url, alt_text, is_primary, sort_order) VALUES
-- Camisa Social Slim
(1, 1, 'https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=800', 'Camisa Social Slim - Vista frontal', true, 0),
(2, 1, 'https://images.pexels.com/photos/297933/pexels-photo-297933.jpeg?auto=compress&cs=tinysrgb&w=800', 'Camisa Social Slim - Detalhe', false, 1),
-- Perfume Chanel Nº5
(3, 2, 'https://images.pexels.com/photos/9659891/pexels-photo-9659891.jpeg?auto=compress&cs=tinysrgb&w=800', 'Perfume Chanel Nº5', true, 0),
(4, 2, 'https://images.pexels.com/photos/1961795/pexels-photo-1961795.jpeg?auto=compress&cs=tinysrgb&w=800', 'Perfume Chanel Nº5 - Frasco', false, 1),
-- Tênis de Corrida Pro
(5, 3, 'https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&w=800', 'Tênis de Corrida Pro', true, 0),
(6, 3, 'https://images.pexels.com/photos/1598505/pexels-photo-1598505.jpeg?auto=compress&cs=tinysrgb&w=800', 'Tênis de Corrida Pro - Lateral', false, 1),
-- Vestido Midi Floral
(7, 4, 'https://images.pexels.com/photos/985635/pexels-photo-985635.jpeg?auto=compress&cs=tinysrgb&w=800', 'Vestido Midi Floral', true, 0),
(8, 4, 'https://images.pexels.com/photos/1755428/pexels-photo-1755428.jpeg?auto=compress&cs=tinysrgb&w=800', 'Vestido Midi Floral - Detalhe', false, 1),
-- Jaqueta Jeans Masculina
(9, 5, 'https://images.pexels.com/photos/1183266/pexels-photo-1183266.jpeg?auto=compress&cs=tinysrgb&w=800', 'Jaqueta Jeans Masculina', true, 0),
(10, 5, 'https://images.pexels.com/photos/1040945/pexels-photo-1040945.jpeg?auto=compress&cs=tinysrgb&w=800', 'Jaqueta Jeans - Detalhe', false, 1),
-- Sérum Facial Premium
(11, 6, 'https://images.pexels.com/photos/4465124/pexels-photo-4465124.jpeg?auto=compress&cs=tinysrgb&w=800', 'Sérum Facial Premium', true, 0),
(12, 6, 'https://images.pexels.com/photos/3762879/pexels-photo-3762879.jpeg?auto=compress&cs=tinysrgb&w=800', 'Sérum Facial Premium - Aplicação', false, 1)
ON CONFLICT (id) DO NOTHING;

-- ======================================================
-- ESTOQUE INICIAL
-- ======================================================
INSERT INTO inventory (id, product_id, quantity, min_quantity, location) VALUES
(1, 1, 50, 5, 'Prateleira A-1'),
(2, 2, 20, 3, 'Prateleira B-2'),
(3, 3, 30, 5, 'Prateleira C-1'),
(4, 4, 25, 5, 'Prateleira A-3'),
(5, 5, 15, 3, 'Prateleira A-4'),
(6, 6, 40, 5, 'Prateleira B-1')
ON CONFLICT (id) DO NOTHING;

-- ======================================================
-- MOVIMENTAÇÕES DE ESTOQUE (histórico de exemplo)
-- ======================================================
-- Padrão: cada produto teve entradas e saídas ao longo do tempo
-- Como o estoque atual é 50, 20, 30, etc., vamos simular:
--   - Entrada inicial (reposição)
--   - Saídas (vendas)
--   - Ajustes ocasionais

INSERT INTO inventory_movements (
    product_id, variation_id, movement_type, quantity,
    previous_quantity, new_quantity, reason,
    reference_type, reference_id, user_id, notes, created_at
) VALUES
-- ============ PRODUTO 1: Camisa Social Slim (estoque final: 50) ============
(1, NULL, 'in',         80, 0,  80, 'Estoque inicial',       'purchase', 1001, NULL, 'Carga inicial do catálogo', NOW() - INTERVAL '30 days'),
(1, NULL, 'out',        10, 80, 70, 'Venda',                 'order',    2001, NULL, 'Pedido #2001',              NOW() - INTERVAL '25 days'),
(1, NULL, 'out',         5, 70, 65, 'Venda',                 'order',    2002, NULL, 'Pedido #2002',              NOW() - INTERVAL '20 days'),
(1, NULL, 'adjustment', 60, 65, 60, 'Ajuste de inventário',  NULL,       NULL, NULL, 'Correção após contagem',    NOW() - INTERVAL '15 days'),
(1, NULL, 'out',         8, 60, 52, 'Venda',                 'order',    2003, NULL, 'Pedido #2003',              NOW() - INTERVAL '10 days'),
(1, NULL, 'out',         2, 52, 50, 'Venda',                 'order',    2004, NULL, 'Pedido #2004',              NOW() - INTERVAL '5 days'),

-- ============ PRODUTO 2: Perfume Chanel Nº5 (estoque final: 20) ============
(2, NULL, 'in',         30, 0,  30, 'Estoque inicial',       'purchase', 1002, NULL, 'Importação direta',         NOW() - INTERVAL '28 days'),
(2, NULL, 'out',         3, 30, 27, 'Venda',                 'order',    2010, NULL, 'Pedido #2010',              NOW() - INTERVAL '22 days'),
(2, NULL, 'out',         2, 27, 25, 'Venda',                 'order',    2011, NULL, 'Pedido #2011',              NOW() - INTERVAL '18 days'),
(2, NULL, 'out',         5, 25, 20, 'Venda',                 'order',    2012, NULL, 'Pedido #2012',              NOW() - INTERVAL '12 days'),

-- ============ PRODUTO 3: Tênis de Corrida Pro (estoque final: 30) ============
(3, NULL, 'in',         40, 0,  40, 'Estoque inicial',       'purchase', 1003, NULL, 'Compra fornecedor Nike',    NOW() - INTERVAL '27 days'),
(3, NULL, 'out',         4, 40, 36, 'Venda',                 'order',    2020, NULL, 'Pedido #2020',              NOW() - INTERVAL '24 days'),
(3, NULL, 'out',         3, 36, 33, 'Venda',                 'order',    2021, NULL, 'Pedido #2021',              NOW() - INTERVAL '16 days'),
(3, NULL, 'out',         3, 33, 30, 'Venda',                 'order',    2022, NULL, 'Pedido #2022',              NOW() - INTERVAL '8 days'),

-- ============ PRODUTO 4: Vestido Midi Floral (estoque final: 25) ============
(4, NULL, 'in',         20, 0,  20, 'Estoque inicial',       'purchase', 1004, NULL, 'Coleção verão',             NOW() - INTERVAL '26 days'),
(4, NULL, 'in',         10, 20, 30, 'Reposição',             'purchase', 1005, NULL, 'Alta demanda',              NOW() - INTERVAL '15 days'),
(4, NULL, 'out',         3, 30, 27, 'Venda',                 'order',    2030, NULL, 'Pedido #2030',              NOW() - INTERVAL '10 days'),
(4, NULL, 'out',         2, 27, 25, 'Venda',                 'order',    2031, NULL, 'Pedido #2031',              NOW() - INTERVAL '4 days'),

-- ============ PRODUTO 5: Jaqueta Jeans Masculina (estoque final: 15) ============
(5, NULL, 'in',         25, 0,  25, 'Estoque inicial',       'purchase', 1006, NULL, 'Coleção inverno',           NOW() - INTERVAL '25 days'),
(5, NULL, 'out',         5, 25, 20, 'Venda',                 'order',    2040, NULL, 'Pedido #2040',              NOW() - INTERVAL '18 days'),
(5, NULL, 'out',         3, 20, 17, 'Venda',                 'order',    2041, NULL, 'Pedido #2041',              NOW() - INTERVAL '12 days'),
(5, NULL, 'adjustment', 15, 17, 15, 'Ajuste de inventário',  NULL,       NULL, NULL, 'Correção após contagem',    NOW() - INTERVAL '6 days'),

-- ============ PRODUTO 6: Sérum Facial Premium (estoque final: 40) ============
(6, NULL, 'in',         50, 0,  50, 'Estoque inicial',       'purchase', 1007, NULL, 'Compra fornecedor Dior',    NOW() - INTERVAL '24 days'),
(6, NULL, 'out',         5, 50, 45, 'Venda',                 'order',    2050, NULL, 'Pedido #2050',              NOW() - INTERVAL '20 days'),
(6, NULL, 'out',         3, 45, 42, 'Venda',                 'order',    2051, NULL, 'Pedido #2051',              NOW() - INTERVAL '15 days'),
(6, NULL, 'out',         2, 42, 40, 'Venda',                 'order',    2052, NULL, 'Pedido #2052',              NOW() - INTERVAL '7 days');

-- ======================================================
-- PROMOÇÕES DE EXEMPLO
-- ======================================================
INSERT INTO promotions (
    id, name, description, code, discount_type, discount_value,
    min_purchase, usage_limit, user_limit, start_date, end_date,
    is_active, applies_to_all
) VALUES
(1, 'Primeira Compra 10% OFF', 'Ganhe 10% de desconto na sua primeira compra!',
 'PRIMEIRA10', 'percentage', 10, 100, 1000, 1,
 '2025-01-01 00:00:00', '2026-12-31 23:59:59', true, true),

(2, 'Frete Grátis acima de R$99', 'Frete grátis para compras acima de R$99,90!',
 'FRETE99', 'fixed', 25, 99.90, 5000, 1,
 '2025-01-01 00:00:00', '2026-12-31 23:59:59', true, true),

(3, 'Esportivos 20% OFF', 'Ganhe 20% de desconto em artigos esportivos!',
 'ESPORTE20', 'percentage', 20, 200, 500, 1,
 '2025-01-01 00:00:00', '2026-12-31 23:59:59', true, true)
ON CONFLICT (id) DO NOTHING;

-- ======================================================
-- AJUSTE DAS SEQUENCES
-- ======================================================
SELECT setval('categories_id_seq',        (SELECT MAX(id) FROM categories));
SELECT setval('brands_id_seq',            (SELECT MAX(id) FROM brands));
SELECT setval('products_id_seq',          (SELECT MAX(id) FROM products));
SELECT setval('product_images_id_seq',    (SELECT MAX(id) FROM product_images));
SELECT setval('inventory_id_seq',         (SELECT MAX(id) FROM inventory));
SELECT setval('inventory_movements_id_seq', (SELECT MAX(id) FROM inventory_movements));
SELECT setval('promotions_id_seq',        (SELECT MAX(id) FROM promotions));

-- ======================================================
-- MENSAGEM FINAL
-- ======================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Seeds aplicados com sucesso!';
    RAISE NOTICE '   Categorias:  %', (SELECT COUNT(*) FROM categories);
    RAISE NOTICE '   Marcas:      %', (SELECT COUNT(*) FROM brands);
    RAISE NOTICE '   Produtos:    %', (SELECT COUNT(*) FROM products);
    RAISE NOTICE '   Imagens:     %', (SELECT COUNT(*) FROM product_images);
    RAISE NOTICE '   Estoque:     %', (SELECT COUNT(*) FROM inventory);
    RAISE NOTICE '   Movimentos:  %', (SELECT COUNT(*) FROM inventory_movements);
    RAISE NOTICE '   Promoções:   %', (SELECT COUNT(*) FROM promotions);
END $$;