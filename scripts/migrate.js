const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Intentar cargar dotenv si existe, si no, buscar manualmente en .env
try {
    require('dotenv').config();
} catch (e) {
    const envPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf8');
        envConfig.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) process.env[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
        });
    }
}

async function migrate() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error('❌ Error: DATABASE_URL no encontrada en el archivo .env');
        process.exit(1);
    }

    const client = new Client({
        connectionString: connectionString,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        console.log('⏳ Conectando a la base de datos en Railway...');
        await client.connect();
        console.log('✅ Conexión establecida.');

        const sqlPath = path.join(__dirname, '..', 'database_sync.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('🚀 Ejecutando script de sincronización...');
        await client.query(sql);
        console.log('✨ Base de datos sincronizada con éxito.');

    } catch (err) {
        console.error('❌ Error durante la migración:', err.message);
    } finally {
        await client.end();
    }
}

migrate();
