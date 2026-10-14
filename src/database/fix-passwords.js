// ======================================================
// src/database/fix-passwords.js
// Corrige os hashes das senhas dos usuários de teste
// Uso: node src/database/fix-passwords.js
// ======================================================
require('dotenv').config();
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

async function fixPasswords() {
    console.log('🔐 Corrigindo hashes das senhas...\n');

    try {
        // Gera hashes
        const hashAdmin = await bcrypt.hash('Admin@2024', 10);
        const hashCliente = await bcrypt.hash('senha123', 10);

        // Admin
        const r1 = await pool.query(
            'UPDATE users SET password_hash = $1 WHERE email = $2',
            [hashAdmin, 'admin@luxurystore.com']
        );
        console.log(`✅ Admin: ${r1.rowCount} linha(s) atualizada(s)`);

        // Clientes
        const r2 = await pool.query(
            "UPDATE users SET password_hash = $1 WHERE email LIKE '%@teste.com'",
            [hashCliente]
        );
        console.log(`✅ Clientes de teste: ${r2.rowCount} linha(s) atualizada(s)`);

        console.log('\n🎉 Senhas corrigidas:');
        console.log('   admin@luxurystore.com      → Admin@2024');
        console.log('   %@teste.com                → senha123');
    } catch (err) {
        console.error('❌ Erro:', err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

fixPasswords();