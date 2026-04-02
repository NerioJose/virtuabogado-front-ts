import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastServiceUpdate } from '@/lib/broadcast';

export async function GET() {
    try {
        console.log('--- Force Seed Started ---');
        
        const service = await prisma.service.upsert({
            where: { id: 7 },
            update: {
                titulo: 'Asesoría Estudiantes de Derecho',
                descripcion: 'Tutorías académicas, resolución de casos prácticos y apoyo para futuros abogados.',
                precio: 49.99,
                imagenUrl: '/images/virtustudents.png',
                activo: true
            },
            create: {
                id: 7,
                titulo: 'Asesoría Estudiantes de Derecho',
                descripcion: 'Tutorías académicas, resolución de casos prácticos y apoyo para futuros abogados.',
                precio: 49.99,
                imagenUrl: '/images/virtustudents.png',
                activo: true
            }
        });

        // 📡 Emitir broadcast para real-time
        broadcastServiceUpdate({
            serviceId: service.id,
            eventType: 'created',
        });

        const allServices = await prisma.service.findMany({
            orderBy: { id: 'asc' }
        });

        console.log('--- Force Seed Finished ---');
        return NextResponse.json({ 
            success: true, 
            upsertedService: service,
            totalServices: allServices.length,
            allServices: allServices.map((s: any) => ({ id: s.id, titulo: s.titulo, activo: s.activo }))
        });
    } catch (error: any) {
        console.error('Force Seed Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
