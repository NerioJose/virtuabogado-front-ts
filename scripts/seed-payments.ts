import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding payment methods...');

  const methods = [
    {
      identifier: 'mock',
      name: 'Pago con Tarjeta (Próximamente)',
      isActive: true,
      icon: 'FiCreditCard'
    },
    {
      identifier: 'zenobank',
      name: 'Criptomonedas',
      isActive: true,
      icon: 'SiBitcoin'
    }
  ];

  for (const method of methods) {
    await prisma.paymentMethod.upsert({
      where: { identifier: method.identifier },
      update: {
        name: method.name,
        isActive: method.isActive,
        icon: method.icon
      },
      create: {
        identifier: method.identifier,
        name: method.name,
        isActive: method.isActive,
        icon: method.icon
      },
    });
  }

  console.log('✅ Payment methods seeded successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding payment methods:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
