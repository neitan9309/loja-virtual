-- ======================================================
-- LUXURY STORE - SEEDS (DADOS DE EXEMPLO)
-- ======================================================
-- Uso:
--   psql -U postgres -d luxury_store -f src/database/seeds.sql
-- ======================================================

SET client_encoding = 'UTF8';

-- ======================================================
-- CATEGORIAS EM 3 NÍVEIS
-- ======================================================

-- NÍVEL 1: Categorias principais
INSERT INTO categories (id, name, slug, description, parent_id, sort_order, is_active) VALUES
(1, 'Vestuário',          'vestuario',           'Roupas e acessórios de moda',            NULL, 1, true),
(2, 'Perfumaria',         'perfumaria',          'Perfumes e fragrâncias',                 NULL, 2, true),
(3, 'Artigos Esportivos', 'artigos-esportivos',  'Equipamentos e roupas para esportes',    NULL, 3, true)
ON CONFLICT (id) DO NOTHING;

-- NÍVEL 2: Gênero
INSERT INTO categories (id, name, slug, description, parent_id, sort_order, is_active) VALUES
(10, 'Masculino', 'vestuario-masculino', 'Vestuário masculino', 1, 1, true),
(11, 'Feminino',  'vestuario-feminino',  'Vestuário feminino',  1, 2, true),
(12, 'Infantil',  'vestuario-infantil',  'Vestuário infantil',  1, 3, true),
(20, 'Masculino', 'perfumaria-masculino', 'Perfumes masculinos', 2, 1, true),
(21, 'Feminino',  'perfumaria-feminino',  'Perfumes femininos',  2, 2, true),
(22, 'Unissex',   'perfumaria-unissex',   'Perfumes unissex',    2, 3, true),
(30, 'Masculino', 'esportivos-masculino', 'Esportivos masculinos', 3, 1, true),
(31, 'Feminino',  'esportivos-feminino',  'Esportivos femininos',  3, 2, true),
(32, 'Infantil',  'esportivos-infantil',  'Esportivos infantis',   3, 3, true)
ON CONFLICT (id) DO NOTHING;

-- NÍVEL 3: Tipos
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
(1, 'Luxury', 'luxury', 'Marca própria da loja',                 NULL,                          true),
(2, 'Chanel', 'chanel', 'Marca de luxo francesa',                'https://www.chanel.com',      true),
(3, 'Dior',   'dior',   'Casa de moda francesa',                 'https://www.dior.com',        true),
(4, 'Nike',   'nike',   'Marca esportiva internacional',         'https://www.nike.com',        true),
(5, 'Adidas', 'adidas', 'Marca esportiva alemã',                 'https://www.adidas.com',      true),
(6, 'Zara',   'zara',   'Moda contemporânea',                    'https://www.zara.com',        true)
ON CONFLICT (id) DO NOTHING;

-- ======================================================
-- PRODUTOS (6 originais + 34 novos)
-- ======================================================
INSERT INTO products (
    id, name, slug, sku, description, short_description,
    category_id, brand_id, price, cost_price, discount_percent,
    stock_quantity, stock_status, is_active, is_featured, is_new, is_best_seller,
    sales_count, view_count, rating_avg, rating_count
) VALUES
-- ============ ORIGINAIS ============
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
 22, 175, 4.8, 12),

-- ============ VESTUÁRIO MASCULINO ============
(10, 'Camisa Polo Clássica', 'camisa-polo-classica', 'CAM-POL-M01',
 'Camisa polo masculina clássica em algodão piquê. Perfeita para looks casuais e esportivos.',
 'Camisa polo clássica',
 100, 1, 129.90, 60.00, 0, 40, 'in_stock', true, false, true, true,
 25, 180, 4.6, 12),

(11, 'Camiseta Básica Preta', 'camiseta-basica-preta', 'CAM-BAS-M02',
 'Camiseta básica preta 100% algodão. Peça coringa para qualquer guarda-roupa masculino.',
 'Camiseta básica preta',
 101, 1, 69.90, 25.00, 0, 80, 'in_stock', true, false, false, true,
 55, 320, 4.8, 32),

