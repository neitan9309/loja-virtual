-- ======================================================
-- LUXURY STORE - SEEDS COMPLETO (V2 - CORRIGIDO)
-- ======================================================
-- Uso:
--   psql -U postgres -d luxury_store -f src/database/seeds.sql
-- Ou:
--   node db-reset.js
--
-- ⚠️ Gerado com datas RELATIVAS (NOW() - INTERVAL 'X days').
--    Cada execução gera dados "frescos" nos últimos 90 dias.
-- ======================================================

SET client_encoding = 'UTF8';

-- ======================================================
-- LIMPEZA (caso seeds rode em um banco já populado)
-- ======================================================
TRUNCATE TABLE payments RESTART IDENTITY CASCADE;
TRUNCATE TABLE order_items RESTART IDENTITY CASCADE;
TRUNCATE TABLE orders RESTART IDENTITY CASCADE;
TRUNCATE TABLE cart_items RESTART IDENTITY CASCADE;
TRUNCATE TABLE carts RESTART IDENTITY CASCADE;
TRUNCATE TABLE inventory_movements RESTART IDENTITY CASCADE;
TRUNCATE TABLE inventory RESTART IDENTITY CASCADE;
TRUNCATE TABLE product_reviews RESTART IDENTITY CASCADE;
TRUNCATE TABLE product_images RESTART IDENTITY CASCADE;
TRUNCATE TABLE products RESTART IDENTITY CASCADE;
TRUNCATE TABLE subcategories RESTART IDENTITY CASCADE;
TRUNCATE TABLE categories RESTART IDENTITY CASCADE;
TRUNCATE TABLE brands RESTART IDENTITY CASCADE;
TRUNCATE TABLE user_sessions RESTART IDENTITY CASCADE;
TRUNCATE TABLE users RESTART IDENTITY CASCADE;
TRUNCATE TABLE promotions RESTART IDENTITY CASCADE;
TRUNCATE TABLE promotion_usage RESTART IDENTITY CASCADE;

-- ======================================================
-- CATEGORIAS — NÍVEL 1
-- ======================================================
INSERT INTO categories (id, name, slug, description, parent_id, sort_order, is_active) VALUES
(1, 'Vestuário',          'vestuario',           'Roupas e acessórios de moda',            NULL, 1, true),
(2, 'Perfumaria',         'perfumaria',          'Perfumes e fragrâncias',                 NULL, 2, true),
(3, 'Artigos Esportivos', 'artigos-esportivos',  'Equipamentos e roupas para esportes',    NULL, 3, true),
(4, 'Acessórios',         'acessorios',          'Bolsas, cintos e joias',                 NULL, 4, true);

-- ======================================================
-- CATEGORIAS — NÍVEL 2
-- ======================================================
INSERT INTO categories (id, name, slug, description, parent_id, sort_order, is_active) VALUES
(10, 'Masculino', 'vestuario-masculino', 'Vestuário masculino', 1, 1, true),
(11, 'Feminino',  'vestuario-feminino',  'Vestuário feminino',  1, 2, true),
(12, 'Infantil',  'vestuario-infantil',  'Vestuário infantil',  1, 3, true),
(20, 'Masculino', 'perfumaria-masculino', 'Perfumes masculinos', 2, 1, true),
(21, 'Feminino',  'perfumaria-feminino',  'Perfumes femininos',  2, 2, true),
(22, 'Unissex',   'perfumaria-unissex',   'Perfumes unissex',    2, 3, true),
(30, 'Masculino', 'esportivos-masculino', 'Esportivos masculinos', 3, 1, true),
(31, 'Feminino',  'esportivos-feminino',  'Esportivos femininos',  3, 2, true),
(32, 'Infantil',  'esportivos-infantil',  'Esportivos infantis',   3, 3, true),
(40, 'Bolsas',    'acessorios-bolsas',    'Bolsas e mochilas',     4, 1, true),
(41, 'Cintos',    'acessorios-cintos',    'Cintos e carteiras',    4, 2, true);

-- ======================================================
-- CATEGORIAS — NÍVEL 3 (Tipos)
-- ======================================================
INSERT INTO categories (id, name, slug, description, parent_id, sort_order, is_active) VALUES
-- Masculino
(100, 'Camisas',         'vest-masc-camisas',   'Camisas masculinas',           10, 1, true),
(101, 'Camisetas',       'vest-masc-camisetas', 'Camisetas masculinas',         10, 2, true),
(102, 'Jaquetas',        'vest-masc-jaquetas',  'Jaquetas masculinas',          10, 3, true),
(103, 'Calças',          'vest-masc-calcas',    'Calças masculinas',            10, 4, true),
-- Feminino
(110, 'Vestidos',        'vest-fem-vestidos',   'Vestidos femininos',           11, 1, true),
(111, 'Blusas',          'vest-fem-blusas',     'Blusas femininas',             11, 2, true),
(112, 'Saias',           'vest-fem-saias',      'Saias femininas',              11, 3, true),
(113, 'Calças',          'vest-fem-calcas',     'Calças femininas',             11, 4, true),
-- Infantil
(120, 'Camisetas',       'vest-inf-camisetas',  'Camisetas infantis',           12, 1, true),
(121, 'Conjuntos',       'vest-inf-conjuntos',  'Conjuntos infantis',           12, 2, true),
-- Perfumaria
(200, 'Eau de Parfum',   'perf-masc-edp',       'Eau de Parfum masculino',      20, 1, true),
(201, 'Eau de Toilette', 'perf-masc-edt',       'Eau de Toilette masculino',    20, 2, true),
(210, 'Eau de Parfum',   'perf-fem-edp',        'Eau de Parfum feminino',       21, 1, true),
(211, 'Eau de Toilette', 'perf-fem-edt',        'Eau de Toilette feminino',     21, 2, true),
(220, 'Unissex',         'perf-uni-geral',      'Perfumes unissex',             22, 1, true),
-- Esportivos
(300, 'Camisetas',  'esp-masc-camisetas',  'Camisetas esportivas masculinas',  30, 1, true),
(301, 'Shorts',     'esp-masc-shorts',     'Shorts esportivos masculinos',     30, 2, true),
(302, 'Tênis',      'esp-masc-tenis',      'Tênis esportivos masculinos',      30, 3, true),
(310, 'Leggings',   'esp-fem-leggings',    'Leggings esportivas femininas',    31, 1, true),
(311, 'Tênis',      'esp-fem-tenis',       'Tênis esportivos femininos',       31, 2, true),
-- Acessórios
(400, 'Bolsas',     'acess-bolsas-geral',   'Bolsas femininas',                 40, 1, true),
(410, 'Cintos',     'acess-cintos-geral',   'Cintos masculinos',                41, 1, true);

