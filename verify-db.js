/**
 * Script simplificado para verificar conexión a Supabase y crear tablas si no existen
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function setup() {
    try {
        console.log('🔍 Verificando conexión a Supabase...');

        // Test connection
        await prisma.$connect();
        console.log('✅ Conexión exitosa a Supabase');

        // Verificar si existen servicios
        const serviceCount = await prisma.service.count();
        console.log(`📊 Servicios en BD: ${serviceCount}`);

        if (serviceCount === 0) {
            console.log('📝 Creando servicios iniciales...');
            const services = [
                { id: 1, titulo: 'Consultas Legales', descripcion: 'Resuelve tus dudas legales con abogados especializados', precio: 99.99, activo: true },
                { id: 2, titulo: 'Revisión de Documentos', descripcion: 'Análisis y revisión de contratos y documentos legales', precio: 149.99, activo: true },
                { id: 3, titulo: 'Representación Legal', descripcion: 'Representación profesional en procesos judiciales', precio: 299.99, activo: true },
            ];

            for (const service of services) {
                await prisma.service.create({ data: service });
            }
            console.log('✅ Servicios creados');
        }

        // Verificar usuarios
        const userCount = await prisma.user.count();
        console.log(`👥 Usuarios en BD: ${userCount}`);

        // Verificar órdenes
        const orderCount = await prisma.order.count();
        console.log(`📦 Órdenes en BD: ${orderCount}`);

        console.log('\n✅ Base de datos está lista para usar');

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.message.includes('relation') || error.message.includes('does not exist')) {
            console.log('\n⚠️  Las tablas no existen. Ejecuta: npx prisma db push');
        }
    } finally {
        await prisma.$disconnect();
    }
}

setup();
