-- ======================================================
-- LUXURY STORE - SEEDS COMPLETO
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
-- Ordem respeita dependências
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

-- ======================================================
-- CATEGORIAS — NÍVEL 1
-- ======================================================
INSERT INTO categories (id, name, slug, description, parent_id, sort_order, is_active) VALUES
(1, 'Vestuário',          'vestuario',           'Roupas e acessórios de moda',            NULL, 1, true),
(2, 'Perfumaria',         'perfumaria',          'Perfumes e fragrâncias',                 NULL, 2, true),
(3, 'Artigos Esportivos', 'artigos-esportivos',  'Equipamentos e roupas para esportes',    NULL, 3, true);

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
(32, 'Infantil',  'esportivos-infantil',  'Esportivos infantis',   3, 3, true);

-- ======================================================
-- CATEGORIAS — NÍVEL 3
-- ======================================================
INSERT INTO categories (id, name, slug, description, parent_id, sort_order, is_active) VALUES
(100, 'Camisas',         'vest-masc-camisas',   'Camisas masculinas',           10, 1, true),
(101, 'Camisetas',       'vest-masc-camisetas', 'Camisetas masculinas',         10, 2, true),
(102, 'Blusas',          'vest-masc-blusas',    'Blusas masculinas',            10, 3, true),
(103, 'Jaquetas',        'vest-masc-jaquetas',  'Jaquetas masculinas',          10, 4, true),
(104, 'Calças',          'vest-masc-calcas',    'Calças masculinas',            10, 5, true),
(105, 'Shorts/Bermudas', 'vest-masc-shorts',    'Shorts e bermudas masculinas', 10, 6, true),
(106, 'Acessórios',      'vest-masc-acessorios','Acessórios masculinos',        10, 7, true),
(110, 'Camisas',         'vest-fem-camisas',    'Camisas femininas',            11, 1, true),
(111, 'Camisetas',       'vest-fem-camisetas',  'Camisetas femininas',          11, 2, true),
(112, 'Blusas',          'vest-fem-blusas',     'Blusas femininas',             11, 3, true),
(113, 'Jaquetas',        'vest-fem-jaquetas',   'Jaquetas femininas',           11, 4, true),
(114, 'Calças',          'vest-fem-calcas',     'Calças femininas',             11, 5, true),
(115, 'Shorts/Bermudas', 'vest-fem-shorts',     'Shorts e bermudas femininas',  11, 6, true),
(116, 'Saias',           'vest-fem-saias',      'Saias femininas',              11, 7, true),
(117, 'Vestidos',        'vest-fem-vestidos',   'Vestidos femininos',           11, 8, true),
(118, 'Acessórios',      'vest-fem-acessorios', 'Acessórios femininos',         11, 9, true),
(120, 'Camisetas',       'vest-inf-camisetas',  'Camisetas infantis',           12, 1, true),
(121, 'Blusas',          'vest-inf-blusas',     'Blusas infantis',              12, 2, true),
(122, 'Jaquetas',        'vest-inf-jaquetas',   'Jaquetas infantis',            12, 3, true),
(123, 'Calças',          'vest-inf-calcas',     'Calças infantis',              12, 4, true),
(124, 'Shorts/Bermudas', 'vest-inf-shorts',     'Shorts e bermudas infantis',   12, 5, true),
(125, 'Vestidos',        'vest-inf-vestidos',   'Vestidos infantis',            12, 6, true),
(126, 'Conjuntos',       'vest-inf-conjuntos',  'Conjuntos infantis',           12, 7, true),
(200, 'Eau de Parfum',   'perf-masc-edp',       'Eau de Parfum masculino',      20, 1, true),
(201, 'Eau de Toilette', 'perf-masc-edt',       'Eau de Toilette masculino',    20, 2, true),
(202, 'Colônias',        'perf-masc-colonias',  'Colônias masculinas',          20, 3, true),
(203, 'Kits',            'perf-masc-kits',      'Kits masculinos',              20, 4, true),
(210, 'Eau de Parfum',   'perf-fem-edp',        'Eau de Parfum feminino',       21, 1, true),
(211, 'Eau de Toilette', 'perf-fem-edt',        'Eau de Toilette feminino',     21, 2, true),
(212, 'Colônias',        'perf-fem-colonias',   'Colônias femininas',           21, 3, true),
(213, 'Kits',            'perf-fem-kits',       'Kits femininos',               21, 4, true),
(220, 'Eau de Parfum',   'perf-uni-edp',        'Eau de Parfum unissex',        22, 1, true),
(221, 'Eau de Toilette', 'perf-uni-edt',        'Eau de Toilette unissex',      22, 2, true),
(222, 'Colônias',        'perf-uni-colonias',   'Colônias unissex',             22, 3, true),
(300, 'Camisetas',  'esp-masc-camisetas',  'Camisetas esportivas masculinas',  30, 1, true),
(301, 'Shorts',     'esp-masc-shorts',     'Shorts esportivos masculinos',     30, 2, true),
(302, 'Calças',     'esp-masc-calcas',     'Calças esportivas masculinas',     30, 3, true),
(303, 'Tênis',      'esp-masc-tenis',      'Tênis esportivos masculinos',      30, 4, true),
(304, 'Acessórios', 'esp-masc-acessorios', 'Acessórios esportivos masculinos', 30, 5, true),
(310, 'Camisetas',  'esp-fem-camisetas',  'Camisetas esportivas femininas',   31, 1, true),
(311, 'Shorts',     'esp-fem-shorts',     'Shorts esportivos femininos',      31, 2, true),
(312, 'Calças',     'esp-fem-calcas',     'Calças esportivas femininas',      31, 3, true),
(313, 'Tênis',      'esp-fem-tenis',      'Tênis esportivos femininos',       31, 4, true),
(314, 'Acessórios', 'esp-fem-acessorios', 'Acessórios esportivos femininos',  31, 5, true),
(320, 'Camisetas',  'esp-inf-camisetas',  'Camisetas esportivas infantis',    32, 1, true),
(321, 'Shorts',     'esp-inf-shorts',     'Shorts esportivos infantis',       32, 2, true),
(322, 'Tênis',      'esp-inf-tenis',      'Tênis esportivos infantis',        32, 3, true),
(323, 'Acessórios', 'esp-inf-acessorios', 'Acessórios esportivos infantis',   32, 4, true);

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
-- Datas de cadastro escalonadas ao longo dos últimos 90 dias
-- (para o gráfico "Novos Clientes" ter progressão)
INSERT INTO users (
    id, full_name, email, password_hash, role, gender, phone, cpf,
    cep, street, number, neighborhood, city, state,
    is_active, email_verified, created_at
) VALUES
    -- Admin (data antiga, fora do período de análise)
    (1, 'Administrador', 'admin@luxurystore.com', '$2b$10$PLACEHOLDER_ADMIN',
     'admin', NULL, NULL, NULL,
     NULL, NULL, NULL, NULL, NULL, NULL,
     TRUE, TRUE, NOW() - INTERVAL '180 days'),

    -- Clientes de teste (datas escalonadas nos últimos 90 dias)
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

    -- ⬇️ 6 clientes NOVOS com cadastros recentes (para gráfico "novos clientes")
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
-- PRODUTOS
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
 0, 120, 0, 0),

