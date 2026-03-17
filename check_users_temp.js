const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log('Users in DB:');
  console.log(JSON.stringify(users.map(u => ({
    id: u.id,
    email: u.email,
    rol: u.rol,
    nombre: u.nombre
  })), null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
