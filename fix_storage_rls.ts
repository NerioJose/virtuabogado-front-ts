import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  try {
    await prisma.$executeRawUnsafe(`
      DROP POLICY IF EXISTS "Usuarios pueden subir archivos de sus casos" ON storage.objects;
      CREATE POLICY "Usuarios pueden subir archivos de sus casos"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'case-files' AND
        (
          EXISTS (
            SELECT 1 FROM public."Order"
            WHERE "Order".id = (storage.foldername(name))[1]
            AND (
              "Order"."userId" = auth.uid()::text OR 
              "Order"."lawyerId" = auth.uid()::text OR
              (auth.jwt()->'user_metadata'->>'rol') = 'ADMIN'
            )
          )
        )
      );

      DROP POLICY IF EXISTS "Usuarios pueden ver archivos de sus casos" ON storage.objects;
      CREATE POLICY "Usuarios pueden ver archivos de sus casos"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'case-files' AND
        EXISTS (
          SELECT 1 FROM public."Order"
          WHERE "Order".id = (storage.foldername(name))[1]
          AND (
            "Order"."userId" = auth.uid()::text OR 
            "Order"."lawyerId" = auth.uid()::text OR
            (auth.jwt()->'user_metadata'->>'rol') = 'ADMIN'
          )
        )
      );
    `);
    console.log('✅ Políticas de Storage actualizadas para prevenir recursión 42P17.');
  } catch(e) {
    console.error('❌ Error updating RLS:', e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
