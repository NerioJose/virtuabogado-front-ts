require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const { Client } = require('pg');

async function main() {
    const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!dbUrl) {
        console.error("DATABASE_URL no encontrada en .env");
        return;
    }

    const client = new Client({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        const result = await client.query(`
            SELECT polname, polcmd, polqual
            FROM pg_policy 
            WHERE polrelid = '"Order"'::regclass;
        `);
        console.log("=== RLS Policies for 'Order' ===");
        console.table(result.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

main();
