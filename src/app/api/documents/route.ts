import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const orderId = searchParams.get('orderId');
        const lawyerId = searchParams.get('lawyerId');

        const where: any = {};
        if (orderId) {
            where.orderId = orderId;
        } else if (lawyerId) {
            where.order = { lawyerId: lawyerId };
        } else {
            return NextResponse.json({ error: 'orderId o lawyerId es requerido' }, { status: 400 });
        }

        const documents = await prisma.document.findMany({
            where,
            include: {
                order: {
                    select: {
                        numericId: true,
                        service: { select: { titulo: true } },
                        user: { select: { nombre: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(documents);
    } catch (error) {
        console.error('Error fetching documents:', error);
        return NextResponse.json({ error: 'Error fetching documents' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const body = await request.json();
        const { orderId, name, url, type, size } = body;

        if (!orderId || !name || !url) {
            return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
        }

        // Verificar que el usuario tiene acceso a la orden
        const order = await prisma.order.findUnique({
            where: { id: orderId }
        });

        if (!order) {
            return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
        }

        // Solo el abogado asignado, el cliente dueño o un ADMIN pueden subir documentos
        const isOwner = order.userId === user.id;
        const isLawyer = order.lawyerId === user.id;
        
        let userRole = user.user_metadata?.rol;
        if (!userRole) {
            const userData = await prisma.user.findUnique({
                where: { id: user.id },
                select: { rol: true }
            });
            userRole = userData?.rol;
        }
        const isAdmin = userRole === 'ADMIN';

        if (!isOwner && !isLawyer && !isAdmin) {
            return NextResponse.json({ error: 'Prohibido' }, { status: 403 });
        }

        const document = await prisma.document.create({
            data: {
                orderId,
                uploaderId: user.id,
                name,
                url,
                type,
                size,
            },
        });

        return NextResponse.json(document, { status: 201 });
    } catch (error) {
        console.error('Error creating document:', error);
        return NextResponse.json({ error: 'Error al crear documento' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
        }

        const document = await prisma.document.findUnique({
            where: { id },
            include: { order: true }
        });

        if (!document) {
            return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 });
        }

        // Solo el uploader o un ADMIN pueden borrar
        let userRole = user.user_metadata?.rol;
        if (!userRole) {
            const userData = await prisma.user.findUnique({
                where: { id: user.id },
                select: { rol: true }
            });
            userRole = userData?.rol;
        }
        const isAdmin = userRole === 'ADMIN';

        if (document.uploaderId !== user.id && !isAdmin) {
            return NextResponse.json({ error: 'Prohibido' }, { status: 403 });
        }

        await prisma.document.delete({
            where: { id },
        });

        return NextResponse.json({ message: 'Documento eliminado' });
    } catch (error) {
        console.error('Error deleting document:', error);
        return NextResponse.json({ error: 'Error al eliminar documento' }, { status: 500 });
    }
}
