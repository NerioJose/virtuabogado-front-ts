import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

if (!process.env.DATABASE_URL) {
    throw new Error('❌ DATABASE_URL no está definida en las variables de entorno');
}

console.log('🔗 Inicializando conexión a PostgreSQL...');

// Crear pool de conexiones para Supabase
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10, // Número máximo de conexiones
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
    console.error('💥 Error en el pool de PostgreSQL:', err);
});

// Crear adapter para Prisma 7
const adapter = new PrismaPg(pool);

// Configuración de logs según el ambiente
const prismaLogConfig = process.env.NODE_ENV === 'development'
    ? ['query', 'error', 'warn']
    : ['error'];

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        adapter, // ✅ Requerido en Prisma 7 con PostgreSQL
        log: prismaLogConfig as any,
    });

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}

// Verificar conexión al iniciar
prisma.$connect()
    .then(() => {
        console.log('✅ Prisma conectado exitosamente a Supabase PostgreSQL');
    })
    .catch((err) => {
        console.error('❌ Error al conectar Prisma a la base de datos:', err);
    });

export default prisma;