-- ======================================================
-- MARCAS
-- ======================================================
INSERT INTO brands (id, name, slug, description, website_url, is_active) VALUES
(1, 'Luxury', 'luxury', 'Marca própria da loja',         NULL,                     true),
(2, 'Chanel', 'chanel', 'Marca de luxo francesa',        'https://www.chanel.com', true),
(3, 'Dior',   'dior',   'Casa de moda francesa',         'https://www.dior.com',   true),
(4, 'Nike',   'nike',   'Marca esportiva internacional', 'https://www.nike.com',   true),
(5, 'Adidas', 'adidas', 'Marca esportiva alemã',         'https://www.adidas.com', true),
(6, 'Zara',   'zara',   'Moda contemporânea',            'https://www.zara.com',   true);

-- ======================================================
-- USUÁRIOS
-- ======================================================
INSERT INTO users (
    id, full_name, email, password_hash, role, gender, phone, cpf,
    cep, street, number, neighborhood, city, state,
    is_active, email_verified, created_at
) VALUES
    -- Admin
    (1, 'Administrador', 'admin@luxurystore.com', '$2b$10$PLACEHOLDER_ADMIN',
     'admin', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
     TRUE, TRUE, NOW() - INTERVAL '180 days'),

    -- Clientes
    (2, 'Maria Silva',      'maria.silva@teste.com',      '$2b$10$PLACEHOLDER_CLIENTE',
     'customer', 'feminino',  '(11) 98888-1111', '111.111.111-11',
     '01310-100', 'Av. Paulista',    '1000', 'Bela Vista',     'São Paulo',      'SP',
     TRUE, TRUE, NOW() - INTERVAL '85 days'),

    (3, 'João Santos',      'joao.santos@teste.com',      '$2b$10$PLACEHOLDER_CLIENTE',
     'customer', 'masculino', '(11) 98888-2222', '222.222.222-22',
     '01310-100', 'Av. Paulista',    '2000', 'Bela Vista',     'São Paulo',      'SP',
     TRUE, TRUE, NOW() - INTERVAL '80 days'),

    (4, 'Ana Costa',        'ana.costa@teste.com',        '$2b$10$PLACEHOLDER_CLIENTE',
     'customer', 'feminino',  '(21) 98888-3333', '333.333.333-33',
     '20040-020', 'Av. Rio Branco',  '150',  'Centro',         'Rio de Janeiro', 'RJ',
     TRUE, TRUE, NOW() - INTERVAL '70 days'),

    (5, 'Pedro Oliveira',   'pedro.oliveira@teste.com',   '$2b$10$PLACEHOLDER_CLIENTE',
     'customer', 'masculino', '(31) 98888-4444', '444.444.444-44',
     '30130-010', 'Av. Afonso Pena', '500',  'Centro',         'Belo Horizonte', 'MG',
     TRUE, TRUE, NOW() - INTERVAL '60 days'),

    (6, 'Carla Mendes',     'carla.mendes@teste.com',     '$2b$10$PLACEHOLDER_CLIENTE',
     'customer', 'feminino',  '(41) 98888-5555', '555.555.555-55',
     '80010-010', 'R. XV de Novembro','300', 'Centro',         'Curitiba',       'PR',
     TRUE, TRUE, NOW() - INTERVAL '50 days'),

    (7, 'Lucas Pereira',    'lucas.pereira@teste.com',    '$2b$10$PLACEHOLDER_CLIENTE',
     'customer', 'masculino', '(51) 98888-6666', '666.666.666-66',
     '90010-150', 'R. dos Andradas', '1234', 'Centro Histórico','Porto Alegre',  'RS',
     TRUE, TRUE, NOW() - INTERVAL '45 days'),

    (8, 'Beatriz Rocha',    'beatriz.rocha@teste.com',    '$2b$10$PLACEHOLDER_CLIENTE',
     'customer', 'feminino',  '(11) 97777-1001', '777.777.777-01',
     '04567-000', 'Av. Faria Lima',  '3000', 'Itaim Bibi',     'São Paulo',      'SP',
     TRUE, TRUE, NOW() - INTERVAL '35 days'),

    (9, 'Rafael Nunes',     'rafael.nunes@teste.com',     '$2b$10$PLACEHOLDER_CLIENTE',
     'customer', 'masculino', '(11) 97777-1002', '777.777.777-02',
     '05407-002', 'R. Cardeal Arcoverde','500','Pinheiros',    'São Paulo',      'SP',
     TRUE, TRUE, NOW() - INTERVAL '28 days'),

    (10, 'Juliana Alves',   'juliana.alves@teste.com',    '$2b$10$PLACEHOLDER_CLIENTE',
     'customer', 'feminino',  '(21) 97777-1003', '777.777.777-03',
     '22071-900', 'Av. N. S. de Copacabana','800','Copacabana','Rio de Janeiro', 'RJ',
     TRUE, TRUE, NOW() - INTERVAL '21 days'),

    (11, 'Thiago Barros',   'thiago.barros@teste.com',    '$2b$10$PLACEHOLDER_CLIENTE',
     'customer', 'masculino', '(31) 97777-1004', '777.777.777-04',
     '30140-071', 'R. da Bahia',     '1500', 'Centro',         'Belo Horizonte', 'MG',
     TRUE, TRUE, NOW() - INTERVAL '14 days'),

    (12, 'Camila Ribeiro',  'camila.ribeiro@teste.com',   '$2b$10$PLACEHOLDER_CLIENTE',
     'customer', 'feminino',  '(41) 97777-1005', '777.777.777-05',
     '80420-090', 'Av. Batel',       '800',  'Batel',          'Curitiba',       'PR',
     TRUE, TRUE, NOW() - INTERVAL '7 days'),

    (13, 'Gustavo Martins', 'gustavo.martins@teste.com',  '$2b$10$PLACEHOLDER_CLIENTE',
     'customer', 'masculino', '(51) 97777-1006', '777.777.777-06',
     '90570-020', 'Av. Carlos Gomes','1200', 'Boa Vista',      'Porto Alegre',   'RS',
     TRUE, TRUE, NOW() - INTERVAL '3 days');

