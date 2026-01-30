
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');
require('dotenv').config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seed() {
    try {
        console.log('Sembrando servicios que coinciden con el frontend...');

        const services = [
            { id: 1, titulo: 'Consultas Legales', descripcion: 'Resuelve tus dudas legales con abogados especializados en diferentes áreas del derecho.', precio: 99.99, activo: true },
            { id: 2, titulo: 'Revisión de Documentos', descripcion: 'Análisis y revisión de contratos, acuerdos y documentos legales por profesionales.', precio: 149.99, activo: true },
            { id: 3, titulo: 'Representación Legal', descripcion: 'Representación profesional en procesos judiciales y extrajudiciales.', precio: 299.99, activo: true },
            { id: 4, titulo: 'Asesoría Empresarial', descripcion: 'Servicios legales especializados para empresas y emprendedores.', precio: 199.99, activo: true },
            { id: 5, titulo: 'Derecho Familiar', descripcion: 'Asesoramiento en asuntos de familia como divorcios, custodia, pensiones alimenticias y más.', precio: 179.99, activo: true },
            { id: 6, titulo: 'Derecho Inmobiliario', descripcion: 'Servicios legales relacionados con propiedades, compraventas, arrendamientos y conflictos inmobiliarios.', precio: 249.99, activo: true },
        ];

        for (const service of services) {
            await prisma.service.upsert({
                where: { id: service.id },
                update: service,
                create: service,
            });
        }

        console.log('✅ Servicios sembrados/actualizados con éxito.');
    } catch (e) {
        console.error('❌ Error al sembrar servicios:', e);
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
}

seed();
