import pkg from 'pg';
const { Pool } = pkg;
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function main() {
    try {
        const { rows: authUsers } = await pool.query(`SELECT id, email, raw_user_meta_data FROM auth.users WHERE raw_user_meta_data->>'nombre' ILIKE '%Pérez%' OR raw_user_meta_data->>'nombre' ILIKE '%Martínez%'`);
        console.log('--- Usuarios en auth.users (Supabase) ---');
        authUsers.forEach(u => console.log(u.id, u.email, u.raw_user_meta_data));

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

main();
