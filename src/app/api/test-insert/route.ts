import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
export const dynamic = 'force-dynamic';
export async function GET() {
    try {
        let u = await (prisma as any).user.findUnique({ where: { id: "test-user-999" } });
        if (!u) {
            u = await (prisma as any).user.create({
                data: { id: "test-user-999", email: "test-user-999@test.com", nombre: "test", rol: "CLIENTE", activo: true }
            });
        }
        const svc = await (prisma as any).service.findFirst();
        const method = await (prisma as any).paymentMethod.findFirst();
        
        let o = await (prisma as any).order.findUnique({ where: { id: "test-order-999" } });
        if (!o) {
            o = await (prisma as any).order.create({
                data: {
                    id: "test-order-999",
                    userId: u.id,
                    serviceId: svc.id,
                    paymentMethodId: method.id,
                    status: 'PAGO_PENDIENTE',
                    total: 10,
                    commissionAmount: 1,
                    taxAmount: 1,
                    platformFeeAmount: 1,
                    netProfitAmount: 7,
                }
            });
        }
        
        const count = await (prisma as any).order.count();
        return NextResponse.json({ success: true, count, o });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message, stack: error.stack });
    }
}