(12, 'Calça Chino Slim', 'calca-chino-slim', 'CAL-CHI-M03',
 'Calça chino masculina com corte slim. Elegante e confortável para o dia a dia.',
 'Calça chino slim',
 104, 1, 219.90, 100.00, 10, 35, 'in_stock', true, true, true, false,
 18, 140, 4.5, 9),

(13, 'Bermuda Sarja', 'bermuda-sarja', 'BER-SAR-M04',
 'Bermuda de sarja masculina com elástico oculto. Ideal para o verão.',
 'Bermuda de sarja',
 105, 1, 149.90, 65.00, 0, 45, 'in_stock', true, false, false, false,
 14, 95, 4.4, 6),

(14, 'Blazer Slim Fit', 'blazer-slim-fit', 'BLA-SLI-M05',
 'Blazer masculino slim fit em tecido premium. Ideal para ocasiões formais e casamentos.',
 'Blazer slim fit',
 102, 1, 599.90, 280.00, 15, 12, 'in_stock', true, true, true, false,
 9, 110, 4.9, 5),

(15, 'Cinto de Couro Legítimo', 'cinto-couro-legitimo', 'CIN-COU-M06',
 'Cinto masculino em couro legítimo com fivela metálica. Durável e elegante.',
 'Cinto de couro',
 106, 1, 179.90, 70.00, 0, 60, 'in_stock', true, false, false, false,
 20, 130, 4.7, 10),

-- ============ VESTUÁRIO FEMININO ============
(20, 'Vestido Longo Elegance', 'vestido-longo-elegance', 'VES-LON-F01',
 'Vestido longo feminino em tecido fluido. Perfeito para festas e eventos especiais.',
 'Vestido longo elegance',
 117, 1, 449.90, 200.00, 0, 18, 'in_stock', true, true, true, false,
 15, 200, 4.9, 8),

(21, 'Blusa de Seda', 'blusa-de-seda', 'BLU-SED-F02',
 'Blusa feminina em seda pura. Toque suave e caimento impecável.',
 'Blusa de seda',
 112, 6, 289.90, 130.00, 20, 22, 'in_stock', true, true, false, false,
 11, 145, 4.7, 7),

(22, 'Calça Jeans Skinny', 'calca-jeans-skinny', 'CAL-JEA-F03',
 'Calça jeans skinny feminina com elastano. Modelagem que valoriza o corpo.',
 'Calça jeans skinny',
 114, 6, 199.90, 90.00, 0, 55, 'in_stock', true, false, false, true,
 40, 280, 4.6, 20),

(23, 'Saia Midi Plissada', 'saia-midi-plissada', 'SAI-MID-F04',
 'Saia midi plissada feminina. Elegante e versátil, combina com diversos looks.',
 'Saia midi plissada',
 116, 6, 179.90, 80.00, 0, 30, 'in_stock', true, false, true, false,
 13, 100, 4.5, 6),

(24, 'Camiseta Oversized Branca', 'camiseta-oversized-branca', 'CAM-OVE-F05',
 'Camiseta oversized branca em algodão premium. Conforto e estilo em uma peça.',
 'Camiseta oversized',
 111, 1, 89.90, 35.00, 0, 70, 'in_stock', true, false, false, true,
 48, 350, 4.8, 25),

(25, 'Jaqueta Corta-Vento', 'jaqueta-corta-vento', 'JAQ-COR-F06',
 'Jaqueta corta-vento feminina impermeável. Ideal para dias chuvosos.',
 'Jaqueta corta-vento',
 113, 1, 259.90, 120.00, 10, 28, 'in_stock', true, false, true, false,
 16, 115, 4.4, 8),

(26, 'Bolsa Transversal Couro', 'bolsa-transversal-couro', 'BOL-TRA-F07',
 'Bolsa transversal feminina em couro sintético premium. Compartimentos internos organizados.',
 'Bolsa transversal',
 118, 6, 249.90, 110.00, 0, 25, 'in_stock', true, false, false, false,
 19, 160, 4.6, 11),

-- ============ VESTUÁRIO INFANTIL ============
(30, 'Camiseta Infantil Divertida', 'camiseta-infantil-divertida', 'CAM-INF-I01',
 'Camiseta infantil com estampa divertida. Algodão macio e confortável.',
 'Camiseta infantil divertida',
 120, 1, 49.90, 20.00, 0, 60, 'in_stock', true, false, true, false,
 30, 180, 4.9, 15),

