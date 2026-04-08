import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AbogadoPanel from '@/components/abogado/AbogadoPanel';
import { createClient } from '@/utils/supabase/server';
import { UserRole } from '@/shared/types/entities.types';
import { prisma } from '@/lib/prisma';

/**
 * Componente Skeleton para el Dashboard (PPR Shell)
 */
const DashboardSkeleton = () => (
    <div className="flex min-h-screen bg-gray-100 animate-pulse">
        <div className="w-64 bg-white shadow-xl h-full hidden lg:block" />
        <div className="flex-1 p-6">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="h-32 bg-white rounded-xl shadow-md" />
                <div className="h-32 bg-white rounded-xl shadow-md" />
                <div className="h-32 bg-white rounded-xl shadow-md" />
            </div>
            <div className="h-64 bg-white rounded-xl shadow-md" />
        </div>
    </div>
);

export default async function AbogadoPage() {
    const cookieStore = await cookies();
    const supabase = await createClient();

    // 1. Verificación SRE-Grade de Autenticación (Server-Side)
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        redirect('/login');
    }

    // 2. Verificación de Rol con Fallback autoritativo (DB)
    // Esto es crucial para prevenir bucles de redirección si los metadatos de Supabase fallan
    let role = user.user_metadata?.rol?.toUpperCase();
    
    if (!role) {
        console.log(`🔍 [Auth Guard] Rol ausente en metadatos para ${user.email}. Consultando DB...`);
        const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { rol: true }
        });
        role = dbUser?.rol?.toUpperCase();
    }

    if (role !== UserRole.ABOGADO) {
        console.warn(`🚫 [Auth Guard] Acceso denegado a ${user.email}. Rol detectado: ${role}`);
        redirect('/login');
    }

    return (
        <Suspense fallback={<DashboardSkeleton />}>
            <AbogadoPanel abogadoId={user.id} />
        </Suspense>
    );
}

// Habilitar PPR de forma incremental para esta ruta
export const experimental_ppr = true;
