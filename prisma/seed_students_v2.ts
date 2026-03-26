import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Database Verification vs Insertion ---');
  
  const existing = await prisma.service.findMany({
    orderBy: { id: 'asc' }
  });
  
  console.log('Current services in DB:', existing.length);
  existing.forEach(s => console.log(`[ID: ${s.id}] ${s.titulo} - Active: ${s.activo}`));

  console.log('\nUpserting "Asesoría Estudiantes de Derecho"...');
  const service = await prisma.service.upsert({
    where: { id: 7 },
    update: {
      titulo: 'Asesoría Estudiantes de Derecho',
      descripcion: 'Tutorías académicas, resolución de casos prácticos y apoyo para futuros abogados.',
      precio: 49.99,
      imagenUrl: '/images/virtustudents.png',
      activo: true
    },
    create: {
      id: 7,
      titulo: 'Asesoría Estudiantes de Derecho',
      descripcion: 'Tutorías académicas, resolución de casos prácticos y apoyo para futuros abogados.',
      precio: 49.99,
      imagenUrl: '/images/virtustudents.png',
      activo: true
    }
  });

  console.log('Upsert successful:', service.titulo);
  
  const final = await prisma.service.findMany({
    orderBy: { id: 'asc' }
  });
  console.log('\nFinal services in DB:', final.length);
  final.forEach(s => console.log(`[ID: ${s.id}] ${s.titulo} - Active: ${s.activo}`));
}

main()
  .catch((e) => {
    console.error('Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
