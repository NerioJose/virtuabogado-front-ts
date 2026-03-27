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
  console.log('🌱 Iniciando Seeding Completo...');

  // 1. PASARELAS DE PAGO
  const paymentMethods = [
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

  for (const method of paymentMethods) {
    await prisma.paymentMethod.upsert({
      where: { identifier: method.identifier },
      update: {
        name: method.name,
        isActive: method.isActive,
        icon: method.icon
      },
      create: method
    });
  }
  console.log('✅ Pasarelas sincronizadas.');

  // 2. SERVICIOS
  const services = [
    {
      titulo: 'Consultas Legales',
      descripcion: 'Resuelve tus dudas legales con abogados especializados.',
      precio: 10.00,
      activo: true,
      imagenUrl: '/images/consulta-legal.png'
    },
    {
      titulo: 'Redacción de Documentos',
      descripcion: 'Contratos, poderes, demandas y más, redactados por expertos.',
      precio: 25.00,
      activo: true,
      imagenUrl: '/images/documento-legal.png'
    },
    {
      titulo: 'Asesoría Estudiantes de Derecho',
      descripcion: 'Tutorías académicas y apoyo para futuros abogados.',
      precio: 49.99,
      activo: true,
      imagenUrl: '/images/virtustudents.png'
    }
  ];

  for (const service of services) {
    await prisma.service.upsert({
      where: { id: services.indexOf(service) + 1 }, // Simular IDs secuenciales
      update: service,
      create: {
        id: services.indexOf(service) + 1,
        ...service
      }
    });
  }
  console.log('✅ Servicios restaurados.');

  // 3. CONFIGURACIÓN FINANCIERA
  await prisma.financialSettings.upsert({
    where: { id: 'default-settings' },
    update: {},
    create: {
      id: 'default-settings',
      lawyer_commission_percentage: 70,
      operational_costs_percentage: 10,
      tax_percentage: 15,
      platform_fee_percentage: 5,
    }
  });
  console.log('✅ Configuración financiera inicializada.');

  console.log('✨ Seeding finalizado con éxito.');
}

main()
  .catch((e) => {
    console.error('❌ Error en el seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
