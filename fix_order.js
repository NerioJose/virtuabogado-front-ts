const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const o = await prisma.order.findFirst({ orderBy:{createdAt:'desc'}});
    console.log("LAST ORDER:", o);
}
main().catch(console.error).finally(()=>prisma.$disconnect());