(31, 'Conjunto Infantil Verão', 'conjunto-infantil-verao', 'CON-INF-I02',
 'Conjunto infantil de verão com camiseta e short. Tecido leve e fresco.',
 'Conjunto infantil verão',
 126, 1, 89.90, 40.00, 0, 40, 'in_stock', true, false, false, true,
 25, 200, 4.7, 13),

(32, 'Calça Legging Infantil', 'calca-legging-infantil', 'CAL-LEG-I03',
 'Calça legging infantil com cós elástico. Ideal para atividades físicas.',
 'Calça legging infantil',
 123, 1, 59.90, 25.00, 0, 55, 'in_stock', true, false, false, false,
 22, 140, 4.5, 9),

(33, 'Vestido Infantil Floral', 'vestido-infantil-floral', 'VES-INF-I04',
 'Vestido infantil floral em algodão. Delicado e confortável.',
 'Vestido infantil floral',
 125, 1, 119.90, 50.00, 15, 30, 'in_stock', true, true, true, false,
 18, 130, 4.8, 8),

-- ============ PERFUMARIA MASCULINA ============
(40, 'Eau de Parfum Sauvage', 'edp-sauvage', 'EDP-SAU-M01',
 'Fragrância masculina amadeirada, fresca e marcante. Para o homem moderno.',
 'Eau de Parfum Sauvage',
 200, 3, 649.90, 320.00, 0, 25, 'in_stock', true, true, false, true,
 35, 280, 4.9, 18),

(41, 'Eau de Toilette Bleu', 'edt-bleu', 'EDT-BLE-M02',
 'Eau de Toilette masculino aromático. Fresco e versátil para o dia a dia.',
 'Eau de Toilette Bleu',
 201, 3, 499.90, 240.00, 10, 30, 'in_stock', true, false, true, false,
 22, 180, 4.7, 11),

(42, 'Colônia Sport Masculina', 'colonia-sport-masculina', 'COL-SPO-M03',
 'Colônia masculina esportiva. Perfeita para o pós-treino.',
 'Colônia Sport',
 202, 1, 189.90, 80.00, 0, 45, 'in_stock', true, false, false, false,
 28, 210, 4.5, 14),

-- ============ PERFUMARIA FEMININA ============
(50, 'Eau de Parfum J''adore', 'edp-jadore', 'EDP-JAD-F01',
 'Fragrância feminina floral sofisticada. Elegante e marcante.',
 'Eau de Parfum J''adore',
 210, 3, 749.90, 380.00, 0, 20, 'in_stock', true, true, false, true,
 40, 340, 4.9, 22),

(51, 'Eau de Toilette Miss Dior', 'edt-miss-dior', 'EDT-MIS-F02',
 'Eau de Toilette feminino floral frutado. Jovem e romântico.',
 'Eau de Toilette Miss Dior',
 211, 3, 599.90, 280.00, 15, 28, 'in_stock', true, true, true, false,
 30, 260, 4.8, 16),

(52, 'Colônia Flor de Cerejeira', 'colonia-flor-cerejeira', 'COL-FLO-F03',
 'Colônia feminina delicada com notas florais. Ideal para o dia a dia.',
 'Colônia Flor de Cerejeira',
 212, 1, 159.90, 70.00, 0, 50, 'in_stock', true, false, false, false,
 24, 190, 4.6, 12),

-- ============ PERFUMARIA UNISSEX ============
(60, 'Eau de Parfum Unissex Woody', 'edp-unissex-woody', 'EDP-UNI-U01',
 'Fragrância unissex amadeirada. Sofisticada e atemporal.',
 'Eau de Parfum Woody',
 220, 3, 549.90, 260.00, 0, 22, 'in_stock', true, false, true, false,
 18, 150, 4.7, 9),

