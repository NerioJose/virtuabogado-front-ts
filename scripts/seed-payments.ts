import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    await prisma.paymentMethod.upsert({
        where: { identifier: 'stripe' },
        update: { isActive: true, name: 'Tarjeta de Crédito / Débito' },
        create: { identifier: 'stripe', name: 'Tarjeta de Crédito / Débito', isActive: true }
    });
    await prisma.paymentMethod.upsert({
        where: { identifier: 'zenobank' },
        update: { isActive: true, name: 'Pago con Criptomonedas (Zenobank)' },
        create: { identifier: 'zenobank', name: 'Pago con Criptomonedas (Zenobank)', isActive: true }
    });
    console.log("Payment methods seeded/activated.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