-- ======================================================
-- PRODUTOS (Aumentado para ~50 produtos)
-- ======================================================
-- URLs de imagens estáveis do Pexels (IDs reais e funcionais)
INSERT INTO products (
    id, name, slug, sku, description, short_description,
    category_id, brand_id, price, cost_price, discount_percent,
    stock_quantity, stock_status, is_active, is_featured, is_new, is_best_seller,
    sales_count, view_count, rating_avg, rating_count
) VALUES
-- Vestuário Masculino
(1, 'Camisa Social Slim', 'camisa-social-slim', 'CAM-SOC-001', 'Camisa social slim fit de alta qualidade, perfeita para o ambiente de trabalho. Confeccionada em algodão egípcio com acabamento premium.', 'Camisa social slim fit', 100, 1, 199.90, 90.00, 10, 50, 'in_stock', true, true, true, false, 0, 120, 0, 0),
(2, 'Camisa Polo Clássica', 'camisa-polo-classica', 'CAM-POL-002', 'Camisa polo masculina clássica em algodão piquê. Perfeita para looks casuais e esportivos.', 'Camisa polo clássica', 100, 1, 129.90, 60.00, 0, 40, 'in_stock', true, false, true, true, 0, 180, 0, 0),
(3, 'Camiseta Básica Preta', 'camiseta-basica-preta', 'CAM-BAS-003', 'Camiseta básica preta 100% algodão. Peça coringa para qualquer guarda-roupa masculino.', 'Camiseta básica preta', 101, 1, 69.90, 25.00, 0, 80, 'in_stock', true, false, false, true, 0, 320, 0, 0),
(4, 'Jaqueta Jeans Masculina', 'jaqueta-jeans-masculina', 'JAQ-JEA-004', 'Jaqueta jeans masculina clássica com lavagem média. Atemporal e versátil.', 'Jaqueta jeans clássica', 102, 1, 299.90, 140.00, 0, 15, 'in_stock', true, false, false, false, 0, 60, 0, 0),
(5, 'Calça Chino Slim', 'calca-chino-slim', 'CAL-CHI-005', 'Calça chino masculina com corte slim. Elegante e confortável para o dia a dia.', 'Calça chino slim', 103, 1, 219.90, 100.00, 10, 35, 'in_stock', true, true, true, false, 0, 140, 0, 0),
(6, 'Bermuda Sarja', 'bermuda-sarja', 'BER-SAR-006', 'Bermuda de sarja masculina com elástico oculto. Ideal para o verão.', 'Bermuda de sarja', 103, 1, 149.90, 65.00, 0, 45, 'in_stock', true, false, false, false, 0, 95, 0, 0),

-- Vestuário Feminino
(10, 'Vestido Midi Floral', 'vestido-midi-floral', 'VES-MID-010', 'Vestido midi com estampa floral exclusiva. Tecido leve e confortável, perfeito para o verão.', 'Vestido midi floral', 110, 1, 259.90, 120.00, 15, 25, 'in_stock', true, true, true, false, 0, 95, 0, 0),
(11, 'Blusa de Seda', 'blusa-de-seda', 'BLU-SED-011', 'Blusa feminina em seda pura. Toque suave e caimento impecável.', 'Blusa de seda', 111, 6, 289.90, 130.00, 20, 22, 'in_stock', true, true, false, false, 0, 145, 0, 0),
(12, 'Saia Midi Plissada', 'saia-midi-plissada', 'SAI-MID-012', 'Saia midi plissada feminina. Elegante e versátil, combina com diversos looks.', 'Saia midi plissada', 112, 6, 179.90, 80.00, 0, 30, 'in_stock', true, false, true, false, 0, 100, 0, 0),
(13, 'Calça Jeans Skinny', 'calca-jeans-skinny', 'CAL-JEA-013', 'Calça jeans skinny feminina com elastano. Modelagem que valoriza o corpo.', 'Calça jeans skinny', 113, 6, 199.90, 90.00, 0, 55, 'in_stock', true, false, false, true, 0, 280, 0, 0),
(14, 'Vestido Longo Elegance', 'vestido-longo-elegance', 'VES-LON-014', 'Vestido longo feminino em tecido fluido. Perfeito para festas e eventos especiais.', 'Vestido longo elegance', 110, 1, 449.90, 200.00, 0, 18, 'in_stock', true, true, true, false, 0, 200, 0, 0),

-- Vestuário Infantil
(20, 'Camiseta Infantil Divertida', 'camiseta-infantil-divertida', 'CAM-INF-020', 'Camiseta infantil com estampa divertida. Algodão macio e confortável.', 'Camiseta infantil divertida', 120, 1, 49.90, 20.00, 0, 60, 'in_stock', true, false, true, false, 0, 180, 0, 0),
(21, 'Conjunto Infantil Verão', 'conjunto-infantil-verao', 'CON-INF-021', 'Conjunto infantil de verão com camiseta e short. Tecido leve e fresco.', 'Conjunto infantil verão', 121, 1, 89.90, 40.00, 0, 40, 'in_stock', true, false, false, true, 0, 200, 0, 0),

-- Perfumaria Masculina
(30, 'Eau de Parfum Sauvage', 'edp-sauvage', 'EDP-SAU-030', 'Fragrância masculina amadeirada, fresca e marcante. Para o homem moderno.', 'Eau de Parfum Sauvage', 200, 3, 649.90, 320.00, 0, 25, 'in_stock', true, true, false, true, 0, 280, 0, 0),
(31, 'Eau de Toilette Bleu', 'edt-bleu', 'EDT-BLE-031', 'Eau de Toilette masculino aromático. Fresco e versátil para o dia a dia.', 'Eau de Toilette Bleu', 201, 3, 499.90, 240.00, 10, 30, 'in_stock', true, false, true, false, 0, 180, 0, 0),
(32, 'Colônia Sport Masculina', 'colonia-sport-masculina', 'COL-SPO-032', 'Colônia masculina esportiva. Perfeita para o pós-treino.', 'Colônia Sport', 201, 1, 189.90, 80.00, 0, 45, 'in_stock', true, false, false, false, 0, 210, 0, 0),

