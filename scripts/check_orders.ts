import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('--- BUSCANDO ÓRDENES RECIENTES ---');
  const orders = await (prisma.order as any).findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      user: true,
      service: true
    }
  });

  if (orders.length === 0) {
    console.log('No se encontraron órdenes.');
  } else {
    orders.forEach((o: any) => {
      console.log(`Orden ID: ${o.id}`);
      console.log(`Usuario: ${o.user.email} (ID: ${o.userId})`);
      console.log(`Servicio: ${o.service.titulo}`);
      console.log(`Estado: ${o.status}`);
      console.log(`Fecha: ${o.createdAt}`);
      console.log('---');
    });
  }

  console.log('--- BUSCANDO USUARIOS RECIENTES ---');
  const users = await (prisma.user as any).findMany({
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  users.forEach((u: any) => {
    console.log(`Usuario: ${u.email} (ID: ${u.id}) - Rol: ${u.rol} - Activo: ${u.activo}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await (prisma as any).$disconnect();
  });
