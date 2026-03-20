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
            SELECT id, status, "userId", "lawyerId", "createdAt", "updatedAt"
            FROM "Order" 
            ORDER BY "updatedAt" DESC
            LIMIT 5;
        `);
        console.log("=== Last 5 Orders ===");
        console.table(result.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

main();