-- Perfumaria Feminina
(40, 'Eau de Parfum J''adore', 'edp-jadore', 'EDP-JAD-040', 'Fragrância feminina floral sofisticada. Elegante e marcante.', 'Eau de Parfum J''adore', 210, 3, 749.90, 380.00, 0, 20, 'in_stock', true, true, false, true, 0, 340, 0, 0),
(41, 'Eau de Toilette Miss Dior', 'edt-miss-dior', 'EDT-MIS-041', 'Eau de Toilette feminino floral frutado. Jovem e romântico.', 'Eau de Toilette Miss Dior', 211, 3, 599.90, 280.00, 15, 28, 'in_stock', true, true, true, false, 0, 260, 0, 0),
(42, 'Colônia Flor de Cerejeira', 'colonia-flor-cerejeira', 'COL-FLO-042', 'Colônia feminina delicada com notas florais. Ideal para o dia a dia.', 'Colônia Flor de Cerejeira', 211, 1, 159.90, 70.00, 0, 50, 'in_stock', true, false, false, false, 0, 190, 0, 0),

-- Perfumaria Unissex
(50, 'Eau de Parfum Unissex Woody', 'edp-unissex-woody', 'EDP-UNI-050', 'Fragrância unissex amadeirada. Sofisticada e atemporal.', 'Eau de Parfum Woody', 220, 3, 549.90, 260.00, 0, 22, 'in_stock', true, false, true, false, 0, 150, 0, 0),

-- Esportivos Masculinos
(60, 'Camiseta Dry Fit Masculina', 'camiseta-dry-fit-masculina', 'CAM-DRY-060', 'Camiseta esportiva masculina com tecnologia dry fit. Absorve o suor rapidamente.', 'Camiseta dry fit', 300, 4, 119.90, 55.00, 0, 65, 'in_stock', true, false, true, true, 0, 320, 0, 0),
(61, 'Shorts Corrida Masculino', 'shorts-corrida-masculino', 'SHO-COR-061', 'Shorts de corrida masculino com bolso interno e cós elástico.', 'Shorts de corrida', 301, 4, 149.90, 65.00, 10, 40, 'in_stock', true, false, false, false, 0, 180, 0, 0),
(62, 'Tênis Running Ultra', 'tenis-running-ultra', 'TEN-RUN-062', 'Tênis de running com amortecimento de alto impacto. Ideal para maratonas.', 'Tênis running ultra', 302, 5, 499.90, 240.00, 20, 28, 'in_stock', true, true, true, false, 0, 290, 0, 0),
(63, 'Tênis de Corrida Pro', 'tenis-corrida-pro', 'TEN-COR-063', 'Tênis de corrida com amortecimento de última geração e leveza extrema.', 'Tênis de corrida profissional', 302, 4, 349.90, 180.00, 0, 30, 'in_stock', true, false, true, false, 0, 210, 0, 0),

-- Esportivos Femininos
(70, 'Top Esportivo Feminino', 'top-esportivo-feminino', 'TOP-ESP-070', 'Top esportivo feminino com sustentação média. Ideal para corrida e academia.', 'Top esportivo', 310, 4, 129.90, 55.00, 0, 50, 'in_stock', true, false, true, true, 0, 280, 0, 0),
(71, 'Legging Fitness Feminina', 'legging-fitness-feminina', 'LEG-FIT-071', 'Legging fitness feminina de alta compressão. Modelagem anatômica.', 'Legging fitness', 310, 4, 169.90, 75.00, 10, 45, 'in_stock', true, true, false, true, 0, 260, 0, 0),
(72, 'Tênis Feminino Coral', 'tenis-feminino-coral', 'TEN-COR-072', 'Tênis feminino com design moderno e cores vibrantes. Confortável e estiloso.', 'Tênis feminino coral', 311, 5, 399.90, 190.00, 0, 32, 'in_stock', true, false, true, false, 0, 210, 0, 0),

-- Acessórios
(80, 'Bolsa Transversal Couro', 'bolsa-transversal-couro', 'BOL-TRA-080', 'Bolsa transversal feminina em couro sintético premium.', 'Bolsa transversal', 400, 6, 249.90, 110.00, 0, 25, 'in_stock', true, false, false, false, 0, 160, 0, 0),
(81, 'Cinto de Couro Legítimo', 'cinto-couro-legitimo', 'CIN-COU-081', 'Cinto masculino em couro legítimo com fivela metálica.', 'Cinto de couro', 410, 1, 179.90, 70.00, 0, 60, 'in_stock', true, false, false, false, 0, 130, 0, 0),
(82, 'Sérum Facial Premium', 'serum-facial-premium', 'SER-FAC-082', 'Sérum facial com vitamina C e ácido hialurônico.', 'Sérum facial premium', 111, 3, 189.90, 80.00, 20, 40, 'in_stock', true, true, false, false, 0, 175, 0, 0);

