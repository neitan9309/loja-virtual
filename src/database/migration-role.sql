-- ======================================================
-- MIGRATION: Adicionar coluna "role" em users
-- Rodar UMA VEZ no banco existente:
--   psql -U postgres -d luxury_store -f src/database/migration-role.sql
-- ======================================================

SET client_encoding = 'UTF8';

-- ======================================================
-- 1. Adiciona a coluna role
-- ======================================================
ALTER TABLE users
ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'customer'
CHECK (role IN ('customer', 'admin', 'moderator'));

-- ======================================================
-- 2. Índice para buscas por role
-- ======================================================
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ======================================================
-- 3. Cria usuário admin padrão
-- ======================================================
-- ⚠️ IMPORTANTE: gere o hash ANTES de rodar esta migration:
--
--   node -e "const b=require('bcrypt'); b.hash('Admin@2024', 10).then(h => console.log(h));"
--
-- Depois, cole o hash gerado no lugar de 'COLE_O_HASH_AQUI' abaixo.
--
-- Login: admin@luxurystore.com
-- Senha: Admin@2024  ← TROQUE APÓS O PRIMEIRO LOGIN
--
INSERT INTO users (
    full_name, email, password_hash, role, is_active, email_verified
) VALUES (
    'Administrador',
    'admin@luxurystore.com',
    'COLE_O_HASH_AQUI',
    'admin',
    TRUE,
    TRUE
)
ON CONFLICT (email) DO UPDATE
SET role = 'admin',
    is_active = TRUE,
    updated_at = CURRENT_TIMESTAMP;
-- ======================================================
-- 4. Verificação
-- ======================================================
DO $$
DECLARE
    admin_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO admin_count FROM users WHERE role = 'admin';
    RAISE NOTICE '✅ Migration aplicada. Admins no banco: %', admin_count;
    RAISE NOTICE '   Login: admin@luxurystore.com';
    RAISE NOTICE '   Senha: Admin@2024 (TROQUE APÓS LOGIN)';
END $$;