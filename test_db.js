const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.gfdkjdlshkqultympimw:cPaO9JgUeGlxxcDa@aws-0-us-west-2.pooler.supabase.com:6543/postgres'
});
async function run() {
  await client.connect();
  const res = await client.query('SELECT id, status, "userId", "paymentId" FROM "Order" ORDER BY "createdAt" DESC LIMIT 5');
  console.log(res.rows);
  await client.end();
}
run();
