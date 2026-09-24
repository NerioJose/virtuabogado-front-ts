import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

function createPrismaClient() {
    const isDev = process.env.NODE_ENV === 'development';

    // ⚠️ SERVERLESS: SIEMPRE usar pooler (Supavisor). La conexión directa
    // multiplica pools por cada función serverless de Vercel y agota
    // el límite de conexiones de PostgreSQL (15 en plan free).
    // El pooler multiplexa N clientes en pocas conexiones reales.
    // En serverless SIEMPRE preferir una URL con pooler (Supavisor, puerto 6543).
    // Orden: 1) DATABASE_URL_POOLER explícita, 2) DATABASE_URL (en prod apunta al
    // pooler), 3) DIRECT_URL como último recurso (migraciones/scripts).
    const poolerUrl = process.env.DATABASE_URL_POOLER;
    const runtimeUrl = process.env.DATABASE_URL;
    const directUrl = process.env.DIRECT_URL;

    const dbUrl = poolerUrl || runtimeUrl || directUrl;
    const usingPooler = !!dbUrl && /pooler\.supabase\.com|:6543\b/.test(dbUrl);

    if (!dbUrl) {
        console.error('❌ [Prisma] No hay URL de base de datos configurada.');
    }

    // Serverless: pools pequeños por instancia, el pooler se encarga de encolar
    const maxConnections = isDev ? 10 : (usingPooler ? 5 : 3);

    const pool = new Pool({
        connectionString: dbUrl,
        max: maxConnections,
        idleTimeoutMillis: 3000,
        connectionTimeoutMillis: isDev ? 10000 : 10000, // 10s en prod para dar tiempo al pooler
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