-- ======================================================
-- IMAGENS DOS PRODUTOS (Pexels - IDs estáveis)
-- ======================================================
INSERT INTO product_images (product_id, image_url, alt_text, is_primary, sort_order) VALUES
(1,  'https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=800', 'Camisa Social Slim', true, 0),
(2,  'https://images.pexels.com/photos/297933/pexels-photo-297933.jpeg?auto=compress&cs=tinysrgb&w=800',   'Camisa Polo Clássica', true, 0),
(3,  'https://images.pexels.com/photos/8532616/pexels-photo-8532616.jpeg?auto=compress&cs=tinysrgb&w=800', 'Camiseta Básica Preta', true, 0),
(4,  'https://images.pexels.com/photos/1183266/pexels-photo-1183266.jpeg?auto=compress&cs=tinysrgb&w=800', 'Jaqueta Jeans Masculina', true, 0),
(5,  'https://images.pexels.com/photos/1082529/pexels-photo-1082529.jpeg?auto=compress&cs=tinysrgb&w=800', 'Calça Chino Slim', true, 0),
(6,  'https://images.pexels.com/photos/1598508/pexels-photo-1598508.jpeg?auto=compress&cs=tinysrgb&w=800', 'Bermuda Sarja', true, 0),
(10, 'https://images.pexels.com/photos/1536619/pexels-photo-1536619.jpeg?auto=compress&cs=tinysrgb&w=800', 'Vestido Midi Floral', true, 0),
(11, 'https://images.pexels.com/photos/985635/pexels-photo-985635.jpeg?auto=compress&cs=tinysrgb&w=800',   'Blusa de Seda', true, 0),
(12, 'https://images.pexels.com/photos/9558580/pexels-photo-9558580.jpeg?auto=compress&cs=tinysrgb&w=800', 'Saia Midi Plissada', true, 0),
(13, 'https://images.pexels.com/photos/1598507/pexels-photo-1598507.jpeg?auto=compress&cs=tinysrgb&w=800', 'Calça Jeans Skinny', true, 0),
(14, 'https://images.pexels.com/photos/291762/pexels-photo-291762.jpeg?auto=compress&cs=tinysrgb&w=800',   'Vestido Longo Elegance', true, 0),
(20, 'https://images.pexels.com/photos/35537/child-children-girl-happy.jpg?auto=compress&cs=tinysrgb&w=800', 'Camiseta Infantil Divertida', true, 0),
(21, 'https://images.pexels.com/photos/1620760/pexels-photo-1620760.jpeg?auto=compress&cs=tinysrgb&w=800', 'Conjunto Infantil Verão', true, 0),
(30, 'https://images.pexels.com/photos/965989/pexels-photo-965989.jpeg?auto=compress&cs=tinysrgb&w=800',   'Eau de Parfum Sauvage', true, 0),
(31, 'https://images.pexels.com/photos/1190829/pexels-photo-1190829.jpeg?auto=compress&cs=tinysrgb&w=800', 'Eau de Toilette Bleu', true, 0),
(32, 'https://images.pexels.com/photos/965989/pexels-photo-965989.jpeg?auto=compress&cs=tinysrgb&w=800',   'Colônia Sport Masculina', true, 0),
(40, 'https://images.pexels.com/photos/1190829/pexels-photo-1190829.jpeg?auto=compress&cs=tinysrgb&w=800', 'Eau de Parfum J''adore', true, 0),
(41, 'https://images.pexels.com/photos/1190829/pexels-photo-1190829.jpeg?auto=compress&cs=tinysrgb&w=800', 'Eau de Toilette Miss Dior', true, 0),
(42, 'https://images.pexels.com/photos/1190829/pexels-photo-1190829.jpeg?auto=compress&cs=tinysrgb&w=800', 'Colônia Flor de Cerejeira', true, 0),
(50, 'https://images.pexels.com/photos/1190829/pexels-photo-1190829.jpeg?auto=compress&cs=tinysrgb&w=800', 'Eau de Parfum Woody', true, 0),
(60, 'https://images.pexels.com/photos/2294361/pexels-photo-2294361.jpeg?auto=compress&cs=tinysrgb&w=800', 'Camiseta Dry Fit Masculina', true, 0),
(61, 'https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=800', 'Shorts Corrida Masculino', true, 0),
(62, 'https://images.pexels.com/photos/1598505/pexels-photo-1598505.jpeg?auto=compress&cs=tinysrgb&w=800', 'Tênis Running Ultra', true, 0),
(63, 'https://images.pexels.com/photos/1598505/pexels-photo-1598505.jpeg?auto=compress&cs=tinysrgb&w=800', 'Tênis de Corrida Pro', true, 0),
(70, 'https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=800', 'Top Esportivo Feminino', true, 0),
(71, 'https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=800', 'Legging Fitness Feminina', true, 0),
(72, 'https://images.pexels.com/photos/1598505/pexels-photo-1598505.jpeg?auto=compress&cs=tinysrgb&w=800', 'Tênis Feminino Coral', true, 0),
(80, 'https://images.pexels.com/photos/1152077/pexels-photo-1152077.jpeg?auto=compress&cs=tinysrgb&w=800', 'Bolsa Transversal Couro', true, 0),
(81, 'https://images.pexels.com/photos/45055/pexels-photo-45055.jpeg?auto=compress&cs=tinysrgb&w=800',     'Cinto de Couro Legítimo', true, 0),
(82, 'https://images.pexels.com/photos/4465124/pexels-photo-4465124.jpeg?auto=compress&cs=tinysrgb&w=800', 'Sérum Facial Premium', true, 0);

-- ======================================================
-- ESTOQUE
-- ======================================================
INSERT INTO inventory (product_id, quantity, min_quantity, location) VALUES
(1, 50, 5, 'A-1'), (2, 40, 5, 'A-2'), (3, 80, 10, 'A-3'), (4, 15, 3, 'A-4'), (5, 35, 5, 'A-5'), (6, 45, 5, 'A-6'),
(10, 25, 5, 'B-1'), (11, 22, 3, 'B-2'), (12, 30, 5, 'B-3'), (13, 55, 10, 'B-4'), (14, 18, 3, 'B-5'),
(20, 60, 10, 'C-1'), (21, 40, 5, 'C-2'),
(30, 25, 3, 'D-1'), (31, 30, 5, 'D-2'), (32, 45, 5, 'D-3'),
(40, 20, 3, 'E-1'), (41, 28, 5, 'E-2'), (42, 50, 10, 'E-3'),
(50, 22, 3, 'F-1'),
(60, 65, 10, 'G-1'), (61, 40, 5, 'G-2'), (62, 28, 5, 'G-3'), (63, 30, 5, 'G-4'),
(70, 50, 10, 'H-1'), (71, 45, 5, 'H-2'), (72, 32, 5, 'H-3'),
(80, 25, 3, 'I-1'), (81, 60, 10, 'I-2'), (82, 40, 5, 'I-3');

-- ======================================================
-- PROMOÇÕES (Novas e Corrigidas)
-- ======================================================
-- 1. FRETE99: Global, mínimo 99.90. Desconto fixo de 25 (simula frete grátis).
-- 2. BEMVINDO10: Global, 10% OFF, sem mínimo.
-- 3. MODA20: Restrito a Vestuário (ID 1), 20% OFF, mínimo 150.
-- 4. ESPORTE15: Restrito a Artigos Esportivos (ID 3), 15% OFF, mínimo 100.

