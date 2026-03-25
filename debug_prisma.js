const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

console.log('--- Prisma Models ---');
const keys = Object.keys(prisma).filter(k => !k.startsWith('$') && !k.startsWith('_'));
console.log('Keys:', keys);

if (keys.includes('financialSettings')) {
    console.log('✅ Found financialSettings');
} else if (keys.includes('FinancialSettings')) {
    console.log('✅ Found FinancialSettings (PascalCase)');
} else {
    console.log('❌ NOT FOUND');
}

prisma.$disconnect();
