export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
export async function GET() {
    const users = await (prisma as any).user.count();
    const orders = await (prisma as any).order.count();
    return NextResponse.json({ users, orders, dbUrlHost: process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] });
}
