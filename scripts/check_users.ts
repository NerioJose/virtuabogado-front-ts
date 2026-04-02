
import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('--- Database Count Analysis ---');
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        rol: true,
        activo: true,
        nombre: true
      }
    });

    console.log(`Total users in DB: ${users.length}`);
    
    const roleStats = users.reduce((acc, user) => {
      acc[user.rol] = (acc[user.rol] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('Roles distribution:', JSON.stringify(roleStats, null, 2));

    const lawyers = users.filter(u => u.rol === 'ABOGADO');
    console.log(`Lawyers (ABOGADO): ${lawyers.length}`);
    lawyers.forEach(l => {
      console.log(`- ${l.nombre} (${l.email}) | Activo: ${l.activo}`);
    });

    const clients = users.filter(u => u.rol === 'CLIENTE');
    console.log(`Clients (CLIENTE): ${clients.length}`);

    const admins = users.filter(u => u.rol === 'ADMIN');
    console.log(`Admins (ADMIN): ${admins.length}`);

  } catch (error) {
    console.error('❌ Error checking DB:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