-- ============ ESPORTIVOS MASCULINO ============
(70, 'Camiseta Dry Fit Masculina', 'camiseta-dry-fit-masculina', 'CAM-DRY-M01',
 'Camiseta esportiva masculina com tecnologia dry fit. Absorve o suor rapidamente.',
 'Camiseta dry fit',
 300, 4, 119.90, 55.00, 0, 65, 'in_stock', true, false, true, true,
 45, 320, 4.8, 22),

(71, 'Shorts Corrida Masculino', 'shorts-corrida-masculino', 'SHO-COR-M02',
 'Shorts de corrida masculino com bolso interno e cós elástico.',
 'Shorts de corrida',
 301, 4, 149.90, 65.00, 10, 40, 'in_stock', true, false, false, false,
 25, 180, 4.6, 11),

(72, 'Calça Legging Esportiva Masculina', 'calca-legging-esportiva-masculina', 'CAL-LEG-M03',
 'Calça legging esportiva masculina. Compressão e suporte para treinos intensos.',
 'Calça legging esportiva',
 302, 5, 189.90, 85.00, 0, 35, 'in_stock', true, false, false, false,
 20, 145, 4.5, 9),

(73, 'Tênis Running Ultra', 'tenis-running-ultra', 'TEN-RUN-M04',
 'Tênis de running com amortecimento de alto impacto. Ideal para maratonas.',
 'Tênis running ultra',
 303, 5, 499.90, 240.00, 20, 28, 'in_stock', true, true, true, false,
 38, 290, 4.9, 18),

-- ============ ESPORTIVOS FEMININO ============
(80, 'Top Esportivo Feminino', 'top-esportivo-feminino', 'TOP-ESP-F01',
 'Top esportivo feminino com sustentação média. Ideal para corrida e academia.',
 'Top esportivo',
 310, 4, 129.90, 55.00, 0, 50, 'in_stock', true, false, true, true,
 40, 280, 4.8, 20),

(81, 'Legging Fitness Feminina', 'legging-fitness-feminina', 'LEG-FIT-F02',
 'Legging fitness feminina de alta compressão. Modelagem anatômica.',
 'Legging fitness',
 312, 4, 169.90, 75.00, 10, 45, 'in_stock', true, true, false, true,
 38, 260, 4.7, 18),

(82, 'Tênis Feminino Coral', 'tenis-feminino-coral', 'TEN-COR-F03',
 'Tênis feminino com design moderno e cores vibrantes. Confortável e estiloso.',
 'Tênis feminino coral',
 313, 5, 399.90, 190.00, 0, 32, 'in_stock', true, false, true, false,
 28, 210, 4.6, 14),

-- ============ ESPORTIVOS INFANTIL ============
(90, 'Camiseta Esportiva Infantil', 'camiseta-esportiva-infantil', 'CAM-ESP-I01',
 'Camiseta esportiva infantil com proteção UV. Ideal para esportes ao ar livre.',
 'Camiseta esportiva infantil',
 320, 4, 79.90, 35.00, 0, 55, 'in_stock', true, false, true, false,
 22, 160, 4.7, 10),

(91, 'Tênis Infantil Colorido', 'tenis-infantil-colorido', 'TEN-INF-I02',
 'Tênis infantil colorido com velcro. Fácil de calçar e super confortável.',
 'Tênis infantil colorido',
 322, 5, 229.90, 100.00, 15, 40, 'in_stock', true, false, false, false,
 18, 130, 4.8, 9)

ON CONFLICT (id) DO NOTHING;

-- ======================================================
-- IMAGENS DOS PRODUTOS
-- ======================================================
INSERT INTO product_images (product_id, image_url, alt_text, is_primary, sort_order) VALUES
-- Camisa Social Slim
(1, 'https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=800', 'Camisa Social Slim - Vista frontal', true, 0),
(1, 'https://images.pexels.com/photos/297933/pexels-photo-297933.jpeg?auto=compress&cs=tinysrgb&w=800', 'Camisa Social Slim - Detalhe', false, 1),
-- Perfume Chanel Nº5
(2, 'https://images.pexels.com/photos/9659891/pexels-photo-9659891.jpeg?auto=compress&cs=tinysrgb&w=800', 'Perfume Chanel Nº5', true, 0),
-- Tênis de Corrida Pro
(3, 'https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&w=800', 'Tênis de Corrida Pro', true, 0),
-- Vestido Midi Floral
(4, 'https://images.pexels.com/photos/985635/pexels-photo-985635.jpeg?auto=compress&cs=tinysrgb&w=800', 'Vestido Midi Floral', true, 0),
-- Jaqueta Jeans Masculina
(5, 'https://images.pexels.com/photos/1183266/pexels-photo-1183266.jpeg?auto=compress&cs=tinysrgb&w=800', 'Jaqueta Jeans Masculina', true, 0),
-- Sérum Facial Premium
(6, 'https://images.pexels.com/photos/4465124/pexels-photo-4465124.jpeg?auto=compress&cs=tinysrgb&w=800', 'Sérum Facial Premium', true, 0),

