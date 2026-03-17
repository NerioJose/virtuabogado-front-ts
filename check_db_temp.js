const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.order.count();
  const allOrders = await prisma.order.findMany({
    include: {
      user: true,
      service: true
    }
  });
  console.log('Total orders:', count);
  console.log('Orders details:', JSON.stringify(allOrders.map(o => ({
    id: o.id,
    userId: o.userId,
    userEmail: o.user.email,
    status: o.status,
    total: o.total,
    createdAt: o.createdAt
  })), null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
