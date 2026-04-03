import webpush from 'web-push';
import { prisma } from './prisma';

// Configurar VAPID (Keys deben estar en .env)
const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const email = process.env.VAPID_EMAIL || 'mailto:info@virtuabogado.com';

if (publicKey && privateKey) {
  webpush.setVapidDetails(email, publicKey, privateKey);
}

interface PushNotificationOptions {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  tag?: string;
}

/**
 * Despachador de Notificaciones Push 🚀
 * Envía una alerta de sistema al Admin o Abogado a través de sus suscripciones guardadas.
 */
export async function sendPushNotification(userId: string, options: PushNotificationOptions) {
  try {
    // 1. Obtener todas las suscripciones push de este usuario (todos sus dispositivos)
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId }
    });

    if (subscriptions.length === 0) {
      console.info(`ℹ️ [Push] Usuario ${userId} no tiene dispositivos registrados.`);
      return { success: false, sent: 0 };
    }

    console.log(`📡 [Push] Enviando alerta a ${subscriptions.length} dispositivos del usuario ${userId}...`);

    const payload = JSON.stringify({
      title: options.title,
      body: options.body,
      url: options.url || '/',
      icon: options.icon || '/logo/logo_sf_1.png',
      tag: options.tag || 'general-alert'
    });

    // 2. Enviar a cada dispositivo
    const sendPromises = subscriptions.map((sub) => {
      const pushConfig = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };

      return webpush.sendNotification(pushConfig, payload).catch(async (error) => {
        // Si la suscripción ya no es válida (410 Gone o 404), la borramos para mantener la DB limpia
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.warn(`🗑️ [Push] Suscripción expirada para ${userId}, eliminando de DB...`);
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
        } else {
          console.error(`❌ [Push] Error enviando a dispositivo:`, error);
        }
      });
    });

    await Promise.all(sendPromises);
    return { success: true, sent: subscriptions.length };
  } catch (error) {
    console.error('❌ Error catastrófico en el despachador de Push:', error);
    return { success: false, error };
  }
}

/**
 * Notificación Especial: ¡Nueva Venta Confirmada! (Solo para Admin) 💰🔔
 */
export async function notifyNewSale(orderId: string, total: string) {
  // Buscar a todos los ADMINS
  const admins = await prisma.user.findMany({
    where: { rol: 'ADMIN', activo: true },
    select: { id: true }
  });

  const promises = admins.map(admin => 
    sendPushNotification(admin.id, {
      title: '💰 ¡Nueva Venta en VirtuAbogado!',
      body: `Se ha confirmado un pago de $${total}. Orden #${orderId}`,
      url: '/admin',
      tag: `sale-${orderId}`,
      icon: '/logo/logo_sf_1.png'
    })
  );

  await Promise.all(promises);
}

/**
 * Notificación Especial: Nuevo Caso Asignado (Solo para Abogado) ⚖️
 */
export async function notifyNewCase(lawyerId: string, orderId: string) {
  await sendPushNotification(lawyerId, {
    title: '⚖️ Nuevo Caso Asignado',
    body: `Se te ha asignado un nuevo caso legal. Orden #${orderId}`,
    url: '/abogado',
    tag: `case-${orderId}`,
    icon: '/logo/logo_sf_1.png'
  });
}
/**
 * Notificación Especial: Nuevo Mensaje de Chat 💬
 * Notifica al destinatario (Cliente o Abogado) sobre un nuevo mensaje.
 */
export async function notifyNewMessage(recipientId: string, senderName: string, content: string, orderId: string) {
  await sendPushNotification(recipientId, {
    title: `💬 Mensaje de ${senderName}`,
    body: content.length > 100 ? `${content.substring(0, 97)}...` : content,
    url: `/detalle-servicio/${orderId}`, // O la ruta correspondiente según el rol
    tag: `chat-${orderId}`,
    icon: '/logo/logo_resized.png'
  });
}
