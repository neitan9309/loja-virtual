// ======================================================
// db-reset.js
// Reset COMPLETO do banco: dropa, cria, schema, seeds, senhas
// Uso: node db-reset.js
// ======================================================
require('dotenv').config();
const { Pool } = require('pg');
const { execSync } = require('child_process');
const path = require('path');
const bcrypt = require('bcrypt');
const fs = require('fs');

const DB_NAME = process.env.DB_NAME || 'luxury_store';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASS = process.env.DB_PASSWORD || 'postgres';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 5432;

// Caminhos
const SCHEMA_PATH = path.join(__dirname, 'src', 'database', 'schema.sql');
const SEEDS_PATH = path.join(__dirname, 'src', 'database', 'seeds.sql');

// ======================================================
// HELPERS
// ======================================================
function log(msg, type = 'info') {
    const icons = { info: 'ℹ️ ', success: '✅', error: '❌', warn: '⚠️ ' };
    console.log(`${icons[type]} ${msg}`);
}

function execPsql(command) {
    const env = { ...process.env, PGPASSWORD: DB_PASS };
    return execSync(`psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -c "${command}"`, {
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
    });
}

function execPsqlFile(file) {
    const env = { ...process.env, PGPASSWORD: DB_PASS };
    return execSync(`psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -f "${file}"`, {
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
    });
}

// ======================================================
// PASSO 1: Drop + Create
// ======================================================
async function dropAndCreate() {
    log(`Dropando banco "${DB_NAME}"...`);
    try {
        execPsql(`DROP DATABASE IF EXISTS ${DB_NAME}`);
        log('Banco dropado.', 'success');
    } catch (err) {
        log('Banco não existia (ok).', 'warn');
    }

    log(`Criando banco "${DB_NAME}"...`);
    execPsql(`CREATE DATABASE ${DB_NAME}`);
    log('Banco criado.', 'success');
}

// ======================================================
// PASSO 2: Rodar schema.sql
// ======================================================
function runSchema() {
    log('Aplicando schema.sql...');
    if (!fs.existsSync(SCHEMA_PATH)) {
        log(`Arquivo não encontrado: ${SCHEMA_PATH}`, 'error');
        process.exit(1);
    }
    try {
        execPsqlFile(SCHEMA_PATH);
        log('Schema aplicado.', 'success');
    } catch (err) {
        log('Erro ao aplicar schema.', 'error');
        console.error(err.stderr?.toString() || err.message);
        process.exit(1);
    }
}

// ======================================================
// PASSO 3: Rodar seeds.sql
// ======================================================
function runSeeds() {
    log('Aplicando seeds.sql...');
    if (!fs.existsSync(SEEDS_PATH)) {
        log(`Arquivo não encontrado: ${SEEDS_PATH}`, 'error');
        process.exit(1);
    }
    try {
        execPsqlFile(SEEDS_PATH);
        log('Seeds aplicados.', 'success');
    } catch (err) {
        log('Erro ao aplicar seeds.', 'error');
        console.error(err.stderr?.toString() || err.message);
        process.exit(1);
    }
}

// ======================================================
// PASSO 4: Corrigir hashes das senhas
// ======================================================
async function fixPasswords() {
    log('Corrigindo hashes das senhas...');
    const pool = new Pool({
        host: DB_HOST,
        port: DB_PORT,
        user: DB_USER,
        password: DB_PASS,
        database: DB_NAME,
    });

    try {
        const hashAdmin = await bcrypt.hash('Admin@2024', 10);
        const hashCliente = await bcrypt.hash('senha123', 10);

        await pool.query(
            'UPDATE users SET password_hash = $1 WHERE email = $2',
            [hashAdmin, 'admin@luxurystore.com']
        );
        await pool.query(
            "UPDATE users SET password_hash = $1 WHERE email LIKE '%@teste.com'",
            [hashCliente]
        );

        log('Hashers corrigidos.', 'success');
    } catch (err) {
        log(`Erro ao corrigir senhas: ${err.message}`, 'error');
    } finally {
        await pool.end();
    }
}

// ======================================================
// MAIN
// ======================================================
async function main() {
    console.log('\n═══════════════════════════════════════════════');
    console.log('  🗄️  LUXURY STORE — RESET DO BANCO DE DADOS');
    console.log('═══════════════════════════════════════════════\n');

    try {
        await dropAndCreate();
        console.log('');
        runSchema();
        console.log('');
        runSeeds();
        console.log('');
        await fixPasswords();

        console.log('\n═══════════════════════════════════════════════');
        log('🎉 Banco resetado com sucesso!', 'success');
        console.log('═══════════════════════════════════════════════\n');
        console.log('Credenciais:');
        console.log('  👑 Admin:  admin@luxurystore.com  / Admin@2024');
        console.log('  👤 Maria:  maria.silva@teste.com   / senha123');
        console.log('  👤 João:   joao.santos@teste.com   / senha123');
        console.log('  👤 Ana:    ana.costa@teste.com     / senha123');
        console.log('  👤 Pedro:  pedro.oliveira@teste.com / senha123');
        console.log('  👤 Carla:  carla.mendes@teste.com  / senha123');
        console.log('  👤 Lucas:  lucas.pereira@teste.com / senha123\n');
    } catch (err) {
        console.error('\n❌ Erro durante o reset:');
        console.error(err.message);
        process.exit(1);
    }
}

main();