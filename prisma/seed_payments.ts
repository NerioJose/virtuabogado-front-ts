import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const methods = [
    {
      name: 'zenobank',
      titulo: 'Tarjeta de Crédito (Zenobank)',
      activo: true,
      config: {
        publicKey: process.env.ZENOBANK_PUBLIC_KEY || 'zb_pub_test_123',
        webhookSecret: process.env.ZENOBANK_WEBHOOK_SECRET || 'zb_wh_test_456'
      }
    },
    {
      name: 'mock',
      titulo: 'Simulación de Pago (Test)',
      activo: true,
      config: {}
    }
  ];

  for (const method of methods) {
    await prisma.paymentMethod.upsert({
      where: { name: method.name },
      update: {
        titulo: method.titulo,
        activo: method.activo,
        config: method.config as any
      },
      create: {
        id: method.name === 'zenobank' 
          ? '00000000-0000-0000-0000-000000000001' 
          : '00000000-0000-0000-0000-000000000002',
        name: method.name,
        titulo: method.titulo,
        activo: method.activo,
        config: method.config as any
      }
    });
  }

  console.log('✅ Payment methods seeded');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
