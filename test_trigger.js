const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.gfdkjdlshkqultympimw:cPaO9JgUeGlxxcDa@aws-0-us-west-2.pooler.supabase.com:6543/postgres'
});
async function run() {
  await client.connect();
  const res = await client.query(`
    SELECT event_object_table AS table_name, trigger_name, event_manipulation AS event, action_statement
    FROM information_schema.triggers
    WHERE trigger_schema = 'public' AND event_object_table = 'Order';
  `);
  console.log("TRIGGERS ON Order:", res.rows);
  const res2 = await client.query(`
    SELECT event_object_table AS table_name, trigger_name, event_manipulation AS event, action_statement
    FROM information_schema.triggers
    WHERE trigger_schema = 'public' AND event_object_table = 'User';
  `);
  console.log("TRIGGERS ON User:", res2.rows);
  await client.end();
}
run();
