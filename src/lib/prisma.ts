import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

function createPrismaClient() {
    const isDev = process.env.NODE_ENV === 'development';
    
    const dbUrl = process.env.DATABASE_URL;
    
    if (!dbUrl) {
        console.error('❌ [Prisma] Error: DATABASE_URL no está definida en las variables de entorno.');
        // No lanzamos error aquí para permitir que Next.js levante el servidor, 
        // pero las consultas fallarán con un mensaje claro.
    }

    const pool = new Pool({
        connectionString: dbUrl,
        max: isDev ? 10 : 20, 
        idleTimeoutMillis: 30000, // 30 segundos de inactividad
        connectionTimeoutMillis: 30000, // 30 segundos para conectar (antes 5s)
    });
    const adapter = new PrismaPg(pool);

    const client = new PrismaClient({ 
        adapter,
        log: isDev ? [
            { emit: 'event', level: 'query' },
            { emit: 'stdout', level: 'error' },
            { emit: 'stdout', level: 'warn' },
        ] : ['error']
    });

    // SISTEMA DE LOGGING SRE (Big-Tech Pattern)
    if (isDev) {
        // @ts-ignore
        client.$on('query', (e: any) => {
            if (e.duration >= 200) {
                console.warn(`\n⚠️  [Prisma Slow Query] (${e.duration}ms):`);
                console.warn(`   Query: ${e.query}`);
                console.warn(`   Params: ${e.params}\n`);
            }
        });
    } else {
        // Preparado para Sentry en Producción
        const SENTRY_DSN = process.env.SENTRY_DSN;
        if (SENTRY_DSN) {
            console.log('🚀 [SRE] Monitorización de Prisma (Sentry) activa.');
            // Aquí se integraría el middleware de Sentry si se desea rastreo de trazas
        }
    }

    return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}

export default prisma;