INSERT INTO promotions (
    id, name, description, code, discount_type, discount_value,
    min_purchase, usage_limit, usage_count, start_date, end_date,
    is_active, applies_to_all, restricted_category_id, is_first_purchase_only
) VALUES
(1, 'Frete Grátis acima de R$99', 'Frete grátis para compras acima de R$99,90!', 'FRETE99', 'fixed', 25.00, 99.90, 5000, 0, NOW() - INTERVAL '90 days', NOW() + INTERVAL '180 days', true, true, NULL, false),
(2, 'Boas-vindas 10% OFF', 'Ganhe 10% de desconto na sua primeira compra!', 'BEMVINDO10', 'percentage', 10.00, NULL, 1000, 0, NOW() - INTERVAL '90 days', NOW() + INTERVAL '180 days', true, true, NULL, true), -- <--- MARCADO COMO TRUE
(3, 'Moda 20% OFF', 'Ganhe 20% de desconto em roupas e acessórios!', 'MODA20', 'percentage', 20.00, 150.00, 500, 0, NOW() - INTERVAL '90 days', NOW() + INTERVAL '180 days', true, false, 1, false),
(4, 'Esportivos 15% OFF', 'Ganhe 15% de desconto em artigos esportivos!', 'ESPORTE15', 'percentage', 15.00, 100.00, 500, 0, NOW() - INTERVAL '90 days', NOW() + INTERVAL '180 days', true, false, 3, false);

