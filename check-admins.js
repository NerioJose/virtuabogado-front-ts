const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const admins = await prisma.user.findMany({
    where: { rol: 'ADMIN' },
    select: { id: true, email: true, activo: true }
  });
  console.log('ADMINS FOUND:', JSON.stringify(admins, null, 2));
  
  const subscriptions = await prisma.pushSubscription.findMany({
    include: { user: { select: { email: true, rol: true } } }
  });
  console.log('TOTAL SUBSCRIPTIONS:', subscriptions.length);
  subscriptions.forEach(s => {
    console.log(`- Sub for ${s.user.email} (${s.user.rol}) endpoint: ${s.endpoint.substring(0, 30)}...`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