-- Vestuário Masculino
(10, 'https://images.pexels.com/photos/1040945/pexels-photo-1040945.jpeg?auto=compress&cs=tinysrgb&w=800', 'Camisa Polo Clássica', true, 0),
(11, 'https://images.pexels.com/photos/8532616/pexels-photo-8532616.jpeg?auto=compress&cs=tinysrgb&w=800', 'Camiseta Básica Preta', true, 0),
(12, 'https://images.pexels.com/photos/1598507/pexels-photo-1598507.jpeg?auto=compress&cs=tinysrgb&w=800', 'Calça Chino Slim', true, 0),
(13, 'https://images.pexels.com/photos/1598508/pexels-photo-1598508.jpeg?auto=compress&cs=tinysrgb&w=800', 'Bermuda Sarja', true, 0),
(14, 'https://images.pexels.com/photos/1043476/pexels-photo-1043476.jpeg?auto=compress&cs=tinysrgb&w=800', 'Blazer Slim Fit', true, 0),
(15, 'https://images.pexels.com/photos/45055/pexels-photo-45055.jpeg?auto=compress&cs=tinysrgb&w=800', 'Cinto de Couro Legítimo', true, 0),

-- Vestuário Feminino
(20, 'https://images.pexels.com/photos/1755428/pexels-photo-1755428.jpeg?auto=compress&cs=tinysrgb&w=800', 'Vestido Longo Elegance', true, 0),
(21, 'https://images.pexels.com/photos/985635/pexels-photo-985635.jpeg?auto=compress&cs=tinysrgb&w=800', 'Blusa de Seda', true, 0),
(22, 'https://images.pexels.com/photos/1598507/pexels-photo-1598507.jpeg?auto=compress&cs=tinysrgb&w=800', 'Calça Jeans Skinny', true, 0),
(23, 'https://images.pexels.com/photos/9558580/pexels-photo-9558580.jpeg?auto=compress&cs=tinysrgb&w=800', 'Saia Midi Plissada', true, 0),
(24, 'https://images.pexels.com/photos/8532616/pexels-photo-8532616.jpeg?auto=compress&cs=tinysrgb&w=800', 'Camiseta Oversized Branca', true, 0),
(25, 'https://images.pexels.com/photos/1183266/pexels-photo-1183266.jpeg?auto=compress&cs=tinysrgb&w=800', 'Jaqueta Corta-Vento', true, 0),
(26, 'https://images.pexels.com/photos/1152077/pexels-photo-1152077.jpeg?auto=compress&cs=tinysrgb&w=800', 'Bolsa Transversal Couro', true, 0),

-- Vestuário Infantil
(30, 'https://images.pexels.com/photos/35537/child-children-girl-happy.jpg?auto=compress&cs=tinysrgb&w=800', 'Camiseta Infantil Divertida', true, 0),
(31, 'https://images.pexels.com/photos/1619860/pexels-photo-1619860.jpeg?auto=compress&cs=tinysrgb&w=800', 'Conjunto Infantil Verão', true, 0),
(32, 'https://images.pexels.com/photos/35537/child-children-girl-happy.jpg?auto=compress&cs=tinysrgb&w=800', 'Calça Legging Infantil', true, 0),
(33, 'https://images.pexels.com/photos/1619860/pexels-photo-1619860.jpeg?auto=compress&cs=tinysrgb&w=800', 'Vestido Infantil Floral', true, 0),