(2, 'Perfume Chanel Nº5', 'perfume-chanel-n5', 'PER-CHA-005',
 'O clássico atemporal da Chanel. Fragrância floral aldeídica icônica, criada em 1921 e eternizada por Marilyn Monroe.',
 'Perfume clássico Chanel',
 210, 2, 899.90, 500.00, 0, 20, 'in_stock', true, true, false, true,
 0, 380, 0, 0),

(3, 'Tênis de Corrida Pro', 'tenis-corrida-pro', 'TEN-COR-010',
 'Tênis de corrida com amortecimento de última geração e leveza extrema. Ideal para treinos de longa distância.',
 'Tênis de corrida profissional',
 303, 4, 349.90, 180.00, 0, 30, 'in_stock', true, false, true, false,
 0, 210, 0, 0),

(4, 'Vestido Midi Floral', 'vestido-midi-floral', 'VES-MID-020',
 'Vestido midi com estampa floral exclusiva. Tecido leve e confortável, perfeito para o verão. Comprimento midi elegante.',
 'Vestido midi floral',
 117, 1, 259.90, 120.00, 15, 25, 'in_stock', true, true, true, false,
 0, 95, 0, 0),

(5, 'Jaqueta Jeans Masculina', 'jaqueta-jeans-masculina', 'JAQ-JEA-015',
 'Jaqueta jeans masculina clássica com lavagem média. Atemporal e versátil, combina com qualquer look casual.',
 'Jaqueta jeans clássica',
 103, 1, 299.90, 140.00, 0, 15, 'in_stock', true, false, false, false,
 0, 60, 0, 0),

(6, 'Sérum Facial Premium', 'serum-facial-premium', 'SER-FAC-099',
 'Sérum facial com vitamina C e ácido hialurônico. Revitaliza, hidrata e uniformiza o tom da pele. Uso diário.',
 'Sérum facial premium',
 21, 3, 189.90, 80.00, 20, 40, 'in_stock', true, true, false, false,
 0, 175, 0, 0),

(10, 'Camisa Polo Clássica', 'camisa-polo-classica', 'CAM-POL-M01',
 'Camisa polo masculina clássica em algodão piquê. Perfeita para looks casuais e esportivos.',
 'Camisa polo clássica',
 100, 1, 129.90, 60.00, 0, 40, 'in_stock', true, false, true, true,
 0, 180, 0, 0),

(11, 'Camiseta Básica Preta', 'camiseta-basica-preta', 'CAM-BAS-M02',
 'Camiseta básica preta 100% algodão. Peça coringa para qualquer guarda-roupa masculino.',
 'Camiseta básica preta',
 101, 1, 69.90, 25.00, 0, 80, 'in_stock', true, false, false, true,
 0, 320, 0, 0),

(12, 'Calça Chino Slim', 'calca-chino-slim', 'CAL-CHI-M03',
 'Calça chino masculina com corte slim. Elegante e confortável para o dia a dia.',
 'Calça chino slim',
 104, 1, 219.90, 100.00, 10, 35, 'in_stock', true, true, true, false,
 0, 140, 0, 0),

(13, 'Bermuda Sarja', 'bermuda-sarja', 'BER-SAR-M04',
 'Bermuda de sarja masculina com elástico oculto. Ideal para o verão.',
 'Bermuda de sarja',
 105, 1, 149.90, 65.00, 0, 45, 'in_stock', true, false, false, false,
 0, 95, 0, 0),

(14, 'Blazer Slim Fit', 'blazer-slim-fit', 'BLA-SLI-M05',
 'Blazer masculino slim fit em tecido premium. Ideal para ocasiões formais e casamentos.',
 'Blazer slim fit',
 102, 1, 599.90, 280.00, 15, 12, 'in_stock', true, true, true, false,
 0, 110, 0, 0),

(15, 'Cinto de Couro Legítimo', 'cinto-couro-legitimo', 'CIN-COU-M06',
 'Cinto masculino em couro legítimo com fivela metálica. Durável e elegante.',
 'Cinto de couro',
 106, 1, 179.90, 70.00, 0, 60, 'in_stock', true, false, false, false,
 0, 130, 0, 0),

(20, 'Vestido Longo Elegance', 'vestido-longo-elegance', 'VES-LON-F01',
 'Vestido longo feminino em tecido fluido. Perfeito para festas e eventos especiais.',
 'Vestido longo elegance',
 117, 1, 449.90, 200.00, 0, 18, 'in_stock', true, true, true, false,
 0, 200, 0, 0),

(21, 'Blusa de Seda', 'blusa-de-seda', 'BLU-SED-F02',
 'Blusa feminina em seda pura. Toque suave e caimento impecável.',
 'Blusa de seda',
 112, 6, 289.90, 130.00, 20, 22, 'in_stock', true, true, false, false,
 0, 145, 0, 0),

(22, 'Calça Jeans Skinny', 'calca-jeans-skinny', 'CAL-JEA-F03',
 'Calça jeans skinny feminina com elastano. Modelagem que valoriza o corpo.',
 'Calça jeans skinny',
 114, 6, 199.90, 90.00, 0, 55, 'in_stock', true, false, false, true,
 0, 280, 0, 0),

(23, 'Saia Midi Plissada', 'saia-midi-plissada', 'SAI-MID-F04',
 'Saia midi plissada feminina. Elegante e versátil, combina com diversos looks.',
 'Saia midi plissada',
 116, 6, 179.90, 80.00, 0, 30, 'in_stock', true, false, true, false,
 0, 100, 0, 0),

(24, 'Camiseta Oversized Branca', 'camiseta-oversized-branca', 'CAM-OVE-F05',
 'Camiseta oversized branca em algodão premium. Conforto e estilo em uma peça.',
 'Camiseta oversized',
 111, 1, 89.90, 35.00, 0, 70, 'in_stock', true, false, false, true,
 0, 350, 0, 0),

(25, 'Jaqueta Corta-Vento', 'jaqueta-corta-vento', 'JAQ-COR-F06',
 'Jaqueta corta-vento feminina impermeável. Ideal para dias chuvosos.',
 'Jaqueta corta-vento',
 113, 1, 259.90, 120.00, 10, 28, 'in_stock', true, false, true, false,
 0, 115, 0, 0),

(26, 'Bolsa Transversal Couro', 'bolsa-transversal-couro', 'BOL-TRA-F07',
 'Bolsa transversal feminina em couro sintético premium. Compartimentos internos organizados.',
 'Bolsa transversal',
 118, 6, 249.90, 110.00, 0, 25, 'in_stock', true, false, false, false,
 0, 160, 0, 0),

(30, 'Camiseta Infantil Divertida', 'camiseta-infantil-divertida', 'CAM-INF-I01',
 'Camiseta infantil com estampa divertida. Algodão macio e confortável.',
 'Camiseta infantil divertida',
 120, 1, 49.90, 20.00, 0, 60, 'in_stock', true, false, true, false,
 0, 180, 0, 0),

