const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Checking Supabase Realtime Publication...");
    const result = await prisma.$queryRawUnsafe("SELECT schemaname, tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime'");
    console.log(result);
}
main().catch(console.error).finally(() => prisma.$disconnect());