-- Perfumaria Masculina
(40, 'https://images.pexels.com/photos/1961795/pexels-photo-1961795.jpeg?auto=compress&cs=tinysrgb&w=800', 'Eau de Parfum Sauvage', true, 0),
(41, 'https://images.pexels.com/photos/3059609/pexels-photo-3059609.jpeg?auto=compress&cs=tinysrgb&w=800', 'Eau de Toilette Bleu', true, 0),
(42, 'https://images.pexels.com/photos/1961795/pexels-photo-1961795.jpeg?auto=compress&cs=tinysrgb&w=800', 'Colônia Sport Masculina', true, 0),

-- Perfumaria Feminina
(50, 'https://images.pexels.com/photos/9659891/pexels-photo-9659891.jpeg?auto=compress&cs=tinysrgb&w=800', 'Eau de Parfum J''adore', true, 0),
(51, 'https://images.pexels.com/photos/3059609/pexels-photo-3059609.jpeg?auto=compress&cs=tinysrgb&w=800', 'Eau de Toilette Miss Dior', true, 0),
(52, 'https://images.pexels.com/photos/9659891/pexels-photo-9659891.jpeg?auto=compress&cs=tinysrgb&w=800', 'Colônia Flor de Cerejeira', true, 0),

-- Perfumaria Unissex
(60, 'https://images.pexels.com/photos/3059609/pexels-photo-3059609.jpeg?auto=compress&cs=tinysrgb&w=800', 'Eau de Parfum Woody', true, 0),

-- Esportivos Masculino
(70, 'https://images.pexels.com/photos/2294361/pexels-photo-2294361.jpeg?auto=compress&cs=tinysrgb&w=800', 'Camiseta Dry Fit Masculina', true, 0),
(71, 'https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=800', 'Shorts Corrida Masculino', true, 0),
(72, 'https://images.pexels.com/photos/1552252/pexels-photo-1552252.jpeg?auto=compress&cs=tinysrgb&w=800', 'Calça Legging Esportiva Masculina', true, 0),
(73, 'https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&w=800', 'Tênis Running Ultra', true, 0),

-- Esportivos Feminino
(80, 'https://images.pexels.com/photos/3757952/pexels-photo-3757952.jpeg?auto=compress&cs=tinysrgb&w=800', 'Top Esportivo Feminino', true, 0),
(81, 'https://images.pexels.com/photos/3757952/pexels-photo-3757952.jpeg?auto=compress&cs=tinysrgb&w=800', 'Legging Fitness Feminina', true, 0),
(82, 'https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&w=800', 'Tênis Feminino Coral', true, 0),

-- Esportivos Infantil
(90, 'https://images.pexels.com/photos/2294361/pexels-photo-2294361.jpeg?auto=compress&cs=tinysrgb&w=800', 'Camiseta Esportiva Infantil', true, 0),
(91, 'https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&w=800', 'Tênis Infantil Colorido', true, 0);

-- ======================================================
-- ESTOQUE INICIAL
-- ======================================================
INSERT INTO inventory (product_id, quantity, min_quantity, location) VALUES
(1, 50, 5, 'Prateleira A-1'),
(2, 20, 3, 'Prateleira B-2'),
(3, 30, 5, 'Prateleira C-1'),
(4, 25, 5, 'Prateleira A-3'),
(5, 15, 3, 'Prateleira A-4'),
(6, 40, 5, 'Prateleira B-1'),
(10, 40, 5, 'Prateleira A-1'),
(11, 80, 10, 'Prateleira A-2'),
(12, 35, 5, 'Prateleira A-3'),
(13, 45, 5, 'Prateleira A-4'),
(14, 12, 2, 'Prateleira A-5'),
(15, 60, 10, 'Prateleira A-6'),
(20, 18, 3, 'Prateleira B-1'),
(21, 22, 3, 'Prateleira B-2'),
(22, 55, 10, 'Prateleira B-3'),
(23, 30, 5, 'Prateleira B-4'),
(24, 70, 10, 'Prateleira B-5'),
(25, 28, 5, 'Prateleira B-6'),
(26, 25, 3, 'Prateleira B-7'),
(30, 60, 10, 'Prateleira C-1'),
(31, 40, 5, 'Prateleira C-2'),
(32, 55, 10, 'Prateleira C-3'),
(33, 30, 5, 'Prateleira C-4'),
(40, 25, 3, 'Prateleira D-1'),
(41, 30, 5, 'Prateleira D-2'),
(42, 45, 5, 'Prateleira D-3'),
(50, 20, 3, 'Prateleira D-4'),
(51, 28, 5, 'Prateleira D-5'),
(52, 50, 10, 'Prateleira D-6'),
(60, 22, 3, 'Prateleira D-7'),
(70, 65, 10, 'Prateleira E-1'),
(71, 40, 5, 'Prateleira E-2'),
(72, 35, 5, 'Prateleira E-3'),
(73, 28, 5, 'Prateleira E-4'),
(80, 50, 10, 'Prateleira E-5'),
(81, 45, 5, 'Prateleira E-6'),
(82, 32, 5, 'Prateleira E-7'),
(90, 55, 10, 'Prateleira F-1'),
(91, 40, 5, 'Prateleira F-2');

