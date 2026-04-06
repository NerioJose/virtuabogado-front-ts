import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { endpoint } = await request.json();

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint is required' }, { status: 400 });
    }

    await prisma.pushSubscription.deleteMany({
      where: {
        userId: user.id,
        endpoint: endpoint
      }
    });

    return NextResponse.json({ success: true, message: 'Suscripción eliminada de la base de datos.' });
  } catch (error: any) {
    console.error('❌ Error crítico en unsubscribe push:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
