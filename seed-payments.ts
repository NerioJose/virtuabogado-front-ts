import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    await prisma.paymentMethod.upsert({
        where: { name: 'stripe' },
        update: { activo: true, titulo: 'Tarjeta de Crédito / Débito' },
        create: { name: 'stripe', titulo: 'Tarjeta de Crédito / Débito', activo: true, config: {} }
    });
    await prisma.paymentMethod.upsert({
        where: { name: 'zenobank' },
        update: { activo: true, titulo: 'Pago con Criptomonedas (Zenobank)' },
        create: { name: 'zenobank', titulo: 'Pago con Criptomonedas (Zenobank)', activo: true, config: {} }
    });
    console.log("Payment methods seeded/activated.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
