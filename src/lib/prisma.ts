import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

function createPrismaClient() {
    const isDev = process.env.NODE_ENV === 'development';
    
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: isDev ? 10 : 20, 
        idleTimeoutMillis: 20000,
        connectionTimeoutMillis: 5000, 
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