(31, 'Conjunto Infantil Verão', 'conjunto-infantil-verao', 'CON-INF-I02',
 'Conjunto infantil de verão com camiseta e short. Tecido leve e fresco.',
 'Conjunto infantil verão',
 126, 1, 89.90, 40.00, 0, 40, 'in_stock', true, false, false, true,
 0, 200, 0, 0),

(32, 'Calça Legging Infantil', 'calca-legging-infantil', 'CAL-LEG-I03',
 'Calça legging infantil com cós elástico. Ideal para atividades físicas.',
 'Calça legging infantil',
 123, 1, 59.90, 25.00, 0, 55, 'in_stock', true, false, false, false,
 0, 140, 0, 0),

(33, 'Vestido Infantil Floral', 'vestido-infantil-floral', 'VES-INF-I04',
 'Vestido infantil floral em algodão. Delicado e confortável.',
 'Vestido infantil floral',
 125, 1, 119.90, 50.00, 15, 30, 'in_stock', true, true, true, false,
 0, 130, 0, 0),

(40, 'Eau de Parfum Sauvage', 'edp-sauvage', 'EDP-SAU-M01',
 'Fragrância masculina amadeirada, fresca e marcante. Para o homem moderno.',
 'Eau de Parfum Sauvage',
 200, 3, 649.90, 320.00, 0, 25, 'in_stock', true, true, false, true,
 0, 280, 0, 0),

(41, 'Eau de Toilette Bleu', 'edt-bleu', 'EDT-BLE-M02',
 'Eau de Toilette masculino aromático. Fresco e versátil para o dia a dia.',
 'Eau de Toilette Bleu',
 201, 3, 499.90, 240.00, 10, 30, 'in_stock', true, false, true, false,
 0, 180, 0, 0),

(42, 'Colônia Sport Masculina', 'colonia-sport-masculina', 'COL-SPO-M03',
 'Colônia masculina esportiva. Perfeita para o pós-treino.',
 'Colônia Sport',
 202, 1, 189.90, 80.00, 0, 45, 'in_stock', true, false, false, false,
 0, 210, 0, 0),

(50, 'Eau de Parfum J''adore', 'edp-jadore', 'EDP-JAD-F01',
 'Fragrância feminina floral sofisticada. Elegante e marcante.',
 'Eau de Parfum J''adore',
 210, 3, 749.90, 380.00, 0, 20, 'in_stock', true, true, false, true,
 0, 340, 0, 0),

(51, 'Eau de Toilette Miss Dior', 'edt-miss-dior', 'EDT-MIS-F02',
 'Eau de Toilette feminino floral frutado. Jovem e romântico.',
 'Eau de Toilette Miss Dior',
 211, 3, 599.90, 280.00, 15, 28, 'in_stock', true, true, true, false,
 0, 260, 0, 0),

(52, 'Colônia Flor de Cerejeira', 'colonia-flor-cerejeira', 'COL-FLO-F03',
 'Colônia feminina delicada com notas florais. Ideal para o dia a dia.',
 'Colônia Flor de Cerejeira',
 212, 1, 159.90, 70.00, 0, 50, 'in_stock', true, false, false, false,
 0, 190, 0, 0),

(60, 'Eau de Parfum Unissex Woody', 'edp-unissex-woody', 'EDP-UNI-U01',
 'Fragrância unissex amadeirada. Sofisticada e atemporal.',
 'Eau de Parfum Woody',
 220, 3, 549.90, 260.00, 0, 22, 'in_stock', true, false, true, false,
 0, 150, 0, 0),

(70, 'Camiseta Dry Fit Masculina', 'camiseta-dry-fit-masculina', 'CAM-DRY-M01',
 'Camiseta esportiva masculina com tecnologia dry fit. Absorve o suor rapidamente.',
 'Camiseta dry fit',
 300, 4, 119.90, 55.00, 0, 65, 'in_stock', true, false, true, true,
 0, 320, 0, 0),

(71, 'Shorts Corrida Masculino', 'shorts-corrida-masculino', 'SHO-COR-M02',
 'Shorts de corrida masculino com bolso interno e cós elástico.',
 'Shorts de corrida',
 301, 4, 149.90, 65.00, 10, 40, 'in_stock', true, false, false, false,
 0, 180, 0, 0),

(72, 'Calça Legging Esportiva Masculina', 'calca-legging-esportiva-masculina', 'CAL-LEG-M03',
 'Calça legging esportiva masculina. Compressão e suporte para treinos intensos.',
 'Calça legging esportiva',
 302, 5, 189.90, 85.00, 0, 35, 'in_stock', true, false, false, false,
 0, 145, 0, 0),

(73, 'Tênis Running Ultra', 'tenis-running-ultra', 'TEN-RUN-M04',
 'Tênis de running com amortecimento de alto impacto. Ideal para maratonas.',
 'Tênis running ultra',
 303, 5, 499.90, 240.00, 20, 28, 'in_stock', true, true, true, false,
 0, 290, 0, 0),

(80, 'Top Esportivo Feminino', 'top-esportivo-feminino', 'TOP-ESP-F01',
 'Top esportivo feminino com sustentação média. Ideal para corrida e academia.',
 'Top esportivo',
 310, 4, 129.90, 55.00, 0, 50, 'in_stock', true, false, true, true,
 0, 280, 0, 0),

(81, 'Legging Fitness Feminina', 'legging-fitness-feminina', 'LEG-FIT-F02',
 'Legging fitness feminina de alta compressão. Modelagem anatômica.',
 'Legging fitness',
 312, 4, 169.90, 75.00, 10, 45, 'in_stock', true, true, false, true,
 0, 260, 0, 0),

(82, 'Tênis Feminino Coral', 'tenis-feminino-coral', 'TEN-COR-F03',
 'Tênis feminino com design moderno e cores vibrantes. Confortável e estiloso.',
 'Tênis feminino coral',
 313, 5, 399.90, 190.00, 0, 32, 'in_stock', true, false, true, false,
 0, 210, 0, 0),

(90, 'Camiseta Esportiva Infantil', 'camiseta-esportiva-infantil', 'CAM-ESP-I01',
 'Camiseta esportiva infantil com proteção UV. Ideal para esportes ao ar livre.',
 'Camiseta esportiva infantil',
 320, 4, 79.90, 35.00, 0, 55, 'in_stock', true, false, true, false,
 0, 160, 0, 0),

(91, 'Tênis Infantil Colorido', 'tenis-infantil-colorido', 'TEN-INF-I02',
 'Tênis infantil colorido com velcro. Fácil de calçar e super confortável.',
 'Tênis infantil colorido',
 322, 5, 229.90, 100.00, 15, 40, 'in_stock', true, false, false, false,
 0, 130, 0, 0);

