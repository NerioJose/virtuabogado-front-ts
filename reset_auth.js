import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // The name from .env

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Faltan variables de entorno Supabase');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function resetPasswords() {
    console.log('--- Reseteando contraseñas de admin y abogado ---');

    console.log('Buscando abogado@virtuabogado.com...');
    let { data: users, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
        console.error('Error listando usuarios:', error); return;
    }

    const abogado = users.users.find(u => u.email === 'abogado@virtuabogado.com');
    const admin = users.users.find(u => u.email === 'admin@virtuabogado.com');

    if (abogado) {
        const { error: err1 } = await supabaseAdmin.auth.admin.updateUserById(abogado.id, {
            password: 'Password123!',
        });
        if (err1) console.error('Error actualizando abogado:', err1);
        else console.log('✅ Abogado actualizado: abogado@virtuabogado.com | Password123!');
    } else {
        // Creat it
        const { data: newAbog, error: errC } = await supabaseAdmin.auth.admin.createUser({
            email: 'abogado@virtuabogado.com',
            password: 'Password123!',
            email_confirm: true,
            user_metadata: {
                nombre: 'Dr. Juan Martínez',
                rol: 'ABOGADO'
            }
        });
        if (errC) console.error('Error creando abogado', errC);
         else console.log('✅ Abogado creado: abogado@virtuabogado.com | Password123!');
    }

    if (admin) {
        const { error: err2 } = await supabaseAdmin.auth.admin.updateUserById(admin.id, {
            password: 'Password123!',
        });
        if (err2) console.error('Error actualizando admin:', err2);
        else console.log('✅ Admin actualizado: admin@virtuabogado.com | Password123!');
    } else {
        const { data: newAdm, error: errAd } = await supabaseAdmin.auth.admin.createUser({
            email: 'admin@virtuabogado.com',
            password: 'Password123!',
            email_confirm: true,
            user_metadata: {
                nombre: 'Admin Principal',
                rol: 'ADMIN'
            }
        });
        if (errAd) console.error('Error creando admin', errAd);
        else console.log('✅ Admin creado: admin@virtuabogado.com | Password123!');
    }
}

resetPasswords().then(() => console.log('Completado.'));
