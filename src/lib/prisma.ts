import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

function createPrismaClient() {
    const isDev = process.env.NODE_ENV === 'development';
    
    // PRIORIDAD: Usar DATABASE_URL_POOLER en producción para Connection Pooling (Supavisor Puerto 6543)
    const dbUrl = process.env.DATABASE_URL_POOLER || process.env.DATABASE_URL;
    
    if (!dbUrl) {
        console.error('❌ [Prisma] Error: Ni DATABASE_URL ni DATABASE_URL_POOLER están definidas.');
    }

    if (!isDev) {
        
    }

    const pool = new Pool({
        connectionString: dbUrl,
        max: isDev ? 10 : 3,
        idleTimeoutMillis: 3000, // 3s - libera conexiones rápido para dejar espacio a otros
        connectionTimeoutMillis: isDev ? 10000 : 3000, // 3s en prod - falla rápido si está congestionado
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

    // SISTEMA DE LOGGING SRE (Big-Tech Pattern) - Umbral elevado a 1000ms por latencia del pooler Supavisor en dev
    if (isDev) {
        // @ts-ignore
        client.$on('query', (e: any) => {
            if (e.duration >= 1000) {
                console.warn(`\n⚠️  [Prisma Slow Query] (${e.duration}ms):`);
                console.warn(`   Query: ${e.query}`);
                console.warn(`   Params: ${e.params}\n`);
            }
        });
    }

    return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}

export default prisma;