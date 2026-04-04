import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
export const dynamic = 'force-dynamic';
export async function GET() {
    const orders = await (prisma as any).order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, status: true, userId: true, createdAt: true, paymentId: true }
    });
    return NextResponse.json(orders);
}
