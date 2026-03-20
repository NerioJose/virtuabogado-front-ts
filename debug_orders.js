require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const { Client } = require('pg');

async function main() {
    const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    const client = new Client({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        const result = await client.query(`
            SELECT 
                o.id as "order_id", 
                o.status, 
                u.email as "client_email",
                u.nombre as "client_name",
                s.titulo as "service_name"
            FROM "Order" o
            JOIN "User" u ON o."userId" = u.id
            JOIN "Service" s ON o."serviceId" = s.id
            WHERE u.nombre ILIKE '%nerio%' OR u.email ILIKE '%nerio%';
        `);
        console.table(result.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

main();
