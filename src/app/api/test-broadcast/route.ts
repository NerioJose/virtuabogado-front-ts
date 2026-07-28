import { NextResponse } from 'next/server';
import { sendBroadcast } from '@/lib/broadcast';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const channel = searchParams.get('channel') || 'test-broadcast';
    const event = searchParams.get('event') || 'ping';
    const targetId = searchParams.get('targetId') || 'test';

    const result = await sendBroadcast(channel, event, {
      new: {
        id: `test-${Date.now()}`,
        orderId: targetId,
        senderId: 'test-server',
        content: 'Test broadcast desde Vercel',
        isSystem: false,
        read: false,
        createdAt: new Date().toISOString(),
        sender: { nombre: 'Test Server', picture: null, rol: 'ADMIN' },
      },
    });

    return NextResponse.json({ success: result, channel, event });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