-- ======================================================
-- PEDIDOS (Lotes de 30, 30 e 30 para simular 90 dias)
-- ======================================================
DO $$
DECLARE
    v_order_id INTEGER;
    v_user_id INTEGER;
    v_product_id INTEGER;
    v_product_name VARCHAR(150);
    v_product_slug VARCHAR(150);
    v_product_image VARCHAR(255);
    v_unit_price DECIMAL(10,2);
    v_quantity INTEGER;
    v_subtotal DECIMAL(10,2);
    v_shipping DECIMAL(10,2);
    v_total DECIMAL(10,2);
    v_method VARCHAR(20);
    v_status VARCHAR(20);
    v_payment_status VARCHAR(20);
    v_paid_at TIMESTAMP;
    v_created_at TIMESTAMP;
    
    -- Pools
    products_pool INTEGER[] := ARRAY[1, 2, 3, 4, 5, 6, 10, 11, 12, 13, 14, 20, 21, 30, 31, 32, 40, 41, 42, 50, 60, 61, 62, 63, 70, 71, 72, 80, 81, 82];
    users_pool INTEGER[] := ARRAY[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    
    i INTEGER;
    day_offset INTEGER;
BEGIN
    PERFORM setseed(0.42);

    -- LOTE 1: Últimos 30 dias (30 pedidos)
    FOR i IN 1..30 LOOP
        day_offset := floor(random() * random() * 30)::int;
        v_created_at := NOW() - (day_offset || ' days')::interval - ((floor(random() * 24)) || ' hours')::interval;

        v_user_id := users_pool[1 + floor(random() * array_length(users_pool, 1))::int];
        v_product_id := products_pool[1 + floor(random() * array_length(products_pool, 1))::int];

        SELECT name, slug, price, (SELECT image_url FROM product_images WHERE product_id = products.id AND is_primary = true LIMIT 1)
        INTO v_product_name, v_product_slug, v_unit_price, v_product_image
        FROM products WHERE id = v_product_id;

        v_quantity := 1 + floor(random() * 3)::int;
        v_subtotal := v_unit_price * v_quantity;
        v_shipping := CASE WHEN v_subtotal >= 99.90 THEN 0 ELSE 19.90 END;
        v_total := v_subtotal + v_shipping;

        IF random() < 0.5 THEN v_method := 'pix';
        ELSIF random() < 0.85 THEN v_method := 'credit_card';
        ELSE v_method := 'boleto'; END IF;

        DECLARE r DECIMAL := random();
        BEGIN
            IF r < 0.1 THEN v_status := 'pending'; v_payment_status := 'pending'; v_paid_at := NULL;
            ELSIF r < 0.4 THEN v_status := 'paid'; v_payment_status := 'paid'; v_paid_at := v_created_at + INTERVAL '2 hours';
            ELSIF r < 0.6 THEN v_status := 'shipped'; v_payment_status := 'paid'; v_paid_at := v_created_at + INTERVAL '1 day';
            ELSIF r < 0.9 THEN v_status := 'delivered'; v_payment_status := 'paid'; v_paid_at := v_created_at + INTERVAL '2 days';
            ELSE v_status := 'cancelled'; v_payment_status := 'refunded'; v_paid_at := NULL; END IF;
        END;

        INSERT INTO orders (user_id, status, subtotal, shipping_cost, discount, total, payment_method, payment_status, shipping_cep, shipping_street, shipping_number, shipping_neighborhood, shipping_city, shipping_state, created_at, updated_at, cancelled_at, cancel_reason)
        VALUES (v_user_id, v_status, v_subtotal, v_shipping, 0, v_total, v_method, v_payment_status, '01310-100', 'Av. Paulista', '1000', 'Bela Vista', 'São Paulo', 'SP', v_created_at, v_created_at, CASE WHEN v_status = 'cancelled' THEN v_created_at + INTERVAL '1 day' ELSE NULL END, CASE WHEN v_status = 'cancelled' THEN 'Cancelado pelo cliente' ELSE NULL END)
        RETURNING id INTO v_order_id;

        INSERT INTO order_items (order_id, product_id, product_name, product_slug, product_image, quantity, unit_price, subtotal, created_at)
        VALUES (v_order_id, v_product_id, v_product_name, v_product_slug, v_product_image, v_quantity, v_unit_price, v_subtotal, v_created_at);

        INSERT INTO payments (order_id, method, status, amount, transaction_id, paid_at, created_at, updated_at)
        VALUES (v_order_id, v_method, v_payment_status, v_total, 'TXN-' || v_order_id || '-' || to_char(v_created_at, 'YYYYMMDDHH24MISS'), v_paid_at, v_created_at, v_created_at);

        IF v_status != 'cancelled' THEN
            INSERT INTO inventory_movements (product_id, movement_type, quantity, previous_quantity, new_quantity, reason, reference_type, reference_id, created_at)
            VALUES (v_product_id, 'out', v_quantity, (SELECT stock_quantity FROM products WHERE id = v_product_id) + v_quantity, (SELECT stock_quantity FROM products WHERE id = v_product_id), 'Venda', 'order', v_order_id, v_created_at);
            UPDATE products SET sales_count = sales_count + v_quantity WHERE id = v_product_id;
        END IF;
    END LOOP;

    -- LOTE 2: 31 a 60 dias atrás (30 pedidos)
    PERFORM setseed(0.77);
    FOR i IN 1..30 LOOP
        day_offset := 31 + floor(random() * 30)::int;
        v_created_at := NOW() - (day_offset || ' days')::interval - ((floor(random() * 24)) || ' hours')::interval;

        v_user_id := users_pool[1 + floor(random() * array_length(users_pool, 1))::int];
        v_product_id := products_pool[1 + floor(random() * array_length(products_pool, 1))::int];

        SELECT name, slug, price, (SELECT image_url FROM product_images WHERE product_id = products.id AND is_primary = true LIMIT 1)
        INTO v_product_name, v_product_slug, v_unit_price, v_product_image
        FROM products WHERE id = v_product_id;

        v_quantity := 1 + floor(random() * 2)::int;
        v_subtotal := v_unit_price * v_quantity;
        v_shipping := CASE WHEN v_subtotal >= 99.90 THEN 0 ELSE 19.90 END;
        v_total := v_subtotal + v_shipping;

        IF random() < 0.5 THEN v_method := 'pix'; ELSIF random() < 0.85 THEN v_method := 'credit_card'; ELSE v_method := 'boleto'; END IF;

        DECLARE r DECIMAL := random();
        BEGIN
            IF r < 0.05 THEN v_status := 'pending'; v_payment_status := 'pending'; v_paid_at := NULL;
            ELSIF r < 0.3 THEN v_status := 'paid'; v_payment_status := 'paid'; v_paid_at := v_created_at + INTERVAL '2 hours';
            ELSIF r < 0.55 THEN v_status := 'shipped'; v_payment_status := 'paid'; v_paid_at := v_created_at + INTERVAL '1 day';
            ELSIF r < 0.9 THEN v_status := 'delivered'; v_payment_status := 'paid'; v_paid_at := v_created_at + INTERVAL '2 days';
            ELSE v_status := 'cancelled'; v_payment_status := 'refunded'; v_paid_at := NULL; END IF;
        END;

        INSERT INTO orders (user_id, status, subtotal, shipping_cost, discount, total, payment_method, payment_status, shipping_cep, shipping_street, shipping_number, shipping_neighborhood, shipping_city, shipping_state, created_at, updated_at, cancelled_at, cancel_reason)
        VALUES (v_user_id, v_status, v_subtotal, v_shipping, 0, v_total, v_method, v_payment_status, '01310-100', 'Av. Paulista', '1000', 'Bela Vista', 'São Paulo', 'SP', v_created_at, v_created_at, CASE WHEN v_status = 'cancelled' THEN v_created_at + INTERVAL '1 day' ELSE NULL END, CASE WHEN v_status = 'cancelled' THEN 'Produto sem estoque' ELSE NULL END)
        RETURNING id INTO v_order_id;

        INSERT INTO order_items (order_id, product_id, product_name, product_slug, product_image, quantity, unit_price, subtotal, created_at)
        VALUES (v_order_id, v_product_id, v_product_name, v_product_slug, v_product_image, v_quantity, v_unit_price, v_subtotal, v_created_at);

        INSERT INTO payments (order_id, method, status, amount, transaction_id, paid_at, created_at, updated_at)
        VALUES (v_order_id, v_method, v_payment_status, v_total, 'TXN-' || v_order_id || '-' || to_char(v_created_at, 'YYYYMMDDHH24MISS'), v_paid_at, v_created_at, v_created_at);

        IF v_status != 'cancelled' THEN
            INSERT INTO inventory_movements (product_id, movement_type, quantity, previous_quantity, new_quantity, reason, reference_type, reference_id, created_at)
            VALUES (v_product_id, 'out', v_quantity, (SELECT stock_quantity FROM products WHERE id = v_product_id) + v_quantity, (SELECT stock_quantity FROM products WHERE id = v_product_id), 'Venda', 'order', v_order_id, v_created_at);
            UPDATE products SET sales_count = sales_count + v_quantity WHERE id = v_product_id;
        END IF;
    END LOOP;

    -- LOTE 3: 61 a 90 dias atrás (20 pedidos)
    PERFORM setseed(0.99);
    FOR i IN 1..20 LOOP
        day_offset := 61 + floor(random() * 30)::int;
        v_created_at := NOW() - (day_offset || ' days')::interval - ((floor(random() * 24)) || ' hours')::interval;

        v_user_id := users_pool[1 + floor(random() * array_length(users_pool, 1))::int];
        v_product_id := products_pool[1 + floor(random() * array_length(products_pool, 1))::int];

        SELECT name, slug, price, (SELECT image_url FROM product_images WHERE product_id = products.id AND is_primary = true LIMIT 1)
        INTO v_product_name, v_product_slug, v_unit_price, v_product_image
        FROM products WHERE id = v_product_id;

        v_quantity := 1 + floor(random() * 2)::int;
        v_subtotal := v_unit_price * v_quantity;
        v_shipping := CASE WHEN v_subtotal >= 99.90 THEN 0 ELSE 19.90 END;
        v_total := v_subtotal + v_shipping;

        IF random() < 0.55 THEN v_method := 'pix'; ELSIF random() < 0.85 THEN v_method := 'credit_card'; ELSE v_method := 'boleto'; END IF;

        DECLARE r DECIMAL := random();
        BEGIN
            IF r < 0.05 THEN v_status := 'pending'; v_payment_status := 'pending'; v_paid_at := NULL;
            ELSIF r < 0.15 THEN v_status := 'paid'; v_payment_status := 'paid'; v_paid_at := v_created_at + INTERVAL '1 day';
            ELSIF r < 0.30 THEN v_status := 'shipped'; v_payment_status := 'paid'; v_paid_at := v_created_at + INTERVAL '1 day';
            ELSIF r < 0.90 THEN v_status := 'delivered'; v_payment_status := 'paid'; v_paid_at := v_created_at + INTERVAL '1 day';
            ELSE v_status := 'cancelled'; v_payment_status := 'refunded'; v_paid_at := NULL; END IF;
        END;

        INSERT INTO orders (user_id, status, subtotal, shipping_cost, discount, total, payment_method, payment_status, shipping_cep, shipping_street, shipping_number, shipping_neighborhood, shipping_city, shipping_state, created_at, updated_at, cancelled_at, cancel_reason)
        VALUES (v_user_id, v_status, v_subtotal, v_shipping, 0, v_total, v_method, v_payment_status, '01310-100', 'Av. Paulista', '1000', 'Bela Vista', 'São Paulo', 'SP', v_created_at, v_created_at, CASE WHEN v_status = 'cancelled' THEN v_created_at + INTERVAL '3 days' ELSE NULL END, CASE WHEN v_status = 'cancelled' THEN 'Cancelado pelo cliente' ELSE NULL END)
        RETURNING id INTO v_order_id;

        INSERT INTO order_items (order_id, product_id, product_name, product_slug, product_image, quantity, unit_price, subtotal, created_at)
        VALUES (v_order_id, v_product_id, v_product_name, v_product_slug, v_product_image, v_quantity, v_unit_price, v_subtotal, v_created_at);

        INSERT INTO payments (order_id, method, status, amount, transaction_id, paid_at, created_at, updated_at)
        VALUES (v_order_id, v_method, v_payment_status, v_total, 'TXN-' || v_order_id || '-' || to_char(v_created_at, 'YYYYMMDDHH24MISS'), v_paid_at, v_created_at, v_created_at);

        IF v_status != 'cancelled' THEN
            INSERT INTO inventory_movements (product_id, movement_type, quantity, previous_quantity, new_quantity, reason, reference_type, reference_id, created_at)
            VALUES (v_product_id, 'out', v_quantity, (SELECT stock_quantity FROM products WHERE id = v_product_id) + v_quantity, (SELECT stock_quantity FROM products WHERE id = v_product_id), 'Venda', 'order', v_order_id, v_created_at);
            UPDATE products SET sales_count = sales_count + v_quantity WHERE id = v_product_id;
        END IF;
    END LOOP;
END $$;

-- ======================================================
-- AVALIAÇÕES (Amostra)
-- ======================================================
INSERT INTO product_reviews (product_id, user_id, rating, title, comment, is_verified_purchase, is_approved, helpful_count, created_at)
VALUES
(1, 2, 5, 'Excelente qualidade', 'A camisa é de ótimo tecido, caimento perfeito.', TRUE, TRUE, 12, NOW() - INTERVAL '60 days'),
(1, 3, 4, 'Muito boa', 'A qualidade é boa, mas achei o preço salgado.', TRUE, TRUE, 5, NOW() - INTERVAL '50 days'),
(2, 4, 5, 'Clássico', 'Polo maravilhosa, recomendo.', TRUE, TRUE, 8, NOW() - INTERVAL '45 days'),
(10, 5, 5, 'Apaixonada', 'Vestido lindo, tecido leve.', TRUE, TRUE, 10, NOW() - INTERVAL '35 days'),
(11, 6, 4, 'Boa compra', 'Blusa de seda muito bonita, mas amassa fácil.', TRUE, TRUE, 6, NOW() - INTERVAL '25 days'),
(30, 7, 5, 'Perfume incrível', 'Fragrância marcante, dura o dia todo.', TRUE, TRUE, 22, NOW() - INTERVAL '40 days'),
(40, 8, 5, 'O melhor', 'Meu perfume favorito, cheiro maravilhoso.', TRUE, TRUE, 16, NOW() - INTERVAL '28 days'),
(60, 9, 5, 'Ideal para treino', 'Absorve suor muito bem.', TRUE, TRUE, 11, NOW() - INTERVAL '18 days'),
(71, 10, 5, 'Maravilhosa', 'Não é transparente, tecido grosso.', TRUE, TRUE, 21, NOW() - INTERVAL '6 days');

-- ======================================================
-- RECALCULAR rating_avg E rating_count
-- ======================================================
UPDATE products p
SET
    rating_avg = COALESCE((SELECT AVG(rating) FROM product_reviews WHERE product_id = p.id AND is_approved = TRUE), 0),
    rating_count = (SELECT COUNT(*) FROM product_reviews WHERE product_id = p.id AND is_approved = TRUE)
WHERE EXISTS (SELECT 1 FROM product_reviews WHERE product_id = p.id);

-- ======================================================
-- AJUSTE DAS SEQUENCES
-- ======================================================
SELECT setval('categories_id_seq',          (SELECT MAX(id) FROM categories));
SELECT setval('brands_id_seq',              (SELECT MAX(id) FROM brands));
SELECT setval('products_id_seq',            (SELECT MAX(id) FROM products));
SELECT setval('product_images_id_seq',      (SELECT MAX(id) FROM product_images));
SELECT setval('inventory_id_seq',           (SELECT MAX(id) FROM inventory));
SELECT setval('inventory_movements_id_seq', (SELECT MAX(id) FROM inventory_movements));
SELECT setval('promotions_id_seq',          (SELECT MAX(id) FROM promotions));
SELECT setval('product_reviews_id_seq',     (SELECT MAX(id) FROM product_reviews));
SELECT setval('users_id_seq',               (SELECT MAX(id) FROM users));
SELECT setval('orders_id_seq',              (SELECT MAX(id) FROM orders));
SELECT setval('order_items_id_seq',         (SELECT MAX(id) FROM order_items));
SELECT setval('payments_id_seq',            (SELECT MAX(id) FROM payments));

-- ======================================================
-- RELATÓRIO
-- ======================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Seeds aplicados com sucesso!';
    RAISE NOTICE '   Categorias:  %', (SELECT COUNT(*) FROM categories);
    RAISE NOTICE '   Marcas:      %', (SELECT COUNT(*) FROM brands);
    RAISE NOTICE '   Produtos:    %', (SELECT COUNT(*) FROM products);
    RAISE NOTICE '   Imagens:     %', (SELECT COUNT(*) FROM product_images);
    RAISE NOTICE '   Usuários:    %', (SELECT COUNT(*) FROM users);
    RAISE NOTICE '   Pedidos:     %', (SELECT COUNT(*) FROM orders);
    RAISE NOTICE '   Itens:       %', (SELECT COUNT(*) FROM order_items);
    RAISE NOTICE '   Pagamentos:  %', (SELECT COUNT(*) FROM payments);
    RAISE NOTICE '   Avaliações:  %', (SELECT COUNT(*) FROM product_reviews);
    RAISE NOTICE '   Estoque:     %', (SELECT COUNT(*) FROM inventory);
    RAISE NOTICE '   Movimentos:  %', (SELECT COUNT(*) FROM inventory_movements);
    RAISE NOTICE '   Promoções:   %', (SELECT COUNT(*) FROM promotions);
    RAISE NOTICE '';
    RAISE NOTICE '   ⚠️  Rode fix-passwords.js para corrigir as senhas';
END $$;