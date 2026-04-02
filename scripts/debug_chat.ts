import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const orderId = 'a9611665-aa9d-4903-ae56-ec1f57defea1';
    
    console.log('--- Order Details ---');
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
            user: true,
            lawyer: true
        }
    });
    console.log(JSON.stringify(order, null, 2));

    console.log('\n--- Recent Messages ---');
    const messages = await prisma.message.findMany({
        where: { orderId },
        orderBy: { createdAt: 'desc' },
        take: 10
    });
    console.log(JSON.stringify(messages, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
