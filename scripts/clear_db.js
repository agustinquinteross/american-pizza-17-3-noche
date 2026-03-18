const { Client } = require('pg');
const path = require('path');
const fs = require('fs');

// Intentar cargar variables de entorno
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

async function clearDatabase() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error('❌ Error: DATABASE_URL no encontrada.');
        process.exit(1);
    }

    const client = new Client({
        connectionString: connectionString,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        console.log('⏳ Conectando a Railway...');
        await client.connect();
        
        console.log('🔍 Identificando tablas...');
        const res = await client.query(`
            SELECT tablename 
            FROM pg_catalog.pg_tables 
            WHERE schemaname = 'public'
        `);
        
        const tables = res.rows
            .map(row => row.tablename)
            .filter(t => t !== 'spatial_ref_sys'); // Excluir tablas de sistema/extensiones

        if (tables.length === 0) {
            console.log('ℹ️ No se encontraron tablas para limpiar.');
            return;
        }

        console.log(`🧹 Vaciando ${tables.length} tablas: ${tables.join(', ')}...`);
        
        // TRUNCATE es mucho más rápido y limpio que DELETE para vaciar tablas completas
        const truncateQuery = `TRUNCATE TABLE ${tables.join(', ')} RESTART IDENTITY CASCADE;`;
        await client.query(truncateQuery);
        
        console.log('✨ Base de datos vaciada con éxito. La estructura se mantiene intacta.');

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await client.end();
    }
}

clearDatabase();
