import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

function createPrismaClient() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 20, // Aumentamos a 20 para evitar saturación en concurrencia
        idleTimeoutMillis: 20000, // Reciclado más rápido de conexiones inactivas
        connectionTimeoutMillis: 5000, 
    });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ 
        adapter,
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error']
    });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}

export default prisma;