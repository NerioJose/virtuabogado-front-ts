
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');
require('dotenv').config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function debugOrder() {
    try {
        console.log('--- DEPÚRACIÓN DE ORDEN ---');

        // 1. Verificar usuario (tomar el primero que exista)
        const user = await prisma.user.findFirst();
        if (!user) {
            console.log('❌ No hay usuarios en la DB. Creando uno de prueba...');
            const newUser = await prisma.user.create({
                data: {
                    email: 'test' + Date.now() + '@example.com',
                    nombre: 'Test User',
                    rol: 'CLIENTE'
                }
            });
            user = newUser;
        }
        console.log('✅ Usuario encontrado/creado:', user.id);

        // 2. Verificar servicios
        const service = await prisma.service.findFirst();
        if (!service) {
            console.log('❌ No hay servicios. Por favor ejecuta seed-services.js primero.');
            return;
        }
        console.log('✅ Servicio encontrado:', service.id, service.titulo);

        // 3. Intentar crear orden
        console.log('Intentando crear orden...');
        const order = await prisma.order.create({
            data: {
                userId: user.id,
                serviceId: service.id,
                total: 100.00,
                status: 'COMPLETADO',
                paymentId: 'DEBUG-PAYMENT'
            }
        });
        console.log('✅ ORDEN CREADA EXITOSAMENTE:', order.id, 'numericId:', order.numericId);

    } catch (e) {
        console.error('❌ ERROR AL CREAR ORDEN:');
        console.error(e);
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
}

debugOrder();
