import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
    directPrisma: PrismaClient | undefined;
};

let poolerCongested = false;
let congestedAt = 0;

function createPoolClient(connectionString: string, max: number, timeoutMs: number) {
    return new Pool({
        connectionString,
        max,
        idleTimeoutMillis: 3000,
        connectionTimeoutMillis: timeoutMs,
    });
}

function createPrismaFromUrl(
    connectionString: string,
    max: number,
    timeoutMs: number,
    isDev: boolean,
): PrismaClient {
    const pool = createPoolClient(connectionString, max, timeoutMs);
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

function createPrismaClient(): PrismaClient {
    const isDev = process.env.NODE_ENV === 'development';
    const poolerUrl = process.env.DATABASE_URL_POOLER;
    const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

    if (poolerUrl) {
        const client = createPrismaFromUrl(poolerUrl, isDev ? 10 : 5, isDev ? 10000 : 5000, isDev);
        if (directUrl) {
            const directClient = createPrismaFromUrl(directUrl, isDev ? 20 : 15, 5000, isDev);
            globalForPrisma.directPrisma = directClient;
        }
        return client;
    }

    if (directUrl) {
        return createPrismaFromUrl(directUrl, isDev ? 20 : 15, 5000, isDev);
    }

    throw new Error('❌ [Prisma] No hay URL de base de datos configurada.');
}

function getActiveClient(): PrismaClient {
    if (poolerCongested && globalForPrisma.directPrisma) {
        const elapsed = Date.now() - congestedAt;
        if (elapsed < 120_000) return globalForPrisma.directPrisma;
        poolerCongested = false;
    }
    if (!globalForPrisma.prisma) {
        globalForPrisma.prisma = createPrismaClient();
    }
    return globalForPrisma.prisma;
}

export function useDirectConnection(): void {
    if (!poolerCongested && globalForPrisma.directPrisma) {
        poolerCongested = true;
        congestedAt = Date.now();
    }
}

// Proxy: permite que `prisma.$queryRaw`, `prisma.order.findMany()`, etc.
// usen el cliente activo (pooler o directo) según la congestión
export const prisma = new Proxy<PrismaClient>({} as PrismaClient, {
    get(_target, prop) {
        return (getActiveClient() as any)[prop];
    }
}) as PrismaClient;

export default prisma;