-- ======================================================
-- IMAGENS DOS PRODUTOS
-- ======================================================
INSERT INTO product_images (product_id, image_url, alt_text, is_primary, sort_order) VALUES
(1,  'https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=800', 'Camisa Social Slim',             true, 0),
(1,  'https://images.pexels.com/photos/297933/pexels-photo-297933.jpeg?auto=compress&cs=tinysrgb&w=800',   'Camisa Social Slim - Detalhe',   false, 1),
(2,  'https://images.pexels.com/photos/1190829/pexels-photo-1190829.jpeg?auto=compress&cs=tinysrgb&w=800', 'Perfume Chanel Nº5',             true, 0),
(3,  'https://images.pexels.com/photos/1598505/pexels-photo-1598505.jpeg?auto=compress&cs=tinysrgb&w=800', 'Tênis de Corrida Pro',           true, 0),
(4,  'https://images.pexels.com/photos/1536619/pexels-photo-1536619.jpeg?auto=compress&cs=tinysrgb&w=800', 'Vestido Midi Floral',            true, 0),
(5,  'https://images.pexels.com/photos/1183266/pexels-photo-1183266.jpeg?auto=compress&cs=tinysrgb&w=800', 'Jaqueta Jeans Masculina',        true, 0),
(6,  'https://images.pexels.com/photos/4465124/pexels-photo-4465124.jpeg?auto=compress&cs=tinysrgb&w=800', 'Sérum Facial Premium',           true, 0),
(10, 'https://images.pexels.com/photos/1040945/pexels-photo-1040945.jpeg?auto=compress&cs=tinysrgb&w=800', 'Camisa Polo Clássica',           true, 0),
(11, 'https://images.pexels.com/photos/8532616/pexels-photo-8532616.jpeg?auto=compress&cs=tinysrgb&w=800', 'Camiseta Básica Preta',          true, 0),
(12, 'https://images.pexels.com/photos/1082529/pexels-photo-1082529.jpeg?auto=compress&cs=tinysrgb&w=800', 'Calça Chino Slim',               true, 0),
(13, 'https://images.pexels.com/photos/1598508/pexels-photo-1598508.jpeg?auto=compress&cs=tinysrgb&w=800', 'Bermuda Sarja',                  true, 0),
(14, 'https://images.pexels.com/photos/1043476/pexels-photo-1043476.jpeg?auto=compress&cs=tinysrgb&w=800', 'Blazer Slim Fit',                true, 0),
(15, 'https://images.pexels.com/photos/45055/pexels-photo-45055.jpeg?auto=compress&cs=tinysrgb&w=800',     'Cinto de Couro Legítimo',        true, 0),
(20, 'https://images.pexels.com/photos/291762/pexels-photo-291762.jpeg?auto=compress&cs=tinysrgb&w=800',   'Vestido Longo Elegance',         true, 0),
(21, 'https://images.pexels.com/photos/985635/pexels-photo-985635.jpeg?auto=compress&cs=tinysrgb&w=800',   'Blusa de Seda',                  true, 0),
(22, 'https://images.pexels.com/photos/1598507/pexels-photo-1598507.jpeg?auto=compress&cs=tinysrgb&w=800', 'Calça Jeans Skinny',             true, 0),
(23, 'https://images.pexels.com/photos/9558580/pexels-photo-9558580.jpeg?auto=compress&cs=tinysrgb&w=800', 'Saia Midi Plissada',             true, 0),
(24, 'https://images.pexels.com/photos/8532616/pexels-photo-8532616.jpeg?auto=compress&cs=tinysrgb&w=800', 'Camiseta Oversized Branca',      true, 0),
(25, 'https://images.pexels.com/photos/1183266/pexels-photo-1183266.jpeg?auto=compress&cs=tinysrgb&w=800', 'Jaqueta Corta-Vento',            true, 0),
(26, 'https://images.pexels.com/photos/1152077/pexels-photo-1152077.jpeg?auto=compress&cs=tinysrgb&w=800', 'Bolsa Transversal Couro',        true, 0),
(30, 'https://images.pexels.com/photos/35537/child-children-girl-happy.jpg?auto=compress&cs=tinysrgb&w=800', 'Camiseta Infantil Divertida', true, 0),
(31, 'https://images.pexels.com/photos/1620760/pexels-photo-1620760.jpeg?auto=compress&cs=tinysrgb&w=800', 'Conjunto Infantil Verão',        true, 0),
(32, 'https://images.pexels.com/photos/35537/child-children-girl-happy.jpg?auto=compress&cs=tinysrgb&w=800', 'Calça Legging Infantil',       true, 0),
(33, 'https://images.pexels.com/photos/1619860/pexels-photo-1619860.jpeg?auto=compress&cs=tinysrgb&w=800', 'Vestido Infantil Floral',        true, 0),
(40, 'https://images.pexels.com/photos/965989/pexels-photo-965989.jpeg?auto=compress&cs=tinysrgb&w=800',   'Eau de Parfum Sauvage',          true, 0),
(41, 'https://images.pexels.com/photos/1190829/pexels-photo-1190829.jpeg?auto=compress&cs=tinysrgb&w=800', 'Eau de Toilette Bleu',           true, 0),
(42, 'https://images.pexels.com/photos/965989/pexels-photo-965989.jpeg?auto=compress&cs=tinysrgb&w=800',   'Colônia Sport Masculina',        true, 0),
(50, 'https://images.pexels.com/photos/1190829/pexels-photo-1190829.jpeg?auto=compress&cs=tinysrgb&w=800', 'Eau de Parfum J''adore',         true, 0),
(51, 'https://images.pexels.com/photos/1190829/pexels-photo-1190829.jpeg?auto=compress&cs=tinysrgb&w=800', 'Eau de Toilette Miss Dior',      true, 0),
(52, 'https://images.pexels.com/photos/1190829/pexels-photo-1190829.jpeg?auto=compress&cs=tinysrgb&w=800', 'Colônia Flor de Cerejeira',      true, 0),
(60, 'https://images.pexels.com/photos/1190829/pexels-photo-1190829.jpeg?auto=compress&cs=tinysrgb&w=800', 'Eau de Parfum Woody',            true, 0),
(70, 'https://images.pexels.com/photos/2294361/pexels-photo-2294361.jpeg?auto=compress&cs=tinysrgb&w=800', 'Camiseta Dry Fit Masculina',     true, 0),
(71, 'https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=800', 'Shorts Corrida Masculino',       true, 0),
(72, 'https://images.pexels.com/photos/1552252/pexels-photo-1552252.jpeg?auto=compress&cs=tinysrgb&w=800', 'Calça Legging Esportiva Masculina', true, 0),
(73, 'https://images.pexels.com/photos/1598505/pexels-photo-1598505.jpeg?auto=compress&cs=tinysrgb&w=800', 'Tênis Running Ultra',            true, 0),
(80, 'https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=800', 'Top Esportivo Feminino',         true, 0),
(81, 'https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=800', 'Legging Fitness Feminina',       true, 0),
(82, 'https://images.pexels.com/photos/1598505/pexels-photo-1598505.jpeg?auto=compress&cs=tinysrgb&w=800', 'Tênis Feminino Coral',           true, 0),
(90, 'https://images.pexels.com/photos/2294361/pexels-photo-2294361.jpeg?auto=compress&cs=tinysrgb&w=800', 'Camiseta Esportiva Infantil',    true, 0),
(91, 'https://images.pexels.com/photos/1598505/pexels-photo-1598505.jpeg?auto=compress&cs=tinysrgb&w=800', 'Tênis Infantil Colorido',        true, 0);

