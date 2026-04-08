import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    const pendingPayouts = await (prisma as any).lawyerPayout.findMany({
        where: { status: 'PENDIENTE' },
        select: { id: true, amount: true, status: true }
    });
    
    console.log(`📊 Encontradas ${pendingPayouts.length} liquidaciones en estado PENDIENTE`);
    
    if (pendingPayouts.length === 0) {
        console.log('✅ No hay nada que migrar.');
        await prisma.$disconnect();
        await pool.end();
        process.exit(0);
    }
    
    let count = 0;
    for (const payout of pendingPayouts) {
        await (prisma as any).lawyerPayout.update({
            where: { id: payout.id },
            data: {
                status: 'COMPLETADO',
                paidAt: new Date()
            }
        });
        count++;
        console.log(`  ✓ Liquidación ${payout.id} → COMPLETADO ($${payout.amount})`);
    }
    
    console.log(`\n✅ ${count} liquidaciones migradas de PENDIENTE → COMPLETADO`);
    await prisma.$disconnect();
    await pool.end();
}

main().catch(e => {
    console.error('❌ Error:', e);
    process.exit(1);
});
