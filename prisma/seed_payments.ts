import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const methods = [
    {
      identifier: 'mock',
      name: 'Tarjeta de Crédito / Débito',
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

  console.log('🌱 Seeding payment methods...');

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