-- ======================================================
-- ESTOQUE (valores iniciais)
-- ======================================================
INSERT INTO inventory (product_id, quantity, min_quantity, location) VALUES
(1, 50, 5, 'Prateleira A-1'), (2, 20, 3, 'Prateleira B-2'), (3, 30, 5, 'Prateleira C-1'),
(4, 25, 5, 'Prateleira A-3'), (5, 15, 3, 'Prateleira A-4'), (6, 40, 5, 'Prateleira B-1'),
(10, 40, 5, 'Prateleira A-1'), (11, 80, 10, 'Prateleira A-2'), (12, 35, 5, 'Prateleira A-3'),
(13, 45, 5, 'Prateleira A-4'), (14, 12, 2, 'Prateleira A-5'), (15, 60, 10, 'Prateleira A-6'),
(20, 18, 3, 'Prateleira B-1'), (21, 22, 3, 'Prateleira B-2'), (22, 55, 10, 'Prateleira B-3'),
(23, 30, 5, 'Prateleira B-4'), (24, 70, 10, 'Prateleira B-5'), (25, 28, 5, 'Prateleira B-6'),
(26, 25, 3, 'Prateleira B-7'), (30, 60, 10, 'Prateleira C-1'), (31, 40, 5, 'Prateleira C-2'),
(32, 55, 10, 'Prateleira C-3'), (33, 30, 5, 'Prateleira C-4'), (40, 25, 3, 'Prateleira D-1'),
(41, 30, 5, 'Prateleira D-2'), (42, 45, 5, 'Prateleira D-3'), (50, 20, 3, 'Prateleira D-4'),
(51, 28, 5, 'Prateleira D-5'), (52, 50, 10, 'Prateleira D-6'), (60, 22, 3, 'Prateleira D-7'),
(70, 65, 10, 'Prateleira E-1'), (71, 40, 5, 'Prateleira E-2'), (72, 35, 5, 'Prateleira E-3'),
(73, 28, 5, 'Prateleira E-4'), (80, 50, 10, 'Prateleira E-5'), (81, 45, 5, 'Prateleira E-6'),
(82, 32, 5, 'Prateleira E-7'), (90, 55, 10, 'Prateleira F-1'), (91, 40, 5, 'Prateleira F-2');

-- ======================================================
-- PEDIDOS + ITENS + PAGAMENTOS
-- ======================================================
-- Distribuição:
--   ~100 pedidos em 90 dias
--   60% nos últimos 30 dias
--   25% entre 31-60 dias
--   15% entre 61-90 dias
-- ======================================================

-- ------------------------------------------------------
-- Helper: cria pedido completo (order + items + payment)
-- Vamos usar blocos SQL para manter tudo coerente
-- ------------------------------------------------------

