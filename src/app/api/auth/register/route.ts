import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateEmailDeliverability } from '@/lib/emailDeliverability';
import { verifyTurnstile } from '@/lib/turnstile';
import { sendConfirmationEmail } from '@/lib/emailTemplates';

/**
 * API Route para registro de usuarios usando Service Role Key
 * Esto BYPASEA los rate limits del cliente de Supabase Auth
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, password, nombre, telefono, rol, turnstileToken } = body;

        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email y contraseña son requeridos' },
                { status: 400 }
            );
        }

        const normalizedEmail = String(email).toLowerCase().trim();

        // Validación estricta de email (formato + dominios desechables + MX del dominio)
        const emailCheck = await validateEmailDeliverability(normalizedEmail);
        if (!emailCheck.ok) {
            return NextResponse.json(
                { error: emailCheck.error || 'Email inválido' },
                { status: 400 }
            );
        }

        // Solo los clientes requieren confirmación de email.
        // Los abogados los registra/verifica el administrador (auto-confirmación).
        const userRole = rol === 'ABOGADO' ? 'ABOGADO' : 'CLIENTE';
        const requiresEmailConfirmation = userRole === 'CLIENTE';

        // Usar Service Role Key - NO tiene rate limits
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        if (!serviceRoleKey) {
            console.error('❌ SUPABASE_SERVICE_ROLE_KEY no está configurada');
            return NextResponse.json(
                { error: 'Configuración del servidor incompleta' },
                { status: 500 }
            );
        }

        // Cliente con Service Role bypasea rate limits
        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        // 1. Intentar Login primero (usuarios existentes confirmados)
        const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
            email: normalizedEmail,
            password
        });

        if (signInData.user && !signInError) {
            return NextResponse.json({
                user: {
                    id: signInData.user.id,
                    email: signInData.user.email,
                    user_metadata: signInData.user.user_metadata
                },
                isNewUser: false,
                requiresEmailConfirmation: false
            });
        }

        // Si el email existe pero aún no fue confirmado, reenviar el enlace.
        if (requiresEmailConfirmation && signInError) {
            const blockedByConfirmation =
                signInError.code === 'email_not_confirmed' ||
                String(signInError.message).toLowerCase().includes('confirm');

            if (blockedByConfirmation) {
                const existingUser = await findUserByEmail(supabaseAdmin, normalizedEmail);
                const alreadyConfirmed = existingUser?.email_confirmed_at;

                if (existingUser && !alreadyConfirmed) {
                    // Reenvío: el usuario ya pasó la verificación humana al crearse.
                    // No volvemos a exigir Turnstile aquí (evita falsos "robot"
                    // cuando se reenvía desde la pantalla de confirmación).
                    try {
                        const confirmUrl = await buildConfirmationUrl(supabaseAdmin, normalizedEmail, request, password);
                        await sendConfirmationEmail({
                            to: normalizedEmail,
                            nombre: existingUser.user_metadata?.nombre || 'usuario',
                            confirmUrl
                        });
                    } catch (mailError) {
                        console.error('❌ Error reenviando confirmación:', mailError);
                    }

                    return NextResponse.json({
                        user: {
                            id: existingUser.id,
                            email: normalizedEmail,
                            user_metadata: existingUser.user_metadata
                        },
                        isNewUser: false,
                        requiresEmailConfirmation: true
                    });
                }
            }
        }

        // 2. Crear usuario NUEVO → aquí sí exigimos la verificación anti-bot.
        const isHuman = await verifyTurnstile(turnstileToken);
        if (!isHuman) {
            return NextResponse.json(
                { error: 'No pudimos verificar que no eres un robot. Inténtalo de nuevo.' },
                { status: 400 }
            );
        }

        const { data: signUpData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
            email: normalizedEmail,
            password,
            email_confirm: !requiresEmailConfirmation, // Clientes quedan sin confirmar hasta clicar el enlace
            user_metadata: {
                nombre: nombre || 'Usuario',
                telefono: telefono || '',
                rol: userRole
            }
        });

        if (signUpError) {
            console.error('❌ Error en registro server-side:', signUpError);

            if (signUpError.message.includes('already registered')) {
                return NextResponse.json(
                    { error: 'Usuario ya existe pero la contraseña es incorrecta' },
                    { status: 400 }
                );
            }

            return NextResponse.json(
                { error: signUpError.message || 'Error al crear la cuenta' },
                { status: 400 }
            );
        }

        if (!signUpData.user) {
            return NextResponse.json(
                { error: 'Error al crear usuario' },
                { status: 500 }
            );
        }

        // 3. Clientes: generar token de confirmación y enviarlo por correo
        if (requiresEmailConfirmation) {
            let mailSendOk = false;
            try {
                const confirmUrl = await buildConfirmationUrl(supabaseAdmin, normalizedEmail, request, password);
                await sendConfirmationEmail({
                    to: normalizedEmail,
                    nombre: signUpData.user.user_metadata?.nombre || 'usuario',
                    confirmUrl
                });
                mailSendOk = true;
            } catch (mailError) {
                console.error('❌ Error enviando confirmación:', mailError);
            }

            return NextResponse.json({
                user: {
                    id: signUpData.user.id,
                    email: signUpData.user.email,
                    user_metadata: signUpData.user.user_metadata
                },
                isNewUser: true,
                requiresEmailConfirmation: true,
                emailSent: mailSendOk
            });
        }

        return NextResponse.json({
            user: {
                id: signUpData.user.id,
                email: signUpData.user.email,
                user_metadata: signUpData.user.user_metadata
            },
            isNewUser: true,
            requiresEmailConfirmation: false
        });

    } catch (error) {
        console.error('❌ Error en /api/auth/register:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}

/**
 * Busca un usuario de Supabase Auth por email (getUserByEmail fue deprecado).
 * Usa listUsers: adecuado para el tamaño actual de la base de usuarios.
 */
async function findUserByEmail(supabaseAdmin: any, email: string) {
    const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });

    if (listError) {
        console.error('❌ Error listando usuarios:', listError);
        return null;
    }

    return (
        listData?.users?.find((u: any) => String(u.email || '').toLowerCase() === email.toLowerCase()) || null
    );
}

/**
 * Genera un token de confirmación de Supabase (admin.generateLink) y
 * construye la URL de confirmación usando nuestro propio callback.
 */
async function buildConfirmationUrl(supabaseAdmin: any, email: string, request: NextRequest, password: string) {
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'signup',
        email,
        password
    });

    if (linkError || !linkData?.properties?.hashed_token) {
        throw new Error(linkError?.message || 'No se pudo generar el enlace de confirmación');
    }

    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const origin = `${protocol}://${host}`;

    return `${origin}/auth/callback?type=signup&email=${encodeURIComponent(email)}&token=${encodeURIComponent(linkData.properties.hashed_token)}&next=${encodeURIComponent('/servicios')}`;
}
