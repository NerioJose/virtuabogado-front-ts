/**
 * Script para crear usuarios de prueba en Supabase
 * Ejecutar: node create-test-users.js
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Faltan variables de entorno (NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY)');
    process.exit(1);
}

// Cliente admin con Service Role Key
const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const testUsers = [
    {
        email: 'admin@virtuabogado.com',
        password: 'Admin123!',
        nombre: 'Administrador Principal',
        rol: 'ADMIN',
        telefono: '+57 300 1234567'
    },
    {
        email: 'abogado@virtuabogado.com',
        password: 'Abogado123!',
        nombre: 'Dr. Juan Martínez',
        rol: 'ABOGADO',
        telefono: '+57 300 7654321',
        especialidad: 'civil',
        matricula: 'COL-12345',
        experiencia: 10
    },
    {
        email: 'cliente@virtuabogado.com',
        password: 'Cliente123!',
        nombre: 'María García',
        rol: 'CLIENTE',
        telefono: '+57 301 9876543'
    }
];

async function createUsers() {
    console.log('🔧 Creando usuarios de prueba en Supabase...\n');

    for (const userData of testUsers) {
        try {
            // Crear usuario en Supabase Auth
            const { data, error } = await supabase.auth.admin.createUser({
                email: userData.email,
                password: userData.password,
                email_confirm: true,
                user_metadata: {
                    nombre: userData.nombre,
                    rol: userData.rol,
                    telefono: userData.telefono,
                    ...(userData.especialidad && { especialidad: userData.especialidad }),
                    ...(userData.matricula && { matricula: userData.matricula }),
                    ...(userData.experiencia && { experiencia: userData.experiencia })
                }
            });

            if (error) {
                if (error.message.includes('already registered')) {
                    console.log(`⚠️  Usuario ya existe: ${userData.email}`);
                } else {
                    console.error(`❌ Error creando ${userData.email}:`, error.message);
                }
                continue;
            }

            console.log(`✅ Usuario creado: ${userData.email}`);
            console.log(`   → ID: ${data.user.id}`);
            console.log(`   → Rol: ${userData.rol}`);
            console.log(`   → Contraseña: ${userData.password}\n`);

        } catch (err) {
            console.error(`❌ Error inesperado con ${userData.email}:`, err);
        }
    }

    console.log('\n📋 RESUMEN DE CREDENCIALES:\n');
    console.log('ADMIN:');
    console.log('  Email: admin@virtuabogado.com');
    console.log('  Contraseña: Admin123!\n');

    console.log('ABOGADO:');
    console.log('  Email: abogado@virtuabogado.com');
    console.log('  Contraseña: Abogado123!\n');

    console.log('CLIENTE:');
    console.log('  Email: cliente@virtuabogado.com');
    console.log('  Contraseña: Cliente123!\n');

    console.log('✅ ¡Proceso completado!');
    console.log('Ahora puedes iniciar sesión en /dev-login con estas credenciales');
}

createUsers().catch(console.error);
