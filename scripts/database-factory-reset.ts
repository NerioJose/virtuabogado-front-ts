import { createClient } from '@supabase/supabase-js';
import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const databaseUrl = process.env.DATABASE_URL!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const pgClient = new Client({ connectionString: databaseUrl });

async function main() {
  console.log('🚀 Iniciando limpieza total de VirtuAbogado (Modo Directo)...');
  
  await pgClient.connect();

  // 1. Limpieza de Supabase Storage
  console.log('📂 Limpiando archivos en Storage (case-files y avatars)...');
  const buckets = ['case-files', 'avatars'];
  for (const bucket of buckets) {
    const { data: files, error: listError } = await supabase.storage.from(bucket).list();
    if (listError) {
      console.error(`❌ Error listando archivos en ${bucket}:`, listError.message);
      continue;
    }

    if (files && files.length > 0) {
      const paths = files.map(f => f.name);
      const { error: deleteError } = await supabase.storage.from(bucket).remove(paths);
      if (deleteError) {
        console.error(`❌ Error eliminando archivos en ${bucket}:`, deleteError.message);
      } else {
        console.log(`✅ Bucket "${bucket}" limpiado (${files.length} archivos eliminados).`);
      }
    } else {
      console.log(`ℹ️ El bucket "${bucket}" ya estaba vacío.`);
    }
  }

  // 2. Limpieza de Capa de Autenticación (Supabase Auth)
  console.log('👤 Eliminando todos los usuarios de Supabase Auth...');
  const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
  if (usersError) {
    console.error('❌ Error listando usuarios de Auth:', usersError.message);
  } else {
    for (const user of usersData.users) {
      await supabase.auth.admin.deleteUser(user.id);
    }
    console.log(`✅ Se eliminaron ${usersData.users.length} usuarios de la autenticación.`);
  }

  // 3. Limpieza de Tablas Públicas con TRUNCATE CASCADE
  console.log('🧹 Limpiando tablas de la base de datos pública...');
  try {
    const tables = ['"User"', '"Order"', '"LawyerPayouts"', '"Message"', '"Document"', '"Review"', '"PushSubscription"', '"PasswordResetToken"'];
    await pgClient.query(`TRUNCATE TABLE ${tables.join(', ')} RESTART IDENTITY CASCADE;`);
    console.log('✅ Base de datos pública limpiada exitosamente.');
  } catch (error: any) {
    console.error('❌ Error en el TRUNCATE:', error.message);
  }

  // 4. Creación del Administrador Maestro
  console.log('👑 Creando el nuevo Administrador Maestro...');
  const adminEmail = 'virtuabogado.legal@gmail.com';
  const adminPassword = 'Password123!';

  const { data: newAdmin, error: createError } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    user_metadata: {
      nombre: 'Administrador Maestro',
      rol: 'ADMIN'
    }
  });

  if (createError) {
    console.error('❌ Error creando administrador:', createError.message);
  } else {
    console.log(`✅ Administrador creado con éxito: ${adminEmail}`);
    
    // Asegurar que el registro en la tabla pública tenga el rol correcto
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    await pgClient.query(`UPDATE "User" SET rol = 'ADMIN' WHERE email = $1`, [adminEmail]);
    console.log('✅ Rol ADMIN verificado en la tabla pública.');
  }

  console.log('\n✨ Proceso de reseteo completado con éxito.');
}

main()
  .catch(e => console.error('🔥 Error crítico:', e))
  .finally(async () => {
    await pgClient.end();
  });