-- ======================================================
-- MOVIMENTAÇÕES DE ESTOQUE (amostra)
-- ======================================================
INSERT INTO inventory_movements (
    product_id, movement_type, quantity, previous_quantity, new_quantity,
    reason, reference_type, reference_id, notes, created_at
) VALUES
(1, 'in',  80, 0,  80, 'Estoque inicial', 'purchase', 1001, 'Carga inicial', NOW() - INTERVAL '30 days'),
(1, 'out', 10, 80, 70, 'Venda',           'order',    2001, 'Pedido #2001',   NOW() - INTERVAL '25 days'),
(1, 'out', 20, 70, 50, 'Venda',           'order',    2002, 'Pedido #2002',   NOW() - INTERVAL '15 days'),
(2, 'in',  30, 0,  30, 'Estoque inicial', 'purchase', 1002, 'Importação',    NOW() - INTERVAL '28 days'),
(2, 'out', 10, 30, 20, 'Venda',           'order',    2003, 'Pedido #2003',   NOW() - INTERVAL '12 days'),
(3, 'in',  50, 0,  50, 'Estoque inicial', 'purchase', 1003, 'Fornecedor',    NOW() - INTERVAL '27 days'),
(3, 'out', 20, 50, 30, 'Venda',           'order',    2004, 'Pedido #2004',   NOW() - INTERVAL '10 days'),
(4, 'in',  30, 0,  30, 'Estoque inicial', 'purchase', 1004, 'Coleção verão', NOW() - INTERVAL '26 days'),
(4, 'out',  5, 30, 25, 'Venda',           'order',    2005, 'Pedido #2005',   NOW() - INTERVAL '8 days'),
(10, 'in', 50, 0, 50, 'Estoque inicial', 'purchase', 1005, 'Reposição',      NOW() - INTERVAL '20 days'),
(10, 'out', 10, 50, 40, 'Venda',         'order',    2006, 'Pedido #2006',   NOW() - INTERVAL '5 days'),
(11, 'in', 100, 0, 100, 'Estoque inicial', 'purchase', 1006, 'Carga grande', NOW() - INTERVAL '18 days'),
(11, 'out', 20, 100, 80, 'Venda',         'order',    2007, 'Pedido #2007', NOW() - INTERVAL '3 days'),
(40, 'in', 30, 0, 30, 'Estoque inicial', 'purchase', 1007, 'Importação',   NOW() - INTERVAL '22 days'),
(40, 'out', 5, 30, 25, 'Venda',         'order',    2008, 'Pedido #2008', NOW() - INTERVAL '7 days'),
(50, 'in', 25, 0, 25, 'Estoque inicial', 'purchase', 1008, 'Importação',   NOW() - INTERVAL '21 days'),
(50, 'out', 5, 25, 20, 'Venda',         'order',    2009, 'Pedido #2009', NOW() - INTERVAL '6 days'),
(73, 'in', 35, 0, 35, 'Estoque inicial', 'purchase', 1009, 'Nike oficial', NOW() - INTERVAL '19 days'),
(73, 'out', 7, 35, 28, 'Venda',         'order',    2010, 'Pedido #2010', NOW() - INTERVAL '4 days');

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