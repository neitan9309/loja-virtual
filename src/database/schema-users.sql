-- ======================================================
-- LUXURY STORE - SCHEMA DE USUÁRIOS
-- Rode este arquivo para adicionar as tabelas de usuário
-- sem apagar os dados existentes.
--
-- Uso:
--   psql -U postgres -d luxury_store -f src/database/schema-users.sql
-- ======================================================

SET client_encoding = 'UTF8';

-- ======================================================
-- TABELA: USERS
-- ======================================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    birth_date DATE,
    gender VARCHAR(20) CHECK (gender IN ('masculino', 'feminino', 'outro', 'prefiro_nao_dizer')),
    phone VARCHAR(20),
    cpf VARCHAR(14) UNIQUE,

    -- Endereço
    cep VARCHAR(9),
    street VARCHAR(150),
    number VARCHAR(20),
    complement VARCHAR(100),
    neighborhood VARCHAR(100),
    city VARCHAR(100),
    state VARCHAR(2),

    -- Controle
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_cpf ON users(cpf);

-- ======================================================
-- TABELA: USER_SESSIONS (registro de logins)
-- ======================================================
CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    user_agent VARCHAR(255),
    ip_address VARCHAR(45),
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token);

-- ======================================================
-- TRIGGER: updated_at automático em users
-- ======================================================
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- ======================================================
-- VINCULAR PEDIDOS A USUÁRIOS (para o futuro)
-- ======================================================
-- Descomente quando implementar carrinho/pedidos:
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);

-- ======================================================
-- MENSAGEM FINAL
-- ======================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Schema de usuários aplicado com sucesso!';
    RAISE NOTICE '   Tabela users criada';
    RAISE NOTICE '   Tabela user_sessions criada';
END $$;