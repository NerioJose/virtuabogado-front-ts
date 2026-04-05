/**
 * Script de reparación para el administrador maestro
 * Vincula el registro existente en la tabla pública con una nueva cuenta en Auth
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno Supabase en el archivo .env');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function repararAdmin() {
    const adminEmail = 'virtuabogado.legal@gmail.com';
    const adminId = '654f9bdc-34ed-43a2-8de3-60cb4e26a20f'; // ID de tu base de datos
    const password = 'Password123!';

    console.log(`🛠️ Iniciando reparación para: ${adminEmail}`);

    // 1. Verificar si ya existe en Auth
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
        console.error('❌ Error al listar usuarios:', listError);
        return;
    }

    const existingAuthUser = users.find(u => u.email === adminEmail);

    if (existingAuthUser) {
        console.log(`⚠️ El usuario ya existe en Auth (ID: ${existingAuthUser.id}). Actualizando contraseña...`);
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existingAuthUser.id, {
            password: password,
            user_metadata: { rol: 'ADMIN' }
        });

        if (updateError) console.error('❌ Error al actualizar:', updateError);
        else console.log('✅ Contraseña y rol actualizados correctamente.');
    } else {
        console.log(`🆕 Creando nueva cuenta en Auth con ID vinculado: ${adminId}`);
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            id: adminId, // Forzamos el ID para que coincida con tu tabla pública
            email: adminEmail,
            password: password,
            email_confirm: true,
            user_metadata: {
                nombre: 'Administrador Maestro',
                rol: 'ADMIN'
            }
        });

        if (createError) {
            console.error('❌ Error al crear usuario en Auth:', createError);
            console.log('Intentando creación sin ID forzado por si acaso...');
            
            const { error: createError2 } = await supabaseAdmin.auth.admin.createUser({
                email: adminEmail,
                password: password,
                email_confirm: true,
                user_metadata: {
                    nombre: 'Administrador Maestro',
                    rol: 'ADMIN'
                }
            });
            if (createError2) console.error('❌ Fallo total:', createError2);
            else console.log('✅ Usuario creado (nuevo ID). La sincronización automática se encargará del resto al loguearte.');
        } else {
            console.log('✅ Usuario creado y vinculado exitosamente.');
        }
    }
}

repararAdmin();
