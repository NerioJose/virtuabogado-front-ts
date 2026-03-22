require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const { data: buckets, error: getError } = await supabaseAdmin.storage.listBuckets();
  
  if (getError) {
    console.error('Error listing buckets:', getError);
    return;
  }

  const caseFilesBucket = buckets.find(b => b.name === 'case-files');
  if (!caseFilesBucket) {
    console.log('Bucket "case-files" no existe. Creándolo...');
    const { data: createData, error: createError } = await supabaseAdmin.storage.createBucket('case-files', {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      fileSizeLimit: 10485760 // 10MB
    });

    if (createError) {
      console.error('Error creando bucket:', createError);
    } else {
      console.log('✅ Bucket "case-files" creado exitosamente y es PÚBLICO.');
    }
  } else {
    console.log('El bucket "case-files" ya existe. Actualizándolo a PÚBLICO...');
    const { error: updateError } = await supabaseAdmin.storage.updateBucket('case-files', {
      public: true
    });
    if (updateError) {
      console.error('Error actualizando bucket:', updateError);
    } else {
      console.log('✅ Bucket "case-files" actualizado a PÚBLICO exitosamente.');
    }
  }
}

main();