-- ======================================================
-- LOTE 1 — Últimos 30 dias (60 pedidos)
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
    v_sales_increment INTEGER;

    -- Produtos "populares" com preços (para concentrar vendas)
    products_pool INTEGER[] := ARRAY[1, 2, 3, 4, 6, 10, 11, 12, 20, 22, 24, 40, 50, 70, 73, 80, 81, 30, 33, 51];

    -- Usuários (clientes)
    users_pool INTEGER[] := ARRAY[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

    i INTEGER;
    day_offset INTEGER;
    rand_seed INTEGER;
BEGIN
    -- SEMENTE para variação consistente
    PERFORM setseed(0.42);

    FOR i IN 1..60 LOOP
        -- Distribuição temporal: mais recente concentra mais pedidos
        -- Reaproveita padrão de distribuição triangular invertida
        day_offset := floor(random() * random() * 30)::int;

        v_created_at := NOW() - (day_offset || ' days')::interval - ((floor(random() * 24)) || ' hours')::interval - ((floor(random() * 60)) || ' minutes')::interval;

        -- Sorteia cliente
        v_user_id := users_pool[1 + floor(random() * array_length(users_pool, 1))::int];

        -- Sorteia produto popular
        v_product_id := products_pool[1 + floor(random() * array_length(products_pool, 1))::int];

        -- Pega dados do produto
        SELECT name, slug, price,
               (SELECT image_url FROM product_images WHERE product_id = products.id AND is_primary = true LIMIT 1)
        INTO v_product_name, v_product_slug, v_unit_price, v_product_image
        FROM products WHERE id = v_product_id;

        -- Quantidade entre 1 e 3
        v_quantity := 1 + floor(random() * 3)::int;
        v_subtotal := v_unit_price * v_quantity;
        v_shipping := CASE WHEN v_subtotal >= 99.90 THEN 0 ELSE 19.90 END;
        v_total := v_subtotal + v_shipping;

        -- Método de pagamento (PIX 50%, Cartão 35%, Boleto 15%)
        IF random() < 0.50 THEN v_method := 'pix';
        ELSIF random() < 0.85 THEN v_method := 'credit_card';
        ELSE v_method := 'boleto';
        END IF;

        -- Status do pedido
        -- pending 10%, paid 30%, shipped 20%, delivered 30%, cancelled 10%
        DECLARE r DECIMAL := random();
        BEGIN
            IF r < 0.10 THEN
                v_status := 'pending';
                v_payment_status := 'pending';
                v_paid_at := NULL;
            ELSIF r < 0.40 THEN
                v_status := 'paid';
                v_payment_status := 'paid';
                v_paid_at := v_created_at + ((floor(random() * 2)) || ' hours')::interval;
            ELSIF r < 0.60 THEN
                v_status := 'shipped';
                v_payment_status := 'paid';
                v_paid_at := v_created_at + ((floor(random() * 2)) || ' hours')::interval;
            ELSIF r < 0.90 THEN
                v_status := 'delivered';
                v_payment_status := 'paid';
                v_paid_at := v_created_at + ((floor(random() * 2)) || ' hours')::interval;
            ELSE
                v_status := 'cancelled';
                v_payment_status := CASE WHEN random() < 0.5 THEN 'refunded' ELSE 'failed' END;
                v_paid_at := NULL;
            END IF;
        END;

        -- Cria o pedido
        INSERT INTO orders (
            user_id, status, subtotal, shipping_cost, discount, total,
            payment_method, payment_status,
            shipping_cep, shipping_street, shipping_number, shipping_neighborhood, shipping_city, shipping_state,
            created_at, updated_at, cancelled_at, cancel_reason
        ) VALUES (
            v_user_id, v_status, v_subtotal, v_shipping, 0, v_total,
            v_method, v_payment_status,
            (SELECT cep FROM users WHERE id = v_user_id),
            (SELECT street FROM users WHERE id = v_user_id),
            (SELECT number FROM users WHERE id = v_user_id),
            (SELECT neighborhood FROM users WHERE id = v_user_id),
            (SELECT city FROM users WHERE id = v_user_id),
            (SELECT state FROM users WHERE id = v_user_id),
            v_created_at, v_created_at,
            CASE WHEN v_status = 'cancelled' THEN v_created_at + INTERVAL '1 day' ELSE NULL END,
            CASE WHEN v_status = 'cancelled' THEN 'Cancelado pelo cliente' ELSE NULL END
        ) RETURNING id INTO v_order_id;

        -- Item do pedido
        INSERT INTO order_items (
            order_id, product_id, product_name, product_slug, product_image,
            quantity, unit_price, subtotal, created_at
        ) VALUES (
            v_order_id, v_product_id, v_product_name, v_product_slug, v_product_image,
            v_quantity, v_unit_price, v_subtotal, v_created_at
        );

        -- Pagamento
        INSERT INTO payments (
            order_id, method, status, amount,
            transaction_id, paid_at, created_at, updated_at
        ) VALUES (
            v_order_id, v_method, v_payment_status, v_total,
            'TXN-' || v_order_id || '-' || to_char(v_created_at, 'YYYYMMDDHH24MISS'),
            v_paid_at, v_created_at, v_created_at
        );

        -- Movimentação de estoque (saída) — apenas se pedido não foi cancelado
        IF v_status != 'cancelled' THEN
            INSERT INTO inventory_movements (
                product_id, movement_type, quantity, previous_quantity, new_quantity,
                reason, reference_type, reference_id, created_at
            ) VALUES (
                v_product_id, 'out', v_quantity,
                (SELECT stock_quantity FROM products WHERE id = v_product_id) + v_quantity,
                (SELECT stock_quantity FROM products WHERE id = v_product_id),
                'Venda', 'order', v_order_id, v_created_at
            );

            -- Incrementa sales_count do produto
            UPDATE products
            SET sales_count = sales_count + v_quantity
            WHERE id = v_product_id;
        END IF;
    END LOOP;
END $$;

-- ======================================================
-- LOTE 2 — 31 a 60 dias atrás (25 pedidos)
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

    products_pool INTEGER[] := ARRAY[1, 2, 3, 4, 6, 10, 11, 12, 20, 22, 24, 40, 50, 70, 73];
    users_pool INTEGER[] := ARRAY[2, 3, 4, 5, 6, 7, 8, 9, 10];

    i INTEGER;
    day_offset INTEGER;
BEGIN
    PERFORM setseed(0.77);

    FOR i IN 1..25 LOOP
        day_offset := 31 + floor(random() * 30)::int;
        v_created_at := NOW() - (day_offset || ' days')::interval - ((floor(random() * 24)) || ' hours')::interval;

        v_user_id := users_pool[1 + floor(random() * array_length(users_pool, 1))::int];
        v_product_id := products_pool[1 + floor(random() * array_length(products_pool, 1))::int];

        SELECT name, slug, price,
               (SELECT image_url FROM product_images WHERE product_id = products.id AND is_primary = true LIMIT 1)
        INTO v_product_name, v_product_slug, v_unit_price, v_product_image
        FROM products WHERE id = v_product_id;

        v_quantity := 1 + floor(random() * 2)::int;
        v_subtotal := v_unit_price * v_quantity;
        v_shipping := CASE WHEN v_subtotal >= 99.90 THEN 0 ELSE 19.90 END;
        v_total := v_subtotal + v_shipping;

        IF random() < 0.50 THEN v_method := 'pix';
        ELSIF random() < 0.85 THEN v_method := 'credit_card';
        ELSE v_method := 'boleto';
        END IF;

        DECLARE r DECIMAL := random();
        BEGIN
            IF r < 0.05 THEN
                v_status := 'pending'; v_payment_status := 'pending'; v_paid_at := NULL;
            ELSIF r < 0.30 THEN
                v_status := 'paid'; v_payment_status := 'paid';
                v_paid_at := v_created_at + ((floor(random() * 2)) || ' hours')::interval;
            ELSIF r < 0.55 THEN
                v_status := 'shipped'; v_payment_status := 'paid';
                v_paid_at := v_created_at + ((floor(random() * 2)) || ' hours')::interval;
            ELSIF r < 0.90 THEN
                v_status := 'delivered'; v_payment_status := 'paid';
                v_paid_at := v_created_at + ((floor(random() * 2)) || ' hours')::interval;
            ELSE
                v_status := 'cancelled'; v_payment_status := 'refunded'; v_paid_at := NULL;
            END IF;
        END;

        INSERT INTO orders (
            user_id, status, subtotal, shipping_cost, discount, total,
            payment_method, payment_status,
            shipping_cep, shipping_street, shipping_number, shipping_neighborhood, shipping_city, shipping_state,
            created_at, updated_at, cancelled_at, cancel_reason
        ) VALUES (
            v_user_id, v_status, v_subtotal, v_shipping, 0, v_total,
            v_method, v_payment_status,
            (SELECT cep FROM users WHERE id = v_user_id),
            (SELECT street FROM users WHERE id = v_user_id),
            (SELECT number FROM users WHERE id = v_user_id),
            (SELECT neighborhood FROM users WHERE id = v_user_id),
            (SELECT city FROM users WHERE id = v_user_id),
            (SELECT state FROM users WHERE id = v_user_id),
            v_created_at, v_created_at,
            CASE WHEN v_status = 'cancelled' THEN v_created_at + INTERVAL '2 days' ELSE NULL END,
            CASE WHEN v_status = 'cancelled' THEN 'Produto sem estoque' ELSE NULL END
        ) RETURNING id INTO v_order_id;

        INSERT INTO order_items (
            order_id, product_id, product_name, product_slug, product_image,
            quantity, unit_price, subtotal, created_at
        ) VALUES (
            v_order_id, v_product_id, v_product_name, v_product_slug, v_product_image,
            v_quantity, v_unit_price, v_subtotal, v_created_at
        );

        INSERT INTO payments (
            order_id, method, status, amount,
            transaction_id, paid_at, created_at, updated_at
        ) VALUES (
            v_order_id, v_method, v_payment_status, v_total,
            'TXN-' || v_order_id || '-' || to_char(v_created_at, 'YYYYMMDDHH24MISS'),
            v_paid_at, v_created_at, v_created_at
        );

        IF v_status != 'cancelled' THEN
            INSERT INTO inventory_movements (
                product_id, movement_type, quantity, previous_quantity, new_quantity,
                reason, reference_type, reference_id, created_at
            ) VALUES (
                v_product_id, 'out', v_quantity,
                (SELECT stock_quantity FROM products WHERE id = v_product_id) + v_quantity,
                (SELECT stock_quantity FROM products WHERE id = v_product_id),
                'Venda', 'order', v_order_id, v_created_at
            );

            UPDATE products SET sales_count = sales_count + v_quantity WHERE id = v_product_id;
        END IF;
    END LOOP;
END $$;

-- ======================================================
-- LOTE 3 — 61 a 90 dias atrás (15 pedidos)
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

    products_pool INTEGER[] := ARRAY[1, 2, 3, 4, 6, 11, 22, 40, 50, 73];
    users_pool INTEGER[] := ARRAY[2, 3, 4, 5, 6, 7];

    i INTEGER;
    day_offset INTEGER;
BEGIN
    PERFORM setseed(0.99);

    FOR i IN 1..15 LOOP
        day_offset := 61 + floor(random() * 30)::int;
        v_created_at := NOW() - (day_offset || ' days')::interval - ((floor(random() * 24)) || ' hours')::interval;

        v_user_id := users_pool[1 + floor(random() * array_length(users_pool, 1))::int];
        v_product_id := products_pool[1 + floor(random() * array_length(products_pool, 1))::int];

        SELECT name, slug, price,
               (SELECT image_url FROM product_images WHERE product_id = products.id AND is_primary = true LIMIT 1)
        INTO v_product_name, v_product_slug, v_unit_price, v_product_image
        FROM products WHERE id = v_product_id;

        v_quantity := 1 + floor(random() * 2)::int;
        v_subtotal := v_unit_price * v_quantity;
        v_shipping := CASE WHEN v_subtotal >= 99.90 THEN 0 ELSE 19.90 END;
        v_total := v_subtotal + v_shipping;

        IF random() < 0.55 THEN v_method := 'pix';
        ELSIF random() < 0.85 THEN v_method := 'credit_card';
        ELSE v_method := 'boleto';
        END IF;

        -- Lote antigo: maioria já entregue
        DECLARE r DECIMAL := random();
        BEGIN
            IF r < 0.05 THEN
                v_status := 'pending'; v_payment_status := 'pending'; v_paid_at := NULL;
            ELSIF r < 0.15 THEN
                v_status := 'paid'; v_payment_status := 'paid';
                v_paid_at := v_created_at + INTERVAL '1 day';
            ELSIF r < 0.30 THEN
                v_status := 'shipped'; v_payment_status := 'paid';
                v_paid_at := v_created_at + INTERVAL '1 day';
            ELSIF r < 0.90 THEN
                v_status := 'delivered'; v_payment_status := 'paid';
                v_paid_at := v_created_at + INTERVAL '1 day';
            ELSE
                v_status := 'cancelled'; v_payment_status := 'refunded'; v_paid_at := NULL;
            END IF;
        END;

        INSERT INTO orders (
            user_id, status, subtotal, shipping_cost, discount, total,
            payment_method, payment_status,
            shipping_cep, shipping_street, shipping_number, shipping_neighborhood, shipping_city, shipping_state,
            created_at, updated_at, cancelled_at, cancel_reason
        ) VALUES (
            v_user_id, v_status, v_subtotal, v_shipping, 0, v_total,
            v_method, v_payment_status,
            (SELECT cep FROM users WHERE id = v_user_id),
            (SELECT street FROM users WHERE id = v_user_id),
            (SELECT number FROM users WHERE id = v_user_id),
            (SELECT neighborhood FROM users WHERE id = v_user_id),
            (SELECT city FROM users WHERE id = v_user_id),
            (SELECT state FROM users WHERE id = v_user_id),
            v_created_at, v_created_at,
            CASE WHEN v_status = 'cancelled' THEN v_created_at + INTERVAL '3 days' ELSE NULL END,
            CASE WHEN v_status = 'cancelled' THEN 'Cancelado pelo cliente' ELSE NULL END
        ) RETURNING id INTO v_order_id;

        INSERT INTO order_items (
            order_id, product_id, product_name, product_slug, product_image,
            quantity, unit_price, subtotal, created_at
        ) VALUES (
            v_order_id, v_product_id, v_product_name, v_product_slug, v_product_image,
            v_quantity, v_unit_price, v_subtotal, v_created_at
        );

        INSERT INTO payments (
            order_id, method, status, amount,
            transaction_id, paid_at, created_at, updated_at
        ) VALUES (
            v_order_id, v_method, v_payment_status, v_total,
            'TXN-' || v_order_id || '-' || to_char(v_created_at, 'YYYYMMDDHH24MISS'),
            v_paid_at, v_created_at, v_created_at
        );

        IF v_status != 'cancelled' THEN
            INSERT INTO inventory_movements (
                product_id, movement_type, quantity, previous_quantity, new_quantity,
                reason, reference_type, reference_id, created_at
            ) VALUES (
                v_product_id, 'out', v_quantity,
                (SELECT stock_quantity FROM products WHERE id = v_product_id) + v_quantity,
                (SELECT stock_quantity FROM products WHERE id = v_product_id),
                'Venda', 'order', v_order_id, v_created_at
            );

            UPDATE products SET sales_count = sales_count + v_quantity WHERE id = v_product_id;
        END IF;
    END LOOP;
END $$;

-- ======================================================
-- MOVIMENTAÇÕES DE ENTRADA (reposições de estoque)
-- ======================================================
-- Entradas esporádicas ao longo dos 90 dias, com motivo variado
DO $$
DECLARE
    v_product_id INTEGER;
    v_qty INTEGER;
    v_day INTEGER;
    v_created_at TIMESTAMP;
    products_pool INTEGER[] := ARRAY[1, 3, 11, 22, 24, 40, 50, 70, 73, 80, 81];
    i INTEGER;
BEGIN
    PERFORM setseed(0.13);

    FOR i IN 1..30 LOOP
        v_product_id := products_pool[1 + floor(random() * array_length(products_pool, 1))::int];
        v_qty := 10 + floor(random() * 30)::int;
        v_day := floor(random() * 90)::int;
        v_created_at := NOW() - (v_day || ' days')::interval;

        INSERT INTO inventory_movements (
            product_id, movement_type, quantity,
            previous_quantity, new_quantity,
            reason, reference_type, reference_id, created_at
        ) VALUES (
            v_product_id, 'in', v_qty,
            (SELECT stock_quantity FROM products WHERE id = v_product_id),
            (SELECT stock_quantity FROM products WHERE id = v_product_id) + v_qty,
            CASE
                WHEN random() < 0.7 THEN 'Reposição de estoque'
                ELSE 'Devolução de cliente'
            END,
            'purchase',
            1000 + i,
            v_created_at
        );

        -- Atualiza estoque
        UPDATE products SET stock_quantity = stock_quantity + v_qty WHERE id = v_product_id;
        UPDATE inventory SET quantity = quantity + v_qty WHERE product_id = v_product_id;
    END LOOP;
END $$;

-- ======================================================
-- PROMOÇÕES
-- ======================================================
INSERT INTO promotions (
    id, name, description, code, discount_type, discount_value,
    min_purchase, usage_limit, user_limit, start_date, end_date,
    is_active, applies_to_all
) VALUES
(1, 'Primeira Compra 10% OFF', 'Ganhe 10% de desconto na sua primeira compra!',
 'PRIMEIRA10', 'percentage', 10, 100, 1000, 1,
 NOW() - INTERVAL '90 days', NOW() + INTERVAL '180 days', true, true),
(2, 'Frete Grátis acima de R$99', 'Frete grátis para compras acima de R$99,90!',
 'FRETE99', 'fixed', 25, 99.90, 5000, 1,
 NOW() - INTERVAL '90 days', NOW() + INTERVAL '180 days', true, true),
(3, 'Esportivos 20% OFF', 'Ganhe 20% de desconto em artigos esportivos!',
 'ESPORTE20', 'percentage', 20, 200, 500, 1,
 NOW() - INTERVAL '90 days', NOW() + INTERVAL '180 days', true, true);

-- ======================================================
-- AVALIAÇÕES (~30)
-- ======================================================
INSERT INTO product_reviews (product_id, user_id, rating, title, comment, is_verified_purchase, is_approved, helpful_count, created_at)
VALUES
(1,  2, 5, 'Excelente qualidade',      'A camisa é de ótimo tecido, caimento perfeito. Recomendo!', TRUE, TRUE, 12, NOW() - INTERVAL '60 days'),
(1,  3, 4, 'Muito boa, mas cara',      'A qualidade é indiscutível, porém o preço é salgado.',       TRUE, TRUE,  5, NOW() - INTERVAL '50 days'),
(1,  5, 5, 'Perfeita para trabalho',   'Uso no escritório e é super confortável.',                    TRUE, TRUE,  3, NOW() - INTERVAL '30 days'),
(2,  4, 5, 'Clássico atemporal',       'Fragrância marcante e sofisticada. Vale cada centavo.',       TRUE, TRUE, 20, NOW() - INTERVAL '55 days'),
(2,  6, 5, 'Maravilhoso!',             'Presenteei minha mãe e ela amou!',                            TRUE, TRUE,  8, NOW() - INTERVAL '40 days'),
(3,  7, 5, 'Melhor tênis que já usei', 'Amortecimento excelente, ideal para corridas longas.',        TRUE, TRUE, 15, NOW() - INTERVAL '45 days'),
(3,  3, 4, 'Bom, mas apertado',        'Tive que comprar meio número maior. Fora isso, ótimo.',       TRUE, TRUE,  6, NOW() - INTERVAL '25 days'),
(4,  2, 5, 'Apaixonada!',              'O tecido é leve e o caimento maravilhoso.',                   TRUE, TRUE, 10, NOW() - INTERVAL '35 days'),
(4,  4, 4, 'Bonito, mas curto',        'Achei mais curto do que na foto. Fora isso, lindo.',          TRUE, TRUE,  4, NOW() - INTERVAL '20 days'),
(5,  5, 4, 'Boa qualidade',            'Jeans resistente, cor exata. Só o tamanho que veio grande.',  TRUE, TRUE,  3, NOW() - INTERVAL '28 days'),
(6,  6, 5, 'Pele renovada!',           'Uso há 2 semanas e já vejo diferença. Recomendo muito.',      TRUE, TRUE, 18, NOW() - INTERVAL '22 days'),
(6,  2, 5, 'Melhor sérum',             'Hidrata muito bem e tem cheiro agradável.',                   TRUE, TRUE,  7, NOW() - INTERVAL '15 days'),
(10, 7, 4, 'Bom custo-benefício',      'Polo bonita e confortável. Tecido poderia ser mais grosso.',  TRUE, TRUE,  2, NOW() - INTERVAL '18 days'),
(11, 3, 5, 'Coringa!',                 'Comprei 3. Algodão macio e não encolheu na lavagem.',         TRUE, TRUE, 25, NOW() - INTERVAL '12 days'),
(11, 5, 5, 'Perfeita',                 'Básica que todo mundo precisa ter.',                          TRUE, TRUE,  8, NOW() - INTERVAL '10 days'),
(12, 7, 4, 'Elegante',                 'Caimento perfeito. Uso com camisa social ou polo.',           TRUE, TRUE,  6, NOW() - INTERVAL '8 days'),
(14, 5, 5, 'Sofisticado',              'Usei no meu casamento. Tecido impecável!',                    TRUE, TRUE, 11, NOW() - INTERVAL '5 days'),
(20, 6, 5, 'Deslumbrante',             'Usei em um evento e recebi vários elogios. Caimento ótimo!',  TRUE, TRUE, 14, NOW() - INTERVAL '45 days'),
(20, 4, 4, 'Elegante, mas pesado',     'O tecido é lindo mas achei um pouco pesado.',                 TRUE, TRUE,  3, NOW() - INTERVAL '30 days'),
(22, 2, 5, 'Modelagem perfeita',       'Valoriza o corpo sem apertar. Super recomendo.',              TRUE, TRUE,  9, NOW() - INTERVAL '20 days'),
(24, 4, 5, 'Super confortável',        'Tecido premium! Vou comprar em outras cores.',                TRUE, TRUE, 13, NOW() - INTERVAL '14 days'),
(40, 7, 5, 'Viciante',                 'Fragrância marcante, dura o dia todo. Recomendadíssimo.',     TRUE, TRUE, 22, NOW() - INTERVAL '40 days'),
(40, 3, 5, 'Melhor compra',            'Meu perfume favorito. Cheiro incrível.',                      TRUE, TRUE, 16, NOW() - INTERVAL '28 days'),
(50, 6, 5, 'Feminino e marcante',      'Perfume maravilhoso. Fixação excelente.',                     TRUE, TRUE, 19, NOW() - INTERVAL '35 days'),
(50, 2, 4, 'Bom, mas caro',            'Adoro a fragrância, só o preço que pesa.',                    TRUE, TRUE,  5, NOW() - INTERVAL '22 days'),
(70, 3, 5, 'Ideal para treino',        'Absorve suor muito bem. Não fica grudando.',                  TRUE, TRUE, 11, NOW() - INTERVAL '18 days'),
(73, 7, 5, 'Top para maratona',        'Corri 42km com ele sem dor. Recomendo!',                      TRUE, TRUE, 28, NOW() - INTERVAL '15 days'),
(73, 5, 4, 'Muito bom',                'Amortecimento ótimo. Só o design que poderia ser melhor.',    TRUE, TRUE,  6, NOW() - INTERVAL '10 days'),
(80, 2, 5, 'Sustentação perfeita',     'Ideal para corrida. Não deixa nada solto.',                   TRUE, TRUE, 14, NOW() - INTERVAL '8 days'),
(81, 4, 5, 'Maravilhosa',              'Não é transparente! Tecido grosso e modelador.',              TRUE, TRUE, 21, NOW() - INTERVAL '6 days'),
(81, 6, 5, 'Melhor legging',           'Comprei 3. Qualidade excelente.',                             TRUE, TRUE, 10, NOW() - INTERVAL '4 days');

-- ======================================================
-- RECALCULAR rating_avg E rating_count
-- ======================================================
UPDATE products p
SET
    rating_avg = COALESCE(
        (SELECT AVG(rating) FROM product_reviews
         WHERE product_id = p.id AND is_approved = TRUE),
        0
    ),
    rating_count = (
        SELECT COUNT(*) FROM product_reviews
        WHERE product_id = p.id AND is_approved = TRUE
    )
WHERE EXISTS (
    SELECT 1 FROM product_reviews WHERE product_id = p.id
);

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