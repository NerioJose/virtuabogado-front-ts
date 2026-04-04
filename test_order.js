const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const o = await prisma.order.findUnique({ where: { id: "32ab7c0e-e354-4203-abfe-2df483e3ac51" }});
    console.log("ORDER =>", o);
}
main().catch(console.error).finally(()=>prisma.$disconnect());
