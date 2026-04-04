const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.gfdkjdlshkqultympimw:cPaO9JgUeGlxxcDa@aws-0-us-west-2.pooler.supabase.com:6543/postgres'
});
async function run() {
  await client.connect();
  console.log("Connected");
  
  // Create a fake active user
  const fakeUserId = "00000000-0000-0000-0000-000000000001";
  await client.query('INSERT INTO "User" (id, email, nombre, rol, activo) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING', 
    [fakeUserId, 'test@test.com', 'test', 'CLIENTE', true]);
  console.log("Mock User created");

  // Get first service
  const serv = await client.query('SELECT id FROM "Service" LIMIT 1');
  if (!serv.rows.length) return console.log("No services");
  
  const pM = await client.query('SELECT id FROM "PaymentMethod" WHERE identifier=$1', ['zenobank']);
  
  if (!pM.rows.length) return console.log("No payment method");

  // Create fake order
  const orderId = "22222222-2222-2222-2222-222222222222";
  await client.query('INSERT INTO "Order" (id, "userId", "serviceId", "paymentMethodId", status, total) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT(id) DO NOTHING',
    [orderId, fakeUserId, serv.rows[0].id, pM.rows[0].id, 'PAGO_PENDIENTE', 10]);
  console.log("Order created! ID:", orderId);

  // Wait 3 seconds
  await new Promise(r => setTimeout(r, 3000));
  
  // Check if it still exists!
  const res = await client.query('SELECT id FROM "Order" WHERE id=$1', [orderId]);
  console.log("After 3 seconds, order is:", res.rows);
  
  await client.end();
}
run().catch(console.error);
