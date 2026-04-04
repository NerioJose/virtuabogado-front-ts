import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const o = await prisma.order.findUnique({ where: { id: "32ab7c0e-e354-4203-abfe-2df483e3ac51" }});
    console.log("ORDER =>", o);
    const orders = await prisma.order.findMany({
        take: 3,
        orderBy: { createdAt: 'desc' }
    });
    console.log("LAST 3 ORDERS =>", orders.map(o => ({id: o.id, user: o.userId})));
}
main().catch(console.error).finally(()=>prisma.$disconnect());
