import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Buscando abogado Juan Pérez ---');
    const user = await prisma.user.findFirst({
        where: { nombre: { contains: 'Pérez', mode: 'insensitive' } }
    });

    if (!user) {
        console.log('No se encontró al Dr. Juan Pérez.');
        return;
    }

    console.log('Usuario encontrado:', user.id, user.nombre, user.rol);

    const orders = await prisma.order.findMany({
        where: { lawyerId: user.id }
    });

    console.log('Casos asignados:', orders.length);
    if (orders.length > 0) {
        console.log(orders);
    } else {
        // Did maybe they assign it to a different ID?
        const checkAll = await prisma.order.findMany({
            where: { lawyerId: { not: null } }
        });
        console.log('Otras órdenes asignadas a ALGUIEN MAS:', checkAll.length);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
