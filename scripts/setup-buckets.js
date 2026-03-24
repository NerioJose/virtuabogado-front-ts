require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupBucket(name, isPublic = true) {
  const { data: buckets, error: getError } = await supabaseAdmin.storage.listBuckets();
  
  if (getError) {
    console.error(`Error listing buckets for ${name}:`, getError);
    return;
  }

  const bucket = buckets.find(b => b.name === name);
  if (!bucket) {
    console.log(`Bucket "${name}" no existe. Creándolo...`);
    const { error: createError } = await supabaseAdmin.storage.createBucket(name, {
      public: isPublic,
      allowedMimeTypes: name === 'avatars' ? ['image/jpeg', 'image/png'] : undefined,
      fileSizeLimit: name === 'avatars' ? 2097152 : 10485760 // 2MB for avatars, 10MB for cases
    });

    if (createError) {
      console.error(`Error creando bucket ${name}:`, createError);
    } else {
      console.log(`✅ Bucket "${name}" creado exitosamente.`);
    }
  } else {
    console.log(`El bucket "${name}" ya existe.`);
    // Opcional: actualizar configuración si es necesario
    await supabaseAdmin.storage.updateBucket(name, { public: isPublic });
  }
}

async function main() {
  await setupBucket('case-files', true);
  await setupBucket('avatars', true);
}

main();
