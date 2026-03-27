import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding payment methods...');

  const methods = [
    {
      name: 'mock',
      titulo: 'Pago con Tarjeta (Próximamente)',
      activo: true,
      config: {}
    },
    {
      name: 'zenobank',
      titulo: 'Criptomonedas',
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
      },
      create: {
        name: method.name,
        titulo: method.titulo,
        activo: method.activo,
        config: method.config,
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
